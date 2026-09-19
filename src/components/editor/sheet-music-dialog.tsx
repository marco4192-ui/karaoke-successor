'use client';

/**
 * Sheet Music (Notenblatt) Recognition Dialog (user request 5)
 *
 * Flow: upload an IMAGE of sheet music (PDF: "Bald verfügbar") →
 * POST /api/sheet-music (backend VLM/OMR) → pick the correct voice/strand
 * ("Strang") → import the notes into the editor EXACTLY like the MIDI
 * import (pitch + timing basis):
 *
 * - The backend returns one entry per detected staff/voice; the user picks
 *   the correct strand in a radio-style list (first preselected).
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

import { useState, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { X, ScanLine, Upload, AlertTriangle, Gauge, MessageSquareWarning, Music4 } from 'lucide-react';
import type { Note } from '@/types/game';
import { parseLyricsToSyllables } from '@/lib/editor/syllable-separator';
import { useTranslation } from '@/lib/i18n/translations';
import { isTauri } from '@/lib/tauri-file-storage';
import { nativePickFileOpen, nativeReadFileBytes } from '@/lib/native-fs';
import { cn, midiPitchToFrequency } from '@/lib/utils';
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

  const [image, setImage] = useState<PickedImage | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<SheetMusicAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedVoiceId, setSelectedVoiceId] = useState<number>(-1);
  const [tempo, setTempo] = useState(120);
  const [transpose, setTranspose] = useState(0);
  const [lyricsText, setLyricsText] = useState('');
  const [confirmReplace, setConfirmReplace] = useState(false);

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

  // ── Step 1: pick an image (Tauri native picker or browser input) ──
  const handleChooseImage = useCallback(async () => {
    setError(null);
    setConfirmReplace(false);
    setAnalysis(null); // new image → previous analysis is stale
    setSelectedVoiceId(-1);

    const title = t('editor.midiImport.sheetMusic.title');
    let picked: PickedImage | null = null;

    if (isTauri()) {
      try {
        const path = await nativePickFileOpen(title, 'Notenblatt', [...IMAGE_EXTENSIONS, 'pdf']);
        if (!path) return; // user cancelled
        const fileName = path.split(/[/\\]/).pop() || path;
        const mimeType = guessMimeType(fileName);
        if (mimeType === 'application/pdf') {
          setError(t('editor.midiImport.sheetMusic.unsupportedPdf'));
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
    } else {
      picked = await new Promise<PickedImage | null>((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/png,image/jpeg,image/webp,image/gif,image/bmp';
        input.onchange = () => {
          const file = input.files?.[0];
          if (!file) {
            resolve(null);
            return;
          }
          const mimeType = guessMimeType(file.name, file.type);
          if (mimeType === 'application/pdf') {
            resolve({ dataUrl: '', base64: '', mimeType: 'application/pdf', fileName: file.name });
            return;
          }
          if (!mimeType) {
            resolve(null);
            return;
          }
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            resolve({ dataUrl, base64: dataUrl.split(',')[1] ?? '', mimeType, fileName: file.name });
          };
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(file);
        };
        input.oncancel = () => resolve(null);
        input.click();
      });
    }

    if (!picked) return; // cancelled or unreadable
    if (picked.mimeType === 'application/pdf') {
      setError(t('editor.midiImport.sheetMusic.unsupportedPdf'));
      return;
    }
    setImage(picked);
  }, [t]);

  // ── Step 2: analyze via backend VLM ──
  const handleAnalyze = useCallback(async () => {
    if (!image || isAnalyzing) return;
    setError(null);
    setConfirmReplace(false);
    setAnalysis(null);
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/sheet-music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: image.base64, mimeType: image.mimeType }),
      });
      const data: SheetMusicApiResponse = await res.json().catch(() => ({ success: false }));
      if (!res.ok || !data.success || !data.result) {
        // Backend messages are short German strings (raw model text never leaks)
        setError(data.error || t('editor.midiImport.sheetMusic.error'));
        return;
      }
      if (data.result.voices.length === 0) {
        setError(t('editor.midiImport.sheetMusic.noVoices'));
        return;
      }
      setAnalysis(data.result);
      setSelectedVoiceId(data.result.voices[0].id); // preselect first strand
      setTempo(data.result.tempo);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[SheetMusic] Analysis request failed:', err);
      setError(t('editor.midiImport.sheetMusic.error'));
    } finally {
      setIsAnalyzing(false);
    }
  }, [image, isAnalyzing, t]);

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

  const canAnalyze = !!image && !isAnalyzing;
  const canImport = !!analysis && !!selectedVoice && selectedVoice.noteCount > 0;
  const lowQuality = !!analysis && analysis.confidence < 0.5;

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

          {/* Section 1: Image upload + preview + analyze */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                onClick={handleChooseImage}
                disabled={isAnalyzing}
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
                {isAnalyzing ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ScanLine className="w-4 h-4" />
                )}
                {isAnalyzing
                  ? t('editor.midiImport.sheetMusic.analyzing')
                  : t('editor.midiImport.sheetMusic.analyze')}
              </Button>
              {image && (
                <span
                  className="text-xs text-slate-500 truncate max-w-[220px]"
                  data-testid="sheet-music-image-loaded"
                  title={image.fileName}
                >
                  {image.fileName}
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
          </div>

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
                <Label className="text-slate-400 text-xs flex items-center gap-1.5">
                  <Music4 className="w-3.5 h-3.5 text-cyan-400" />
                  {t('editor.midiImport.sheetMusic.voices')}
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
