// Achievement System for Karaoke ZERO
//
// R3 refactor: the pure achievement data (ACHIEVEMENT_DEFINITIONS + the
// AchievementDefinition type) now lives in achievement-definitions.ts (which
// merges the thematic data files). This module keeps the logic —
// localization, the after-game achievement check and the rarity colors — and
// re-exports the data so existing imports from '@/lib/game/achievements'
// keep working unchanged.

import type { Language } from '@/lib/i18n/locales';
import { t } from '@/lib/i18n/translations';

import { ACHIEVEMENT_DEFINITIONS } from './achievement-definitions';
import type { AchievementDefinition } from './achievement-definitions';

export { ACHIEVEMENT_DEFINITIONS };
export type { AchievementDefinition } from './achievement-definitions';

// ===================== LOCALIZATION HELPERS =====================

/** Return a localized copy of an achievement definition. */
export function getLocalizedAchievement(
  def: AchievementDefinition,
  language?: Language,
): { name: string; description: string; rewardTitle?: string } {
  return {
    name: t(def.nameKey, language),
    description: t(def.descriptionKey, language),
    rewardTitle: def.reward?.titleKey ? t(def.reward.titleKey, language) : def.reward?.title,
  };
}

// ===================== ACHIEVEMENT CHECKING =====================

/** Context passed to the achievement checker after each game */
interface AchievementGameContext {
  score: number;
  accuracy: number;
  maxCombo: number;
  perfectNotes: number;
  goldenNotes: number;
  notesHit: number;
  notesMissed: number;
  gameMode: string;
  difficulty: string;
  // Cumulative stats from player-progression
  totalSongsCompleted: number;
  totalGamesPlayed: number;
  totalGoldenNotes: number;
  totalPerfectNotes: number;
  // Daily-system counters (per profile)
  dailyCompletions: number;
  dailyStreak: number;
  weeklyCompletions: number;
  /** Longest daily streak ever reached (per profile) */
  bestStreak: number;
  // Profile-derived counters
  duetGames: number;
  genreCount: number;
  disneyGames: number;
  gamesToday: number;
  hourOfDay: number;
  /** Day of the week (0 = Sunday … 6 = Saturday) */
  dayOfWeek: number;
  // Level projection (per profile, includes the XP of the game just played)
  level: number;
  // localStorage-backed per-profile counters
  duelsWon: number;
  partyGames: number;
  // Special flags
  isPartyMode: boolean;
  isDuelWin: boolean;
  isPassTheMic: boolean;
  isBlindMode: boolean;
  isSpeedMode: boolean;
  playbackRate: number;
  // Comeback detection: combo >= 50 after missing >= 10 notes
  hadComeback: boolean;
}

/** Result of an achievement check pass */
interface AchievementCheckResult {
  newlyUnlocked: Array<{
    id: string;
    name: string;
    nameKey: string;
    description: string;
    descriptionKey: string;
    icon: string;
    xp: number;
    title?: string;
    titleKey?: string;
  }>;
  totalXPBonus: number;
}

/**
 * Check all achievement definitions against the current game context
 * and cumulative player stats. Returns newly unlocked achievements.
 *
 * This is called once per game from results-screen.tsx after saveHighscore.
 */
export function checkAndUnlockAchievements(
  alreadyUnlockedIds: string[],
  ctx: AchievementGameContext,
): AchievementCheckResult {
  const result: AchievementCheckResult = { newlyUnlocked: [], totalXPBonus: 0 };

  for (const def of ACHIEVEMENT_DEFINITIONS) {
    // Skip already unlocked
    if (alreadyUnlockedIds.includes(def.id)) continue;

    if (meetsRequirement(def, ctx)) {
      const entry = {
        id: def.id,
        name: def.name,
        nameKey: def.nameKey,
        description: def.description,
        descriptionKey: def.descriptionKey,
        icon: def.icon,
        xp: def.reward?.xp || 0,
        title: def.reward?.title,
        titleKey: def.reward?.titleKey,
      };
      result.newlyUnlocked.push(entry);
      result.totalXPBonus += entry.xp;
    }
  }

  return result;
}

