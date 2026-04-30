/**
 * Multi-Format Import Parsers
 *
 * Optional import plugins for karaoke formats beyond UltraStar (.txt):
 * - KaraokeMugen (.json) — JSON-basiertes Karaoke-Format
 * - MIDI Karaoke (.kar/.mid) — MIDI-Dateien mit eingebetteten Lyrics
 * - SingStar — INI-basiertes Format
 * - StepMania (.sm/.ssc) — Rhythm-Game-Chart-Format
 *
 * Usage: Import-Screen erweitert um "Weitere Formate"-Option.
 * Die MIDI-Konvertierung erfordert Audio-Analysis (Pitch) im Nachgang.
 */

import { Song, LyricLine, Note } from '@/types/game';
import { midiPitchToFrequency } from '@/lib/utils';

// ─── Format Detection ────────────────────────────────────────────────

export type DetectedFormat = 'karaoke-mugen' | 'midi' | 'singstar' | 'stepmania' | 'ultrastar' | 'unknown';

export function detectFileFormat(filename: string, content: string | ArrayBuffer): DetectedFormat {
  const ext = filename.split('.').pop()?.toLowerCase();

  if (ext === 'json') {
    try {
      const parsed = JSON.parse(content as string);
      if (parsed.title && parsed.artist && parsed.lyrics) return 'karaoke-mugen';
    } catch { /* not JSON */ }
  }

  if (ext === 'kar' || ext === 'mid') return 'midi';

  if (ext === 'txt' && typeof content === 'string') {
    if (content.includes('#TITLE:') || content.includes('#ARTIST:')) {
      if (content.includes('NOTE=')) return 'singstar';
      if (content.includes('#BPM:') || content.includes('#BPMS:')) return 'stepmania';
      if (content.includes(':') && content.includes('-') && !content.includes('=')) return 'ultrastar';
    }
  }

  if (ext === 'sm' || ext === 'ssc') return 'stepmania';

  return 'unknown';
}

// ─── KaraokeMugen Parser (.json) ─────────────────────────────────────

export interface KaraokeMugenSong {
  title: string;
  artist: string;
  lyrics: Array<{ start: number; end: number; text: string }>;
  audioFile?: string;
  videoFile?: string;
}

export function parseKaraokeMugen(data: string): KaraokeMugenSong | null {
  try {
    const parsed = JSON.parse(data);
    if (!parsed.title || !parsed.artist || !Array.isArray(parsed.lyrics)) return null;
    return {
      title: parsed.title,
      artist: parsed.artist,
      lyrics: parsed.lyrics.map((l: { start: number; end: number; text: string }) => ({
        start: l.start, end: l.end, text: l.text,
      })),
      audioFile: parsed.audioFile,
      videoFile: parsed.videoFile,
    };
  } catch {
    return null;
  }
}

// ─── MIDI Karaoke Parser (.kar/.mid) ─────────────────────────────────

export interface MIDIKaraokeData {
  tempo: number;
  ticksPerBeat: number;
  tracks: Array<{ name: string; events: Array<{ tick: number; type: string; data: unknown }> }>;
  lyrics: Array<{ tick: number; text: string }>;
  notes: Array<{ tick: number; duration: number; pitch: number; velocity: number }>;
}

