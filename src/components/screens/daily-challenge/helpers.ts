// Daily Challenge Screen — pure helpers & style constants
//
// Part of the daily-challenge-screen module (see ./daily-challenge-screen.tsx).

import type { DailyTypeDefinition, WeeklyTypeDefinition } from '@/lib/game/daily-challenge';
import { getDailyType } from '@/lib/game/daily-challenge';
import type { DailySongContext } from '@/lib/game/challenge-pools';
import type { DailyDifficulty } from '@/lib/game/daily-challenge';
import type { Song } from '@/types/game';

/** Map a library Song to the category-evaluation context. */
export function songToContext(song: Song, playerCount = 1): DailySongContext {
  return {
    title: song.title,
    artist: song.artist,
    genre: song.genre,
    language: song.language,
    year: song.year,
    durationMs: song.duration,
    bpm: song.bpm,
    rating: song.rating,
    difficulty: song.difficulty,
    lastPlayed: song.lastPlayed,
    dateAdded: song.dateAdded,
    playerCount,
  };
}

/** Localized display name of a daily/weekly type (interpolates nameParams). */
export function typeName(def: DailyTypeDefinition | WeeklyTypeDefinition, t: (key: string) => string): string {
  let name = t(def.nameKey);
  if (def.nameParams) {
    for (const [key, value] of Object.entries(def.nameParams)) {
      name = name.replaceAll(`{${key}}`, value);
    }
  }
  return name;
}

/** Format a metric value for display (percent types get one decimal + %). */
export function formatDailyValue(metricKey: string, value: number): string {
  if (metricKey === 'accuracy' || metricKey === 'tickAccuracy') {
    return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
  }
  return Number.isInteger(value) ? value.toLocaleString() : value.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

/** Metric label for a daily type (board value captions). */
export function metricLabel(type: string, t: (key: string) => string): string {
  switch (getDailyType(type).metricKey) {
    case 'accuracy': return '%';
    case 'tickAccuracy': return t('dailyChallengeScreen.tickAccuracyLabel');
    case 'maxCombo': return t('dailyChallengeScreen.comboLabel');
    case 'perfectNotesCount': return t('dailyChallengeScreen.perfectNotesLabel');
    case 'goldenNotesCount': return t('dailyChallengeScreen.goldenNotesLabel');
    case 'notesHit': return t('dailyChallengeScreen.notesHitLabel');
    case 'notesMissed': return t('dailyChallengeScreen.missedNotesLabel');
    default: return t('dailyChallengeScreen.points');
  }
}

/** Difficulty chip styling per level */
export function difficultyChipClass(id: DailyDifficulty, active: boolean): string {
  const base = 'flex-1 min-w-[92px] sm:min-w-0 px-2.5 py-2 rounded-lg text-xs font-medium transition-all border flex items-center justify-center gap-1.5';
  if (!active) return `${base} bg-white/5 border-white/10 text-white/70 hover:bg-white/10`;
  switch (id) {
    case 'easy': return `${base} bg-green-500/20 border-green-500 text-green-300 ring-1 ring-green-400/50`;
    case 'normal': return `${base} bg-yellow-500/20 border-yellow-500 text-yellow-300 ring-1 ring-yellow-400/50`;
    case 'hard': return `${base} bg-orange-500/20 border-orange-500 text-orange-300 ring-1 ring-orange-400/50`;
    case 'very_hard': return `${base} bg-red-500/20 border-red-500 text-red-300 ring-1 ring-red-400/50`;
    case 'insane': return `${base} bg-fuchsia-500/20 border-fuchsia-500 text-fuchsia-300 ring-1 ring-fuchsia-400/50`;
  }
}

/** Badge tier chip styling */
export function tierChipClass(tier: 'bronze' | 'silver' | 'gold', reached: boolean): string {
  const base = 'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all';
  if (!reached) return `${base} bg-white/5 border-white/10 text-white/40`;
  switch (tier) {
    case 'bronze': return `${base} bg-amber-700/30 border-amber-600 text-amber-300 ring-1 ring-amber-500/50`;
    case 'silver': return `${base} bg-gray-400/20 border-gray-300 text-gray-100 ring-1 ring-gray-300/50`;
    case 'gold': return `${base} bg-yellow-500/20 border-yellow-400 text-yellow-200 ring-1 ring-yellow-400/60`;
  }
}

export const TIER_ICONS: Record<string, string> = { bronze: '🥉', silver: '🥈', gold: '🥇' };
export const TIER_LABEL_KEYS: Record<string, string> = {
  bronze: 'dailyChallengeScreen.tierBronze',
  silver: 'dailyChallengeScreen.tierSilver',
  gold: 'dailyChallengeScreen.tierGold',
};
