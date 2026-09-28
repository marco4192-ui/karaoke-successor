/**
 * Shared types for the editor timeline.
 *
 * Extracted verbatim from timeline.tsx (R2 refactor) — only the module
 * boundary is new; every field, comment and semantics is unchanged.
 * timeline.tsx re-exports NoteHistoryMode so the historical import path
 * `from './timeline/timeline'` keeps working.
 */
import type { Note, Song, DuetPlayer } from '@/types/game';

/**
 * History mode for note updates:
 * - 'push'   → update state AND push a history entry (discrete actions)
 * - 'live'   → update state only, mark dirty (dragging, slider, typing)
 * - 'commit' → push a history entry from the current state (drag release, blur)
 * - 'replace' → push overwriting the top entry (tap-mode: create + duration = one step)
 */
export type NoteHistoryMode = 'push' | 'live' | 'commit' | 'replace';

/** One reference note of the MIDI/KAR comparison overlay (3.5): beat
 *  position + length in beats of the CURRENT song + MIDI pitch. */
export interface TimelineComparisonNote {
  beat: number;
  lengthBeats: number;
  pitch: number;
}

export interface TimelineProps {
  song: Song;
  currentTime: number;
  isPlaying: boolean;
  selectedNoteId?: string;
  /** Multi-selection set (YASS-style Ctrl+Click) */
  selectedNoteIds?: Set<string>;
  /** Beat snapping enabled (magnet) */
  snapEnabled?: boolean;
  onToggleSnap?: () => void;
  playbackRate?: number;
  onPlaybackRateChange?: (_rate: number) => void;
  onTimeChange: (_time: number) => void;
  onPlayPause: () => void;
  onNoteSelect: (_noteId: string | undefined) => void;
  /** Ctrl+Click on a note — toggle it in the multi-selection */
  onNoteCtrlToggle: (_noteId: string) => void;
  onNoteUpdate: (_noteId: string, _updates: Partial<Note>, _mode?: NoteHistoryMode) => void;
  /** Push the accumulated live changes as one history entry (drag release etc.) */
  onCommitHistory: () => void;
  onNoteAdd: (_startTime: number, _pitch: number) => void;
  onLyricChange: (_noteId: string, _newLyric: string, _mode?: NoteHistoryMode) => void;
  /** Jump command from the lyrics panel (left sidebar): double-click on a
   *  word scrolls/centers the timeline on that note. `nonce` makes repeated
   *  jumps to the SAME note retrigger (new object identity alone is not
   *  enough when parents memoize the command). */
  noteJumpCommand?: { noteId: string; nonce: number } | null;
  /** MIDI/KAR comparison overlay (3.5): non-interactive reference notes drawn in
   *  the note lanes (beat grid of the CURRENT song — the song is never changed). */
  comparisonNotes?: Array<TimelineComparisonNote> | null;
  /** Remove the comparison reference entirely (✕ in the legend chip). */
  onClearComparison?: () => void;
}

/** One renderable pitch lane (combined mode = a single lane over all notes). */
export interface PitchLane {
  key: string;
  /** Badge label shown at the lane's left edge (split view: "P1"/"P2"). */
  badge?: string;
  badgeClass?: string;
  notes: Note[];
  /** Top offset of the lane INSIDE the notes area, in px. */
  topOffset: number;
  height: number;
  minPitch: number;
  maxPitch: number;
  pitchHeight: number;
}

/** State of an active note drag (R14 note-drag feel). */
export interface NoteDragState {
  noteId: string;
  startX: number;
  startY: number;
  type: 'move' | 'resize-left' | 'resize-right';
  originalNote: Note;
  /** Pitch height of the lane the note lives in (vertical → pitch dragging). */
  pitchHeight: number;
  moved: boolean;
  /** R14: axis intent — locks the drag to the dominant axis so horizontal
   *  drags never change pitch (and vice versa) until a deliberate escape. */
  axis: 'undecided' | 'horizontal' | 'vertical' | 'free';
  /** R14: last applied pitch delta (semitones) — hysteresis anchor. */
  lastPitchDelta: number;
}
