// ===================== MEDLEY REDESIGN — TYPE DEFINITIONS =====================

import type { Song, Difficulty, PlayerProfile } from '@/types/game';

// ── Play Modes ──
export type MedleyPlayMode = 'ffa' | 'team';

// ── Team Configurations ──
export type TeamSize = 1 | 2; // 1v1 or 2v2 (3v3 and 4v4 TBD)

export interface TeamAssignment {
  teamA: string[]; // Player IDs
  teamB: string[]; // Player IDs
}

// ── Match (one snippet = one matchup) ──
export interface MedleyMatch {
  snippetIndex: number;
  teamASingerId: string; // Which player from team A sings this snippet
  teamBSingerId: string; // Which player from team B sings this snippet
  snippet: MedleySong;
  /** Per-player scores for this match (accumulated in handleGameEnd) */
  scores?: Record<string, {
    score: number;
    notesHit: number;
    notesMissed: number;
    maxCombo: number;
  }>;
  completed: boolean;
}

// ── Round Result (for series tracking) ──
export interface MedleyRoundResult {
  songTitle: string;
  songArtist: string;
  playedAt: number;
  teamASingerId: string;
  teamASingerName: string;
  teamBSingerId: string;
  teamBSingerName: string;
  teamAScore: number;
  teamBScore: number;
  /** Full per-player breakdown */
  playerScores: Record<string, {
    score: number;
    notesHit: number;
    notesMissed: number;
    maxCombo: number;
  }>;
}

// ── Player in medley context ──
export interface MedleyPlayer {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  /** Team assignment: 'A' or 'B' (null for FFA) */
  team: 'A' | 'B' | null;
  score: number;
  notesHit: number;
  notesMissed: number;
  combo: number;
  maxCombo: number;
  snippetsSung: number;
}

// ── Snippet ──
export interface MedleySong {
  song: Song;
  startTime: number; // ms in the original song
  endTime: number;   // ms in the original song
  duration: number;  // ms
}

// ── Settings ──
export interface MedleySettings {
  playMode: MedleyPlayMode;
  teamSize: TeamSize;
  snippetDuration: number; // seconds
  snippetCount: number;    // number of songs/snippets
  transitionTime: number;  // seconds between snippets
  difficulty: Difficulty;
  /** Track which snippet we're at (set during gameplay) */
  currentSnippetIndex?: number;
  /** Language filter (null = all) */
  languageFilter: string | null;
  /** Genre filter (null = all) */
  genreFilter: string | null;
}

// ── Match order generator ──
// Team mode: round-robin matchups within and across teams
// 1v1 = 5 snippets (A1vB1, A1vB1, A1vB1, A1vB1, A1vB1)
// 2v2 = 4 snippets (A1vB1, A2vB2, A1vB2, A2vB1) — every pair sings once

export function generateTeamMatches(
  players: MedleyPlayer[],
  snippets: MedleySong[],
): MedleyMatch[] {
  const teamA = players.filter(p => p.team === 'A');
  const teamB = players.filter(p => p.team === 'B');

  if (teamA.length === 0 || teamB.length === 0) return [];

  const teamSize = teamA.length; // Both teams have same size

  // Generate all cross-team pairings (round-robin)
  const pairings: Array<{ a: MedleyPlayer; b: MedleyPlayer }> = [];
  for (const a of teamA) {
    for (const b of teamB) {
      pairings.push({ a, b });
    }
  }

  const matches: MedleyMatch[] = [];

  // For each snippet, cycle through pairings
  for (let i = 0; i < snippets.length; i++) {
    const pairing = pairings[i % pairings.length];
    matches.push({
      snippetIndex: i,
      teamASingerId: pairing.a.id,
      teamBSingerId: pairing.b.id,
      snippet: snippets[i],
      completed: false,
    });
  }

  return matches;
}

// ── Calculate total snippets for team mode ──
export function getTeamSnippetCount(teamSize: TeamSize): number {
  switch (teamSize) {
    case 1: return 5; // 1v1: 5 snippets
    case 2: return 4; // 2v2: 4 snippets (all cross-pairs)
    default: return 4;
  }
}

// ── Default settings ──
export const DEFAULT_MEDLEY_SETTINGS: MedleySettings = {
  playMode: 'ffa',
  teamSize: 1,
  snippetDuration: 30,
  snippetCount: 5,
  transitionTime: 3,
  difficulty: 'medium',
  languageFilter: null,
  genreFilter: null,
};

// ── FFA snippet count ──
export function getFFASnippetCount(): number {
  return 5; // FFA always 5 snippets, all 4 sing simultaneously
}
