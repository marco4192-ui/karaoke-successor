'use client';

import { useState, useEffect, useRef } from 'react';
import { StorageKeys, getItem, removeItem, setItem } from '@/lib/storage';
import { getExtendedStats, updateStatsAfterGame, saveExtendedStats, calculateSongXP, getLevelForXP } from '@/lib/game/player-progression';
import { checkAndUnlockAchievements } from '@/lib/game/achievements';
import {
  submitChallengeResult,
  submitCoopChallengeResult,
  submitWeeklyChallengeResult,
  getPlayerDailyStats,
  updateQuestProgress,
} from '@/lib/game/daily-challenge';
import { estimatePerfectNotes, calculateScoringMetadata } from '@/lib/game/scoring';
import { MAX_POINTS_PER_SONG } from '@/components/results/constants';
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

/** Game modes that count as "party" games (shared by isPartyMode and the party counter). */
const PARTY_GAME_MODES = ['pass-the-mic', 'medley', 'battle-royale', 'competitive-words', 'competitive-blind', 'companion-singalong'];

/** Count duet games from the highscore history for a player. */
function countDuetGames(highscores: HighscoreEntry[], playerId: string): number {
  return highscores.filter(h => h.playerId === playerId && h.gameMode === 'duet').length;
}

/** Count party games from the highscore history for a player. */
function countPartyGames(highscores: HighscoreEntry[], playerId: string): number {
  return highscores.filter(h => h.playerId === playerId && PARTY_GAME_MODES.includes(h.gameMode)).length;
}

/** Count games finished today from the highscore history for a player. */
function countGamesToday(highscores: HighscoreEntry[], playerId: string): number {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const startTime = start.getTime();
  return highscores.filter(h => h.playerId === playerId && h.playedAt >= startTime).length;
}

/**
 * Per-profile achievement counters that cannot be derived from the existing
 * stores (highscores prune old entries by score, and duel wins are never
 * persisted as such). Stored as one small JSON blob per profile.
 */
interface AchievementCounters {
  duelsWon: number;
}

const ACHIEVEMENT_COUNTERS_PREFIX = 'achievement_counters_';

function getAchievementCounters(profileId: string): AchievementCounters {
  try {
    const raw = getItem(ACHIEVEMENT_COUNTERS_PREFIX + profileId);
    if (!raw) return { duelsWon: 0 };
    const parsed = JSON.parse(raw) as Partial<AchievementCounters> | null;
    const duelsWon = parsed?.duelsWon;
    return { duelsWon: typeof duelsWon === 'number' && Number.isFinite(duelsWon) ? duelsWon : 0 };
  } catch {
    return { duelsWon: 0 };
  }
}

