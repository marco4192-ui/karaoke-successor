// PTM segment generation — hybrid time-based segmentation with gap detection.
//
// When lyrics with scored notes are available, the algorithm:
//   1. Identifies the singing range (first → last scored note, skipping freestyle).
//   2. Determines segment count based on singing duration (~40 s per segment),
//      rounded to a multiple of player count and capped at 5 full rounds.
//   3. Places forced breakpoints at the midpoints of large gaps (>10 s) between
//      consecutive scored notes, because players naturally pause there.
//   4. Distributes the remaining breakpoints along a timeline of lyric-line ends,
//      preferring line-ends with larger following gaps via an effective-distance
//      formula that penalises cutting mid-phrase.
//   5. Builds, merges (short <5 s), and splits (long >90 s) segments.
//   6. Computes totalTicks per segment when a BPM is provided.
//
// When lyrics are unavailable, falls back to equal time-based segments.

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
  bpm?: number,
): PassTheMicSegment[] {
  // Short song guard (< 60 s) — not enough for meaningful gameplay
  if (songDurationMs < 60000) {
    return [{ startTime: 0, endTime: Math.round(songDurationMs), playerId: null, totalTicks: 0 }];
  }

  // When lyrics with notes are available, use hybrid time-gap segmentation
  if (lyrics && lyrics.length > 0) {
    const notes = lyrics.flatMap(line => line.notes);
    if (notes.length > 0) {
      return generateHybridTimeGapSegments(songDurationMs, playerCount, lyrics, notes, bpm);
    }
  }

  // Fallback: time-based segmentation
  return generateTimeBasedSegments(songDurationMs, playerCount);
}

// ───────────────────────────────────────────────────────────
// Hybrid time-based segmentation with gap detection
// ───────────────────────────────────────────────────────────

