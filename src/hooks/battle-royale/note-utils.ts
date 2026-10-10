/**
 * Pure note-window helpers for the Battle Royale game loop.
 */
import type { Note, LyricLine } from '@/types/game';

export function getActiveNotesAtTime(notes: Note[], timeMs: number): Note[] {
  if (notes.length === 0) return [];
  let lo = 0;
  let hi = notes.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (notes[mid].startTime + notes[mid].duration < timeMs) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  const result: Note[] = [];
  for (let i = lo; i < notes.length; i++) {
    const note = notes[i];
    if (note.startTime > timeMs) break;
    if (timeMs >= note.startTime && timeMs <= note.startTime + note.duration) {
      result.push(note);
    }
  }
  return result;
}

/** Stable empty array pinned to visibleNotesRef while the note highway is hidden (Fix 15). */
export const EMPTY_VISIBLE_NOTES: Array<Note & { lineIndex: number; line: LyricLine }> = [];
