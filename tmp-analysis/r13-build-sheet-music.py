#!/usr/bin/env python3
"""R13 builder: assemble the sheet-music/ modules from the ORIG dialog file.

Every moved block is extracted VERBATIM from tmp-analysis/r13-sheet-music-dialog-ORIG.tsx
(1-based inclusive line ranges); only mechanical transforms are applied:
  - dedent (documented per block)
  - `export` keyword on previously file-private declarations
  - the PDF-navigation JSX block is replaced by <SheetMusicPdfNavigation .../>
"""
ORIG_LINES = open('tmp-analysis/r13-sheet-music-dialog-ORIG.tsx').read().split('\n')

def block(start, end):
    """1-based inclusive slice of the ORIG file."""
    return ORIG_LINES[start - 1:end]

def dedent(lines, n):
    out = []
    for l in lines:
        if l == '' or l.strip() == '':
            out.append(l)
        else:
            assert l.startswith(' ' * n), f"line does not start with {n} spaces: {l!r}"
            out.append(l[n:])
    return out

def write(path, lines):
    content = '\n'.join(lines).rstrip('\n') + '\n'
    open(path, 'w').write(content)
    print(f"wrote {path} ({content.count(chr(10))} lines)")

BASE = 'src/components/editor/sheet-music/'

# ─────────────────────────────────────────────────────────────────────────
# 1) types.ts — ORIG lines 55-94 verbatim (export keywords added where private)
# ─────────────────────────────────────────────────────────────────────────
header = [
    "/**",
    " * Shared types of the sheet music (Notenblatt) recognition dialog.",
    " *",
    " * R13: moved byte-identically from src/components/editor/sheet-music-dialog.tsx",
    " * (only the `export` keyword was added to the previously file-private",
    " * declarations so the dialog modules can share them).",
    " */",
    "",
]
body = block(55, 94)
body = [
    l.replace('interface SheetMusicApiResponse {', 'export interface SheetMusicApiResponse {', 1)
     .replace('interface PickedImage {', 'export interface PickedImage {', 1)
     .replace('const IMAGE_EXTENSIONS =', 'export const IMAGE_EXTENSIONS =', 1)
     .replace('const MERGED_NOTE_CAP =', 'export const MERGED_NOTE_CAP =', 1)
    for l in body
]
write(BASE + 'types.ts', header + body)

# ─────────────────────────────────────────────────────────────────────────
# 2) analysis-utils.ts — ORIG lines 96-172 verbatim (export keywords added)
# ─────────────────────────────────────────────────────────────────────────
header = [
    "/**",
    " * Pure helpers of the sheet music dialog: per-page analysis merging,",
    " * mime-type guessing and beats→m:ss formatting.",
    " *",
    " * R13: moved byte-identically from src/components/editor/sheet-music-dialog.tsx",
    " * (only the `export` keyword was added to the three functions).",
    " */",
    "import type { SheetMusicAnalysis, SheetMusicVoice } from './types';",
    "import { MERGED_NOTE_CAP } from './types';",
    "",
]
body = block(96, 172)
body = [
    l.replace('function mergePageAnalyses(', 'export function mergePageAnalyses(', 1)
     .replace('function guessMimeType(', 'export function guessMimeType(', 1)
     .replace('function formatBeatsDuration(', 'export function formatBeatsDuration(', 1)
    for l in body
]
write(BASE + 'analysis-utils.ts', header + body)

