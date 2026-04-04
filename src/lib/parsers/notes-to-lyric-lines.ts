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
 * Convert raw parsed notes + line breaks into LyricLine[] format.
 *
 * UltraStar format rules:
 * - beatDuration = 15000 / BPM (BPM is beats per 4 measures)
 * - startTime = GAP + startBeat * beatDuration
 * - Trailing space in lyric = word boundary
 * - Hyphen "-" alone = line break marker
 * - 8+ beat gap between notes = automatic line break
 */
export function convertNotesToLyricLines(
  notes: ParsedNote[],
  lineBreakBeats: Set<number>,
  bpm: number,
  gap: number
): LyricLine[] {
  const beatDuration = 15000 / bpm;
  const MIDI_BASE_OFFSET = 48;
  const lyricLines: LyricLine[] = [];

  let currentLineNotes: Note[] = [];
  let currentLineText = '';
  let currentLinePlayer: 'P1' | 'P2' | 'both' | undefined = undefined;

  const sortedNotes = [...notes].sort((a, b) => a.startBeat - b.startBeat);

  for (let i = 0; i < sortedNotes.length; i++) {
    const note = sortedNotes[i];
    const noteEndBeat = note.startBeat + note.duration;
    const startTime = gap + (note.startBeat * beatDuration);
    const duration = note.duration * beatDuration;

    // Line break note: Only a hyphen "-" alone in the lyric column triggers a line break
    const trimmedLyric = note.lyric.trim();
    const isLineBreakNote = trimmedLyric === '-';

    if (isLineBreakNote) {
      if (currentLineNotes.length > 0) {
        flushLine();
      }
      continue;
    }

    const convertedNote: Note = {
      id: `note-${lyricLines.length}-${currentLineNotes.length}`,
      pitch: note.pitch + MIDI_BASE_OFFSET,
      frequency: midiToFrequency(note.pitch + MIDI_BASE_OFFSET),
      startTime: Math.round(startTime),
      duration: Math.round(duration),
      lyric: note.lyric,
      isBonus: note.type === 'F',
      isGolden: note.type === '*' || note.type === 'G',
      player: note.player,
    };

    currentLineNotes.push(convertedNote);
    currentLineText += note.lyric;

    if (currentLinePlayer === undefined) {
      currentLinePlayer = note.player;
    } else if (currentLinePlayer !== note.player && note.player !== undefined) {
      currentLinePlayer = 'both';
    }

    // Check for line break: explicit line break marker or 8+ beat gap
    const isLineBreak = lineBreakBeats.has(noteEndBeat) ||
      (i < sortedNotes.length - 1 && sortedNotes[i + 1].startBeat - noteEndBeat >= 8);

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
        player: currentLinePlayer,
      });
    }
    currentLineNotes = [];
    currentLineText = '';
    currentLinePlayer = undefined;
  }
}
