/**
 * Rate my Song — Ranking, Highscore persistence, Player Stats,
 * Ranks, Achievements, AI Critic Comments, Challenge Cards & Song Suggestions
 *
 * Stores rating history in localStorage. Provides a ranking sorted by
 * weighted score:  rating * log2(ratingCount + 1)  which rewards both
 * high ratings AND a larger number of evaluations.
 */

import { StorageKeys, getJson, setJson } from '@/lib/storage';
import { getAllSongs } from '@/lib/game/song-library';

// ── Storage Keys ──

const STORAGE_KEY_ALLTIME = StorageKeys.RATE_MY_SONG_HISTORY;
const STORAGE_KEY_DAILY = StorageKeys.RATE_MY_SONG_DAILY;
const STORAGE_KEY_PLAYER_STATS = StorageKeys.RATE_MY_SONG_PLAYER_STATS;

// ══════════════════════════════════════════════════════════════════════════
// A. EXISTING RANKING SYSTEM (preserved)
// ══════════════════════════════════════════════════════════════════════════

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

interface RateMySongRanking {
  entries: RateMySongEntry[];
}

function loadRanking(): RateMySongRanking {
  return getJson<RateMySongRanking>(STORAGE_KEY_ALLTIME, { entries: [] });
}

function saveRanking(ranking: RateMySongRanking) {
  setJson(STORAGE_KEY_ALLTIME, ranking);
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
  const data = getJson<DailyRanking>(STORAGE_KEY_DAILY, { entries: [] });
  // Clean up entries older than today
  const today = getTodayString();
  data.entries = data.entries.filter(e => e.date === today);
  return data;
}

