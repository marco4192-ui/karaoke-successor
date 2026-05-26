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

/**
 * Auto-detect the karaoke format of a file.
 *
 * Detection strategy for .txt files (ordered by specificity):
 *
 * 1. **SingStar** — Very distinct `KEY=VALUE` format (no `#` prefix) with `NOTE=` lines.
 * 2. **UltraStar** — Multiple heuristic checks:
 *    a. Note lines: `[P1|P2:] <type><space?> <beat> <duration> <pitch> <lyric>`
 *       Supports all 5 note types (: * F R G), compact notation (:0 not just : 0),
 *       and duet prefixes (P1: / P2:).
 *    b. Line-break markers (`- <beat>`) combined with UltraStar headers.
 *    c. End marker `E` combined with UltraStar headers.
 *    d. Header-only files (no notes, just #TITLE / #ARTIST / #BPM / #GAP etc.)
 *    e. Ambiguous `#BPM:` resolved via companion headers (#GAP / #MP3 = UltraStar,
 *       #STEPS / #DIFFICULTY = StepMania).
 * 3. **StepMania** — `#BPMS:` (plural), `#NOTES:` tag, or measure data patterns.
 *    `#BPM:` alone is NOT used for StepMania (ambiguous with UltraStar).
 */
export function detectFileFormat(filename: string, content: string | ArrayBuffer): DetectedFormat {
  const ext = filename.split('.').pop()?.toLowerCase();

  // ── KaraokeMugen (.json) ──────────────────────────────────────────
  if (ext === 'json') {
    try {
      const parsed = JSON.parse(content as string);
      if (parsed.title && parsed.artist && parsed.lyrics) return 'karaoke-mugen';
    } catch { /* not JSON */ }
  }

  // ── MIDI (.kar / .mid) ───────────────────────────────────────────
  if (ext === 'kar' || ext === 'mid') return 'midi';

  // ── StepMania by extension ───────────────────────────────────────
  if (ext === 'sm' || ext === 'ssc') return 'stepmania';

  // ── .txt heuristics ──────────────────────────────────────────────
  if (ext === 'txt' && typeof content === 'string') {

    // 1. SingStar — uses KEY=VALUE (no #) and NOTE= lines
    if (/\b(TITLE|ARTIST)=/i.test(content) && content.includes('NOTE=')) {
      return 'singstar';
    }

    // 2a. UltraStar — note lines (all types, compact + standard, duet prefixes)
    //     Pattern: [P1|P2:] <noteType> [space?] <beat> <duration> <pitch>
    //     Handles: :0, : 0, *4, F 12, R 0, G 0, P1: : 0, P2: * 4, etc.
    if (/^(?:P[12]:\s*)?[:*FGR]\s*-?\d+\s+\d+\s+-?\d+/m.test(content)) {
      return 'ultrastar';
    }

    // 2b. UltraStar — line-break markers combined with any UltraStar header
    if (/^-\s*-?\d+/m.test(content) &&
        /#(BPM|GAP|MP3|COVER|BACKGROUND|EDITION|GENRE|LANGUAGE|CREATOR|VERSION):/i.test(content)) {
      return 'ultrastar';
    }

    // 2c. UltraStar — end marker E combined with #TITLE / #ARTIST / #BPM / #GAP
    if (/^E\s*$/m.test(content) &&
        /#(TITLE|ARTIST|BPM|GAP):/i.test(content) &&
        !content.includes('#NOTES:')) {
      return 'ultrastar';
    }

    // 2d. UltraStar — header-only (no notes, but multiple UltraStar-specific headers)
    if (/#(TITLE|ARTIST):\s*\S/im.test(content) &&
        /#(BPM|GAP|MP3):\s*\S/im.test(content) &&
        !content.includes('#BPMS:') && !content.includes('#NOTES:')) {
      return 'ultrastar';
    }

    // 3. StepMania — patterns that DON'T overlap with UltraStar
    //    #BPMS: (plural, values like 0=120.000) is StepMania-specific
    //    #NOTES: tag and measure data (4-digit measure number + note rows) are unique
    if (content.includes('#BPMS:') ||
        content.includes('#NOTES:') ||
        /\d{4}[\n\r]*\n[1234]+/m.test(content)) {
      return 'stepmania';
    }

    // 4. Ambiguous #BPM: — disambiguate via companion headers
    //    #BPM: alone could be UltraStar OR StepMania single-BPM
    if (content.includes('#BPM:') && !content.includes('#BPMS:')) {
      // UltraStar typically has #GAP: and/or #MP3: alongside #BPM:
      if (content.includes('#GAP:') || content.includes('#MP3:')) {
        return 'ultrastar';
      }
      // StepMania typically has #STEPS: or #DIFFICULTY:
      if (content.includes('#STEPS:') || content.includes('#DIFFICULTY:')) {
        return 'stepmania';
      }
      // If we have #TITLE: or #ARTIST: but no other distinguishing markers,
      // default to UltraStar (vastly more common in .txt files)
      if (content.includes('#TITLE:') || content.includes('#ARTIST:')) {
        return 'ultrastar';
      }
    }
  }

  return 'unknown';
}

