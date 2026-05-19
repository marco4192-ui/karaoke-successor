// Level Calculations, XP Thresholds, Ranks, and Challenge Definitions

import type { GameMode } from '@/types/game';

// ===================== NAMED CONSTANTS =====================

// --- Accuracy thresholds ---
/** Accuracy percentage required for "perfect" rating.
 *  Uses 99.5 (not 100) because tick-based scoring with floating-point
 *  arithmetic makes exact 100.0% practically impossible. */
export const PERFECT_ACCURACY = 99.5;
/** Accuracy percentage required for "excellent" rating */
export const EXCELLENT_ACCURACY = 95;

// --- Combo thresholds ---
/** Combo count that awards the first combo milestone XP */
export const COMBO_MILESTONE_1 = 50;
/** Combo count that awards the second combo milestone XP */
export const COMBO_MILESTONE_2 = 100;
/** Combo count that awards the third combo milestone XP */
export const COMBO_MILESTONE_3 = 200;

// --- Level XP requirements (per level within tier) ---
/** XP required per level for levels 1 through TIER_1_MAX-1 */
export const XP_PER_LEVEL_TIER_1 = 500;
/** XP required per level for levels TIER_1_MAX through TIER_2_MAX-1 */
export const XP_PER_LEVEL_TIER_2 = 1000;
/** XP required per level for levels TIER_2_MAX through TIER_3_MAX-1 */
export const XP_PER_LEVEL_TIER_3 = 2000;
/** XP required per level for levels TIER_3_MAX through TIER_4_MAX-1 */
export const XP_PER_LEVEL_TIER_4 = 4000;
/** XP required per level for levels TIER_4_MAX and above */
export const XP_PER_LEVEL_TIER_5 = 8000;

// --- Level tier boundaries (exclusive upper bound for the lower tier) ---
export const LEVEL_TIER_1_MAX = 10;
export const LEVEL_TIER_2_MAX = 25;
export const LEVEL_TIER_3_MAX = 50;
export const LEVEL_TIER_4_MAX = 100;

// ===================== RANKS & TITLES =====================

export interface Rank {
  id: string;
  name: string;
  icon: string;
  minXP: number;
  maxXP: number;
  color: string;
  titles: string[]; // Unlockable titles at this rank
}

export const RANKS: Rank[] = [
  { id: 'beginner', name: 'Beginner', icon: '🎵', minXP: 0, maxXP: 499, color: '#9CA3AF', titles: ['Newcomer'] },
  { id: 'novice', name: 'Novice', icon: '🎤', minXP: 500, maxXP: 1499, color: '#6B7280', titles: ['Rising Star'] },
  { id: 'apprentice', name: 'Apprentice', icon: '🌟', minXP: 1500, maxXP: 2999, color: '#22C55E', titles: ['Melody Maker'] },
  { id: 'singer', name: 'Singer', icon: '💫', minXP: 3000, maxXP: 4999, color: '#14B8A6', titles: ['Voice in Training'] },
  { id: 'performer', name: 'Performer', icon: '✨', minXP: 5000, maxXP: 7999, color: '#3B82F6', titles: ['Stage Presence'] },
  { id: 'artist', name: 'Artist', icon: '🎭', minXP: 8000, maxXP: 11999, color: '#8B5CF6', titles: ['Artistic Soul'] },
  { id: 'star', name: 'Star', icon: '⭐', minXP: 12000, maxXP: 17999, color: '#EC4899', titles: ['Shining Star'] },
  { id: 'superstar', name: 'Superstar', icon: '🌟', minXP: 18000, maxXP: 24999, color: '#F59E0B', titles: ['Crowd Favorite'] },
  { id: 'legend', name: 'Legend', icon: '👑', minXP: 25000, maxXP: 49999, color: '#EF4444', titles: ['Legendary Voice'] },
  { id: 'icon', name: 'Icon', icon: '💎', minXP: 50000, maxXP: 99999, color: '#F97316', titles: ['Musical Icon'] },
  { id: 'mythic', name: 'Mythic', icon: '🔮', minXP: 100000, maxXP: 199999, color: '#A855F7', titles: ['Mythic Singer'] },
  { id: 'divine', name: 'Divine', icon: '🌟', minXP: 200000, maxXP: Infinity, color: '#FFD700', titles: ['Divine Voice'] },
];

// ===================== CHALLENGE MODES =====================

export interface ChallengeModifier {
  type: 'no_lyrics' | 'no_pitch_guide' | 'double_speed' | 'half_speed' | 'pitch_shift' | 'blind' | 'missing_words' | 'golden_only' | 'perfect_only';
  value?: number;
  description: string;
}

export interface ChallengeMode {
  id: string;
  name: string;
  description: string;
  icon: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
  modifiers: ChallengeModifier[];
  xpReward: number;
  timeLimit?: number; // seconds
  requirements?: ChallengeRequirement[];
}

