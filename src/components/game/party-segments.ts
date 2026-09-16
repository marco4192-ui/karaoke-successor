/**
 * Vocal-share balanced segment generation for party modes (PTM + CPTM).
 *
 * Fairness fix (user report: "nicht alle Spieler haben die gleichen Chancen
 * Punkte zu erzielen — einige hatten so gut wie keinen Singanteil in ihrem
 * Snippet"): the old generator cut the song into EQUAL TIME slices. Vocal
 * density is anything but uniform — whoever drew the instrumental
 * intro/bridge/outro segment sang almost nothing while chorus segments were
 * point mines.
 *
 * This generator instead splits the song so every segment contains the same
 * amount of SINGABLE material (note time):
 *  1. Collect all notes, clip them to [0, song.duration]
 *  2. Walk the note timeline; place each boundary where the accumulated
 *     vocal time crosses k * (totalVocal / segCount) — interpolating inside
 *     a long note when needed, snapping to the note end when close
 *  3. Enforce a minimum wall-clock distance between boundaries so player
 *     switches never spin, and drop boundaries that would squeeze the tail
 *  4. Fallback: no note data → classic equal time slices
 *
 * Combined with the per-segment 2,000-point normalization in the scoring
 * hooks (fixed 250 ms party tick grid), every player now gets both the same
 * amount of singing AND the same earnable maximum.
 */

import type { Song } from '@/types/game';

/** Segment shape shared by PtmSegment and CptmSegment (identical). */
export interface PartySegmentSlice {
  startTime: number;
  endTime: number;
  playerId: string | null;
}

/** Songs shorter than this are rejected (same rule as the old generator). */
const MIN_SONG_MS = 60_000;
/** Segment length tuning — identical to the previous auto-duration logic. */
const MIN_SEG_S = 20;
const MAX_SEG_S = 60;
const MIN_SEGS_PER_PLAYER = 2;
/** Minimum wall-clock distance between two boundaries (avoids switch spam). */
const MIN_BOUNDARY_GAP_MS = 12_000;
/** A boundary closer than this to the song end is dropped (protects the tail). */
const MIN_TAIL_MS = 8_000;
/** Snap a boundary to the note end when the ideal split is this close to it. */
const NOTE_END_SNAP_MS = 3_000;

/** Classic equal-time fallback (previous behaviour). */
function equalTimeSlices(durationMs: number, segCount: number): PartySegmentSlice[] {
  const adjustedDurMs = durationMs / segCount;
  const segments: PartySegmentSlice[] = [];
  for (let i = 0; i < segCount; i++) {
    segments.push({
      startTime: Math.round(i * adjustedDurMs),
      endTime: Math.round((i + 1) * adjustedDurMs),
      playerId: null,
    });
  }
  return segments;
}

/**
 * Generate segments with an equal SHARE OF VOCAL TIME each.
 *
 * @param song            song (lyrics carry the notes)
 * @param playerCount     number of players (each gets ≥ MIN_SEGS_PER_PLAYER
 *                        segments when the song is long enough)
 * @param explicitDurationSec  user-chosen target segment length in seconds
 *                        (clamped to 20–60); auto-computed when omitted
 */
export function generateBalancedPartySegments(
  song: Song,
  playerCount: number,
  explicitDurationSec?: number,
): PartySegmentSlice[] {
  if (song.duration < MIN_SONG_MS) return [];
  const durationMs = song.duration;

  // ── Determine the segment count (same tuning as the old generator) ──
  const rawAuto = Math.ceil(durationMs / (playerCount * MIN_SEGS_PER_PLAYER * 1000));
  const clampedAuto = Math.max(MIN_SEG_S, Math.min(MAX_SEG_S, rawAuto));
  const segDur = explicitDurationSec
    ? Math.max(MIN_SEG_S, Math.min(MAX_SEG_S, explicitDurationSec))
    : clampedAuto;
  const rawCount = Math.ceil(durationMs / (segDur * 1000));
  const segCount = Math.max(1, Math.max(playerCount, rawCount));

  // ── Collect + clip notes ──
  const notes: Array<{ start: number; end: number }> = [];
  for (const line of song.lyrics ?? []) {
    for (const n of line.notes) {
      const s = Math.max(0, n.startTime);
      const e = Math.min(durationMs, n.startTime + n.duration);
      if (e > s) notes.push({ start: s, end: e });
    }
  }
  if (notes.length === 0) return equalTimeSlices(durationMs, segCount);
  notes.sort((a, b) => a.start - b.start);

  const totalVocal = notes.reduce((acc, n) => acc + (n.end - n.start), 0);
  if (totalVocal <= 0) return equalTimeSlices(durationMs, segCount);

  // ── Vocal-share boundaries ──
  const targetPer = totalVocal / segCount;
  const boundaries: number[] = [];
  let vocalCursor = 0;
  let nextK = 1; // next boundary index to place (1 .. segCount-1)
  let lastBoundary = 0;

  for (const note of notes) {
    if (nextK >= segCount) break;
    const vocalBefore = vocalCursor;
    vocalCursor += note.end - note.start;

    while (nextK < segCount && vocalCursor >= nextK * targetPer) {
      // Ideal split: the exact time inside this note where the vocal share
      // crosses the k-th threshold (interpolated for long notes).
      const needed = nextK * targetPer - vocalBefore;
      const ideal = note.start + Math.max(0, Math.min(needed, note.end - note.start));

      // Prefer the note END when the ideal split is very close to it —
      // the next segment then starts cleanly at a fresh note.
      let candidate = (note.end - ideal <= NOTE_END_SNAP_MS) ? note.end : ideal;

      // Enforce min wall distance from the previous boundary.
      candidate = Math.max(candidate, lastBoundary + MIN_BOUNDARY_GAP_MS);

      // A boundary too close to the song end would starve the final
      // segment — stop placing, the tail merges into the last segment.
      if (candidate > durationMs - MIN_TAIL_MS) {
        nextK = segCount; // stop
        break;
      }

      boundaries.push(Math.round(candidate));
      lastBoundary = candidate;
      nextK++;
    }
  }

  // ── Drop boundaries pushed past the vocal region ──
  // When the vocal material is CONCENTRATED (e.g. a dense burst in the first
  // half of the song), the min-gap clamping defers boundaries past the last
  // note — those boundaries would create instrumental-only tail segments
  // (exactly the unfairness this generator eliminates). Fewer but
  // vocal-balanced segments beat empty ones.
  const lastNoteEnd = notes[notes.length - 1].end;
  while (boundaries.length > 0 && boundaries[boundaries.length - 1] >= lastNoteEnd) {
    boundaries.pop();
  }

  // ── Build segments [0, b1] [b1, b2] … [bN, duration] ──
  const segments: PartySegmentSlice[] = [];
  let start = 0;
  for (const b of boundaries) {
    if (b <= start) continue; // monotonic guard
    segments.push({ startTime: start, endTime: b, playerId: null });
    start = b;
  }
  segments.push({ startTime: start, endTime: Math.round(durationMs), playerId: null });

  return segments;
}
