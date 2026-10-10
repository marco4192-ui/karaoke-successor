/**
 * Visible-notes time-window query (binary search) + the game display
 * constants of the note highway window.
 *
 * R13: moved byte-identically from src/lib/game/note-utils.tsx.
 */
import type { Note, LyricLine } from '@/types/game';

// Game display constants
export const SING_LINE_POSITION = 20;
export const NOTE_WINDOW = 4000;
export const VISIBLE_TOP = 8;
const VISIBLE_BOTTOM = 85;
export const VISIBLE_RANGE = VISIBLE_BOTTOM - VISIBLE_TOP;

/**
 * Get visible notes within a time window using binary search.
 */
export function getVisibleNotes(
  notes: Array<Note & { lineIndex: number; line: LyricLine }> | undefined | null,
  currentTime: number,
  noteWindow: number
): Array<Note & { lineIndex: number; line: LyricLine }> {
  if (!notes || notes.length === 0) return [];

  const searchWindowStart = currentTime - 20000;
  const filterWindowStart = currentTime - 5000;
  const windowEnd = currentTime + noteWindow;
  const result: Array<Note & { lineIndex: number; line: LyricLine }> = [];

  let startIdx = 0;
  let endIdx = notes.length - 1;

  while (startIdx <= endIdx) {
    const midIdx = Math.floor((startIdx + endIdx) / 2);
    if (notes[midIdx].startTime < searchWindowStart) {
      startIdx = midIdx + 1;
    } else {
      endIdx = midIdx - 1;
    }
  }

  for (let i = startIdx; i < notes.length; i++) {
    const note = notes[i];
    const noteEnd = note.startTime + note.duration;

    if (note.startTime > windowEnd) break;
    if (noteEnd >= filterWindowStart) {
      result.push(note);
    }
  }

  return result;
}
