/**
 * Multi-Format Import — Convert to Song
 *
 * Dispatch (convertToSong): converts the parser results of all four
 * formats (KaraokeMugen/ASS, MIDI, SingStar, StepMania) into the app's
 * Partial<Song> shape. Private helpers: joinSyllables (MIDI lyric lines),
 * generateNotesFromText (KaraokeMugen fallback notes).
 *
 * Extracted from multi-format-import.ts (R11) — byte-identical blocks,
 * orchestrator re-exports keep the public import path stable.
 */

import type { Song, LyricLine, Note } from '@/types/game';
import { midiPitchToFrequency } from '@/lib/utils';
import type { DetectedFormat } from './detect';
import type { KaraokeMugenSong } from './karaoke-mugen';
import type { MIDIKaraokeData } from './midi';
import type { SingStarSongData } from './singstar';
import type { StepManiaData } from './stepmania';
// ─── Convert to Song ─────────────────────────────────────────────────

export interface ConvertToSongOptions {
  /** MIDI: index of the track to import as melody (default: auto-detected melody track). */
  midiTrackIndex?: number;
}

export function convertToSong(
  data: KaraokeMugenSong | MIDIKaraokeData | SingStarSongData | StepManiaData,
  format: DetectedFormat,
  audioUrl?: string,
  videoUrl?: string,
  options?: ConvertToSongOptions,
): Partial<Song> {
  switch (format) {
    case 'karaoke-mugen': {
      const km = data as KaraokeMugenSong;
      const lyrics: LyricLine[] = km.lyrics.map((l, i) => ({
        id: `line-${i}`,
        text: l.text,
        startTime: l.start,
        endTime: l.end,
        // ASS karaoke imports carry per-syllable timing ({\k} tags) — build
        // the notes from that precise data instead of distributing words
        // evenly across the line.
        notes: l.syllables && l.syllables.length > 0
          ? l.syllables.map((syl, j) => {
              // Deterministic pitch around C4 (ASS has no pitch information)
              const pitch = 60 + (j % 12);
              return {
                id: `note-km${i}-${j}`,
                pitch,
                frequency: midiPitchToFrequency(pitch),
                startTime: syl.start,
                duration: Math.max(50, syl.duration),
                lyric: syl.text.trim(),
                isBonus: false,
                isGolden: false,
              };
            })
          : generateNotesFromText(l.text, l.start, l.end, `km${i}`),
      }));
      // R14: duration from the lyric lines — without it the import got
      // duration 0 and the game ended the song instantly (progressbar jumped
      // straight to 100%). Use the last line/note end + a small tail.
      const kmDuration = km.lyrics.reduce((acc, l) => {
        const lastNoteEnd = l.syllables?.length
          ? Math.max(...l.syllables.map(s => s.start + s.duration))
          : 0;
        return Math.max(acc, l.end ?? 0, lastNoteEnd);
      }, 0);
      return { title: km.title, artist: km.artist, lyrics, duration: Math.round(kmDuration + 500), audioUrl: km.audioFile || audioUrl, videoBackground: km.videoFile || videoUrl };
    }

    case 'midi': {
      const midi = data as MIDIKaraokeData;
      if (!midi.ticksPerBeat || !midi.tempo) {
        throw new Error('MIDI file has invalid ticksPerBeat or tempo — cannot calculate note timings.');
      }

      // ── Track selection ──
      // Explicit choice (from the track picker UI) → auto-detected melody track
      // → first non-drum track with notes → any track with notes.
      const track =
        midi.tracks.find(tr => tr.index === options?.midiTrackIndex && tr.noteCount > 0) ??
        midi.tracks.find(tr => tr.index === midi.melodyTrackIndex && tr.noteCount > 0) ??
        midi.tracks.find(tr => !tr.isDrum && tr.noteCount > 0) ??
        midi.tracks.find(tr => tr.noteCount > 0);
      if (!track) {
        throw new Error('MIDI file contains no note tracks — nothing to import.');
      }

      // Lyrics: from the selected track itself. When it carries none (e.g. a
      // plain .mid melody track), borrow the track with the most lyric events —
      // in .kar files those are time-aligned with the melody anyway.
      let lyricEvents = track.lyrics;
      if (lyricEvents.length === 0) {
        const lyricTrack = [...midi.tracks]
          .filter(tr => tr.lyrics.length > 0)
          .sort((a, b) => b.lyrics.length - a.lyrics.length)[0];
        if (lyricTrack) lyricEvents = lyricTrack.lyrics;
      }

      // ── Build lyric lines ──
      // Line breaks: explicit .kar markers (`/`, `\`) win; long note gaps
      // (≥ 2 s) act as fallback. R10-4: lyric-less MIDIs (or fully instrumental
      // stretches) additionally break at BAR phrases — legato melodies without
      // rests otherwise collapse into giant 55-note lines ("Strophen wurden
      // nicht hintereinander dargestellt"). Phrase length: 2 bars of the
      // file's time signature (waltz 3/4 → ~3.7 s, 4/4 → ~4 s at 120 BPM).
      const lyrics: LyricLine[] = [];
      let currentLineNotes: Note[] = [];
      let lineStartTime = 0;
      let lastEndTime = 0;
      let lineHasSyllable = false;
      const LINE_BREAK_MS = 2000;
      const LYRIC_TOLERANCE_MS = 600;
      const barMs = midi.tempo > 0 ? (60000 / midi.tempo) * (midi.beatsPerBar || 4) : 2000;
      const PHRASE_MS = Math.max(1200, barMs * 2);

      const flushLine = () => {
        if (currentLineNotes.length === 0) return;
        const lastN = currentLineNotes[currentLineNotes.length - 1];
        lyrics.push({
          id: `line-${lyrics.length}`,
          text: joinSyllables(currentLineNotes),
          startTime: lineStartTime,
          endTime: lastN.startTime + lastN.duration,
          notes: currentLineNotes,
        });
        currentLineNotes = [];
        lineHasSyllable = false;
      };

      // Two-pointer lyric matching: each note takes the nearest unassigned
      // syllable within the tolerance window. Melismas (one syllable, several
      // notes) correctly leave the trailing notes as '♪'.
      let li = 0;
      for (const n of track.notes) {
        while (li < lyricEvents.length && lyricEvents[li].startTimeMs < n.startTimeMs - LYRIC_TOLERANCE_MS) li++;

        let lyricText = '♪';
        let startNewLine = false;
        if (li < lyricEvents.length && Math.abs(lyricEvents[li].startTimeMs - n.startTimeMs) <= LYRIC_TOLERANCE_MS) {
          lyricText = lyricEvents[li].text || '♪';
          startNewLine = lyricEvents[li].newLine;
          li++;
        }

        if (lyricText !== '♪') lineHasSyllable = true;

        // Break conditions (ordered by precedence):
        //  1. explicit .kar line marker
        //  2. long rest (≥ 2 s)
        //  3. BAR PHRASE (R10-4): instrumental stretch (no syllable so far in
        //     this line) that has run for ≥ 2 bars — keeps legato lyric-less
        //     melodies in phrase-sized lines instead of giant ♪ blocks.
        if (
          currentLineNotes.length > 0 &&
          (startNewLine ||
            n.startTimeMs - lastEndTime >= LINE_BREAK_MS ||
            (!lineHasSyllable && n.startTimeMs - lineStartTime >= PHRASE_MS))
        ) {
          flushLine();
        }

        if (currentLineNotes.length === 0) lineStartTime = n.startTimeMs;

        currentLineNotes.push({
          id: `note-${lyrics.length}-${currentLineNotes.length}`,
          pitch: n.pitch,
          frequency: midiPitchToFrequency(n.pitch),
          startTime: n.startTimeMs,
          duration: n.durationMs,
          lyric: lyricText,
          isBonus: false,
          isGolden: false,
        });
        lastEndTime = n.startTimeMs + n.durationMs;
      }
      flushLine();

      const lastNote = track.notes[track.notes.length - 1];
      const duration = lastNote ? lastNote.startTimeMs + lastNote.durationMs : 0;

      return {
        title: midi.title, // undefined → caller falls back to the file name
        artist: midi.artist, // undefined → caller falls back to "Unknown"
        bpm: Math.round(midi.tempo),
        duration,
        lyrics,
        audioUrl,
        videoBackground: videoUrl,
      };
    }

    case 'singstar': {
      const ss = data as SingStarSongData;
      const lyrics: LyricLine[] = [];
      let currentLine: LyricLine | null = null;

      for (let i = 0; i < ss.notes.length; i++) {
        const note = ss.notes[i];
        if (!currentLine) {
          currentLine = { id: `line-${lyrics.length}`, text: '', startTime: note.startTime, endTime: note.startTime + note.duration, notes: [] };
        }

        currentLine.notes.push({
          // R9 (1.2): include the line index — `note-0` existed once per line
          id: `note-ss${lyrics.length}-${currentLine.notes.length}`,
          pitch: note.pitch,
          frequency: midiPitchToFrequency(note.pitch),
          startTime: note.startTime, duration: note.duration,
          lyric: note.text, isBonus: false, isGolden: false,
        });

        if (currentLine.text) currentLine.text += ' ';
        currentLine.text += note.text;
        currentLine.endTime = note.startTime + note.duration;

        const nextNote = ss.notes[i + 1];
        if (!nextNote || nextNote.startTime - note.startTime - note.duration > 2000) {
          lyrics.push(currentLine);
          currentLine = null;
        }
      }

      // R14: duration from the last note end (see karaoke-mugen branch).
      const ssDuration = ss.notes.length > 0
        ? Math.max(...ss.notes.map(n => n.startTime + n.duration))
        : 0;
      return { title: ss.title, artist: ss.artist, genre: ss.genre, lyrics, duration: Math.round(ssDuration + 500) };
    }

    case 'stepmania': {
      // StepMania is a rhythm-game format without pitch data.
      // Import metadata only — the user can add lyrics manually in the editor.
      const sm = data as StepManiaData;
      const bpm = sm.bpm?.[0] || 120;
      const duration = bpm > 0 ? (sm.notes.length * (60000 / bpm * 4)) : 0;
      return { title: sm.title, artist: sm.artist, bpm: Math.round(bpm), duration: Math.round(duration) };
    }

    default:
      return {};
  }
}