function generateHybridTimeGapSegments(
  songDurationMs: number,
  playerCount: number,
  lyrics: LyricLine[],
  notes: Note[],
  bpm?: number,
): PassTheMicSegment[] {
  // ── Step 1: Find singing range (skip freestyle notes) ──
  let firstNoteTime = Infinity;
  let lastNoteEnd = 0;
  for (const note of notes) {
    if (note.isBonus) continue;
    if (note.startTime < firstNoteTime) firstNoteTime = note.startTime;
    const noteEnd = note.startTime + (note.duration || 0);
    if (noteEnd > lastNoteEnd) lastNoteEnd = noteEnd;
  }

  // If no scored notes were found, fall back to time-based
  if (firstNoteTime === Infinity || lastNoteEnd === 0) {
    return generateTimeBasedSegments(songDurationMs, playerCount);
  }

  const singingDurationMs = lastNoteEnd - firstNoteTime;

  // If less than 30 s of actual singing, use a single segment
  if (singingDurationMs < 30000) {
    return [{ startTime: 0, endTime: Math.round(songDurationMs), playerId: null, totalTicks: 0 }];
  }

  // ── Step 2: Calculate segment count ──
  const targetSegDurMs = 40000; // ~40 s of singing per segment
  let segCount = Math.max(playerCount, Math.ceil(singingDurationMs / targetSegDurMs));
  segCount = Math.ceil(segCount / playerCount) * playerCount; // Round to multiple of player count
  segCount = Math.min(segCount, playerCount * 5); // Cap at 5 rounds

  if (segCount < playerCount) {
    return [{ startTime: 0, endTime: Math.round(songDurationMs), playerId: null, totalTicks: 0 }];
  }

  // ── Step 3: Find forced breakpoints at large gaps (>10 s) ──
  const scoredNotes = notes.filter(n => !n.isBonus).sort((a, b) => a.startTime - b.startTime);
  const fixedBreakTimes: number[] = [];

  for (let i = 0; i < scoredNotes.length - 1; i++) {
    const currentEnd = scoredNotes[i].startTime + (scoredNotes[i].duration || 0);
    const nextStart = scoredNotes[i + 1].startTime;
    const gap = nextStart - currentEnd;
    if (gap > 10000) {
      const midpoint = Math.round((currentEnd + nextStart) / 2);
      // Ensure the fixed breakpoint falls within the singing range
      if (midpoint > firstNoteTime && midpoint < lastNoteEnd) {
        fixedBreakTimes.push(midpoint);
      }
    }
  }
  fixedBreakTimes.sort((a, b) => a - b);

  // ── Step 4: Distribute remaining breakpoints by time ──
  const idealDuration = singingDurationMs / segCount;

  // Build timeline of candidate break points at line-ends
  const lineEndCandidates: Array<{ time: number; gapAfter: number }> = [];
  for (let i = 0; i < lyrics.length; i++) {
    const line = lyrics[i];
    // Only consider lines that end within the singing range
    if (line.endTime < firstNoteTime) continue;
    const gapAfter = i < lyrics.length - 1
      ? Math.max(0, lyrics[i + 1].startTime - line.endTime)
      : 0;
    lineEndCandidates.push({ time: line.endTime, gapAfter });
  }

  // Determine how many boundaries we need (segCount - 1 interior boundaries)
  const neededBoundaries = segCount - 1;

  // Collect all break times (fixed + to-be-determined)
  const allBreakTimes: number[] = [];

  // For each segment boundary position, check if a fixed breakpoint already covers it
  const usedFixedIndices = new Set<number>();

  for (let seg = 1; seg <= neededBoundaries; seg++) {
    const targetTime = firstNoteTime + seg * idealDuration;

    // Check if a fixed breakpoint is nearby (within ±25% of ideal duration)
    const tolerance = idealDuration * 0.25;
    let matchedFixedIdx = -1;
    for (let fi = 0; fi < fixedBreakTimes.length; fi++) {
      if (usedFixedIndices.has(fi)) continue;
      if (Math.abs(fixedBreakTimes[fi] - targetTime) <= tolerance) {
        matchedFixedIdx = fi;
        break;
      }
    }

    if (matchedFixedIdx >= 0) {
      allBreakTimes.push(fixedBreakTimes[matchedFixedIdx]);
      usedFixedIndices.add(matchedFixedIdx);
    } else {
      // Find the line-end closest to the target time using effective distance
      const minTime = seg > 1 ? allBreakTimes[allBreakTimes.length - 1] + 5000 : firstNoteTime;
      let bestIdx = -1;
      let bestEffectiveDist = Infinity;

      for (let ci = 0; ci < lineEndCandidates.length; ci++) {
        const cand = lineEndCandidates[ci];
        // Must be after minimum time and not too early
        if (cand.time <= minTime) continue;
        const absDist = Math.abs(cand.time - targetTime);
        const effectiveDist = absDist / (1 + cand.gapAfter / 2000);
        if (effectiveDist < bestEffectiveDist) {
          bestEffectiveDist = effectiveDist;
          bestIdx = ci;
        }
      }

      if (bestIdx >= 0) {
        allBreakTimes.push(lineEndCandidates[bestIdx].time);
      } else {
        // Safety: place at ideal time position
        allBreakTimes.push(Math.round(targetTime));
      }
    }
  }

  // Insert any remaining fixed breakpoints that weren't used
  for (let fi = 0; fi < fixedBreakTimes.length; fi++) {
    if (!usedFixedIndices.has(fi)) {
      allBreakTimes.push(fixedBreakTimes[fi]);
    }
  }

  // Sort all break times
  allBreakTimes.sort((a, b) => a - b);

  // ── Step 5: Build segments ──
  const segmentStart = Math.max(0, firstNoteTime - 1000);
  const segmentEnd = Math.min(songDurationMs, lastNoteEnd + 1000);

  const rawBreaks = [Math.round(segmentStart), ...allBreakTimes, Math.round(segmentEnd)];

  // De-duplicate breaks that are too close together (< 2 s)
  const dedupedBreaks: number[] = [rawBreaks[0]];
  for (let i = 1; i < rawBreaks.length; i++) {
    if (rawBreaks[i] - dedupedBreaks[dedupedBreaks.length - 1] >= 2000) {
      dedupedBreaks.push(rawBreaks[i]);
    }
  }

  const segments: PassTheMicSegment[] = [];
  for (let i = 0; i < dedupedBreaks.length - 1; i++) {
    const start = dedupedBreaks[i];
    const end = dedupedBreaks[i + 1];

    // Merge segments shorter than 5 s into the previous
    if (end - start < 5000) {
      if (segments.length > 0) {
        segments[segments.length - 1].endTime = end;
      } else {
        // If it's the first segment, keep it (will be merged forward)
        segments.push({ startTime: start, endTime: end, playerId: null, totalTicks: 0 });
      }
      continue;
    }

    // Split segments longer than 90 s at the best internal line-end (largest gap)
    if (end - start > 90000) {
      const splitTime = findBestInternalSplit(lyrics, start, end);
      segments.push({ startTime: start, endTime: splitTime, playerId: null, totalTicks: 0 });
      segments.push({ startTime: splitTime, endTime: end, playerId: null, totalTicks: 0 });
    } else {
      segments.push({ startTime: start, endTime: end, playerId: null, totalTicks: 0 });
    }
  }

  // ── Step 6: Compute totalTicks per segment ──
  if (bpm && bpm > 0) {
    const beatDuration = 15000 / bpm;
    for (const seg of segments) {
      let ticks = 0;
      for (const note of notes) {
        if (note.isBonus) continue;
        const noteEnd = note.startTime + (note.duration || 0);
        // Note overlaps this segment (may straddle boundaries)
        if (note.startTime < seg.endTime && noteEnd > seg.startTime) {
          ticks += Math.max(1, Math.round((note.duration || 0) / beatDuration));
        }
      }
      seg.totalTicks = ticks;
    }
  }

  return segments.length > 0
    ? segments
    : [{ startTime: 0, endTime: Math.round(songDurationMs), playerId: null, totalTicks: 0 }];
}

