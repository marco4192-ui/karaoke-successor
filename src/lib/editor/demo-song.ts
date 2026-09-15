/**
 * Demo sample song (sandbox testing — user request "Muster-Song").
 *
 * Creates ONE small, fully self-contained song so the editor's optics and
 * function can be tested without importing anything:
 *
 *  - 24 notes across 3 lyric lines (C-major run up / down / arpeggio)
 *  - 2 golden notes + 1 rap note (editor note-type testing)
 *  - a synthesized WAV whose tones match the note pitches EXACTLY — press
 *    play in the editor and you hear the melody you see
 *  - genre/language/year intentionally EMPTY → perfect test subject for the
 *    Metadata Studio (fill missing / harmonize / rule modes)
 *
 * The audio blob is persisted in IndexedDB (media-db) and flagged
 * `storedMedia` so the browser blob-URL restore brings it back after reload.
 */

import { Song, LyricLine, Note } from '@/types/game';
import { addSong, getAllSongs } from '@/lib/game/song-library';
import { storeMedia } from '@/lib/db/media-db';
import { generateUltraStarTxt } from '@/lib/parsers/ultrastar-parser';

const SAMPLE_RATE = 22050;

/** MIDI note number → frequency in Hz. */
function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function writeAscii(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i++) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}

/** One tone in the generated audio. */
interface Tone {
  freq: number;
  startTime: number; // ms from song start
  duration: number;  // ms
}

/**
 * Synthesize a WAV blob: each tone is a sine with 2nd/3rd harmonics and a
 * soft attack/release envelope so consecutive notes stay distinguishable.
 */