// ─── Helper ──────────────────────────────────────────────────────────

/**
 * Join per-note syllables into a readable lyric line.
 * UltraStar/.kar convention: syllables carry their own word-boundary markers
 * ("lo " = trailing space ends the word, "Sonn-" = hyphenated syllable), so
 * plain concatenation reconstructs the line. `♪` fillers get separated.
 */
function joinSyllables(notes: Note[]): string {
  let text = '';
  for (const n of notes) {
    const syl = n.lyric ?? '';
    if (!syl) continue;
    if (!text) {
      text = syl;
    } else if (syl.includes('♪') && !/\s$/.test(text)) {
      text += ' ' + syl;
    } else {
      text += syl;
    }
  }
  return text.replace(/\s+/g, ' ').trim();
}

function generateNotesFromText(text: string, startTime: number, endTime: number, idPrefix = 'n'): Note[] {
  const words = text.split(' ').filter(w => w.length > 0);
  const totalDuration = endTime - startTime;
  const noteDuration = words.length > 0 ? totalDuration / words.length : totalDuration;

  return words.map((word, i) => {
    // Use a deterministic pitch based on word index (C4 = MIDI 60) instead of
    // Math.random() so the same text always produces the same note layout.
    const pitch = 60 + (i % 12);
    return {
      // R9 (1.2): caller-scoped prefix keeps ids unique across lines
      id: `note-${idPrefix}-${i}`,
      pitch,
      frequency: midiPitchToFrequency(pitch),
      startTime: startTime + i * noteDuration,
      duration: noteDuration,
      lyric: word,
      isBonus: false,
      isGolden: false,
    };
  });
}