/** Check whether a single achievement definition is met */
function meetsRequirement(def: AchievementDefinition, ctx: AchievementGameContext): boolean {
  const { type, value, cumulative } = def.requirement;

  switch (type) {
    // --- Per-game thresholds (non-cumulative) ---
    case 'score':
      return ctx.score >= value;

    case 'combo':
      return ctx.maxCombo >= value;

    case 'accuracy': {
      // 'shower_singer': accuracy <= 20, 'accuracy_90': accuracy >= 90, 'perfect_song': accuracy >= 99.5
      if (def.id === 'shower_singer') {
        return ctx.accuracy <= value;
      }
      return ctx.accuracy >= value;
    }

    case 'perfect':
      // Cumulative perfect notes across all games
      if (cumulative) {
        return ctx.totalPerfectNotes >= value;
      }
      // Per-game: perfect notes in this single song
      return ctx.perfectNotes >= value;

    case 'golden':
      if (cumulative) {
        return ctx.totalGoldenNotes >= value;
      }
      return ctx.goldenNotes >= value;

    // --- Cumulative progression ---
    case 'songs':
      return ctx.totalSongsCompleted >= value;

    case 'games':
      return ctx.totalGamesPlayed >= value;

    // --- Daily-system counters (per profile) ---
    case 'daily':
      return ctx.dailyCompletions >= value;

    case 'streak':
      return ctx.dailyStreak >= value;

    case 'weekly':
      return ctx.weeklyCompletions >= value;

    case 'bestStreak':
      return ctx.bestStreak >= value;

    case 'level':
      return ctx.level >= value;

    case 'duelsWon':
      return ctx.duelsWon >= value;

    case 'party':
      return ctx.partyGames >= value;

    // --- Profile-derived counters ---
    case 'duet':
      return ctx.duetGames >= value;

    case 'genre':
      return ctx.genreCount >= value;

    case 'disney':
      return ctx.disneyGames >= value;

    case 'gamesToday':
      return ctx.gamesToday >= value;

    // --- Special one-shot checks ---
    case 'special':
      switch (def.id) {
        case 'party_time':
          return ctx.isPartyMode;
        case 'duel_winner':
          return ctx.isDuelWin;
        case 'pass_the_mic':
          return ctx.isPassTheMic;
        case 'comeback_king':
          return ctx.hadComeback;
        case 'speed_demon':
          return ctx.playbackRate >= 1.5;
        case 'lightning_lips':
          return ctx.playbackRate >= 2.0;
        case 'blind_master':
          return ctx.isBlindMode;
        case 'night_owl':
          return ctx.hourOfDay >= 0 && ctx.hourOfDay < 4;
        case 'early_bird':
          return ctx.hourOfDay >= 4 && ctx.hourOfDay < 8;
        case 'clean_sheet':
          // Finish a song with at least 50 notes and none missed
          return ctx.notesMissed === 0 && (ctx.notesHit + ctx.notesMissed) >= 50;
        case 'weekend_singer':
          // 0 = Sunday, 6 = Saturday
          return ctx.dayOfWeek === 0 || ctx.dayOfWeek === 6;
        case 'lunch_break':
          return ctx.hourOfDay >= 12 && ctx.hourOfDay < 14;
        default:
          return false;
      }

    default:
      return false;
  }
}

// Get rarity color
export function getRarityColor(rarity: AchievementDefinition['rarity']): string {
  switch (rarity) {
    case 'common': return '#9ca3af';
    case 'uncommon': return '#22c55e';
    case 'rare': return '#3b82f6';
    case 'epic': return '#a855f7';
    case 'legendary': return '#f59e0b';
    default: return '#9ca3af';
  }
}