'use client';

/**
 * Note details band ("Noten-Details") — the editing band below the lyric
 * track. Extracted verbatim from timeline.tsx (R2 refactor):
 *
 * - DetailChip (compact stat chip — currently unused, kept as in the
 *   original file)
 * - NoteDetailsInputs (the PRIMARY editing surface: Lyric, Pitch, Start,
 *   Duration + note-type DropUp + info chips)
 * - NoteDetailsBand (band container + header row + selection of the inputs
 *   or the hint — previously inline JSX of the Timeline component)
 */
import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { Note, NoteType } from '@/types/game';
import { midiToNoteName, getNoteType, noteTypeFlags, NOTE_TYPE_CHARS } from '@/types/game';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from '@/lib/i18n/translations';
import { Info, ChevronUp } from 'lucide-react';
import type { NoteHistoryMode } from './timeline-types';
import { NOTE_TYPE_OPTIONS } from './timeline-constants';

// ─────────────────────────────────────────────────────────────────────────────
// Note details band chip — one compact stat (label + value)
// ─────────────────────────────────────────────────────────────────────────────

function DetailChip({ label, value, testId, title }: {
  label: string;
  value: React.ReactNode;
  testId?: string;
  title?: string;
}) {
  return (
    <div
      className="flex flex-col justify-center gap-0.5 px-2.5 py-1 rounded-md bg-slate-800/70 border border-slate-700 shrink-0"
      title={title}
      data-testid={testId}
    >
      <span className="text-[9px] uppercase tracking-wider text-slate-500 leading-none">{label}</span>
      <span className="text-xs text-slate-100 font-medium leading-tight whitespace-nowrap">{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Note details inputs — the PRIMARY editing surface for the selected note.
// Lives in the band below the timeline (R7 task 2.3): Lyric, Pitch (MIDI),
// Start (ms), Duration (ms) as standard inputs with up/down steppers, plus
// a DropUp (opens upward) to pick the note type.
// Non-duplicate info stays as compact chips: frequency, beat, line, voice.
// ─────────────────────────────────────────────────────────────────────────────

/** Parses a number input safely — null for empty/invalid (skip the update). */
function parseNum(value: string): number | null {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function NoteDetailsInputs({
  note,
  beat,
  lineIndex,
  onNoteUpdate,
  onLyricChange,
  onCommitHistory,
}: {
  note: Note;
  beat: number;
  lineIndex: number;
  onNoteUpdate: (_noteId: string, _updates: Partial<Note>, _mode?: NoteHistoryMode) => void;
  onLyricChange: (_noteId: string, _newLyric: string, _mode?: NoteHistoryMode) => void;
  onCommitHistory: () => void;
}) {
  const { t } = useTranslation();

  // Local drafts — number inputs must not fight the user mid-typing.
  // key={note.id} on the component resets drafts when the selection changes.
  const [lyricDraft, setLyricDraft] = useState(note.lyric);
  const [pitchDraft, setPitchDraft] = useState(String(note.pitch));
  const [startDraft, setStartDraft] = useState(String(Math.round(note.startTime)));
  const [durationDraft, setDurationDraft] = useState(String(Math.round(note.duration)));

  // Keep drafts in sync when the note is changed externally (drag, undo, …)
  // eslint-disable-next-line react-hooks/set-state-in-effect -- sync drafts on external note changes
  useEffect(() => {
    setLyricDraft(note.lyric);
    setPitchDraft(String(note.pitch));
    setStartDraft(String(Math.round(note.startTime)));
    setDurationDraft(String(Math.round(note.duration)));
  }, [note.id, note.lyric, note.pitch, note.startTime, note.duration]);

  const noteType = getNoteType(note);

  const stopKeys = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      setLyricDraft(note.lyric);
      setPitchDraft(String(note.pitch));
      setStartDraft(String(Math.round(note.startTime)));
      setDurationDraft(String(Math.round(note.duration)));
      e.currentTarget.blur();
    }
    e.stopPropagation();
  };

  // R8: the band got the pitch-graph's 60 px — inputs grow from h-7 to h-9
  // (text-sm) so the primary editing surface is comfortable to hit with the
  // mouse. The lyric field lost ⅔ of its width: notes carry syllables, not prose.
  const labelClass = 'text-[10px] uppercase tracking-wider text-slate-500 leading-none mb-1 block';
  const inputClass = 'h-9 bg-slate-800 border-slate-600 text-sm text-slate-100 px-2 font-mono';

  return (
    <div className="flex-1 min-h-0 flex flex-col justify-center gap-1 min-w-0">
      {/* Inputs row — the standard editing fields with up/down steppers */}
      <div className="flex items-end gap-2 min-w-0 flex-wrap">
        {/* Note type — DropUp (opens upward; the band sits at the screen bottom) */}
        <div className="shrink-0">
          <span className={labelClass}>{t('editor.noteDetails.type')}</span>
          <Select
            value={noteType}
            onValueChange={(value: NoteType) => onNoteUpdate(note.id, noteTypeFlags(value), 'push')}
          >
            <SelectTrigger
              className="h-9 w-auto min-w-[130px] gap-1.5 bg-slate-800 border-slate-600 text-sm px-2.5"
              data-testid="editor-note-details-type"
              aria-label={t('editor.noteDetails.type')}
            >
              <span className="font-mono font-bold text-slate-400">{NOTE_TYPE_CHARS[noteType]}</span>
              <SelectValue />
              <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
            </SelectTrigger>
            <SelectContent side="top" position="popper">
              {NOTE_TYPE_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  <span className="flex items-center gap-2">
                    <span className="font-mono font-bold w-3 text-center">{opt.char}</span>
                    {t(`editor.noteType.${opt.value}`)}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Lyric — R8: narrowed to ⅓ (notes carry syllables, not prose). Was flex-1. */}
        <div className="shrink-0 w-40">
          <label htmlFor="band-lyric" className={labelClass}>{t('editor.noteTab.lyric')}</label>
          <Input
            id="band-lyric"
            value={lyricDraft}
            onChange={(e) => {
              setLyricDraft(e.target.value);
              onLyricChange(note.id, e.target.value, 'live');
            }}
            onBlur={() => {
              if (lyricDraft.trim() === '' || lyricDraft === note.lyric) onCommitHistory();
              else onLyricChange(note.id, lyricDraft.trim(), 'push');
            }}
            onKeyDown={stopKeys}
            className="h-9 bg-slate-800 border-slate-600 text-sm text-slate-100 px-2"
            data-testid="editor-note-details-lyric"
          />
        </div>

        {/* Pitch (MIDI) — typing + up/down steppers; note name beside */}
        <div className="shrink-0">
          <label htmlFor="band-pitch" className={labelClass}>{t('editor.noteDetails.pitch')}</label>
          <div className="flex items-center gap-1.5">
            <Input
              id="band-pitch"
              type="number"
              min={0}
              max={127}
              step={1}
              value={pitchDraft}
              onChange={(e) => {
                setPitchDraft(e.target.value);
                const pitch = parseNum(e.target.value);
                if (pitch === null) return;
                onNoteUpdate(note.id, { pitch: Math.max(0, Math.min(127, Math.round(pitch))) }, 'live');
              }}
              onBlur={() => {
                setPitchDraft(String(note.pitch));
                onCommitHistory();
              }}
              onKeyDown={stopKeys}
              className={cn(inputClass, 'w-20')}
              data-testid="editor-note-details-pitch"
            />
            <span className="text-cyan-400 font-mono text-sm font-semibold whitespace-nowrap pb-1" data-testid="editor-note-details-pitch-name">
              {midiToNoteName(note.pitch)}
            </span>
          </div>
        </div>

        {/* Start time (ms) */}
        <div className="shrink-0">
          <label htmlFor="band-start" className={labelClass}>{t('editor.noteTab.startTime')}</label>
          <Input
            id="band-start"
            type="number"
            min={0}
            step={25}
            value={startDraft}
            onChange={(e) => {
              setStartDraft(e.target.value);
              const startTime = parseNum(e.target.value);
              if (startTime === null) return;
              onNoteUpdate(note.id, { startTime: Math.max(0, Math.round(startTime)) }, 'live');
            }}
            onBlur={() => {
              setStartDraft(String(Math.round(note.startTime)));
              onCommitHistory();
            }}
            onKeyDown={stopKeys}
            className={cn(inputClass, 'w-28')}
            data-testid="editor-note-details-start"
          />
        </div>

        {/* Duration (ms) */}
        <div className="shrink-0">
          <label htmlFor="band-duration" className={labelClass}>{t('editor.noteTab.duration')}</label>
          <Input
            id="band-duration"
            type="number"
            min={50}
            step={25}
            value={durationDraft}
            onChange={(e) => {
              setDurationDraft(e.target.value);
              const duration = parseNum(e.target.value);
              if (duration === null) return;
              onNoteUpdate(note.id, { duration: Math.max(50, Math.round(duration)) }, 'live');
            }}
            onBlur={() => {
              setDurationDraft(String(Math.round(note.duration)));
              onCommitHistory();
            }}
            onKeyDown={stopKeys}
            className={cn(inputClass, 'w-28')}
            data-testid="editor-note-details-duration"
          />
        </div>
      </div>

      {/* Non-duplicate info — kept as compact chips */}
      <div className="flex items-center gap-2 overflow-x-auto editor-panel-scroll">
        <span className="text-[11px] text-slate-500 whitespace-nowrap" data-testid="editor-note-details-frequency">
          {t('editor.noteDetails.frequency')}: <span className="text-slate-300 font-mono">{note.frequency.toFixed(1)} Hz</span>
        </span>
        <span className="text-[11px] text-slate-500 whitespace-nowrap" data-testid="editor-note-details-beat">
          {t('editor.noteDetails.beat')}: <span className="text-slate-300 font-mono">#{beat.toFixed(2)}</span>
        </span>
        {lineIndex >= 0 && (
          <span className="text-[11px] text-slate-500 whitespace-nowrap" data-testid="editor-note-details-line">
            {t('editor.noteDetails.line')}: <span className="text-slate-300 font-mono">#{lineIndex + 1}</span>
          </span>
        )}
        {note.player && note.player !== 'both' && (
          <span
            className={cn(
              'px-1.5 py-0.5 rounded text-[10px] font-semibold border whitespace-nowrap',
              note.player === 'P1'
                ? 'bg-cyan-500/15 text-cyan-300 border-cyan-400/30'
                : note.player === 'P2'
                  ? 'bg-purple-500/15 text-purple-300 border-purple-400/30'
                  : note.player === 'P4'
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30'
                    : 'bg-orange-500/15 text-orange-300 border-orange-400/30',
            )}
            data-testid="editor-note-details-player"
          >
            {note.player}
          </span>
        )}
        {note.isFreestyle && (
          <span className="text-[11px] text-pink-400/80 whitespace-nowrap">♪ {t('editor.noteDetails.freestyleHint')}</span>
        )}
        {note.isRap && !note.isGolden && (
          <span className="text-[11px] text-emerald-400/80 whitespace-nowrap">♪ {t('editor.noteDetails.rapHint')}</span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Note details band — full-width band between lyric track and minimap.
// Container + header row were inline JSX of the Timeline component before
// the R2 refactor; the markup is byte-identical.
// ─────────────────────────────────────────────────────────────────────────────

interface NoteDetailsBandProps {
  /** Top offset inside the timeline container (below lanes + lyric track), px. */
  top: number;
  /** Distance from the container bottom (= minimap height), px. */
  bottom: number;
  /** Currently selected note (undefined → hint text). */
  selectedNote?: Note;
  /** Beat position of the selected note (inverse UltraStar formula). */
  beat: number;
  /** Lyric line index of the selected note (-1 = not found). */
  lineIndex: number;
  /** Number of notes in the multi-selection (count badge). */
  multiSelectCount: number;
  onNoteUpdate: (_noteId: string, _updates: Partial<Note>, _mode?: NoteHistoryMode) => void;
  onLyricChange: (_noteId: string, _newLyric: string, _mode?: NoteHistoryMode) => void;
  onCommitHistory: () => void;
}

/**
 * R7 redesign: the input fields from the old left-panel note tab live HERE
 * now — Lyric, Pitch (MIDI), Start (ms) and Duration (ms) are the primary
 * editing surface, plus a DropUp menu for the note type (opens upward — the
 * band sits at the bottom of the screen).
 * R8: the band inherits the full height of the removed pitch graph —
 * roomier inputs, compact chips.
 * Non-duplicate info (frequency, beat, line, voice) stays as chips.
 * Clicks are stopped so interacting with the band keeps the selection.
 */
export function NoteDetailsBand({
  top,
  bottom,
  selectedNote,
  beat,
  lineIndex,
  multiSelectCount,
  onNoteUpdate,
  onLyricChange,
  onCommitHistory,
}: NoteDetailsBandProps) {
  const { t } = useTranslation();

  return (
    <div
      className="absolute left-0 right-0 z-20 border-t border-slate-700 bg-slate-900/70 cursor-default overflow-hidden"
      style={{
        top,
        bottom,
      }}
      onClick={(e) => e.stopPropagation()}
      data-testid="editor-note-details-band"
    >
      <div className="h-full flex flex-col px-3 py-2 min-w-0">
        {/* Header row: title + selection count */}
        <div className="flex items-center gap-2 shrink-0 min-w-0">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 shrink-0">
            <Info className="w-3 h-3 text-cyan-400" aria-hidden />
            {t('editor.noteDetails.title')}
          </h3>
          {multiSelectCount > 1 && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 font-medium shrink-0"
              data-testid="editor-note-details-count"
            >
              {t('editor.noteDetails.selectedCount').replace('{count}', String(multiSelectCount))}
            </span>
          )}
        </div>

        {selectedNote ? (
          <NoteDetailsInputs
            key={selectedNote.id}
            note={selectedNote}
            beat={beat}
            lineIndex={lineIndex}
            onNoteUpdate={onNoteUpdate}
            onLyricChange={onLyricChange}
            onCommitHistory={onCommitHistory}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-xs text-slate-600">
            {t('editor.noteDetails.hint')}
          </div>
        )}
      </div>
    </div>
  );
}
