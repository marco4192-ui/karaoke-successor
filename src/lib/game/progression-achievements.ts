// Achievement Definitions, Title Thresholds, and Challenge Requirement Checking

import { RANKS, CHALLENGE_MODES } from './progression-levels';

// ===================== TITLE UNLOCK THRESHOLDS =====================

/** Level required to unlock "Rising Star" title */
export const TITLE_RISING_STAR_LEVEL = 5;
/** Level required to unlock "Veteran" title */
export const TITLE_VETERAN_LEVEL = 25;
/** Level required to unlock "Elite" title */
export const TITLE_ELITE_LEVEL = 50;
/** Level required to unlock "Master" title */
export const TITLE_MASTER_LEVEL = 100;

/** Total golden notes to unlock "Golden Voice" title */
export const TITLE_GOLDEN_VOICE_NOTES = 100;
/** Max combo to unlock "Combo Master" title */
export const TITLE_COMBO_MASTER_COMBO = 100;
/** Songs completed to unlock "Dedicated Singer" title */
export const TITLE_DEDICATED_SINGER_SONGS = 100;
/** Songs completed to unlock "Karaoke Addict" title */
export const TITLE_KARAOKE_ADDICT_SONGS = 500;
/** Songs completed to unlock "Lifetime Achiever" title */
export const TITLE_LIFETIME_ACHIEVER_SONGS = 1000;

// ===================== CHALLENGE REQUIREMENT CHECKING =====================

/**
 * Check whether a player meets the requirements for a given challenge mode.
 * Returns null if the challenge is available, or a human-readable reason string
 * if a requirement is not met.
 */
export function getChallengeRequirementStatus(
  challengeId: string,
  playerLevel: number,
  songsCompleted: number,
  unlockedTitles: string[],
  totalXP?: number
): string | null {
  const mode = CHALLENGE_MODES.find(m => m.id === challengeId);
  if (!mode || !mode.requirements) return null;

  for (const req of mode.requirements) {
    switch (req.type) {
      case 'min_level':
        if (playerLevel < (req.value as number)) {
          return `Requires level ${req.value} (you are level ${playerLevel})`;
        }
        break;
      case 'min_songs':
        if (songsCompleted < (req.value as number)) {
          return `Requires ${req.value} songs completed (you have ${songsCompleted})`;
        }
        break;
      case 'achievement':
        if (!unlockedTitles.includes(req.value as string)) {
          return `Requires achievement: ${req.value}`;
        }
        break;
      case 'rank': {
        if (totalXP === undefined) {
          return `Rank requirement cannot be verified (no XP data available)`;
        }
        const requiredRankIndex = RANKS.findIndex(r => r.name === req.value);
        if (requiredRankIndex < 0) {
          return `Unknown rank "${req.value}"`;
        }
        // findIndex returns the index of the lowest rank whose minXP the player meets.
        // No off-by-one subtraction — having exactly the minXP for a rank means you ARE that rank.
        const playerRankIndex = RANKS.findIndex(r => totalXP >= r.minXP);
        if (playerRankIndex < requiredRankIndex) {
          return `Requires rank "${req.value}" (you are "${RANKS[playerRankIndex].name}")`;
        }
        break;
      }
    }
  }
  return null;
}
