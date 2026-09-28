'use client';

/**
 * Sheet Music (Notenblatt) Recognition Dialog (user request 5)
 *
 * Flow: upload an IMAGE or PDF of sheet music → (PDF: pdf.js renders every
 * page to a PNG client-side) → POST /api/sheet-music (backend VLM/OMR,
 * page by page) → pick the correct voice/strand ("Strang") → import the
 * notes into the editor EXACTLY like the MIDI import (pitch + timing basis):
 *
 * - The backend returns one entry per detected staff/voice; the user picks
 *   the correct strand in a radio-style list (first preselected).
 * - PDF: navigate pages (thumbnails + prev/next); either analyze ONLY the
 *   current page or ALL pages — for "all pages" the per-page voices are
 *   merged by staff INDEX (staff order is stable across pages), notes stay
 *   in reading order (page 1 first).
 * - Tempo (from the tempo marking) is editable, transposition optional.
 * - Optional lyrics textarea → syllables are assigned sequentially in
 *   reading order; notes without a syllable keep '~' (editable later).
 * - Timing: linear (no pickup handling) — durationMs = beats × (60000/tempo),
 *   startTimeMs = cumulative sum of previous beats × (60000/tempo).
 * - The result is handed over via the SAME MidiImportResult shape /
 *   onImport contract as the MIDI dialog → karaoke-editor applies it
 *   through the identical code path (notes replace after confirm, bpm, gap 0).
 *
 * The VLM recognition is imperfect (user knows it's AI-assisted) — the
 * dialog is honest: confidence + model warnings are always shown.
 *
 * R13: this file is now a slim ORCHESTRATOR — the implementation lives
 * in ./sheet-music/ (types, pure analysis helpers, the useSheetMusicDialog
 * state hook and the render sections). Public exports & import path are
 * UNCHANGED (the three result types are re-exported below).
 */
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { X, ScanLine, AlertTriangle } from 'lucide-react';
// READ-ONLY reuse of the MIDI import contract (midi-import-dialog is owned
// by another agent — only the exported result TYPE is imported here).
import type { MidiImportResult } from './midi-import-dialog';
import { useSheetMusicDialog } from './sheet-music/use-sheet-music-dialog';
import { SheetMusicUploadSection } from './sheet-music/upload-section';
import { SheetMusicAnalysisResultSection } from './sheet-music/analysis-result-section';
import { SheetMusicImportActions } from './sheet-music/import-actions';

// Public type surface (unchanged): backend result types of /api/sheet-music.
export type { SheetMusicNote, SheetMusicVoice, SheetMusicAnalysis } from './sheet-music/types';

// ─── Dialog ────────────────────────────────────────────────────────────

interface SheetMusicDialogProps {
  open: boolean;
  onOpenChange: (_open: boolean) => void;
  /** Same contract as the MIDI import dialog — karaoke-editor reuses its handler. */
  onImport: (_result: MidiImportResult) => void;
  /** True when the song already has notes → inline "replace notes?" confirm. */
  hasExistingNotes: boolean;
}

export function SheetMusicDialog({ open, onOpenChange, onImport, hasExistingNotes }: SheetMusicDialogProps) {
  const {
    // i18n helpers
    t,
    sm,
    // state + setters
    fileInputRef,
    image,
    isAnalyzing,
    isRenderingPdf,
    analysis,
    error,
    selectedVoice,
    selectedVoiceId,
    setSelectedVoiceId,
    tempo,
    setTempo,
    transpose,
    setTranspose,
    lyricsText,
    setLyricsText,
    syllables,
    selectedVoiceDuration,
    confirmReplace,
    setConfirmReplace,
    pdfPages,
    pdfFileName,
    pdfTotalPages,
    currentPageIndex,
    analyzeAll,
    setAnalyzeAll,
    analysisIsMerged,
    // derived flags
    lowQuality,
    analyzingText,
    canAnalyze,
    canImport,
    // handlers
    handlePickedFile,
    handleChooseFile,
    handleAnalyze,
    goToPage,
    emitImport,
    handleImportClick,
    closeDialog,
  } = useSheetMusicDialog({ onOpenChange, onImport, hasExistingNotes });

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={closeDialog}
      role="dialog"
      aria-modal="true"
      aria-label={t('editor.midiImport.sheetMusic.title')}
      data-testid="sheet-music-overlay"
    >
      <Card
        className="bg-slate-900 border-slate-700 text-white w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        data-testid="sheet-music-dialog"
      >
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-cyan-400" />
            {t('editor.midiImport.sheetMusic.title')}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={closeDialog}
            className="text-slate-400 hover:text-white"
            aria-label={t('editor.midiImport.cancel')}
          >
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto space-y-5">
          {error && (
            <div
              className="bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg p-3 text-sm flex items-start gap-2"
              role="alert"
              data-testid="sheet-music-error"
            >
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <p className="text-xs text-slate-500">
            {t('editor.midiImport.sheetMusic.description')}
          </p>

          {/* Section 1: Image/PDF upload + preview + page navigation + analyze */}
          <SheetMusicUploadSection
            t={t}
            fileInputRef={fileInputRef}
            image={image}
            pdfFileName={pdfFileName}
            pdfPages={pdfPages}
            pdfTotalPages={pdfTotalPages}
            currentPageIndex={currentPageIndex}
            analyzeAll={analyzeAll}
            setAnalyzeAll={setAnalyzeAll}
            isAnalyzing={isAnalyzing}
            isRenderingPdf={isRenderingPdf}
            canAnalyze={canAnalyze}
            analyzingText={analyzingText}
            handlePickedFile={handlePickedFile}
            handleChooseFile={handleChooseFile}
            handleAnalyze={handleAnalyze}
            goToPage={goToPage}
          />

          {/* PDF pages are being rendered */}
          {isRenderingPdf && (
            <div
              className="flex items-center gap-3 bg-slate-800/60 border border-slate-700 rounded-lg p-3 text-sm text-slate-300"
              role="status"
              data-testid="sheet-music-pdf-rendering"
            >
              <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              {t('editor.midiImport.sheetMusic.pdfRendering')}
            </div>
          )}

          {/* Section 2: Analysis result (honest: confidence + warnings) */}
          {analysis && (
            <>
              <Separator className="bg-slate-700" />
            <SheetMusicAnalysisResultSection
              t={t}
              sm={sm}
              analysis={analysis}
              analysisIsMerged={analysisIsMerged}
              selectedVoice={selectedVoice}
              selectedVoiceId={selectedVoiceId}
              setSelectedVoiceId={setSelectedVoiceId}
              setConfirmReplace={setConfirmReplace}
              selectedVoiceDuration={selectedVoiceDuration}
              lowQuality={lowQuality}
              tempo={tempo}
              setTempo={setTempo}
              transpose={transpose}
              setTranspose={setTranspose}
              lyricsText={lyricsText}
              setLyricsText={setLyricsText}
              syllables={syllables}
            />
            </>
          )}

          {/* Actions */}
          <SheetMusicImportActions
            t={t}
            confirmReplace={confirmReplace}
            setConfirmReplace={setConfirmReplace}
            canImport={canImport}
            emitImport={emitImport}
            handleImportClick={handleImportClick}
            closeDialog={closeDialog}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default SheetMusicDialog;

