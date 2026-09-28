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
 */

import { useState, useCallback, useMemo, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { X, ScanLine, Upload, AlertTriangle, Gauge, MessageSquareWarning, Music4, ChevronLeft, ChevronRight, FileText, Layers } from 'lucide-react';
import type { Note } from '@/types/game';
import { parseLyricsToSyllables } from '@/lib/editor/syllable-separator';
import { useTranslation } from '@/lib/i18n/translations';
import { isTauri } from '@/lib/tauri-file-storage';
import { nativePickFileOpen, nativeReadFileBytes } from '@/lib/native-fs';
import { cn, midiPitchToFrequency } from '@/lib/utils';
import {
  renderPdfToPageImages,
  isPdfFile,
  MAX_PDF_PAGES,
  type PdfPageImage,
} from '@/lib/editor/pdf-render';
// READ-ONLY reuse of the MIDI import contract (midi-import-dialog is owned
// by another agent — only the exported result TYPE is imported here).
import type { MidiImportResult } from './midi-import-dialog';

// ─── Backend result types (mirror /api/sheet-music) ────────────────────

export interface SheetMusicNote {
  midi: number;
  beats: number;
}

export interface SheetMusicVoice {
  id: number;
  label: string;
  noteCount: number;
  notes: SheetMusicNote[];
}

export interface SheetMusicAnalysis {
  voices: SheetMusicVoice[];
  tempo: number;
  confidence: number;
  warnings: string;
  truncated: boolean;
}

interface SheetMusicApiResponse {
  success: boolean;
  result?: SheetMusicAnalysis;
  error?: string;
}

/** Picked image: preview data URL + raw base64 + mime for the backend. */
interface PickedImage {
  dataUrl: string;
  base64: string;
  mimeType: string;
  fileName: string;
}

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'];

/** Total note cap for a merged (all-PDF-pages) voice. */
const MERGED_NOTE_CAP = 1500;

/**
 * Merge per-page analyses ("all pages" mode): voices are matched by staff
 * INDEX — staff order is stable across pages of the same score. Notes stay
 * in reading order (page 1 first). Tempo from the first page, confidence
 * weighted by note count, warnings deduplicated.
 */
function mergePageAnalyses(pages: SheetMusicAnalysis[]): SheetMusicAnalysis | null {
  const voices: SheetMusicVoice[] = [];
  let tempo = 120;
  let tempoFound = false;
  let confWeight = 0;
  let confSum = 0;
  const warnings: string[] = [];
  let truncated = false;

  for (const page of pages) {
    if (!tempoFound && page.tempo > 0) {
      tempo = page.tempo;
      tempoFound = true;
    }
    const pageNotes = page.voices.reduce((sum, v) => sum + v.noteCount, 0);
    confWeight += pageNotes;
    confSum += page.confidence * pageNotes;
    if (page.warnings && !warnings.includes(page.warnings)) warnings.push(page.warnings);
    truncated = truncated || page.truncated;

    page.voices.forEach((voice, idx) => {
      let target = voices[idx];
      if (!target) {
        target = { id: idx + 1, label: voice.label, noteCount: 0, notes: [] };
        voices[idx] = target;
      }
      for (const note of voice.notes) {
        if (target.notes.length >= MERGED_NOTE_CAP) {
          truncated = true;
          break;
        }
        target.notes.push({ midi: note.midi, beats: note.beats });
      }
      target.noteCount = target.notes.length;
    });
  }

  // Drop voices that ended up empty (a page returned fewer staves than another)
  const filled = voices.filter(v => v && v.noteCount > 0).map((v, i) => ({ ...v, id: i + 1 }));
  if (filled.length === 0) return null;

  const mergedWarnings = warnings.join(' · ').slice(0, 500);
  return {
    voices: filled,
    tempo,
    confidence: confWeight > 0 ? confSum / confWeight : 0.5,
    warnings: mergedWarnings,
    truncated,
  };
}

/** Mime type from a file name/extension (browser file.type can be empty). */
function guessMimeType(name: string, fallback?: string): string | null {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'png') return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'bmp') return 'image/bmp';
  return fallback && fallback.startsWith('image/') ? fallback : null;
}