# ─────────────────────────────────────────────────────────────────────────
# 3) use-sheet-music-dialog.ts — ORIG lines 186-521 + 525-535 verbatim
#    (state + memos + handlers + derived flags, wrapped in one hook)
# ─────────────────────────────────────────────────────────────────────────
header = [
    "'use client';",
    "",
    "/**",
    " * All dialog state + handlers of the sheet music recognition dialog",
    " * (file/PDF picking, page navigation, backend analysis, note emission).",
    " *",
    " * R13: the body is moved byte-identically from the SheetMusicDialog",
    " * component (src/components/editor/sheet-music-dialog.tsx) — hook order,",
    " * effect/callback bodies and dep arrays are unchanged. The only",
    " * structural deltas: wrapped in this hook function, and the derived",
    " * flags (canAnalyze … analyzingText) are now computed unconditionally",
    " * instead of after the component's `if (!open) return null;` early",
    " * return (pure state derivations — no behavioral difference).",
    " */",
    "import { useState, useCallback, useMemo, useRef } from 'react';",
    "import { v4 as uuidv4 } from 'uuid';",
    "import type { Note } from '@/types/game';",
    "import { parseLyricsToSyllables } from '@/lib/editor/syllable-separator';",
    "import { useTranslation } from '@/lib/i18n/translations';",
    "import { isTauri } from '@/lib/tauri-file-storage';",
    "import { nativePickFileOpen, nativeReadFileBytes } from '@/lib/native-fs';",
    "import { midiPitchToFrequency } from '@/lib/utils';",
    "import {",
    "  renderPdfToPageImages,",
    "  isPdfFile,",
    "  MAX_PDF_PAGES,",
    "  type PdfPageImage,",
    "} from '@/lib/editor/pdf-render';",
    "// READ-ONLY reuse of the MIDI import contract (midi-import-dialog is owned",
    "// by another agent — only the exported result TYPE is imported here).",
    "import type { MidiImportResult } from '../midi-import-dialog';",
    "import type { PickedImage, SheetMusicAnalysis, SheetMusicApiResponse } from './types';",
    "import { IMAGE_EXTENSIONS } from './types';",
    "import { mergePageAnalyses, guessMimeType } from './analysis-utils';",
    "",
    "/** Parameters of {@link useSheetMusicDialog} (subset of SheetMusicDialogProps). */",
    "export interface UseSheetMusicDialogParams {",
    "  onOpenChange: (_open: boolean) => void;",
    "  /** Same contract as the MIDI import dialog — karaoke-editor reuses its handler. */",
    "  onImport: (_result: MidiImportResult) => void;",
    "  /** True when the song already has notes → inline \"replace notes?\" confirm. */",
    "  hasExistingNotes: boolean;",
    "}",
    "",
    "export function useSheetMusicDialog({ onOpenChange, onImport, hasExistingNotes }: UseSheetMusicDialogParams) {",
]
body = block(186, 521) + [''] + block(525, 535)
ret = [
    "",
    "  return {",
    "    // i18n helpers (shared with the render sections)",
    "    t,",
    "    sm,",
    "    // state + setters",
    "    fileInputRef,",
    "    image,",
    "    isAnalyzing,",
    "    isRenderingPdf,",
    "    analysis,",
    "    error,",
    "    selectedVoice,",
    "    selectedVoiceId,",
    "    setSelectedVoiceId,",
    "    tempo,",
    "    setTempo,",
    "    transpose,",
    "    setTranspose,",
    "    lyricsText,",
    "    setLyricsText,",
    "    syllables,",
    "    selectedVoiceDuration,",
    "    confirmReplace,",
    "    setConfirmReplace,",
    "    pdfPages,",
    "    pdfFileName,",
    "    pdfTotalPages,",
    "    currentPageIndex,",
    "    analyzeAll,",
    "    setAnalyzeAll,",
    "    analysisIsMerged,",
    "    // derived flags",
    "    lowQuality,",
    "    analyzingText,",
    "    canAnalyze,",
    "    canImport,",
    "    // handlers",
    "    handlePickedFile,",
    "    handleChooseFile,",
    "    handleAnalyze,",
    "    goToPage,",
    "    emitImport,",
    "    handleImportClick,",
    "    closeDialog,",
    "  };",
    "}",
]
write(BASE + 'use-sheet-music-dialog.ts', header + body + ret)

