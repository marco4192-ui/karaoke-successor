'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { StorageKeys, getItem, removeItem, setItem } from '@/lib/storage';
import { getExtendedStats, updateStatsAfterGame, saveExtendedStats, calculateSongXP, getLevelForXP } from '@/lib/game/player-progression';
import { checkAndUnlockAchievements } from '@/lib/game/achievements';
import {
  submitChallengeResult,
  submitCoopChallengeResult,
  submitWeeklyChallengeResult,
  getPlayerDailyStats,
  updateQuestProgress,
  extractDailyMetric,
  type DailyDifficulty,
  type DailyResultMetrics,
} from '@/lib/game/daily-challenge';
import type { DailySongContext } from '@/lib/game/challenge-pools';
import { processChallengeModeResult } from '@/lib/game/challenge-mode-progress';
import { estimatePerfectNotes, calculateScoringMetadata, calculateComboMultiplier } from '@/lib/game/scoring';
import { MAX_POINTS_PER_SONG } from '@/components/results/constants';
import { hasLeaderboardConsent, setLeaderboardConsent } from '@/lib/leaderboard/consent';
// R69: real per-note proof chain from the scoring pass (tiny module, no
// crypto/network — static import is deliberate).
import { takeCollectedNoteProofs } from '@/lib/leaderboard/note-proof-collector';
import { recordSongPlay } from '@/lib/playlist-manager';
import { useGameStore } from '@/lib/game/store';
import type { PlayerProfile, GameResult, Song, GameState, HighscoreEntry, Achievement } from '@/types/game';

// Helper: calculate XP and update a player's profile with new level.
// Always reads the CURRENT xp from the store so that XP added by other
// steps in the same effect (e.g. daily/weekly rewards) is never overwritten.
function awardXPToProfile(
  profile: PlayerProfile,
  score: number,
  accuracy: number,
  maxCombo: number,
  notesHit: number,
  goldenNotes: number,
  rating: string,
  challengeMode: string | undefined,
  updateFn: (id: string, updates: Partial<PlayerProfile>) => void,
) {
  const xp = calculateSongXP(
    score,
    accuracy,
    maxCombo,
    estimatePerfectNotes(notesHit, rating),
    goldenNotes,
    challengeMode,
  );
  const freshProfile = useGameStore.getState().profiles.find(p => p.id === profile.id);
  const currentXP = freshProfile?.xp ?? profile.xp ?? 0;
  const newXP = currentXP + xp;
  const levelInfo = getLevelForXP(newXP);
  updateFn(profile.id, { xp: newXP, level: levelInfo.level });
}

/** Lightweight player identity used for daily submissions. */
interface PlayerIdentity {
  id: string;
  name: string;
  avatar?: string;
  color: string;
}

function toIdentity(profile: PlayerProfile): PlayerIdentity {
  return { id: profile.id, name: profile.name, avatar: profile.avatar, color: profile.color };
}

/** R81: local YYYY-MM-DD — daily boards are grouped by the player's local
 *  day; the old UTC slice flipped days between 22:00 and midnight CET. */
