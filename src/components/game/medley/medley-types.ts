/**
 * Medley Contest — Shared Types
 *
 * All type definitions for the rewritten Medley mode.
 * Three modes: FFA (Free-For-All), Team (1v1, 2v2), and Elimination.
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
  // Feature #10: Elimination
  /** Whether this player has been eliminated */
  isEliminated: boolean;
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

export type MedleyPlayMode = 'ffa' | 'team' | 'elimination';

export type TeamSize = 1 | 2; // 1 = 1v1, 2 = 2v2

// ===================== FEATURE #15: VOICE MODIFIERS =====================

export type VoiceModifier = 'none' | 'chipmunk' | 'slow' | 'fast' | 'acapella';

export interface VoiceModifierDef {
  id: VoiceModifier;
  labelKey: string;  // translation key
  icon: string;
  descriptionKey: string; // translation key
  playbackRate: number;
}

export const VOICE_MODIFIERS: VoiceModifierDef[] = [
  { id: 'none', labelKey: 'medley.modifierNone', icon: '🎵', descriptionKey: 'medley.modifierNoneDesc', playbackRate: 1.0 },
  { id: 'chipmunk', labelKey: 'medley.chipmunk', icon: '🐿️', descriptionKey: 'medley.chipmunkDesc', playbackRate: 1.05 },
  { id: 'slow', labelKey: 'medley.slowMo', icon: '🐌', descriptionKey: 'medley.slowMoDesc', playbackRate: 0.8 },
  { id: 'fast', labelKey: 'medley.turbo', icon: '⚡', descriptionKey: 'medley.turboDesc', playbackRate: 1.2 },
  { id: 'acapella', labelKey: 'medley.acapella', icon: '🎤', descriptionKey: 'medley.acapellaDesc', playbackRate: 1.0 },
];

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
  /** Transition time between snippets in seconds */
  transitionTime: number;
  /** Feature #9: Dynamically ramp difficulty from easy → hard across snippets */
  dynamicDifficulty: boolean;
  /** Feature #10: Elimination mode order */
  // (eliminationOrder is tracked in game state, not settings)
  /** Feature #15: Enable random voice modifiers */
  modifiersEnabled: boolean;
  /** Feature #16: Mystery mode — hide song info until after singing */
  mysteryMode: boolean;
  /** Feature #18: Enable team bonus mechanics */
  teamBonusesEnabled: boolean;
}

/** Default settings per mode */
export function getDefaultSettings(mode: MedleyPlayMode, teamSize: TeamSize): MedleySettings {
  const snippetCount = mode === 'ffa' ? 5 : mode === 'team' ? teamSize * teamSize : 0; // elimination count set dynamically
  return {
    playMode: mode,
    teamSize,
    snippetDuration: 30,
    snippetCount,
    difficulty: 'medium',
    transitionTime: 3,
    dynamicDifficulty: false,
    modifiersEnabled: false,
    mysteryMode: false,
    teamBonusesEnabled: false,
  };
}

/** Compute total snippet count for team mode */
export function teamSnippetCount(teamSize: TeamSize): number {
  return teamSize * teamSize;
}

/** Compute snippet count for elimination mode (player count) */
export function eliminationSnippetCount(playerCount: number): number {
  return playerCount;
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

// ===================== SCORING EVENTS (Feature #5) =====================

/** A single scoring event emitted during gameplay for UI feedback */
export interface MedleyScoringEvent {
  playerId: string;
  points: number;      // positive for hits, negative for misses
  hit: boolean;
  golden: boolean;
  timestamp: number;    // Date.now()
}

// ===================== FEATURE #17: HIGHLIGHTS =====================

/** Per-snippet highlight for the highlight reel */
export interface MedleyHighlight {
  snippetIdx: number;
  songTitle: string;
  songArtist: string;
  /** Player with the highest score in this snippet */
  bestPlayerId?: string;
  bestPlayerScore?: number;
  /** Player with the lowest score in this snippet */
  worstPlayerId?: string;
  worstPlayerScore?: number;
  /** Highest single combo achieved in this snippet */
  highestComboPlayerId?: string;
  highestComboValue?: number;
}

// ===================== FEATURE #18: TEAM BONUS RESULTS =====================

export interface TeamBonusResult {
  /** Synergy bonuses triggered per team: teamId -> bonus points */
  synergyPoints: Record<string, number>;
  /** Whether comeback boost was triggered and for which team */
  comebackTeamId: string | null;
  comebackMultiplier: number;
  /** MVP player ID (best individual scorer across teams) */
  mvpPlayerId: string | null;
  /** Per-team total bonus points */
  teamBonusTotal: Record<string, number>;
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
  /** Feature #10: Elimination order (player IDs in order of elimination) */
  eliminationOrder?: string[];
  /** Feature #17: Per-snippet highlights */
  snippetHighlights?: MedleyHighlight[];
  /** Feature #18: Team bonus results */
  teamBonusResult?: TeamBonusResult;
  /** Feature #15: Play mode used */
  playMode: MedleyPlayMode;
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
