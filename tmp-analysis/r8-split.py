#!/usr/bin/env python3
"""R8: Split src/app/api/mobile/post-handlers.ts into domain handler modules.

Extracts each switch-case body BYTE-IDENTICALLY from the original file
(only mechanical dedent by 6 spaces) into focused modules under
src/app/api/mobile/handlers/. The original file becomes a slim orchestrator
that keeps exporting handlePostRequest (importer: ./route.ts).

Each SPEC entry carries a list of line ranges (1-indexed, inclusive):
case-adjacent comment lines ( ABOVE the `case '...'` label) plus the case
body — the case label line itself is never extracted.
"""
import re
import sys
from collections import OrderedDict

ROOT = '/home/z/my-project'
SRC_ORIG = f'{ROOT}/tmp-analysis/r8-post-handlers-ORIG.ts'  # pristine copy of git HEAD
SRC_OUT = f'{ROOT}/src/app/api/mobile/post-handlers.ts'
OUTDIR = f'{ROOT}/src/app/api/mobile/handlers'

with open(SRC_ORIG, encoding='utf-8') as f:
    LINES = f.read().split('\n')


def R(*ranges):
    return [tuple(r) for r in ranges]


# (module, case label, function name, params, [(start,end), ...])
SPEC = [
    ('connection-handlers', 'register', 'handleRegister', 'request: NextRequest, payload: unknown', R((28, 72))),
    ('pitch-handlers', 'pitch', 'handlePitch', 'payload: unknown, clientId: string', R((76, 98))),
    ('pitch-handlers', 'batch_pitch', 'handleBatchPitch', 'payload: unknown, clientId: string', R((102, 140))),
    ('remote-control-handlers', 'command', 'handleCommand', 'payload: unknown', R((144, 145))),
    ('game-state-handlers', 'sync', 'handleSync', '', R((149, 152))),
    ('game-state-handlers', 'gamestate', 'handleGamestate', 'request: NextRequest, payload: unknown, clientId: string', R((155, 183))),
    ('game-state-handlers', 'br-singing', 'handleBrSinging', 'request: NextRequest, payload: unknown, clientId: string', R((187, 215))),
    ('connection-handlers', 'profile', 'handleProfileUpdate', 'payload: unknown, clientId: string', R((219, 250))),
    ('queue-handlers', 'queue', 'handleQueueAdd', 'payload: unknown, clientId: string', R((253, 381))),
    ('queue-handlers', 'reorderqueue', 'handleQueueReorder', 'payload: unknown, clientId: string', R((385, 440))),
    ('queue-handlers', 'removequeue', 'handleQueueRemove', 'payload: unknown, clientId: string', R((444, 469))),
    ('queue-handlers', 'markplaying', 'handleMarkPlaying', 'request: NextRequest, payload: unknown', R((473, 497))),
    ('queue-handlers', 'queuecompleted', 'handleQueueCompleted', 'request: NextRequest, payload: unknown', R((501, 523))),
    ('queue-handlers', 'jukebox', 'handleJukeboxAdd', 'payload: unknown, clientId: string', R((527, 562))),
    ('queue-handlers', 'jukebox_wishlist_remove', 'handleJukeboxWishlistRemove', 'payload: unknown, clientId: string', R((566, 586))),
    ('game-state-handlers', 'results', 'handleResults', 'request: NextRequest, payload: unknown', R((590, 596))),
    ('remote-control-handlers', 'remote_acquire', 'handleRemoteAcquire', 'clientId: string', R((599, 631))),
    ('remote-control-handlers', 'remote_release', 'handleRemoteRelease', 'clientId: string', R((635, 661))),
    ('remote-control-handlers', 'remote_command', 'handleRemoteCommand', 'payload: unknown, clientId: string', R((665, 705))),
    ('game-state-handlers', 'setAdPlaying', 'handleSetAdPlaying', 'request: NextRequest, payload: unknown', R((709, 716))),
    ('remote-control-handlers', 'skipAd', 'handleSkipAd', 'clientId: string', R((720, 742))),
    ('connection-handlers', 'assigncharacter', 'handleAssignCharacter', 'request: NextRequest, payload: unknown', R((746, 789))),
    ('connection-handlers', 'heartbeat', 'handleHeartbeat', 'clientId: string', R((792, 800))),
    ('host-sync-handlers', 'sethostprofiles', 'handleSetHostProfiles', 'request: NextRequest, payload: unknown', R((803, 826))),
    ('host-sync-handlers', 'setplaylists', 'handleSetPlaylists', 'request: NextRequest, payload: unknown', R((829, 845))),
    ('host-sync-handlers', 'setsongs', 'handleSetSongs', 'request: NextRequest, payload: unknown', R((848, 872))),
    ('chat-handlers', 'chat', 'handleChat', 'payload: unknown, clientId: string', R((875, 875), (877, 909))),
    ('chat-handlers', 'chat_host', 'handleChatHost', 'request: NextRequest, payload: unknown', R((912, 912), (914, 939))),
    ('chat-handlers', 'chat_host_challenge', 'handleChatHostChallenge', 'request: NextRequest, payload: unknown', R((942, 942), (944, 974))),
    ('game-state-handlers', 'tournament_crowd_vote', 'handleTournamentCrowdVote', 'payload: unknown, clientId: string', R((977, 977), (979, 1003))),
    ('chat-handlers', 'song_challenge', 'handleSongChallenge', 'payload: unknown, clientId: string', R((1006, 1006), (1008, 1045))),
    ('chat-handlers', 'accept_challenge', 'handleAcceptChallenge', 'payload: unknown, clientId: string', R((1048, 1048), (1050, 1126))),
    ('chat-handlers', 'accept_challenge_host', 'handleAcceptChallengeHost', 'request: NextRequest, payload: unknown', R((1129, 1129), (1131, 1205))),
    ('remote-control-handlers', 'playlist_add', 'handlePlaylistAdd', 'payload: unknown, clientId: string', R((1208, 1210), (1212, 1228))),
    ('remote-control-handlers', 'playlist_create_add', 'handlePlaylistCreateAdd', 'payload: unknown, clientId: string', R((1231, 1231), (1233, 1248))),
]

