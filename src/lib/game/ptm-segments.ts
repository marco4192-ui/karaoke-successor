// PTM segment generation — shared utility for Pass the Mic game mode.
// Auto 20-60s segments, equal per player, short songs excluded (< 60s).

import { PassTheMicSegment } from '@/components/game/pass-the-mic-screen';

export function generatePtmSegments(
  songDurationMs: number,
  playerCount: number,
  settingsSegmentDuration?: number,
): PassTheMicSegment[] {
  // Exclude very short songs (< 60s) — not enough for meaningful gameplay
  if (songDurationMs < 60000) {
    return [{ startTime: 0, endTime: Math.round(songDurationMs), playerId: null }];
  }

  // Calculate segment duration in ms: use setting or auto-compute 20-60s
  const rawDurSec = settingsSegmentDuration
    || Math.max(20, Math.min(60, Math.ceil(songDurationMs / (playerCount * 2 * 1000))));
  const segDurMs = Math.max(20000, Math.min(60000, rawDurSec * 1000));

  // Calculate how many segments fit
  const rawCount = Math.ceil(songDurationMs / segDurMs);

  // Ensure segment count is divisible by playerCount for equal distribution
  const segCount = Math.max(playerCount, Math.ceil(rawCount / playerCount) * playerCount);

  const adjustedDurMs = songDurationMs / segCount;
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
