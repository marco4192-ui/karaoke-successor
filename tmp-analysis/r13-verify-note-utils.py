#!/usr/bin/env python3
"""R13 verify: byte-identity of the note-utils split.

Every moved block (contiguous line ranges of the ORIG file) must appear
VERBATIM in its target module. Only documented deltas are allowed:
  - color-utils.ts: `function hexWithAlpha` -> `export function hexWithAlpha`
"""
import sys

ORIG = open('tmp-analysis/r13-note-utils-ORIG.tsx').read().splitlines()
BASE = 'src/lib/game/note-utils/'

# (module, orig_start, orig_end) — 1-based inclusive line ranges of ORIG
RANGES = [
    ('color-utils.ts', 21, 28),
    ('display-style.tsx', 30, 658),
    ('multi-player-overlay.tsx', 660, 1006),
    ('note-styling.ts', 1008, 1036),
    ('pitch-stats.ts', 16, 19),
    ('pitch-stats.ts', 1038, 1107),
    ('visible-notes.ts', 1109, 1154),
]

failures = 0
total = 0
for mod, start, end in RANGES:
    orig_block = ORIG[start - 1:end]
    target = open(BASE + mod).read().splitlines()
    n = len(orig_block)
    total += n
    # find the block inside the target module
    found = None
    for i in range(len(target) - n + 1):
        if target[i:i + n] == orig_block:
            found = i
            break
    if found is None:
        # try the documented export delta
        patched = list(orig_block)
        if mod == 'color-utils.ts':
            patched = [l.replace('function hexWithAlpha', 'export function hexWithAlpha', 1) if i == 1 else l for i, l in enumerate(patched)]
        for i in range(len(target) - n + 1):
            if target[i:i + n] == patched:
                found = i
                print(f"OK (export-delta) {mod}: lines {start}-{end} ({n} lines) at target line {i + 1}")
                break
    if found is not None:
        print(f"OK {mod}: lines {start}-{end} ({n} lines) verbatim at target line {found + 1}")
    else:
        failures += 1
        print(f"FAIL {mod}: lines {start}-{end} NOT found verbatim")
        # debug: first mismatch context
        for i in range(len(target) - n + 1):
            mism = [j for j in range(n) if target[i + j] != orig_block[j]]
            if len(mism) <= 2:
                print(f"  near-miss at target line {i+1}: {len(mism)} mismatching lines:")
                for j in mism:
                    print(f"    orig {start+j}: {orig_block[j]!r}")
                    print(f"    targ {i+j+1}: {target[i+j]!r}")
                break

# coverage: every ORIG line must be accounted for (moved or intentionally skipped)
covered = set()
for _, s, e in RANGES:
    covered.update(range(s, e + 1))
skipped = []
for ln in range(1, len(ORIG) + 1):
    if ln not in covered:
        skipped.append(ln)
# expected skipped: 1-15 (old imports+const banner... wait 16-19 moved) → recompute:
# 1-15: imports + (16 is in pitch-stats) → 1-15 skipped; 20 blank; 29 blank; 659 blank; 1007 blank; 1037 blank; 1108 blank
expected_skipped = set(range(1, 16)) | {20, 29, 659, 1007, 1037, 1108}
unexpected = [ln for ln in skipped if ln not in expected_skipped]
print(f"\nORIG lines total: {len(ORIG)}, moved: {total}, skipped: {len(skipped)}")
if unexpected:
    failures += 1
    print(f"UNEXPECTED skipped lines: {unexpected}")
    for ln in unexpected:
        print(f"  {ln}: {ORIG[ln-1]!r}")
else:
    print("All skipped lines are exactly the old import block + blank separators (expected).")

sys.exit(1 if failures else 0)
