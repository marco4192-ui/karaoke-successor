#!/usr/bin/env python3
"""R12 byte-identity verifier — battle-royale playing-view split.

Checks that every moved block of playing-view.tsx (git HEAD, 991 lines) is
contained byte-identically in its target module (component/hook wrapper,
imports and pointer comments around it are new; the moved lines themselves
must match exactly, except documented export-keyword deltas).
Also asserts full line coverage of the original body (24-991).
"""
import sys

ORIG = open('/home/z/my-project/tmp-analysis/r12/playing-view-ORIG.tsx').read().split('\n')
if ORIG and ORIG[-1] == '':
    ORIG = ORIG[:-1]


def lines(a: int, b: int) -> list:
    return ORIG[a - 1:b]


def contains(path: str, block: list, deltas=None, label='') -> bool:
    content = open(path).read().split('\n')
    block_str = list(block)
    if deltas:
        for old, new in deltas:
            idx = [i for i, l in enumerate(block_str) if l.startswith(old)]
            assert len(idx) == 1, f'delta source line not found (or ambiguous) in block: {old!r}'
            block_str[idx[0]] = new + block_str[idx[0]][len(old):]
    n = len(block_str)
    for start in range(len(content) - n + 1):
        if content[start:start + n] == block_str:
            print(f'  {path.split("/")[-1]:32s} {label or f"{len(block)} lines"}: byte-identical'
                  + (' (+export keyword)' if deltas else ''))
            return True
    print(f'  {path.split("/")[-1]:32s} {label or ""}: MISMATCH — block NOT found byte-identical')
    return False


BASE = '/home/z/my-project/src/components/game/battle-royale/'
ok = True

print('playing-view.tsx (git HEAD, 991 lines) → modules + orchestrator:')
ok &= contains(BASE + 'playing/animated-number.tsx', lines(24, 68),
               deltas=[('const AnimatedNumber = React.memo(', 'export const AnimatedNumber = React.memo(')],
               label='AnimatedNumber (24-68)')
ok &= contains(BASE + 'playing/use-blink-eliminated.ts', lines(151, 186), label='blink logic (151-186)')
ok &= contains(BASE + 'playing/use-elimination-clock.ts', lines(268, 322), label='elimination clock (268-322)')
ok &= contains(BASE + 'playing/use-lyric-lines.ts', lines(324, 356), label='lyric memo (324-356)')
ok &= contains(BASE + 'playing/elimination-hud.tsx', lines(435, 559), label='elimination HUD JSX (435-559)')
ok &= contains(BASE + 'playing/elimination-overlay.tsx', lines(582, 636), label='elimination overlay JSX (582-636)')
ok &= contains(BASE + 'playing/timer-bar.tsx', lines(667, 710), label='timer bar JSX (667-710)')
ok &= contains(BASE + 'playing/player-cards-strip.tsx', lines(358, 359), label='activeMicPlayers (358-359)')
ok &= contains(BASE + 'playing/player-cards-strip.tsx', lines(712, 851), label='player cards JSX (712-851)')
ok &= contains(BASE + 'playing/note-highway-section.tsx', lines(110, 111), label='EMPTY_PLAYER_PERF (110-111)')
ok &= contains(BASE + 'playing/note-highway-section.tsx', lines(361, 385), label='strip logic (361-385)')
ok &= contains(BASE + 'playing/note-highway-section.tsx', lines(853, 878), label='note highway JSX (853-878)')
ok &= contains(BASE + 'playing/bottom-hud.tsx', lines(880, 913), label='bottom HUD JSX (880-913)')
ok &= contains(BASE + 'playing/lyrics-block.tsx', lines(915, 968), label='lyrics JSX (915-968)')
# orchestrator keeps
ok &= contains(BASE + 'playing-view.tsx', lines(70, 108), label='orchestrator: props (70-108)')
ok &= contains(BASE + 'playing-view.tsx', lines(113, 149), label='orchestrator: signature + head (113-149)')
ok &= contains(BASE + 'playing-view.tsx', lines(188, 266), label='orchestrator: webcam + effects (188-266)')
ok &= contains(BASE + 'playing-view.tsx', lines(387, 433), label='orchestrator: return + audio + bg (387-433)')
ok &= contains(BASE + 'playing-view.tsx', lines(561, 580), label='orchestrator: HUD chrome (561-580)')
ok &= contains(BASE + 'playing-view.tsx', lines(638, 652), label='orchestrator: countdown/GO (638-652)')
ok &= contains(BASE + 'playing-view.tsx', lines(654, 665), label='orchestrator: B3.2 + LAYOUT comments (654-665)')
ok &= contains(BASE + 'playing-view.tsx', lines(970, 991), label='orchestrator: progress + closing (970-991)')

# coverage map of original body lines (24..991, everything after the imports)
blocks = [
    (24, 68), (70, 108), (110, 111), (113, 149), (151, 186), (188, 266),
    (268, 322), (324, 356), (358, 359), (361, 385), (387, 433), (435, 559),
    (561, 580), (582, 636), (638, 652), (654, 655), (657, 665), (667, 710),
    (712, 851), (853, 878), (880, 913), (915, 968), (970, 991),
]
covered = set()
for a, b in blocks:
    covered.update(range(a, b + 1))
target = set(range(24, 992))
missing = sorted(target - covered)
# blank glue lines (23,69,109,112,150,187,267,323,357,360,386,434,560,581,637,653,656,666,711,852,879,914,969)
glue = {23, 69, 109, 112, 150, 187, 267, 323, 357, 360, 386, 434, 560, 581, 637, 653, 656, 666, 711, 852, 879, 914, 969}
non_blank_missing = [m for m in missing if m not in glue]
blank_missing = [m for m in missing if m in glue]
print(f'  coverage: {len(covered)}/{len(target)} body lines mapped to a destination; '
      f'{len(blank_missing)} unmapped are blank glue lines ({blank_missing}); '
      f'non-blank unmapped: {non_blank_missing}')
ok &= not non_blank_missing

sys.exit(0 if ok else 1)
