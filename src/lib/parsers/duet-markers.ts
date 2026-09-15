// Duet marker parsing — SHARED by ALL UltraStar TXT parsers.
//
// There used to be four subtly different implementations of P1/P2 detection
// (ultrastar-parser, ultrastar-metadata, song-lyrics-loader, file-storage-scanner)
// which disagreed on edge cases and caused the "editor doesn't recognize duet
// songs" bug. This module is the single source of truth now.
//
// Accepted standalone marker forms (section switches):
//   P1   P1:   P 1   P1 :   — plus any leading/trailing whitespace
//   P2   P2:   P 2   P2 :
//   P4   P4:   P 4   P4 :   (player 3 — trio/quartet bitmask tag)
//   P8   P8:   P 8   P8 :   (player 4 — quartet bitmask tag)
//
// Accepted note-line prefixes:
//   P1: : 0 4 12 Hello   (classic UltraStar duet prefix)
//   P1 : : 0 4 12 Hello  (space before colon — emitted by some tools)
//   P4: R 8 2 10 Yo      (trio/quartet voice prefix)
//
// NOTE: trailing spaces on NOTE LYRICS are significant (syllable detection)
// and must never be trimmed — this module only trims MARKER lines, where a
// trailing space carries no meaning.

import type { LyricLine } from '@/types/game';

/** All voice tags recognised in the TXT body (P4 = 3rd voice, P8 = 4th voice). */
export type DuetPlayerTag = 'P1' | 'P2' | 'P4' | 'P8';

const TAG_BY_DIGIT: Record<string, DuetPlayerTag> = {
  '1': 'P1',
  '2': 'P2',
  '4': 'P4',
  '8': 'P8',
};

/**
 * Match a standalone player marker line (P1/P2/P4/P8 section switch).
 * Returns the player tag, or null when the line is not a marker.
 */
export function matchPlayerMarkerLine(line: string): DuetPlayerTag | null {
  const m = line.trim().match(/^P\s*([1248])\s*:?\s*$/);
  if (!m) return null;
  return TAG_BY_DIGIT[m[1]] ?? null;
}

/**
 * Match a note line with a leading duet prefix (e.g. "P1: : 0 4 12 Hello").
 * Returns the player tag plus the remainder of the line, or null.
 * Leading whitespace before the prefix is tolerated.
 */
export function matchDuetNotePrefix(line: string): { player: DuetPlayerTag; rest: string } | null {
  const m = line.match(/^\s*P\s*([1248])\s*:\s*(.*)$/);
  if (!m) return null;
  const tag = TAG_BY_DIGIT[m[1]];
  if (!tag) return null;
  return { player: tag, rest: m[2] };
}

/**
 * True when a parsed note list contains notes for at least TWO different
 * voices (P1/P2/P4/P8). A stray single P1 marker (without any other voice)
 * is not a multi-voice song.
 */
export function notesHaveBothPlayers(notes: ReadonlyArray<{ player?: string }>): boolean {
  const seen = new Set<string>();
  for (const n of notes) {
    if (n.player === 'P1' || n.player === 'P2' || n.player === 'P4' || n.player === 'P8') {
      seen.add(n.player);
      if (seen.size >= 2) return true;
    }
  }
  return false;
}

/**
 * True when loaded lyric lines carry assignments for at least TWO different
 * voices (checked on line level and note level). Used to repair stale library
 * entries whose isDuet flag was lost during an older scan/import.
 */
export function lyricsIndicateDuet(lyrics: ReadonlyArray<LyricLine>): boolean {
  const seen = new Set<string>();
  const add = (p?: string) => {
    if (p === 'P1' || p === 'P2' || p === 'P4' || p === 'P8') seen.add(p);
  };
  for (const line of lyrics) {
    add(line.player);
    for (const note of line.notes ?? []) {
      add(note.player);
    }
    if (seen.size >= 2) return true;
  }
  return false;
}

/**
 * Number of distinct voices (P1/P2/P4/P8) present in the lyric lines.
 * Returns 0 when no explicit voice markers exist (solo song).
 */
export function countDistinctVoices(lyrics: ReadonlyArray<LyricLine>): number {
  const seen = new Set<string>();
  const add = (p?: string) => {
    if (p === 'P1' || p === 'P2' || p === 'P4' || p === 'P8') seen.add(p);
  };
  for (const line of lyrics) {
    add(line.player);
    for (const note of line.notes ?? []) add(note.player);
  }
  return seen.size;
}
