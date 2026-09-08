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
//
// Accepted note-line prefixes:
//   P1: : 0 4 12 Hello   (classic UltraStar duet prefix)
//   P1 : : 0 4 12 Hello  (space before colon — emitted by some tools)
//
// NOTE: trailing spaces on NOTE LYRICS are significant (syllable detection)
// and must never be trimmed — this module only trims MARKER lines, where a
// trailing space carries no meaning.

import type { LyricLine } from '@/types/game';

export type DuetPlayerTag = 'P1' | 'P2';

/**
 * Match a standalone player marker line (P1/P2 section switch).
 * Returns the player tag, or null when the line is not a marker.
 */
export function matchPlayerMarkerLine(line: string): DuetPlayerTag | null {
  const m = line.trim().match(/^P\s*([12])\s*:?\s*$/);
  if (!m) return null;
  return m[1] === '1' ? 'P1' : 'P2';
}

/**
 * Match a note line with a leading duet prefix (e.g. "P1: : 0 4 12 Hello").
 * Returns the player tag plus the remainder of the line, or null.
 * Leading whitespace before the prefix is tolerated.
 */
export function matchDuetNotePrefix(line: string): { player: DuetPlayerTag; rest: string } | null {
  const m = line.match(/^\s*P\s*([12])\s*:\s*(.*)$/);
  if (!m) return null;
  return { player: m[1] === '1' ? 'P1' : 'P2', rest: m[2] };
}

/**
 * True when a parsed note list contains BOTH P1 and P2 assignments.
 * A stray single P1 marker (without any P2 notes) is not a duet.
 */
export function notesHaveBothPlayers(notes: ReadonlyArray<{ player?: string }>): boolean {
  let hasP1 = false;
  let hasP2 = false;
  for (const n of notes) {
    if (n.player === 'P1') hasP1 = true;
    else if (n.player === 'P2') hasP2 = true;
    if (hasP1 && hasP2) return true;
  }
  return false;
}

/**
 * True when loaded lyric lines carry BOTH P1 and P2 assignments
 * (checked on line level and note level). Used to repair stale library
 * entries whose isDuet flag was lost during an older scan/import.
 */
export function lyricsIndicateDuet(lyrics: ReadonlyArray<LyricLine>): boolean {
  let hasP1 = false;
  let hasP2 = false;
  for (const line of lyrics) {
    if (line.player === 'P1') hasP1 = true;
    else if (line.player === 'P2') hasP2 = true;
    for (const note of line.notes ?? []) {
      if (note.player === 'P1') hasP1 = true;
      else if (note.player === 'P2') hasP2 = true;
    }
    if (hasP1 && hasP2) return true;
  }
  return false;
}
