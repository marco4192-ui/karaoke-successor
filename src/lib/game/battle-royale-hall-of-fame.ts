// Battle Royale – Hall of Fame persistence

import type { BattleRoyaleGame, HallOfFameEntry } from './battle-royale-types';

const HALL_OF_FAME_KEY = 'karaoke-battle-royale-hall-of-fame';
const MAX_HALL_OF_FAME_ENTRIES = 50;

// ==================== PUBLIC ====================

export function getHallOfFame(): HallOfFameEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(HALL_OF_FAME_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed as HallOfFameEntry[];
  } catch {
    return [];
  }
}

// ==================== INTERNAL ====================

export function saveHallOfFame(entries: HallOfFameEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(HALL_OF_FAME_KEY, JSON.stringify(entries));
  } catch {
    // localStorage might be full or unavailable
  }
}

export function recordHallOfFame(game: BattleRoyaleGame): void {
  if (!game.winner) return;

  const winner = game.winner;
  const survivalRounds = game.currentRound; // winner survived all rounds
  const existing = getHallOfFame();

  // Find existing entry for this player
  const existingIndex = existing.findIndex(e => e.playerId === winner.id);

  if (existingIndex >= 0) {
    const entry = existing[existingIndex];
    entry.wins += 1;
    entry.totalGames += 1;
    entry.currentWinStreak += 1;
    entry.longestWinStreak = Math.max(entry.longestWinStreak, entry.currentWinStreak);
    entry.bestScore = Math.max(entry.bestScore, winner.score);
    entry.lastWinDate = Date.now();
    // Update average survival: (oldAvg * (totalGames-1) + newSurvival) / totalGames
    entry.averageSurvivalRounds = Math.round(
      (entry.averageSurvivalRounds * (entry.totalGames - 1) + survivalRounds) / entry.totalGames
    );
    existing[existingIndex] = entry;
  } else {
    existing.push({
      playerId: winner.id,
      playerName: winner.name,
      playerAvatar: winner.avatar,
      playerColor: winner.color,
      playerType: winner.playerType,
      wins: 1,
      totalGames: 1,
      bestScore: winner.score,
      longestWinStreak: 1,
      currentWinStreak: 1,
      averageSurvivalRounds: survivalRounds,
      lastWinDate: Date.now(),
    });
  }

  // Reset win streak for all players who participated but didn't win
  const participantIds = new Set(game.players.map(p => p.id));
  for (const entry of existing) {
    if (participantIds.has(entry.playerId) && entry.playerId !== winner.id) {
      entry.currentWinStreak = 0;
      entry.totalGames += 1;
      // Update average survival
      const playerSurvival = game.players.find(p => p.id === entry.playerId);
      const rounds = playerSurvival?.eliminationRound ?? survivalRounds;
      entry.averageSurvivalRounds = Math.round(
        (entry.averageSurvivalRounds * (entry.totalGames - 1) + rounds) / entry.totalGames
      );
    }
  }

  // Sort by wins (desc), then best score (desc), then last win date (desc)
  existing.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.bestScore !== a.bestScore) return b.bestScore - a.bestScore;
    return b.lastWinDate - a.lastWinDate;
  });

  // Keep only top entries
  saveHallOfFame(existing.slice(0, MAX_HALL_OF_FAME_ENTRIES));
}