interface ChallengeRequirement {
  type: 'min_level' | 'min_songs' | 'achievement' | 'rank';
  value: number | string;
}

export const CHALLENGE_MODES: ChallengeMode[] = [
  {
    id: 'blind-audition',
    name: 'Blind Audition',
    description: 'Sing without seeing the lyrics - memory test!',
    icon: '🙈',
    difficulty: 'medium',
    modifiers: [{ type: 'no_lyrics', description: 'Lyrics are hidden' }],
    xpReward: 200,
  },
  {
    id: 'no-guide',
    name: 'Free Flight',
    description: 'No pitch guide - sing by ear!',
    icon: '✈️',
    difficulty: 'hard',
    modifiers: [{ type: 'no_pitch_guide', description: 'Pitch guide is hidden' }],
    xpReward: 300,
  },
  {
    id: 'speed-demon',
    name: 'Speed Demon',
    description: '1.5x speed - think fast!',
    icon: '⚡',
    difficulty: 'hard',
    modifiers: [{ type: 'double_speed', value: 1.5, description: 'Song plays at 1.5x speed' }],
    xpReward: 350,
    timeLimit: 180,
  },
  {
    id: 'perfectionist',
    name: 'Perfectionist',
    description: 'Only perfect notes count!',
    icon: '💎',
    difficulty: 'extreme',
    modifiers: [{ type: 'perfect_only', description: 'Only perfect hits give points' }],
    xpReward: 500,
    requirements: [{ type: 'min_level', value: 10 }],
  },
  {
    id: 'golden-hunter',
    name: 'Golden Hunter',
    description: 'Only golden notes give points - catch them all!',
    icon: '🌟',
    difficulty: 'hard',
    modifiers: [{ type: 'golden_only', description: 'Only golden notes count' }],
    xpReward: 400,
  },
  {
    id: 'memory-lane',
    name: 'Memory Lane',
    description: 'Missing words challenge - fill in the blanks!',
    icon: '🧩',
    difficulty: 'medium',
    modifiers: [{ type: 'missing_words', value: 20, description: '20% of words are hidden' }],
    xpReward: 250,
  },
  {
    id: 'pitch-shift',
    name: 'Pitch Shift',
    description: 'Song is transposed - adapt your voice!',
    icon: '🎚️',
    difficulty: 'hard',
    modifiers: [{ type: 'pitch_shift', value: 3, description: 'Pitch shifted by 3 semitones' }],
    xpReward: 300,
  },
  {
    id: 'ultimate',
    name: 'Ultimate Challenge',
    description: 'All modifiers combined - for the brave!',
    icon: '🔥',
    difficulty: 'extreme',
    modifiers: [
      { type: 'no_lyrics', description: 'No lyrics' },
      { type: 'no_pitch_guide', description: 'No pitch guide' },
      { type: 'double_speed', value: 1.25, description: '1.25x speed' },
    ],
    xpReward: 1000,
    requirements: [{ type: 'min_level', value: 25 }],
  },
];

/**
 * Map challenge mode IDs to the corresponding built-in GameMode strings.
 * Challenges listed here use native game-mode implementations.
 *
 * Other challenge modifiers (no_pitch_guide, double_speed, perfect_only,
 * golden_only) are applied at the scoring/UI level via the challenge
 * modifiers system, not via game-mode mapping.
 */
export const CHALLENGE_GAME_MODE_MAP: Record<string, GameMode> = {
  'blind-audition': 'blind',
  'memory-lane': 'missing-words',
};

// ===================== XP CALCULATIONS =====================

// Maximum score achievable in a single song (matches scoring.ts MAX_POINTS_PER_SONG)
const MAX_SCORE = 10000;

const XP_SOURCES = {
  // Song completion
  SONG_COMPLETE: 50,
  SONG_PERFECT: 150, // PERFECT_ACCURACY accuracy bonus
  SONG_EXCELLENT: 75, // EXCELLENT_ACCURACY+ accuracy bonus

  // Performance
  PERFECT_NOTE: 2,
  GOLDEN_NOTE: 10,
  COMBO_MILESTONE_50: 25,
  COMBO_MILESTONE_100: 50,
  COMBO_MILESTONE_200: 100,
};

