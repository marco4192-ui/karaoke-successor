#!/usr/bin/env python3
"""R13 verify: byte-identity of the sheet-music-dialog split.

Each moved block (ORIG line range) must appear in its target module after
the documented mechanical transform (dedent by N, optionally with `export`
keywords added). Hand-written composition code (props wiring, section
elements in the orchestrator) is listed explicitly for the coverage report.
"""
import sys

ORIG = open('tmp-analysis/r13-sheet-music-dialog-ORIG.tsx').read().split('\n')
SM = 'src/components/editor/sheet-music/'
DIA = 'src/components/editor/sheet-music-dialog.tsx'

def read(p):
    return open(p).read().split('\n')

def dedent(lines, n):
    out = []
    for l in lines:
        if l.strip() == '':
            out.append(l)
        else:
            assert l.startswith(' ' * n), f"no {n}-space prefix: {l!r}"
            out.append(l[n:])
    return out

failures = 0
def check(name, expected_lines, target_path, also_export=()):
    """expected_lines: already-transformed block. also_export: substrings that
    may additionally have `export ` prefixed in the target (documented deltas)."""
    global failures
    target = read(target_path)
    n = len(expected_lines)
    found = None
    for i in range(len(target) - n + 1):
        window = target[i:i + n]
        ok = True
        for w, e in zip(window, expected_lines):
            if w == e:
                continue
            # documented delta: `export` keyword added on a previously private decl
            if ('export ' + e) == w and e in also_export:
                continue
            ok = False
            break
        if ok:
            found = i
            break
    if found is None:
        failures += 1
        print(f"FAIL {name}: {n} lines not found in {target_path}")
        # near-miss debug
        best = None
        for i in range(len(target) - n + 1):
            mism = sum(1 for w, e in zip(target[i:i + n], expected_lines) if w != e and w != 'export ' + e)
            if best is None or mism < best[1]:
                best = (i, mism)
        print(f"      best window at target line {best[0]+1} with {best[1]} mismatches")
        for j, (w, e) in enumerate(zip(target[best[0]:best[0]+n], expected_lines)):
            if w != e and not (w == 'export ' + e and e in also_export):
                print(f"      expected: {e!r}")
                print(f"      target  : {w!r}")
    else:
        print(f"OK   {name}: {n} lines at {target_path.split('/')[-1]}:{found + 1}")

def blk(s, e):
    return ORIG[s - 1:e]

# ── types.ts ──
check('types.ts 55-94', blk(55, 94), SM + 'types.ts',
      also_export=('interface SheetMusicApiResponse {', 'interface PickedImage {',
                   "const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'];",
                   'const MERGED_NOTE_CAP = 1500;'))

# ── analysis-utils.ts ──
check('analysis-utils.ts 96-172', blk(96, 172), SM + 'analysis-utils.ts',
      also_export=('function mergePageAnalyses(pages: SheetMusicAnalysis[]): SheetMusicAnalysis | null {',
                   'function guessMimeType(name: string, fallback?: string): string | null {',
                   'function formatBeatsDuration(totalBeats: number, bpm: number): string {'))

# ── use-sheet-music-dialog.ts (no dedent — same nesting level) ──
check('hook 186-521', blk(186, 521), SM + 'use-sheet-music-dialog.ts')
check('hook 525-535 (flags)', blk(525, 535), SM + 'use-sheet-music-dialog.ts')

# ── pdf-page-navigation.tsx ──
check('pdf-nav 664-763', dedent(blk(664, 763), 10), SM + 'pdf-page-navigation.tsx')

# ── upload-section.tsx ──
check('upload 584-661', dedent(blk(584, 661), 6), SM + 'upload-section.tsx')
check('upload 765 (closing div)', dedent(blk(765, 765), 6), SM + 'upload-section.tsx')

# ── analysis-result-section.tsx ──
check('analysis-section 784-948', dedent(blk(784, 948), 10), SM + 'analysis-result-section.tsx')

