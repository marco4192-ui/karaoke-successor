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

  // ── KaraokeMugen ASS subtitles (.ass/.ssa) — the lyric track Mugen
  //    ships alongside its media files ───────────────────────────────
  if ((ext === 'ass' || ext === 'ssa') && typeof content === 'string' && /\[Events\]/i.test(content)) {
    return 'karaoke-mugen';
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

interface KaraokeMugenSyllable {
  /** Syllable text (karaoke tags stripped). */
  text: string;
  /** Absolute start in ms. */
  start: number;
  /** Duration in ms. */
  duration: number;
}

interface KaraokeMugenSong {
  title: string;
  artist: string;
  lyrics: Array<{ start: number; end: number; text: string; syllables?: KaraokeMugenSyllable[] }>;
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
    // eslint-disable-next-line no-console
    console.debug('[multi-format-import]: failed to parse KaraokeMugen JSON', error);
    return null;
  }
}

// ─── ASS/SSA Subtitle Parser (Karaoke Mugen .ass) ─────────────────────

/**
 * Parse an ASS (Advanced SubStation Alpha) subtitle file — the lyric source
 * Karaoke Mugen ships alongside its media. Extracts:
 *  - Title/artist from [Script Info] (Mugen writes `Title: Artist - Song` —
 *    split on the first ' - ' when present)
 *  - Timed lyric lines from [Events] Dialogue entries
 *  - Per-syllable karaoke timing from {\\k<centiseconds>} tags (\\k, \\K, \\kf,
 *    \\ko). Lines without karaoke tags become one full-line note.
 *
 * ASS carries no pitch — the Mugen conversion generates deterministic
 * pitches around C4 (same policy as the JSON import); refine in the editor.
 */
export function parseAssKaraoke(data: string): KaraokeMugenSong | null {
  try {
    let title = '';
    let artist = '';

    // ── [Script Info] ──
    const scriptInfoMatch = data.match(/\[Script Info\]([\s\S]*?)(?:\r?\n\s*\[|$)/);
    if (scriptInfoMatch) {
      const titleMatch = scriptInfoMatch[1].match(/^\s*Title:\s*(.+)$/m);
      if (titleMatch) {
        const raw = titleMatch[1].trim();
        const dashSplit = raw.split(/\s+-\s+/);
        if (dashSplit.length >= 2) {
          artist = dashSplit[0].trim();
          title = dashSplit.slice(1).join(' - ').trim();
        } else {
          title = raw;
        }
      }
    }

    // ── [Events] ──
    const eventsMatch = data.match(/\[Events\]([\s\S]*?)(?:\r?\n\s*\[|$)/);
    if (!eventsMatch) return null;

    // "H:MM:SS.CC" → ms
    const parseTimestamp = (ts: string): number => {
      const m = ts.trim().match(/^(\d+):(\d{1,2}):(\d{1,2})[.](\d{1,2})$/);
      if (!m) return NaN;
      return (
        parseInt(m[1], 10) * 3600000 +
        parseInt(m[2], 10) * 60000 +
        parseInt(m[3], 10) * 1000 +
        parseInt(m[4].padEnd(2, '0'), 10) * 10
      );
    };

    const lyrics: KaraokeMugenSong['lyrics'] = [];
    for (const line of eventsMatch[1].split(/\r?\n/)) {
      if (!/^\s*Dialogue\s*:/i.test(line)) continue; // Comments/effects skipped

      // Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
      // The Text field may contain commas → split with limit 9, rejoin the rest.
      const parts = line.replace(/^\s*Dialogue\s*:\s*/i, '').split(',', 10);
      if (parts.length < 10) continue;
      const start = parseTimestamp(parts[1]);
      const end = parseTimestamp(parts[2]);
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;

      const rawText = parts.slice(9).join(',');

      // ── Karaoke tags: {\\k20}Ka{\\k15}ra{\\k25}oke … ──
      // Each {\\k<cs>} tag times the text AFTER it until the next tag.
      const syllables: KaraokeMugenSyllable[] = [];
      const karaokeTag = /\{\\[kK](?:f|o)?\s*(\d+(?:[.]\d+)?)\}/g;
      let lastIndex = 0;
      let cursor = start;
      let sawKaraokeTag = false;

      let tagMatch: RegExpExecArray | null;
      while ((tagMatch = karaokeTag.exec(rawText)) !== null) {
        sawKaraokeTag = true;
        // Untimed text BEFORE the tag (rare — leading syllable without {\\k})
        const leading = rawText.slice(lastIndex, tagMatch.index).replace(/\{\\[^}]*\}/g, '');
        if (leading.trim()) {
          syllables.push({ text: leading, start: cursor, duration: 0 }); // duration fixed below
        }
        const durationMs = Math.round(parseFloat(tagMatch[1]) * 10);
        lastIndex = karaokeTag.lastIndex;

        // Sung text: from after the tag to the next override block (or EOL)
        const rest = rawText.slice(lastIndex);
        const nextBlock = rest.indexOf('{');
        const segEnd = nextBlock >= 0 ? lastIndex + nextBlock : rawText.length;
        const sungText = rawText.slice(lastIndex, segEnd);
        if (sungText.trim()) {
          syllables.push({ text: sungText, start: cursor, duration: durationMs });
        }
        cursor += durationMs;
        lastIndex = segEnd;
        karaokeTag.lastIndex = segEnd;
      }

      let text: string;
      let lineSyllables: KaraokeMugenSyllable[] | undefined;
      if (sawKaraokeTag && syllables.length > 0) {
        // Fix zero-duration leading fragments: give each a share of the first
        // timed syllable's duration (min 20 ms) so nothing collapses.
        const unTimed = syllables.filter(s => s.duration === 0);
        const firstTimed = syllables.find(s => s.duration > 0);
        if (unTimed.length > 0 && firstTimed) {
          const share = Math.max(20, Math.floor(firstTimed.duration / (unTimed.length + 1)));
          let cs = start;
          for (const s of unTimed) { s.start = cs; s.duration = share; cs += share; }
        }
        lineSyllables = syllables.filter(s => s.text.trim().length > 0 && s.duration > 0);
        text = lineSyllables.map(s => s.text).join('').replace(/\s+/g, ' ').trim();
      } else {
        // No karaoke tags → one note spanning the whole line
        const clean = rawText.replace(/\{\\[^}]*\}/g, '').replace(/\s+/g, ' ').trim();
        if (!clean) continue;
        text = clean;
        lineSyllables = [{ text: clean, start, duration: end - start }];
      }

      if (!text) continue;
      lyrics.push({ start, end, text, syllables: lineSyllables });
    }

    if (lyrics.length === 0) return null;
    return { title, artist, lyrics };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.debug('[multi-format-import]: failed to parse ASS subtitle file', error);
    return null;
  }
}

