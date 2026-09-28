/**
 * Pure note/lyrics structure operations for the KaraokeEditor (R5 module
 * split). Extracted 1:1 from karaoke-editor.tsx — no React, no state: every
 * function maps lyrics structures to new lyrics structures. The
 * orchestrator's handlers keep their bodies and call these directly.
 */

import { v4 as uuidv4 } from 'uuid';
import type { Note, LyricLine } from '@/types/game';
import type { DetectedNote } from '@/hooks/use-audio-analysis';

// Max time gap between consecutive tap notes before a new lyric line starts
const TAP_LINE_GAP_MS = 1400;

/** Sort notes by startTime and recompute the line's text + endTime. */
export function finalizeLine(line: LyricLine): LyricLine {
  const notes = [...line.notes].sort((a, b) => a.startTime - b.startTime);
  const lastNote = notes[notes.length - 1];
  return {
    ...line,
    notes,
    text: notes.map(n => n.lyric).join(' '),
    endTime: lastNote ? lastNote.startTime + lastNote.duration : line.endTime,
  };
}

/**
 * Group flat notes (time order) into lyric lines using insertNote's
 * TAP_LINE_GAP_MS rule (gap ≤ 1400 ms keeps the line; chords/overlapping
 * notes stay together). Used by the MIDI/KAR note import (3.2).
 */
export function groupNotesIntoLines(notes: Note[]): LyricLine[] {
  const sorted = [...notes].sort((a, b) => a.startTime - b.startTime);
  const lines: LyricLine[] = [];
  let current: Note[] = [];
  let lastEnd = Number.NEGATIVE_INFINITY;

  const flush = () => {
    if (current.length === 0) return;
    lines.push(finalizeLine({
      id: uuidv4(),
      text: '',
      startTime: current[0].startTime,
      endTime: current[current.length - 1].startTime + current[current.length - 1].duration,
      notes: current,
    }));
    current = [];
  };

  for (const note of sorted) {
    if (current.length > 0 && note.startTime - lastEnd > TAP_LINE_GAP_MS) {
      flush();
    }
    current.push(note);
    lastEnd = Math.max(lastEnd, note.startTime + note.duration);
  }
  flush();

  return lines;
}

/** Insert a note into the lyrics structure. `groupLine` merges close tap notes into the previous line. */
export function insertNoteIntoLyrics(lyrics: LyricLine[], newNote: Note, groupLine: boolean): LyricLine[] {
  const startTime = newNote.startTime;
  const targetLine = lyrics.find(line => startTime >= line.startTime && startTime <= line.endTime);

  if (targetLine) {
    return lyrics.map(line =>
      line.id === targetLine.id
        ? finalizeLine({ ...line, notes: [...line.notes, newNote] })
        : line
    );
  }

  if (groupLine) {
    // Line grouping: append to the last line when the gap is small (tap flow)
    const lastLine = lyrics[lyrics.length - 1];
    if (lastLine) {
      const lastNote = lastLine.notes[lastLine.notes.length - 1];
      const lastEnd = lastNote ? lastNote.startTime + lastNote.duration : lastLine.endTime;
      const gap = startTime - lastEnd;
      if (gap >= 0 && gap <= TAP_LINE_GAP_MS) {
        const updated = finalizeLine({ ...lastLine, notes: [...lastLine.notes, newNote] });
        return [...lyrics.slice(0, -1), updated];
      }
    }
  }

  const newLine: LyricLine = { id: uuidv4(), text: newNote.lyric, startTime, endTime: startTime + 2000, notes: [newNote] };
  return [...lyrics, newLine].sort((a, b) => a.startTime - b.startTime);
}

/** Move a note to a different line when its startTime clearly left the own line. */
export function reassignNoteLineInLyrics(lyrics: LyricLine[], noteId: string): LyricLine[] {
  const srcLine = lyrics.find(l => l.notes.some(n => n.id === noteId));
  if (!srcLine) return lyrics;
  const note = srcLine.notes.find(n => n.id === noteId);
  if (!note) return lyrics;

  // Find a line whose time range strictly contains the note
  const targetLine = lyrics.find(l =>
    l.id !== srcLine.id &&
    note.startTime >= l.startTime &&
    note.startTime <= l.endTime
  );
  if (!targetLine) return lyrics; // stays in its own line

  const srcNotes = srcLine.notes.filter(n => n.id !== noteId);
  const updatedTarget = finalizeLine({ ...targetLine, notes: [...targetLine.notes, note] });

  return lyrics
    .map(l => {
      if (l.id === srcLine.id) {
        return srcNotes.length > 0 ? finalizeLine({ ...srcLine, notes: srcNotes }) : null;
      }
      if (l.id === targetLine.id) return updatedTarget;
      return l;
    })
    .filter((l): l is LyricLine => l !== null);
}

/**
 * Audio Analysis "apply detected notes": match detected notes to existing
 * notes by best time overlap and update ONLY pitch/frequency/confidence
 * (song text, timing, and note durations are NEVER changed — see the
 * original handler comment). Returns null when nothing matched significantly
 * (the caller then keeps the current lyrics unchanged).
 */
export function applyDetectedNotesToLyrics(lyrics: LyricLine[], detectedNotes: DetectedNote[]): LyricLine[] | null {
  const existingNotes = lyrics.flatMap(line => line.notes);

  // Build a map: existingNote.id → best matching detected note (by time overlap)
  const pitchMap = new Map<string, { pitch: number; frequency: number; confidence: number }>();

  for (const en of existingNotes) {
    let bestOverlap = 0;
    let bestDetected: DetectedNote | null = null;
    const enEnd = en.startTime + en.duration;

    for (const dn of detectedNotes) {
      const dnEnd = dn.start_time_ms + dn.duration_ms;
      const overlap = Math.max(0, Math.min(enEnd, dnEnd) - Math.max(en.startTime, dn.start_time_ms));
      if (overlap > bestOverlap) {
        bestOverlap = overlap;
        bestDetected = dn;
      }
    }

    // Only update if overlap is significant (at least 20% of the existing note)
    if (bestDetected && bestOverlap > en.duration * 0.2) {
      pitchMap.set(en.id, {
        pitch: bestDetected.midi_note,
        frequency: bestDetected.frequency,
        confidence: bestDetected.confidence,
      });
    }
  }

  if (pitchMap.size === 0) return null; // Nothing to update

  // Update only pitch/frequency on matching existing notes — preserve everything else
  return lyrics.map(line => ({
    ...line,
    notes: line.notes.map(note => {
      const update = pitchMap.get(note.id);
      if (!update) return note;
      return {
        ...note,
        pitch: update.pitch,
        frequency: update.frequency,
        analysisConfidence: update.confidence,
        isGolden: update.confidence >= 0.8 ? true : note.isGolden,
      };
    }),
  }));
}