# ─────────────────────────────────────────────────────────────────────────
# 4) pdf-page-navigation.tsx — ORIG lines 664-763 (div element), dedent 10
# ─────────────────────────────────────────────────────────────────────────
header = [
    "'use client';",
    "",
    "/**",
    " * PDF page navigation: thumbnails + prev/next + page indicator + the",
    " * analyze-all toggle (rendered inside the upload section when a PDF",
    " * with pages is loaded — the null/empty guard stays in the parent).",
    " *",
    " * R13: JSX moved byte-identically from src/components/editor/sheet-music-dialog.tsx",
    " * (only dedented for the component level).",
    " */",
    "import { Button } from '@/components/ui/button';",
    "import { ChevronLeft, ChevronRight, FileText, Layers } from 'lucide-react';",
    "import { cn } from '@/lib/utils';",
    "import type { PdfPageImage } from '@/lib/editor/pdf-render';",
    "",
    "interface SheetMusicPdfNavigationProps {",
    "  /** Rendered PDF pages (guaranteed non-empty — parent guards). */",
    "  pdfPages: PdfPageImage[];",
    "  pdfTotalPages: number;",
    "  currentPageIndex: number;",
    "  isAnalyzing: boolean;",
    "  isRenderingPdf: boolean;",
    "  analyzeAll: boolean;",
    "  setAnalyzeAll: (checked: boolean) => void;",
    "  goToPage: (index: number) => void;",
    "  t: (key: string) => string;",
    "}",
    "",
    "/** Thumbnails + prev/next + page indicator + analyze-all toggle. */",
    "export function SheetMusicPdfNavigation({",
    "  pdfPages,",
    "  pdfTotalPages,",
    "  currentPageIndex,",
    "  isAnalyzing,",
    "  isRenderingPdf,",
    "  analyzeAll,",
    "  setAnalyzeAll,",
    "  goToPage,",
    "  t,",
    "}: SheetMusicPdfNavigationProps) {",
    "  return (",
]
body = dedent(block(664, 763), 10)
footer = [
    "  );",
    "}",
]
write(BASE + 'pdf-page-navigation.tsx', header + body + footer)

# ─────────────────────────────────────────────────────────────────────────
# 5) upload-section.tsx — ORIG lines 583-661 + PdfNavigation + line 765,
#    dedent 6
# ─────────────────────────────────────────────────────────────────────────
header = [
    "'use client';",
    "",
    "/**",
    " * Section 1 of the sheet music dialog: image/PDF upload + preview +",
    " * analyze button + the embedded PDF page navigation.",
    " *",
    " * R13: JSX moved byte-identically from src/components/editor/sheet-music-dialog.tsx",
    " * (dedented for the component level; the inline PDF-navigation block was",
    " * replaced by the SheetMusicPdfNavigation component — guard unchanged;",
    " * the leading \"Section 1\" comment stayed in the orchestrator).",
    " */",
    "import { Button } from '@/components/ui/button';",
    "import { Upload, ScanLine, FileText } from 'lucide-react';",
    "import type { RefObject } from 'react';",
    "import type { PdfPageImage } from '@/lib/editor/pdf-render';",
    "import type { PickedImage } from './types';",
    "import { SheetMusicPdfNavigation } from './pdf-page-navigation';",
    "",
    "interface SheetMusicUploadSectionProps {",
    "  t: (key: string) => string;",
    "  /** Hidden persistent file input ref (browser path). */",
    "  fileInputRef: RefObject<HTMLInputElement | null>;",
    "  image: PickedImage | null;",
    "  pdfFileName: string | null;",
    "  pdfPages: PdfPageImage[] | null;",
    "  pdfTotalPages: number;",
    "  currentPageIndex: number;",
    "  analyzeAll: boolean;",
    "  setAnalyzeAll: (checked: boolean) => void;",
    "  isAnalyzing: boolean;",
    "  isRenderingPdf: boolean;",
    "  canAnalyze: boolean;",
    "  analyzingText: string;",
    "  handlePickedFile: (file: File | null) => void;",
    "  handleChooseFile: () => void;",
    "  handleAnalyze: () => void;",
    "  goToPage: (index: number) => void;",
    "}",
    "",
    "/** Image/PDF upload + preview + analyze (Section 1). */",
    "export function SheetMusicUploadSection({",
    "  t,",
    "  fileInputRef,",
    "  image,",
    "  pdfFileName,",
    "  pdfPages,",
    "  pdfTotalPages,",
    "  currentPageIndex,",
    "  analyzeAll,",
    "  setAnalyzeAll,",
    "  isAnalyzing,",
    "  isRenderingPdf,",
    "  canAnalyze,",
    "  analyzingText,",
    "  handlePickedFile,",
    "  handleChooseFile,",
    "  handleAnalyze,",
    "  goToPage,",
    "}: SheetMusicUploadSectionProps) {",
    "  return (",
]
body = dedent(block(584, 661), 6)  # (Section-1 comment stays in the orchestrator)
nav = [
    "      {/* ── PDF page navigation (thumbnails + prev/next + page indicator) ── */}",
    "      {pdfPages && pdfPages.length > 0 && (",
    "        <SheetMusicPdfNavigation",
    "          pdfPages={pdfPages}",
    "          pdfTotalPages={pdfTotalPages}",
    "          currentPageIndex={currentPageIndex}",
    "          isAnalyzing={isAnalyzing}",
    "          isRenderingPdf={isRenderingPdf}",
    "          analyzeAll={analyzeAll}",
    "          setAnalyzeAll={setAnalyzeAll}",
    "          goToPage={goToPage}",
    "          t={t}",
    "        />",
    "      )}",
]
close_div = dedent(block(765, 765), 6)
footer = [
    "  );",
    "}",
]
write(BASE + 'upload-section.tsx', header + body + nav + close_div + footer)