# ── import-actions.tsx ──
check('import-actions 953-1006', dedent(blk(953, 1006), 6), SM + 'import-actions.tsx')

# ── orchestrator verbatim blocks ──
check('dialog doc 1-27', blk(1, 27), DIA)
check('dialog banner+props 174-183', blk(174, 183), DIA)
check('dialog early-return 522-523', blk(522, 523), DIA)
check('dialog overlay+header 536-565', blk(536, 565), DIA)
check('dialog CardContent+error 566-577', blk(566, 577), DIA)
check('dialog description 578-581', blk(578, 581), DIA)
check('dialog pdf-rendering 766-777', blk(766, 777), DIA)
check('dialog section2 guard+separator 778-782', blk(778, 782), DIA)
check('dialog fragment close 949-950', blk(949, 950), DIA)
check('dialog closing 1007-1011', blk(1007, 1011), DIA)
check('dialog default export 1013', blk(1013, 1013), DIA)
# component signature (hand-written, must be identical to ORIG 185)
sig = 'export function SheetMusicDialog({ open, onOpenChange, onImport, hasExistingNotes }: SheetMusicDialogProps) {'
if sig in read(DIA):
    print("OK   dialog signature 185 (verbatim)")
else:
    failures += 1
    print("FAIL dialog signature 185")

# ── section-1 comment + guard text must survive in the orchestrator/upload-section ──
checks_text = [
    (DIA, '          {/* Section 1: Image/PDF upload + preview + page navigation + analyze */}'),
    (DIA, '          {/* Actions */}'),
    (DIA, '          {/* Section 2: Analysis result (honest: confidence + warnings) */}'),
    (SM + 'upload-section.tsx', '      {/* ── PDF page navigation (thumbnails + prev/next + page indicator) ── */}'),
    (SM + 'upload-section.tsx', '      {pdfPages && pdfPages.length > 0 && ('),
]
for path, text in checks_text:
    if text in read(path):
        print(f"OK   comment/guard kept: {text.strip()[:60]}...")
    else:
        failures += 1
        print(f"FAIL comment/guard missing in {path}: {text!r}")

# ── coverage: which ORIG lines are NOT moved verbatim anywhere ──
covered = set()
def add(s, e):
    covered.update(range(s, e + 1))
for s, e in [(1, 27), (55, 94), (96, 172), (174, 183), (185, 185), (186, 521), (522, 523),
             (525, 535), (536, 565), (566, 577), (578, 581), (584, 661), (664, 763),
             (765, 765), (766, 777), (778, 782), (784, 948), (949, 950), (953, 1006),
             (1007, 1011), (1013, 1013)]:
    add(s, e)
not_moved = [ln for ln in range(1, len(ORIG)) if ln not in covered]  # (last entry = trailing newline)
# expected: 1-54 header+imports (doc 1-27 kept in orchestrator; 28-54 replaced),
# blanks (95, 173, 184, 524, 582, 583*, 783, 951, 952*, 1012), guard lines
# 662-663+764 (kept as hand-written JSX in upload-section), * comments kept
# hand-written in the orchestrator.
expected_hand = set(range(28, 55)) | {95, 173, 184, 524, 582, 583, 662, 663, 764, 783, 951, 952, 1012, 1014}
unexpected = [ln for ln in not_moved if ln not in expected_hand]
print(f"\nORIG lines: {len(ORIG)}, verbatim-moved: {len(covered)}, hand-written/replaced: {len(not_moved)}")
if unexpected:
    failures += 1
    print(f"UNEXPECTED unmoved lines: {unexpected}")
    for ln in unexpected:
        print(f"  {ln}: {ORIG[ln-1]!r}")
else:
    print("All unmoved lines are exactly: old header/imports, blanks, the PDF-nav guard lines")
    print("(662-663/764 → hand-written in upload-section) and the section comments (583/952 → orchestrator).")

sys.exit(1 if failures else 0)
