// Level Calculations, XP Thresholds, Ranks, and Challenge Definitions

import type { Language } from '@/lib/i18n/locales';
import { t } from '@/lib/i18n/translations';
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
  nameKey: string;
  icon: string;
  minXP: number;
  maxXP: number;
  color: string;
  titles: string[]; // English fallback titles
  titleKeys: string[]; // i18n keys for titles
}

export const RANKS: Rank[] = [
  { id: 'beginner', name: 'Beginner', nameKey: 'ranks.beginner.name', icon: '🎵', minXP: 0, maxXP: 499, color: '#9CA3AF', titles: ['Newcomer'], titleKeys: ['ranks.beginner.titles.newcomer'] },
  { id: 'novice', name: 'Novice', nameKey: 'ranks.novice.name', icon: '🎤', minXP: 500, maxXP: 1499, color: '#6B7280', titles: ['Rising Star'], titleKeys: ['ranks.novice.titles.risingStar'] },
  { id: 'apprentice', name: 'Apprentice', nameKey: 'ranks.apprentice.name', icon: '🌟', minXP: 1500, maxXP: 2999, color: '#22C55E', titles: ['Melody Maker'], titleKeys: ['ranks.apprentice.titles.melodyMaker'] },
  { id: 'singer', name: 'Singer', nameKey: 'ranks.singer.name', icon: '💫', minXP: 3000, maxXP: 4999, color: '#14B8A6', titles: ['Voice in Training'], titleKeys: ['ranks.singer.titles.voiceInTraining'] },
  { id: 'performer', name: 'Performer', nameKey: 'ranks.performer.name', icon: '✨', minXP: 5000, maxXP: 7999, color: '#3B82F6', titles: ['Stage Presence'], titleKeys: ['ranks.performer.titles.stagePresence'] },
  { id: 'artist', name: 'Artist', nameKey: 'ranks.artist.name', icon: '🎭', minXP: 8000, maxXP: 11999, color: '#8B5CF6', titles: ['Artistic Soul'], titleKeys: ['ranks.artist.titles.artisticSoul'] },
  { id: 'star', name: 'Star', nameKey: 'ranks.star.name', icon: '⭐', minXP: 12000, maxXP: 17999, color: '#EC4899', titles: ['Shining Star'], titleKeys: ['ranks.star.titles.shiningStar'] },
  { id: 'superstar', name: 'Superstar', nameKey: 'ranks.superstar.name', icon: '🌟', minXP: 18000, maxXP: 24999, color: '#F59E0B', titles: ['Crowd Favorite'], titleKeys: ['ranks.superstar.titles.crowdFavorite'] },
  { id: 'legend', name: 'Legend', nameKey: 'ranks.legend.name', icon: '👑', minXP: 25000, maxXP: 49999, color: '#EF4444', titles: ['Legendary Voice'], titleKeys: ['ranks.legend.titles.legendaryVoice'] },
  { id: 'icon', name: 'Icon', nameKey: 'ranks.icon.name', icon: '💎', minXP: 50000, maxXP: 99999, color: '#F97316', titles: ['Musical Icon'], titleKeys: ['ranks.icon.titles.musicalIcon'] },
  { id: 'mythic', name: 'Mythic', nameKey: 'ranks.mythic.name', icon: '🔮', minXP: 100000, maxXP: 199999, color: '#A855F7', titles: ['Mythic Singer'], titleKeys: ['ranks.mythic.titles.mythicSinger'] },
  { id: 'divine', name: 'Divine', nameKey: 'ranks.divine.name', icon: '🌟', minXP: 200000, maxXP: Infinity, color: '#FFD700', titles: ['Divine Voice'], titleKeys: ['ranks.divine.titles.divineVoice'] },
];

/** Get a localized rank object with translated name and titles. */
export function getLocalizedRank(rank: Rank, language?: Language): { name: string; titles: string[] } {
  return {
    name: t(rank.nameKey, language),
    titles: rank.titleKeys.map(key => t(key, language)),
  };
}

// ===================== CHALLENGE MODES =====================

export interface ChallengeModifier {
  type: 'no_lyrics' | 'no_pitch_guide' | 'double_speed' | 'half_speed' | 'pitch_shift' | 'blind' | 'missing_words' | 'golden_only' | 'perfect_only';
  value?: number;
  description: string;
  descriptionKey?: string;
}

/** what a challenge mode requires to count as COMPLETED (not just played) */
export interface ChallengeCompletionTarget {
  metric: 'notesHit' | 'perfectNotes' | 'goldenNotes' | 'score' | 'accuracy' | 'maxCombo' | 'notesMissed' | 'categoryMatch';
  /** 'min' = at least this value, 'max' = at most this value */
  direction: 'min' | 'max';
  value: number;
}

export interface ChallengeRequirement {
  type: 'min_level' | 'min_songs' | 'achievement' | 'rank' | 'challenge_completed';
  value: number | string;
}

export interface ChallengeMode {
  id: string;
  name: string;
  nameKey: string;
  description: string;
  descriptionKey: string;
  icon: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
  modifiers: ChallengeModifier[];
  xpReward: number;
  timeLimit?: number; // seconds
  requirements?: ChallengeRequirement[];
  /** target that must be met for the mode to count as completed (unlocks chains) */
  completionTarget?: ChallengeCompletionTarget;
  /** optional categorical song requirement (genre / language / decade / …) */
  category?: { field: string; value?: string | number };
}