function localDateISO(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

// R81: moved to the shared module — the highscore boards and the song modal
// filter party games with the same list.
import { PARTY_GAME_MODES, isPartyGameMode } from '@/lib/game/party-modes';

/** Count duet games from the highscore history for a player. */
function countDuetGames(highscores: HighscoreEntry[], playerId: string): number {
  return highscores.filter(h => h.playerId === playerId && h.gameMode === 'duet').length;
}

// (R81) countPartyGames/countGamesToday entfielen — Party-Spiele schreiben
// keine Highscore-Einträge mehr; beide Zähler laufen persistente über
// AchievementCounters (bumpGamesToday / bumpAchievementCounter('partyGames')).

/**
 * Per-profile achievement counters that cannot be derived from the existing
 * stores (highscores prune old entries by score, and duel wins are never
 * persisted as such). Stored as one small JSON blob per profile.
 */
interface AchievementCounters {
  duelsWon: number;
  /** R81: party games no longer produce highscore entries, so the cumulative
   *  counters that used to be derived from the highscore list moved here.
   *  Bumped BEFORE the achievement check (same pattern as duelsWon). */
  partyGames: number;
  gamesToday: number;
  /** YYYY-MM-DD the gamesToday counter was last bumped (daily reset). */
  gamesTodayDate: string;
}

const ACHIEVEMENT_COUNTERS_PREFIX = 'achievement_counters_';

function getAchievementCounters(profileId: string): AchievementCounters {
  try {
    const raw = getItem(ACHIEVEMENT_COUNTERS_PREFIX + profileId);
    if (!raw) return { duelsWon: 0, partyGames: 0, gamesToday: 0, gamesTodayDate: '' };
    const parsed = JSON.parse(raw) as Partial<AchievementCounters> | null;
    const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
    return {
      duelsWon: num(parsed?.duelsWon),
      partyGames: num(parsed?.partyGames),
      gamesToday: num(parsed?.gamesToday),
      gamesTodayDate: typeof parsed?.gamesTodayDate === 'string' ? parsed.gamesTodayDate : '',
    };
  } catch {
    return { duelsWon: 0, partyGames: 0, gamesToday: 0, gamesTodayDate: '' };
  }
}

/** R81: bump the per-day games counter (resets on the first game of a day). */
function bumpGamesToday(profileId: string): void {
  try {
    const counters = getAchievementCounters(profileId);
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if (counters.gamesTodayDate !== today) {
      counters.gamesToday = 0;
      counters.gamesTodayDate = today;
    }
    counters.gamesToday += 1;
    setItem(ACHIEVEMENT_COUNTERS_PREFIX + profileId, JSON.stringify(counters));
  } catch { /* non-critical */ }
}

/** Numeric counters only — gamesTodayDate is a string field (excluded). */
function bumpAchievementCounter(profileId: string, key: 'duelsWon' | 'partyGames' | 'gamesToday'): void {
  try {
    const counters = getAchievementCounters(profileId);
    counters[key] += 1;
    setItem(ACHIEVEMENT_COUNTERS_PREFIX + profileId, JSON.stringify(counters));
  } catch { /* non-critical */ }
}

/** Per-game result fields needed for the achievement context. */
interface AchievementResultContext {
  score: number;
  accuracy: number;
  maxCombo: number;
  perfectNotes: number;
  goldenNotes: number;
  notesHit: number;
  notesMissed: number;
  isDuelWin: boolean;
}

/** Extra per-game data needed for the achievement context (per player). */
interface AchievementExtras {
  isBlindMode: boolean;
  playbackRate: number;
  hadComeback: boolean;
  /** Genre of the song just played (feeds the genre/Disney counters). */
  songGenre?: string;
  /** Song XP that will be awarded to this profile right after the check (level projection). */
  pendingXP: number;
  /**
   * True when this player's highscore entry for the current game has NOT been
   * saved yet (P2 in duel/duet/competitive modes — it is saved after the
   * check), so highscore-derived counters must add the current game manually.
   */
  countsCurrentGame: boolean;
}

/**
 * Build the full achievement-check context for a specific profile.
 * Daily-system counters are read AFTER the daily submission so that e.g.
 * "complete your first daily challenge" unlocks immediately.
 */
function buildAchievementContext(
  profile: PlayerProfile,
  highscores: HighscoreEntry[],
  extendedStats: ReturnType<typeof getExtendedStats>,
  result: AchievementResultContext,
  gameState: GameState,
  extras: AchievementExtras,
) {
  const dailyStats = getPlayerDailyStats(profile.id);
  const genreStats = profile.stats?.genreStats ?? {};
  const isPartyMode = PARTY_GAME_MODES.includes(gameState.gameMode);

  // The game just played is not part of the persisted progression stats yet —
  // add it so cumulative counters reflect it immediately.
  const currentGenre = extras.songGenre?.trim() || undefined;

  // Genre coverage: union of per-profile genre stats, the global progression
  // genre counters, and the song just played.
  const genreSet = new Set<string>([
    ...Object.keys(genreStats),
    ...Object.keys(extendedStats.genrePlayCount),
  ]);
  if (currentGenre) genreSet.add(currentGenre);

  // Level projection: current profile XP plus the song XP that is awarded
  // right after the check (daily/weekly rewards are already applied before).
  const freshProfile = useGameStore.getState().profiles.find(p => p.id === profile.id);
  const projectedXP = Math.max(0, freshProfile?.xp ?? profile.xp ?? 0) + Math.max(0, extras.pendingXP);

  return {
    score: result.score,
    accuracy: result.accuracy,
    maxCombo: result.maxCombo,
    perfectNotes: result.perfectNotes,
    goldenNotes: result.goldenNotes,
    notesHit: result.notesHit,
    notesMissed: result.notesMissed,
    gameMode: gameState.gameMode,
    difficulty: gameState.difficulty,
    totalSongsCompleted: extendedStats.songsCompleted + 1,
    totalGamesPlayed: extendedStats.totalSessions + 1,
    totalGoldenNotes: extendedStats.totalGoldenNotesHit + result.goldenNotes,
    totalPerfectNotes: extendedStats.totalPerfectNotes + result.perfectNotes,
    // Daily-system counters (per profile)
    dailyCompletions: dailyStats.totalCompleted,
    dailyStreak: dailyStats.currentStreak,
    weeklyCompletions: dailyStats.weeklyCompletedTotal ?? 0,
    bestStreak: dailyStats.longestStreak ?? 0,
    // Profile-derived counters (P2's own highscore entry is saved after the
    // check — add the current game manually in that case)
    duetGames: countDuetGames(highscores, profile.id) + (extras.countsCurrentGame && gameState.gameMode === 'duet' ? 1 : 0),
    genreCount: genreSet.size,
    disneyGames: Math.max(genreStats['Disney']?.games ?? 0, extendedStats.genrePlayCount['Disney'] ?? 0)
      + (currentGenre === 'Disney' ? 1 : 0),
    // R81: persistent counter (bumped before the check) — party games never
    // produced highscore entries, so the list-derived count stalled.
    gamesToday: getAchievementCounters(profile.id).gamesToday,
    hourOfDay: new Date().getHours(),
    dayOfWeek: new Date().getDay(),
    // Level projection (per profile)
    level: getLevelForXP(projectedXP).level,
    // localStorage-backed per-profile counters
    duelsWon: getAchievementCounters(profile.id).duelsWon,
    partyGames: getAchievementCounters(profile.id).partyGames,
    // Special flags
    isPartyMode,
    isDuelWin: result.isDuelWin,
    isPassTheMic: gameState.gameMode === 'pass-the-mic',
    isBlindMode: extras.isBlindMode,
    isSpeedMode: extras.playbackRate >= 1.5,
    playbackRate: extras.playbackRate,
    hadComeback: extras.hadComeback,
  };
}

export interface UsePostGameProcessingParams {
  results: GameResult | null;
  song: Song | null;
  activeProfileId: string | null;
  profiles: PlayerProfile[];
  gameState: GameState;
  addHighscore: (entry: Omit<HighscoreEntry, 'id' | 'playedAt' | 'rankTitle'>) => HighscoreEntry;
  onlineEnabled: boolean;
  updateProfile: (id: string, updates: Partial<PlayerProfile>) => void;
  t: (key: string) => string;
}

/**
 * Handles all post-game processing:
 * - Saving highscores (P1 and P2)
 * - Checking and unlocking achievements (P1 AND P2 with their own profiles)
 * - Updating player progression (XP, level, rank)
 * - Daily challenge submission with per-player attribution (1-2 selected players)
 * - Daily/weekly XP rewards are applied to the profile XP
 * - Quest progress (including previously dead perfect-notes/challenge-mode quests)
 * - Global leaderboard upload (only for online profiles)
 */
export function usePostGameProcessing({
  results,
  song,
  activeProfileId,
  profiles,
  gameState,
  addHighscore,
  onlineEnabled,
  updateProfile,
  t,
}: UsePostGameProcessingParams) {
  const savedToHighscoreRef = useRef(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'consent' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const [isVerified, setIsVerified] = useState<boolean | undefined>(undefined);
  /** R67: online actions (score upload + daily board submission) queued while
   *  the first-upload consent notice is awaiting the user's decision. */
  const pendingOnlineActionsRef = useRef<Array<() => void>>([]);

  const isDuel = gameState.gameMode === 'duel';

  // Save highscore when results are shown (only once)
  // Duel is competitive (P1 vs P2); Duet is cooperative (P1 + P2 together).
  // Only duel should trigger win/lose comparisons and duel-win achievements.
  useEffect(() => {
    if (results && song && activeProfileId && !savedToHighscoreRef.current) {
      const playerResult = results.players[0];
      const profile = profiles.find(p => p.id === activeProfileId);

      if (profile && playerResult) {
        // R81: party games produce NO highscores — not locally, not online,
        // not on daily/weekly boards (no comparable score scale). The local
        // hall of fame and the party screens keep their own state untouched.
        const isPartyGame = PARTY_GAME_MODES.includes(gameState.gameMode);

        // Save to local highscore
        if (!isPartyGame) addHighscore({
          playerId: profile.id,
          playerName: profile.name,
          playerAvatar: profile.avatar,
          playerColor: profile.color,
          songId: song.id,
          songTitle: song.title,
          artist: song.artist,
          score: playerResult.score,
          accuracy: playerResult.accuracy,
          maxCombo: playerResult.maxCombo,
          difficulty: gameState.difficulty,
          gameMode: gameState.gameMode,
          rating: playerResult.rating,
        });
        savedToHighscoreRef.current = true;

        // Read fresh highscores (including this game) for the duet-games achievement counter
        const highscores = useGameStore.getState().highscores;

        // Record song play for Recently Played & Most Played system playlists
        recordSongPlay(song.id);

        // Also get P2 result early — needed for daily submission & achievement checking
        const player2Result = results.players[1];
        const isMultiplayerMode = ['duel', 'duet', 'competitive-words', 'competitive-blind'].includes(gameState.gameMode);
        const p2Profile = player2Result?.playerId ? profiles.find(p => p.id === player2Result.playerId) : undefined;
        const isDuelWin = isDuel && !!player2Result && playerResult.score > player2Result.score;

        // ── DAILY CHALLENGE SUBMISSION (before achievements so that daily
        //    counters reflect this game immediately) ──
        // If this game was started from the daily challenge screen, submit the
        // result — attributed to the 1-2 players selected there.
        let dailyXPEarned = 0;
        let onlineDailySubmission: (() => void) | null = null;

        // Song metadata context — drives category challenges (genre/language/…)
        const appLanguage = (typeof window !== 'undefined'
          ? localStorage.getItem('karaoke-language') ?? 'en'
          : 'en');
        const songContext: DailySongContext = {
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
          playerCount: results.players.length,
        };
        // Weekly difficulty — selected in the weekly tab (independent selector)
        const weeklyDifficultyRaw = getItem('karaoke_weekly_difficulty');
        const weeklyDifficulty: DailyDifficulty =
          ['easy', 'normal', 'hard', 'very_hard', 'insane'].includes(weeklyDifficultyRaw ?? '')
            ? (weeklyDifficultyRaw as DailyDifficulty)
            : 'normal';

        try {
          // R81: party games never count for daily challenges (the daily
          // screen only starts standard/duel games — defense in depth).
          const dailyFlag = isPartyGame ? null : getItem(StorageKeys.DAILY_CHALLENGE_ACTIVE);
          if (dailyFlag) {
            const parsed = JSON.parse(dailyFlag);
            if (parsed.active) {
              // Clear the flag first to avoid double-submission
              removeItem(StorageKeys.DAILY_CHALLENGE_ACTIVE);

              const selectedIds: string[] = Array.isArray(parsed.playerIds) ? parsed.playerIds : [];
              // Difficulty selected on the daily screen (independent of the
              // global game difficulty) — drives target + XP multiplier.
              const dailyDifficulty: DailyDifficulty =
                ['easy', 'normal', 'hard', 'very_hard', 'insane'].includes(parsed.difficulty)
                  ? parsed.difficulty
                  : 'normal';
              // Which of the 5 daily slots this game counts for
              const dailySlot: number = Number.isInteger(parsed.slot) ? (parsed.slot as number) : 0;
              const p1 = toIdentity(profile);
              // Fresh level read — the daily targets scale slightly with level
              const freshLevel = useGameStore.getState().profiles.find(p => p.id === profile.id)?.level ?? profile.level ?? 1;
              const p1Result: DailyResultMetrics = {
                score: playerResult.score,
                accuracy: playerResult.accuracy,
                tickAccuracy: playerResult.tickAccuracy,
                combo: playerResult.maxCombo,
                perfectNotesCount: playerResult.perfectNotesCount,
                goldenNotesCount: playerResult.goldenNotesCount,
                notesHit: playerResult.notesHit,
                notesMissed: playerResult.notesMissed,
                song: songContext,
                appLanguage,
              };

              // Resolve the second player: second selected profile, or the
              // P2 profile of the running game as fallback.
              const secondSelectedId = selectedIds.find(id => id !== profile.id);
              const secondProfile = (secondSelectedId && profiles.find(p => p.id === secondSelectedId)) || p2Profile;

              // Challenge-type metric helper (any daily metric key)
              const metricOf = (type: string, r: DailyResultMetrics) =>
                extractDailyMetric(type, r);

              if (parsed.gameMode === 'coop' && player2Result && secondProfile) {
                // Team evaluation: the average of both players counts
                const avg = (a: number, b: number) => (a + b) / 2;
                const p2Result: DailyResultMetrics = {
                  score: player2Result.score,
                  accuracy: player2Result.accuracy,
                  tickAccuracy: player2Result.tickAccuracy,
                  combo: player2Result.maxCombo,
                  perfectNotesCount: player2Result.perfectNotesCount,
                  goldenNotesCount: player2Result.goldenNotesCount,
                  notesHit: player2Result.notesHit,
                  notesMissed: player2Result.notesMissed,
                };
                const avgResult: DailyResultMetrics = {
                  score: avg(p1Result.score, p2Result.score),
                  accuracy: avg(p1Result.accuracy, p2Result.accuracy),
                  tickAccuracy: p1Result.tickAccuracy !== undefined || p2Result.tickAccuracy !== undefined
                    ? avg(p1Result.tickAccuracy ?? p1Result.accuracy, p2Result.tickAccuracy ?? p2Result.accuracy)
                    : undefined,
                  combo: avg(p1Result.combo, p2Result.combo),
                  perfectNotesCount: avg(p1Result.perfectNotesCount ?? 0, p2Result.perfectNotesCount ?? 0),
                  goldenNotesCount: avg(p1Result.goldenNotesCount ?? 0, p2Result.goldenNotesCount ?? 0),
                  notesHit: avg(p1Result.notesHit ?? 0, p2Result.notesHit ?? 0),
                  notesMissed: avg(p1Result.notesMissed ?? 0, p2Result.notesMissed ?? 0),
                };
                const coopResult = submitCoopChallengeResult(
                  [p1, toIdentity(secondProfile)],
                  [p1Result, p2Result],
                  { difficulty: dailyDifficulty, level: freshLevel, slot: dailySlot },
                );
                dailyXPEarned += coopResult.xpEarned;

                // Online daily board: submit the team average (fire-and-forget).
                // R69: gated on the profile's leaderboard opt-in — the score
                // upload already respected it, the daily board must too (the
                // server would reject it anyway; don't put opt-out data on
                // the wire in the first place).
                if (onlineEnabled && profile.storageMode !== 'local' && (profile.privacy?.showOnLeaderboard ?? true)) {
                  // R81: attribute to the SLOT's type (the old code sent the
                // slot-0 type for every slot) and use the LOCAL date (the old
                // UTC slice flipped days between 22:00 and midnight CET).
                const slotType = coopResult.slotType ?? coopResult.challenge.type;
                  const todayISO = localDateISO();
                  onlineDailySubmission = () => {
                    import('@/lib/api/leaderboard-service').then(({ leaderboardService }) =>
                      leaderboardService.submitDailyResult({
                        profile,
                        challengeDate: todayISO,
                        challengeType: slotType,
                        metricValue: metricOf(slotType, avgResult),
                        xpEarned: coopResult.xpEarned,
                        difficulty: dailyDifficulty,
                      }),
                    ).then((res) => {
                      if (res.sync_code) updateProfile(profile.id, { syncCode: res.sync_code });
                    }).catch(() => { /* non-critical */ });
                  };
                }
              } else {
                // Individual evaluation for each selected player
                const r1 = submitChallengeResult(p1, p1Result, { difficulty: dailyDifficulty, level: freshLevel, slot: dailySlot });
                dailyXPEarned += r1.xpEarned;

                // Online daily board for P1 (fire-and-forget, R69 opt-in gate)
                if (onlineEnabled && profile.storageMode !== 'local' && (profile.privacy?.showOnLeaderboard ?? true)) {
                  // R81: slot's type + local date (see the coop branch above).
                const slotType = r1.slotType;
                  const todayISO = localDateISO();
                  onlineDailySubmission = () => {
                    import('@/lib/api/leaderboard-service').then(({ leaderboardService }) =>
                      leaderboardService.submitDailyResult({
                        profile,
                        challengeDate: todayISO,
                        challengeType: slotType,
                        metricValue: metricOf(slotType, p1Result),
                        xpEarned: r1.xpEarned,
                        difficulty: dailyDifficulty,
                      }),
                    ).then((res) => {
                      if (res.sync_code) updateProfile(profile.id, { syncCode: res.sync_code });
                    }).catch(() => { /* non-critical */ });
                  };
                }

                if (secondProfile && player2Result) {
                  const r2 = submitChallengeResult(toIdentity(secondProfile), {
                    score: player2Result.score,
                    accuracy: player2Result.accuracy,
                    tickAccuracy: player2Result.tickAccuracy,
                    combo: player2Result.maxCombo,
                    perfectNotesCount: player2Result.perfectNotesCount,
                    goldenNotesCount: player2Result.goldenNotesCount,
                    notesHit: player2Result.notesHit,
                    notesMissed: player2Result.notesMissed,
                  }, { difficulty: dailyDifficulty, level: freshLevel, slot: dailySlot });
                  dailyXPEarned += r2.xpEarned;
                }
              }

            }
          }
        } catch {
          // Ignore daily challenge submission errors — not critical
        }

        // ── WEEKLY CHALLENGE SUBMISSION (every song counts toward the
        //    week's 5 slots — best-of-week and cumulative types) ──
        // R81: party games never count here either (no comparable score).
        try {
          if (isPartyGame) {
            // skipped — see comment above
          } else {
          const freshLevelW = useGameStore.getState().profiles.find(p => p.id === profile.id)?.level ?? profile.level ?? 1;
          const weeklyResult: DailyResultMetrics = {
            score: playerResult.score,
            accuracy: playerResult.accuracy,
            tickAccuracy: playerResult.tickAccuracy,
            combo: playerResult.maxCombo,
            perfectNotesCount: playerResult.perfectNotesCount,
            goldenNotesCount: playerResult.goldenNotesCount,
            notesHit: playerResult.notesHit,
            notesMissed: playerResult.notesMissed,
            song: songContext,
            appLanguage,
          };
          const w1 = submitWeeklyChallengeResult(toIdentity(profile), weeklyResult, {
            difficulty: weeklyDifficulty,
            level: freshLevelW,
          });
          dailyXPEarned += w1.xpEarned;

          if (player2Result && p2Profile && p2Profile.id !== profile.id && isMultiplayerMode) {
            const w2 = submitWeeklyChallengeResult(toIdentity(p2Profile), {
              score: player2Result.score,
              accuracy: player2Result.accuracy,
              tickAccuracy: player2Result.tickAccuracy,
              combo: player2Result.maxCombo,
              perfectNotesCount: player2Result.perfectNotesCount,
              goldenNotesCount: player2Result.goldenNotesCount,
              notesHit: player2Result.notesHit,
              notesMissed: player2Result.notesMissed,
              song: songContext,
              appLanguage,
            }, { difficulty: weeklyDifficulty, level: p2Profile.level ?? 1 });
            dailyXPEarned += w2.xpEarned;
          }
        } // R81: !isPartyGame wrapper
        } catch {
          // Ignore weekly challenge submission errors — not critical
        }

        // ── CHALLENGE MODE COMPLETION (chain unlocks) ──
        try {
          if (gameState.challengeMode) {
            processChallengeModeResult(
              gameState.challengeMode,
              {
                score: playerResult.score,
                accuracy: playerResult.accuracy,
                maxCombo: playerResult.maxCombo,
                perfectNotes: estimatePerfectNotes(playerResult.notesHit, playerResult.rating),
                goldenNotes: playerResult.goldenNotesCount || 0,
                notesHit: playerResult.notesHit,
                notesMissed: playerResult.notesMissed,
              },
              profile.id,
              songContext,
              appLanguage,
            );
          }
        } catch { /* non-critical */ }

        // Fire the online daily board submission (after local persistence).
        // R67: gated on the leaderboard consent — while the first-upload
        // notice is pending, queue the submission behind the user's decision
        // (it runs together with the score upload on accept, is dropped on
        // decline).
        if (onlineDailySubmission) {
          if (hasLeaderboardConsent()) {
            onlineDailySubmission();
          } else {
            pendingOnlineActionsRef.current.push(onlineDailySubmission);
          }
        }

        // Apply daily/weekly XP rewards to the profile that played.
        // Note: the song XP below reads the fresh store value too, so the
        // order of both awards does not matter.
        if (dailyXPEarned > 0) {
          const fresh = useGameStore.getState().profiles.find(p => p.id === profile.id);
          if (fresh) {
            const newXP = (fresh.xp || 0) + dailyXPEarned;
            const levelInfo = getLevelForXP(newXP);
            updateProfile(profile.id, { xp: newXP, level: levelInfo.level });
          }
        }

        // ── QUEST PROGRESS (per player) ──
        // Wire up previously untracked quest counters so all quests can progress
        const perfectNotes = estimatePerfectNotes(playerResult.notesHit, playerResult.rating);
        const goldenNotes = playerResult.goldenNotesCount || 0;
        try {
          updateQuestProgress('perfectNotesTotal', perfectNotes, profile.id);
          updateQuestProgress('totalSongsCompleted', 1, profile.id);
          if (gameState.challengeMode) {
            updateQuestProgress('challengeModesPlayed', 1, profile.id);
          }
        } catch { /* non-critical */ }

        // ── ACHIEVEMENTS: P1 (active profile) ──
        const currentExtendedStats = getExtendedStats();
        const achievementExtras = {
          isBlindMode: results.isBlindMode ?? false,
          playbackRate: results.playbackRate ?? 1.0,
          hadComeback: results.hadComeback ?? false,
          songGenre: song.genre,
        };

        // Duel wins are not persisted anywhere else — track them per profile
        // (before the check so this win counts immediately).
        if (isDuelWin) bumpAchievementCounter(profile.id, 'duelsWon');

        // R81: party-games + games-today counters (party games produce no
        // highscore entries, so these can no longer be list-derived).
        if (isPartyGame) bumpAchievementCounter(profile.id, 'partyGames');
        bumpGamesToday(profile.id);

        // P1's highscore entry (saved above) already includes this game;
        // project the song XP that is awarded further below for level checks.
        const p1SongXP = calculateSongXP(
          playerResult.score, playerResult.accuracy, playerResult.maxCombo,
          perfectNotes, goldenNotes, gameState.challengeMode,
        );
        const p1Context = buildAchievementContext(
          profile, highscores, currentExtendedStats,
          {
            score: playerResult.score,
            accuracy: playerResult.accuracy,
            maxCombo: playerResult.maxCombo,
            perfectNotes,
            goldenNotes,
            notesHit: playerResult.notesHit,
            notesMissed: playerResult.notesMissed,
            isDuelWin,
          },
          gameState, { ...achievementExtras, pendingXP: p1SongXP, countsCurrentGame: false },
        );
        const achievementResult = checkAndUnlockAchievements(
          profile.achievements.map(a => a.id),
          p1Context,
        );

        // Add newly unlocked achievements to profile
        if (achievementResult.newlyUnlocked.length > 0) {
          const newAchievements: Achievement[] = achievementResult.newlyUnlocked.map(a => ({
            id: a.id,
            name: a.name,
            description: a.description,
            icon: a.icon,
            unlockedAt: Date.now(),
          }));
          updateProfile(profile.id, {
            achievements: [...profile.achievements, ...newAchievements],
          });
        }

        // ── ACHIEVEMENTS: P2 (duel/duet/competitive modes with a registered profile) ──
        if (player2Result && p2Profile && isMultiplayerMode && p2Profile.id !== profile.id) {
          // R81: P2's counters too (before the check, same as P1).
          if (isPartyGame) bumpAchievementCounter(p2Profile.id, 'partyGames');
          bumpGamesToday(p2Profile.id);
          const p2PerfectNotes = estimatePerfectNotes(player2Result.notesHit, player2Result.rating);
          const p2IsDuelWin = isDuel && playerResult.score < player2Result.score;

          // Track P2's duel win before the check so it counts immediately.
          if (p2IsDuelWin) bumpAchievementCounter(p2Profile.id, 'duelsWon');

          // P2's highscore entry is saved AFTER this check — the context must
          // add the current game manually (duet/party/games-today counters).
          // Their song XP (awarded below) is projected for level checks.
          const p2SongXP = calculateSongXP(
            player2Result.score, player2Result.accuracy, player2Result.maxCombo,
            p2PerfectNotes, player2Result.goldenNotesCount || 0, undefined,
          );
          const p2Context = buildAchievementContext(
            p2Profile, highscores, currentExtendedStats,
            {
              score: player2Result.score,
              accuracy: player2Result.accuracy,
              maxCombo: player2Result.maxCombo,
              perfectNotes: p2PerfectNotes,
              goldenNotes: player2Result.goldenNotesCount || 0,
              notesHit: player2Result.notesHit,
              notesMissed: player2Result.notesMissed,
              isDuelWin: p2IsDuelWin,
            },
            gameState, { ...achievementExtras, pendingXP: p2SongXP, countsCurrentGame: true },
          );
          const p2AchievementResult = checkAndUnlockAchievements(
            p2Profile.achievements.map(a => a.id),
            p2Context,
          );
          if (p2AchievementResult.newlyUnlocked.length > 0) {
            const newAchievements: Achievement[] = p2AchievementResult.newlyUnlocked.map(a => ({
              id: a.id,
              name: a.name,
              description: a.description,
              icon: a.icon,
              unlockedAt: Date.now(),
            }));
            updateProfile(p2Profile.id, {
              achievements: [...p2Profile.achievements, ...newAchievements],
            });
          }
        }

        // Save P2 highscore for duel/competitive modes if P2 has a registered profile
        if (player2Result && player2Result.playerId && isMultiplayerMode && p2Profile) {
          if (!isPartyGame) addHighscore({ // R81: party games produce no highscores
            playerId: p2Profile.id,
            playerName: p2Profile.name,
            playerAvatar: p2Profile.avatar,
            playerColor: p2Profile.color,
            songId: song.id,
            songTitle: song.title,
            artist: song.artist,
            score: player2Result.score,
            accuracy: player2Result.accuracy,
            maxCombo: player2Result.maxCombo,
            difficulty: gameState.difficulty,
            gameMode: gameState.gameMode,
            rating: player2Result.rating,
          });

          // Update P2 profile XP
          awardXPToProfile(
            p2Profile, player2Result.score, player2Result.accuracy, player2Result.maxCombo,
            player2Result.notesHit, player2Result.goldenNotesCount || 0, player2Result.rating,
            undefined, updateProfile,
          );

          // Quest progress for P2 as well
          try {
            updateQuestProgress('perfectNotesTotal', estimatePerfectNotes(player2Result.notesHit, player2Result.rating), p2Profile.id);
            updateQuestProgress('totalSongsCompleted', 1, p2Profile.id);
            if (gameState.challengeMode) {
              updateQuestProgress('challengeModesPlayed', 1, p2Profile.id);
            }
          } catch { /* non-critical */ }
        }

        // UPDATE PLAYER PROGRESSION (XP, Level, Rank, Titles)
        const xpResult = updateStatsAfterGame(currentExtendedStats, {
          songId: song.id,
          songTitle: song.title,
          genre: song.genre,
          score: playerResult.score,
          accuracy: playerResult.accuracy,
          maxCombo: playerResult.maxCombo,
          perfectNotes,
          goldenNotes,
          difficulty: gameState.difficulty,
          mode: gameState.gameMode,
          challengeMode: gameState.challengeMode,
          duration: song.duration,
        });
        saveExtendedStats(xpResult.stats);

        // UPDATE ACTIVE PROFILE XP AND LEVEL (character-based progression)
        awardXPToProfile(
          profile, playerResult.score, playerResult.accuracy, playerResult.maxCombo,
          playerResult.notesHit, goldenNotes, playerResult.rating,
          gameState.challengeMode, updateProfile,
        );

        // Upload to global leaderboard — only for ONLINE profiles that opted in
        // R81: …and never for party games (no comparable score scale).
        const isOnlineProfile = profile.storageMode !== 'local';

        if (!isPartyGame && onlineEnabled && isOnlineProfile && (profile.privacy?.showOnLeaderboard ?? true)) {
          setIsVerified(undefined);

          // R67 anti-cheat serialization contract (see anti-cheat-proof.ts):
          // the integrity hash must be computed over EXACTLY the values the
          // JSON payload carries. Two former mismatches made every score
          // "unverified":
          //  (a) difficulty: the proof hashed the raw 'medium' while the
          //      payload carries the API form 'normal' — the service maps
          //      BOTH the payload difficulty and the proof via
          //      toApiDifficulty, so they can never diverge;
          //  (b) accuracy: a raw float (notesHit/totalNotes*100) has up to 17
          //      significant digits in JS but only 14 in PHP — round to 2
          //      decimal places BEFORE hashing AND submitting.
          const accuracyForUpload = Math.round(playerResult.accuracy * 100) / 100;

          // Real scoring metadata — MUST match what the game scored with
          // (see use-game-timing-data: beat duration 15000/bpm, full
          // 10,000-point model; in duet the submitted player only sings
          // their own part). The server re-computes points-per-tick from
          // these fields and rejects inconsistencies.
          const lines = song.lyrics || [];
          const isDuetMode = gameState.gameMode === 'duet';
          const hasExplicitMarkers = isDuetMode && lines.some(l => l.player === 'P1' || l.player === 'P2');
          const scoringNotes = lines.flatMap(l => l.notes || []);
          const metaNotes = isDuetMode && hasExplicitMarkers
            ? scoringNotes.filter(n => n.player === 'P1' || n.player === 'both')
            : scoringNotes;
          const beatDurationMs = song.bpm ? 15000 / song.bpm : 500;
          const scoringMeta = calculateScoringMetadata(metaNotes, beatDurationMs, gameState.difficulty);

          // R69: the REAL per-note proof chain from the scoring pass
          // (run-scoring-pass → note-proof-collector). Falls back to the
          // legacy synthetic walk only when nothing was collected (e.g. the
          // page was reloaded between game end and the results screen).
          const realNoteResults = takeCollectedNoteProofs();

          /** Build the proof inputs for leaderboardService.submitScore — the
           *  service generates the proof package (fresh proof_ts, so a
           *  consent-delayed or outbox-retried upload stays valid). */
          const buildProofInputs = ():
            | { scoringMeta: { totalNotes: number; totalNoteTicks: number; goldenNoteTicks: number; normalNoteTicks: number; pointsPerTick: number; comboMultiplier: number }; noteResults: Array<{ noteIdx: number; ticksHit: number; totalTicks: number; isGolden: boolean; wasPerfect: boolean }> }
            | undefined => {
            if (!scoringMeta.isFullScoring) return undefined;

            let noteResults = realNoteResults;
            if (noteResults.length === 0) {
              // Legacy synthetic fallback — reconstructed from the claimed
              // sums (pre-R69 behaviour; carries no independent evidence).
              const hitNotes = playerResult.notesHit || 1;
              const missNotes = playerResult.notesMissed || 0;
              const totalNotes = hitNotes + missNotes;
              noteResults = [];
              for (let i = 0; i < Math.min(totalNotes, 200); i++) {
                noteResults.push({
                  noteIdx: i,
                  ticksHit: i < hitNotes ? 1 : 0,
                  totalTicks: 1,
                  isGolden: false,
                  wasPerfect: false,
                });
              }
            }
            return {
              scoringMeta: {
                totalNotes: scoringMeta.totalNotes,
                totalNoteTicks: scoringMeta.totalNoteTicks,
                goldenNoteTicks: scoringMeta.goldenNoteTicks,
                normalNoteTicks: scoringMeta.normalNoteTicks,
                pointsPerTick: scoringMeta.pointsPerTick,
                // R69: the real multiplier the best combo reached (1–2 in
                // steps of 0.25) instead of the hardcoded 1.
                comboMultiplier: calculateComboMultiplier(playerResult.maxCombo),
              },
              noteResults,
            };
          };

          const performUpload = () => {
            setUploadStatus('uploading');
            // R69: give queued submissions from earlier games a chance to go
            // out first (fire-and-forget — the server upserts by best score,
            // the order between old and new submissions does not matter).
            import('@/lib/leaderboard/outbox')
              .then(({ flushScoreOutbox }) => flushScoreOutbox())
              .catch(() => { /* non-critical */ });
            return import('@/lib/api/leaderboard-service')
              .then(({ leaderboardService }) => {
              // The server requires the profile's sync_code on every score
              // submission. Register once while we don't have a code and
              // persist the code the server generated — later games then
              // submit without the extra roundtrip.
              const ensureRegistered = async () => {
                if (profile.syncCode) return profile;
                const p = await leaderboardService.registerProfile(profile).catch(() => null);
                const code = p?.sync_code;
                if (!code) return profile;
                updateProfile(profile.id, { syncCode: code });
                return { ...profile, syncCode: code };
              };
              return ensureRegistered().then((prof) =>
                leaderboardService.submitScore({
                  profile: prof,
                  song,
                  gameMode: gameState.gameMode,
                  scoringMetadata: scoringMeta,
                  score: playerResult.score,
                  maxScore: MAX_POINTS_PER_SONG,
                  accuracy: accuracyForUpload,
                  maxCombo: playerResult.maxCombo,
                  difficulty: gameState.difficulty,
                  rating: playerResult.rating,
                  notesHit: playerResult.notesHit,
                  notesMissed: playerResult.notesMissed,
                  proofInputs: buildProofInputs(),
                })
              );
            })
              .then((result) => {
                setUploadStatus('success');
                const verified = !!result.verified;
                setIsVerified(verified);
                // Verified uploads always include the rank; non-verified new bests use a fixed message.
                const key = verified
                  ? 'resultsScreen.uploadedRankVerified'
                  : result.is_new_best ? 'resultsScreen.newGlobalHighscore' : 'resultsScreen.uploadedRank';
                setUploadMessage(t(key).replace('{n}', String(result.rank)));
              })
              .catch((err) => {
                setUploadStatus('error');
                // R69: a failed submission is queued for retry (next game
                // end / window focus) — say so instead of "failed".
                if (err instanceof Error && err.name === 'OfflineQueuedError') {
                  setUploadMessage(t('resultsScreen.uploadQueued'));
                } else {
                  setUploadMessage(err.message || t('resultsScreen.uploadFailed'));
                }
              });
          };

          // R67: first upload requires the explicit data-storage notice
          // (name, color, optional country, scores). Queue the upload until
          // the user accepts; the consent card is rendered by UploadStatus.
          if (hasLeaderboardConsent()) {
            void performUpload();
          } else {
            pendingOnlineActionsRef.current.push(() => { void performUpload(); });
            setUploadStatus('consent');
          }
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- isDuel excluded; derived from gameMode which IS in deps via gameState.gameMode
  }, [results, song, activeProfileId, profiles, addHighscore, gameState.difficulty, gameState.gameMode, onlineEnabled, updateProfile, t]);

  /** R67: user accepted the leaderboard data notice — persist the consent
   *  and run every online action queued for this game (score upload + daily
   *  board submission). Future games upload without asking again. */
  const acceptOnlineConsent = useCallback(() => {
    setLeaderboardConsent();
    const queued = pendingOnlineActionsRef.current;
    pendingOnlineActionsRef.current = [];
    for (const action of queued) {
      try { action(); } catch { /* non-critical */ }
    }
    if (queued.length === 0) {
      // Nothing was queued (e.g. only the daily submission wanted to go out)
      // — leave the idle state so no empty "uploading" banner sticks.
      setUploadStatus((prev) => (prev === 'consent' ? 'idle' : prev));
    }
  }, []);

  /** R67: user declined — drop every queued online action for this game.
   *  The notice appears again on the next game (nothing is persisted). */
  const declineOnlineConsent = useCallback(() => {
    pendingOnlineActionsRef.current = [];
    setUploadStatus('idle');
  }, []);

  return { uploadStatus, uploadMessage, isVerified, acceptOnlineConsent, declineOnlineConsent };
}