# ─────────────────────────────────────────────────────────────────────────
# 6) analysis-result-section.tsx — ORIG lines 784-948, dedent 10
# ─────────────────────────────────────────────────────────────────────────
header = [
    "'use client';",
    "",
    "/**",
    " * Section 2 of the sheet music dialog: analysis result (confidence +",
    " * warnings), voice/strand picker, tempo, transposition and the optional",
    " * lyrics textarea. Rendered only when an analysis exists (guard stays",
    " * in the orchestrator, which also renders the leading Separator).",
    " *",
    " * R13: JSX moved byte-identically from src/components/editor/sheet-music-dialog.tsx",
    " * (dedented for the component level; the five sibling blocks are wrapped",
    " * in a Fragment — the original fragment + leading Separator + guard stay",
    " * in the orchestrator).",
    " */",
    "import { Input } from '@/components/ui/input';",
    "import { Label } from '@/components/ui/label';",
    "import { Textarea } from '@/components/ui/textarea';",
    "import { AlertTriangle, Gauge, Layers, MessageSquareWarning, Music4 } from 'lucide-react';",
    "import { cn } from '@/lib/utils';",
    "import type { SheetMusicAnalysis, SheetMusicVoice } from './types';",
    "import { formatBeatsDuration } from './analysis-utils';",
    "",
    "interface SheetMusicAnalysisResultSectionProps {",
    "  t: (key: string) => string;",
    "  sm: (key: string) => string;",
    "  analysis: SheetMusicAnalysis;",
    "  analysisIsMerged: boolean;",
    "  selectedVoice: SheetMusicVoice | null;",
    "  selectedVoiceId: number;",
    "  setSelectedVoiceId: (id: number) => void;",
    "  setConfirmReplace: (value: boolean) => void;",
    "  selectedVoiceDuration: number;",
    "  lowQuality: boolean;",
    "  tempo: number;",
    "  setTempo: (value: number) => void;",
    "  transpose: number;",
    "  setTranspose: (value: number) => void;",
    "  lyricsText: string;",
    "  setLyricsText: (value: string) => void;",
    "  syllables: string[];",
    "}",
    "",
    "/** Analysis result: quality + voices + tempo + transpose + lyrics (Section 2). */",
    "export function SheetMusicAnalysisResultSection({",
    "  t,",
    "  sm,",
    "  analysis,",
    "  analysisIsMerged,",
    "  selectedVoice,",
    "  selectedVoiceId,",
    "  setSelectedVoiceId,",
    "  setConfirmReplace,",
    "  selectedVoiceDuration,",
    "  lowQuality,",
    "  tempo,",
    "  setTempo,",
    "  transpose,",
    "  setTranspose,",
    "  lyricsText,",
    "  setLyricsText,",
    "  syllables,",
    "}: SheetMusicAnalysisResultSectionProps) {",
    "  return (",
]
body = ['    <>'] + dedent(block(784, 948), 10) + ['    </>']
footer = [
    "  );",
    "}",
]
write(BASE + 'analysis-result-section.tsx', header + body + footer)