// ─── KaraokeMugen Parser (.json) ─────────────────────────────────────

interface KaraokeMugenSong {
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
  } catch (error) {
    console.debug('[multi-format-import]: failed to parse KaraokeMugen JSON', error);
    return null;
  }
}

// ─── MIDI Karaoke Parser (.kar/.mid) ─────────────────────────────────

interface MIDIKaraokeData {
  tempo: number;
  ticksPerBeat: number;
  tracks: Array<{ name: string; events: Array<{ tick: number; type: string; data: unknown }> }>;
  lyrics: Array<{ startTimeMs: number; text: string }>;
  notes: Array<{ startTimeMs: number; duration: number; pitch: number; velocity: number }>;
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
    const rawNotes: Array<{ tick: number; duration: number; pitch: number; velocity: number }> = [];
    const rawLyrics: Array<{ tick: number; text: string }> = [];
    let tempo = 120;

    const activeNotes = new Map<string, { startTick: number; pitch: number; velocity: number }>();

    // Track tempo changes so we can convert ticks→ms correctly even when
    // the tempo changes mid-song (common in .kar files with ritardando etc.)
    const tempoMap: Array<{ tick: number; microsPerBeat: number }> = [
      { tick: 0, microsPerBeat: 500000 }, // default 120 BPM
    ];

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
          if (runningStatus === 0) break; // malformed data — no valid running status yet
          offset--;
          eventType = runningStatus;
        } else if (eventType >= 0x80 && eventType < 0xf0) {
          runningStatus = eventType;
        }

        if (eventType === 0xff) {
          // Meta event
          const metaType = view.getUint8(offset++);
          // Decode VLQ (Variable-Length Quantity) for meta event length
          let length = 0;
          do {
            byte = view.getUint8(offset++);
            length = (length << 7) | (byte & 0x7f);
          } while (byte & 0x80 && offset < trackEnd);

          if (metaType === 0x01 || metaType === 0x05) {
            // Text / Lyrics meta event
            const textBytes = Array.from({ length }, (_, i) => view.getUint8(offset + i));
            const text = new TextDecoder('latin1').decode(new Uint8Array(textBytes));
            rawLyrics.push({ tick: absoluteTick, text: text.replace(/[\r\n]/g, ' ').trim() });
          } else if (metaType === 0x51) {
            // Tempo
            const microseconds = (view.getUint8(offset) << 16) | (view.getUint8(offset + 1) << 8) | view.getUint8(offset + 2);
            tempo = 60000000 / microseconds;
            tempoMap.push({ tick: absoluteTick, microsPerBeat: microseconds });
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
                rawNotes.push({ tick: activeNote.startTick, duration: absoluteTick - activeNote.startTick, pitch: note, velocity: activeNote.velocity });
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
                  rawNotes.push({ tick: activeNote.startTick, duration: absoluteTick - activeNote.startTick, pitch: note, velocity: activeNote.velocity });
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

    // Convert tick positions to milliseconds using the tempo map.
    // This correctly handles tempo changes that occur mid-song.
    const tempoMapSorted = [...tempoMap].sort((a, b) => a.tick - b.tick);

    function tickToMs(tick: number): number {
      let ms = 0;
      for (let i = 0; i < tempoMapSorted.length; i++) {
        const entry = tempoMapSorted[i];
        const nextTick = i < tempoMapSorted.length - 1 ? tempoMapSorted[i + 1].tick : Infinity;
        const segmentEnd = Math.min(tick, nextTick);
        const segmentTicks = segmentEnd - entry.tick;
        if (segmentTicks > 0) {
          ms += (segmentTicks * entry.microsPerBeat) / (ticksPerBeat * 1000);
        }
        if (tick <= nextTick) break;
      }
      return ms;
    }

    return {
      tempo, ticksPerBeat, tracks,
      lyrics: rawLyrics.map(l => ({ startTimeMs: Math.round(tickToMs(l.tick)), text: l.text })),
      notes: rawNotes.map(n => ({
        startTimeMs: Math.round(tickToMs(n.tick)),
        duration: Math.round(tickToMs(n.tick + n.duration) - tickToMs(n.tick)),
        pitch: n.pitch,
        velocity: n.velocity,
      })),
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to parse MIDI:', error);
    return null;
  }
}

// ─── SingStar Parser ─────────────────────────────────────────────────

interface SingStarSongData {
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
          notes.push({ startTime: parseInt(parts[0]), duration: parseInt(parts[1]), pitch: parseInt(parts[2]), text: parts[3] ?? '' });
        }
      }
    }

    if (!songData.title || !songData.artist) return null;
    return { ...songData, notes } as SingStarSongData;
  } catch (error) {
    console.debug('[multi-format-import]: failed to parse SingStar data', error);
    return null;
  }
}

