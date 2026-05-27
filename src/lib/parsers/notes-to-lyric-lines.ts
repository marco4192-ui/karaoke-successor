// Shared UltraStar note-to-lyric-line conversion
// This is the SINGLE source of truth for converting raw parsed notes into LyricLine[] format.
// Used by: song-library.ts, tauri-file-storage.ts, ultrastar-parser.ts

import { Note, LyricLine, midiToFrequency } from '@/types/game';

interface ParsedNote {
  type: string;
  startBeat: number;
  duration: number;
  pitch: number;
  lyric: string;
  player?: 'P1' | 'P2' | 'both';
}

/**
 * Check if any line break marker falls between noteEndBeat and nextNoteStart.
 * A break is triggered whenever the gap spans a break-beat value,
 * regardless of how small or large the gap is.
 */
function hasBreakBetween(
  noteEndBeat: number,
  nextNoteStart: number,
  lineBreakBeats: Set<number>,
): boolean {
  if (nextNoteStart < 0) return false;
  for (const breakBeat of lineBreakBeats) {
    // Break falls within the gap (exclusive bounds avoid double-matching zero-duration edges)
    if (breakBeat >= noteEndBeat && breakBeat <= nextNoteStart) return true;
  }
  return false;
}

/**
 * Convert raw parsed notes + line breaks into LyricLine[] format.
 *
 * UltraStar format rules:
 * - beatDuration = 15000 / BPM (BPM is beats per 4 measures)
 * - startTime = GAP + startBeat * beatDuration
 * - Trailing space in lyric = word boundary
 * - Line breaks are separate lines: "- <beat>" (passed via lineBreakBeats set)
 * - A hyphen "-" as lyric text on a note is just normal text, NOT a line break
 * - 8+ beat gap between notes = automatic line break (fallback)
 *
 * DUET HANDLING:
 * - When notes have P1/P2 player markers, notes are split into separate groups
 * - Each player gets its own set of lyric lines with correct text
 * - This prevents text duplication from merged P1+P2 notes
 */
export function convertNotesToLyricLines(
  notes: ParsedNote[],
  lineBreakBeats: Set<number>,
  bpm: number,
  gap: number
): LyricLine[] {
  const beatDuration = 15000 / bpm;
  const MIDI_BASE_OFFSET = 48;

  // Check if any note has a P1/P2 player marker — indicates a duet song
  const hasPlayerMarkers = notes.some(n => n.player === 'P1' || n.player === 'P2');

  if (!hasPlayerMarkers) {
    // Single-player / no duet markers — build lines from all notes together (original logic)
    return buildLinesFromNotes(notes, lineBreakBeats, beatDuration, MIDI_BASE_OFFSET, gap);
  }

  // Duet mode: build separate lines for P1 and P2, then merge into one array.
  // Each player's lines contain only their own text, preventing duplication.
  // Notes without explicit player assignment go to P1 (first player).
  // 'both' notes are assigned to P1 only to prevent duplicate lyric lines.
  const p1Notes = notes.filter(n => n.player === 'P1' || n.player === 'both' || !n.player);
  const p2Notes = notes.filter(n => n.player === 'P2');

  const p1Lines = buildLinesFromNotes(p1Notes, lineBreakBeats, beatDuration, MIDI_BASE_OFFSET, gap, 'P1');
  const p2Lines = buildLinesFromNotes(p2Notes, lineBreakBeats, beatDuration, MIDI_BASE_OFFSET, gap, 'P2');

  // Merge and sort by startTime so lines appear in chronological order
  return [...p1Lines, ...p2Lines].sort((a, b) => a.startTime - b.startTime);
}

/**
 * Build lyric lines from a set of notes.
 * When playerTarget is set, all lines get that player assignment.
 */
function buildLinesFromNotes(
  notes: ParsedNote[],
  lineBreakBeats: Set<number>,
  beatDuration: number,
  midiBaseOffset: number,
  gap: number,
  playerTarget?: 'P1' | 'P2',
): LyricLine[] {
  const lyricLines: LyricLine[] = [];
  let currentLineNotes: Note[] = [];
  let currentLineText = '';

  const sortedNotes = [...notes].sort((a, b) => a.startBeat - b.startBeat);

  for (let i = 0; i < sortedNotes.length; i++) {
    const note = sortedNotes[i];
    const noteEndBeat = note.startBeat + note.duration;
    const startTime = gap + (note.startBeat * beatDuration);
    const duration = note.duration * beatDuration;

    const convertedNote: Note = {
      id: `note-${lyricLines.length}-${currentLineNotes.length}`,
      pitch: note.pitch + midiBaseOffset,
      frequency: midiToFrequency(note.pitch + midiBaseOffset),
      startTime: Math.round(startTime),
      duration: Math.round(duration),
      lyric: note.lyric,
      isBonus: note.type === 'F',
      isGolden: note.type === '*' || note.type === 'G',
      isRap: note.type === 'R' || note.type === 'G',
      player: playerTarget || note.player,
    };

    currentLineNotes.push(convertedNote);
    currentLineText += note.lyric;

    // Check for line break: explicit "- <beat>" marker or 8+ beat gap fallback
    const nextNoteStart = i < sortedNotes.length - 1 ? sortedNotes[i + 1].startBeat : -1;
    const isBreakMarker = hasBreakBetween(noteEndBeat, nextNoteStart, lineBreakBeats);
    const isGapBreak = i < sortedNotes.length - 1 && nextNoteStart - noteEndBeat >= 8;
    const isLineBreak = isBreakMarker || isGapBreak;

    if ((isLineBreak || i === sortedNotes.length - 1) && currentLineNotes.length > 0) {
      flushLine();
    }
  }

  return lyricLines;

  function flushLine() {
    const lineStartTime = currentLineNotes[0].startTime;
    const lineEndTime = currentLineNotes[currentLineNotes.length - 1].startTime +
                         currentLineNotes[currentLineNotes.length - 1].duration;
    const finalLineText = currentLineText.replace(/^\s+/, '');

    if (finalLineText) {
      lyricLines.push({
        id: `line-${lyricLines.length}`,
        text: finalLineText,
        startTime: lineStartTime,
        endTime: lineEndTime,
        notes: currentLineNotes,
        player: playerTarget || (currentLineNotes[0]?.player === 'both' ? 'both' : currentLineNotes[0]?.player),
      });
    }
    currentLineNotes = [];
    currentLineText = '';
  }
}