# ─────────────────────────────────────────────────────────────────────────
# 7) import-actions.tsx — ORIG lines 952-1006, dedent 6
# ─────────────────────────────────────────────────────────────────────────
header = [
    "'use client';",
    "",
    "/**",
    " * Actions bar of the sheet music dialog: cancel button and the import",
    " * button (with the inline \"replace notes?\" confirm when the song",
    " * already has notes).",
    " *",
    " * R13: JSX moved byte-identically from src/components/editor/sheet-music-dialog.tsx",
    " * (dedented for the component level; the leading \"Actions\" comment",
    " * stayed in the orchestrator).",
    " */",
    "import { Button } from '@/components/ui/button';",
    "import { AlertTriangle, ScanLine } from 'lucide-react';",
    "",
    "interface SheetMusicImportActionsProps {",
    "  t: (key: string) => string;",
    "  confirmReplace: boolean;",
    "  setConfirmReplace: (value: boolean) => void;",
    "  canImport: boolean;",
    "  emitImport: () => void;",
    "  handleImportClick: () => void;",
    "  closeDialog: () => void;",
    "}",
    "",
    "/** Cancel + import actions incl. the inline replace-confirm. */",
    "export function SheetMusicImportActions({",
    "  t,",
    "  confirmReplace,",
    "  setConfirmReplace,",
    "  canImport,",
    "  emitImport,",
    "  handleImportClick,",
    "  closeDialog,",
    "}: SheetMusicImportActionsProps) {",
    "  return (",
]
body = dedent(block(953, 1006), 6)  # (Actions comment stays in the orchestrator)
footer = [
    "  );",
    "}",
]
write(BASE + 'import-actions.tsx', header + body + footer)

print("\nAll sheet-music/ modules written.")

# ─────────────────────────────────────────────────────────────────────────
# 8) Orchestrator sheet-music-dialog.tsx (slim): verbatim doc + props +
#    hook call + JSX skeleton with the section components
# ─────────────────────────────────────────────────────────────────────────
doc = block(1, 28)
# insert the R13 orchestrator note before the closing */
assert doc[-1] == ' */'
doc = doc[:-1] + [
    " *",
    " * R13: this file is now a slim ORCHESTRATOR — the implementation lives",
    " * in ./sheet-music/ (types, pure analysis helpers, the useSheetMusicDialog",
    " * state hook and the render sections). Public exports & import path are",
    " * UNCHANGED (the three result types are re-exported below).",
    " */",
]

imports = [
    "import { Button } from '@/components/ui/button';",
    "import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';",
    "import { Separator } from '@/components/ui/separator';",
    "import { X, ScanLine, AlertTriangle } from 'lucide-react';",
    "// READ-ONLY reuse of the MIDI import contract (midi-import-dialog is owned",
    "// by another agent — only the exported result TYPE is imported here).",
    "import type { MidiImportResult } from './midi-import-dialog';",
    "import { useSheetMusicDialog } from './sheet-music/use-sheet-music-dialog';",
    "import { SheetMusicUploadSection } from './sheet-music/upload-section';",
    "import { SheetMusicAnalysisResultSection } from './sheet-music/analysis-result-section';",
    "import { SheetMusicImportActions } from './sheet-music/import-actions';",
    "",
    "// Public type surface (unchanged): backend result types of /api/sheet-music.",
    "export type { SheetMusicNote, SheetMusicVoice, SheetMusicAnalysis } from './sheet-music/types';",
    "",
]

props = block(174, 183)

