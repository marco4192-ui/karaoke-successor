// R85 E2E seed — party scenario: online-linked guest + local guest
(() => {
  const now = Date.now();
  const pad = (n) => String(n).padStart(2, '0');
  const d = new Date();
  const today = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  // ISO week (matches getISOWeek closely enough for a key name)
  const monday = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (monday.getUTCDay() + 6) % 7;
  monday.setUTCDate(monday.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(monday.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((monday.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);

  const stats = {
    totalNotesHit: 120, totalNotesMissed: 30, bestCombo: 42, perfectStreaks: 2,
    goldenNotesHit: 6, averageAccuracy: 84.5, totalGamesPlayed: 3, totalSongsCompleted: 3,
    totalTimeSung: 620, bestScore: 9200, worstScore: 5100, perfectGames: 0,
    difficultyStats: {
      easy: { games: 1, avgAccuracy: 86, bestScore: 8100 },
      medium: { games: 1, avgAccuracy: 85, bestScore: 9200 },
      hard: { games: 1, avgAccuracy: 80, bestScore: 7300 },
    },
    lowestNote: 48, highestNote: 72, recentScores: [], genreStats: {},
    currentStreak: 1, bestStreak: 2, lastPlayedDate: now,
  };

  const profileOnline = {
    id: 'party-guest-online', name: 'PartyGast', color: '#ec4899',
    totalScore: 24600, gamesPlayed: 3, songsCompleted: 3, achievements: [],
    stats, createdAt: now - 86400000, xp: 1500, level: 3,
    storageMode: 'online', syncCode: 'AB12CD34EF56', syncUid: 'uid-party-guest',
    isActive: true,
  };
  const profileLocal = {
    id: 'local-guest', name: 'LokalerGast', color: '#22c55e',
    totalScore: 10000, gamesPlayed: 1, songsCompleted: 1, achievements: [],
    stats, createdAt: now - 3600000, xp: 500, level: 1,
    storageMode: 'local', isActive: true,
  };

  const hs = (id, playerId, name, color, songId, score) => ({
    id, playerId, playerName: name, playerColor: color, songId,
    songTitle: 'Testlied', artist: 'Testband', score, accuracy: 85.5,
    maxCombo: 40, difficulty: 'easy', gameMode: 'standard', rating: 'great',
    rankTitle: 'Gold', playedAt: now - 7200000,
  });

  const state = {
    profiles: [profileOnline, profileLocal],
    activeProfileId: 'party-guest-online',
    highscores: [
      hs('hs-1', 'party-guest-online', 'PartyGast', '#ec4899', 'song-a', 8800),
      hs('hs-2', 'party-guest-online', 'PartyGast', '#ec4899', 'song-b', 7600),
      hs('hs-3', 'local-guest', 'LokalerGast', '#22c55e', 'song-a', 5400),
    ],
    leaderboardType: 'global',
    onlineEnabled: true,
    persistedDifficulty: 'easy',
  };
  localStorage.setItem('karaoke-successor-storage', JSON.stringify({ state, version: 0 }));
  localStorage.setItem('karaoke-language', 'de');

  // Daily/weekly/quest traces of BOTH players (PartyGast must be wiped, LokalerGast must stay)
  localStorage.setItem('karaoke_daily_slot_progress_party-guest-online', JSON.stringify({ date: today, completedSlots: [0, 1], metBySlot: { 0: true } }));
  localStorage.setItem('karaoke_daily_slot_progress_local-guest', JSON.stringify({ date: today, completedSlots: [0], metBySlot: {} }));
  localStorage.setItem('karaoke_weekly_slot_progress_party-guest-online', JSON.stringify({ date: today, completedSlots: [0], metBySlot: {} }));
  localStorage.setItem('playerDailyStats_party-guest-online', JSON.stringify({ currentStreak: 2, longestStreak: 5, lastCompletedDate: today, totalXP: 800 }));
  localStorage.setItem('karaoke_quest_progress_party-guest-online', JSON.stringify({ q1: { progress: 3, claimed: false } }));
  localStorage.setItem('karaoke_quest_stats_party-guest-online', JSON.stringify({ claimed: 2 }));
  localStorage.setItem('karaoke_daily_best_results', JSON.stringify({
    'party-guest-online': { playerId: 'party-guest-online', score: 9100, accuracy: 88, combo: 30, perfectNotes: 12, completedAt: now, targetMet: true, date: today },
    'local-guest': { playerId: 'local-guest', score: 5200, accuracy: 80, combo: 20, perfectNotes: 5, completedAt: now, targetMet: false, date: today },
  }));
  localStorage.setItem('karaoke_daily_slot_scores_' + today, JSON.stringify([
    { playerId: 'party-guest-online', playerName: 'PartyGast', playerColor: '#ec4899', slot: 0, difficulty: 'easy', metric: 8500, completedAt: now },
    { playerId: 'local-guest', playerName: 'LokalerGast', playerColor: '#22c55e', slot: 0, difficulty: 'easy', metric: 5200, completedAt: now },
  ]));
  localStorage.setItem('dailyChallengeLeaderboard_' + today, JSON.stringify({
    date: today, type: 'score_sum', target: 8000, seed: 1,
    entries: [
      { playerId: 'party-guest-online', playerName: 'PartyGast', playerColor: '#ec4899', score: 9100, accuracy: 88, combo: 30, perfectNotesCount: 12, completedAt: now, rank: 1 },
      { playerId: 'local-guest', playerName: 'LokalerGast', playerColor: '#22c55e', score: 5200, accuracy: 80, combo: 20, perfectNotesCount: 5, completedAt: now, rank: 2 },
    ],
    totalParticipants: 2,
  }));
  localStorage.setItem('karaoke_weekly_challenge_' + week + '_' + d.getFullYear(), JSON.stringify({
    weekNumber: week, year: d.getFullYear(), slots: [],
    entries: [
      { playerId: 'party-guest-online', playerName: 'PartyGast', playerColor: '#ec4899', slot: 0, metric: 9100, completedAt: now },
      { playerId: 'local-guest', playerName: 'LokalerGast', playerColor: '#22c55e', slot: 0, metric: 5200, completedAt: now },
    ],
  }));
  return 'SEEDED ' + today + ' W' + week;
})()
