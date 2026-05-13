// PTM segment generation — shared utility for Pass the Mic game mode.
// When lyrics are available, segments are score-based (equal points per segment).
// Segment count is determined by the singing duration (first note to last note),
// NOT total song duration, so intros/outros without notes don't waste segments.
// When lyrics are unavailable, falls back to equal time-based segments.
// Natural break points (gaps between lines) are preferred for segment boundaries.

import type { LyricLine, Note } from '@/types/game';
import type { PassTheMicSegment } from '@/components/game/ptm-types';

// ───────────────────────────────────────────────────────────
// Public API
// ───────────────────────────────────────────────────────────

export function generatePtmSegments(
  songDurationMs: number,
  playerCount: number,
  _settingsSegmentDuration?: number,
  lyrics?: LyricLine[],
): PassTheMicSegment[] {
  // Exclude very short songs (< 60s) — not enough for meaningful gameplay
  if (songDurationMs < 60000) {
    return [{ startTime: 0, endTime: Math.round(songDurationMs), playerId: null }];
  }

  // When lyrics with notes are available, use score-based segmentation
  if (lyrics && lyrics.length > 0) {
    const notes = lyrics.flatMap(line => line.notes);
    if (notes.length > 0) {
      return generateScoreBasedSegments(songDurationMs, playerCount, lyrics, notes);
    }
  }

  // Fallback: time-based segmentation (original logic)
  return generateTimeBasedSegments(songDurationMs, playerCount);
}

// ───────────────────────────────────────────────────────────
// Score-based segmentation
// ───────────────────────────────────────────────────────────

/**
 * Build segments where each segment has approximately equal scoring potential.
 * Break points are placed at natural line gaps (between lyric lines).
 * Segment count is based on singing duration (first note → last note),
 * so intros/outros without notes don't waste segments.
 */
function generateScoreBasedSegments(
  songDurationMs: number,
  playerCount: number,
  lyrics: LyricLine[],
  notes: Note[],
): PassTheMicSegment[] {
  // Find the actual singing range (first note start to last note end)
  let firstNoteTime = Infinity;
  let lastNoteEnd = 0;
  for (const note of notes) {
    if (note.startTime < firstNoteTime) firstNoteTime = note.startTime;
    const noteEnd = note.startTime + (note.duration || 0);
    if (noteEnd > lastNoteEnd) lastNoteEnd = noteEnd;
  }

  const singingDurationMs = lastNoteEnd - firstNoteTime;
  // If less than 30s of actual singing, use a single segment
  if (singingDurationMs < 30000) {
    return [{ startTime: 0, endTime: Math.round(songDurationMs), playerId: null }];
  }

  // Calculate segment count based on SINGING duration, not total song duration.
  // This ensures segments are only placed where there are notes.
  // Target: ~30s of singing per segment, capped at 5 rounds per player.
  const targetSegDurMs = 30000;
  let segCount = Math.max(playerCount, Math.ceil(singingDurationMs / targetSegDurMs));
  segCount = Math.ceil(segCount / playerCount) * playerCount; // Round to multiple of player count
  segCount = Math.min(segCount, playerCount * 5); // Cap at 5 rounds

  if (segCount <= playerCount) {
    return [{ startTime: 0, endTime: Math.round(songDurationMs), playerId: null }];
  }

  // Build cumulative score timeline at line boundaries
  const lineBreaks = buildScoreTimeline(lyrics, notes);

  if (lineBreaks.length < segCount) {
    // Not enough break points — fall back to time-based
    return generateTimeBasedSegments(songDurationMs, playerCount);
  }

  const totalScore = lineBreaks[lineBreaks.length - 1].cumulativeScore;
  if (totalScore <= 0) {
    return generateTimeBasedSegments(songDurationMs, playerCount);
  }

  const targetScorePerSegment = totalScore / segCount;

  // Pick break points that are closest to the target cumulative score
  // Start at song beginning (or slightly before first note for context)
  const adjustedStart = Math.max(0, firstNoteTime - 1000);
  const breakTimes: number[] = [Math.round(adjustedStart)];
  for (let seg = 1; seg < segCount; seg++) {
    const targetCumScore = seg * targetScorePerSegment;
    breakTimes.push(findBestBreakpoint(lineBreaks, targetCumScore, breakTimes[breakTimes.length - 1]));
  }
  breakTimes.push(Math.min(Math.round(songDurationMs), Math.round(lastNoteEnd + 1000))); // End shortly after last note

  // Build segments from break times
  const segments: PassTheMicSegment[] = [];
  for (let i = 0; i < breakTimes.length - 1; i++) {
    const start = breakTimes[i];
    const end = breakTimes[i + 1];
    // Skip segments shorter than 5s (e.g., tiny tail at the end)
    if (end - start < 5000) {
      // Merge into previous segment
      if (segments.length > 0) {
        segments[segments.length - 1].endTime = end;
      }
      continue;
    }
    segments.push({ startTime: start, endTime: end, playerId: null });
  }

  return segments.length > 0
    ? segments
    : [{ startTime: 0, endTime: Math.round(songDurationMs), playerId: null }];
}

