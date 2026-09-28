// Achievement definitions (pure data) for Karaoke ZERO.
//
// Split out of achievements.ts (R3 refactor): the ~1200-line
// ACHIEVEMENT_DEFINITIONS array lives in three thematic data files and is
// merged here in the exact original order:
//  - achievement-definitions-core.ts .................... base set
//    (performance / progression / social / special / daily & weekly /
//     extended performance / social & variety)
//  - achievement-definitions-expansion-performance.ts ... 100-achievement
//    expansion, part 1 (extended performance + cumulative note grinders)
//  - achievement-definitions-expansion-progression.ts ... 100-achievement
//    expansion, part 2 (long-term progression + daily & weekly grinders +
//    social grinders + specials & variety)
//
// The checking/localization logic stays in achievements.ts, which re-exports
// ACHIEVEMENT_DEFINITIONS so existing import paths keep working.

import { ACHIEVEMENT_DEFINITIONS_CORE } from './achievement-definitions-core';
import { ACHIEVEMENT_DEFINITIONS_EXPANSION_PERFORMANCE } from './achievement-definitions-expansion-performance';
import { ACHIEVEMENT_DEFINITIONS_EXPANSION_PROGRESSION } from './achievement-definitions-expansion-progression';

export interface AchievementDefinition {
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
  ...ACHIEVEMENT_DEFINITIONS_CORE,
  ...ACHIEVEMENT_DEFINITIONS_EXPANSION_PERFORMANCE,
  ...ACHIEVEMENT_DEFINITIONS_EXPANSION_PROGRESSION,
];
