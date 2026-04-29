/**
 * Medley Contest — Shared Types
 *
 * All type definitions for the rewritten Medley mode.
 * Two modes: FFA (Free-For-All) and Team (1v1, 2v2).
 */

import type { Song, Difficulty } from '@/types/game';

// ===================== PLAYERS =====================

export interface MedleyPlayer {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  /** Which team this player belongs to (0 = Team A, 1 = Team B) */
  team: number;
  /** 'local' = physical mic, 'mobile' = companion app */
  inputType: 'local' | 'mobile';
  /** Assigned microphone device ID (local only) */
  micId?: string;
  /** Assigned microphone display name (local only) */
  micName?: string;
  /** Companion mobile client ID (mobile only) */
  mobileClientId?: string;
  // Scoring — accumulated across all snippets
  score: number;
  notesHit: number;
  notesMissed: number;
  combo: number;
  maxCombo: number;
  snippetsSung: number;
}

// ===================== SONGS =====================

export interface MedleySong {
  song: Song;
  startTime: number; // ms — start time within the original song
  endTime: number;   // ms — end time within the original song
  duration: number;  // ms
}

/** Defines which two players sing a given snippet in Team mode */
export interface SnippetMatchup {
  snippetIndex: number;
  /** Player singing for Team A */
  playerA: MedleyPlayer;
  /** Player singing for Team B */
  playerB: MedleyPlayer;
}

// ===================== SETTINGS =====================

export type MedleyPlayMode = 'ffa' | 'team';

export type TeamSize = 1 | 2; // 1 = 1v1, 2 = 2v2

export interface MedleySettings {
  playMode: MedleyPlayMode;
  teamSize: TeamSize;
  snippetDuration: number; // seconds (15–60)
  snippetCount: number;    // total snippets (varies by mode/teamSize)
  difficulty: Difficulty;
  /** Optional genre filter for random song selection */
  genre?: string;
  /** Optional language filter for random song selection */
  language?: string;
  /** Transition time between snippets in seconds (fixed) */
  transitionTime: 3;
}

/** Default settings per mode */
export function getDefaultSettings(mode: MedleyPlayMode, teamSize: TeamSize): MedleySettings {
  const snippetCount = mode === 'ffa' ? 5 : teamSize * teamSize;
  return {
    playMode: mode,
    teamSize,
    snippetDuration: 30,
    snippetCount,
    difficulty: 'medium',
    transitionTime: 3,
  };
}

/** Compute total snippet count for team mode */
export function teamSnippetCount(teamSize: TeamSize): number {
  return teamSize * teamSize;
}

// ===================== SNIPPET GENERATION =====================

/**
 * Generate snippet matchups for Team mode.
 *
 * 1v1 (1 snippet): P1_TeamA vs P1_TeamB
 * 2v2 (4 snippets):
 *   P1_A vs P1_B
 *   P2_A vs P2_B
 *   P2_A vs P1_B  (cross-match)
 *   P1_A vs P2_B  (cross-match)
 */
export function generateTeamMatchups(
  teamA: MedleyPlayer[],
  teamB: MedleyPlayer[],
): SnippetMatchup[] {
  const size = teamA.length; // 1 or 2
  const matchups: SnippetMatchup[] = [];

  for (let a = 0; a < size; a++) {
    for (let b = 0; b < size; b++) {
      matchups.push({
        snippetIndex: matchups.length,
        playerA: teamA[a],
        playerB: teamB[b],
      });
    }
  }

  return matchups;
}

// ===================== SERIES HISTORY =====================

/** Per-round result (one "medley compilation") */
export interface MedleyRoundResult {
  playedAt: number;
  /** Per-player snippet scores keyed by player id */
  playerScores: Record<string, MedleyPlayerRoundScore>;
  /** Team totals (Team A score, Team B score) — team mode only */
  teamScores?: { teamA: number; teamB: number };
  /** Number of snippets played */
  snippetCount: number;
}

export interface MedleyPlayerRoundScore {
  score: number;
  notesHit: number;
  notesMissed: number;
  maxCombo: number;
  snippetsSung: number;
}

// ===================== GAME PHASES =====================

export type MedleyGamePhase =
  | 'intro'         // Show players, mic info, "Start" button
  | 'countdown'     // 3-2-1 countdown
  | 'playing'       // Active snippet playback
  | 'transition'    // 3s pulse before next snippet
  | 'round-results' // After last snippet: show round results
  | 'final-results';// After multiple rounds: show final standings