# ---- Sanity check 1: spec covers exactly the original case labels, in order ----
orig_cases = re.findall(r"^      case '([^']+)':", '\n'.join(LINES), re.M)
spec_cases = [s[1] for s in SPEC]
if orig_cases != spec_cases:
    print('CASE MISMATCH!')
    print('orig :', orig_cases)
    print('spec :', spec_cases)
    sys.exit(1)
print(f'OK: {len(orig_cases)} cases covered in original order')

# ---- Sanity check 2: ranges must be contiguous per case and not overlap ----
flat = sorted(r for s in SPEC for r in s[4])
for (a1, b1), (a2, b2) in zip(flat, flat[1:]):
    if a2 <= b1:
        sys.exit(f'OVERLAP at {b1}/{a2}')
# case label line of each case must NOT be inside any extracted range
label_lines = {m.start() + 1: m.group(1) for m in re.finditer(r"^      case '([^']+)':", '\n'.join(LINES), re.M)}
# m.start() is char offset, not line — compute line numbers instead:
label_by_line = {}
for i, ln in enumerate(LINES, start=1):
    m = re.match(r"^      case '([^']+)':", ln)
    if m:
        label_by_line[i] = m.group(1)
for a, b in flat:
    for ln in range(a, b + 1):
        if ln in label_by_line:
            sys.exit(f'RANGE {a}-{b} contains case label line {ln} ({label_by_line[ln]})')
print('OK: no overlaps, no case labels inside extracted ranges')


def dedent6(line: str) -> str:
    if line.startswith('      '):
        return line[6:]
    if line.strip() == '':
        return line
    sys.exit(f'BAD INDENT (needs >=6 leading spaces): {line!r}')


def extract(ranges):
    out = []
    for a, b in ranges:
        out.extend(dedent6(ln) for ln in LINES[a - 1:b])
    return out


def uses(text: str, name: str) -> bool:
    return re.search(r'\b' + re.escape(name) + r'\b', text) is not None


def strip_noise(line: str) -> str:
    """Remove string-literal contents and line comments (keeps code identifiers).
    Template-literal contents are kept (only backticks removed) so that
    interpolations like ${clientId} still count as identifier usage."""
    line = re.sub(r"'(?:[^'\\]|\\.)*'", "''", line)
    line = re.sub(r'"(?:[^"\\]|\\.)*"', '""', line)
    line = line.replace('`', '')
    idx = line.find('//')
    if idx != -1:
        line = line[:idx]
    return line