export const CHALLENGE_MODES: ChallengeMode[] = [
  {
    id: 'blind-audition',
    name: 'Blind Audition',
    nameKey: 'challenges.blindAudition.name',
    description: 'Sing without seeing the lyrics - memory test!',
    descriptionKey: 'challenges.blindAudition.description',
    icon: '🙈',
    difficulty: 'medium',
    modifiers: [{ type: 'no_lyrics', description: 'Lyrics are hidden', descriptionKey: 'modifiers.noLyrics.description' }],
    xpReward: 200,
  },
  {
    id: 'no-guide',
    name: 'Free Flight',
    nameKey: 'challenges.freeFlight.name',
    description: 'No pitch guide - sing by ear!',
    descriptionKey: 'challenges.freeFlight.description',
    icon: '✈️',
    difficulty: 'hard',
    modifiers: [{ type: 'no_pitch_guide', description: 'Pitch guide is hidden', descriptionKey: 'modifiers.noPitchGuide.description' }],
    xpReward: 300,
  },
  {
    id: 'speed-demon',
    name: 'Speed Demon',
    nameKey: 'challenges.speedDemon.name',
    description: '1.5x speed - think fast!',
    descriptionKey: 'challenges.speedDemon.description',
    icon: '⚡',
    difficulty: 'hard',
    modifiers: [{ type: 'double_speed', value: 1.5, description: 'Song plays at 1.5x speed', descriptionKey: 'modifiers.doubleSpeed.description' }],
    xpReward: 350,
    timeLimit: 180,
  },
  {
    id: 'perfectionist',
    name: 'Perfectionist',
    nameKey: 'challenges.perfectionist.name',
    description: 'Only perfect notes count!',
    descriptionKey: 'challenges.perfectionist.description',
    icon: '💎',
    difficulty: 'extreme',
    modifiers: [{ type: 'perfect_only', description: 'Only perfect hits give points', descriptionKey: 'modifiers.perfectOnly.description' }],
    xpReward: 500,
    requirements: [{ type: 'min_level', value: 10 }],
  },
  {
    id: 'golden-hunter',
    name: 'Golden Hunter',
    nameKey: 'challenges.goldenHunter.name',
    description: 'Only golden notes give points - catch them all!',
    descriptionKey: 'challenges.goldenHunter.description',
    icon: '🌟',
    difficulty: 'hard',
    modifiers: [{ type: 'golden_only', description: 'Only golden notes count', descriptionKey: 'modifiers.goldenOnly.description' }],
    xpReward: 400,
  },
  {
    id: 'memory-lane',
    name: 'Memory Lane',
    nameKey: 'challenges.memoryLane.name',
    description: 'Missing words challenge - fill in the blanks!',
    descriptionKey: 'challenges.memoryLane.description',
    icon: '🧩',
    difficulty: 'medium',
    modifiers: [{ type: 'missing_words', value: 20, description: '20% of words are hidden', descriptionKey: 'modifiers.missingWords.description' }],
    xpReward: 250,
  },
  {
    id: 'pitch-shift',
    name: 'Pitch Shift',
    nameKey: 'challenges.pitchShift.name',
    description: 'Song is transposed - adapt your voice!',
    descriptionKey: 'challenges.pitchShift.description',
    icon: '🎚️',
    difficulty: 'hard',
    modifiers: [{ type: 'pitch_shift', value: 3, description: 'Pitch shifted by 3 semitones', descriptionKey: 'modifiers.pitchShift.description' }],
    xpReward: 300,
  },
  {
    id: 'half-speed',
    name: 'Slow Motion',
    nameKey: 'challenges.halfSpeed.name',
    description: '0.75x speed — perfect for practice!',
    descriptionKey: 'challenges.halfSpeed.description',
    icon: '🐌',
    difficulty: 'easy',
    modifiers: [{ type: 'half_speed', value: 0.75, description: 'Song plays at 0.75x speed', descriptionKey: 'modifiers.halfSpeed.description' }],
    xpReward: 100,
  },
  {
    id: 'blind-master',
    name: 'Blind Master',
    nameKey: 'challenges.blindMaster.name',
    description: 'No lyrics AND no pitch guide — true blind singing!',
    descriptionKey: 'challenges.blindMaster.description',
    icon: '🕶️',
    difficulty: 'extreme',
    modifiers: [
      { type: 'no_lyrics', description: 'Lyrics are hidden', descriptionKey: 'modifiers.noLyrics.description' },
      { type: 'no_pitch_guide', description: 'Pitch guide is hidden', descriptionKey: 'modifiers.noPitchGuide.description' },
    ],
    xpReward: 600,
    requirements: [{ type: 'min_level', value: 15 }],
  },
  {
    id: 'ultimate',
    name: 'Ultimate Challenge',
    nameKey: 'challenges.ultimateChallenge.name',
    description: 'All modifiers combined - for the brave!',
    descriptionKey: 'challenges.ultimateChallenge.description',
    icon: '🔥',
    difficulty: 'extreme',
    modifiers: [
      { type: 'no_lyrics', description: 'No lyrics', descriptionKey: 'modifiers.noLyrics.shortDescription' },
      { type: 'no_pitch_guide', description: 'No pitch guide', descriptionKey: 'modifiers.noPitchGuide.shortDescription' },
      { type: 'double_speed', value: 1.25, description: '1.25x speed', descriptionKey: 'modifiers.doubleSpeed.shortDescription' },
    ],
    xpReward: 1000,
    timeLimit: 180,
    requirements: [{ type: 'min_level', value: 25 }],
    completionTarget: { metric: 'score', direction: 'min', value: 7000 },
  },

  // ═══ 52 NEW CHALLENGE MODES — chains, level gates, song categories ═══

  // ── Note chain: 50 → 100 → 200 → 350 → 500 correct notes in one song ──
  {
    id: 'note-novice',
    name: 'Note Novice', nameKey: 'challenges.noteNovice.name',
    description: 'Hit 50+ correct notes in a single song', descriptionKey: 'challenges.noteNovice.description',
    icon: '🐣', difficulty: 'easy', modifiers: [], xpReward: 120,
    completionTarget: { metric: 'notesHit', direction: 'min', value: 50 },
  },
  {
    id: 'note-apprentice',
    name: 'Note Apprentice', nameKey: 'challenges.noteApprentice.name',
    description: 'Hit 100+ correct notes in a single song', descriptionKey: 'challenges.noteApprentice.description',
    icon: '📗', difficulty: 'medium', modifiers: [], xpReward: 200,
    requirements: [{ type: 'challenge_completed', value: 'note-novice' }],
    completionTarget: { metric: 'notesHit', direction: 'min', value: 100 },
  },
  {
    id: 'note-adept',
    name: 'Note Adept', nameKey: 'challenges.noteAdept.name',
    description: 'Hit 200+ correct notes in a single song', descriptionKey: 'challenges.noteAdept.description',
    icon: '📘', difficulty: 'hard', modifiers: [], xpReward: 320,
    requirements: [{ type: 'challenge_completed', value: 'note-apprentice' }, { type: 'min_level', value: 5 }],
    completionTarget: { metric: 'notesHit', direction: 'min', value: 200 },
  },
  {
    id: 'note-virtuoso',
    name: 'Note Virtuoso', nameKey: 'challenges.noteVirtuoso.name',
    description: 'Hit 350+ correct notes in a single song', descriptionKey: 'challenges.noteVirtuoso.description',
    icon: '📕', difficulty: 'hard', modifiers: [], xpReward: 450,
    requirements: [{ type: 'challenge_completed', value: 'note-adept' }],
    completionTarget: { metric: 'notesHit', direction: 'min', value: 350 },
  },
  {
    id: 'note-legend',
    name: 'Note Legend', nameKey: 'challenges.noteLegend.name',
    description: 'Hit 500+ correct notes in a single song', descriptionKey: 'challenges.noteLegend.description',
    icon: '🛡️', difficulty: 'extreme', modifiers: [], xpReward: 700,
    requirements: [{ type: 'challenge_completed', value: 'note-virtuoso' }, { type: 'min_level', value: 20 }],
    completionTarget: { metric: 'notesHit', direction: 'min', value: 500 },
  },

  // ── Combo chain: 30 → 60 → 100 → 175 ──
  {
    id: 'combo-cadet',
    name: 'Combo Cadet', nameKey: 'challenges.comboCadet.name',
    description: 'Reach a 30+ note combo in a single song', descriptionKey: 'challenges.comboCadet.description',
    icon: '🎯', difficulty: 'easy', modifiers: [], xpReward: 120,
    completionTarget: { metric: 'maxCombo', direction: 'min', value: 30 },
  },
  {
    id: 'combo-captain',
    name: 'Combo Captain', nameKey: 'challenges.comboCaptain.name',
    description: 'Reach a 60+ note combo in a single song', descriptionKey: 'challenges.comboCaptain.description',
    icon: '🎖️', difficulty: 'medium', modifiers: [], xpReward: 220,
    requirements: [{ type: 'challenge_completed', value: 'combo-cadet' }],
    completionTarget: { metric: 'maxCombo', direction: 'min', value: 60 },
  },
  {
    id: 'combo-commander',
    name: 'Combo Commander', nameKey: 'challenges.comboCommander.name',
    description: 'Reach a 100+ note combo in a single song', descriptionKey: 'challenges.comboCommander.description',
    icon: '🚩', difficulty: 'hard', modifiers: [], xpReward: 380,
    requirements: [{ type: 'challenge_completed', value: 'combo-captain' }],
    completionTarget: { metric: 'maxCombo', direction: 'min', value: 100 },
  },
  {
    id: 'combo-colossus',
    name: 'Combo Colossus', nameKey: 'challenges.comboColossus.name',
    description: 'Reach a 175+ note combo in a single song', descriptionKey: 'challenges.comboColossus.description',
    icon: '🗿', difficulty: 'extreme', modifiers: [], xpReward: 650,
    requirements: [{ type: 'challenge_completed', value: 'combo-commander' }, { type: 'min_level', value: 15 }],
    completionTarget: { metric: 'maxCombo', direction: 'min', value: 175 },
  },

  // ── Perfect notes chain: 25 → 50 → 100 ──
  {
    id: 'perfect-path',
    name: 'Perfect Path', nameKey: 'challenges.perfectPath.name',
    description: 'Hit 25+ perfect notes in a single song', descriptionKey: 'challenges.perfectPath.description',
    icon: '💠', difficulty: 'easy', modifiers: [], xpReward: 140,
    completionTarget: { metric: 'perfectNotes', direction: 'min', value: 25 },
  },
  {
    id: 'perfect-pilgrim',
    name: 'Perfect Pilgrim', nameKey: 'challenges.perfectPilgrim.name',
    description: 'Hit 50+ perfect notes in a single song', descriptionKey: 'challenges.perfectPilgrim.description',
    icon: '🧭', difficulty: 'medium', modifiers: [], xpReward: 260,
    requirements: [{ type: 'challenge_completed', value: 'perfect-path' }],
    completionTarget: { metric: 'perfectNotes', direction: 'min', value: 50 },
  },
  {
    id: 'perfect-prophet',
    name: 'Perfect Prophet', nameKey: 'challenges.perfectProphet.name',
    description: 'Hit 100+ perfect notes in a single song', descriptionKey: 'challenges.perfectProphet.description',
    icon: '🔮', difficulty: 'extreme', modifiers: [], xpReward: 600,
    requirements: [{ type: 'challenge_completed', value: 'perfect-pilgrim' }, { type: 'min_level', value: 20 }],
    completionTarget: { metric: 'perfectNotes', direction: 'min', value: 100 },
  },

  // ── Golden notes chain: 3 → 6 → 12 ──
  {
    id: 'gold-panner',
    name: 'Gold Panner', nameKey: 'challenges.goldPanner.name',
    description: 'Hit 3+ golden notes in a single song', descriptionKey: 'challenges.goldPanner.description',
    icon: '⛏️', difficulty: 'easy', modifiers: [], xpReward: 130,
    completionTarget: { metric: 'goldenNotes', direction: 'min', value: 3 },
  },
  {
    id: 'gold-miner',
    name: 'Gold Miner', nameKey: 'challenges.goldMiner.name',
    description: 'Hit 6+ golden notes in a single song', descriptionKey: 'challenges.goldMiner.description',
    icon: '⛏️', difficulty: 'medium', modifiers: [], xpReward: 240,
    requirements: [{ type: 'challenge_completed', value: 'gold-panner' }],
    completionTarget: { metric: 'goldenNotes', direction: 'min', value: 6 },
  },
  {
    id: 'gold-baron',
    name: 'Gold Baron', nameKey: 'challenges.goldBaron.name',
    description: 'Hit 12+ golden notes in a single song', descriptionKey: 'challenges.goldBaron.description',
    icon: '👑', difficulty: 'extreme', modifiers: [], xpReward: 550,
    requirements: [{ type: 'challenge_completed', value: 'gold-miner' }, { type: 'min_level', value: 12 }],
    completionTarget: { metric: 'goldenNotes', direction: 'min', value: 12 },
  },

  // ── Clean run chain: ≤20 → ≤8 → ≤3 → 0 misses ──
  {
    id: 'clean-cut',
    name: 'Clean Cut', nameKey: 'challenges.cleanCut.name',
    description: 'Miss at most 20 notes in a single song', descriptionKey: 'challenges.cleanCut.description',
    icon: '🧼', difficulty: 'easy', modifiers: [], xpReward: 130,
    completionTarget: { metric: 'notesMissed', direction: 'max', value: 20 },
  },
  {
    id: 'spotless',
    name: 'Spotless', nameKey: 'challenges.spotless.name',
    description: 'Miss at most 8 notes in a single song', descriptionKey: 'challenges.spotless.description',
    icon: '🧽', difficulty: 'medium', modifiers: [], xpReward: 250,
    requirements: [{ type: 'challenge_completed', value: 'clean-cut' }],
    completionTarget: { metric: 'notesMissed', direction: 'max', value: 8 },
  },
  {
    id: 'surgical',
    name: 'Surgical Precision', nameKey: 'challenges.surgical.name',
    description: 'Miss at most 3 notes in a single song', descriptionKey: 'challenges.surgical.description',
    icon: '🏥', difficulty: 'hard', modifiers: [], xpReward: 420,
    requirements: [{ type: 'challenge_completed', value: 'spotless' }, { type: 'min_level', value: 8 }],
    completionTarget: { metric: 'notesMissed', direction: 'max', value: 3 },
  },
  {
    id: 'flawless-mirror',
    name: 'Flawless Mirror', nameKey: 'challenges.flawlessMirror.name',
    description: 'Miss ZERO notes in a single song', descriptionKey: 'challenges.flawlessMirror.description',
    icon: '🪞', difficulty: 'extreme', modifiers: [], xpReward: 900,
    requirements: [{ type: 'challenge_completed', value: 'surgical' }, { type: 'min_level', value: 25 }],
    completionTarget: { metric: 'notesMissed', direction: 'max', value: 0 },
  },

  // ── Score chain: 5000 → 7500 → 9500 → 11500 ──
  {
    id: 'score-scout',
    name: 'Score Scout', nameKey: 'challenges.scoreScout.name',
    description: 'Score 5,000+ points in a single song', descriptionKey: 'challenges.scoreScout.description',
    icon: '🔎', difficulty: 'easy', modifiers: [], xpReward: 130,
    completionTarget: { metric: 'score', direction: 'min', value: 5000 },
  },
  {
    id: 'score-scholar',
    name: 'Score Scholar', nameKey: 'challenges.scoreScholar.name',
    description: 'Score 7,500+ points in a single song', descriptionKey: 'challenges.scoreScholar.description',
    icon: '🎓', difficulty: 'medium', modifiers: [], xpReward: 240,
    requirements: [{ type: 'challenge_completed', value: 'score-scout' }],
    completionTarget: { metric: 'score', direction: 'min', value: 7500 },
  },
  {
    id: 'score-sensei',
    name: 'Score Sensei', nameKey: 'challenges.scoreSensei.name',
    description: 'Score 9,500+ points in a single song', descriptionKey: 'challenges.scoreSensei.description',
    icon: '🥋', difficulty: 'hard', modifiers: [], xpReward: 400,
    requirements: [{ type: 'challenge_completed', value: 'score-scholar' }],
    completionTarget: { metric: 'score', direction: 'min', value: 9500 },
  },
  {
    id: 'score-titan',
    name: 'Score Titan', nameKey: 'challenges.scoreTitan.name',
    description: 'Score 11,500+ points in a single song', descriptionKey: 'challenges.scoreTitan.description',
    icon: '🗿', difficulty: 'extreme', modifiers: [], xpReward: 700,
    requirements: [{ type: 'challenge_completed', value: 'score-sensei' }, { type: 'min_level', value: 18 }],
    completionTarget: { metric: 'score', direction: 'min', value: 11500 },
  },

  // ── Speed chain ──
  {
    id: 'speed-demon-plus',
    name: 'Speed Demon+', nameKey: 'challenges.speedDemonPlus.name',
    description: '1.75x speed — for lightning lungs!', descriptionKey: 'challenges.speedDemonPlus.description',
    icon: '💫', difficulty: 'hard',
    modifiers: [{ type: 'double_speed', value: 1.75, description: 'Song plays at 1.75x speed', descriptionKey: 'modifiers.doubleSpeed.description' }],
    xpReward: 450, timeLimit: 180,
    requirements: [{ type: 'challenge_completed', value: 'speed-demon' }],
    completionTarget: { metric: 'score', direction: 'min', value: 6000 },
  },
  {
    id: 'lightning-lungs',
    name: 'Lightning Lungs', nameKey: 'challenges.lightningLungs.name',
    description: '2x speed — absolutely breathless!', descriptionKey: 'challenges.lightningLungs.description',
    icon: '⚡', difficulty: 'extreme',
    modifiers: [{ type: 'double_speed', value: 2, description: 'Song plays at 2x speed', descriptionKey: 'modifiers.doubleSpeed.description' }],
    xpReward: 800, timeLimit: 150,
    requirements: [{ type: 'challenge_completed', value: 'speed-demon-plus' }, { type: 'min_level', value: 30 }],
    completionTarget: { metric: 'score', direction: 'min', value: 5500 },
  },
  {
    id: 'turbo-memory',
    name: 'Turbo Memory', nameKey: 'challenges.turboMemory.name',
    description: '1.25x speed AND 35% missing words!', descriptionKey: 'challenges.turboMemory.description',
    icon: '🌪️', difficulty: 'extreme',
    modifiers: [
      { type: 'double_speed', value: 1.25, description: '1.25x speed', descriptionKey: 'modifiers.doubleSpeed.shortDescription' },
      { type: 'missing_words', value: 35, description: '35% of words are hidden', descriptionKey: 'modifiers.missingWords.description' },
    ],
    xpReward: 650,
    requirements: [{ type: 'challenge_completed', value: 'memory-lane' }, { type: 'min_level', value: 12 }],
    completionTarget: { metric: 'score', direction: 'min', value: 6000 },
  },
  {
    id: 'mind-palace',
    name: 'Mind Palace', nameKey: 'challenges.mindPalace.name',
    description: '50% of the words are hidden — pure memory!', descriptionKey: 'challenges.mindPalace.description',
    icon: '🏛️', difficulty: 'extreme',
    modifiers: [{ type: 'missing_words', value: 50, description: '50% of words are hidden', descriptionKey: 'modifiers.missingWords.description' }],
    xpReward: 700,
    requirements: [{ type: 'challenge_completed', value: 'memory-lane' }, { type: 'min_level', value: 20 }],
    completionTarget: { metric: 'score', direction: 'min', value: 6500 },
  },

  // ── Blind chain ──
  {
    id: 'blindfold-bard',
    name: 'Blindfold Bard', nameKey: 'challenges.blindfoldBard.name',
    description: 'No lyrics AND 20% missing words', descriptionKey: 'challenges.blindfoldBard.description',
    icon: '🎭', difficulty: 'extreme',
    modifiers: [
      { type: 'no_lyrics', description: 'Lyrics are hidden', descriptionKey: 'modifiers.noLyrics.description' },
      { type: 'missing_words', value: 20, description: '20% of words are hidden', descriptionKey: 'modifiers.missingWords.description' },
    ],
    xpReward: 620,
    requirements: [{ type: 'challenge_completed', value: 'blind-audition' }, { type: 'min_level', value: 10 }],
    completionTarget: { metric: 'score', direction: 'min', value: 5500 },
  },
  {
    id: 'phantom-karaoke',
    name: 'Phantom of Karaoke', nameKey: 'challenges.phantomKaraoke.name',
    description: 'Fully blind AND 1.25x speed — the phantom salutes you!', descriptionKey: 'challenges.phantomKaraoke.description',
    icon: '🎩', difficulty: 'extreme',
    modifiers: [
      { type: 'no_lyrics', description: 'No lyrics', descriptionKey: 'modifiers.noLyrics.shortDescription' },
      { type: 'no_pitch_guide', description: 'No pitch guide', descriptionKey: 'modifiers.noPitchGuide.shortDescription' },
      { type: 'double_speed', value: 1.25, description: '1.25x speed', descriptionKey: 'modifiers.doubleSpeed.shortDescription' },
    ],
    xpReward: 950, timeLimit: 180,
    requirements: [{ type: 'challenge_completed', value: 'blind-master' }, { type: 'min_level', value: 25 }],
    completionTarget: { metric: 'score', direction: 'min', value: 6000 },
  },

  // ── Pitch chain ──
  {
    id: 'pitch-climber',
    name: 'Pitch Climber', nameKey: 'challenges.pitchClimber.name',
    description: 'Song transposed +5 semitones — climb that melody!', descriptionKey: 'challenges.pitchClimber.description',
    icon: '🧗', difficulty: 'hard',
    modifiers: [{ type: 'pitch_shift', value: 5, description: 'Pitch shifted by 5 semitones', descriptionKey: 'modifiers.pitchShift.description' }],
    xpReward: 400,
    requirements: [{ type: 'challenge_completed', value: 'pitch-shift' }],
    completionTarget: { metric: 'score', direction: 'min', value: 6000 },
  },
  {
    id: 'pitch-diver',
    name: 'Pitch Diver', nameKey: 'challenges.pitchDiver.name',
    description: 'Song transposed -4 semitones — dive deep!', descriptionKey: 'challenges.pitchDiver.description',
    icon: '🤿', difficulty: 'hard',
    modifiers: [{ type: 'pitch_shift', value: -4, description: 'Pitch shifted by -4 semitones', descriptionKey: 'modifiers.pitchShift.description' }],
    xpReward: 400,
    requirements: [{ type: 'challenge_completed', value: 'pitch-shift' }],
    completionTarget: { metric: 'score', direction: 'min', value: 6000 },
  },
  {
    id: 'octave-odyssey',
    name: 'Octave Odyssey', nameKey: 'challenges.octaveOdyssey.name',
    description: 'Song transposed +7 semitones — a whole octave of pain!', descriptionKey: 'challenges.octaveOdyssey.description',
    icon: '🌊', difficulty: 'extreme',
    modifiers: [{ type: 'pitch_shift', value: 7, description: 'Pitch shifted by 7 semitones', descriptionKey: 'modifiers.pitchShift.description' }],
    xpReward: 750,
    requirements: [{ type: 'challenge_completed', value: 'pitch-climber' }, { type: 'min_level', value: 22 }],
    completionTarget: { metric: 'score', direction: 'min', value: 5000 },
  },

  // ── Slow-motion fun ──
  {
    id: 'turtle-tempo',
    name: 'Turtle Tempo', nameKey: 'challenges.turtleTempo.name',
    description: '0.5x speed — savor every single note', descriptionKey: 'challenges.turtleTempo.description',
    icon: '🐢', difficulty: 'easy',
    modifiers: [{ type: 'half_speed', value: 0.5, description: 'Song plays at 0.5x speed', descriptionKey: 'modifiers.halfSpeed.description' }],
    xpReward: 110,
    completionTarget: { metric: 'accuracy', direction: 'min', value: 70 },
  },
  {
    id: 'sloth-serenade',
    name: 'Sloth Serenade', nameKey: 'challenges.slothSerenade.name',
    description: '0.6x speed AND no pitch guide — relaxed but blind', descriptionKey: 'challenges.slothSerenade.description',
    icon: '🦥', difficulty: 'medium',
    modifiers: [
      { type: 'half_speed', value: 0.6, description: 'Song plays at 0.6x speed', descriptionKey: 'modifiers.halfSpeed.description' },
      { type: 'no_pitch_guide', description: 'Pitch guide is hidden', descriptionKey: 'modifiers.noPitchGuide.description' },
    ],
    xpReward: 280,
    requirements: [{ type: 'challenge_completed', value: 'turtle-tempo' }],
    completionTarget: { metric: 'accuracy', direction: 'min', value: 75 },
  },

  // ── Golden / perfect extremes ──
  {
    id: 'golden-gauntlet',
    name: 'Golden Gauntlet', nameKey: 'challenges.goldenGauntlet.name',
    description: 'Only golden notes count — and you need 80%+ accuracy', descriptionKey: 'challenges.goldenGauntlet.description',
    icon: '🥊', difficulty: 'extreme',
    modifiers: [{ type: 'golden_only', description: 'Only golden notes count', descriptionKey: 'modifiers.goldenOnly.description' }],
    xpReward: 700,
    requirements: [{ type: 'challenge_completed', value: 'golden-hunter' }, { type: 'min_level', value: 15 }],
    completionTarget: { metric: 'accuracy', direction: 'min', value: 80 },
  },
  {
    id: 'perfectionist-prime',
    name: 'Perfectionist Prime', nameKey: 'challenges.perfectionistPrime.name',
    description: 'Only perfect notes count — hit 100+ of them!', descriptionKey: 'challenges.perfectionistPrime.description',
    icon: '💎', difficulty: 'extreme',
    modifiers: [{ type: 'perfect_only', description: 'Only perfect hits give points', descriptionKey: 'modifiers.perfectOnly.description' }],
    xpReward: 850,
    requirements: [{ type: 'challenge_completed', value: 'perfectionist' }, { type: 'min_level', value: 20 }],
    completionTarget: { metric: 'perfectNotes', direction: 'min', value: 100 },
  },

  // ── Accuracy ladder: 80 → 88 → 93 → 97% ──
  {
    id: 'ballad-barometer',
    name: 'Ballad Barometer', nameKey: 'challenges.balladBarometer.name',
    description: 'Finish a song with 80%+ accuracy', descriptionKey: 'challenges.balladBarometer.description',
    icon: '🎵', difficulty: 'easy', modifiers: [], xpReward: 140,
    completionTarget: { metric: 'accuracy', direction: 'min', value: 80 },
  },
  {
    id: 'tone-tuner',
    name: 'Tone Tuner', nameKey: 'challenges.toneTuner.name',
    description: 'Finish a song with 88%+ accuracy', descriptionKey: 'challenges.toneTuner.description',
    icon: '🎚️', difficulty: 'medium', modifiers: [], xpReward: 260,
    requirements: [{ type: 'challenge_completed', value: 'ballad-barometer' }],
    completionTarget: { metric: 'accuracy', direction: 'min', value: 88 },
  },
  {
    id: 'harmony-hunter',
    name: 'Harmony Hunter', nameKey: 'challenges.harmonyHunter.name',
    description: 'Finish a song with 93%+ accuracy', descriptionKey: 'challenges.harmonyHunter.description',
    icon: '🎼', difficulty: 'hard', modifiers: [], xpReward: 420,
    requirements: [{ type: 'challenge_completed', value: 'tone-tuner' }],
    completionTarget: { metric: 'accuracy', direction: 'min', value: 93 },
  },
  {
    id: 'pitch-perfect-paragon',
    name: 'Pitch-Perfect Paragon', nameKey: 'challenges.pitchPerfectParagon.name',
    description: 'Finish a song with 97%+ accuracy', descriptionKey: 'challenges.pitchPerfectParagon.description',
    icon: '😇', difficulty: 'extreme', modifiers: [], xpReward: 800,
    requirements: [{ type: 'challenge_completed', value: 'harmony-hunter' }, { type: 'min_level', value: 20 }],
    completionTarget: { metric: 'accuracy', direction: 'min', value: 97 },
  },

  // ── Genre & song-category modes ──
  {
    id: 'country-crooner',
    name: 'Country Crooner', nameKey: 'challenges.countryCrooner.name',
    description: 'Sing a Country song with 70%+ accuracy', descriptionKey: 'challenges.countryCrooner.description',
    icon: '🤠', difficulty: 'medium', modifiers: [], xpReward: 220,
    category: { field: 'genre', value: 'Country' },
    completionTarget: { metric: 'accuracy', direction: 'min', value: 70 },
  },
  {
    id: 'rock-renaissance',
    name: 'Rock Renaissance', nameKey: 'challenges.rockRenaissance.name',
    description: 'Sing a Rock song with 72%+ accuracy', descriptionKey: 'challenges.rockRenaissance.description',
    icon: '🎸', difficulty: 'medium', modifiers: [], xpReward: 220,
    category: { field: 'genre', value: 'Rock' },
    completionTarget: { metric: 'accuracy', direction: 'min', value: 72 },
  },
  {
    id: 'metal-marauder',
    name: 'Metal Marauder', nameKey: 'challenges.metalMarauder.name',
    description: 'Sing a Metal song with 75%+ accuracy', descriptionKey: 'challenges.metalMarauder.description',
    icon: '🤘', difficulty: 'hard', modifiers: [], xpReward: 380,
    requirements: [{ type: 'challenge_completed', value: 'rock-renaissance' }],
    category: { field: 'genre', value: 'Metal' },
    completionTarget: { metric: 'accuracy', direction: 'min', value: 75 },
  },
  {
    id: 'disco-dazzler',
    name: 'Disco Dazzler', nameKey: 'challenges.discoDazzler.name',
    description: 'Sing a song from the 1970s with 70%+ accuracy', descriptionKey: 'challenges.discoDazzler.description',
    icon: '🪩', difficulty: 'medium', modifiers: [], xpReward: 230,
    category: { field: 'decade', value: 1970 },
    completionTarget: { metric: 'accuracy', direction: 'min', value: 70 },
  },
  {
    id: 'synthwave-sailor',
    name: 'Synthwave Sailor', nameKey: 'challenges.synthwaveSailor.name',
    description: 'Sing a song from the 1980s with 78%+ accuracy', descriptionKey: 'challenges.synthwaveSailor.description',
    icon: '🌆', difficulty: 'hard', modifiers: [], xpReward: 360,
    requirements: [{ type: 'challenge_completed', value: 'disco-dazzler' }],
    category: { field: 'decade', value: 1980 },
    completionTarget: { metric: 'accuracy', direction: 'min', value: 78 },
  },
  {
    id: 'latin-flare',
    name: 'Latin Flare', nameKey: 'challenges.latinFlare.name',
    description: 'Sing a Latin song with 70%+ accuracy', descriptionKey: 'challenges.latinFlare.description',
    icon: '💃', difficulty: 'medium', modifiers: [], xpReward: 230,
    category: { field: 'genre', value: 'Latin' },
    completionTarget: { metric: 'accuracy', direction: 'min', value: 70 },
  },
  {
    id: 'kpop-connoisseur',
    name: 'K-Pop Connoisseur', nameKey: 'challenges.kpopConnoisseur.name',
    description: 'Sing a K-Pop song with 78%+ accuracy', descriptionKey: 'challenges.kpopConnoisseur.description',
    icon: '🎤', difficulty: 'hard', modifiers: [], xpReward: 340,
    requirements: [{ type: 'min_level', value: 8 }],
    category: { field: 'genre', value: 'K-Pop' },
    completionTarget: { metric: 'accuracy', direction: 'min', value: 78 },
  },
  {
    id: 'deutschland-dreams',
    name: 'Deutschland Dreams', nameKey: 'challenges.deutschlandDreams.name',
    description: 'Sing a German-language song with 72%+ accuracy', descriptionKey: 'challenges.deutschlandDreams.description',
    icon: '🇩🇪', difficulty: 'medium', modifiers: [], xpReward: 230,
    category: { field: 'language', value: 'German' },
    completionTarget: { metric: 'accuracy', direction: 'min', value: 72 },
  },
  {
    id: 'polyglot-practice',
    name: 'Polyglot Practice', nameKey: 'challenges.polyglotPractice.name',
    description: 'Sing a song that is NOT in English with 70%+ accuracy', descriptionKey: 'challenges.polyglotPractice.description',
    icon: '🗣️', difficulty: 'hard', modifiers: [], xpReward: 320,
    category: { field: 'languageNot', value: 'English' },
    completionTarget: { metric: 'accuracy', direction: 'min', value: 70 },
  },
  {
    id: 'musical-maestro',
    name: 'Musical Maestro', nameKey: 'challenges.musicalMaestro.name',
    description: 'Sing a Musical song with 75%+ accuracy', descriptionKey: 'challenges.musicalMaestro.description',
    icon: '🎭', difficulty: 'hard', modifiers: [], xpReward: 340,
    category: { field: 'genre', value: 'Musical' },
    completionTarget: { metric: 'accuracy', direction: 'min', value: 75 },
  },
  {
    id: 'disney-dream',
    name: 'Disney Dream', nameKey: 'challenges.disneyDream.name',
    description: 'Sing a Disney song with 75%+ accuracy', descriptionKey: 'challenges.disneyDream.description',
    icon: '🏰', difficulty: 'medium', modifiers: [], xpReward: 240,
    category: { field: 'genre', value: 'Disney' },
    completionTarget: { metric: 'accuracy', direction: 'min', value: 75 },
  },

  // ── Song-shape modes ──
  {
    id: 'marathoner',
    name: 'Marathoner', nameKey: 'challenges.marathoner.name',
    description: 'Sing a 5+ minute song with 75%+ accuracy', descriptionKey: 'challenges.marathoner.description',
    icon: '🏃', difficulty: 'extreme', modifiers: [], xpReward: 550,
    requirements: [{ type: 'min_level', value: 10 }],
    category: { field: 'durationMinMinutes', value: 5 },
    completionTarget: { metric: 'accuracy', direction: 'min', value: 75 },
  },
  {
    id: 'sprint-singer',
    name: 'Sprint Singer', nameKey: 'challenges.sprintSinger.name',
    description: 'Sing a song under 3 minutes with 80%+ accuracy', descriptionKey: 'challenges.sprintSinger.description',
    icon: '🏁', difficulty: 'easy', modifiers: [], xpReward: 150,
    category: { field: 'durationMaxMinutes', value: 3 },
    completionTarget: { metric: 'accuracy', direction: 'min', value: 80 },
  },
  {
    id: 'fresh-finders',
    name: 'Fresh Finders', nameKey: 'challenges.freshFinders.name',
    description: 'Sing a song you have NEVER sung before — 68%+ accuracy', descriptionKey: 'challenges.freshFinders.description',
    icon: '🔍', difficulty: 'easy', modifiers: [], xpReward: 160,
    category: { field: 'freshSong' },
    completionTarget: { metric: 'accuracy', direction: 'min', value: 68 },
  },
  {
    id: 'love-guru',
    name: 'Love Guru', nameKey: 'challenges.loveGuru.name',
    description: 'Sing a song with "love" in the title — 72%+ accuracy', descriptionKey: 'challenges.loveGuru.description',
    icon: '💗', difficulty: 'easy', modifiers: [], xpReward: 160,
    category: { field: 'titleContains', value: 'love' },
    completionTarget: { metric: 'accuracy', direction: 'min', value: 72 },
  },
  {
    id: 'one-hit-wonder',
    name: 'One-Word Wonder', nameKey: 'challenges.oneWordWonder.name',
    description: 'Sing a one-word-title song with 72%+ accuracy', descriptionKey: 'challenges.oneWordWonder.description',
    icon: '💬', difficulty: 'easy', modifiers: [], xpReward: 160,
    category: { field: 'oneWordTitle' },
    completionTarget: { metric: 'accuracy', direction: 'min', value: 72 },
  },
  {
    id: 'duo-dynamo',
    name: 'Duo Dynamo', nameKey: 'challenges.duoDynamo.name',
    description: 'Sing a song with a featured artist — 70%+ accuracy', descriptionKey: 'challenges.duoDynamo.description',
    icon: '🤝', difficulty: 'easy', modifiers: [], xpReward: 150,
    category: { field: 'featuredArtist' },
    completionTarget: { metric: 'accuracy', direction: 'min', value: 70 },
  },
  {
    id: 'band-battle',
    name: 'Band Battle', nameKey: 'challenges.bandBattle.name',
    description: 'Sing a song by a band or duo — 72%+ accuracy', descriptionKey: 'challenges.bandBattle.description',
    icon: '👥', difficulty: 'easy', modifiers: [], xpReward: 150,
    category: { field: 'bandArtist' },
    completionTarget: { metric: 'accuracy', direction: 'min', value: 72 },
  },
  {
    id: 'question-quest',
    name: 'Question Quest', nameKey: 'challenges.questionQuest.name',
    description: 'Sing a song with a "?" in the title — 70%+ accuracy', descriptionKey: 'challenges.questionQuest.description',
    icon: '❓', difficulty: 'easy', modifiers: [], xpReward: 150,
    category: { field: 'questionTitle' },
    completionTarget: { metric: 'accuracy', direction: 'min', value: 70 },
  },
  {
    id: 'pulse-racer',
    name: 'Pulse Racer', nameKey: 'challenges.pulseRacer.name',
    description: 'Sing a 140+ BPM song with 70%+ accuracy', descriptionKey: 'challenges.pulseRacer.description',
    icon: '🥁', difficulty: 'medium', modifiers: [], xpReward: 240,
    category: { field: 'bpmMin', value: 140 },
    completionTarget: { metric: 'accuracy', direction: 'min', value: 70 },
  },
  {
    id: 'slow-groove',
    name: 'Slow Groove', nameKey: 'challenges.slowGroove.name',
    description: 'Sing a ≤90 BPM song with 75%+ accuracy', descriptionKey: 'challenges.slowGroove.description',
    icon: '🐢', difficulty: 'easy', modifiers: [], xpReward: 170,
    category: { field: 'bpmMax', value: 90 },
    completionTarget: { metric: 'accuracy', direction: 'min', value: 75 },
  },
];

