#!/usr/bin/env python3
"""
R27a block-order verification: proves every moved block of
mirror-library-lite-ORIG.tsx appears IN ORDER (stripped comparison;
permitted deltas: added `export` keywords, gameState.partyGameMode ->
partyGameMode) in its target module. Complements verify-library-split.py
(per-line coverage).
"""
from pathlib import Path

ROOT = Path('/home/z/my-project')
ORIG = ROOT / 'tmp-analysis/r27a/mirror-library-lite-ORIG.tsx'
BASE = ROOT / 'src/components/screens/mobile/mirror-views'


def norm(lines):
    return [l.strip() for l in lines if l.strip()]


def strip_export(ls):
    return [l[7:] if l.startswith('export ') else l for l in ls]


def identity(ls):
    return ls


def party_delta(ls):
    return [l.replace('gameState.partyGameMode', 'partyGameMode') for l in ls]


orig = ORIG.read_text(encoding='utf-8').splitlines()

# (name, orig_start, orig_end, target_path, delta)
CHECKS = [
    ("tOr 9-13", 9, 13, 'library-lite/helpers.ts', 'export'),
    ("haptic 56-60", 56, 60, 'library-lite/helpers.ts', 'export'),
    ("formatDurationSec 62-67", 62, 67, 'library-lite/helpers.ts', 'export'),
    ("isLikelyDuet 69-78", 69, 78, 'library-lite/helpers.ts', 'export'),
    ("MODE_BUTTONS 449-454", 449, 454, 'library-lite/helpers.ts', 'export'),
    ("dropdown 463-470", 463, 470, 'library-lite/helpers.ts', 'export'),
    ("filter states 103-107", 103, 107, 'library-lite/use-song-filters.ts', None),
    ("displaySongs memo 150-193", 150, 193, 'library-lite/use-display-songs.ts', None),
    ("genres memo 195-208", 195, 208, 'library-lite/use-display-songs.ts', None),
    ("preview state 128-129", 128, 129, 'library-lite/use-desktop-preview.ts', None),
    ("preview handlers 348-363", 348, 363, 'library-lite/use-desktop-preview.ts', None),
    ("overlay states 112-119", 112, 119, 'library-lite/use-song-overlay.ts', None),
    ("derived 220-239", 220, 239, 'library-lite/use-song-overlay.ts', None),
    ("handleOverlayQueue 241-270", 241, 270, 'library-lite/use-song-overlay.ts', None),
    ("overlayPreviewStop 365-375", 365, 375, 'library-lite/use-song-overlay.ts', party_delta),
    ("handleOverlayStart 377-414", 377, 414, 'library-lite/use-song-overlay.ts', None),
    ("handleOverlayChallenge 416-447", 416, 447, 'library-lite/use-song-overlay.ts', None),
    ("playlist states 120-126", 120, 126, 'library-lite/use-playlist-picker.ts', None),
    ("playlist handlers 272-346", 272, 346, 'library-lite/use-playlist-picker.ts', None),
    ("DIFF_OPTIONS 456-461", 456, 461, 'library-lite/song-options-overlay.tsx', None),
    ("motto banner 525-546", 525, 546, 'library-lite/motto-banner.tsx', None),
    ("handleClearSearch 210-213", 210, 213, 'library-lite/filter-bar.tsx', None),
    ("filter bar 549-632", 549, 632, 'library-lite/filter-bar.tsx', None),
    ("song list 636-731", 636, 731, 'library-lite/song-list.tsx', None),
    ("options overlay 735-898", 735, 898, 'library-lite/song-options-overlay.tsx', party_delta),
    ("playlist overlay 903-1000", 903, 1000, 'library-lite/playlist-picker-overlay.tsx', None),
    ("interface 17-52", 17, 52, 'mirror-library-lite.tsx', None),
    ("signature 82-101", 82, 101, 'mirror-library-lite.tsx', None),
    ("libGameMode 109-110", 109, 110, 'mirror-library-lite.tsx', None),
    ("isDuet+allPartners 131-148", 131, 148, 'mirror-library-lite.tsx', None),
    ("handleModeSelect 215-218", 215, 218, 'mirror-library-lite.tsx', None),
    ("header 474-480", 474, 480, 'mirror-library-lite.tsx', None),
    ("mode bar 482-499", 482, 499, 'mirror-library-lite.tsx', None),
    ("hints 501-519", 501, 519, 'mirror-library-lite.tsx', None),
    ("R25 comment 521-524", 521, 524, 'mirror-library-lite.tsx', None),
    ("displayName 1004", 1004, 1004, 'mirror-library-lite.tsx', None),
]

all_ok = True
for name, a, b, rel, delta in CHECKS:
    ob = norm(orig[a - 1:b])
    new = norm((BASE / rel).read_text(encoding='utf-8').splitlines())
    if delta == 'export':
        # documented delta: added `export` keyword on the NEW side
        new = strip_export(new)
    elif delta:
        # documented delta on the ORIG side (e.g. partyGameMode rename)
        ob = delta(ob)
    it = iter(new)
    ok = all(any(ol == nl for nl in it) for ol in ob)
    print(("order-ok : " if ok else "ORDER-FAIL: ") + name)
    all_ok = all_ok and ok

print()
print("ALL BLOCKS IN ORDER ✓" if all_ok else "SOME BLOCKS OUT OF ORDER ✗")
raise SystemExit(0 if all_ok else 1)