def uses_var(text: str, name: str) -> bool:
    """True if `name` is used as a VALUE identifier (not just an object key)."""
    return re.search(r'\b' + re.escape(name) + r'\b(?!\s*:)', text) is not None


MODULE_HEADERS = {
    'connection-handlers': """// ===================== COMPANION CONNECTION & PROFILE HANDLERS =====================
// POST /api/mobile actions for the companion connection lifecycle:
// 'register', 'profile' (self-update), 'assigncharacter' (admin-assigned)
// and 'heartbeat'. Extracted 1:1 from post-handlers.ts (R8), no behavior change.""",
    'host-sync-handlers': """// ===================== HOST SYNC HANDLERS =====================
// PIN-authenticated actions where the desktop host pushes reference data for
// companion clients: 'sethostprofiles', 'setplaylists', 'setsongs'.
// Extracted 1:1 from post-handlers.ts (R8), no behavior change.""",
    'pitch-handlers': """// ===================== PITCH STREAM HANDLERS =====================
// POST /api/mobile actions for companion pitch streaming: 'pitch' (single
// frame) and 'batch_pitch' (batched frames). Extracted 1:1 from
// post-handlers.ts (R8), no behavior change.""",
    'game-state-handlers': """// ===================== GAME STATE HANDLERS =====================
// POST /api/mobile actions around the shared game/match runtime state:
// 'sync', 'gamestate', 'br-singing', 'setAdPlaying', 'results' and the
// '#10' tournament crowd vote. Extracted 1:1 from post-handlers.ts (R8),
// no behavior change.""",
    'queue-handlers': """// ===================== QUEUE & JUKEBOX HANDLERS =====================
// POST /api/mobile actions for the song queue and jukebox wishlist:
// 'queue', 'reorderqueue', 'removequeue', 'markplaying', 'queuecompleted',
// 'jukebox', 'jukebox_wishlist_remove'. Extracted 1:1 from post-handlers.ts
// (R8), no behavior change.""",
    'remote-control-handlers': """// ===================== REMOTE CONTROL HANDLERS =====================
// POST /api/mobile actions around the remote-control lock and the command
// queue consumed by the desktop host: 'command' (legacy echo),
// 'remote_acquire', 'remote_release', 'remote_command', 'skipAd',
// 'playlist_add', 'playlist_create_add'. Extracted 1:1 from
// post-handlers.ts (R8), no behavior change.""",
    'chat-handlers': """// ===================== CHAT & CHALLENGE HANDLERS =====================
// POST /api/mobile actions for the F4 in-game chat and song challenges:
// 'chat', 'chat_host', 'chat_host_challenge', 'song_challenge',
// 'accept_challenge', 'accept_challenge_host'. Extracted 1:1 from
// post-handlers.ts (R8), no behavior change.""",
}

STATE_EXPORTS = ['mobileClients', 'connectionCodes', 'profileToClient', 'latestPitchData',
                 'mutableState', 'getUniqueConnectionCode', 'registerClient', 'removeClient',
                 'requireAuth', 'requireAuthOrRemoteHolder', 'MAX_JUKEBOX_PER_CLIENT',
                 'MAX_TOURNAMENT_VOTES', 'tournamentVoteRegistry']
TYPE_EXPORTS = ['MobileClient', 'PitchData', 'MobileProfile', 'QueueItem', 'RemoteCommand']

# ---- Build modules ----
modules = OrderedDict()  # name -> list of (func, params, comment_lines, body_lines)
for mod, case, func, params, ranges in SPEC:
    # A leading range consisting purely of // comment lines (the comments that
    # sat directly above the `case` label) is hoisted ABOVE the signature.
    comment, body_ranges = [], ranges
    if len(ranges) > 1 and all(
        LINES[i].strip().startswith('//') for i in range(ranges[0][0] - 1, ranges[0][1])
    ):
        comment, body_ranges = extract([ranges[0]]), ranges[1:]
    modules.setdefault(mod, []).append((func, params, comment, extract(body_ranges)))

import os
os.makedirs(OUTDIR, exist_ok=True)