export function parseMIDIKaraoke(arrayBuffer: ArrayBuffer): MIDIKaraokeData | null {
  try {
    const view = new DataView(arrayBuffer);

    // Verify MIDI header
    const header = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
    if (header !== 'MThd') return null;

    const numTracks = view.getUint16(10, false);
    const ticksPerBeat = view.getUint16(12, false);

    const tracks: MIDIKaraokeData['tracks'] = [];
    const lyrics: MIDIKaraokeData['lyrics'] = [];
    const notes: MIDIKaraokeData['notes'] = [];
    let tempo = 120;

    const activeNotes = new Map<string, { startTick: number; pitch: number; velocity: number }>();

    let offset = 14;
    for (let t = 0; t < numTracks; t++) {
      const trackHeader = String.fromCharCode(view.getUint8(offset), view.getUint8(offset + 1), view.getUint8(offset + 2), view.getUint8(offset + 3));
      if (trackHeader !== 'MTrk') break;

      const trackLength = view.getUint32(offset + 4, false);
      offset += 8;

      const events: MIDIKaraokeData['tracks'][0]['events'] = [];
      const trackEnd = offset + trackLength;
      let absoluteTick = 0;
      let runningStatus = 0;

      while (offset < trackEnd) {
        // Variable-length delta time
        let delta = 0;
        let byte: number;
        do {
          byte = view.getUint8(offset++);
          delta = (delta << 7) | (byte & 0x7f);
        } while (byte & 0x80);

        absoluteTick += delta;

        let eventType = view.getUint8(offset++);

        // Running Status handling
        if (eventType < 0x80) {
          offset--;
          eventType = runningStatus;
        } else if (eventType >= 0x80 && eventType < 0xf0) {
          runningStatus = eventType;
        }

        if (eventType === 0xff) {
          // Meta event
          const metaType = view.getUint8(offset++);
          const length = view.getUint8(offset++);

          if (metaType === 0x01 || metaType === 0x05) {
            // Text / Lyrics meta event
            const textBytes = Array.from({ length }, (_, i) => view.getUint8(offset + i));
            const text = new TextDecoder('latin1').decode(new Uint8Array(textBytes));
            lyrics.push({ tick: absoluteTick, text: text.replace(/[\r\n]/g, ' ').trim() });
          } else if (metaType === 0x51) {
            // Tempo
            const microseconds = (view.getUint8(offset) << 16) | (view.getUint8(offset + 1) << 8) | view.getUint8(offset + 2);
            tempo = 60000000 / microseconds;
          } else if (metaType === 0x03) {
            // Track name
            const textBytes = Array.from({ length }, (_, i) => view.getUint8(offset + i));
            const name = new TextDecoder('latin1').decode(new Uint8Array(textBytes));
            tracks[t] = { ...tracks[t], name };
          }

          offset += length;
        } else if (eventType === 0xf0 || eventType === 0xf7) {
          // SysEx
          do { byte = view.getUint8(offset++); } while (byte !== 0xf7 && offset < trackEnd);
        } else {
          // Channel message
          const channel = eventType & 0x0f;
          const status = eventType & 0xf0;

          switch (status) {
            case 0x80: { // Note Off
              const note = view.getUint8(offset++);
              view.getUint8(offset++); // velocity
              const noteKey = `${channel}-${note}`;
              const activeNote = activeNotes.get(noteKey);
              if (activeNote) {
                notes.push({ tick: activeNote.startTick, duration: absoluteTick - activeNote.startTick, pitch: note, velocity: activeNote.velocity });
                activeNotes.delete(noteKey);
              }
              break;
            }
            case 0x90: { // Note On
              const note = view.getUint8(offset++);
              const velocity = view.getUint8(offset++);
              const noteKey = `${channel}-${note}`;
              if (velocity === 0) {
                const activeNote = activeNotes.get(noteKey);
                if (activeNote) {
                  notes.push({ tick: activeNote.startTick, duration: absoluteTick - activeNote.startTick, pitch: note, velocity: activeNote.velocity });
                  activeNotes.delete(noteKey);
                }
              } else {
                activeNotes.set(noteKey, { startTick: absoluteTick, pitch: note, velocity });
              }
              break;
            }
            case 0xa0: case 0xb0: offset += 2; break;
            case 0xc0: case 0xd0: offset += 1; break;
            case 0xe0: offset += 2; break;
            default: break;
          }
        }
      }

      tracks.push({ name: tracks[t]?.name || `Track ${t + 1}`, events });
    }

    // Convert tick durations to milliseconds
    const tickDurationMs = 60000 / (tempo * ticksPerBeat);

    return {
      tempo, ticksPerBeat, tracks, lyrics,
      notes: notes.map(n => ({ ...n, duration: Math.round(n.duration * tickDurationMs) })),
    };
  } catch (error) {
    console.error('Failed to parse MIDI:', error);
    return null;
  }
}