// ─── MIDI Karaoke Parser (.kar/.mid) ─────────────────────────────────

/** A single syllable/word event extracted from a MIDI lyrics stream. */
export interface MIDILyricEvent {
  startTimeMs: number;
  text: string;
  /** True when this syllable starts a new lyric line (`/` or `\` marker in .kar files). */
  newLine: boolean;
  /** Karakan `~` — melisma continuation: the note extends the previous
   *  syllable instead of carrying its own text. Rendered as ♪. */
  isExtension?: boolean;
  /** Karakan `.` / `...` — instrumental note without a syllable. Rendered as ♪. */
  isInstrumental?: boolean;
}

/** One MIDI track with timing data and selection metadata for the import UI. */
export interface MIDITrackData {
  index: number;
  name: string;
  /** MIDI channels (0-based) this track sends notes on. Channel 9 = drums (GM convention). */
  channels: number[];
  isDrum: boolean;
  noteCount: number;
  lyricSyllableCount: number;
  /** 0..1 — share of notes with a matching lyric syllable (time proximity). */
  lyricCoverage: number;
  /** Heuristic melody score (R10-4): monophony + singable range + syllable
   *  proximity + lyric coverage — prefers the vocal melody over busy
   *  accompaniment tracks. */
  melodyScore: number;
  /** 0..1 — share of notes that start only after the previous note ended
   *  (melodies are monophonic; arpeggios/chords are not). */
  monoRatio: number;
  notes: Array<{ startTimeMs: number; durationMs: number; pitch: number; velocity: number }>;
  lyrics: MIDILyricEvent[];
}