/** m:ss display for a beats total at a given tempo. */
function formatBeatsDuration(totalBeats: number, bpm: number): string {
  const ms = (totalBeats * 60000) / Math.max(1, bpm);
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

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
  const { t } = useTranslation();

  /** Hidden persistent file input (browser path) — testable + accessible. */
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [image, setImage] = useState<PickedImage | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<SheetMusicAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedVoiceId, setSelectedVoiceId] = useState<number>(-1);
  const [tempo, setTempo] = useState(120);
  const [transpose, setTranspose] = useState(0);
  const [lyricsText, setLyricsText] = useState('');
  const [confirmReplace, setConfirmReplace] = useState(false);

  // ── PDF state (user request: PDF-Erkennung von Notenblättern) ──
  /** Rendered PDF pages (null when a plain image was picked). */
  const [pdfPages, setPdfPages] = useState<PdfPageImage[] | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [pdfTotalPages, setPdfTotalPages] = useState<number>(0);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isRenderingPdf, setIsRenderingPdf] = useState(false);
  /** "Analyze ALL pages" mode — per-page voices merged by staff index. */
  const [analyzeAll, setAnalyzeAll] = useState(false);
  /** True when the current analysis is a merged multi-page result. */
  const [analysisIsMerged, setAnalysisIsMerged] = useState(false);
  /** Progress for the all-pages analysis ("Analysiere Seite 2/4…"). */
  const [analyzeProgress, setAnalyzeProgress] = useState<{ done: number; total: number } | null>(null);

  const sm = useCallback((key: string) => t(`editor.midiImport.sheetMusic.${key}`), [t]);

  // Parsed syllables for the optional sequential assignment (same UX as MIDI)
  const syllables = useMemo(() => {
    if (lyricsText.trim().length === 0) return [];
    const parsed = parseLyricsToSyllables(lyricsText);
    return parsed.lines.flatMap(line => line.words.flatMap(word => word.syllables));
  }, [lyricsText]);

  const selectedVoice = useMemo(
    () => analysis?.voices.find(v => v.id === selectedVoiceId) ?? null,
    [analysis, selectedVoiceId],
  );

  const selectedVoiceDuration = useMemo(() => {
    if (!selectedVoice) return 0;
    return selectedVoice.notes.reduce((sum, n) => sum + n.beats, 0);
  }, [selectedVoice]);

  // ── Step 1: pick an image or PDF (Tauri native picker or browser input) ──
  const resetAnalysisState = useCallback(() => {
    setAnalysis(null);
    setSelectedVoiceId(-1);
    setAnalysisIsMerged(false);
    setConfirmReplace(false);
    setAnalyzeProgress(null);
  }, []);

  /** Load a picked PDF: render pages, show page 1. */
  const loadPdf = useCallback(async (fileName: string, source: File | ArrayBuffer) => {
    setError(null);
    setIsRenderingPdf(true);
    try {
      const { pages, totalPages } = await renderPdfToPageImages(source, {
        maxPages: MAX_PDF_PAGES,
      });
      if (pages.length === 0) {
        setError(t('editor.midiImport.sheetMusic.pdfRenderError'));
        return;
      }
      setPdfPages(pages);
      setPdfFileName(fileName);
      setPdfTotalPages(totalPages);
      setCurrentPageIndex(0);
      resetAnalysisState();
      setImage({
        dataUrl: pages[0].dataUrl,
        base64: pages[0].base64,
        mimeType: 'image/png',
        fileName: `${fileName} (S. 1/${pages.length})`,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[SheetMusic] PDF rendering failed:', err);
      setError(t('editor.midiImport.sheetMusic.pdfRenderError'));
    } finally {
      setIsRenderingPdf(false);
    }
  }, [t, resetAnalysisState]);

  /** Handle a picked browser File (image OR PDF) — from the hidden input. */
  const handlePickedFile = useCallback(async (file: File | null) => {
    if (!file) return; // cancelled
    // Shared reset (new file → previous analysis is stale)
    setError(null);
    setAnalysis(null);
    setSelectedVoiceId(-1);
    setAnalysisIsMerged(false);
    setConfirmReplace(false);
    setPdfPages(null);
    setPdfFileName(null);
    setAnalyzeProgress(null);

    // PDF → render pages client-side (pdf.js)
    if (isPdfFile(file.name, file.type)) {
      await loadPdf(file.name, file);
      return;
    }

    const mimeType = guessMimeType(file.name, file.type);
    if (!mimeType) {
      setError(t('editor.midiImport.sheetMusic.error'));
      return;
    }
    const dataUrl = await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
    if (!dataUrl) {
      setError(t('editor.midiImport.sheetMusic.error'));
      return;
    }
    setImage({ dataUrl, base64: dataUrl.split(',')[1] ?? '', mimeType, fileName: file.name });
  }, [t, loadPdf]);

  /** Open the file picker: Tauri → native dialog; browser → hidden input. */
  const handleChooseFile = useCallback(async () => {
    if (!isTauri()) {
      // Browser: open the hidden persistent <input type="file"> — the picked
      // File is handled by its onChange (handlePickedFile).
      fileInputRef.current?.click();
      return;
    }

    // ── Tauri: native file picker (image OR PDF) ──
    setError(null);
    setAnalysis(null); // new file → previous analysis is stale
    setSelectedVoiceId(-1);
    setAnalysisIsMerged(false);
    setConfirmReplace(false);
    setPdfPages(null);
    setPdfFileName(null);
    setAnalyzeProgress(null);

    const title = t('editor.midiImport.sheetMusic.title');
    let picked: PickedImage | null = null;

    try {
      const path = await nativePickFileOpen(title, 'Notenblatt', [...IMAGE_EXTENSIONS, 'pdf']);
      if (!path) return; // user cancelled
      const fileName = path.split(/[/\\]/).pop() || path;
      const mimeType = guessMimeType(fileName);
      if (mimeType === 'application/pdf') {
        // PDF → render pages client-side (pdf.js)
        // nativeReadFileBytes liefert Base64; loadPdf erwartet File | ArrayBuffer
        const base64 = await nativeReadFileBytes(path);
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        await loadPdf(fileName, bytes.buffer);
        return;
      }
      if (!mimeType) {
        setError(t('editor.midiImport.sheetMusic.error'));
        return;
      }
      const base64 = await nativeReadFileBytes(path);
      picked = { dataUrl: `data:${mimeType};base64,${base64}`, base64, mimeType, fileName };
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[SheetMusic] Native image read failed:', err);
      setError(t('editor.midiImport.sheetMusic.error'));
      return;
    }

    if (!picked) return; // cancelled or unreadable
    setImage(picked);
  }, [t, loadPdf]);

  /** Switch the visible PDF page (per-page analysis becomes stale). */
  const goToPage = useCallback((index: number) => {
    if (!pdfPages) return;
    const clamped = Math.max(0, Math.min(pdfPages.length - 1, index));
    if (clamped === currentPageIndex) return;
    setCurrentPageIndex(clamped);
    const page = pdfPages[clamped];
    setImage({
      dataUrl: page.dataUrl,
      base64: page.base64,
      mimeType: 'image/png',
      fileName: `${pdfFileName ?? 'PDF'} (S. ${clamped + 1}/${pdfPages.length})`,
    });
    // A per-page analysis is stale after switching pages; a MERGED
    // (all-pages) analysis stays valid — it covers every page.
    if (!analysisIsMerged) {
      setAnalysis(null);
      setSelectedVoiceId(-1);
    }
    setConfirmReplace(false);
  }, [pdfPages, currentPageIndex, pdfFileName, analysisIsMerged]);

  /** POST one page image to the backend. */
  const analyzeImageBase64 = useCallback(async (base64: string): Promise<SheetMusicApiResponse> => {
    const res = await fetch('/api/sheet-music', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: base64, mimeType: 'image/png' }),
    });
    const data: SheetMusicApiResponse = await res.json().catch(() => ({ success: false }));
    return data;
  }, []);

  // ── Step 2: analyze via backend VLM (current page OR all PDF pages) ──
  const handleAnalyze = useCallback(async () => {
    if (!image || isAnalyzing || isRenderingPdf) return;
    const analyzeAllPages = !!pdfPages && pdfPages.length > 1 && analyzeAll;
    if (!analyzeAllPages && !image.base64) return;

    setError(null);
    setConfirmReplace(false);
    setAnalysis(null);
    setSelectedVoiceId(-1);
    setAnalysisIsMerged(false);
    setIsAnalyzing(true);
    try {
      let result: SheetMusicAnalysis | null = null;
      let merged = false;

      if (analyzeAllPages && pdfPages) {
        // ── All-pages mode: analyze page by page, merge by staff index ──
        const pageAnalyses: SheetMusicAnalysis[] = [];
        for (let i = 0; i < pdfPages.length; i++) {
          setAnalyzeProgress({ done: i, total: pdfPages.length });
          const data = await analyzeImageBase64(pdfPages[i].base64);
          if (!data.success || !data.result) {
            // Backend messages are short German strings (raw model text never leaks)
            setError(
              data.error
                ? `${data.error} (Seite ${i + 1}/${pdfPages.length})`
                : t('editor.midiImport.sheetMusic.error'),
            );
            return;
          }
          // A page with NO detected voices is skipped (e.g. a title page) —
          // only an ALL-pages-empty result ends as "no notes detected".
          if (data.result.voices.length > 0) {
            pageAnalyses.push(data.result);
          }
        }
        setAnalyzeProgress({ done: pdfPages.length, total: pdfPages.length });
        result = pageAnalyses.length > 0 ? mergePageAnalyses(pageAnalyses) : null;
        merged = true;
      } else {
        // ── Single page / single image mode (unchanged behavior) ──
        const data = await analyzeImageBase64(image.base64);
        if (!data.success || !data.result) {
          setError(data.error || t('editor.midiImport.sheetMusic.error'));
          return;
        }
        result = data.result;
      }

      if (!result || result.voices.length === 0) {
        setError(t('editor.midiImport.sheetMusic.noVoices'));
        return;
      }
      setAnalysis(result);
      setAnalysisIsMerged(merged);
      setSelectedVoiceId(result.voices[0].id); // preselect first strand
      setTempo(result.tempo);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[SheetMusic] Analysis request failed:', err);
      setError(t('editor.midiImport.sheetMusic.error'));
    } finally {
      setIsAnalyzing(false);
      setAnalyzeProgress(null);
    }
  }, [image, isAnalyzing, isRenderingPdf, pdfPages, analyzeAll, analyzeImageBase64, t]);

  // ── Step 3: build notes + emit via the MIDI import contract ──
  const emitImport = useCallback(() => {
    if (!analysis || !selectedVoice || selectedVoice.noteCount === 0) return;

    const safeTempo = Math.max(20, Math.min(300, Math.round(tempo)));
    const msPerQuarter = 60000 / safeTempo;

    // Linear timing (no pickup handling): startTime = cumulative sum of the
    // previous notes' beats; duration = beats × msPerQuarter.
    let cumulativeBeats = 0;
    const notes: Note[] = selectedVoice.notes.map((n, i) => {
      const pitch = Math.max(0, Math.min(127, n.midi + transpose));
      const startTime = Math.round(cumulativeBeats * msPerQuarter);
      const duration = Math.max(50, Math.round(n.beats * msPerQuarter));
      cumulativeBeats += n.beats;
      return {
        id: uuidv4(),
        pitch,
        frequency: midiPitchToFrequency(pitch),
        startTime,
        duration,
        lyric: i < syllables.length ? syllables[i] : '~',
        isBonus: false,
        isGolden: false,
        isRap: false,
        isFreestyle: false,
        // Editor-only hint (never serialized) — honest AI-assisted origin
        analysisConfidence: analysis.confidence,
      } satisfies Note;
    });

    // Same result shape as the MIDI import: bpm from the (editable) tempo,
    // gap 0 (sheet time 0 = song time 0), no metadata suggestions.
    onImport({
      notes,
      bpm: safeTempo,
      gap: 0,
    });
    // Parent closes the dialog via onOpenChange(false).
  }, [analysis, selectedVoice, tempo, transpose, syllables, onImport]);

  const handleImportClick = useCallback(() => {
    if (!analysis || !selectedVoice || selectedVoice.noteCount === 0) return;
    if (hasExistingNotes) {
      // Inline confirm (same overlay+card pattern as the MIDI dialog)
      setConfirmReplace(true);
      return;
    }
    emitImport();
  }, [analysis, selectedVoice, hasExistingNotes, emitImport]);

  const closeDialog = useCallback(() => {
    setConfirmReplace(false);
    onOpenChange(false);
  }, [onOpenChange]);

  if (!open) return null;

  const canAnalyze = !!image && !isAnalyzing && !isRenderingPdf;
  const canImport = !!analysis && !!selectedVoice && selectedVoice.noteCount > 0;
  const lowQuality = !!analysis && analysis.confidence < 0.5;
  const analyzingLabel = analyzeProgress
    ? t('editor.midiImport.sheetMusic.analyzingPage')
        .replace('{page}', String(analyzeProgress.done + 1))
        .replace('{total}', String(analyzeProgress.total))
    : null;
  const analyzingText = isRenderingPdf
    ? t('editor.midiImport.sheetMusic.pdfRendering')
    : analyzingLabel || t('editor.midiImport.sheetMusic.analyzing');

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
          <div className="space-y-3">
            {/* Hidden file input — the button triggers it (browser path;
                Tauri uses the native file picker instead) */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/bmp,application/pdf,.pdf"
              className="hidden"
              aria-label={t('editor.midiImport.sheetMusic.chooseFile')}
              data-testid="sheet-music-file-input"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                // Allow re-picking the same file (change event must re-fire)
                e.target.value = '';
                void handlePickedFile(file);
              }}
            />
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                onClick={handleChooseFile}
                disabled={isAnalyzing || isRenderingPdf}
                className="border-slate-600 text-slate-300 hover:text-white hover:bg-white/10"
                data-testid="sheet-music-choose-image"
              >
                <Upload className="w-4 h-4" />
                {t('editor.midiImport.sheetMusic.chooseFile')}
              </Button>
              <Button
                variant="outline"
                onClick={handleAnalyze}
                disabled={!canAnalyze}
                className="border-cyan-500/60 text-cyan-300 hover:text-white hover:bg-cyan-500/20 disabled:opacity-40"
                data-testid="sheet-music-analyze"
              >
                {isAnalyzing || isRenderingPdf ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ScanLine className="w-4 h-4" />
                )}
                {isAnalyzing || isRenderingPdf
                  ? analyzingText
                  : pdfPages && pdfPages.length > 1 && analyzeAll
                    ? t('editor.midiImport.sheetMusic.analyzeAll')
                    : t('editor.midiImport.sheetMusic.analyze')}
              </Button>
              {image && (
                <span
                  className="text-xs text-slate-500 truncate max-w-[220px]"
                  data-testid="sheet-music-image-loaded"
                  title={image.fileName}
                >
                  {pdfFileName && pdfPages ? (
                    <span className="inline-flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-red-400/80 shrink-0" aria-hidden />
                      {pdfFileName}
                    </span>
                  ) : (
                    image.fileName
                  )}
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-600" data-testid="sheet-music-upload-hint">
              {t('editor.midiImport.sheetMusic.uploadHint')}
            </p>

            {image?.dataUrl && (
              <div className="border border-slate-700 rounded-lg bg-slate-950/60 p-2 flex justify-center">
                <img
                  src={image.dataUrl}
                  alt={t('editor.midiImport.sheetMusic.title')}
                  className="max-h-48 rounded object-contain"
                  data-testid="sheet-music-preview"
                />
              </div>
            )}

            {/* ── PDF page navigation (thumbnails + prev/next + page indicator) ── */}
            {pdfPages && pdfPages.length > 0 && (
              <div
                className="space-y-2 border border-slate-700/70 rounded-lg bg-slate-900/60 p-2.5"
                data-testid="sheet-music-pdf-pages"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-red-400/80 shrink-0" aria-hidden />
                    <span className="text-xs text-slate-400 font-mono truncate" data-testid="sheet-music-pdf-page-indicator">
                      {t('editor.midiImport.sheetMusic.pdfPage')
                        .replace('{page}', String(currentPageIndex + 1))
                        .replace('{total}', String(pdfPages.length))}
                    </span>
                    {pdfTotalPages > pdfPages.length && (
                      <span className="text-[10px] text-amber-500/80" title={t('editor.midiImport.sheetMusic.pdfPageCapHint')}>
                        {t('editor.midiImport.sheetMusic.pdfPageCap').replace('{max}', String(pdfPages.length))}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => goToPage(currentPageIndex - 1)}
                      disabled={currentPageIndex === 0 || isAnalyzing || isRenderingPdf}
                      aria-label={t('editor.midiImport.sheetMusic.pdfPrevPage')}
                      className="text-slate-400 hover:text-white h-7 w-7 p-0"
                      data-testid="sheet-music-pdf-prev"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => goToPage(currentPageIndex + 1)}
                      disabled={currentPageIndex >= pdfPages.length - 1 || isAnalyzing || isRenderingPdf}
                      aria-label={t('editor.midiImport.sheetMusic.pdfNextPage')}
                      className="text-slate-400 hover:text-white h-7 w-7 p-0"
                      data-testid="sheet-music-pdf-next"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Thumbnail strip (max-h with scroll for many pages) */}
                <div
                  className="flex gap-2 overflow-x-auto pb-1 editor-panel-scroll"
                  role="tablist"
                  aria-label={t('editor.midiImport.sheetMusic.pdfPages')}
                >
                  {pdfPages.map((page, index) => (
                    <button
                      key={page.pageNumber}
                      type="button"
                      role="tab"
                      aria-selected={index === currentPageIndex}
                      onClick={() => goToPage(index)}
                      disabled={isAnalyzing || isRenderingPdf}
                      data-testid={`sheet-music-pdf-thumb-${index + 1}`}
                      title={t('editor.midiImport.sheetMusic.pdfPage')
                        .replace('{page}', String(index + 1))
                        .replace('{total}', String(pdfPages.length))}
                      className={cn(
                        'relative shrink-0 rounded border overflow-hidden transition-all',
                        index === currentPageIndex
                          ? 'border-cyan-400 ring-1 ring-cyan-400/60'
                          : 'border-slate-700 hover:border-slate-500 opacity-70 hover:opacity-100',
                      )}
                    >
                      <img
                        src={page.dataUrl}
                        alt=""
                        className="h-16 w-auto object-contain bg-white pointer-events-none"
                        loading="lazy"
                      />
                      <span className="absolute bottom-0 right-0 bg-black/70 text-white text-[9px] font-mono px-1 rounded-tl">
                        {page.pageNumber}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Analyze-all toggle (multi-page PDFs only) */}
                {pdfPages.length > 1 && (
                  <label
                    className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-300"
                    data-testid="sheet-music-analyze-all-toggle"
                  >
                    <input
                      type="checkbox"
                      checked={analyzeAll}
                      onChange={(e) => setAnalyzeAll(e.target.checked)}
                      disabled={isAnalyzing || isRenderingPdf}
                      className="accent-cyan-500 w-3.5 h-3.5"
                    />
                    <Layers className="w-3.5 h-3.5 text-purple-400" aria-hidden />
                    {t('editor.midiImport.sheetMusic.analyzeAll')}
                  </label>
                )}
              </div>
            )}
          </div>

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

              <div className="space-y-2" data-testid="sheet-music-quality">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-xs text-slate-300">
                    <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                    {sm('confidence')}: {Math.round(analysis.confidence * 100)}%
                  </span>
                  <span className="font-mono text-xs text-slate-500">
                    {formatBeatsDuration(selectedVoiceDuration, tempo)}
                  </span>
                </div>
                {lowQuality && (
                  <div
                    className="bg-amber-500/10 border border-amber-500/40 text-amber-300 rounded-lg p-2.5 text-xs flex items-start gap-2"
                    role="status"
                    data-testid="sheet-music-low-quality"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    {t('editor.midiImport.sheetMusic.lowQualityWarning')}
                  </div>
                )}
                {analysis.warnings && (
                  <div
                    className="bg-slate-800/60 border border-slate-700 text-slate-400 rounded-lg p-2.5 text-xs flex items-start gap-2"
                    role="status"
                    data-testid="sheet-music-warnings"
                  >
                    <MessageSquareWarning className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-500" />
                    <span>
                      <span className="text-slate-500">{sm('warnings')}: </span>
                      {analysis.warnings}
                    </span>
                  </div>
                )}
              </div>

              {/* Voices (Stränge) — user picks the correct strand */}
              <div className="space-y-2">
                <Label className="text-slate-400 text-xs flex items-center gap-1.5 flex-wrap">
                  <Music4 className="w-3.5 h-3.5 text-cyan-400" />
                  {t('editor.midiImport.sheetMusic.voices')}
                  {analysisIsMerged && (
                    <span
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-500/15 border border-purple-500/40 text-[10px] text-purple-300 font-normal"
                      data-testid="sheet-music-merged-badge"
                      title={t('editor.midiImport.sheetMusic.mergedHint')}
                    >
                      <Layers className="w-3 h-3" aria-hidden />
                      {t('editor.midiImport.sheetMusic.mergedVoices')}
                    </span>
                  )}
                </Label>
                <div
                  className="border border-slate-700 rounded-lg overflow-hidden"
                  data-testid="sheet-music-voice-list"
                >
                  <div className="grid grid-cols-[auto_1fr_auto_auto] gap-2 px-3 py-1.5 bg-slate-800/80 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    <span className="w-6" />
                    <span>{sm('voiceLabel')}</span>
                    <span className="text-right">{t('editor.midiImport.trackNotes')}</span>
                    <span className="text-right font-mono normal-case">m:ss</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto editor-panel-scroll">
                    {analysis.voices.map(v => {
                      const isSelected = v.id === selectedVoiceId;
                      const voiceBeats = v.notes.reduce((sum, n) => sum + n.beats, 0);
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => { setSelectedVoiceId(v.id); setConfirmReplace(false); }}
                          aria-pressed={isSelected}
                          data-testid={`sheet-music-voice-${v.id}`}
                          className={cn(
                            'w-full grid grid-cols-[auto_1fr_auto_auto] gap-2 items-center px-3 py-2 text-left text-sm transition-colors border-b border-slate-800 last:border-b-0',
                            isSelected
                              ? 'bg-cyan-500/15 text-white'
                              : 'text-slate-300 hover:bg-white/5',
                          )}
                        >
                          <span
                            className={cn(
                              'w-3 h-3 rounded-full border shrink-0',
                              isSelected ? 'bg-cyan-400 border-cyan-300' : 'border-slate-600',
                            )}
                            aria-hidden
                          />
                          <span className="truncate">
                            <span className="text-slate-500 font-mono text-xs mr-1.5">{v.id}</span>
                            {v.label}
                          </span>
                          <span className="text-right font-mono text-xs text-slate-400">{v.noteCount}</span>
                          <span className="text-right font-mono text-xs text-slate-400">
                            {formatBeatsDuration(voiceBeats, tempo)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Tempo (editable, default from the result) */}
              <div className="space-y-2">
                <Label htmlFor="sheet-music-tempo" className="text-slate-400 text-xs">
                  {t('editor.midiImport.sheetMusic.tempo')}
                </Label>
                <Input
                  id="sheet-music-tempo"
                  type="number"
                  value={tempo}
                  onChange={(e) => {
                    const parsed = parseInt(e.target.value, 10);
                    setTempo(Number.isNaN(parsed) ? 120 : Math.max(20, Math.min(300, parsed)));
                  }}
                  min={20}
                  max={300}
                  step={1}
                  className="bg-slate-800 border-slate-600 w-28 font-mono"
                  data-testid="sheet-music-tempo"
                />
              </div>

              {/* Transposition */}
              <div className="space-y-2">
                <Label htmlFor="sheet-music-transpose" className="text-slate-400 text-xs">
                  {t('editor.midiImport.sheetMusic.transpose')}
                </Label>
                <Input
                  id="sheet-music-transpose"
                  type="number"
                  value={transpose}
                  onChange={(e) => {
                    const parsed = parseInt(e.target.value, 10);
                    setTranspose(Number.isNaN(parsed) ? 0 : Math.max(-48, Math.min(48, parsed)));
                  }}
                  min={-48}
                  max={48}
                  step={1}
                  className="bg-slate-800 border-slate-600 w-28 font-mono"
                  data-testid="sheet-music-transpose"
                />
              </div>

              {/* Optional lyrics → sequential syllable assignment */}
              <div className="space-y-2">
                <Label htmlFor="sheet-music-lyrics" className="text-slate-400 text-xs flex items-center gap-1.5">
                  <Music4 className="w-3.5 h-3.5 text-purple-400" />
                  {t('editor.midiImport.sheetMusic.lyricsOptional')}
                </Label>
                <Textarea
                  id="sheet-music-lyrics"
                  value={lyricsText}
                  onChange={(e) => setLyricsText(e.target.value)}
                  placeholder={t('editor.midiImport.lyricsPlaceholder')}
                  className="bg-slate-800 border-slate-600 min-h-[100px] font-mono text-sm"
                  data-testid="sheet-music-lyrics"
                />
                {selectedVoice && selectedVoice.noteCount > 0 && (
                  <p className="text-xs text-slate-600" data-testid="sheet-music-syllable-info">
                    {t('editor.midiImport.sheetMusic.syllableAssignment')
                      .replace('{syllables}', String(syllables.length))
                      .replace('{notes}', String(selectedVoice.noteCount))}
                  </p>
                )}
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex justify-between items-center gap-2 pt-1 flex-wrap">
            <Button
              variant="outline"
              onClick={closeDialog}
              className="border-slate-600 text-slate-400"
            >
              {t('editor.midiImport.cancel')}
            </Button>

            {confirmReplace ? (
              <div
                className="flex items-center gap-2 flex-wrap bg-amber-500/10 border border-amber-500/40 rounded-lg p-2"
                data-testid="sheet-music-replace-confirm"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-amber-200">
                      {t('editor.midiImport.importReplaceTitle')}
                    </p>
                    <p className="text-xs text-slate-400">
                      {t('editor.midiImport.sheetMusic.importReplaceHint')}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmReplace(false)}
                  className="border-slate-600 text-slate-300"
                >
                  {t('editor.midiImport.cancel')}
                </Button>
                <Button
                  size="sm"
                  onClick={emitImport}
                  className="bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white"
                  data-testid="sheet-music-replace-confirm-button"
                >
                  {t('editor.midiImport.confirm')}
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleImportClick}
                disabled={!canImport}
                className="bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-700 hover:to-purple-700 disabled:opacity-50"
                data-testid="sheet-music-import-button"
              >
                <ScanLine className="w-4 h-4" />
                {t('editor.midiImport.sheetMusic.import')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default SheetMusicDialog;
