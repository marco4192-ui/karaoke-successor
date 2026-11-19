import type { GameMode } from '@/types/game';

/**
 * R81: the modes that count as "party" games. Party games produce NO
 * highscores — not locally, not online, not on daily/weekly boards: they
 * have no comparable score scale (2-player BR is easier than 25-player BR
 * and the group composition is never equal).
 *
 * Shared by the post-game pipeline (use-post-game-processing), the
 * highscore boards and the song highscore modal.
 */
export const PARTY_GAME_MODES: readonly string[] = [
  'pass-the-mic',
  'medley',
  'battle-royale',
  'competitive-words',
  'competitive-blind',
  'companion-singalong',
];

export function isPartyGameMode(mode: GameMode | string): boolean {
  return PARTY_GAME_MODES.includes(mode);
}
