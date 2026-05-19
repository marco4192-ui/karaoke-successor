/**
 * Player schedule builder for Pass-the-Mic mode.
 * Pure utility — no React dependencies.
 */
import type { PtmPlayer, PtmSegment } from './ptm-types';

export interface PtmScheduleEntry {
  segmentIndex: number;
  playerIndex: number;
}

interface BuildScheduleResult {
  schedule: PtmScheduleEntry[];
  assigned: PtmSegment[];
  initialPlayerIndex: number;
}

/**
 * Build a deterministic player schedule for all segments.
 *
 * Ensures:
 * - Equal (or ±1) appearances per player
 * - Fisher-Yates shuffle of the pool
 * - No consecutive same-player where possible
 */
export function buildPlayerSchedule(
  players: PtmPlayer[],
  segments: PtmSegment[],
): BuildScheduleResult {
  const segCount = segments.length;

  // Single segment — assign to a random player
  if (segCount <= 1) {
    const randomIdx = Math.floor(Math.random() * players.length);
    const randomPlayer = players[randomIdx];
    const assigned = segments.map(seg => ({ ...seg, playerId: randomPlayer.id }));
    return {
      schedule: [{ segmentIndex: 0, playerIndex: randomIdx }],
      assigned,
      initialPlayerIndex: randomIdx,
    };
  }

  // Build a pool with equal appearances per player, then shuffle
  const baseRepeats = Math.floor(segCount / players.length);
  const remainder = segCount % players.length;
  const pool: number[] = []; // player indices
  for (let p = 0; p < players.length; p++) {
    const count = baseRepeats + (p < remainder ? 1 : 0);
    for (let r = 0; r < count; r++) pool.push(p);
  }

  // Fisher-Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  // Avoid consecutive same-player assignments where possible
  for (let i = 1; i < pool.length; i++) {
    if (pool[i] === pool[i - 1]) {
      for (let j = i + 1; j < pool.length; j++) {
        if (pool[j] !== pool[i]) {
          [pool[i], pool[j]] = [pool[j], pool[i]];
          break;
        }
      }
    }
  }

  // Build schedule and assign playerIds to segments
  const schedule: PtmScheduleEntry[] = segments.map((_, i) => ({
    segmentIndex: i,
    playerIndex: pool[i] ?? 0,
  }));

  const assigned = segments.map((seg, i) => ({
    ...seg,
    playerId: players[schedule[i]?.playerIndex ?? 0]?.id,
  }));

  return {
    schedule,
    assigned,
    initialPlayerIndex: schedule[0]?.playerIndex ?? 0,
  };
}