report = []
for mod, funcs in modules.items():
    all_text = '\n'.join('\n'.join(strip_noise(ln) for ln in b) for _, _, _, b in funcs)

    # param sanity: body must not reference a param the signature lacks (and vice versa)
    for func, params, comment, body in funcs:
        body_text = '\n'.join(strip_noise(ln) for ln in body)
        param_names = [p.split(':')[0].strip() for p in params.split(',') if p.strip()]
        for p in ['request', 'payload', 'clientId']:
            if uses_var(body_text, p) and p not in param_names:
                sys.exit(f'{mod}/{func}: body uses "{p}" but signature lacks it: {params}')
            if p in param_names and not uses_var(body_text, p):
                sys.exit(f'{mod}/{func}: signature has "{p}" but body never uses it')
        # no switch-syntax leftovers may survive extraction
        for ln in body:
            if re.match(r'^\s*(case\s|default:)', ln):
                sys.exit(f'{mod}/{func}: switch leftover in body: {ln!r}')

    parts = [MODULE_HEADERS[mod], '']
    if uses(all_text, 'request'):
        parts.append("import type { NextRequest } from 'next/server';")
    types_used = [t for t in TYPE_EXPORTS if uses(all_text, t)]
    if types_used:
        parts.append(f"import type {{ {', '.join(types_used)} }} from '../mobile-types';")
    if uses(all_text, 'mobileEvents'):
        parts.append("import { mobileEvents, EVENTS } from '@/lib/socketio-events';")
    state_used = [s for s in STATE_EXPORTS if uses(all_text, s)]
    if state_used:
        if len(state_used) <= 3:
            parts.append(f"import {{ {', '.join(state_used)} }} from '../mobile-state';")
        else:
            parts.append('import {')
            parts.extend(f'  {s},' for s in state_used)
            parts.append("} from '../mobile-state';")

    for func, params, comment, body in funcs:
        parts.append('')
        parts.extend(comment)
        parts.append(f'export function {func}({params}): Response {{')
        parts.extend(body)
        parts.append('}')

    path = f'{OUTDIR}/{mod}.ts'
    with open(path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(parts) + '\n')
    report.append((mod, len(parts), [f for f, _, _, _ in funcs]))
    print(f'WROTE {path}: {len(parts)} lines — {len(funcs)} handlers')

# ---- Build the new orchestrator post-handlers.ts ----
by_mod_imports = OrderedDict()
for mod, funcs in modules.items():
    by_mod_imports[mod] = sorted(f for f, _, _, _ in funcs)

orch = []
orch.append("import { NextRequest } from 'next/server';")
for mod, funcs in by_mod_imports.items():
    if len(funcs) <= 3:
        orch.append(f"import {{ {', '.join(funcs)} }} from './handlers/{mod}';")
    else:
        orch.append('import {')
        orch.extend(f'  {f},' for f in funcs)
        orch.append(f"}} from './handlers/{mod}';")

orch.append('')
orch.append('// ===================== POST HANDLER =====================')
orch.append('// Orchestrator: parses the JSON body and dispatches each POST /api/mobile')
orch.append('// action to its domain module in ./handlers/ (R8 split of the former')
orch.append('// monolithic switch — case order, auth, validation and response shapes')
orch.append('// are unchanged). Note: `clientId` arrives untyped from the JSON body;')
orch.append('// handler signatures type it as string, falsy guards behave as before.')
orch.append('export async function handlePostRequest(request: NextRequest): Promise<Response> {')
orch.append('  try {')
orch.append('    const body = await request.json();')
orch.append('    const { type, payload, clientId } = body;')
orch.append('')
orch.append('    switch (type) {')
for mod, case, func, params, ranges in SPEC:
    args = ', '.join(p.split(':')[0].strip() for p in params.split(',') if p.strip())
    orch.append(f"      case '{case}':")
    orch.append(f'        return {func}({args});')
    orch.append('')
orch.append('      default:')
orch.append("        return Response.json({ success: false, message: 'Unknown message type' }, { status: 400 });")
orch.append('    }')
# catch block: lines 1254-1268 of the original, byte-identical
orch.extend(LINES[1253:1268])
with open(SRC_OUT, 'w', encoding='utf-8') as f:
    f.write('\n'.join(orch))
print(f'WROTE {SRC_OUT}: {len(orch)} lines (orchestrator)')
print()
print('MODULE REPORT:')
for mod, n, funcs in report:
    print(f'  {mod}.ts: {n} lines ({len(funcs)} handlers: {", ".join(funcs)})')