/**
 * For an oversized segment, find the best line-end inside it to split at.
 * Prefers the line-end with the largest gap after it (most natural pause).
 */
function findBestInternalSplit(lyrics: LyricLine[], segStart: number, segEnd: number): number {
  const midpoint = (segStart + segEnd) / 2;
  let bestTime = midpoint;
  let bestGap = 0;

  for (let i = 0; i < lyrics.length; i++) {
    const line = lyrics[i];
    // Line-end must be within the segment (with some margin from edges)
    if (line.endTime <= segStart + 5000) continue;
    if (line.endTime >= segEnd - 5000) continue;

    const gapAfter = i < lyrics.length - 1
      ? Math.max(0, lyrics[i + 1].startTime - line.endTime)
      : 0;

    // Prefer the largest gap, but also prefer positions near the midpoint
    // Score: gap * proximity bonus (higher near midpoint)
    const distFromMid = Math.abs(line.endTime - midpoint);
    const proximityBonus = 1 - (distFromMid / ((segEnd - segStart) / 2));
    const score = gapAfter * Math.max(0.1, proximityBonus);

    if (score > bestGap) {
      bestGap = score;
      bestTime = line.endTime;
    }
  }

  return Math.round(bestTime);
}

// ───────────────────────────────────────────────────────────
// Time-based segmentation (fallback)
// ───────────────────────────────────────────────────────────

function generateTimeBasedSegments(
  songDurationMs: number,
  playerCount: number,
): PassTheMicSegment[] {
  if (songDurationMs < 60000) {
    return [{ startTime: 0, endTime: Math.round(songDurationMs), playerId: null, totalTicks: 0 }];
  }

  const rawDurSec = Math.max(20, Math.min(60, Math.ceil(songDurationMs / (playerCount * 2 * 1000))));
  const segDurMs = Math.max(20000, Math.min(60000, rawDurSec * 1000));

  const rawCount = Math.ceil(songDurationMs / segDurMs);
  let segCount = Math.max(playerCount, Math.ceil(rawCount / playerCount) * playerCount);
  segCount = Math.min(segCount, playerCount * 5); // Cap at 5 rounds

  const adjustedDurMs = songDurationMs / segCount;

  if (adjustedDurMs < 20000) {
    return [{ startTime: 0, endTime: Math.round(songDurationMs), playerId: null, totalTicks: 0 }];
  }

  const segments: PassTheMicSegment[] = [];
  for (let i = 0; i < segCount; i++) {
    segments.push({
      startTime: Math.round(i * adjustedDurMs),
      endTime: Math.round((i + 1) * adjustedDurMs),
      playerId: null,
      totalTicks: 0,
    });
  }
  return segments;
}
