#!/usr/bin/env python3
"""R27-b generator: builds src/lib/audio/microphone/ modules + facade by
byte-exact line slicing from the git-HEAD backup of microphone-manager.ts.

Documented minimal edits (the ONLY deviations from verbatim):
  1. types.ts L51:          'interface MicrophoneStatus {'  -> 'export interface MicrophoneStatus {'
  2. microphone-instance L117: 'class MicrophoneInstance {' -> 'export class MicrophoneInstance {'
  3. manager L351:          inline array type               -> 'StoredMicConfig[]' (type-level only)
  4. manager saveConfig/loadConfig bodies -> thin delegates (spec-mandated)
  5. mic-config-storage: method bodies dedented by 2 (class-method -> top-level function);
     'Array.from(this.assignedMics.values())' -> 'mics' param (save);
     'this.savedMicConfigs = config.assignedMics;' -> 'return config.assignedMics;' (load)
"""
import sys

ORIG = 'tmp-analysis/r27b/microphone-manager-ORIG.ts'
OUT_DIR = 'src/lib/audio/microphone'

with open(ORIG, encoding='utf-8') as f:
    raw = f.read()
assert '\r' not in raw, 'unexpected CRLF'
lines = raw.split('\n')  # lines[i] == ORIG line (i+1)
assert len(lines) == 1016, f'unexpected line count {len(lines)}'


def seg(a: int, b: int) -> list:
    """ORIG lines a..b inclusive (1-indexed), verbatim."""
    return lines[a - 1:b]


def dedent2(ls: list) -> list:
    out = []
    for l in ls:
        out.append(l[2:] if l.startswith('  ') else l)
    return out


def w(path: str, ls: list) -> None:
    content = '\n'.join(ls) + '\n'
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'{path}: {len(ls)} lines')


# ─── 1. types.ts ────────────────────────────────────────────────────────────
types = seg(3, 114)
assert types[48] == 'interface MicrophoneStatus {', repr(types[48])
types[48] = 'export interface MicrophoneStatus {'
w(f'{OUT_DIR}/types.ts', types)

# ─── 2. microphone-instance.ts ──────────────────────────────────────────────
inst = ["import type { ExtendedMicConfig, MicrophoneStatus } from './types';", '']
inst += seg(116, 339)
assert inst[3] == 'class MicrophoneInstance {', repr(inst[3])
inst[3] = 'export class MicrophoneInstance {'
w(f'{OUT_DIR}/microphone-instance.ts', inst)

# ─── 3. mic-config-storage.ts ───────────────────────────────────────────────
storage = [
    "import { StorageKeys, getItem, setJson } from '@/lib/storage';",
    "import type { AssignedMicrophone, ExtendedMicConfig } from './types';",
    '',
    '// Shape of one persisted microphone entry (localStorage key MULTI_MIC_CONFIG, format version 2)',
    'export interface StoredMicConfig {',
    '  id: string;',
    '  deviceId: string;',
    '  deviceName: string;',
    '  customName: string;',
    '  playerIndex: number;',
    '  config: ExtendedMicConfig;',
    '  stereoPartnerId?: string;',
    '}',
    '',
    '// Save config to localStorage',
    'export function saveMicsConfig(mics: AssignedMicrophone[]): void {',
]
save_body = dedent2(seg(854, 870))
assert save_body[3].strip() == 'assignedMics: Array.from(this.assignedMics.values()).map(m => ({', repr(save_body[3])
save_body[3] = '      assignedMics: mics.map(m => ({'
storage += save_body + ['}', '']

storage += [
    '// Load config from localStorage',
    'export function loadMicsConfig(): StoredMicConfig[] {',
]
load_body = dedent2(seg(875, 932))
assert load_body[-6].strip() == 'this.savedMicConfigs = config.assignedMics;', repr(load_body[-6])
load_body[-6] = '        return config.assignedMics;'
storage += load_body + ['  return [];', '}']
w(f'{OUT_DIR}/mic-config-storage.ts', storage)

# ─── 4. multi-microphone-manager.ts ─────────────────────────────────────────
mgr = [
    "import { OPTIMAL_EXTENDED_CONFIG, MAX_MICROPHONES } from './types';",
    "import type { AssignedMicrophone, ExtendedMicConfig, MicrophoneDevice } from './types';",
    "import { MicrophoneInstance } from './microphone-instance';",
    "import { saveMicsConfig, loadMicsConfig } from './mic-config-storage';",
    "import type { StoredMicConfig } from './mic-config-storage';",
    '',
]
head = seg(341, 351)
assert head[10].startswith('  private savedMicConfigs: Array<{'), repr(head[10])
head[10] = '  private savedMicConfigs: StoredMicConfig[] = [];'
mgr += head
mgr += seg(352, 851)
mgr += [
    '  // Save config to localStorage',
    '  private saveConfig(): void {',
    '    saveMicsConfig(Array.from(this.assignedMics.values()));',
    '  }',
    '',
    '  // Load config from localStorage',
    '  private loadConfig(): void {',
    '    this.savedMicConfigs = loadMicsConfig();',
    '  }',
    '',
]
mgr += seg(935, 1004)
w(f'{OUT_DIR}/multi-microphone-manager.ts', mgr)

# ─── 5. singleton.ts ────────────────────────────────────────────────────────
sing = [
    "import { MultiMicrophoneManager } from './multi-microphone-manager';",
    '',
] + seg(1006, 1014)
w(f'{OUT_DIR}/singleton.ts', sing)

# ─── 6. facade microphone-manager.ts ────────────────────────────────────────
facade = """// R27-b Auslagerung: This file is now a stable re-export facade.
// The implementation lives in ./microphone/:
//   types.ts                  – interfaces + OPTIMAL_EXTENDED_CONFIG + MAX_MICROPHONES
//   microphone-instance.ts    – single-mic Web Audio pipeline (connect/analyse/monitor)
//   mic-config-storage.ts     – localStorage persistence + migrations (MULTI_MIC_CONFIG v2)
//   multi-microphone-manager.ts – assignment/stereo-split/restore manager class
//   singleton.ts              – getMultiMicrophoneManager()
// Public API is byte-compatible with the pre-split module — importers are untouched.

export type { MicrophoneDevice, MicrophoneConfig, ExtendedMicConfig, AssignedMicrophone } from './microphone/types';
export { OPTIMAL_EXTENDED_CONFIG, MAX_MICROPHONES } from './microphone/types';
export { MultiMicrophoneManager } from './microphone/multi-microphone-manager';
export { getMultiMicrophoneManager } from './microphone/singleton';
""".split('\n')
w('src/lib/audio/microphone-manager.ts', facade)

print('OK: all files generated')
