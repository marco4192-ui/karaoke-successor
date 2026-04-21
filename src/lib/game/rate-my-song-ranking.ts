/**
 * Rate my Song — Ranking & Highscore persistence
 *
 * Stores rating history in localStorage. Provides a ranking sorted by
 * weighted score:  rating * log2(ratingCount + 1)  which rewards both
 * high ratings AND a larger number of evaluations.
 */

const STORAGE_KEY_ALLTIME = 'karaoke-rate-my-song-history';
const STORAGE_KEY_DAILY = 'karaoke-rate-my-song-daily';

export interface RateMySongEntry {
  id: string;              // unique entry id
  songId: string;
  songTitle: string;
  songArtist: string;
  playerId: string;
  playerName: string;
  playerColor: string;
  rating: number;          // average 1-10
  ratingCount: number;     // how many audience members voted
  timestamp: number;       // Date.now()
}

export interface RateMySongDailyEntry {
  id: string;
  songId: string;
  songTitle: string;
  songArtist: string;
  playerId: string;
  playerName: string;
  playerColor: string;
  rating: number;
  ratingCount: number;
  timestamp: number;
  date: string;            // 'YYYY-MM-DD'
}

export interface RateMySongRanking {
  entries: RateMySongEntry[];
}

function loadRanking(): RateMySongRanking {
  if (typeof window === 'undefined') return { entries: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ALLTIME);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { entries: [] };
}

function saveRanking(ranking: RateMySongRanking) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_ALLTIME, JSON.stringify(ranking));
  } catch { /* ignore quota errors */ }
}

// ── Daily Highscore helpers ──

function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface DailyRanking {
  entries: RateMySongDailyEntry[];
}

function loadDailyRanking(): DailyRanking {
  if (typeof window === 'undefined') return { entries: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DAILY);
    if (raw) {
      const data: DailyRanking = JSON.parse(raw);
      // Clean up entries older than today
      const today = getTodayString();
      data.entries = data.entries.filter(e => e.date === today);
      return data;
    }
  } catch { /* ignore */ }
  return { entries: [] };
}

function saveDailyRanking(data: DailyRanking) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_DAILY, JSON.stringify(data));
  } catch { /* ignore quota errors */ }
}

/** Add a new rating entry (or update existing for same player+song) */
export function addRateMySongEntry(entry: Omit<RateMySongEntry, 'id' | 'timestamp'>): RateMySongEntry {
  const ranking = loadRanking();

  // Check for existing entry for the same player + song
  const existingIdx = ranking.entries.findIndex(
    e => e.playerId === entry.playerId && e.songId === entry.songId
  );

  const newEntry: RateMySongEntry = {
    ...entry,
    id: existingIdx >= 0 ? ranking.entries[existingIdx].id : crypto.randomUUID(),
    timestamp: Date.now(),
  };

  if (existingIdx >= 0) {
    // Update existing: keep the best rating
    const old = ranking.entries[existingIdx];
    if (entry.rating > old.rating) {
      newEntry.id = old.id;
      ranking.entries[existingIdx] = newEntry;
    } else {
      // Update rating count even if rating isn't better
      ranking.entries[existingIdx] = {
        ...old,
        ratingCount: old.ratingCount + entry.ratingCount,
      };
      saveRanking(ranking);
      return ranking.entries[existingIdx];
    }
  } else {
    ranking.entries.push(newEntry);
  }

  saveRanking(ranking);
  return newEntry;
}

/** Get all entries sorted by weighted score (descending) */
export function getRateMySongRanking(): RateMySongEntry[] {
  const ranking = loadRanking();
  return ranking.entries.sort((a, b) => {
    const scoreA = a.rating * Math.log2(a.ratingCount + 1);
    const scoreB = b.rating * Math.log2(b.ratingCount + 1);
    return scoreB - scoreA;
  });
}

/** Get the top N entries for display */
export function getRateMySongTopN(n: number = 10): RateMySongEntry[] {
  return getRateMySongRanking().slice(0, n);
}

// ── Daily Highscore ──

/** Add a daily entry — keeps the best rating per player+song for today */
export function addDailyRateMySongEntry(entry: Omit<RateMySongDailyEntry, 'id' | 'timestamp' | 'date'>): RateMySongDailyEntry {
  const daily = loadDailyRanking();
  const today = getTodayString();

  const existingIdx = daily.entries.findIndex(
    e => e.playerId === entry.playerId && e.songId === entry.songId && e.date === today
  );

  const newEntry: RateMySongDailyEntry = {
    ...entry,
    id: existingIdx >= 0 ? daily.entries[existingIdx].id : crypto.randomUUID(),
    timestamp: Date.now(),
    date: today,
  };

  if (existingIdx >= 0) {
    const old = daily.entries[existingIdx];
    if (entry.rating > old.rating) {
      newEntry.id = old.id;
      daily.entries[existingIdx] = newEntry;
    } else {
      // Update rating count even if rating isn't better
      daily.entries[existingIdx] = {
        ...old,
        ratingCount: old.ratingCount + entry.ratingCount,
      };
      saveDailyRanking(daily);
      return daily.entries[existingIdx];
    }
  } else {
    daily.entries.push(newEntry);
  }

  saveDailyRanking(daily);
  return newEntry;
}

/** Get today's entries sorted by rating (descending) */
export function getDailyRateMySongTopN(n: number = 10): RateMySongDailyEntry[] {
  const daily = loadDailyRanking();
  return daily.entries
    .sort((a, b) => b.rating - a.rating)
    .slice(0, n);
}

/** Get ranking for a specific player */
export function getPlayerRateMySongRanking(playerId: string): RateMySongEntry[] {
  const ranking = loadRanking();
  return ranking.entries
    .filter(e => e.playerId === playerId)
    .sort((a, b) => {
      const scoreA = a.rating * Math.log2(a.ratingCount + 1);
      const scoreB = b.rating * Math.log2(b.ratingCount + 1);
      return scoreB - scoreA;
    });
}

/** Clear all rating history */
export function clearRateMySongRanking() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY_ALLTIME);
  localStorage.removeItem(STORAGE_KEY_DAILY);
}
