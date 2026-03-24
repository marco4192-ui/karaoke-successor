// Achievement System
import { Achievement, PlayerProfile } from '@/types/game';

// Daily Challenge type (local definition)
export interface DailyChallenge {
  id: string;
  type: 'score' | 'accuracy' | 'combo' | 'songs' | 'perfect_notes';
  target: number;
  reward: number;
  date: string;
  description: string;
  completed?: boolean;
  progress?: number;
}

// Achievement tracking state
export interface AchievementState {
  unlockedIds: string[];
  lastUnlockedAt: number | null;
  totalUnlocked: number;
}

// Daily Challenge State
export interface DailyChallengeState {
  currentChallenge: DailyChallenge | null;
  streak: number;
  lastCompletedDate: string | null;
  completedToday: boolean;
}

// Practice Mode State
export interface PracticeModeState {
  enabled: boolean;
  loopStart: number | null; // milliseconds
  loopEnd: number | null; // milliseconds
  playbackRate: number; // 0.5 to 1.5
  pitchGuideEnabled: boolean;
  autoPlayNotes: boolean;
}

// Duet Mode State
export interface DuetModeState {
  enabled: boolean;
  player1DeviceId: string | null;
  player2DeviceId: string | null;
  player1Pitch: number | null;
  player2Pitch: number | null;
  harmonyScore: number;
  lastHarmonyBonus: number;
}

// Generate daily challenge
export function generateDailyChallenge(): DailyChallenge {
  const today = new Date().toISOString().split('T')[0];
  const types: Array<DailyChallenge['type']> = ['score', 'accuracy', 'combo', 'songs', 'perfect_notes'];
  const type = types[Math.floor(Math.random() * types.length)];
  
  const targets: Record<DailyChallenge['type'], number> = {
    score: Math.floor(Math.random() * 5000 + 3000), // 3000-8000 points
    accuracy: Math.floor(Math.random() * 20 + 80), // 80-100%
    combo: Math.floor(Math.random() * 30 + 20), // 20-50 combo
    songs: Math.floor(Math.random() * 3 + 2), // 2-5 songs
    perfect_notes: Math.floor(Math.random() * 30 + 20), // 20-50 perfect notes
  };
  
  const descriptions: Record<DailyChallenge['type'], string> = {
    score: `Score ${targets.score}+ points in a single song`,
    accuracy: `Achieve ${targets.accuracy}%+ accuracy`,
    combo: `Hit a ${targets.combo}+ note combo`,
    songs: `Complete ${targets.songs} songs today`,
    perfect_notes: `Hit ${targets.perfect_notes} perfect notes`,
  };
  
  return {
    id: `daily-${today}`,
    date: today,
    type,
    target: targets[type],
    description: descriptions[type],
    reward: Math.floor(targets[type] * 10),
    completed: false,
    progress: 0,
  };
}

// Check if achievement should be unlocked
export function checkAchievement(
  achievementId: string, 
  stats: {
    currentCombo: number;
    totalScore: number;
    songsCompleted: number;
    perfectNotesInSong: number;
    goldenNotesHit: number;
    goldenNotesTotal: number;
    octavesUsed: Set<number>;
    gamesPlayed: number;
    dailyStreak: number;
    accuracy: number;
    isBlindMode: boolean;
    isDuet: boolean;
    harmonyScore: number;
    recoveredFromZeroCombo: boolean;
  }
): boolean {
  switch (achievementId) {
    case 'first_song':
      return stats.songsCompleted >= 1;
    case 'perfect_streak_10':
      return stats.currentCombo >= 10;
    case 'perfect_streak_50':
      return stats.currentCombo >= 50;
    case 'golden_voice':
      return stats.goldenNotesTotal > 0 && stats.goldenNotesHit === stats.goldenNotesTotal;
    case 'octave_master':
      return stats.octavesUsed.size >= 4;
    case 'speed_singer':
      return stats.accuracy >= 90; // Requires fast song
    case 'party_animal':
      return stats.gamesPlayed >= 5;
    case 'duet_champion':
      return stats.isDuet && stats.harmonyScore >= 90;
    case 'comeback_kid':
      return stats.recoveredFromZeroCombo;
    case 'million_points':
      return stats.totalScore >= 1000000;
    case 'songs_10':
      return stats.songsCompleted >= 10;
    case 'songs_50':
      return stats.songsCompleted >= 50;
    case 'blind_master':
      return stats.isBlindMode && stats.accuracy >= 80;
    case 'daily_streak_7':
      return stats.dailyStreak >= 7;
    default:
      return false;
  }
}

// Calculate harmony score for duet mode
export function calculateHarmonyScore(
  player1Pitch: number | null,
  player2Pitch: number | null,
  targetPitch: number
): number {
  if (player1Pitch === null || player2Pitch === null) return 0;
  
  // Both players singing
  const p1Diff = Math.abs(player1Pitch - targetPitch);
  const p2Diff = Math.abs(player2Pitch - targetPitch);
  
  // Harmony bonus if both are close to the target
  if (p1Diff <= 2 && p2Diff <= 2) {
    // Perfect harmony - both hitting the same note
    return 100;
  } else if (p1Diff <= 3 && p2Diff <= 3) {
    // Good harmony
    return 80;
  } else if (p1Diff <= 5 || p2Diff <= 5) {
    // Partial harmony
    return 50;
  }
  
  return 0;
}

// Calculate duet bonus points
export function calculateDuetBonus(harmonyScore: number): number {
  if (harmonyScore >= 100) return 200; // Perfect harmony
  if (harmonyScore >= 80) return 100; // Good harmony
  if (harmonyScore >= 50) return 50; // Partial harmony
  return 0;
}

// Practice Mode Helpers
export const PLAYBACK_RATES = [
  { value: 0.5, label: '0.5x' },
  { value: 0.75, label: '0.75x' },
  { value: 0.9, label: '0.9x' },
  { value: 1.0, label: '1.0x (Normal)' },
];

export function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}
