/**
 * Medley Contest → Companion Sync Snapshot (R36)
 *
 * Module-level singleton (motto-party.getConfig() precedent): the medley
 * game hook (medley-game-hook.ts) writes a compact snapshot of its live
 * state on every relevant change, and karaoke-app's 2s master gamestate
 * sync reads it FRESH at each tick to build `medleyGameData` for the
 * companion phones (same architecture as brGameData → battle-royale).
 *
 * Why not the party store? The medley hook keeps its live state in refs
 * (playersRef, phase, snippet index …) for performance — re-rendering all
 * party-store subscribers at tick cadence just for the mirror would be
 * wasteful. A plain module variable has zero subscription cost and the
 * master sync loop polls it at its natural 2s cadence anyway.
 */

import type { MedleyGamePhase, MedleyPlayMode } from '@/components/game/medley/medley-types';

/** Compact roster entry for the phone mirror (avatar stripped — color only). */
export interface MedleySyncPlayer {
  id: string;
  name: string;
  color: string;
  score: number;
  inputType: 'local' | 'mobile';
  isEliminated: boolean;
  snippetsSung: number;
  team: number;
}

/** Team-mode matchup (current or next snippet). */
export interface MedleySyncMatchup {
  aId: string;
  aName: string;
  aColor: string;
  bId: string;
  bName: string;
  bColor: string;
}

export interface MedleySyncSnapshot {
  phase: MedleyGamePhase;
  playMode: MedleyPlayMode;
  /** Current snippet (0-based) */
  snippetIndex: number;
  snippetCount: number;
  songId: string | null;
  songTitle: string | null;
  songArtist: string | null;
  /** Countdown seconds while phase === 'transition' */
  transitionCount: number;
  /** Snippet media actually playing (false while paused / transitioning) */
  isPlaying: boolean;
  /** Profile ids singing the CURRENT snippet (drives phone auto-sing) */
  activeProfileIds: string[];
  players: MedleySyncPlayer[];
  /** Team mode: matchup of the current snippet */
  matchup: MedleySyncMatchup | null;
  /** Team mode: matchup of the NEXT snippet (transition preview) */
  nextMatchup: MedleySyncMatchup | null;
  /** Elimination mode: profile ids in elimination order */
  eliminationOrder: string[];
  /** Feature #16: Mystery mode — hide song titles while singing */
  mysteryMode: boolean;
  updatedAt: number;
}

let snapshot: MedleySyncSnapshot | null = null;

/** Write the current snapshot (called by the medley game hook). */
export function setMedleySyncSnapshot(s: MedleySyncSnapshot): void {
  snapshot = s;
}

/** Read the current snapshot (called by karaoke-app's master sync loop). */
export function getMedleySyncSnapshot(): MedleySyncSnapshot | null {
  return snapshot;
}

/** Clear on medley unmount — a finished medley must not leave stale data. */
export function clearMedleySyncSnapshot(): void {
  snapshot = null;
}
