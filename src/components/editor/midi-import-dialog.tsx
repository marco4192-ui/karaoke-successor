'use client';

/**
 * MIDI/KAR Note Import Dialog (user request 3.2)
 *
 * Loads a .mid/.midi/.kar file and imports ONE chosen track's notes as real
 * editor notes (pitch + timing) — WITHOUT touching the song's music file.
 * The MIDI file is purely the pitch/timing basis:
 *
 * - Track list with note count/duration + melody badge (highest melodyScore
 *   from parseMIDIKaraoke — preselected).
 * - Optional lyrics textarea → syllables (parseLyricsToSyllables) are assigned
 *   sequentially to the imported notes in time order; notes without a
 *   syllable keep '~' (melisma placeholder, editable in the note details band).
 * - Optional transposition (semitones, clamped to 0..127).
 * - ms → beat conversion uses the app's EXACT UltraStar math
 *   (beatDuration = 15000 / BPM, startBeat = Math.round((time - gap) / beatDuration),
 *   see generateUltraStarTxt) with the BPM taken from the MIDI tempo map —
 *   so the editor times round-trip 1:1 into the exported txt.
 *
 * Requirement 3.5 (comparison overlay) shares the file-picking helper
 * `pickMidiFileArrayBuffer` and the ComparisonNote type exported here.
 */