/** Get a localized challenge mode with translated name, description, and modifier descriptions. */
export function getLocalizedChallengeMode(mode: ChallengeMode, language?: Language): Omit<ChallengeMode, 'modifiers'> & { modifiers: Array<{ type: string; value?: number; description: string }> } {
  return {
    ...mode,
    name: t(mode.nameKey, language),
    description: t(mode.descriptionKey, language),
    modifiers: mode.modifiers.map(m => ({
      type: m.type,
      value: m.value,
      description: m.descriptionKey ? t(m.descriptionKey, language) : m.description,
    })),
  };
}

// ===================== CHALLENGE MIXER =====================

export interface CustomChallengeConfig {
  name: string;
  modifiers: ChallengeModifier[];
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
  timeLimit?: number;
}

/**
 * Create a custom challenge mode from a combination of modifiers.
 * Calculates XP reward based on the combined difficulty of modifiers.
 * Returns a ChallengeMode object compatible with the existing system.
 */
export function createCustomChallenge(config: CustomChallengeConfig): ChallengeMode {
  // Base XP: 150
  // Per modifier bonus: +50 per modifier
  // Difficulty multiplier: easy 1x, medium 1.5x, hard 2x, extreme 3x
  const baseXP = 150;
  const modifierBonus = config.modifiers.length * 50;
  const difficultyMultiplier = { easy: 1, medium: 1.5, hard: 2, extreme: 3 }[config.difficulty];
  const xpReward = Math.round((baseXP + modifierBonus) * difficultyMultiplier);

  return {
    id: `custom-${Date.now()}`,
    name: config.name,
    nameKey: '',
    description: config.modifiers.map(m => m.description).join(', '),
    descriptionKey: '',
    icon: '🔧',
    difficulty: config.difficulty,
    modifiers: config.modifiers,
    xpReward,
    timeLimit: config.timeLimit,
  };
}