/**
 * Build an array of candidate break points at the END of each lyric line.
 * Each entry records the time (ms) and the cumulative score up to that point.
 */
function buildScoreTimeline(
  lyrics: LyricLine[],
  notes: Note[],
): Array<{ time: number; cumulativeScore: number; gapAfter: number }> {
  // Map each note to its scoring weight (golden notes are worth 5x more)
  const GOLDEN_WEIGHT = 5;
  const NORMAL_WEIGHT = 1;

  // Build note score map for quick lookup
  const noteScoreMap = new Map<string, number>();
  for (const note of notes) {
    // Score potential = duration-based ticks × weight
    // Longer notes are worth more (more time to score points)
    const ticks = Math.max(1, Math.round(note.duration / 500)); // ~120 BPM default
    const weight = note.isGolden ? GOLDEN_WEIGHT : NORMAL_WEIGHT;
    noteScoreMap.set(note.id, ticks * weight);
  }

  const timeline: Array<{ time: number; cumulativeScore: number; gapAfter: number }> = [];
  let cumulative = 0;

  for (let i = 0; i < lyrics.length; i++) {
    const line = lyrics[i];
    // Add score for all notes in this line
    for (const note of line.notes) {
      cumulative += noteScoreMap.get(note.id) ?? 0;
    }

    // Calculate gap after this line (to the start of the next line, or song end)
    const gapAfter = i < lyrics.length - 1
      ? Math.max(0, lyrics[i + 1].startTime - line.endTime)
      : 0; // Last line has no gap (song ends)

    timeline.push({
      time: Math.round(line.endTime),
      cumulativeScore: cumulative,
      gapAfter,
    });
  }

  return timeline;
}

/**
 * Find the line break that is closest to the target cumulative score,
 * preferring breaks with larger gaps (more natural transition points).
 * Also ensures the break is after the previous segment's start.
 */
function findBestBreakpoint(
  timeline: Array<{ time: number; cumulativeScore: number; gapAfter: number }>,
  targetScore: number,
  minTime: number,
): number {
  let bestIdx = 0;
  let bestDistance = Infinity;

  for (let i = 0; i < timeline.length; i++) {
    const entry = timeline[i];
    // Skip entries that are before or at the minimum time (no overlap)
    if (entry.time <= minTime) continue;

    const dist = Math.abs(entry.cumulativeScore - targetScore);
    // Prefer breaks with larger gaps when scores are equidistant
    // Use gap as tiebreaker: effective distance = score distance / (1 + gapWeight)
    const gapBonus = entry.gapAfter / 2000; // 2s gap = 1.0 bonus
    const effectiveDist = dist / (1 + gapBonus);

    if (effectiveDist < bestDistance) {
      bestDistance = effectiveDist;
      bestIdx = i;
    }
  }

  return timeline[bestIdx].time;
}

// ───────────────────────────────────────────────────────────
// Time-based segmentation (fallback)
// ───────────────────────────────────────────────────────────

function generateTimeBasedSegments(
  songDurationMs: number,
  playerCount: number,
): PassTheMicSegment[] {
  if (songDurationMs < 60000) {
    return [{ startTime: 0, endTime: Math.round(songDurationMs), playerId: null }];
  }

  const rawDurSec = Math.max(20, Math.min(60, Math.ceil(songDurationMs / (playerCount * 2 * 1000))));
  const segDurMs = Math.max(20000, Math.min(60000, rawDurSec * 1000));

  const rawCount = Math.ceil(songDurationMs / segDurMs);
  let segCount = Math.max(playerCount, Math.ceil(rawCount / playerCount) * playerCount);
  segCount = Math.min(segCount, playerCount * 5); // Cap at 5 rounds

  const adjustedDurMs = songDurationMs / segCount;

  if (adjustedDurMs < 20000) {
    return [{ startTime: 0, endTime: Math.round(songDurationMs), playerId: null }];
  }

  const segments: PassTheMicSegment[] = [];
  for (let i = 0; i < segCount; i++) {
    segments.push({
      startTime: Math.round(i * adjustedDurMs),
      endTime: Math.round((i + 1) * adjustedDurMs),
      playerId: null,
    });
  }
  return segments;
}


