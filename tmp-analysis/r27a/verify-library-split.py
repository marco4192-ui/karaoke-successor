#!/usr/bin/env python3
"""
R27a verify script: mirror-library-lite.tsx split (ORIG vs. new modules).

Checks that every non-blank line of the ORIG file (from git HEAD) appears
(whitespace-stripped, substring-containment so added `export` keywords still
map) in at least one of the new files (orchestrator + library-lite/ modules).

Documented exceptions:
  - Distributed imports (ORIG lines 3 and 5): the react import and the
    era-filter import are re-distributed across the modules.
  - Documented deltas: `gameState.partyGameMode` -> `partyGameMode`
    (ORIG lines 368, 375, 865) — checked after delta-normalization.
"""

import sys
from pathlib import Path

ROOT = Path('/home/z/my-project')
ORIG = ROOT / 'tmp-analysis/r27a/mirror-library-lite-ORIG.tsx'
NEW_FILES = [
    ROOT / 'src/components/screens/mobile/mirror-views/mirror-library-lite.tsx',
    ROOT / 'src/components/screens/mobile/mirror-views/library-lite/helpers.ts',
    ROOT / 'src/components/screens/mobile/mirror-views/library-lite/use-song-filters.ts',
    ROOT / 'src/components/screens/mobile/mirror-views/library-lite/use-display-songs.ts',
    ROOT / 'src/components/screens/mobile/mirror-views/library-lite/use-desktop-preview.ts',
    ROOT / 'src/components/screens/mobile/mirror-views/library-lite/use-song-overlay.ts',
    ROOT / 'src/components/screens/mobile/mirror-views/library-lite/use-playlist-picker.ts',
    ROOT / 'src/components/screens/mobile/mirror-views/library-lite/motto-banner.tsx',
    ROOT / 'src/components/screens/mobile/mirror-views/library-lite/filter-bar.tsx',
    ROOT / 'src/components/screens/mobile/mirror-views/library-lite/song-list.tsx',
    ROOT / 'src/components/screens/mobile/mirror-views/library-lite/song-options-overlay.tsx',
    ROOT / 'src/components/screens/mobile/mirror-views/library-lite/playlist-picker-overlay.tsx',
]

# ORIG line numbers (1-based) of imports that were distributed across modules.
DISTRIBUTED_IMPORT_LINES = {3, 5}
# ORIG line numbers (1-based) subject to the documented partyGameMode delta.
PARTY_MODE_DELTA_LINES = {368, 375, 865}


def main() -> int:
    orig_lines = ORIG.read_text(encoding='utf-8').splitlines()
    new_contents = [p.read_text(encoding='utf-8') for p in NEW_FILES]
    # Also allow a stripped line to match against stripped new-file lines
    # (pure containment on the raw text already covers indentation deltas).
    new_texts = new_contents

    total = 0
    mapped = 0
    unmapped = []
    delta_ok = []
    delta_fail = []

    for idx, raw in enumerate(orig_lines, start=1):
        stripped = raw.strip()
        if not stripped:
            continue  # skip blank lines
        total += 1

        if idx in DISTRIBUTED_IMPORT_LINES:
            # documented glue: import re-distributed across modules
            # verify all imported symbols still appear somewhere
            symbols = {
                3: ['useCallback', 'useEffect', 'useMemo', 'useRef', 'useState'],
                5: ['getAvailableDecades', 'songMatchesEra', 'decadeShortLabel'],
            }[idx]
            missing = [s for s in symbols if not any(s in t for t in new_texts)]
            if missing:
                delta_fail.append((idx, stripped, f'distributed import symbols missing: {missing}'))
            else:
                delta_ok.append((idx, stripped, 'distributed import (all symbols present in modules)'))
            mapped += 1
            continue

        if idx in PARTY_MODE_DELTA_LINES:
            # documented delta: gameState.partyGameMode -> partyGameMode
            normalized = stripped.replace('gameState.partyGameMode', 'partyGameMode')
            if any(normalized in t for t in new_texts):
                delta_ok.append((idx, stripped, 'partyGameMode delta, normalized form found'))
                mapped += 1
            else:
                delta_fail.append((idx, stripped, 'partyGameMode delta, normalized form NOT found'))
                unmapped.append((idx, stripped))
            continue

        if any(stripped in t for t in new_texts):
            mapped += 1
        else:
            unmapped.append((idx, stripped))

    print(f'ORIG file: {ORIG}')
    print(f'New files checked: {len(NEW_FILES)}')
    for p in NEW_FILES:
        lc = len(p.read_text(encoding='utf-8').splitlines())
        print(f'  {p.relative_to(ROOT)}: {lc} lines')
    print()
    print(f'Coverage: {mapped}/{total} non-blank ORIG lines mapped '
          f'({100.0 * mapped / total:.2f}%)')
    print(f'Documented deltas handled: {len(delta_ok)}')
    for idx, s, note in delta_ok:
        print(f'  L{idx}: {note}')
    if delta_fail:
        print(f'DELTA FAILURES: {len(delta_fail)}')
        for idx, s, note in delta_fail:
            print(f'  L{idx}: {s}  ->  {note}')
    print()
    print(f'Unmapped lines: {len(unmapped)}')
    for idx, s in unmapped:
        print(f'  L{idx}: {s}')

    ok = not unmapped and not delta_fail
    print()
    print('RESULT: ' + ('PASS — every non-blank ORIG line mapped (incl. documented deltas)'
                        if ok else 'FAIL — see unmapped lines above'))
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