export interface MIDIKaraokeData {
  /** Initial tempo (first tempo event) in BPM. */
  tempo: number;
  ticksPerBeat: number;
  /** MIDI header format (0 = single track, 1 = multi track, 2 = async). */
  headerFormat: number;
  /** Beats per bar from the FIRST time-signature meta event (default 4).
   *  R10-4: lyric-less imports break lines at bar boundaries — waltzes get
   *  3-beat phrases, 4/4 songs 4-beat phrases. */
  beatsPerBar: number;
  /** Title from `@T` meta text, if the file provides one. */
  title?: string;
  /** Artist from `@T` meta text (second `@T` entry), if present. */
  artist?: string;
  /** True when at least one track carries usable lyric events. */
  hasLyrics: boolean;
  tracks: MIDITrackData[];
  /** Index of the auto-detected melody track (-1 when no track has notes). */
  melodyTrackIndex: number;
}

/** Decode MIDI text bytes: try strict UTF-8 first, fall back to latin1. */
function decodeMidiText(bytes: number[]): string {
  const arr = new Uint8Array(bytes);
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(arr);
  } catch {
    return new TextDecoder('latin1').decode(arr);
  }
}

/** Read a Variable-Length Quantity starting at `offset`. Returns [value, newOffset]. */
function readVLQ(view: DataView, offset: number, limit: number): [number, number] {
  let value = 0;
  let byte = 0;
  let pos = offset;
  do {
    if (pos >= limit) break; // malformed — bail out with what we have
    byte = view.getUint8(pos++);
    value = (value << 7) | (byte & 0x7f);
  } while (byte & 0x80);
  return [value, pos];
}

/**
 * Normalize a .kar syllable: strip `/`+`\` line markers and CR/LF, collapse
 * whitespace runs — but PRESERVE a single leading/trailing space, because the
 * UltraStar/.kar convention encodes word boundaries there ("lo " = word ends,
 * "Sonn-" = hyphenated syllable, " lo" = new word starts).
 */
