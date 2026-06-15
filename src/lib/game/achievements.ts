// Achievement System for Karaoke ZERO

import type { Language } from '@/lib/i18n/locales';
import { t } from '@/lib/i18n/translations';

interface AchievementDefinition {
  id: string;
  name: string;
  nameKey: string;
  description: string;
  descriptionKey: string;
  icon: string;
  category: 'performance' | 'social' | 'progression' | 'special';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  requirement: {
    type: 'score' | 'combo' | 'accuracy' | 'games' | 'songs' | 'perfect' | 'golden' | 'special';
    value: number;
    cumulative?: boolean;
  };
  reward?: {
    xp?: number;
    title?: string;
    titleKey?: string;
    color?: string;
  };
}

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  // Performance Achievements
  {
    id: 'first_note',
    name: 'First Note',
    nameKey: 'achievements.firstNote.name',
    description: 'Hit your first note',
    descriptionKey: 'achievements.firstNote.description',
    icon: '🎵',
    category: 'performance',
    rarity: 'common',
    requirement: { type: 'perfect', value: 1, cumulative: true },
    reward: { xp: 10 },
  },
  {
    id: 'perfect_ten',
    name: 'Perfect Ten',
    nameKey: 'achievements.perfectTen.name',
    description: 'Get 10 Perfect hits in a single song',
    descriptionKey: 'achievements.perfectTen.description',
    icon: '✨',
    category: 'performance',
    rarity: 'common',
    requirement: { type: 'perfect', value: 10 },
    reward: { xp: 25 },
  },
  {
    id: 'combo_master',
    name: 'Combo Master',
    nameKey: 'achievements.comboMaster.name',
    description: 'Achieve a 50 note combo',
    descriptionKey: 'achievements.comboMaster.description',
    icon: '🔥',
    category: 'performance',
    rarity: 'uncommon',
    requirement: { type: 'combo', value: 50 },
    reward: { xp: 50 },
  },
  {
    id: 'combo_king',
    name: 'Combo King',
    nameKey: 'achievements.comboKing.name',
    description: 'Achieve a 100 note combo',
    descriptionKey: 'achievements.comboKing.description',
    icon: '👑',
    category: 'performance',
    rarity: 'rare',
    requirement: { type: 'combo', value: 100 },
    reward: { xp: 100, title: 'Combo King', titleKey: 'achievements.comboKing.rewardTitle' },
  },
  {
    id: 'combo_legend',
    name: 'Combo Legend',
    nameKey: 'achievements.comboLegend.name',
    description: 'Achieve a 200 note combo',
    descriptionKey: 'achievements.comboLegend.description',
    icon: '🌟',
    category: 'performance',
    rarity: 'legendary',
    requirement: { type: 'combo', value: 200 },
    reward: { xp: 250, title: 'Combo Legend', titleKey: 'achievements.comboLegend.rewardTitle' },
  },
  {
    id: 'perfect_song',
    name: 'Perfect Song',
    nameKey: 'achievements.perfectSong.name',
    description: 'Get 99.5%+ accuracy on a song',
    descriptionKey: 'achievements.perfectSong.description',
    icon: '💎',
    category: 'performance',
    rarity: 'legendary',
    requirement: { type: 'accuracy', value: 99.5 },
    reward: { xp: 500, title: 'Perfectionist', titleKey: 'achievements.perfectSong.rewardTitle' },
  },
  {
    id: 'accuracy_90',
    name: 'Pitch Perfect',
    nameKey: 'achievements.pitchPerfect.name',
    description: 'Get over 90% accuracy',
    descriptionKey: 'achievements.pitchPerfect.description',
    icon: '🎯',
    category: 'performance',
    rarity: 'rare',
    requirement: { type: 'accuracy', value: 90 },
    reward: { xp: 75 },
  },
  {
    id: 'score_8k',
    name: 'Rising Star',
    nameKey: 'achievements.risingStar.name',
    description: 'Score over 8,000 points',
    descriptionKey: 'achievements.risingStar.description',
    icon: '⭐',
    category: 'performance',
    rarity: 'uncommon',
    requirement: { type: 'score', value: 8000 },
    reward: { xp: 50 },
  },
  {
    id: 'score_9k',
    name: 'Score Master',
    nameKey: 'achievements.scoreMaster.name',
    description: 'Score over 9,000 points',
    descriptionKey: 'achievements.scoreMaster.description',
    icon: '🏆',
    category: 'performance',
    rarity: 'rare',
    requirement: { type: 'score', value: 9000 },
    reward: { xp: 150 },
  },
  {
    id: 'score_9500',
    name: 'Flawless',
    nameKey: 'achievements.flawless.name',
    description: 'Score over 9,500 points',
    descriptionKey: 'achievements.flawless.description',
    icon: '💎',
    category: 'performance',
    rarity: 'legendary',
    requirement: { type: 'score', value: 9500 },
    reward: { xp: 300, title: 'Flawless', titleKey: 'achievements.flawless.rewardTitle' },
  },
  {
    id: 'golden_collector',
    name: 'Golden Collector',
    nameKey: 'achievements.goldenCollector.name',
    description: 'Hit 10 golden notes',
    descriptionKey: 'achievements.goldenCollector.description',
    icon: '⭐',
    category: 'performance',
    rarity: 'uncommon',
    requirement: { type: 'golden', value: 10, cumulative: true },
    reward: { xp: 30 },
  },
  {
    id: 'golden_master',
    name: 'Golden Master',
    nameKey: 'achievements.goldenMaster.name',
    description: 'Hit 50 golden notes',
    descriptionKey: 'achievements.goldenMaster.description',
    icon: '🌟',
    category: 'performance',
    rarity: 'rare',
    requirement: { type: 'golden', value: 50, cumulative: true },
    reward: { xp: 100, title: 'Golden Voice', titleKey: 'achievements.goldenMaster.rewardTitle' },
  },

  // Progression Achievements
  {
    id: 'first_song',
    name: 'First Steps',
    nameKey: 'achievements.firstSong.name',
    description: 'Complete your first song',
    descriptionKey: 'achievements.firstSong.description',
    icon: '🎤',
    category: 'progression',
    rarity: 'common',
    requirement: { type: 'songs', value: 1, cumulative: true },
    reward: { xp: 20 },
  },
  {
    id: 'ten_songs',
    name: 'Karaoke Enthusiast',
    nameKey: 'achievements.karaokeEnthusiast.name',
    description: 'Complete 10 songs',
    descriptionKey: 'achievements.karaokeEnthusiast.description',
    icon: '🎶',
    category: 'progression',
    rarity: 'uncommon',
    requirement: { type: 'songs', value: 10, cumulative: true },
    reward: { xp: 50 },
  },
  {
    id: 'fifty_songs',
    name: 'Karaoke Regular',
    nameKey: 'achievements.karaokeRegular.name',
    description: 'Complete 50 songs',
    descriptionKey: 'achievements.karaokeRegular.description',
    icon: '🎪',
    category: 'progression',
    rarity: 'rare',
    requirement: { type: 'songs', value: 50, cumulative: true },
    reward: { xp: 150 },
  },
  {
    id: 'hundred_songs',
    name: 'Karaoke Legend',
    nameKey: 'achievements.karaokeLegend.name',
    description: 'Complete 100 songs',
    descriptionKey: 'achievements.karaokeLegend.description',
    icon: '👑',
    category: 'progression',
    rarity: 'legendary',
    requirement: { type: 'songs', value: 100, cumulative: true },
    reward: { xp: 300, title: 'Karaoke Legend', titleKey: 'achievements.karaokeLegend.rewardTitle' },
  },
  {
    id: 'five_games',
    name: 'Getting Started',
    nameKey: 'achievements.gettingStarted.name',
    description: 'Play 5 games',
    descriptionKey: 'achievements.gettingStarted.description',
    icon: '🎮',
    category: 'progression',
    rarity: 'common',
    requirement: { type: 'games', value: 5, cumulative: true },
    reward: { xp: 15 },
  },
  {
    id: 'twenty_games',
    name: 'Dedicated Singer',
    nameKey: 'achievements.dedicatedSinger.name',
    description: 'Play 20 games',
    descriptionKey: 'achievements.dedicatedSinger.description',
    icon: '🎯',
    category: 'progression',
    rarity: 'uncommon',
    requirement: { type: 'games', value: 20, cumulative: true },
    reward: { xp: 40 },
  },

  // Social Achievements
  {
    id: 'party_time',
    name: 'Party Time!',
    nameKey: 'achievements.partyTime.name',
    description: 'Play a party game mode',
    descriptionKey: 'achievements.partyTime.description',
    icon: '🎉',
    category: 'social',
    rarity: 'common',
    requirement: { type: 'special', value: 1 },
    reward: { xp: 25 },
  },
  {
    id: 'duel_winner',
    name: 'Duel Champion',
    nameKey: 'achievements.duelChampion.name',
    description: 'Win a duel match',
    descriptionKey: 'achievements.duelChampion.description',
    icon: '⚔️',
    category: 'social',
    rarity: 'uncommon',
    requirement: { type: 'special', value: 2 },
    reward: { xp: 50 },
  },
  {
    id: 'pass_the_mic',
    name: 'Pass the Mic!',
    nameKey: 'achievements.passTheMic.name',
    description: 'Play Pass the Mic mode',
    descriptionKey: 'achievements.passTheMic.description',
    icon: '🎙️',
    category: 'social',
    rarity: 'common',
    requirement: { type: 'special', value: 3 },
    reward: { xp: 20 },
  },

  // Special Achievements
  {
    id: 'shower_singer',
    name: 'Shower Singer',
    nameKey: 'achievements.showerSinger.name',
    description: 'Score less than 20% on a song',
    descriptionKey: 'achievements.showerSinger.description',
    icon: '🚿',
    category: 'special',
    rarity: 'common',
    requirement: { type: 'accuracy', value: 20 },
    reward: { xp: 5, title: 'Shower Singer', titleKey: 'achievements.showerSinger.rewardTitle' },
  },
  {
    id: 'comeback_king',
    name: 'Comeback King',
    nameKey: 'achievements.comebackKing.name',
    description: 'Get a combo of 50+ after missing 10 notes',
    descriptionKey: 'achievements.comebackKing.description',
    icon: '🦸',
    category: 'special',
    rarity: 'rare',
    requirement: { type: 'special', value: 4 },
    reward: { xp: 75 },
  },
  {
    id: 'speed_demon',
    name: 'Speed Demon',
    nameKey: 'achievements.speedDemon.name',
    description: 'Complete a song at 1.5x speed',
    descriptionKey: 'achievements.speedDemon.description',
    icon: '⚡',
    category: 'special',
    rarity: 'rare',
    requirement: { type: 'special', value: 5 },
    reward: { xp: 100 },
  },
  {
    id: 'blind_master',
    name: 'Blind Master',
    nameKey: 'achievements.blindMaster.name',
    description: 'Complete a song in Blind Karaoke mode',
    descriptionKey: 'achievements.blindMaster.description',
    icon: '🎭',
    category: 'special',
    rarity: 'epic',
    requirement: { type: 'special', value: 6 },
    reward: { xp: 150, title: 'Blind Master', titleKey: 'achievements.blindMaster.rewardTitle' },
  },
];

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
        case 'blind_master':
          return ctx.isBlindMode;
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