// ─── SingStar Parser ─────────────────────────────────────────────────

export interface SingStarSongData {
  title: string;
  artist: string;
  genre?: string;
  year?: number;
  notes: Array<{ startTime: number; duration: number; pitch: number; text: string }>;
}

export function parseSingStarData(data: string): SingStarSongData | null {
  try {
    const lines = data.split('\n');
    const songData: Partial<SingStarSongData> = {};
    const notes: SingStarSongData['notes'] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('TITLE=')) songData.title = trimmed.slice(6);
      else if (trimmed.startsWith('ARTIST=')) songData.artist = trimmed.slice(7);
      else if (trimmed.startsWith('GENRE=')) songData.genre = trimmed.slice(6);
      else if (trimmed.startsWith('YEAR=')) songData.year = parseInt(trimmed.slice(5));
      else if (trimmed.startsWith('NOTE=')) {
        const parts = trimmed.slice(5).split(',');
        if (parts.length >= 4) {
          notes.push({ startTime: parseInt(parts[0]), duration: parseInt(parts[1]), pitch: parseInt(parts[2]), text: parts[3] || '' });
        }
      }
    }

    if (!songData.title || !songData.artist) return null;
    return { ...songData, notes } as SingStarSongData;
  } catch {
    return null;
  }
}

// ─── StepMania Parser (.sm/.ssc) ─────────────────────────────────────

export interface StepManiaData {
  title: string;
  artist: string;
  bpm: number[];
  stops: Array<[number, number]>;
  notes: Array<{ beat: number; type: string }>;
}

export function parseStepMania(data: string): StepManiaData | null {
  try {
    const result: Partial<StepManiaData> = { bpm: [120], stops: [], notes: [] };
    const lines = data.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('#TITLE:')) result.title = trimmed.slice(7, -1);
      else if (trimmed.startsWith('#ARTIST:')) result.artist = trimmed.slice(8, -1);
      else if (trimmed.startsWith('#BPMS:')) {
        result.bpm = trimmed.slice(6, -1).split(',').map(b => parseFloat(b.split('=')[1]));
      }
    }

    if (!result.title || !result.artist) return null;
    return result as StepManiaData;
  } catch {
    return null;
  }
}

// ─── Convert to Song ─────────────────────────────────────────────────