function generateWavBlob(tones: Tone[], totalDurationMs: number): Blob {
  const totalSamples = Math.ceil((totalDurationMs / 1000) * SAMPLE_RATE);
  const data = new Float32Array(totalSamples);

  for (const tone of tones) {
    const startSample = Math.floor((tone.startTime / 1000) * SAMPLE_RATE);
    const endSample = Math.min(totalSamples, Math.floor(((tone.startTime + tone.duration) / 1000) * SAMPLE_RATE));
    const noteLen = endSample - startSample;
    if (noteLen <= 0) continue;

    const attackSamples = Math.floor(0.02 * SAMPLE_RATE);
    const releaseSamples = Math.floor(0.09 * SAMPLE_RATE);

    for (let i = 0; i < noteLen; i++) {
      const t = i / SAMPLE_RATE;
      const w = i < attackSamples
        ? i / attackSamples
        : i > noteLen - releaseSamples
          ? Math.max(0, (noteLen - i) / releaseSamples)
          : 1;
      const env = w * w;
      const sample = (
        Math.sin(2 * Math.PI * tone.freq * t) * 0.55 +
        Math.sin(2 * Math.PI * tone.freq * 2 * t) * 0.18 +
        Math.sin(2 * Math.PI * tone.freq * 3 * t) * 0.07
      ) * env * 0.32;
      data[startSample + i] += sample;
    }
  }

  // ── RIFF/WAVE header + 16-bit PCM payload ──
  const buffer = new ArrayBuffer(44 + totalSamples * 2);
  const view = new DataView(buffer);
  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + totalSamples * 2, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);       // fmt chunk size
  view.setUint16(20, 1, true);        // PCM
  view.setUint16(22, 1, true);        // mono
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true); // byte rate
  view.setUint16(32, 2, true);        // block align
  view.setUint16(34, 16, true);       // bits per sample
  writeAscii(view, 36, 'data');
  view.setUint32(40, totalSamples * 2, true);

  let offset = 44;
  for (let i = 0; i < totalSamples; i++) {
    const s = Math.max(-1, Math.min(1, data[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

// ── Melody definition ─────────────────────────────────────────────────────

const BEAT = 600;        // ms per beat (BPM 100)
const NOTE_LEN = 540;    // note length with a small gap between notes

/** [pitch(MIDI), isGolden, isRap] — 8 syllables per line. */
type Syllable = [number, boolean?, boolean?];

const LINE_1: Array<[Syllable, string]> = [
  [[60], 'Sing'], [[62], 'ing'], [[64], 'a'], [[66], 'sim'],
  [[67], 'ple'], [[69], 'mel'], [[71], 'o'], [[72, true], 'dy'],
];
const LINE_2: Array<[Syllable, string]> = [
  [[72], 'San'], [[71], 'dbox'], [[69], 'se'], [[67], 're'],
  [[66], 'nade'], [[64], 'for'], [[62], 'me'], [[60], 'today'],
];
const LINE_3: Array<[Syllable, string]> = [
  [[60], 'oh'], [[64], 'what'], [[67], 'a'], [[72], 'tune'],
  [[71], 'the'], [[69], 'e'], [[67], 'di'], [[62, false, true], 'tor'],
];

const LINES: Array<{ syllables: typeof LINE_1; startMs: number; text: string }> = [
  { syllables: LINE_1, startMs: 1000, text: 'Singing a simple melody' },
  { syllables: LINE_2, startMs: 7000, text: 'Sandbox serenade for me today' },
  { syllables: LINE_3, startMs: 13000, text: 'Oh what a tune — the editor' },
];

const TOTAL_DURATION_MS = 20000;

function buildLyrics(): { lyrics: LyricLine[]; tones: Tone[] } {
  const lyrics: LyricLine[] = [];
  const tones: Tone[] = [];
  let noteCounter = 0;

  for (const line of LINES) {
    const notes: Note[] = [];
    line.syllables.forEach(([syllable, text], i) => {
      const [pitch, isGolden, isRap] = syllable;
      const startTime = line.startMs + i * BEAT;
      const freq = midiToFreq(pitch);
      tones.push({ freq, startTime, duration: NOTE_LEN });
      notes.push({
        id: `demo-n${noteCounter++}`,
        pitch,
        frequency: freq,
        startTime,
        duration: NOTE_LEN,
        lyric: text,
        isBonus: false,
        isGolden: !!isGolden,
        isRap: !!isRap,
      });
    });
    lyrics.push({
      id: `demo-l${lyrics.length}`,
      text: line.text,
      startTime: line.startMs,
      endTime: line.startMs + line.syllables.length * BEAT,
      notes,
    });
  }

  return { lyrics, tones };
}

/**
 * Create (and persist) the demo song. Returns the Song with a live audioUrl.
 * Calling it again creates a numbered copy ("Sandbox Serenade 2", …) — the
 * library's duplicate check (title+artist) would silently drop same-named
 * songs, and several test songs are useful for batch/studio testing anyway.
 */
export async function createDemoSong(): Promise<Song> {
  const { lyrics, tones } = buildLyrics();

  // Unique title per copy (duplicate check matches title+artist)
  const existing = getAllSongs().filter(s => s.title.startsWith('Sandbox Serenade'));
  const copyNumber = existing.length + 1;
  const title = copyNumber > 1 ? `Sandbox Serenade ${copyNumber}` : 'Sandbox Serenade';

  const song: Song = {
    id: `demo-sandbox-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    artist: 'Karaoke ZERO Demo',
    genre: undefined,     // intentionally empty → Metadata Studio test subject
    language: undefined,  // intentionally empty
    year: undefined,      // intentionally empty
    duration: TOTAL_DURATION_MS,
    bpm: 100,
    difficulty: 'easy',
    rating: 3,
    gap: 0,
    lyrics,
    mp3File: 'demo-sandbox.wav',
    // Test flags for the editor (missing metadata badges etc.)
    dateAdded: Date.now(),
    storedMedia: false,   // set to true after the audio blob is stored below
  };

  // 1. Synthesize + persist the audio so it survives reloads
  //    (getAllSongsAsync restores blob URLs for storedMedia songs)
  const wav = generateWavBlob(tones, TOTAL_DURATION_MS);
  try {
    await storeMedia(song.id, 'audio', wav);
    song.storedMedia = true;
  } catch {
    // Audio still plays in this session via the blob URL below.
  }

  // 2. Persist the UltraStar txt (notes/lyrics) — saveCustomSongs strips
  //    lyrics from the library record; the txt in IndexedDB is the durable
  //    copy that loadSongLyrics reads back after a reload.
  try {
    const txt = generateUltraStarTxt(song);
    if (txt) {
      await storeMedia(song.id, 'txt', new Blob([txt], { type: 'text/plain' }));
      song.storedTxt = true;
    }
  } catch {
    // Notes stay available in this session via the in-memory song object.
  }

  song.audioUrl = URL.createObjectURL(wav);

  await addSong(song);
  return song;
}
