/**
 * Shared XP level configuration for Daily Challenge progression display.
 *
 * NOTE: This is separate from the profile leveling system in player-progression.ts,
 * which uses a formula-based approach (500/1000/2000/4000/8000 XP per tier range).
 * The daily challenge display uses a curated 10-level system with named titles.
 */

interface XPLevelThreshold {
  xp: number;
  title: string;
}

export const XP_LEVEL_THRESHOLDS: XPLevelThreshold[] = [
  { xp: 0, title: 'Novice' },
  { xp: 500, title: 'Beginner' },
  { xp: 1500, title: 'Apprentice' },
  { xp: 3000, title: 'Singer' },
  { xp: 5000, title: 'Performer' },
  { xp: 8000, title: 'Artist' },
  { xp: 12000, title: 'Star' },
  { xp: 18000, title: 'Superstar' },
  { xp: 25000, title: 'Legend' },
  { xp: 50000, title: 'Icon' },
];