export function convertToSong(
  data: KaraokeMugenSong | MIDIKaraokeData | SingStarSongData | StepManiaData,
  format: DetectedFormat,
  audioUrl?: string,
  videoUrl?: string,
): Partial<Song> {
  switch (format) {
    case 'karaoke-mugen': {
      const km = data as KaraokeMugenSong;
      const lyrics: LyricLine[] = km.lyrics.map((l, i) => ({
        id: `line-${i}`,
        text: l.text,
        startTime: l.start,
        endTime: l.end,
        notes: generateNotesFromText(l.text, l.start, l.end),
      }));
      return { title: km.title, artist: km.artist, lyrics, audioUrl: km.audioFile || audioUrl, videoBackground: km.videoFile || videoUrl };
    }

    case 'midi': {
      const midi = data as MIDIKaraokeData;
      const tickDurationMs = 60000 / (midi.tempo * midi.ticksPerBeat);

      // Build lyric lines from MIDI lyrics + notes
      const lyrics: LyricLine[] = [];
      let currentLineNotes: Note[] = [];
      let lineStartTime = 0;
      let lastEndTime = 0;
      const LINE_BREAK_MS = 2000;

      // First pass: build notes with MIDI pitch → frequency
      const midiNotes: Array<{ startTimeMs: number; durationMs: number; pitch: number; frequency: number }> = midi.notes.map(n => ({
        startTimeMs: Math.round(n.tick * tickDurationMs),
        durationMs: n.duration,
        pitch: n.pitch,
        frequency: midiPitchToFrequency(n.pitch),
      }));

      // Match lyrics to notes by tick proximity
      let lyricIndex = 0;
      for (const n of midiNotes) {
        // Find closest lyric
        let lyricText = '♪';
        if (lyricIndex < midi.lyrics.length) {
          const lyricTimeMs = midi.lyrics[lyricIndex].tick * tickDurationMs;
          if (Math.abs(n.startTimeMs - lyricTimeMs) < 500) {
            lyricText = midi.lyrics[lyricIndex].text || '♪';
            lyricIndex++;
          }
        }

        // Line break detection
        if (currentLineNotes.length > 0 && n.startTimeMs - lastEndTime >= LINE_BREAK_MS) {
          const lastN = currentLineNotes[currentLineNotes.length - 1];
          lyrics.push({
            id: `line-${lyrics.length}`,
            text: currentLineNotes.map(nn => nn.lyric).join(' ').trim(),
            startTime: lineStartTime,
            endTime: lastN.startTime + lastN.duration,
            notes: currentLineNotes,
          });
          currentLineNotes = [];
        }

        if (currentLineNotes.length === 0) lineStartTime = n.startTimeMs;

        currentLineNotes.push({
          id: `note-${lyrics.length}-${currentLineNotes.length}`,
          pitch: n.pitch,
          frequency: n.frequency,
          startTime: n.startTimeMs,
          duration: n.durationMs,
          lyric: lyricText,
          isBonus: false,
          isGolden: false,
        });
        lastEndTime = n.startTimeMs + n.durationMs;
      }

      // Push last line
      if (currentLineNotes.length > 0) {
        const lastN = currentLineNotes[currentLineNotes.length - 1];
        lyrics.push({
          id: `line-${lyrics.length}`,
          text: currentLineNotes.map(nn => nn.lyric).join(' ').trim(),
          startTime: lineStartTime,
          endTime: lastN.startTime + lastN.duration,
          notes: currentLineNotes,
        });
      }

      const lastNote = midiNotes[midiNotes.length - 1];
      const duration = lastNote ? lastNote.startTimeMs + lastNote.durationMs : 0;

      return {
        title: 'MIDI Import',
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

      for (const note of ss.notes) {
        if (!currentLine) {
          currentLine = { id: `line-${lyrics.length}`, text: note.text, startTime: note.startTime, endTime: note.startTime + note.duration, notes: [] };
        }

        currentLine.notes.push({
          id: `note-${currentLine.notes.length}`,
          pitch: note.pitch,
          frequency: midiPitchToFrequency(note.pitch),
          startTime: note.startTime, duration: note.duration,
          lyric: note.text, isBonus: false, isGolden: false,
        });

        currentLine.text += ' ' + note.text;
        currentLine.endTime = note.startTime + note.duration;

        const nextNote = ss.notes[ss.notes.indexOf(note) + 1];
        if (!nextNote || nextNote.startTime - note.startTime - note.duration > 2000) {
          lyrics.push(currentLine);
          currentLine = null;
        }
      }

      return { title: ss.title, artist: ss.artist, genre: ss.genre, lyrics };
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

function generateNotesFromText(text: string, startTime: number, endTime: number): Note[] {
  const words = text.split(' ').filter(w => w.length > 0);
  const totalDuration = endTime - startTime;
  const noteDuration = words.length > 0 ? totalDuration / words.length : totalDuration;

  return words.map((word, i) => ({
    id: `note-${i}`,
    pitch: 60 + Math.floor(Math.random() * 12), // placeholder pitch
    frequency: 440,
    startTime: startTime + i * noteDuration,
    duration: noteDuration,
    lyric: word,
    isBonus: false,
    isGolden: false,
  }));
}
