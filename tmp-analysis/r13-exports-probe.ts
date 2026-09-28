// R13 export-surface probe: ALL 18 original exports must resolve from the
// unchanged consumer import path. (Removed again after verification.)
import {
  NOTE_HEIGHT,
  PITCH_RANGE,
  BASE_PITCH,
  FLAT_NOTE_FILL_COLOR,
  getNoteDisplayStyleClasses,
  getMultiPlayerNoteOverlay,
  getNoteBackgroundClasses,
  getNoteBoxShadow,
  calculatePitchY,
  calculatePitchStats,
  SING_LINE_POSITION,
  NOTE_WINDOW,
  VISIBLE_TOP,
  VISIBLE_RANGE,
  getVisibleNotes,
} from '@/lib/game/note-utils';
import type {
  NoteRenderMode,
  NoteStripPlayer,
  NotePositionData,
  PitchStats,
} from '@/lib/game/note-utils';

export const probe = {
  NOTE_HEIGHT, PITCH_RANGE, BASE_PITCH, FLAT_NOTE_FILL_COLOR,
  getNoteDisplayStyleClasses, getMultiPlayerNoteOverlay,
  getNoteBackgroundClasses, getNoteBoxShadow, calculatePitchY,
  calculatePitchStats, SING_LINE_POSITION, NOTE_WINDOW, VISIBLE_TOP,
  VISIBLE_RANGE, getVisibleNotes,
};
export type ProbeTypes = [NoteRenderMode, NoteStripPlayer, NotePositionData, PitchStats];