function saveDailyRanking(data: DailyRanking) {
  setJson(STORAGE_KEY_DAILY, data);
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
      newEntry.ratingCount = old.ratingCount + entry.ratingCount;
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
function getRateMySongRanking(): RateMySongEntry[] {
  const ranking = loadRanking();
  return [...ranking.entries].sort((a, b) => {
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
      newEntry.ratingCount = old.ratingCount + entry.ratingCount;
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

// ══════════════════════════════════════════════════════════════════════════
// B. PLAYER STATISTICS (persistent in localStorage)
// ══════════════════════════════════════════════════════════════════════════

export interface RateMySongPlayerStats {
  playerId: string;
  playerName: string;
  playerColor: string;
  totalPerformances: number;
  totalRatingSum: number;
  bestRating: number;
  bestSongTitle: string;
  worstRating: number;
  totalAudienceRatings: number;
  genresPerformed: Record<string, number>; // genre -> count
  achievements: string[]; // achievement IDs earned
  lastPerformanceDate: string; // YYYY-MM-DD
}

function createDefaultStats(playerId: string, playerName: string, playerColor: string): RateMySongPlayerStats {
  return {
    playerId,
    playerName,
    playerColor,
    totalPerformances: 0,
    totalRatingSum: 0,
    bestRating: 0,
    bestSongTitle: '',
    worstRating: 10,
    totalAudienceRatings: 0,
    genresPerformed: {},
    achievements: [],
    lastPerformanceDate: '',
  };
}

function loadAllPlayerStats(): RateMySongPlayerStats[] {
  return getJson<RateMySongPlayerStats[]>(STORAGE_KEY_PLAYER_STATS, []);
}

function saveAllPlayerStats(stats: RateMySongPlayerStats[]) {
  setJson(STORAGE_KEY_PLAYER_STATS, stats);
}

/** Get stats for a specific player (creates defaults if not found) */
export function getRateMySongPlayerStats(playerId: string): RateMySongPlayerStats {
  const allStats = loadAllPlayerStats();
  const existing = allStats.find(s => s.playerId === playerId);
  if (existing) return existing;
  // Return a temporary default (not saved until first update)
  return createDefaultStats(playerId, '', '#888888');
}

/**
 * Update player stats after a performance.
 * Also checks and awards new achievements.
 * Returns the updated stats.
 */
export function updateRateMySongPlayerStats(
  playerId: string,
  playerName: string,
  playerColor: string,
  rating: number,
  songTitle: string,
  songGenre: string,
): RateMySongPlayerStats {
  const allStats = loadAllPlayerStats();
  let stats = allStats.find(s => s.playerId === playerId);

  if (!stats) {
    stats = createDefaultStats(playerId, playerName, playerColor);
    allStats.push(stats);
  }

  // Update name and color (may have changed)
  stats.playerName = playerName;
  stats.playerColor = playerColor;

  // Increment performances
  stats.totalPerformances += 1;

  // Accumulate rating sum
  stats.totalRatingSum += rating;

  // Track best / worst
  if (rating > stats.bestRating) {
    stats.bestRating = rating;
    stats.bestSongTitle = songTitle;
  }
  if (rating < stats.worstRating) {
    stats.worstRating = rating;
  }

  // Genre tracking
  if (songGenre) {
    const normalizedGenre = songGenre.trim().toLowerCase();
    stats.genresPerformed[normalizedGenre] = (stats.genresPerformed[normalizedGenre] || 0) + 1;
  }

  // Last performance date
  stats.lastPerformanceDate = getTodayString();

  // Check achievements
  const newAchievements = checkRateMySongAchievements(stats);
  for (const ach of newAchievements) {
    if (!stats.achievements.includes(ach)) {
      stats.achievements.push(ach);
    }
  }

  saveAllPlayerStats(allStats);
  return stats;
}

// TODO: Wire into results processing to enable crowd_favorite/centurion achievements
/** Add audience rating count to a player's stats (called per audience vote) */
export function addAudienceRatingToStats(playerId: string, count: number = 1): void {
  const allStats = loadAllPlayerStats();
  const stats = allStats.find(s => s.playerId === playerId);
  if (stats) {
    stats.totalAudienceRatings += count;
    saveAllPlayerStats(allStats);
  }
}


// ══════════════════════════════════════════════════════════════════════════
// C. RANK SYSTEM
// ══════════════════════════════════════════════════════════════════════════

export type RateMySongRank = 'Newcomer' | 'OpenMic' | 'Regular' | 'Star' | 'Superstar' | 'Legend';

export interface RankResult {
  rank: RateMySongRank;
  nextRank: RateMySongRank | null;
  progress: number; // 0–1 progress toward next rank
}

interface RankThreshold {
  rank: RateMySongRank;
  minPerformances: number;
  minAvgRating: number;
}

const RANK_THRESHOLDS: RankThreshold[] = [
  { rank: 'Newcomer',  minPerformances: 0,  minAvgRating: 0 },
  { rank: 'OpenMic',   minPerformances: 3,  minAvgRating: 5.0 },
  { rank: 'Regular',   minPerformances: 8,  minAvgRating: 5.5 },
  { rank: 'Star',      minPerformances: 15, minAvgRating: 7.0 },
  { rank: 'Superstar', minPerformances: 25, minAvgRating: 8.0 },
  { rank: 'Legend',    minPerformances: 40, minAvgRating: 9.0 },
];

/**
 * Calculate a player's rank based on total performances and average rating.
 * Ranks require meeting BOTH the minimum performances AND average rating thresholds,
 * except for Newcomer (default) and OpenMic (requires performances OR avg rating).
 */
export function getPlayerRank(stats: RateMySongPlayerStats): RankResult {
  const avg = stats.totalPerformances > 0 ? stats.totalRatingSum / stats.totalPerformances : 0;
  const perfs = stats.totalPerformances;

  let currentRankIdx = 0;

  for (let i = RANK_THRESHOLDS.length - 1; i >= 0; i--) {
    const t = RANK_THRESHOLDS[i];
    if (i === 0) {
      // Newcomer — always true
      currentRankIdx = 0;
      break;
    }
    const prev = RANK_THRESHOLDS[i - 1];
    if (i === 1) {
      // OpenMic: 3+ performances OR avg >= 5.0
      if (perfs >= t.minPerformances || avg >= t.minAvgRating) {
        currentRankIdx = i;
        break;
      }
    } else {
      // All other ranks: both conditions must be met
      if (perfs >= t.minPerformances && avg >= t.minAvgRating) {
        currentRankIdx = i;
        break;
      }
    }
  }

  const currentRank = RANK_THRESHOLDS[currentRankIdx].rank;
  const nextThreshold = RANK_THRESHOLDS[currentRankIdx + 1] ?? null;

  if (!nextThreshold) {
    return { rank: currentRank, nextRank: null, progress: 1 };
  }

  // Calculate progress toward next rank
  // Progress is based on whichever metric (performances or avg) is further behind
  const prev = RANK_THRESHOLDS[currentRankIdx];

  let perfProgress: number;
  if (prev.minPerformances === nextThreshold.minPerformances) {
    perfProgress = 1;
  } else {
    perfProgress = Math.min(1, Math.max(0,
      (perfs - prev.minPerformances) / (nextThreshold.minPerformances - prev.minPerformances)
    ));
  }

  let ratingProgress: number;
  if (prev.minAvgRating === nextThreshold.minAvgRating) {
    ratingProgress = 1;
  } else {
    ratingProgress = Math.min(1, Math.max(0,
      (avg - prev.minAvgRating) / (nextThreshold.minAvgRating - prev.minAvgRating)
    ));
  }

  // Use the minimum of both (need both to qualify)
  const progress = Math.min(perfProgress, ratingProgress);

  return {
    rank: currentRank,
    nextRank: nextThreshold.rank,
    progress,
  };
}

// ══════════════════════════════════════════════════════════════════════════
// D. ACHIEVEMENTS
// ══════════════════════════════════════════════════════════════════════════

export interface Achievement {
  id: string;
  icon: string;
  nameEn: string;
  nameDe: string;
  descriptionEn: string;
  descriptionDe: string;
  condition: (stats: RateMySongPlayerStats) => boolean;
}

export const RATE_MY_SONG_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_performance',
    icon: '🎤',
    nameEn: 'First Performance',
    nameDe: 'Erster Auftritt',
    descriptionEn: 'Complete 1 performance',
    descriptionDe: 'Schließe 1 Auftritt ab',
    condition: (s) => s.totalPerformances >= 1,
  },
  {
    id: 'golden_voice',
    icon: '🌟',
    nameEn: 'Golden Voice',
    nameDe: 'Goldene Stimme',
    descriptionEn: 'Get a rating >= 9.0',
    descriptionDe: 'Erhalte eine Bewertung >= 9.0',
    condition: (s) => s.bestRating >= 9.0,
  },
  {
    id: 'crowd_favorite',
    icon: '❤️',
    nameEn: 'Crowd Favorite',
    nameDe: 'Publikumsliebling',
    descriptionEn: 'Get rated by 10+ different audience members total',
    descriptionDe: 'Werde von insgesamt 10+ verschiedenen Publikumsmitgliedern bewertet',
    condition: (s) => s.totalAudienceRatings >= 10,
  },
  {
    id: 'versatile',
    icon: '🎭',
    nameEn: 'All-Rounder',
    nameDe: 'Allrounder',
    descriptionEn: 'Perform in 5+ different genres',
    descriptionDe: 'Trage in 5+ verschiedenen Genres auf',
    condition: (s) => Object.keys(s.genresPerformed).length >= 5,
  },
  {
    id: 'perfectionist',
    icon: '💎',
    nameEn: 'Perfectionist',
    nameDe: 'Perfektionist',
    descriptionEn: 'Get a rating >= 9.5',
    descriptionDe: 'Erhalte eine Bewertung >= 9.5',
    condition: (s) => s.bestRating >= 9.5,
  },
  {
    id: 'stage_animal',
    icon: '🔥',
    nameEn: 'Stage Animal',
    nameDe: 'Bühnentier',
    descriptionEn: '20+ performances',
    descriptionDe: '20+ Auftritte',
    condition: (s) => s.totalPerformances >= 20,
  },
  {
    id: 'centurion',
    icon: '💯',
    nameEn: 'Centurion',
    nameDe: 'Hundertfüßler',
    descriptionEn: '100+ total audience ratings received',
    descriptionDe: 'Erhalte 100+ Publikumsbewertungen insgesamt',
    condition: (s) => s.totalAudienceRatings >= 100,
  },
  {
    id: 'comeback_kid',
    icon: '🔄',
    nameEn: 'Comeback Kid',
    nameDe: 'Comeback Kid',
    descriptionEn: 'Rating improves by 3+ points from worst to best',
    descriptionDe: 'Bewertung verbessert sich um 3+ Punkte vom Schlechtesten zum Besten',
    condition: (s) => (s.bestRating - s.worstRating) >= 3 && s.totalPerformances >= 2,
  },
];

/** Check which achievements a player has earned. Returns IDs of newly earned achievements. */
function checkRateMySongAchievements(stats: RateMySongPlayerStats): string[] {
  const newAchs: string[] = [];
  for (const ach of RATE_MY_SONG_ACHIEVEMENTS) {
    if (ach.condition(stats) && !stats.achievements.includes(ach.id)) {
      newAchs.push(ach.id);
    }
  }
  return newAchs;
}

/** Get achievement definition by ID */
export function getAchievementById(id: string): Achievement | undefined {
  return RATE_MY_SONG_ACHIEVEMENTS.find(a => a.id === id);
}

// ══════════════════════════════════════════════════════════════════════════
// E. AI CRITIC COMMENTS (funny + snarky, bilingual)
// ══════════════════════════════════════════════════════════════════════════

interface CommentBucket {
  min: number;
  max: number;
  en: string[];
  de: string[];
}

const CRITIC_COMMENTS: CommentBucket[] = [
  {
    min: 9.5,
    max: 10.0,
    en: [
      "Okay, we get it. You're talented. Now go audition for The Voice and leave some dignity for the rest of us.",
      "I'm not crying, you're crying. That was angelic. I need a moment... and a tissue.",
      "Ed Sheeran just felt a disturbance in the force. Move over, superstar.",
    ],
    de: [
      "Okay, wir haben es kapiert. Du bist talentiert. Jetzt geh bei The Voice auditionieren und lass den Rest von uns wenigstens ein bisschen Würde.",
      "Ich weine nicht, du weinst. Das war himmlisch. Ich brauche einen Moment... und ein Taschentuch.",
      "Ed Sheeran hat gerade eine Störung in der Macht gespürt. Mach Platz, Superstar.",
    ],
  },
  {
    min: 9.0,
    max: 9.4,
    en: [
      "Beyoncé called. She wants her vocal cords back. Seriously though, that was dangerously good.",
      "That was so good, I almost forgot I'm supposed to be judging you. Almost.",
      "If talent were a crime, you'd be serving a life sentence. A standing ovation from this judge.",
    ],
    de: [
      "Beyoncé hat angerufen. Sie will ihre Stimmbänder zurück. Aber im Ernst: Das war gefährlich gut.",
      "Das war so gut, ich habe fast vergessen, dass ich dich bewerten soll. Fast.",
      "Wenn Talent ein Verbrechen wäre, würdest du lebenslänglich bekommen. Stehende Ovation von diesem Juroren.",
    ],
  },
  {
    min: 8.0,
    max: 8.9,
    en: [
      "That was actually impressive. I'm not saying I'd pay to hear it again... okay maybe I would.",
      "Solid performance! If this were a talent show, you'd definitely make it past the first round.",
      "Nice! You've got genuine skills. The world needs more people who can actually sing.",
    ],
    de: [
      "Das war tatsächlich beeindruckend. Ich sage nicht, dass ich dafür bezahlen würde... na gut, vielleicht doch.",
      "Solider Auftritt! Wenn das eine Castingshow wäre, würdest du definitiv in die nächste Runde kommen.",
      "Nicht schlecht! Du hast echtes Können. Die Welt braucht mehr Leute, die tatsächlich singen können.",
    ],
  },
  {
    min: 7.0,
    max: 7.9,
    en: [
      "Solid performance! You won't be winning any Grammys, but you also won't be causing any hearing damage.",
      "Not bad at all! You've got potential. Like a rough diamond — just needs a bit more polishing.",
      "That was... genuinely decent. I was ready to cringe and you didn't make me. Respect.",
    ],
    de: [
      "Solider Auftritt! Du gewinnst zwar keinen Grammy, aber du verursachst zumindest auch keinen Gehörschaden.",
      "Gar nicht schlecht! Du hast Potenzial. Wie ein roher Diamant — braucht nur noch etwas mehr Politur.",
      "Das war... echt ordentlich. Ich war bereit zu grauen und du hast es mich nicht tun lassen. Respekt.",
    ],
  },
  {
    min: 6.0,
    max: 6.9,
    en: [
      "You tried. And honestly, that's what matters. Results? Not so much. But effort? 10/10.",
      "I've heard worse. Not many, but they exist. Somewhere. Probably at 3 AM in a lonely karaoke bar.",
      "Average. Not in a bad way — in a 'you exist and that's fine' kind of way.",
    ],
    de: [
      "Du hast es versucht. Und ehrlich, das zählt. Das Ergebnis? Eher weniger. Aber die Mühe? 10/10.",
      "Ich habe schon Schlechteres gehört. Nicht viel, aber es gibt es. Irgendwo. Wahrscheinlich um 3 Uhr morgens in einer einsamen Karaoke-Bar.",
      "Durchschnitt. Nicht auf eine schlechte Art — eher auf eine 'du existierst und das ist okay' Art.",
    ],
  },
  {
    min: 5.0,
    max: 5.9,
    en: [
      "Somewhere between 'shower singing' and 'drunk at a wedding.' But hey, at least you had the courage!",
      "You know what? It wasn't terrible. It wasn't good either. But it wasn't terrible.",
      "Mediocrity has a name, and it's... well, let's just say you're passionate. That counts for something.",
    ],
    de: [
      "Irgendwo zwischen 'Duschsingen' und 'betrunken auf einer Hochzeit'. Aber hey, wenigstens hattest du den Mut!",
      "Weißt du was? Es war nicht schrecklich. Es war auch nicht gut. Aber nicht schrecklich.",
      "Mittelmaß hat einen Namen, und der ist... naja, lass uns einfach sagen, du bist leidenschaftlich. Das zählt für was.",
    ],
  },
  {
    min: 4.0,
    max: 4.9,
    en: [
      "I've heard better singing from a GPS navigation system. But I admire the confidence.",
      "Your passion is undeniable. Your pitch... also undeniable, but for different reasons.",
      "The good news is you finished the song. The bad news is... it's over and we all heard it.",
    ],
    de: [
      "Ich habe schon besseres Singen von einem Navi gehört. Aber ich bewundere das Selbstbewusstsein.",
      "Deine Leidenschaft ist unbestreitbar. Deine Tonlage... auch unbestreitbar, aber aus anderen Gründen.",
      "Die gute Nachricht: Du hast das Lied beendet. Die schlechte: Es ist vorbei und wir haben es alle gehört.",
    ],
  },
  {
    min: 3.0,
    max: 3.9,
    en: [
      "Remember: Karaoke is supposed to be fun. Keyword: fun. Let's work on that definition together.",
      "That was an experience. Not a good one, but definitely an experience. We grew from this. Mostly me.",
      "I'm going to need therapy after that. But on the bright side, you can only go up from here!",
    ],
    de: [
      "Erinnerung: Karaoke soll Spaß machen. Stichwort: Spaß. Lass uns gemeinsam an dieser Definition arbeiten.",
      "Das war ein Erlebnis. Kein gutes, aber definitiv ein Erlebnis. Wir sind daran gewachsen. Hauptsächlich ich.",
      "Ich brauche nach dem eine Therapie. Aber auf der hellen Seite: Von hier aus kann es nur besser werden!",
    ],
  },
  {
    min: 2.0,
    max: 2.9,
    en: [
      "The good news: You can only improve from here. The bad news: That's a very low bar.",
      "Did the cat walk across the keyboard? Because that's the only explanation I'll accept for that performance.",
      "I've seen better performances from malfunctioning vending machines. But hey, keep at it!",
    ],
    de: [
      "Die gute Nachricht: Von hier aus kann es nur besser werden. Die schlechte Nachricht: Das ist eine sehr niedrige Latte.",
      "Ist die Katze über die Tastatur gelaufen? Das ist die einzige Erklärung, die ich für diesen Auftritt akzeptiere.",
      "Ich habe schon bessere Auftritte von kaputten Getränkeautomaten gesehen. Aber hey, weiter so!",
    ],
  },
  {
    min: 1.0,
    max: 1.9,
    en: [
      "You know that feeling when you accidentally play a song at 2x speed? Yeah... that. Please don't quit your day job.",
      "I'm not saying that was the worst thing I've ever heard, but it's definitely in the top five. Today.",
      "On the bright side, at least the song eventually ended. On the dark side, I was there for all of it.",
    ],
    de: [
      "Du kennst dieses Gefühl, wenn man versehentlich ein Lied mit 2x Geschwindigkeit abspielt? Ja... genau so. Bitte kündige nicht deinen Job.",
      "Ich sage nicht, dass das das Schlechteste war, was ich je gehört habe, aber es ist definitiv in den Top 5. Heute.",
      "Auf der hellen Seite: Das Lied hat irgendwann aufgehört. Auf der dunklen Seite: Ich war für die ganze Zeit da.",
    ],
  },
];

/**
 * Generate a snarky AI critic comment based on rating.
 * Comments are shuffled randomly so the same score doesn't always produce the same text.
 */
export function getAICriticComment(rating: number, lang: 'en' | 'de'): string {
  const clamped = Math.max(1.0, Math.min(10.0, rating));

  // Find the matching bucket
  const bucket = CRITIC_COMMENTS.find(b => clamped >= b.min && clamped <= b.max);

  if (!bucket) {
    // Fallback (should never happen)
    return lang === 'en'
      ? "I have no words. Literally no words."
      : "Ich habe keine Worte. Wirklich keine Worte.";
  }

  const comments = lang === 'en' ? bucket.en : bucket.de;
  const idx = Math.floor(Math.random() * comments.length);
  return comments[idx];
}

// ══════════════════════════════════════════════════════════════════════════
// F. CHALLENGE CARDS
// ══════════════════════════════════════════════════════════════════════════

export interface RateMySongChallenge {
  id: string;
  icon: string;
  titleEn: string;
  titleDe: string;
  descriptionEn: string;
  descriptionDe: string;
}

export const RATE_MY_SONG_CHALLENGES: RateMySongChallenge[] = [
  {
    id: 'accent',
    icon: '🎭',
    titleEn: 'Sing with an Accent',
    titleDe: 'Singe mit Akzent',
    descriptionEn: 'Put on your best fake accent for the entire song',
    descriptionDe: 'Leg deinen besten Fake-Akzent für das gesamte Lied auf',
  },
  {
    id: 'silent_minute',
    icon: '🔇',
    titleEn: 'Silent Minute',
    titleDe: 'Stille Minute',
    descriptionEn: 'Stop singing for 10 seconds in the middle, keep performing',
    descriptionDe: 'Hör auf zu singen für 10 Sekunden in der Mitte, perform weiter',
  },
  {
    id: 'dance_break',
    icon: '💃',
    titleEn: 'Dance Break',
    titleDe: 'Tanzpause',
    descriptionEn: 'Do at least 3 dance moves during the song',
    descriptionDe: 'Mach mindestens 3 Tanzmoves während des Liedes',
  },
  {
    id: 'phone_singer',
    icon: '📱',
    titleEn: 'Phone Singer',
    titleDe: 'Handy-Sänger',
    descriptionEn: 'Sing like you\'re recording a TikTok with your phone',
    descriptionDe: 'Sing, als würdest du ein TikTok mit dem Handy aufnehmen',
  },
  {
    id: 'supermarket',
    icon: '🎪',
    titleEn: 'Supermarket Style',
    titleDe: 'Supermarkt-Stil',
    descriptionEn: 'Perform as if you\'re casually singing while grocery shopping',
    descriptionDe: 'Perform, als würdest du beim Einkaufen ganz entspannt singen',
  },
  {
    id: 'tempo_switch',
    icon: '🔄',
    titleEn: 'Tempo Switch',
    titleDe: 'Tempo-Wechsel',
    descriptionEn: 'Start slow, go super fast in the middle, slow again',
    descriptionDe: 'Starte langsam, werd in der Mitte super schnell, wieder langsam',
  },
  {
    id: 'smirk_mode',
    icon: '😏',
    titleEn: 'Smirk Mode',
    titleDe: 'Schmunzel-Modus',
    descriptionEn: 'Keep a confident smirk on your face the ENTIRE time',
    descriptionDe: 'Behalte ein selbstbewusstes Schmunzeln die GANZE Zeit im Gesicht',
  },
  {
    id: 'air_guitar',
    icon: '🎸',
    titleEn: 'Air Guitar Solo',
    titleDe: 'Air-Guitar-Solo',
    descriptionEn: 'Do an air guitar solo during any instrumental part',
    descriptionDe: 'Mach ein Air-Guitar-Solo bei jedem instrumentalen Teil',
  },
  {
    id: 'mic_drop',
    icon: '🎤',
    titleEn: 'Mic Drop',
    titleDe: 'Mic-Drop',
    descriptionEn: 'End the song with a dramatic mic drop pose',
    descriptionDe: 'Beende das Lied mit einer dramatischen Mic-Drop-Pose',
  },
  {
    id: 'diva_mode',
    icon: '👑',
    titleEn: 'Diva Mode',
    titleDe: 'Diva-Modus',
    descriptionEn: 'Sing with maximum drama, hand gestures, and hair flips',
    descriptionDe: 'Sing mit maximalem Drama, Handgesten und Haare-Schwenken',
  },
  {
    id: 'whisper_start',
    icon: '🤫',
    titleEn: 'Whisper Start',
    titleDe: 'Flüster-Start',
    descriptionEn: 'Start the first 15 seconds whispering, then go full power',
    descriptionDe: 'Flüstere die ersten 15 Sekunden, dann gib Vollgas',
  },
  {
    id: 'opera_style',
    icon: '🎭',
    titleEn: 'Opera Style',
    titleDe: 'Oper-Stil',
    descriptionEn: 'Sing as overdramatically as an opera singer',
    descriptionDe: 'Sing so übertrieben wie ein Opernsänger',
  },
  {
    id: 'disco_fever',
    icon: '🕺',
    titleEn: 'Disco Fever',
    titleDe: 'Disco-Fieber',
    descriptionEn: 'Add disco dance moves at every chorus',
    descriptionDe: 'Mach Disco-Tanzmoves bei jedem Refrain',
  },
  {
    id: 'emotional_rollercoaster',
    icon: '😢',
    titleEn: 'Emotional Rollercoaster',
    titleDe: 'Emotionale Achterbahn',
    descriptionEn: 'Switch between crying and laughing expressions',
    descriptionDe: 'Wechsle zwischen weinenden und lachenden Gesichtsausdrücken',
  },
  {
    id: 'country_twist',
    icon: '🤠',
    titleEn: 'Country Twist',
    titleDe: 'Country-Twist',
    descriptionEn: 'Add a country accent and yee-haw gestures',
    descriptionDe: 'Leg einen Country-Akzent und Yeehaw-Gesten hinzu',
  },
];

/**
 * Get a random challenge card (different from the last one if possible).
 */
export function getRandomChallenge(excludeId?: string): RateMySongChallenge {
  const available = excludeId
    ? RATE_MY_SONG_CHALLENGES.filter(c => c.id !== excludeId)
    : RATE_MY_SONG_CHALLENGES;
  const idx = Math.floor(Math.random() * available.length);
  return available[idx];
}

// ══════════════════════════════════════════════════════════════════════════
// G. SONG SUGGESTIONS
// ══════════════════════════════════════════════════════════════════════════

export interface SongSuggestion {
  id: string;
  title: string;
  artist: string;
  genre: string;
}

/**
 * Get song suggestions similar to the current song.
 * Prioritizes same genre, then random others. Excludes the current song.
 */
export function getSongSuggestions(
  currentSongGenre: string,
  currentSongId: string,
  count: number = 5,
): SongSuggestion[] {
  const allSongs = getAllSongs();
  const normalizedGenre = currentSongGenre.trim().toLowerCase();

  // Separate into same-genre and other songs
  const sameGenre: SongSuggestion[] = [];
  const otherSongs: SongSuggestion[] = [];

  for (const song of allSongs) {
    if (song.id === currentSongId) continue;
    if (!song.title || !song.artist) continue;

    const songGenre = (song.genre || '').trim().toLowerCase();
    const entry: SongSuggestion = {
      id: song.id,
      title: song.title,
      artist: song.artist,
      genre: song.genre || 'Unknown',
    };

    if (normalizedGenre && songGenre === normalizedGenre) {
      sameGenre.push(entry);
    } else {
      otherSongs.push(entry);
    }
  }

  // Shuffle both arrays
  shuffleArray(sameGenre);
  shuffleArray(otherSongs);

  // Combine: prefer same genre, fill rest with other songs
  const combined = [...sameGenre, ...otherSongs];
  return combined.slice(0, count);
}

/** Fisher-Yates shuffle (in-place) */
function shuffleArray<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
