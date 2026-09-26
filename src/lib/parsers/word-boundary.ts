// UltraStar word-boundary handling — the SINGLE source of truth for
// note-line matching and word-boundary normalization.
//
// There are TWO spacing conventions in the wild for separating words in
// UltraStar TXT files (syllables of the SAME word are always written
// connected, without a space):
//
//   Variant 1 (UltraStar classic, our export format):
//     The syllable that ENDS a word carries a TRAILING space.
//       : 0 4 60 Hel
//       : 4 4 60 lo␣        ← "lo " ends the word → "Hello "
//       : 8 4 60 World
//
//   Variant 2 (also in the wild, requested support):
//     The syllable that STARTS a new word carries a LEADING space. The
//     whitespace run between the pitch number and the lyric is then
//     1 field separator + 1 boundary space.
//       : 0 4 60 Hel
//       : 4 4 60 lo
//       : 8 4 60␣␣World     ← extra space before "World" → new word
//
//     A SINGLE space (": 8 4 60 World") is just the field separator —
//     NEVER a word boundary. The boundary space must exist TWICE in the
//     file (separator + marker); with only one space the line is
//     indistinguishable from a word-continuation syllable, so the word
//     boundaries could not be recovered.
//
// Both render identically ("Hello World"). normalizeUltraStarWordBoundaries()
// converts variant 2 into the internal variant-1 form so all downstream
// code (lyric-line assembly, editor word-end detection, TXT export) sees
// ONE consistent convention.
//
// Detection safety: variant 2 is only applied when it is the DOMINANT
// convention of the file (more leading-boundary notes than trailing-space
// notes). Pure variant-1 files and mixed files keep the classic behavior;
// wide whitespace runs (3+ chars, column-aligned files) and tab
// separators are never read as boundaries — they are stripped as
// separator artifacts.

/**
 * A parsed UltraStar note line.
 *
 * `lyric` is the text with the single field-separator whitespace removed.
 * A variant-2 boundary (exactly ONE leading plain space) stays attached
 * — it is NOT yet usable for display. Callers MUST pass their collected
 * notes through normalizeUltraStarWordBoundaries() before building lyric
 * lines.
 */
export interface UltraStarNoteLineMatch {
  type: ':' | '*' | 'F' | 'R' | 'G';
  startBeat: number;
  duration: number;
  pitch: number;
  lyric: string;
}

// Tolerates leading whitespace on the line. The whitespace run between
// the pitch number and the lyric is captured as its own group; the FIRST
// character of that run is the field separator (dropped), the rest is a
// possible variant-2 boundary (kept on the lyric for
// normalizeUltraStarWordBoundaries to interpret). The old `\s*(.*)`
// capture silently swallowed these boundary spaces, gluing all words
// together.
const NOTE_LINE_REGEX = /^\s*([:*FGR])\s*(-?\d+)\s+(\d+)\s+(-?\d+)([ \t]*)(.*)$/;

/**
 * Match one UltraStar note line (": 0 4 60 Hel", "* 8 2 72 lo", with or
 * without leading whitespace). Returns null for non-note lines.
 *
 * IMPORTANT: the returned `lyric` may start with a single space — the
 * variant-2 word-boundary marker. Always finish with
 * normalizeUltraStarWordBoundaries() before using the lyrics.
 */
export function matchUltraStarNoteLine(line: string): UltraStarNoteLineMatch | null {
  const m = NOTE_LINE_REGEX.exec(line);
  if (!m) return null;
  return {
    type: m[1] as UltraStarNoteLineMatch['type'],
    startBeat: parseInt(m[2], 10),
    duration: parseInt(m[3], 10),
    pitch: parseInt(m[4], 10),
    // 1st whitespace char = field separator (dropped); the rest is a
    // possible variant-2 boundary space (kept, resolved by normalize).
    lyric: (m[5].length > 0 ? m[5].slice(1) : '') + m[6],
  };
}

/** Minimal note shape needed for word-boundary normalization. */
interface WordBoundaryNote {
  lyric: string;
  player?: string;
  startBeat: number;
  duration: number;
}

/**
 * Exactly ONE leading plain space = a variant-2 word boundary
 * ("␣World" after the separator was dropped). Two or more leading
 * spaces (column-aligned files) and tabs are separator artifacts.
 */
function leadingRun(lyric: string): string | null {
  const m = /^[ \t]+/.exec(lyric);
  return m ? m[0] : null;
}

function isBoundaryLead(lyric: string): boolean {
  return lyric.startsWith(' ') && !lyric.startsWith('  ');
}

/**
 * Check if any explicit line-break marker ("- <beat>") falls between the
 * end of the previous note and the start of the next one — same rule as
 * the lyric-line converter (a boundary at a line start is meaningless).
 */
function hasBreakBetween(
  prevEndBeat: number,
  nextNoteStart: number,
  lineBreakBeats: Set<number> | undefined,
): boolean {
  if (!lineBreakBeats) return false;
  for (const breakBeat of lineBreakBeats) {
    if (breakBeat >= prevEndBeat && breakBeat <= nextNoteStart) return true;
  }
  return false;
}

/**
 * Normalize word boundaries in freshly parsed UltraStar notes (in place).
 *
 * - Variant-2 files (leading-space convention dominant) are converted to
 *   the internal variant-1 form: the boundary space is moved onto the
 *   previous note of the SAME voice (duet interleaving safe) as a
 *   trailing space. Boundaries at a line start (after a "- <beat>"
 *   marker) or at the first note of a voice carry no meaning and are
 *   dropped.
 * - Variant-1 / mixed / boundary-less files: leading whitespace is
 *   stripped as a separator artifact (identical to the previous behavior
 *   of the old `\s*(.*)` capture).
 *
 * Trailing spaces (variant 1) are never touched.
 */
export function normalizeUltraStarWordBoundaries<T extends WordBoundaryNote>(
  notes: T[],
  lineBreakBeats?: Set<number>,
): T[] {
  // ── Pass 1: which convention does this file use? ──────────────────
  let variant1Count = 0; // trailing spaces ("lo ")
  let variant2Count = 0; // leading boundary spaces ("␣World")
  for (const n of notes) {
    if (/[ \t]+$/.test(n.lyric)) {
      variant1Count++;
    } else if (isBoundaryLead(n.lyric)) {
      variant2Count++;
    }
  }
  const useVariant2 = variant2Count > 0 && variant2Count > variant1Count;

  if (!useVariant2) {
    // Classic convention (or no boundaries at all): drop leading
    // whitespace — the previous behavior.
    for (const n of notes) {
      n.lyric = n.lyric.replace(/^[ \t]+/, '');
    }
    return notes;
  }

  // ── Pass 2 (variant 2): move boundaries onto the previous same-voice note ──
  const lastByVoice = new Map<string, T>();
  for (const n of notes) {
    const voice = n.player ?? '';
    const run = leadingRun(n.lyric);
    if (run) {
      n.lyric = n.lyric.slice(run.length);
      if (run === ' ') {
        // Exactly ONE space = variant-2 boundary → move it onto the
        // previous note of the same voice (2+ spaces = alignment
        // artifact → already stripped above, never a boundary).
        const prev = lastByVoice.get(voice);
        const acrossLineBreak = prev
          ? hasBreakBetween(prev.startBeat + prev.duration, n.startBeat, lineBreakBeats)
          : false;
        if (prev && !acrossLineBreak && !/[ \t]$/.test(prev.lyric)) {
          prev.lyric += ' ';
        }
        // No previous note of this voice, or the boundary sits at a line
        // start → meaningless → dropped.
      }
    }
    lastByVoice.set(voice, n);
  }
  return notes;
}