export const AVAILABLE_MODIFIERS: Array<{ type: ChallengeModifier['type']; label: string; labelKey: string; description: string; descriptionKey: string; defaultValue?: number; difficulty: 'easy' | 'medium' | 'hard' | 'extreme' }> = [
  { type: 'no_lyrics', label: 'No Lyrics', labelKey: 'modifiers.noLyrics.label', description: 'Lyrics are hidden', descriptionKey: 'modifiers.noLyrics.description', difficulty: 'medium' },
  { type: 'no_pitch_guide', label: 'No Pitch Guide', labelKey: 'modifiers.noPitchGuide.label', description: 'Pitch guide is hidden', descriptionKey: 'modifiers.noPitchGuide.description', difficulty: 'hard' },
  { type: 'double_speed', label: 'Speed Boost', labelKey: 'modifiers.doubleSpeed.label', description: 'Song plays faster', descriptionKey: 'modifiers.doubleSpeed.description', defaultValue: 1.5, difficulty: 'hard' },
  { type: 'half_speed', label: 'Slow Motion', labelKey: 'modifiers.halfSpeed.label', description: 'Song plays slower', descriptionKey: 'modifiers.halfSpeed.description', defaultValue: 0.75, difficulty: 'easy' },
  { type: 'perfect_only', label: 'Perfectionist', labelKey: 'modifiers.perfectOnly.label', description: 'Only perfect notes count', descriptionKey: 'modifiers.perfectOnly.description', difficulty: 'extreme' },
  { type: 'golden_only', label: 'Golden Hunter', labelKey: 'modifiers.goldenOnly.label', description: 'Only golden notes count', descriptionKey: 'modifiers.goldenOnly.description', difficulty: 'hard' },
  { type: 'missing_words', label: 'Missing Words', labelKey: 'modifiers.missingWords.label', description: 'Some words are hidden', descriptionKey: 'modifiers.missingWords.description', defaultValue: 20, difficulty: 'medium' },
  { type: 'blind', label: 'Blind', labelKey: 'modifiers.blind.label', description: 'No lyrics and no pitch guide', descriptionKey: 'modifiers.blind.description', difficulty: 'hard' },
];

/** Get a localized modifier with translated label and description. */
export function getLocalizedModifier(modifier: typeof AVAILABLE_MODIFIERS[number], language?: Language): { label: string; description: string } {
  return {
    label: t(modifier.labelKey, language),
    description: t(modifier.descriptionKey, language),
  };
}

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