import { useState, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { X, FileMusic, Music4, Upload, AlertTriangle, Star } from 'lucide-react';
import type { Note } from '@/types/game';
import { parseLyricsToSyllables } from '@/lib/editor/syllable-separator';
import { useTranslation } from '@/lib/i18n/translations';
import { isTauri } from '@/lib/tauri-file-storage';
import { nativePickFileOpen, nativeReadFileBytes } from '@/lib/native-fs';
import { parseMIDIKaraoke, type MIDIKaraokeData, type MIDITrackData } from '@/lib/parsers/multi-format-import';
import { cn, midiPitchToFrequency } from '@/lib/utils';

// ─── Public types ──────────────────────────────────────────────────────

/** Result handed to the editor via onImport — notes are FINAL Note objects. */
export interface MidiImportResult {
  /** Editor notes built from the selected MIDI track (beat-snapped ms times). */
  notes: Note[];
  /** BPM derived from the MIDI tempo map (initial tempo, like convertToSong). */
  bpm: number;
  /** GAP for the imported notes (always 0 — MIDI time 0 = song time 0). */
  gap: number;
  /** Title from `@T` meta text — only a suggestion, never applied automatically. */
  title?: string;
  /** Artist from `@T` meta text — only a suggestion. */
  artist?: string;
}

/** One note of the non-destructive comparison overlay (user request 3.5). */
export interface ComparisonNote {
  beat: number;
  lengthBeats: number;
  pitch: number;
}

// ─── Shared file reading (dialog + comparison overlay) ────────────────

/** Decode a base64 string (nativeReadFileBytes) into an ArrayBuffer. */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/**
 * Open a .mid/.midi/.kar picker and return the file as an ArrayBuffer.
 * Tauri: native picker + native_read_file_bytes (base64 → ArrayBuffer).
 * Browser: hidden file input + FileReader. Returns null when cancelled.
 */
export async function pickMidiFileArrayBuffer(title: string): Promise<{ buffer: ArrayBuffer; fileName: string } | null> {
  if (isTauri()) {
    try {
      const path = await nativePickFileOpen(title, 'MIDI/KAR', ['mid', 'midi', 'kar']);
      if (!path) return null;
      const base64 = await nativeReadFileBytes(path);
      return { buffer: base64ToArrayBuffer(base64), fileName: path.split(/[/\\]/).pop() || path };
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[MidiImport] Native file read failed:', err);
      return null;
    }
  }

  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.mid,.midi,.kar,audio/midi,audio/x-midi';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve({ buffer: reader.result as ArrayBuffer, fileName: file.name });
      reader.onerror = () => resolve(null);
      reader.readAsArrayBuffer(file);
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

// ─── Conversion helpers ────────────────────────────────────────────────

/** Sanity-checked BPM from the MIDI tempo (initial tempo event, as convertToSong). */
export function midiBpmToSongBpm(midi: MIDIKaraokeData): number {
  const bpm = Math.round(midi.tempo);
  return Number.isFinite(bpm) && bpm > 0 ? bpm : 120;
}

/**
 * Convert a parsed MIDI track into editor Note[] using the app's exact
 * beat math (generateUltraStarTxt inverse):
 *   beatDuration = 15000 / BPM
 *   startBeat = Math.round((startTimeMs - gap) / beatDuration)
 *   lengthBeats = Math.max(1, Math.round(durationMs / beatDuration))
 *   startTime = gap + startBeat * beatDuration  (round-trips 1:1 on export)
 * Syllables are assigned sequentially in time order; leftover notes keep '~'.
 */
export function buildNotesFromMidiTrack(
  track: MIDITrackData,
  options: { bpm: number; gap: number; transpose?: number; syllables?: string[] },
): Note[] {
  const { bpm, gap, transpose = 0, syllables = [] } = options;
  const beatDuration = 15000 / bpm;

  // track.notes are already sorted by (startTimeMs, pitch) — chords keep
  // their inner pitch order, so sequential syllable assignment is stable.
  return track.notes.map((n, i) => {
    const startBeat = Math.round((n.startTimeMs - gap) / beatDuration);
    const lengthBeats = Math.max(1, Math.round(n.durationMs / beatDuration));
    const pitch = Math.max(0, Math.min(127, n.pitch + transpose));
    return {
      id: uuidv4(),
      pitch,
      frequency: midiPitchToFrequency(pitch),
      startTime: Math.round(gap + startBeat * beatDuration),
      duration: Math.round(lengthBeats * beatDuration),
      lyric: i < syllables.length ? syllables[i] : '~',
      isBonus: false,
      isGolden: false,
      isRap: false,
      isFreestyle: false,
    } satisfies Note;
  });
}

/**
 * Convert a parsed MIDI track's notes into comparison-overlay notes
 * (requirement 3.5) using the CURRENT song bpm/gap — the song is NOT changed.
 */
export function midiTrackToComparisonNotes(
  track: MIDITrackData,
  bpm: number,
  gap: number,
): ComparisonNote[] {
  const safeBpm = bpm > 0 ? bpm : 120;
  const beatDuration = 15000 / safeBpm;
  return track.notes.map(n => ({
    beat: Math.round((n.startTimeMs - gap) / beatDuration),
    lengthBeats: Math.max(1, Math.round(n.durationMs / beatDuration)),
    pitch: n.pitch,
  }));
}

/** m:ss display for track durations. */
function formatTrackDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// ─── Dialog ────────────────────────────────────────────────────────────

interface MidiImportDialogProps {
  open: boolean;
  onOpenChange: (_open: boolean) => void;
  /** Receives the final import result (notes + bpm/gap + meta suggestions). */
  onImport: (_result: MidiImportResult) => void;
  /** True when the song already has notes → inline "replace notes?" confirm. */
  hasExistingNotes: boolean;
}

export function MidiImportDialog({ open, onOpenChange, onImport, hasExistingNotes }: MidiImportDialogProps) {
  const { t } = useTranslation();

  const [fileName, setFileName] = useState<string | null>(null);
  const [midi, setMidi] = useState<MIDIKaraokeData | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<number>(-1);
  const [lyricsText, setLyricsText] = useState('');
  const [transpose, setTranspose] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);

  // Parsed syllables for the optional sequential assignment
  const syllables = useMemo(() => {
    if (lyricsText.trim().length === 0) return [];
    const parsed = parseLyricsToSyllables(lyricsText);
    return parsed.lines.flatMap(line => line.words.flatMap(word => word.syllables));
  }, [lyricsText]);

  const tracksWithNotes = useMemo(
    () => (midi ? midi.tracks.filter(tr => tr.noteCount > 0) : []),
    [midi],
  );
  const selectedTrackData = useMemo(
    () => midi?.tracks.find(tr => tr.index === selectedTrack),
    [midi, selectedTrack],
  );

  const handleChooseFile = useCallback(async () => {
    setError(null);
    setConfirmReplace(false);
    setIsParsing(true);
    try {
      const title = t('editor.midiImport.title');
      const picked = await pickMidiFileArrayBuffer(title);
      if (!picked) return; // user cancelled
      const { buffer, fileName: name } = picked;

      const parsed = parseMIDIKaraoke(buffer);
      if (!parsed) {
        setError(t('editor.midiImport.parseError'));
        setMidi(null);
        setFileName(null);
        return;
      }
      if (!parsed.tracks.some(tr => tr.noteCount > 0)) {
        setError(t('editor.midiImport.noTracks'));
        setMidi(null);
        setFileName(null);
        return;
      }

      setMidi(parsed);
      setSelectedTrack(parsed.melodyTrackIndex >= 0 ? parsed.melodyTrackIndex : parsed.tracks.findIndex(tr => tr.noteCount > 0));
      setFileName(name);
    } finally {
      setIsParsing(false);
    }
  }, [t]);

  const emitImport = useCallback(() => {
    if (!midi || !selectedTrackData || selectedTrackData.noteCount === 0) return;

    const bpm = midiBpmToSongBpm(midi);
    const gap = 0;
    const notes = buildNotesFromMidiTrack(selectedTrackData, {
      bpm,
      gap,
      transpose,
      syllables,
    });

    onImport({
      notes,
      bpm,
      gap,
      title: midi.title,
      artist: midi.artist,
    });
    // Parent closes the dialog via onOpenChange(false).
  }, [midi, selectedTrackData, transpose, syllables, onImport]);

  const handleImportClick = useCallback(() => {
    if (!midi || !selectedTrackData || selectedTrackData.noteCount === 0) return;
    if (hasExistingNotes) {
      // Inline confirm (existing overlay+card pattern — no stacked dialogs)
      setConfirmReplace(true);
      return;
    }
    emitImport();
  }, [midi, selectedTrackData, hasExistingNotes, emitImport]);

  const closeDialog = useCallback(() => {
    setConfirmReplace(false);
    onOpenChange(false);
  }, [onOpenChange]);

  if (!open) return null;

  const canImport = !!midi && !!selectedTrackData && selectedTrackData.noteCount > 0;
  const metaHint = midi?.title
    ? `${midi.title}${midi.artist ? ` — ${midi.artist}` : ''} · ${midiBpmToSongBpm(midi)} BPM`
    : null;

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={closeDialog}
      role="dialog"
      aria-modal="true"
      aria-label={t('editor.midiImport.title')}
      data-testid="midi-import-overlay"
    >
      <Card
        className="bg-slate-900 border-slate-700 text-white w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        data-testid="midi-import-dialog"
      >
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl flex items-center gap-2">
            <FileMusic className="w-5 h-5 text-amber-400" />
            {t('editor.midiImport.title')}
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
              data-testid="midi-import-error"
            >
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <p className="text-xs text-slate-500">
            {t('editor.midiImport.description')}
          </p>

          {/* Section 1: File + track selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                onClick={handleChooseFile}
                disabled={isParsing}
                className="border-slate-600 text-slate-300 hover:text-white hover:bg-white/10"
                data-testid="midi-import-choose-file"
              >
                {isParsing ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {t('editor.midiImport.chooseFile')}
              </Button>
              {fileName && midi && (
                <span className="text-xs text-slate-500 truncate max-w-[220px]" data-testid="midi-import-file-loaded" title={fileName}>
                  {fileName}{metaHint ? ` · ${metaHint}` : ''}
                </span>
              )}
            </div>

            {tracksWithNotes.length > 0 && (
              <div
                className="border border-slate-700 rounded-lg overflow-hidden"
                data-testid="midi-import-track-list"
              >
                <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-2 px-3 py-1.5 bg-slate-800/80 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  <span className="w-6" />
                  <span>{t('editor.midiImport.track')}</span>
                  <span className="text-right">{t('editor.midiImport.trackNotes')}</span>
                  <span className="text-right font-mono normal-case">m:ss</span>
                  <span className="w-16" />
                </div>
                <div className="max-h-64 overflow-y-auto editor-panel-scroll">
                  {tracksWithNotes.map(tr => {
                    const isSelected = tr.index === selectedTrack;
                    const isMelody = tr.index === midi?.melodyTrackIndex;
                    const lastNote = tr.notes[tr.notes.length - 1];
                    const durationMs = lastNote ? lastNote.startTimeMs + lastNote.durationMs : 0;
                    return (
                      <button
                        key={tr.index}
                        type="button"
                        onClick={() => { setSelectedTrack(tr.index); setConfirmReplace(false); }}
                        aria-pressed={isSelected}
                        data-testid={`midi-import-track-${tr.index}`}
                        className={cn(
                          'w-full grid grid-cols-[auto_1fr_auto_auto_auto] gap-2 items-center px-3 py-2 text-left text-sm transition-colors border-b border-slate-800 last:border-b-0',
                          isSelected
                            ? 'bg-amber-500/15 text-white'
                            : 'text-slate-300 hover:bg-white/5',
                        )}
                      >
                        <span
                          className={cn(
                            'w-3 h-3 rounded-full border shrink-0',
                            isSelected ? 'bg-amber-400 border-amber-300' : 'border-slate-600',
                          )}
                          aria-hidden
                        />
                        <span className="truncate">
                          <span className="text-slate-500 font-mono text-xs mr-1.5">{tr.index + 1}</span>
                          {tr.name}
                        </span>
                        <span className="text-right font-mono text-xs text-slate-400">{tr.noteCount}</span>
                        <span className="text-right font-mono text-xs text-slate-400">{formatTrackDuration(durationMs)}</span>
                        <span className="w-16 flex justify-end">
                          {isMelody && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[10px] font-semibold whitespace-nowrap">
                              <Star className="w-2.5 h-2.5" />
                              {t('editor.midiImport.melodyTrack')}
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <Separator className="bg-slate-700" />

          {/* Section 2: Optional lyrics → sequential syllable assignment */}
          <div className="space-y-2">
            <Label htmlFor="midi-import-lyrics" className="text-slate-400 text-xs flex items-center gap-1.5">
              <Music4 className="w-3.5 h-3.5 text-purple-400" />
              {t('editor.midiImport.lyricsOptional')}
            </Label>
            <Textarea
              id="midi-import-lyrics"
              value={lyricsText}
              onChange={(e) => setLyricsText(e.target.value)}
              placeholder={t('editor.midiImport.lyricsPlaceholder')}
              className="bg-slate-800 border-slate-600 min-h-[100px] font-mono text-sm"
              data-testid="midi-import-lyrics"
            />
            {selectedTrackData && selectedTrackData.noteCount > 0 && (
              <p className="text-xs text-slate-600" data-testid="midi-import-syllable-info">
                {t('editor.midiImport.syllableAssignment')
                  .replace('{syllables}', String(syllables.length))
                  .replace('{notes}', String(selectedTrackData.noteCount))}
              </p>
            )}
          </div>

          <Separator className="bg-slate-700" />

          {/* Section 3: Transposition */}
          <div className="space-y-2">
            <Label htmlFor="midi-import-transpose" className="text-slate-400 text-xs">
              {t('editor.midiImport.transpose')}
            </Label>
            <Input
              id="midi-import-transpose"
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
              data-testid="midi-import-transpose"
            />
          </div>

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
                data-testid="midi-import-replace-confirm"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-amber-200">{t('editor.midiImport.importReplaceTitle')}</p>
                    <p className="text-xs text-slate-400">{t('editor.midiImport.importReplaceBody')}</p>
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
                  className="bg-gradient-to-r from-amber-600 to-violet-600 hover:from-amber-500 hover:to-violet-500 text-white"
                  data-testid="midi-import-replace-confirm-button"
                >
                  {t('editor.midiImport.confirm')}
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleImportClick}
                disabled={!canImport}
                className="bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-700 hover:to-purple-700 disabled:opacity-50"
                data-testid="midi-import-import-button"
              >
                <FileMusic className="w-4 h-4" />
                {t('editor.midiImport.import')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default MidiImportDialog;
