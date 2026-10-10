/**
 * Multi-Format Import — KaraokeMugen Parser (.json + .ass/.ssa)
 *
 * Two flavours of the Karaoke Mugen ecosystem:
 *  - parseKaraokeMugen: flat/`header`-based .km.json lyric files
 *  - parseAssKaraoke: ASS/SSA subtitle files (the lyric track Mugen ships
 *    alongside its media), including per-syllable {\k} karaoke timing
 *
 * Extracted from multi-format-import.ts (R11) — byte-identical blocks,
 * orchestrator re-exports keep the public import path stable.
 */
// ─── KaraokeMugen Parser (.json) ─────────────────────────────────────

interface KaraokeMugenSyllable {
  /** Syllable text (karaoke tags stripped). */
  text: string;
  /** Absolute start in ms. */
  start: number;
  /** Duration in ms. */
  duration: number;
}

export interface KaraokeMugenSong {
  title: string;
  artist: string;
  lyrics: Array<{ start: number; end: number; text: string; syllables?: KaraokeMugenSyllable[] }>;
  audioFile?: string;
  videoFile?: string;
}

export function parseKaraokeMugen(data: string): KaraokeMugenSong | null {
  try {
    // R14: strip a UTF-8 BOM — Mugen exports sometimes carry one and
    // JSON.parse() chokes on it ("no text" symptom).
    const parsed = JSON.parse(data.replace(/^\uFEFF/, ''));

    // R14: support the REAL Karaoke Mugen .km.json layout (header.title +
    // header.singers) in addition to the flat {title, artist, lyrics} shape.
    const header = parsed.header ?? {};
    const title: string | undefined = parsed.title ?? header.title;
    const singers: unknown = parsed.artist ?? header.artist ?? header.singers;
    const artist: string | undefined = Array.isArray(singers)
      ? singers.filter(Boolean).join(', ') || undefined
      : (typeof singers === 'string' ? singers : undefined);
    const rawLyrics: unknown = parsed.lyrics;

    if (!title || !Array.isArray(rawLyrics)) return null;

    // Lyric entries: {start, end, text} — defensively also accept
    // from/to and content/line aliases.
    const lyrics = (rawLyrics as Array<Record<string, unknown>>).map(l => {
      const start = Number(l.start ?? l.from ?? 0);
      const end = Number(l.end ?? l.to ?? 0);
      const text = String(l.text ?? l.content ?? l.line ?? '');
      return { start, end, text };
    }).filter(l => Number.isFinite(l.start) && Number.isFinite(l.end) && l.end > l.start && l.text.trim());

    return {
      title,
      artist: artist || 'Unknown',
      lyrics,
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

    // R14: strip a UTF-8 BOM so [Script Info] matching can't fail on it.
    const content = data.replace(/^\uFEFF/, '');

    // ── [Script Info] ──
    const scriptInfoMatch = content.match(/\[Script Info\]([\s\S]*?)(?:\r?\n\s*\[|$)/);
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
    const eventsMatch = content.match(/\[Events\]([\s\S]*?)(?:\r?\n\s*\[|$)/);
    if (!eventsMatch) return null;

    // "H:MM:SS.CC" → ms (R14: also accept 3-digit centisecond fractions —
    // some encoders write 0:00:01.001)
    const parseTimestamp = (ts: string): number => {
      const m = ts.trim().match(/^(\d+):(\d{1,2}):(\d{1,2})[.](\d{1,3})$/);
      if (!m) return NaN;
      const csDigits = m[4].length;
      const fraction = parseInt(m[4], 10) * (csDigits === 3 ? 1 : 10);
      return (
        parseInt(m[1], 10) * 3600000 +
        parseInt(m[2], 10) * 60000 +
        parseInt(m[3], 10) * 1000 +
        fraction
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

      const rawText = parts.slice(9).join(',')
        // R14: vector drawing blocks ({\p1}…{\p0}) are effects, not lyrics —
        // drop them including their payload, otherwise the coordinate soup
        // ends up in the lyric text.
        .replace(/\{\\p[\d.]+\}[\s\S]*?\{\\p0\}/g, '')
        // R14: ASS hard/soft line breaks inside a Dialogue — render as spaces
        // (they used to leak into the lyric text as literal "\\N").
        .replace(/\\[Nn]/g, ' ');

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
        lineSyllables = syllables
          .filter(s => s.text.trim().length > 0 && s.duration > 0)
          .map(s => ({ ...s, text: s.text.replace(/\\[Nn]/g, ' ') }));
        text = lineSyllables.map(s => s.text).join('').replace(/\s+/g, ' ').trim();
      } else {
        // No karaoke tags → one note spanning the whole line
        const clean = rawText.replace(/\{\\[^}]*\}/g, '').replace(/\\[Nn]/g, ' ').replace(/\s+/g, ' ').trim();
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