function cleanKaraokeSyllable(raw: string): { text: string; newLine: boolean; isExtension?: boolean; isInstrumental?: boolean } {
  let text = raw;
  let newLine = false;
  // Leading `/` (new line) or `\` (clear screen / new paragraph) = line boundary
  // in .kar convention.
  if (/^[\\/]/.test(text)) {
    newLine = true;
    text = text.slice(1);
  }
  // CR/LF inside lyric events also mark line/paragraph boundaries.
  if (/\r|\n/.test(text)) {
    newLine = true;
    text = text.replace(/[\r\n]+/g, ' ');
  }

  // Karakan markers (user request R10-4 — MIDI import quality):
  //  • `~` (own event) = melisma continuation — no text, the note is a ♪
  //  • `.` (own event) = instrumental note — no text, the note is a ♪
  //  • `~` embedded in "ng~" and trailing dot-runs "ers..." describe the
  //    FOLLOWING notes (which match no event and become ♪ automatically) —
  //    they only need stripping from the display text.
  //  • `{...}` = backing vocals / second voice — keep the text, drop braces
  //  • `Name: lyric` = singer label prefix (duets) — keep the lyric, drop label
  const bare = text.replace(/\s+/g, ' ').trim();
  if (/^~+$/.test(bare)) {
    return { text: '', newLine, isExtension: true };
  }
  if (/^[.·]+$/.test(bare)) {
    return { text: '', newLine, isInstrumental: true };
  }

  // Embedded markers → strip from the text only.
  text = text.replace(/~/g, '');
  text = text.replace(/(?:\.\.\.|[.·]{2,})/g, '');

  // Backing vocals / second voice: {Oh} → Oh. Braces may span SEPARATE
  // events ("/{You're" … " heart}") — strip every stray brace, they are
  // never literal lyric content.
  text = text.replace(/[{}]/g, '');

  // Singer label prefix (duet files): "Elton John: It's" → "It's".
  // Only when a colon separates a short label (≤ 4 words) from actual lyric
  // content — never strip mid-sentence colons.
  const labelMatch = text.match(/^\s*([A-Z][\w'&.\- ]{0,40}?):\s*(\S.*)$/);
  if (labelMatch) {
    const labelWords = labelMatch[1].trim().split(/\s+/).length;
    if (labelWords <= 4) {
      text = labelMatch[2];
    }
  }

  return { text: text.replace(/\s+/g, ' '), newLine };
}

export function parseMIDIKaraoke(arrayBuffer: ArrayBuffer): MIDIKaraokeData | null {
  try {
    const view = new DataView(arrayBuffer);

    // Verify MIDI header
    if (arrayBuffer.byteLength < 14) return null;
    const header = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
    if (header !== 'MThd') return null;

    const headerFormat = view.getUint16(8, false);
    const numTracks = view.getUint16(10, false);
    const rawTicksPerBeat = view.getUint16(12, false);
    if (numTracks === 0) return null;

    // SMPTE timing (high bit set): linear ticks, tempo events are meaningless.
    // fps is stored as a negative two's-complement byte in the high half.
    let smpteMsPerTick = 0;
    let ticksPerBeat = rawTicksPerBeat;
    if (rawTicksPerBeat & 0x8000) {
      const fps = 256 - (rawTicksPerBeat >> 8);
      const ticksPerFrame = rawTicksPerBeat & 0xff;
      if (fps > 0 && ticksPerFrame > 0) {
        smpteMsPerTick = 1000 / (fps * ticksPerFrame);
        ticksPerBeat = 0; // unused in SMPTE mode
      } else {
        ticksPerBeat = 480; // malformed SMPTE header — assume sane default
      }
    }
    if (!smpteMsPerTick && !ticksPerBeat) ticksPerBeat = 480;

    // Per-track raw data. Notes/lyrics stay separate from text (0x01) events
    // so .kar control entries (@T, @KMIDI …) never pollute the sung lyrics.
    const rawTracks: Array<{
      name?: string;
      notes: Array<{ tick: number; duration: number; pitch: number; velocity: number; channel: number }>;
      lyricEvents: Array<{ tick: number; text: string; newLine: boolean; isExtension?: boolean; isInstrumental?: boolean }>;
      textEvents: Array<{ tick: number; text: string }>;
    }> = [];

    // Track tempo changes so we can convert ticks→ms correctly even when
    // the tempo changes mid-song (common in .kar files with ritardando etc.)
    const tempoMap: Array<{ tick: number; microsPerBeat: number }> = [
      { tick: 0, microsPerBeat: 500000 }, // default 120 BPM
    ];
    let initialTempo: number | null = null;
    /** Beats per bar from the FIRST 0x58 time-signature event (default 4/4). */
    let beatsPerBar = 4;

    const activeNotes = new Map<string, { startTick: number; pitch: number; velocity: number }>();

    let offset = 14;
    for (let t = 0; t < numTracks; t++) {
      // Bounds check before reading track header (4 bytes) + length (4 bytes)
      if (offset + 8 > arrayBuffer.byteLength) break;

      activeNotes.clear(); // Prevent cross-track note leaks on malformed files

      const raw: { notes: { tick: number; duration: number; pitch: number; velocity: number; channel: number }[]; lyricEvents: { tick: number; text: string; newLine: boolean; isExtension?: boolean; isInstrumental?: boolean }[]; textEvents: { tick: number; text: string }[]; name?: string } = { notes: [], lyricEvents: [], textEvents: [] };
      rawTracks.push(raw); // push before parsing so indices stay aligned

      let trackEnd = offset; // default: skip to current position if parsing fails before trackEnd is set
      try {
        const trackHeader = String.fromCharCode(view.getUint8(offset), view.getUint8(offset + 1), view.getUint8(offset + 2), view.getUint8(offset + 3));
        if (trackHeader !== 'MTrk') break;

        const trackLength = view.getUint32(offset + 4, false);
        offset += 8;

        trackEnd = Math.min(offset + trackLength, arrayBuffer.byteLength);
        let absoluteTick = 0;
        let runningStatus = 0;

        while (offset < trackEnd) {
          // Variable-length delta time
          const [delta, afterDelta] = readVLQ(view, offset, trackEnd);
          offset = afterDelta;
          absoluteTick += delta;

          let eventType = view.getUint8(offset++);
          // Running Status handling
          if (eventType < 0x80) {
            if (runningStatus === 0) break; // malformed data — no valid running status yet
            offset--;
            eventType = runningStatus;
          } else if (eventType < 0xf0) {
            runningStatus = eventType;
          }

          if (eventType === 0xff) {
            // Meta event
            const metaType = view.getUint8(offset++);
            const [length, afterLen] = readVLQ(view, offset, trackEnd);
            offset = afterLen;
            const safeLength = Math.max(0, Math.min(length, arrayBuffer.byteLength - offset));

            if (metaType === 0x01) {
              // Text meta — @T title/artist info in .kar, and (Karakan exports)
              // the sung syllables themselves when no 0x05 events exist.
              // R10-4: PRESERVE leading/trailing single spaces — the .kar word
              // boundary convention encodes them (" a" = new word). The old
              // .trim() here destroyed word spacing for text-event lyrics.
              const text = decodeMidiText(Array.from({ length: safeLength }, (_, i) => view.getUint8(offset + i))).replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ');
              if (text) raw.textEvents.push({ tick: absoluteTick, text });
            } else if (metaType === 0x05) {
              // Lyrics meta — the actual syllables
              const text = decodeMidiText(Array.from({ length: safeLength }, (_, i) => view.getUint8(offset + i)));
              const { text: cleaned, newLine, isExtension, isInstrumental } = cleanKaraokeSyllable(text);
              if (cleaned.trim()) {
                raw.lyricEvents.push({ tick: absoluteTick, text: cleaned, newLine, isExtension, isInstrumental });
              } else if (isExtension || isInstrumental) {
                // Melisma/instrumental events carry no text but MUST be kept:
                // they consume their note in the two-pointer matching so the
                // next real syllable isn't stolen (R10-4).
                raw.lyricEvents.push({ tick: absoluteTick, text: '', newLine, isExtension, isInstrumental });
              } else if (cleaned === ' ' && raw.lyricEvents.length > 0) {
                // Whitespace-only event = word-end marker → attach the trailing
                // space to the previous syllable instead of dropping it.
                const prev = raw.lyricEvents[raw.lyricEvents.length - 1];
                if (!/\s$/.test(prev.text)) prev.text += ' ';
              }
            } else if (metaType === 0x51) {
              // Tempo
              if (offset + 3 <= arrayBuffer.byteLength) {
                const microseconds = (view.getUint8(offset) << 16) | (view.getUint8(offset + 1) << 8) | view.getUint8(offset + 2);
                if (initialTempo === null) initialTempo = 60000000 / microseconds;
                tempoMap.push({ tick: absoluteTick, microsPerBeat: microseconds });
              }
            } else if (metaType === 0x58) {
              // Time signature: numerator / denominator(2^-n) / 24 / 8 —
              // only the numerator (beats per bar) is needed (R10-4).
              if (safeLength >= 2 && beatsPerBar === 4) {
                const numerator = view.getUint8(offset);
                if (numerator >= 1 && numerator <= 12) beatsPerBar = numerator;
              }
            } else if (metaType === 0x03) {
              // Track name
              const name = decodeMidiText(Array.from({ length: safeLength }, (_, i) => view.getUint8(offset + i))).replace(/[\r\n]+/g, ' ').trim();
              if (name) raw.name = name;
            }

            offset += safeLength;
          } else if (eventType === 0xf0 || eventType === 0xf7) {
            // SysEx — length-prefixed in SMF, skip payload
            const [length, afterLen] = readVLQ(view, offset, trackEnd);
            offset = Math.min(afterLen + length, trackEnd);
          } else {
            // Channel message
            const channel = eventType & 0x0f;
            const status = eventType & 0xf0;

            switch (status) {
              case 0x80: { // Note Off
                const note = view.getUint8(offset++);
                if (offset < trackEnd) offset++; // velocity
                const noteKey = `${channel}-${note}`;
                const activeNote = activeNotes.get(noteKey);
                if (activeNote) {
                  raw.notes.push({ tick: activeNote.startTick, duration: absoluteTick - activeNote.startTick, pitch: note, velocity: activeNote.velocity, channel });
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
                    raw.notes.push({ tick: activeNote.startTick, duration: absoluteTick - activeNote.startTick, pitch: note, velocity: activeNote.velocity, channel });
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

        // Resync: if malformed data pushed the cursor past the track boundary,
        // snap it back so the NEXT MTrk header is read from the right position.
        if (offset !== trackEnd) offset = trackEnd;
      } catch {
        // Malformed track data — skip this track and continue with next
        offset = trackEnd;
      }
    }

    // Convert tick positions to milliseconds using the tempo map.
    // This correctly handles tempo changes that occur mid-song.
    const tempoMapSorted = [...tempoMap].sort((a, b) => a.tick - b.tick);

    function tickToMs(tick: number): number {
      if (smpteMsPerTick > 0) return tick * smpteMsPerTick;
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

    // ── Title/artist from `@T` text meta events (Karaoke MIDI convention) ──
    // First `@T` = title, second = artist; skip copyright-ish entries.
    // R10-4: the space after @T is OPTIONAL (Karakan writes "@TElton …").
    const titleEntries: string[] = [];
    for (const raw of rawTracks) {
      for (const ev of raw.textEvents) {
        const match = ev.text.match(/^@T\s*(.+)$/i);
        if (match && match[1].trim()) titleEntries.push(match[1].trim());
      }
    }
    const infoEntries = titleEntries.filter(txt => !/^(?:\(c\)|\[c\]|©|copyright)/i.test(txt));
    let title = infoEntries[0] || undefined;
    let artist = infoEntries[1] || undefined;
    // R10-4: the FIRST @T often carries `Artist - Title` while the second is a
    // credits line ("Words & Music by …"). Split on ' - ' when that pattern
    // matches, so title/artist come out right for Karakan exports.
    if (title && title.includes(' - ') && (!artist || /^(?:words|music|lyrics|sequence|kar|chart|from)\b/i.test(artist))) {
      const dashSplit = title.split(' - ');
      const possibleArtist = dashSplit[0].trim();
      const possibleTitle = dashSplit.slice(1).join(' - ').trim();
      if (possibleArtist && possibleTitle && possibleArtist.split(/\s+/).length <= 6) {
        artist = possibleArtist;
        title = possibleTitle;
      }
    }

    // ── Per-track conversion + melody heuristics ──
    // Syllable/note match tolerance: .kar lyric events sit at (or a few ticks
    // before) the note they belong to, so a generous window works well.
    const LYRIC_TOLERANCE_MS = 600;

    const tracks: MIDITrackData[] = rawTracks.map((raw, idx) => {
      const notes = raw.notes
        .map(n => ({
          startTimeMs: Math.round(tickToMs(n.tick)),
          durationMs: Math.max(0, Math.round(tickToMs(n.tick + n.duration) - tickToMs(n.tick))),
          pitch: n.pitch,
          velocity: n.velocity,
        }))
        .sort((a, b) => a.startTimeMs - b.startTimeMs || a.pitch - b.pitch);

      // Lyrics: prefer real 0x05 events. Fallback for odd files that store
      // lyrics in 0x01 text events: use them only when they aren't `@` control
      // entries and roughly match the note count.
      let lyricSource: Array<{ tick: number; text: string; newLine: boolean; isExtension?: boolean; isInstrumental?: boolean }> = raw.lyricEvents;
      if (lyricSource.length === 0) {
        const candidates = raw.textEvents.filter(ev => !ev.text.startsWith('@'));
        if (candidates.length > 0 && candidates.length >= Math.max(1, Math.floor(raw.notes.length * 0.5))) {
          lyricSource = candidates.map(ev => {
            const { text, newLine, isExtension, isInstrumental } = cleanKaraokeSyllable(ev.text);
            return { tick: ev.tick, text, newLine, isExtension, isInstrumental };
          }).filter(ev => ev.text.trim() || ev.isExtension || ev.isInstrumental);
        }
      }
      const lyrics: MIDILyricEvent[] = lyricSource
        .map(l => ({ startTimeMs: Math.round(tickToMs(l.tick)), text: l.text, newLine: l.newLine, isExtension: l.isExtension, isInstrumental: l.isInstrumental }))
        .sort((a, b) => a.startTimeMs - b.startTimeMs);

      // Channels + drum detection (GM: channel 10 / index 9 = drums).
      const channels = [...new Set(raw.notes.map(n => n.channel))].sort((a, b) => a - b);
      const drumByName = /\b(drum|percuss|schlagz|bassdrum|snare)\b/i.test(raw.name || '');
      const isDrum = drumByName || (channels.length > 0 && channels.every(c => c === 9));

      // Lyric coverage: two-pointer proximity match (same algorithm as conversion).
      let li = 0;
      let matched = 0;
      for (const n of notes) {
        while (li < lyrics.length && lyrics[li].startTimeMs < n.startTimeMs - LYRIC_TOLERANCE_MS) li++;
        if (li < lyrics.length && Math.abs(lyrics[li].startTimeMs - n.startTimeMs) <= LYRIC_TOLERANCE_MS) {
          matched++;
          li++;
        }
      }
      const lyricCoverage = notes.length > 0 ? matched / notes.length : 0;

      // ── Melody heuristics (R10-4 — MIDI import quality) ──
      // The old score (lyric coverage + raw note count) picked busy
      // accompaniment tracks (e.g. 888-note piano lines) over the actual
      // vocal melody, which made text and notes misalign ("passen nicht
      // überein") and produced chaotic overlapping lines. Vocal melodies are:
      //  • MONOPHONIC — a note only starts after the previous one ended
      //    (accompaniment arpeggios/chords score low here)  → strongest signal
      //  • SINGABLE — pitches inside MIDI 53–84 (F3–C6); bass lines are not
      //  • COMFORTABLE — the core singing range G3–F5 (55–77)
      //  • SYLLABLE-CLOSE — when the file has lyrics, the melody track's note
      //    count roughly matches the syllable count (383 notes vs 360
      //    syllables beats 888 vs 360)
      let monoCount = 0;
      let lastEndTick = -1;
      for (const n of raw.notes) {
        const endTick = n.tick + n.duration;
        if (n.tick >= lastEndTick) monoCount++;
        if (endTick > lastEndTick) lastEndTick = endTick;
      }
      const monoRatio = raw.notes.length > 0 ? monoCount / raw.notes.length : 0;
      const singableRatio = raw.notes.length > 0
        ? raw.notes.filter(n => n.pitch >= 53 && n.pitch <= 84).length / raw.notes.length
        : 0;
      const comfortRatio = raw.notes.length > 0
        ? raw.notes.filter(n => n.pitch >= 55 && n.pitch <= 77).length / raw.notes.length
        : 0;
      // Track names often name the melody explicitly.
      const nameBonus = /\b(melody|lead|vocal|voice|gesang|sing)\b/i.test(raw.name || '') ? 30 : 0;

      const melodyScore = isDrum
        ? -1
        : lyricCoverage * 100 +                    // own aligned lyrics (classic .kar)
          monoRatio * 40 +                          // monophonic = melody-shaped
          singableRatio * 25 +                      // inside the singable range
          comfortRatio * 10 +                       // core singing range bonus
          nameBonus +
          Math.min(notes.length, 500) / 25;         // minor size factor
      // Syllable proximity is added AFTER the map (needs the global syllable
      // count across all tracks — see below).

      return {
        index: idx,
        name: raw.name || `Track ${idx + 1}`,
        channels,
        isDrum,
        noteCount: notes.length,
        lyricSyllableCount: lyrics.length,
        lyricCoverage,
        melodyScore,
        monoRatio,
        notes,
        lyrics,
      };
    });

    // ── Syllable proximity bonus (R10-4) ──
    // When the file carries lyrics anywhere, the melody track's note count
    // should be close to the total syllable count. Added post-map because the
    // best syllable source may be a different track (e.g. a separate "Words"
    // track in Karakan exports).
    const globalSyllables = Math.max(0, ...tracks.map(tr => tr.lyrics.length));
    if (globalSyllables > 0) {
      for (const tr of tracks) {
        if (tr.isDrum || tr.noteCount === 0) continue;
        const deviation = Math.abs(tr.noteCount - globalSyllables) / globalSyllables;
        tr.melodyScore += Math.max(0, 25 * (1 - deviation));
      }
    }

    // Auto-detected melody track: best-scoring non-drum track with notes;
    // fall back to the track with the most notes when everything is drum-only-ish.
    const usable = tracks.filter(tr => !tr.isDrum && tr.noteCount > 0);
    let melodyTrackIndex = -1;
    if (usable.length > 0) {
      melodyTrackIndex = usable.reduce((best, tr) => (tr.melodyScore > best.melodyScore ? tr : best)).index;
    } else {
      const withNotes = tracks.filter(tr => tr.noteCount > 0);
      if (withNotes.length > 0) {
        melodyTrackIndex = withNotes.reduce((best, tr) => (tr.noteCount > best.noteCount ? tr : best)).index;
      }
    }

    return {
      tempo: initialTempo ?? 120,
      ticksPerBeat: ticksPerBeat || 480,
      headerFormat,
      beatsPerBar,
      title,
      artist,
      hasLyrics: tracks.some(tr => tr.lyrics.length > 0),
      tracks,
      melodyTrackIndex,
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
    // eslint-disable-next-line no-console
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
    // eslint-disable-next-line no-console
    console.debug('[multi-format-import]: failed to parse StepMania data', error);
    return null;
  }
}

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
      return { title: km.title, artist: km.artist, lyrics, audioUrl: km.audioFile || audioUrl, videoBackground: km.videoFile || videoUrl };
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