component = [
    "export function SheetMusicDialog({ open, onOpenChange, onImport, hasExistingNotes }: SheetMusicDialogProps) {",
    "  const {",
    "    // i18n helpers",
    "    t,",
    "    sm,",
    "    // state + setters",
    "    fileInputRef,",
    "    image,",
    "    isAnalyzing,",
    "    isRenderingPdf,",
    "    analysis,",
    "    error,",
    "    selectedVoice,",
    "    selectedVoiceId,",
    "    setSelectedVoiceId,",
    "    tempo,",
    "    setTempo,",
    "    transpose,",
    "    setTranspose,",
    "    lyricsText,",
    "    setLyricsText,",
    "    syllables,",
    "    selectedVoiceDuration,",
    "    confirmReplace,",
    "    setConfirmReplace,",
    "    pdfPages,",
    "    pdfFileName,",
    "    pdfTotalPages,",
    "    currentPageIndex,",
    "    analyzeAll,",
    "    setAnalyzeAll,",
    "    analysisIsMerged,",
    "    // derived flags",
    "    lowQuality,",
    "    analyzingText,",
    "    canAnalyze,",
    "    canImport,",
    "    // handlers",
    "    handlePickedFile,",
    "    handleChooseFile,",
    "    handleAnalyze,",
    "    goToPage,",
    "    emitImport,",
    "    handleImportClick,",
    "    closeDialog,",
    "  } = useSheetMusicDialog({ onOpenChange, onImport, hasExistingNotes });",
    "",
]
component += block(522, 523)  # blank + `if (!open) return null;`
component += [""] + block(536, 565)  # blank + overlay/Card/CardHeader JSX
component += block(566, 577)  # CardContent open + error block
component += [""] + block(578, 581)  # blank + description paragraph
component += [
    "",
    "          {/* Section 1: Image/PDF upload + preview + page navigation + analyze */}",
    "          <SheetMusicUploadSection",
    "            t={t}",
    "            fileInputRef={fileInputRef}",
    "            image={image}",
    "            pdfFileName={pdfFileName}",
    "            pdfPages={pdfPages}",
    "            pdfTotalPages={pdfTotalPages}",
    "            currentPageIndex={currentPageIndex}",
    "            analyzeAll={analyzeAll}",
    "            setAnalyzeAll={setAnalyzeAll}",
    "            isAnalyzing={isAnalyzing}",
    "            isRenderingPdf={isRenderingPdf}",
    "            canAnalyze={canAnalyze}",
    "            analyzingText={analyzingText}",
    "            handlePickedFile={handlePickedFile}",
    "            handleChooseFile={handleChooseFile}",
    "            handleAnalyze={handleAnalyze}",
    "            goToPage={goToPage}",
    "          />",
    "",
]
component += block(766, 777)  # blank + isRenderingPdf status block
component += [""] + block(778, 782)  # blank + Section 2 comment + guard + fragment + Separator
component += [
    "            <SheetMusicAnalysisResultSection",
    "              t={t}",
    "              sm={sm}",
    "              analysis={analysis}",
    "              analysisIsMerged={analysisIsMerged}",
    "              selectedVoice={selectedVoice}",
    "              selectedVoiceId={selectedVoiceId}",
    "              setSelectedVoiceId={setSelectedVoiceId}",
    "              setConfirmReplace={setConfirmReplace}",
    "              selectedVoiceDuration={selectedVoiceDuration}",
    "              lowQuality={lowQuality}",
    "              tempo={tempo}",
    "              setTempo={setTempo}",
    "              transpose={transpose}",
    "              setTranspose={setTranspose}",
    "              lyricsText={lyricsText}",
    "              setLyricsText={setLyricsText}",
    "              syllables={syllables}",
    "            />",
]
component += block(949, 950)  # `</>` + `)}`
component += [
    "",
    "          {/* Actions */}",
    "          <SheetMusicImportActions",
    "            t={t}",
    "            confirmReplace={confirmReplace}",
    "            setConfirmReplace={setConfirmReplace}",
    "            canImport={canImport}",
    "            emitImport={emitImport}",
    "            handleImportClick={handleImportClick}",
    "            closeDialog={closeDialog}",
    "          />",
]
component += block(1007, 1011)  # closing tags + `  );` + `}`
component += ["", "export default SheetMusicDialog;", ""]

import re as _re
_orch = '\n'.join(doc + imports + props + [""] + component + [""])
_orch = _re.sub(r'\n{3,}', '\n\n', _orch)  # collapse assembly-induced double blanks
open('src/components/editor/sheet-music-dialog.tsx', 'w').write(_orch)
print("Orchestrator written.")