// ─── StepMania Parser (.sm/.ssc) ─────────────────────────────────────

interface StepManiaData {
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
      if (trimmed.startsWith('#TITLE:')) result.title = trimmed.endsWith(';') ? trimmed.slice(7, -1) : trimmed.slice(7);
      else if (trimmed.startsWith('#ARTIST:')) result.artist = trimmed.endsWith(';') ? trimmed.slice(8, -1) : trimmed.slice(8);
      else if (trimmed.startsWith('#BPMS:')) {
        const bpmStr = trimmed.endsWith(';') ? trimmed.slice(6, -1) : trimmed.slice(6);
        result.bpm = bpmStr.split(',').map(b => {
          const trimmed = b.trim();
          if (!trimmed) return NaN;
          // StepMania format: "beat=bpm" (e.g. "0=120.000").
          // Also handle plain values without '=' (e.g. "120").
          const eqIndex = trimmed.indexOf('=');
          const value = eqIndex >= 0 ? trimmed.substring(eqIndex + 1) : trimmed;
          return parseFloat(value);
        }).filter(v => !isNaN(v) && v > 0 && v < 1000);
        // Fallback: if parsing produced no valid BPMs, keep the default [120]
        if (result.bpm.length === 0) result.bpm = [120];
      }
    }

    if (!result.title || !result.artist) return null;
    return result as StepManiaData;
  } catch (error) {
    console.debug('[multi-format-import]: failed to parse StepMania data', error);
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
      if (!midi.ticksPerBeat || !midi.tempo) {
        throw new Error('MIDI file has invalid ticksPerBeat or tempo — cannot calculate note timings.');
      }

      // Build lyric lines from MIDI lyrics + notes (both already in ms)
      const lyrics: LyricLine[] = [];
      let currentLineNotes: Note[] = [];
      let lineStartTime = 0;
      let lastEndTime = 0;
      const LINE_BREAK_MS = 2000;

      // First pass: build notes with MIDI pitch → frequency
      const midiNotes: Array<{ startTimeMs: number; durationMs: number; pitch: number; frequency: number }> = midi.notes.map(n => ({
        startTimeMs: n.startTimeMs,
        durationMs: n.duration,
        pitch: n.pitch,
        frequency: midiPitchToFrequency(n.pitch),
      }));

      // Match lyrics to notes by time proximity
      let lyricIndex = 0;
      for (const n of midiNotes) {
        // Find closest lyric
        let lyricText = '♪';
        if (lyricIndex < midi.lyrics.length) {
          const lyricTimeMs = midi.lyrics[lyricIndex].startTimeMs;
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

      for (let i = 0; i < ss.notes.length; i++) {
        const note = ss.notes[i];
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

        const nextNote = ss.notes[i + 1];
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

  return words.map((word, i) => {
    // Use a deterministic pitch based on word index (C4 = MIDI 60) instead of
    // Math.random() so the same text always produces the same note layout.
    const pitch = 60 + (i % 12);
    return {
      id: `note-${i}`,
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
