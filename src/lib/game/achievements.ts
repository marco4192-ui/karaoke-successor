// Achievement System for Karaoke Successor

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
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
    color?: string;
  };
}

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  // Performance Achievements
  {
    id: 'first_note',
    name: 'First Note',
    description: 'Hit your first note',
    icon: '🎵',
    category: 'performance',
    rarity: 'common',
    requirement: { type: 'perfect', value: 1, cumulative: true },
    reward: { xp: 10 },
  },
  {
    id: 'perfect_ten',
    name: 'Perfect Ten',
    description: 'Get 10 Perfect hits in a single song',
    icon: '✨',
    category: 'performance',
    rarity: 'common',
    requirement: { type: 'perfect', value: 10 },
    reward: { xp: 25 },
  },
  {
    id: 'combo_master',
    name: 'Combo Master',
    description: 'Achieve a 50 note combo',
    icon: '🔥',
    category: 'performance',
    rarity: 'uncommon',
    requirement: { type: 'combo', value: 50 },
    reward: { xp: 50 },
  },
  {
    id: 'combo_king',
    name: 'Combo King',
    description: 'Achieve a 100 note combo',
    icon: '👑',
    category: 'performance',
    rarity: 'rare',
    requirement: { type: 'combo', value: 100 },
    reward: { xp: 100, title: 'Combo King' },
  },
  {
    id: 'combo_legend',
    name: 'Combo Legend',
    description: 'Achieve a 200 note combo',
    icon: '🌟',
    category: 'performance',
    rarity: 'legendary',
    requirement: { type: 'combo', value: 200 },
    reward: { xp: 250, title: 'Combo Legend' },
  },
  {
    id: 'perfect_song',
    name: 'Perfect Song',
    description: 'Get 100% accuracy on a song',
    icon: '💎',
    category: 'performance',
    rarity: 'legendary',
    requirement: { type: 'accuracy', value: 100 },
    reward: { xp: 500, title: 'Perfectionist' },
  },
  {
    id: 'accuracy_90',
    name: 'Pitch Perfect',
    description: 'Get over 90% accuracy',
    icon: '🎯',
    category: 'performance',
    rarity: 'rare',
    requirement: { type: 'accuracy', value: 90 },
    reward: { xp: 75 },
  },
  {
    id: 'score_100k',
    name: 'Score Centurion',
    description: 'Score over 100,000 points',
    icon: '💯',
    category: 'performance',
    rarity: 'uncommon',
    requirement: { type: 'score', value: 100000 },
    reward: { xp: 50 },
  },
  {
    id: 'score_500k',
    name: 'Half Million Club',
    description: 'Score over 500,000 points',
    icon: '🏆',
    category: 'performance',
    rarity: 'rare',
    requirement: { type: 'score', value: 500000 },
    reward: { xp: 150 },
  },
  {
    id: 'score_1m',
    name: 'Millionaire',
    description: 'Score over 1,000,000 points',
    icon: '💰',
    category: 'performance',
    rarity: 'legendary',
    requirement: { type: 'score', value: 1000000 },
    reward: { xp: 300, title: 'Millionaire' },
  },
  {
    id: 'golden_collector',
    name: 'Golden Collector',
    description: 'Hit 10 golden notes',
    icon: '⭐',
    category: 'performance',
    rarity: 'uncommon',
    requirement: { type: 'golden', value: 10, cumulative: true },
    reward: { xp: 30 },
  },
  {
    id: 'golden_master',
    name: 'Golden Master',
    description: 'Hit 50 golden notes',
    icon: '🌟',
    category: 'performance',
    rarity: 'rare',
    requirement: { type: 'golden', value: 50, cumulative: true },
    reward: { xp: 100, title: 'Golden Voice' },
  },

  // Progression Achievements
  {
    id: 'first_song',
    name: 'First Steps',
    description: 'Complete your first song',
    icon: '🎤',
    category: 'progression',
    rarity: 'common',
    requirement: { type: 'songs', value: 1, cumulative: true },
    reward: { xp: 20 },
  },
  {
    id: 'ten_songs',
    name: 'Karaoke Enthusiast',
    description: 'Complete 10 songs',
    icon: '🎶',
    category: 'progression',
    rarity: 'uncommon',
    requirement: { type: 'songs', value: 10, cumulative: true },
    reward: { xp: 50 },
  },
  {
    id: 'fifty_songs',
    name: 'Karaoke Regular',
    description: 'Complete 50 songs',
    icon: '🎪',
    category: 'progression',
    rarity: 'rare',
    requirement: { type: 'songs', value: 50, cumulative: true },
    reward: { xp: 150 },
  },
  {
    id: 'hundred_songs',
    name: 'Karaoke Legend',
    description: 'Complete 100 songs',
    icon: '👑',
    category: 'progression',
    rarity: 'legendary',
    requirement: { type: 'songs', value: 100, cumulative: true },
    reward: { xp: 300, title: 'Karaoke Legend' },
  },
  {
    id: 'five_games',
    name: 'Getting Started',
    description: 'Play 5 games',
    icon: '🎮',
    category: 'progression',
    rarity: 'common',
    requirement: { type: 'games', value: 5, cumulative: true },
    reward: { xp: 15 },
  },
  {
    id: 'twenty_games',
    name: 'Dedicated Singer',
    description: 'Play 20 games',
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
    description: 'Play a party game mode',
    icon: '🎉',
    category: 'social',
    rarity: 'common',
    requirement: { type: 'special', value: 1 },
    reward: { xp: 25 },
  },
  {
    id: 'duel_winner',
    name: 'Duel Champion',
    description: 'Win a duel match',
    icon: '⚔️',
    category: 'social',
    rarity: 'uncommon',
    requirement: { type: 'special', value: 2 },
    reward: { xp: 50 },
  },
  {
    id: 'pass_the_mic',
    name: 'Pass the Mic!',
    description: 'Play Pass the Mic mode',
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
    description: 'Score less than 20% on a song',
    icon: '🚿',
    category: 'special',
    rarity: 'common',
    requirement: { type: 'accuracy', value: 20 },
    reward: { xp: 5, title: 'Shower Singer' },
  },
  {
    id: 'comeback_king',
    name: 'Comeback King',
    description: 'Get a combo of 50+ after missing 10 notes',
    icon: '🦸',
    category: 'special',
    rarity: 'rare',
    requirement: { type: 'special', value: 4 },
    reward: { xp: 75 },
  },
  {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'Complete a song at 1.5x speed',
    icon: '⚡',
    category: 'special',
    rarity: 'rare',
    requirement: { type: 'special', value: 5 },
    reward: { xp: 100 },
  },
  {
    id: 'blind_master',
    name: 'Blind Master',
    description: 'Complete a song in Blind Karaoke mode',
    icon: '🎭',
    category: 'special',
    rarity: 'epic',
    requirement: { type: 'special', value: 6 },
    reward: { xp: 150, title: 'Blind Master' },
  },
];

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
