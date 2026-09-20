// Shared UltraStar note-to-lyric-line conversion
// This is the SINGLE source of truth for converting raw parsed notes into LyricLine[] format.
// Used by: song-library.ts, tauri-file-storage.ts, ultrastar-parser.ts

import { Note, LyricLine, midiToFrequency, PLAYER_TAGS, type DuetPlayer } from '@/types/game';

interface ParsedNote {
  type: string;
  startBeat: number;
  duration: number;
  pitch: number;
  lyric: string;
  player?: 'P1' | 'P2' | 'P4' | 'P8' | 'both';
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
 * MULTI-VOICE (DUET/TRIO/QUARTET) HANDLING:
 * - When notes carry P1/P2/P4/P8 player markers, notes are split into
 *   separate groups per voice (P4 = player 3, P8 = player 4 — UltraStar
 *   trio/quartet bitmask tags)
 * - Each voice gets its own set of lyric lines with correct text
 * - This prevents text duplication from merged voice notes
 */
export function convertNotesToLyricLines(
  notes: ParsedNote[],
  lineBreakBeats: Set<number>,
  bpm: number,
  gap: number
): LyricLine[] {
  const beatDuration = 15000 / bpm;
  const MIDI_BASE_OFFSET = 48;

  // Check which voices are present — any marker makes it a multi-voice song
  const presentVoices = new Set<string>();
  for (const n of notes) {
    if (n.player && n.player !== 'both') presentVoices.add(n.player);
  }

  if (presentVoices.size === 0) {
    // Single-player / no voice markers — build lines from all notes together (original logic)
    return buildLinesFromNotes(notes, lineBreakBeats, beatDuration, MIDI_BASE_OFFSET, gap);
  }

  if (presentVoices.size === 1) {
    // Only one marked voice — keep that voice tag on its lines (a stray single
    // marker must not silently strip the voice assignment), no per-voice split
    // needed. Notes without assignment join the marked voice.
    const only = [...presentVoices][0] as DuetPlayer;
    return buildLinesFromNotes(
      notes.map(n => (n.player && n.player !== 'both' ? n : { ...n, player: only })),
      lineBreakBeats, beatDuration, MIDI_BASE_OFFSET, gap,
    );
  }

  // Multi-voice: build separate lines per voice, then merge into one array.
  // Each voice's lines contain only their own text, preventing duplication.
  // Notes without explicit player assignment go to the FIRST voice.
  // 'both' notes are assigned to the first voice only to prevent duplicate lyric lines.
  const voices = PLAYER_TAGS.filter(tag => presentVoices.has(tag));
  const firstVoice = voices[0];

  const allLines: LyricLine[] = [];
  for (const voice of voices) {
    const voiceNotes = notes.filter(n => n.player === voice || (voice === firstVoice && (n.player === 'both' || !n.player)));
    allLines.push(...buildLinesFromNotes(voiceNotes, lineBreakBeats, beatDuration, MIDI_BASE_OFFSET, gap, voice));
  }

  // Merge and sort by startTime so lines appear in chronological order
  return allLines.sort((a, b) => a.startTime - b.startTime);
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
  playerTarget?: DuetPlayer,
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
      // R9 (user request 1.2): the voice tag is part of the ID. buildLinesFromNotes
      // runs once PER VOICE with fresh counters, so P1's and P2's simultaneous
      // notes used to get IDENTICAL ids (`note-0-0` twice) — duplicate React
      // keys made both blocks show the selection ring at once and edits/undu
      // resolved to the wrong note. With the voice prefix every note id in a
      // multi-voice song is unique and each player's notes can be selected,
      // dragged and edited independently.
      id: `note-${playerTarget ? playerTarget.toLowerCase() : 'm'}-${lyricLines.length}-${currentLineNotes.length}`,
      pitch: note.pitch + midiBaseOffset,
      frequency: midiToFrequency(note.pitch + midiBaseOffset),
      startTime: Math.round(startTime),
      duration: Math.round(duration),
      lyric: note.lyric,
      isBonus: false, // legacy — 'F' is a FREESTYLE note now, not a bonus note
      isFreestyle: note.type === 'F',
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
        // R9 (1.2): voice-prefixed LINE ids too — P1's and P2's lines would
        // otherwise collide (`line-0` twice) and break React keys / lookups.
        id: `line-${playerTarget ? playerTarget.toLowerCase() : 'm'}-${lyricLines.length}`,
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
