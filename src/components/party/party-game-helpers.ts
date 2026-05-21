/**
 * Pure helper functions for party-game-screens.tsx.
 * These are stateless utilities that don't depend on React hooks or component state.
 */

import type { Song, Difficulty } from '@/types/game';
import { getNonDuetSongs, filterSongs } from '@/lib/game/song-library';
import { shuffleArray } from '@/lib/utils';
import type { GameSetupResult, InputMode, SongSelectionOption } from '@/components/game/unified-party-setup.types';

// ─── Frequency Label Converter ───────────────────────────────────────────────

/** Convert a numeric blind/missing-word frequency (0.15–0.90) to the string label used by GameSetupResult settings */
export function freqNumberToLabel(freq: number): 'light' | 'normal' | 'hard' | 'insane' {
  if (freq >= 0.75) return 'insane';
  if (freq >= 0.45) return 'hard';
  if (freq >= 0.20) return 'normal';
  return 'light';
}

// ─── Competitive Setup Builder ──────────────────────────────────────────────

export interface SetupPlayerEntry {
  id: string;
  name: string;
  color: string;
  playerType?: 'microphone' | 'companion';
  micId?: string;
  micName?: string;
}

/**
 * Build a GameSetupResult for any game mode.
 * Consolidates the duplicated setup logic from various callbacks in PartyGameScreens
 * into a single reusable helper.
 */
export function buildGameSetupResult(params: {
  mode: GameSetupResult['mode'];
  players: SetupPlayerEntry[];
  difficulty: Difficulty;
  settings: Record<string, unknown>;
  songSelection?: SongSelectionOption;
  inputMode?: InputMode;
}): GameSetupResult {
  const {
    mode,
    players,
    difficulty,
    settings,
    songSelection = 'random',
    inputMode = 'microphone',
  } = params;
  return {
    mode,
    players: players.map((p, i) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      playerType: p.playerType ?? 'microphone',
      micId: p.micId ?? 'default',
      micName: p.micName ?? `Mic ${i + 1}`,
    })),
    settings: {
      difficulty,
      filterGenre: 'all',
      filterLanguage: 'all',
      filterCombined: true,
      ...settings,
    },
    songSelection,
    difficulty,
    inputMode,
  };
}

/** @deprecated Use buildGameSetupResult instead */
export const buildCompetitiveSetupResult = buildGameSetupResult;

// ─── Song Duration Helpers ────────────────────────────────────────────────────

/** Trim a song to a 60-second "short mode" window by clamping the end time */
export function trimSongToShortMode(song: Song): Song {
  const startTime = song.start || 0;
  const endTime = Math.min(startTime + 60000, song.end || song.duration);
  return { ...song, start: startTime, end: endTime };
}

// ─── Voting Song Picker ──────────────────────────────────────────────────────

/** Pick random songs from the non-duet pool for voting, applying optional genre/language/combined filters */
export function pickRandomVotingSongs(
  filterGenre: string = 'all',
  filterLanguage: string = 'all',
  filterCombined: boolean = true,
  count: number = 3,
): Song[] {
  const songs = getNonDuetSongs();
  const filtered = filterSongs(songs, filterGenre, filterLanguage, filterCombined);
  return shuffleArray(filtered).slice(0, count);
}
