'use client';

/**
 * All dialog state + handlers of the sheet music recognition dialog
 * (file/PDF picking, page navigation, backend analysis, note emission).
 *
 * R13: the body is moved byte-identically from the SheetMusicDialog
 * component (src/components/editor/sheet-music-dialog.tsx) — hook order,
 * effect/callback bodies and dep arrays are unchanged. The only
 * structural deltas: wrapped in this hook function, and the derived
 * flags (canAnalyze … analyzingText) are now computed unconditionally
 * instead of after the component's `if (!open) return null;` early
 * return (pure state derivations — no behavioral difference).
 */
import { useState, useCallback, useMemo, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Note } from '@/types/game';
import { parseLyricsToSyllables } from '@/lib/editor/syllable-separator';
import { useTranslation } from '@/lib/i18n/translations';
import { isTauri } from '@/lib/tauri-file-storage';
import { nativePickFileOpen, nativeReadFileBytes } from '@/lib/native-fs';
import { midiPitchToFrequency } from '@/lib/utils';
import {
  renderPdfToPageImages,
  isPdfFile,
  MAX_PDF_PAGES,
  type PdfPageImage,
} from '@/lib/editor/pdf-render';
// READ-ONLY reuse of the MIDI import contract (midi-import-dialog is owned
// by another agent — only the exported result TYPE is imported here).
import type { MidiImportResult } from '../midi-import-dialog';
import type { PickedImage, SheetMusicAnalysis, SheetMusicApiResponse } from './types';
import { IMAGE_EXTENSIONS } from './types';
import { mergePageAnalyses, guessMimeType } from './analysis-utils';

/** Parameters of {@link useSheetMusicDialog} (subset of SheetMusicDialogProps). */
export interface UseSheetMusicDialogParams {
  onOpenChange: (_open: boolean) => void;
  /** Same contract as the MIDI import dialog — karaoke-editor reuses its handler. */
  onImport: (_result: MidiImportResult) => void;
  /** True when the song already has notes → inline "replace notes?" confirm. */
  hasExistingNotes: boolean;
}

export function useSheetMusicDialog({ onOpenChange, onImport, hasExistingNotes }: UseSheetMusicDialogParams) {
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

  return {
    // i18n helpers (shared with the render sections)
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
  };
}