function bumpAchievementCounter(profileId: string, key: keyof AchievementCounters): void {
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
    gamesToday: countGamesToday(highscores, profile.id) + (extras.countsCurrentGame ? 1 : 0),
    hourOfDay: new Date().getHours(),
    dayOfWeek: new Date().getDay(),
    // Level projection (per profile)
    level: getLevelForXP(projectedXP).level,
    // localStorage-backed per-profile counters
    duelsWon: getAchievementCounters(profile.id).duelsWon,
    partyGames: countPartyGames(highscores, profile.id) + (extras.countsCurrentGame && isPartyMode ? 1 : 0),
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
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const [isVerified, setIsVerified] = useState<boolean | undefined>(undefined);

  const isDuel = gameState.gameMode === 'duel';

  // Save highscore when results are shown (only once)
  // Duel is competitive (P1 vs P2); Duet is cooperative (P1 + P2 together).
  // Only duel should trigger win/lose comparisons and duel-win achievements.
  useEffect(() => {
    if (results && song && activeProfileId && !savedToHighscoreRef.current) {
      const playerResult = results.players[0];
      const profile = profiles.find(p => p.id === activeProfileId);

      if (profile && playerResult) {
        // Save to local highscore
        addHighscore({
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
        try {
          const dailyFlag = getItem(StorageKeys.DAILY_CHALLENGE_ACTIVE);
          if (dailyFlag) {
            const parsed = JSON.parse(dailyFlag);
            if (parsed.active) {
              // Clear the flag first to avoid double-submission
              removeItem(StorageKeys.DAILY_CHALLENGE_ACTIVE);

              const selectedIds: string[] = Array.isArray(parsed.playerIds) ? parsed.playerIds : [];
              const p1 = toIdentity(profile);
              const p1Result = {
                score: playerResult.score,
                accuracy: playerResult.accuracy,
                combo: playerResult.maxCombo,
                perfectNotesCount: playerResult.perfectNotesCount,
              };

              // Resolve the second player: second selected profile, or the
              // P2 profile of the running game as fallback.
              const secondSelectedId = selectedIds.find(id => id !== profile.id);
              const secondProfile = (secondSelectedId && profiles.find(p => p.id === secondSelectedId)) || p2Profile;

              // Challenge-type metric helper (score/accuracy/combo/perfect notes)
              const metricOf = (type: string, r: { score: number; accuracy: number; combo: number; perfectNotesCount?: number }) => {
                switch (type) {
                  case 'accuracy': return r.accuracy;
                  case 'combo': return r.combo;
                  case 'perfect_notes': return r.perfectNotesCount ?? 0;
                  default: return r.score;
                }
              };

              if (parsed.gameMode === 'coop' && player2Result && secondProfile) {
                // Team evaluation: the average of both players counts
                const coopResult = submitCoopChallengeResult(
                  [p1, toIdentity(secondProfile)],
                  [
                    p1Result,
                    {
                      score: player2Result.score,
                      accuracy: player2Result.accuracy,
                      combo: player2Result.maxCombo,
                      perfectNotesCount: player2Result.perfectNotesCount,
                    },
                  ],
                );
                dailyXPEarned += coopResult.xpEarned;

                // Online daily board: submit the team average (fire-and-forget)
                if (onlineEnabled && profile.storageMode !== 'local') {
                  const avg = (a: number, b: number) => (a + b) / 2;
                  const avgResult = {
                    score: avg(playerResult.score, player2Result.score),
                    accuracy: avg(playerResult.accuracy, player2Result.accuracy),
                    combo: avg(playerResult.maxCombo, player2Result.maxCombo),
                    perfectNotesCount: avg(playerResult.perfectNotesCount ?? 0, player2Result.perfectNotesCount ?? 0),
                  };
                  const type = coopResult.challenge.type;
                  const todayISO = new Date().toISOString().slice(0, 10);
                  onlineDailySubmission = () => {
                    import('@/lib/api/leaderboard-service').then(({ leaderboardService }) =>
                      leaderboardService.submitDailyResult({
                        profile,
                        challengeDate: todayISO,
                        challengeType: type,
                        metricValue: metricOf(type, avgResult),
                        xpEarned: coopResult.xpEarned,
                      }),
                    ).then((res) => {
                      if (res.sync_code) updateProfile(profile.id, { syncCode: res.sync_code });
                    }).catch(() => { /* non-critical */ });
                  };
                }
              } else {
                // Individual evaluation for each selected player
                const r1 = submitChallengeResult(p1, p1Result);
                dailyXPEarned += r1.xpEarned;

                // Online daily board for P1 (fire-and-forget)
                if (onlineEnabled && profile.storageMode !== 'local') {
                  const type = r1.challenge.type;
                  const todayISO = new Date().toISOString().slice(0, 10);
                  onlineDailySubmission = () => {
                    import('@/lib/api/leaderboard-service').then(({ leaderboardService }) =>
                      leaderboardService.submitDailyResult({
                        profile,
                        challengeDate: todayISO,
                        challengeType: type,
                        metricValue: metricOf(type, p1Result),
                        xpEarned: r1.xpEarned,
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
                    combo: player2Result.maxCombo,
                    perfectNotesCount: player2Result.perfectNotesCount,
                  });
                  dailyXPEarned += r2.xpEarned;
                }
              }

              // Weekly challenge tracks best scores across the week —
              // submitted for every selected player with their own result
              const w1 = submitWeeklyChallengeResult(p1, p1Result, 'score');
              dailyXPEarned += w1.xpEarned;
              if (secondProfile && player2Result) {
                const w2 = submitWeeklyChallengeResult(toIdentity(secondProfile), {
                  score: player2Result.score,
                  accuracy: player2Result.accuracy,
                  combo: player2Result.maxCombo,
                  perfectNotesCount: player2Result.perfectNotesCount,
                }, 'score');
                dailyXPEarned += w2.xpEarned;
              }
            }
          }
        } catch {
          // Ignore daily challenge submission errors — not critical
        }

        // Fire the online daily board submission (after local persistence)
        onlineDailySubmission?.();

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
          addHighscore({
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
        const isOnlineProfile = profile.storageMode !== 'local';
        if (onlineEnabled && isOnlineProfile && (profile.privacy?.showOnLeaderboard ?? true)) {
          setUploadStatus('uploading');
          setIsVerified(undefined);

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

          // Build the anti-cheat proof dynamically to avoid bundling the
          // module when not needed. Party modes with their own point scale
          // (isFullScoring === false) submit without a proof — the server
          // then stores them as unverified.
          const buildProof = () => import('@/lib/leaderboard/anti-cheat-proof')
            .then(({ generateProofPackage }) => {
              if (!scoringMeta.isFullScoring) return undefined;

              const hitNotes = playerResult.notesHit || 1;
              const missNotes = playerResult.notesMissed || 0;
              const totalNotes = hitNotes + missNotes;

              // Per-note hash chain: synthetic walk over the claimed hit
              // layout. The chain root cannot be re-verified server-side
              // (the server never sees per-note results) — it binds the
              // package together via the integrity hash and provides a
              // chain length for consistency checks.
              const noteResults: Array<{noteIdx: number; ticksHit: number; totalTicks: number; isGolden: boolean; wasPerfect: boolean}> = [];
              for (let i = 0; i < Math.min(totalNotes, 200); i++) {
                noteResults.push({
                  noteIdx: i,
                  ticksHit: i < hitNotes ? 1 : 0,
                  totalTicks: 1,
                  isGolden: false,
                  wasPerfect: false,
                });
              }
              return generateProofPackage({
                scoringMeta: {
                  totalNotes: scoringMeta.totalNotes,
                  totalNoteTicks: scoringMeta.totalNoteTicks,
                  goldenNoteTicks: scoringMeta.goldenNoteTicks,
                  normalNoteTicks: scoringMeta.normalNoteTicks,
                  pointsPerTick: scoringMeta.pointsPerTick,
                  comboMultiplier: 1,
                },
                noteResults,
                score: playerResult.score,
                accuracy: playerResult.accuracy,
                maxCombo: playerResult.maxCombo,
                notesHit: playerResult.notesHit,
                notesMissed: playerResult.notesMissed,
                difficulty: gameState.difficulty,
                fingerprintVersion: 'v1',
              });
            })
            .catch(() => undefined); // non-critical, degrade gracefully

          Promise.all([
            import('@/lib/api/leaderboard-service'),
            buildProof(),
          ]).then(([{ leaderboardService }, proof]) => {
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
                accuracy: playerResult.accuracy,
                maxCombo: playerResult.maxCombo,
                difficulty: gameState.difficulty,
                rating: playerResult.rating,
                notesHit: playerResult.notesHit,
                notesMissed: playerResult.notesMissed,
                proof,
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
                setUploadMessage(err.message || t('resultsScreen.uploadFailed'));
              });
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- isDuel excluded; derived from gameMode which IS in deps via gameState.gameMode
  }, [results, song, activeProfileId, profiles, addHighscore, gameState.difficulty, gameState.gameMode, onlineEnabled, updateProfile, t]);

  return { uploadStatus, uploadMessage, isVerified };
}
