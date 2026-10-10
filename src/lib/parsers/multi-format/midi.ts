/**
 * Multi-Format Import — MIDI Karaoke Parser (.kar/.mid)
 *
 * Raw SMF/MIDI reader: header/tracks/events, tempo map (ticks→ms),
 * .kar syllable normalization (Karakan markers) and per-track melody
 * heuristics for the import UI track picker.
 *
 * Extracted from multi-format-import.ts (R11) — byte-identical blocks,
 * orchestrator re-exports keep the public import path stable.
 */
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
