#!/usr/bin/env python3
"""R12 byte-identity verifier — tournament split.

Compares every moved block of tournament-screen.tsx (git HEAD) against the new
modules in src/components/game/tournament/. A module is valid when its file
content ENDS with the exact (byte-identical) concatenation of its original
blocks — the only allowed deltas are documented below.
"""
import sys

ORIG = open('/home/z/my-project/tmp-analysis/r12/tournament-screen-ORIG.tsx').read().split('\n')
if ORIG and ORIG[-1] == '':
    ORIG = ORIG[:-1]  # trailing newline


def lines(a: int, b: int) -> list:
    """Original lines a..b inclusive (1-based)."""
    return ORIG[a - 1:b]


def check(path: str, expected: list, deltas: list = None):
    content = open(path).read()
    expected_str = '\n'.join(expected) + '\n'
    body = content  # module = header + expected body
    ok_exact = body.endswith(expected_str)
    # apply documented deltas to the expected text and re-check
    ok_delta = False
    if deltas:
        mutated = expected_str
        for old, new in deltas:
            mutated = mutated.replace(old, new, 1)
        ok_delta = body.endswith(mutated)
    name = path.split('/')[-1]
    if ok_exact:
        print(f'  {name}: EXACT byte-identical ({len(expected)} lines)')
        return True
    if deltas and ok_delta:
        print(f'  {name}: byte-identical with {len(deltas)} documented delta(s) ({len(expected)} lines)')
        return True
    # failure — show first mismatch
    print(f'  {name}: MISMATCH')
    exp = expected_str.split('\n')
    got = body.split('\n')
    for i, (e, g) in enumerate(zip(reversed(exp), reversed(got))):
        if e != g:
            print(f'    ...tail line -{i}: expected {e!r}')
            print(f'                    got      {g!r}')
            break
    else:
        print(f'    length differs: expected {len(exp)} body lines, module has {len(got)}')
    return False


BASE = '/home/z/my-project/src/components/game/tournament/'
ok = True

print('tournament-screen.tsx (git HEAD, 1064 lines) → tournament/ modules:')
ok &= check(BASE + 'setup-screen.tsx', lines(21, 333))
ok &= check(BASE + 'bracket-view.tsx', lines(335, 587) + [''] + lines(778, 805))
ok &= check(BASE + 'results-screen.tsx', lines(589, 757) + [''] + lines(759, 776))
ok &= check(
    BASE + 'double-elimination-bracket.tsx',
    lines(807, 1064),
    deltas=[('function DoubleEliminationBracketView({', 'export function DoubleEliminationBracketView({')],
)

# coverage: every original line 20..1064 must be carried into exactly one module
# (line 20 = blank between imports and first interface; 1064 = last line)
covered = set(list(range(21, 334)) + list(range(335, 588)) + list(range(589, 758))
              + list(range(759, 777)) + list(range(778, 806)) + list(range(807, 1065)))
target = set(range(21, 1065))
missing = target - covered
extra = covered - target
print(f'  coverage: {len(covered)}/{len(target)} original body lines mapped'
      + (f' — MISSING {sorted(missing)}' if missing else '')
      + (f' — EXTRA {sorted(extra)}' if extra else ''))

sys.exit(0 if (ok and not missing and not extra) else 1)
