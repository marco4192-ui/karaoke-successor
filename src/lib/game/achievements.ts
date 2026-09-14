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
    type: 'score' | 'combo' | 'accuracy' | 'games' | 'songs' | 'perfect' | 'golden' | 'special'
      // Daily-system counters (per profile)
      | 'daily' | 'streak' | 'weekly'
      // Profile-derived counters
      | 'duet' | 'genre' | 'disney' | 'gamesToday'
      // Long-term progression counters (per profile, 100-achievement expansion)
      | 'level' | 'bestStreak' | 'duelsWon' | 'party';
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

  // ── Daily & Weekly Challenge Achievements (profile renovation) ──
  {
    id: 'daily_starter',
    name: 'Daily Starter',
    nameKey: 'achievements.dailyStarter.name',
    description: 'Complete your first daily challenge',
    descriptionKey: 'achievements.dailyStarter.description',
    icon: '📅',
    category: 'progression',
    rarity: 'common',
    requirement: { type: 'daily', value: 1 },
    reward: { xp: 20 },
  },
  {
    id: 'daily_regular',
    name: 'Daily Regular',
    nameKey: 'achievements.dailyRegular.name',
    description: 'Complete 10 daily challenges',
    descriptionKey: 'achievements.dailyRegular.description',
    icon: '🗓️',
    category: 'progression',
    rarity: 'uncommon',
    requirement: { type: 'daily', value: 10 },
    reward: { xp: 75 },
  },
  {
    id: 'daily_devoted',
    name: 'Daily Devoted',
    nameKey: 'achievements.dailyDevoted.name',
    description: 'Complete 50 daily challenges',
    descriptionKey: 'achievements.dailyDevoted.description',
    icon: '🏅',
    category: 'progression',
    rarity: 'rare',
    requirement: { type: 'daily', value: 50 },
    reward: { xp: 200 },
  },
  {
    id: 'streak_week',
    name: 'On Fire',
    nameKey: 'achievements.streakWeek.name',
    description: 'Keep a 7-day daily streak',
    descriptionKey: 'achievements.streakWeek.description',
    icon: '🔥',
    category: 'progression',
    rarity: 'rare',
    requirement: { type: 'streak', value: 7 },
    reward: { xp: 150 },
  },
  {
    id: 'streak_month',
    name: 'Unstoppable',
    nameKey: 'achievements.streakMonth.name',
    description: 'Keep a 30-day daily streak',
    descriptionKey: 'achievements.streakMonth.description',
    icon: '⚡',
    category: 'progression',
    rarity: 'epic',
    requirement: { type: 'streak', value: 30 },
    reward: { xp: 500, title: 'Unstoppable', titleKey: 'achievements.streakMonth.rewardTitle' },
  },
  {
    id: 'weekly_warrior',
    name: 'Weekly Warrior',
    nameKey: 'achievements.weeklyWarrior.name',
    description: 'Complete 5 weekly challenges',
    descriptionKey: 'achievements.weeklyWarrior.description',
    icon: '📆',
    category: 'progression',
    rarity: 'rare',
    requirement: { type: 'weekly', value: 5 },
    reward: { xp: 150 },
  },

  // ── Extended Performance Achievements ──
  {
    id: 'accuracy_95',
    name: 'Precision Singer',
    nameKey: 'achievements.precisionSinger.name',
    description: 'Get over 95% accuracy',
    descriptionKey: 'achievements.precisionSinger.description',
    icon: '🎯',
    category: 'performance',
    rarity: 'epic',
    requirement: { type: 'accuracy', value: 95 },
    reward: { xp: 200 },
  },
  {
    id: 'golden_rush',
    name: 'Golden Rush',
    nameKey: 'achievements.goldenRush.name',
    description: 'Hit 20 golden notes in a single song',
    descriptionKey: 'achievements.goldenRush.description',
    icon: '✨',
    category: 'performance',
    rarity: 'rare',
    requirement: { type: 'golden', value: 20 },
    reward: { xp: 100 },
  },
  {
    id: 'golden_hundred',
    name: 'Golden Centurion',
    nameKey: 'achievements.goldenCenturion.name',
    description: 'Hit 100 golden notes in total',
    descriptionKey: 'achievements.goldenCenturion.description',
    icon: '💫',
    category: 'performance',
    rarity: 'epic',
    requirement: { type: 'golden', value: 100, cumulative: true },
    reward: { xp: 250 },
  },
  {
    id: 'perfect_fifty',
    name: 'Perfect Fifty',
    nameKey: 'achievements.perfectFifty.name',
    description: 'Hit 50 perfect notes in a single song',
    descriptionKey: 'achievements.perfectFifty.description',
    icon: '💎',
    category: 'performance',
    rarity: 'rare',
    requirement: { type: 'perfect', value: 50 },
    reward: { xp: 100 },
  },
  {
    id: 'lightning_lips',
    name: 'Lightning Lips',
    nameKey: 'achievements.lightningLips.name',
    description: 'Complete a song at 2x speed',
    descriptionKey: 'achievements.lightningLips.description',
    icon: '⚡',
    category: 'special',
    rarity: 'epic',
    requirement: { type: 'special', value: 7 },
    reward: { xp: 200 },
  },

  // ── Social & Variety Achievements ──
  {
    id: 'duet_harmony',
    name: 'Perfect Harmony',
    nameKey: 'achievements.perfectHarmony.name',
    description: 'Sing 10 duets',
    descriptionKey: 'achievements.perfectHarmony.description',
    icon: '🤝',
    category: 'social',
    rarity: 'uncommon',
    requirement: { type: 'duet', value: 10 },
    reward: { xp: 75 },
  },
  {
    id: 'genre_explorer',
    name: 'Genre Explorer',
    nameKey: 'achievements.genreExplorer.name',
    description: 'Sing songs from 5 different genres',
    descriptionKey: 'achievements.genreExplorer.description',
    icon: '🌍',
    category: 'progression',
    rarity: 'uncommon',
    requirement: { type: 'genre', value: 5 },
    reward: { xp: 75 },
  },
  {
    id: 'disney_fan',
    name: 'Disney Fan',
    nameKey: 'achievements.disneyFan.name',
    description: 'Sing 10 Disney songs',
    descriptionKey: 'achievements.disneyFan.description',
    icon: '🏰',
    category: 'special',
    rarity: 'uncommon',
    requirement: { type: 'disney', value: 10 },
    reward: { xp: 100 },
  },
  {
    id: 'night_owl',
    name: 'Night Owl',
    nameKey: 'achievements.nightOwl.name',
    description: 'Finish a song between midnight and 4 AM',
    descriptionKey: 'achievements.nightOwl.description',
    icon: '🦉',
    category: 'special',
    rarity: 'uncommon',
    requirement: { type: 'special', value: 8 },
    reward: { xp: 50 },
  },
  {
    id: 'early_bird',
    name: 'Early Bird',
    nameKey: 'achievements.earlyBird.name',
    description: 'Finish a song before 8 AM',
    descriptionKey: 'achievements.earlyBird.description',
    icon: '🐦',
    category: 'special',
    rarity: 'uncommon',
    requirement: { type: 'special', value: 9 },
    reward: { xp: 50 },
  },
  {
    id: 'marathon_singer',
    name: 'Marathon Singer',
    nameKey: 'achievements.marathonSinger.name',
    description: 'Play 5 games in a single day',
    descriptionKey: 'achievements.marathonSinger.description',
    icon: '🏃',
    category: 'progression',
    rarity: 'rare',
    requirement: { type: 'gamesToday', value: 5 },
    reward: { xp: 150 },
  },

  // ── 100-Achievement Expansion: Extended Performance ──
  {
    id: 'score_9800',
    name: 'Ultra Star',
    nameKey: 'achievements.score9800.name',
    description: 'Score over 9,800 points',
    descriptionKey: 'achievements.score9800.description',
    icon: '⭐',
    category: 'performance',
    rarity: 'epic',
    requirement: { type: 'score', value: 9800 },
    reward: { xp: 400 },
  },
  {
    id: 'score_9900',
    name: 'Beyond Perfection',
    nameKey: 'achievements.score9900.name',
    description: 'Score over 9,900 points',
    descriptionKey: 'achievements.score9900.description',
    icon: '🌟',
    category: 'performance',
    rarity: 'legendary',
    requirement: { type: 'score', value: 9900 },
    reward: { xp: 800, title: 'Beyond Perfection', titleKey: 'achievements.score9900.rewardTitle' },
  },
  {
    id: 'combo_300',
    name: 'Combo Titan',
    nameKey: 'achievements.combo300.name',
    description: 'Achieve a 300 note combo',
    descriptionKey: 'achievements.combo300.description',
    icon: '🗿',
    category: 'performance',
    rarity: 'epic',
    requirement: { type: 'combo', value: 300 },
    reward: { xp: 400 },
  },
  {
    id: 'combo_500',
    name: 'Combo Immortal',
    nameKey: 'achievements.combo500.name',
    description: 'Achieve a 500 note combo',
    descriptionKey: 'achievements.combo500.description',
    icon: '🌋',
    category: 'performance',
    rarity: 'legendary',
    requirement: { type: 'combo', value: 500 },
    reward: { xp: 800, title: 'Combo Immortal', titleKey: 'achievements.combo500.rewardTitle' },
  },
  {
    id: 'accuracy_92',
    name: 'Fine Tuning',
    nameKey: 'achievements.accuracy92.name',
    description: 'Get over 92% accuracy',
    descriptionKey: 'achievements.accuracy92.description',
    icon: '🎚️',
    category: 'performance',
    rarity: 'uncommon',
    requirement: { type: 'accuracy', value: 92 },
    reward: { xp: 100 },
  },
  {
    id: 'accuracy_94',
    name: 'Studio Quality',
    nameKey: 'achievements.accuracy94.name',
    description: 'Get over 94% accuracy',
    descriptionKey: 'achievements.accuracy94.description',
    icon: '🎼',
    category: 'performance',
    rarity: 'uncommon',
    requirement: { type: 'accuracy', value: 94 },
    reward: { xp: 150 },
  },
  {
    id: 'accuracy_96',
    name: 'Sharpshooter',
    nameKey: 'achievements.accuracy96.name',
    description: 'Get over 96% accuracy',
    descriptionKey: 'achievements.accuracy96.description',
    icon: '🎯',
    category: 'performance',
    rarity: 'rare',
    requirement: { type: 'accuracy', value: 96 },
    reward: { xp: 300 },
  },
  {
    id: 'accuracy_97',
    name: 'Laser Precision',
    nameKey: 'achievements.accuracy97.name',
    description: 'Get over 97% accuracy',
    descriptionKey: 'achievements.accuracy97.description',
    icon: '🔬',
    category: 'performance',
    rarity: 'epic',
    requirement: { type: 'accuracy', value: 97 },
    reward: { xp: 450 },
  },
  {
    id: 'accuracy_98',
    name: 'Virtuoso',
    nameKey: 'achievements.accuracy98.name',
    description: 'Get over 98% accuracy',
    descriptionKey: 'achievements.accuracy98.description',
    icon: '🎻',
    category: 'performance',
    rarity: 'epic',
    requirement: { type: 'accuracy', value: 98 },
    reward: { xp: 600 },
  },
  {
    id: 'perfect_75',
    name: 'Perfect Seventy-Five',
    nameKey: 'achievements.perfect75.name',
    description: 'Get 75 perfect notes in a single song',
    descriptionKey: 'achievements.perfect75.description',
    icon: '💠',
    category: 'performance',
    rarity: 'rare',
    requirement: { type: 'perfect', value: 75 },
    reward: { xp: 200 },
  },
  {
    id: 'perfect_100',
    name: 'Perfect Century',
    nameKey: 'achievements.perfect100.name',
    description: 'Get 100 perfect notes in a single song',
    descriptionKey: 'achievements.perfect100.description',
    icon: '💯',
    category: 'performance',
    rarity: 'epic',
    requirement: { type: 'perfect', value: 100 },
    reward: { xp: 350 },
  },
  {
    id: 'perfect_150',
    name: 'Perfect Storm',
    nameKey: 'achievements.perfect150.name',
    description: 'Get 150 perfect notes in a single song',
    descriptionKey: 'achievements.perfect150.description',
    icon: '🌪️',
    category: 'performance',
    rarity: 'legendary',
    requirement: { type: 'perfect', value: 150 },
    reward: { xp: 600 },
  },
  {
    id: 'golden_30',
    name: 'Golden Tide',
    nameKey: 'achievements.golden30.name',
    description: 'Hit 30 golden notes in a single song',
    descriptionKey: 'achievements.golden30.description',
    icon: '🌊',
    category: 'performance',
    rarity: 'rare',
    requirement: { type: 'golden', value: 30 },
    reward: { xp: 200 },
  },
  {
    id: 'golden_40',
    name: 'Golden Symphony',
    nameKey: 'achievements.golden40.name',
    description: 'Hit 40 golden notes in a single song',
    descriptionKey: 'achievements.golden40.description',
    icon: '🎹',
    category: 'performance',
    rarity: 'epic',
    requirement: { type: 'golden', value: 40 },
    reward: { xp: 350 },
  },

  // ── 100-Achievement Expansion: Cumulative Note Grinders ──
  {
    id: 'perfect_500',
    name: 'Perfect Machine',
    nameKey: 'achievements.perfect500.name',
    description: 'Hit 500 perfect notes in total',
    descriptionKey: 'achievements.perfect500.description',
    icon: '🤖',
    category: 'performance',
    rarity: 'uncommon',
    requirement: { type: 'perfect', value: 500, cumulative: true },
    reward: { xp: 250 },
  },
  {
    id: 'perfect_1000',
    name: 'Precision Powerhouse',
    nameKey: 'achievements.perfect1000.name',
    description: 'Hit 1,000 perfect notes in total',
    descriptionKey: 'achievements.perfect1000.description',
    icon: '⚙️',
    category: 'performance',
    rarity: 'rare',
    requirement: { type: 'perfect', value: 1000, cumulative: true },
    reward: { xp: 500 },
  },
  {
    id: 'perfect_5000',
    name: 'Perfect Avalanche',
    nameKey: 'achievements.perfect5000.name',
    description: 'Hit 5,000 perfect notes in total',
    descriptionKey: 'achievements.perfect5000.description',
    icon: '🏔️',
    category: 'performance',
    rarity: 'epic',
    requirement: { type: 'perfect', value: 5000, cumulative: true },
    reward: { xp: 1500 },
  },
  {
    id: 'perfect_10000',
    name: 'Perfect Ten Thousand',
    nameKey: 'achievements.perfect10000.name',
    description: 'Hit 10,000 perfect notes in total',
    descriptionKey: 'achievements.perfect10000.description',
    icon: '🌌',
    category: 'performance',
    rarity: 'legendary',
    requirement: { type: 'perfect', value: 10000, cumulative: true },
    reward: { xp: 4000, title: 'Perfect Ten Thousand', titleKey: 'achievements.perfect10000.rewardTitle' },
  },
  {
    id: 'golden_250',
    name: 'Golden Harvest',
    nameKey: 'achievements.golden250.name',
    description: 'Hit 250 golden notes in total',
    descriptionKey: 'achievements.golden250.description',
    icon: '🌾',
    category: 'performance',
    rarity: 'rare',
    requirement: { type: 'golden', value: 250, cumulative: true },
    reward: { xp: 500 },
  },
  {
    id: 'golden_1000',
    name: 'Golden Downpour',
    nameKey: 'achievements.golden1000.name',
    description: 'Hit 1,000 golden notes in total',
    descriptionKey: 'achievements.golden1000.description',
    icon: '🌧️',
    category: 'performance',
    rarity: 'epic',
    requirement: { type: 'golden', value: 1000, cumulative: true },
    reward: { xp: 1500 },
  },
  {
    id: 'golden_5000',
    name: 'Midas Voice',
    nameKey: 'achievements.golden5000.name',
    description: 'Hit 5,000 golden notes in total',
    descriptionKey: 'achievements.golden5000.description',
    icon: '🥇',
    category: 'performance',
    rarity: 'legendary',
    requirement: { type: 'golden', value: 5000, cumulative: true },
    reward: { xp: 4000, title: 'Midas Voice', titleKey: 'achievements.golden5000.rewardTitle' },
  },

  // ── 100-Achievement Expansion: Long-Term Progression ──
  {
    id: 'songs_250',
    name: 'Songbook Veteran',
    nameKey: 'achievements.songs250.name',
    description: 'Complete 250 songs',
    descriptionKey: 'achievements.songs250.description',
    icon: '📚',
    category: 'progression',
    rarity: 'epic',
    requirement: { type: 'songs', value: 250, cumulative: true },
    reward: { xp: 750 },
  },
  {
    id: 'songs_500',
    name: 'Half-Thousand Club',
    nameKey: 'achievements.songs500.name',
    description: 'Complete 500 songs',
    descriptionKey: 'achievements.songs500.description',
    icon: '🎖️',
    category: 'progression',
    rarity: 'epic',
    requirement: { type: 'songs', value: 500, cumulative: true },
    reward: { xp: 1500 },
  },
  {
    id: 'songs_1000',
    name: 'Thousand-Song Legend',
    nameKey: 'achievements.songs1000.name',
    description: 'Complete 1,000 songs',
    descriptionKey: 'achievements.songs1000.description',
    icon: '🏆',
    category: 'progression',
    rarity: 'legendary',
    requirement: { type: 'songs', value: 1000, cumulative: true },
    reward: { xp: 5000, title: 'Thousand-Song Legend', titleKey: 'achievements.songs1000.rewardTitle' },
  },
  {
    id: 'games_50',
    name: 'Frequent Singer',
    nameKey: 'achievements.games50.name',
    description: 'Play 50 games',
    descriptionKey: 'achievements.games50.description',
    icon: '🕹️',
    category: 'progression',
    rarity: 'uncommon',
    requirement: { type: 'games', value: 50, cumulative: true },
    reward: { xp: 200 },
  },
  {
    id: 'games_100',
    name: 'Century Club',
    nameKey: 'achievements.games100.name',
    description: 'Play 100 games',
    descriptionKey: 'achievements.games100.description',
    icon: '💯',
    category: 'progression',
    rarity: 'rare',
    requirement: { type: 'games', value: 100, cumulative: true },
    reward: { xp: 500 },
  },
  {
    id: 'games_250',
    name: 'Arcade Regular',
    nameKey: 'achievements.games250.name',
    description: 'Play 250 games',
    descriptionKey: 'achievements.games250.description',
    icon: '🎡',
    category: 'progression',
    rarity: 'epic',
    requirement: { type: 'games', value: 250, cumulative: true },
    reward: { xp: 1250 },
  },
  {
    id: 'games_500',
    name: 'Marathon Maniac',
    nameKey: 'achievements.games500.name',
    description: 'Play 500 games',
    descriptionKey: 'achievements.games500.description',
    icon: '🚀',
    category: 'progression',
    rarity: 'legendary',
    requirement: { type: 'games', value: 500, cumulative: true },
    reward: { xp: 3000, title: 'Marathon Maniac', titleKey: 'achievements.games500.rewardTitle' },
  },
  {
    id: 'level_25',
    name: 'Seasoned Singer',
    nameKey: 'achievements.level25.name',
    description: 'Reach level 25',
    descriptionKey: 'achievements.level25.description',
    icon: '📈',
    category: 'progression',
    rarity: 'rare',
    requirement: { type: 'level', value: 25 },
    reward: { xp: 500 },
  },
  {
    id: 'level_50',
    name: 'Elite Vocalist',
    nameKey: 'achievements.level50.name',
    description: 'Reach level 50',
    descriptionKey: 'achievements.level50.description',
    icon: '🎗️',
    category: 'progression',
    rarity: 'epic',
    requirement: { type: 'level', value: 50 },
    reward: { xp: 1500, title: 'Elite Vocalist', titleKey: 'achievements.level50.rewardTitle' },
  },
  {
    id: 'level_100',
    name: 'Level 100 Legend',
    nameKey: 'achievements.level100.name',
    description: 'Reach level 100',
    descriptionKey: 'achievements.level100.description',
    icon: '👑',
    category: 'progression',
    rarity: 'legendary',
    requirement: { type: 'level', value: 100 },
    reward: { xp: 5000, title: 'Level 100 Legend', titleKey: 'achievements.level100.rewardTitle' },
  },

  // ── 100-Achievement Expansion: Daily & Weekly Grinders ──
  {
    id: 'daily_100',
    name: 'Daily Centurion',
    nameKey: 'achievements.daily100.name',
    description: 'Complete 100 daily challenges',
    descriptionKey: 'achievements.daily100.description',
    icon: '🏅',
    category: 'progression',
    rarity: 'epic',
    requirement: { type: 'daily', value: 100 },
    reward: { xp: 1500 },
  },
  {
    id: 'daily_250',
    name: 'Daily Diehard',
    nameKey: 'achievements.daily250.name',
    description: 'Complete 250 daily challenges',
    descriptionKey: 'achievements.daily250.description',
    icon: '🔁',
    category: 'progression',
    rarity: 'legendary',
    requirement: { type: 'daily', value: 250 },
    reward: { xp: 3000 },
  },
  {
    id: 'daily_500',
    name: 'Daily Immortal',
    nameKey: 'achievements.daily500.name',
    description: 'Complete 500 daily challenges',
    descriptionKey: 'achievements.daily500.description',
    icon: '⏳',
    category: 'progression',
    rarity: 'legendary',
    requirement: { type: 'daily', value: 500 },
    reward: { xp: 5000, title: 'Daily Immortal', titleKey: 'achievements.daily500.rewardTitle' },
  },
  {
    id: 'streak_60',
    name: 'Iron Will',
    nameKey: 'achievements.streak60.name',
    description: 'Keep a 60-day daily streak',
    descriptionKey: 'achievements.streak60.description',
    icon: '🛡️',
    category: 'progression',
    rarity: 'epic',
    requirement: { type: 'bestStreak', value: 60 },
    reward: { xp: 1000 },
  },
  {
    id: 'streak_100',
    name: 'Hundred-Day Hero',
    nameKey: 'achievements.streak100.name',
    description: 'Keep a 100-day daily streak',
    descriptionKey: 'achievements.streak100.description',
    icon: '⏰',
    category: 'progression',
    rarity: 'legendary',
    requirement: { type: 'bestStreak', value: 100 },
    reward: { xp: 2000 },
  },
  {
    id: 'streak_180',
    name: 'Half-Year Devotion',
    nameKey: 'achievements.streak180.name',
    description: 'Keep a 180-day daily streak',
    descriptionKey: 'achievements.streak180.description',
    icon: '🗓️',
    category: 'progression',
    rarity: 'legendary',
    requirement: { type: 'bestStreak', value: 180 },
    reward: { xp: 3500, title: 'Half-Year Devotion', titleKey: 'achievements.streak180.rewardTitle' },
  },
  {
    id: 'streak_365',
    name: 'Yearly Legend',
    nameKey: 'achievements.streak365.name',
    description: 'Keep a 365-day daily streak',
    descriptionKey: 'achievements.streak365.description',
    icon: '🎆',
    category: 'progression',
    rarity: 'legendary',
    requirement: { type: 'bestStreak', value: 365 },
    reward: { xp: 7500, title: 'Yearly Legend', titleKey: 'achievements.streak365.rewardTitle' },
  },
  {
    id: 'weekly_15',
    name: 'Weekly Stalwart',
    nameKey: 'achievements.weekly15.name',
    description: 'Complete 15 weekly challenges',
    descriptionKey: 'achievements.weekly15.description',
    icon: '📘',
    category: 'progression',
    rarity: 'rare',
    requirement: { type: 'weekly', value: 15 },
    reward: { xp: 500 },
  },
  {
    id: 'weekly_30',
    name: 'Weekly Pillar',
    nameKey: 'achievements.weekly30.name',
    description: 'Complete 30 weekly challenges',
    descriptionKey: 'achievements.weekly30.description',
    icon: '🏛️',
    category: 'progression',
    rarity: 'epic',
    requirement: { type: 'weekly', value: 30 },
    reward: { xp: 1200 },
  },
  {
    id: 'weekly_52',
    name: 'Year of Weeks',
    nameKey: 'achievements.weekly52.name',
    description: 'Complete 52 weekly challenges',
    descriptionKey: 'achievements.weekly52.description',
    icon: '📆',
    category: 'progression',
    rarity: 'legendary',
    requirement: { type: 'weekly', value: 52 },
    reward: { xp: 3000, title: 'Year of Weeks', titleKey: 'achievements.weekly52.rewardTitle' },
  },
  {
    id: 'encore_10',
    name: 'Encore!',
    nameKey: 'achievements.encore10.name',
    description: 'Play 10 games in a single day',
    descriptionKey: 'achievements.encore10.description',
    icon: '🎤',
    category: 'progression',
    rarity: 'epic',
    requirement: { type: 'gamesToday', value: 10 },
    reward: { xp: 500 },
  },

  // ── 100-Achievement Expansion: Social Grinders ──
  {
    id: 'duets_25',
    name: 'Duet Devotee',
    nameKey: 'achievements.duets25.name',
    description: 'Sing 25 duets',
    descriptionKey: 'achievements.duets25.description',
    icon: '👯',
    category: 'social',
    rarity: 'rare',
    requirement: { type: 'duet', value: 25 },
    reward: { xp: 400 },
  },
  {
    id: 'duets_50',
    name: 'Dynamic Duo',
    nameKey: 'achievements.duets50.name',
    description: 'Sing 50 duets',
    descriptionKey: 'achievements.duets50.description',
    icon: '👫',
    category: 'social',
    rarity: 'epic',
    requirement: { type: 'duet', value: 50 },
    reward: { xp: 1000 },
  },
  {
    id: 'duets_100',
    name: 'Duet Century',
    nameKey: 'achievements.duets100.name',
    description: 'Sing 100 duets',
    descriptionKey: 'achievements.duets100.description',
    icon: '💞',
    category: 'social',
    rarity: 'legendary',
    requirement: { type: 'duet', value: 100 },
    reward: { xp: 2500, title: 'Duet Century', titleKey: 'achievements.duets100.rewardTitle' },
  },
  {
    id: 'duels_5',
    name: 'Duelist',
    nameKey: 'achievements.duels5.name',
    description: 'Win 5 duels',
    descriptionKey: 'achievements.duels5.description',
    icon: '🤺',
    category: 'social',
    rarity: 'uncommon',
    requirement: { type: 'duelsWon', value: 5 },
    reward: { xp: 150 },
  },
  {
    id: 'duels_10',
    name: 'Duel Master',
    nameKey: 'achievements.duels10.name',
    description: 'Win 10 duels',
    descriptionKey: 'achievements.duels10.description',
    icon: '🥋',
    category: 'social',
    rarity: 'rare',
    requirement: { type: 'duelsWon', value: 10 },
    reward: { xp: 400 },
  },
  {
    id: 'duels_25',
    name: 'Duel Overlord',
    nameKey: 'achievements.duels25.name',
    description: 'Win 25 duels',
    descriptionKey: 'achievements.duels25.description',
    icon: '🐉',
    category: 'social',
    rarity: 'epic',
    requirement: { type: 'duelsWon', value: 25 },
    reward: { xp: 1000, title: 'Duel Overlord', titleKey: 'achievements.duels25.rewardTitle' },
  },
  {
    id: 'party_10',
    name: 'Party Animal',
    nameKey: 'achievements.party10.name',
    description: 'Play 10 party games',
    descriptionKey: 'achievements.party10.description',
    icon: '🎊',
    category: 'social',
    rarity: 'uncommon',
    requirement: { type: 'party', value: 10 },
    reward: { xp: 200 },
  },
  {
    id: 'party_25',
    name: 'Life of the Party',
    nameKey: 'achievements.party25.name',
    description: 'Play 25 party games',
    descriptionKey: 'achievements.party25.description',
    icon: '🥳',
    category: 'social',
    rarity: 'rare',
    requirement: { type: 'party', value: 25 },
    reward: { xp: 500 },
  },
  {
    id: 'party_50',
    name: 'Party Legend',
    nameKey: 'achievements.party50.name',
    description: 'Play 50 party games',
    descriptionKey: 'achievements.party50.description',
    icon: '🍾',
    category: 'social',
    rarity: 'epic',
    requirement: { type: 'party', value: 50 },
    reward: { xp: 1250 },
  },

  // ── 100-Achievement Expansion: Specials & Variety ──
  {
    id: 'disney_25',
    name: 'Disney Enthusiast',
    nameKey: 'achievements.disney25.name',
    description: 'Sing 25 Disney songs',
    descriptionKey: 'achievements.disney25.description',
    icon: '🎠',
    category: 'special',
    rarity: 'rare',
    requirement: { type: 'disney', value: 25 },
    reward: { xp: 500 },
  },
  {
    id: 'disney_50',
    name: 'Once Upon a Song',
    nameKey: 'achievements.disney50.name',
    description: 'Sing 50 Disney songs',
    descriptionKey: 'achievements.disney50.description',
    icon: '🧚',
    category: 'special',
    rarity: 'epic',
    requirement: { type: 'disney', value: 50 },
    reward: { xp: 1200, title: 'Disney Royalty', titleKey: 'achievements.disney50.rewardTitle' },
  },
  {
    id: 'genres_8',
    name: 'Genre Wanderer',
    nameKey: 'achievements.genres8.name',
    description: 'Sing songs from 8 different genres',
    descriptionKey: 'achievements.genres8.description',
    icon: '🧭',
    category: 'progression',
    rarity: 'uncommon',
    requirement: { type: 'genre', value: 8 },
    reward: { xp: 150 },
  },
  {
    id: 'genres_10',
    name: 'Genre Aficionado',
    nameKey: 'achievements.genres10.name',
    description: 'Sing songs from 10 different genres',
    descriptionKey: 'achievements.genres10.description',
    icon: '🗺️',
    category: 'progression',
    rarity: 'rare',
    requirement: { type: 'genre', value: 10 },
    reward: { xp: 350 },
  },
  {
    id: 'clean_sheet',
    name: 'Clean Sheet',
    nameKey: 'achievements.cleanSheet.name',
    description: 'Finish a song with 50+ notes and zero misses',
    descriptionKey: 'achievements.cleanSheet.description',
    icon: '🧼',
    category: 'special',
    rarity: 'epic',
    requirement: { type: 'special', value: 10 },
    reward: { xp: 300 },
  },
  {
    id: 'weekend_singer',
    name: 'Weekend Singer',
    nameKey: 'achievements.weekendSinger.name',
    description: 'Finish a song on Saturday or Sunday',
    descriptionKey: 'achievements.weekendSinger.description',
    icon: '🌴',
    category: 'special',
    rarity: 'common',
    requirement: { type: 'special', value: 11 },
    reward: { xp: 50 },
  },
  {
    id: 'lunch_break',
    name: 'Lunch Break',
    nameKey: 'achievements.lunchBreak.name',
    description: 'Finish a song between 12 and 2 PM',
    descriptionKey: 'achievements.lunchBreak.description',
    icon: '🥪',
    category: 'special',
    rarity: 'common',
    requirement: { type: 'special', value: 12 },
    reward: { xp: 50 },
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