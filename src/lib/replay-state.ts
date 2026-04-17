'use client';

/**
 * Module-level state for sharing the last replay ID between
 * GameScreen (recorder) and ResultsScreen (player).
 *
 * This avoids prop-drilling through the app router or requiring
 * a Zustand store just for a single transient value.
 */

let lastReplayId: string | null = null;

export function setLastReplayId(id: string | null): void {
  lastReplayId = id;
}

export function getLastReplayId(): string | null {
  return lastReplayId;
}