export function calculateSongXP(
  score: number,
  accuracy: number,
  maxCombo: number,
  perfectNotes: number,
  goldenNotes: number,
  challengeMode?: string
): number {
  let xp = XP_SOURCES.SONG_COMPLETE;

  // Score-based XP: up to 100 bonus XP proportional to score/MAX_SCORE.
  // This rewards overall performance (hitting more notes) beyond just accuracy %.
  const scoreRatio = Math.min(1, Math.max(0, score / MAX_SCORE));
  xp += Math.round(scoreRatio * 100);

  // Accuracy bonus
  if (accuracy >= PERFECT_ACCURACY) {
    xp += XP_SOURCES.SONG_PERFECT;
  } else if (accuracy >= EXCELLENT_ACCURACY) {
    xp += XP_SOURCES.SONG_EXCELLENT;
  }

  // Perfect notes
  xp += perfectNotes * XP_SOURCES.PERFECT_NOTE;

  // Golden notes
  xp += goldenNotes * XP_SOURCES.GOLDEN_NOTE;

  // Combo milestones
  if (maxCombo >= COMBO_MILESTONE_3) {
    xp += XP_SOURCES.COMBO_MILESTONE_200;
  } else if (maxCombo >= COMBO_MILESTONE_2) {
    xp += XP_SOURCES.COMBO_MILESTONE_100;
  } else if (maxCombo >= COMBO_MILESTONE_1) {
    xp += XP_SOURCES.COMBO_MILESTONE_50;
  }

  // Challenge mode bonus
  if (challengeMode) {
    const mode = CHALLENGE_MODES.find(m => m.id === challengeMode);
    if (mode) {
      xp += mode.xpReward;
    }
  }

  return Math.round(xp);
}

export function getRankForXP(xp: number): Rank {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (xp >= RANKS[i].minXP) {
      return RANKS[i];
    }
  }
  return RANKS[0];
}

export function getLevelForXP(xp: number): { level: number; currentXP: number; nextLevelXP: number; progress: number } {
  // Level formula: Each level requires progressively more XP
  // Level  1-9:  XP_PER_LEVEL_TIER_1 each
  // Level 10-24: XP_PER_LEVEL_TIER_2 each
  // Level 25-49: XP_PER_LEVEL_TIER_3 each
  // Level 50-99: XP_PER_LEVEL_TIER_4 each
  // Level 100+:  XP_PER_LEVEL_TIER_5 each

  // Guard: NaN would cause infinite loop (NaN < anything is always false)
  const safeXP = (typeof xp !== 'number' || isNaN(xp) || xp < 0) ? 0 : xp;

  // Cumulative XP at each tier boundary (O(1) closed-form)
  const TIER1_CUM = (LEVEL_TIER_1_MAX - 1) * XP_PER_LEVEL_TIER_1;           // 9 * 500 = 4500
  const TIER2_CUM = TIER1_CUM + (LEVEL_TIER_2_MAX - LEVEL_TIER_1_MAX) * XP_PER_LEVEL_TIER_2;  // + 15 * 1000 = 19500
  const TIER3_CUM = TIER2_CUM + (LEVEL_TIER_3_MAX - LEVEL_TIER_2_MAX) * XP_PER_LEVEL_TIER_3;  // + 25 * 2000 = 69500
  const TIER4_CUM = TIER3_CUM + (LEVEL_TIER_4_MAX - LEVEL_TIER_3_MAX) * XP_PER_LEVEL_TIER_4;  // + 50 * 4000 = 269500

  let xpRequired: number;
  let xpPerLevel: number;
  let level: number;

  if (safeXP < TIER1_CUM) {
    // Tier 1: levels 1-9
    xpRequired = 0;
    xpPerLevel = XP_PER_LEVEL_TIER_1;
    level = 1 + Math.floor(safeXP / XP_PER_LEVEL_TIER_1);
  } else if (safeXP < TIER2_CUM) {
    // Tier 2: levels 10-24
    xpRequired = TIER1_CUM;
    xpPerLevel = XP_PER_LEVEL_TIER_2;
    level = LEVEL_TIER_1_MAX + Math.floor((safeXP - TIER1_CUM) / XP_PER_LEVEL_TIER_2);
  } else if (safeXP < TIER3_CUM) {
    // Tier 3: levels 25-49
    xpRequired = TIER2_CUM;
    xpPerLevel = XP_PER_LEVEL_TIER_3;
    level = LEVEL_TIER_2_MAX + Math.floor((safeXP - TIER2_CUM) / XP_PER_LEVEL_TIER_3);
  } else if (safeXP < TIER4_CUM) {
    // Tier 4: levels 50-99
    xpRequired = TIER3_CUM;
    xpPerLevel = XP_PER_LEVEL_TIER_4;
    level = LEVEL_TIER_3_MAX + Math.floor((safeXP - TIER3_CUM) / XP_PER_LEVEL_TIER_4);
  } else {
    // Tier 5: levels 100+
    xpRequired = TIER4_CUM;
    xpPerLevel = XP_PER_LEVEL_TIER_5;
    level = LEVEL_TIER_4_MAX + Math.floor((safeXP - TIER4_CUM) / XP_PER_LEVEL_TIER_5);
  }

  const currentLevelXP = safeXP - xpRequired;
  const progress = (currentLevelXP / xpPerLevel) * 100;
  return {
    level,
    currentXP: safeXP,
    nextLevelXP: xpRequired + xpPerLevel,
    progress: Math.min(100, Math.max(0, progress)),
  };
}
