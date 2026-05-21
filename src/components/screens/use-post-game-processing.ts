'use client';

import { useState, useEffect, useRef } from 'react';
import { StorageKeys, getItem, removeItem } from '@/lib/storage';
import { getExtendedStats, updateStatsAfterGame, saveExtendedStats, calculateSongXP, getLevelForXP } from '@/lib/game/player-progression';
import { checkAndUnlockAchievements } from '@/lib/game/achievements';
import { estimatePerfectNotes } from '@/lib/game/scoring';
import { MAX_POINTS_PER_SONG } from '@/components/results/constants';
import { recordSongPlay } from '@/lib/playlist-manager';
import type { PlayerProfile, GameResult, Song, GameState } from '@/types/game';

// Helper: calculate XP and update a player's profile with new level
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
  const currentXP = profile.xp || 0;
  const newXP = currentXP + xp;
  const levelInfo = getLevelForXP(newXP);
  updateFn(profile.id, { xp: newXP, level: levelInfo.level });
}

export interface UsePostGameProcessingParams {
  results: GameResult | null;
  song: Song | null;
  activeProfileId: string | null;
  profiles: PlayerProfile[];
  gameState: GameState;
  addHighscore: (entry: Omit<import('@/types/game').HighscoreEntry, 'id' | 'playedAt' | 'rankTitle'>) => import('@/types/game').HighscoreEntry;
  onlineEnabled: boolean;
  updateProfile: (id: string, updates: Partial<PlayerProfile>) => void;
  t: (key: string) => string;
}

/**
 * Handles all post-game processing:
 * - Saving highscores (P1 and P2)
 * - Checking and unlocking achievements
 * - Updating player progression (XP, level, rank)
 * - Daily challenge submission
 * - Global leaderboard upload
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

        // Record song play for Recently Played & Most Played system playlists
        recordSongPlay(song.id);

        // Also get P2 result early — needed for achievement checking (isDuelWin) below
        const player2Result = results.players[1];
        const isMultiplayerMode = ['duel', 'duet', 'competitive-words', 'competitive-blind'].includes(gameState.gameMode);

        // CHECK AND UNLOCK ACHIEVEMENTS
        const currentExtendedStats = getExtendedStats();
        const perfectNotes = estimatePerfectNotes(playerResult.notesHit, playerResult.rating);
        const goldenNotes = playerResult.goldenNotesCount || 0;
        const isDuelWin = isDuel && player2Result && playerResult.score > player2Result.score;
        const isPartyMode = ['pass-the-mic', 'medley', 'battle-royale', 'competitive-words', 'competitive-blind', 'companion-singalong'].includes(gameState.gameMode);
        const isPassTheMic = gameState.gameMode === 'pass-the-mic';
        const achievementResult = checkAndUnlockAchievements(
          profile.achievements.map(a => a.id),
          {
            score: playerResult.score,
            accuracy: playerResult.accuracy,
            maxCombo: playerResult.maxCombo,
            perfectNotes,
            goldenNotes: playerResult.goldenNotesCount || 0,
            notesHit: playerResult.notesHit,
            notesMissed: playerResult.notesMissed,
            gameMode: gameState.gameMode,
            difficulty: gameState.difficulty,
            totalSongsCompleted: currentExtendedStats.songsCompleted,
            totalGamesPlayed: currentExtendedStats.totalSessions,
            totalGoldenNotes: currentExtendedStats.totalGoldenNotesHit + (playerResult.goldenNotesCount || 0),
            totalPerfectNotes: currentExtendedStats.totalPerfectNotes + perfectNotes,
            isPartyMode,
            isDuelWin,
            isPassTheMic,
            isBlindMode: results.isBlindMode ?? false,
            isSpeedMode: (results.playbackRate ?? 1.0) >= 1.5,
            playbackRate: results.playbackRate ?? 1.0,
            hadComeback: results.hadComeback ?? false,
          },
        );

        // Add newly unlocked achievements to profile
        if (achievementResult.newlyUnlocked.length > 0) {
          const newAchievements = achievementResult.newlyUnlocked.map(a => ({
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

        // Save P2 highscore for duel/competitive modes if P2 has a registered profile
        if (player2Result && player2Result.playerId && isMultiplayerMode) {
          const p2Profile = profiles.find(p => p.id === player2Result.playerId);
          if (p2Profile) {
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
          }
        }

        // UPDATE PLAYER PROGRESSION (XP, Level, Rank, Titles)
        // Reuse currentExtendedStats from above — avoids redundant getExtendedStats() call
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

        // DAILY CHALLENGE SUBMISSION
        // If this game was started from the daily challenge screen, submit the result
        try {
          const dailyFlag = getItem(StorageKeys.DAILY_CHALLENGE_ACTIVE);
          if (dailyFlag) {
            const parsed = JSON.parse(dailyFlag);
            if (parsed.active) {
              // Clear the flag first to avoid double-submission
              removeItem(StorageKeys.DAILY_CHALLENGE_ACTIVE);
              // Submit the challenge result (async, fire-and-forget — it persists to localStorage internally)
              import('@/lib/game/daily-challenge').then(({ submitChallengeResult, submitCoopChallengeResult, submitWeeklyChallengeResult }) => {
                // Co-op daily challenge: requires ≥2 player results
                if (parsed.gameMode === 'coop' && player2Result) {
                  const p2Profile = profiles.find(p => p.id === player2Result.playerId);
                  submitCoopChallengeResult(
                    [
                      { id: profile.id, name: profile.name, avatar: profile.avatar, color: profile.color },
                      { id: player2Result.playerId || 'p2', name: p2Profile?.name || 'P2', color: p2Profile?.color || '#4ECDC4' },
                    ],
                    [
                      { score: playerResult.score, accuracy: playerResult.accuracy, combo: playerResult.maxCombo, perfectNotesCount: playerResult.perfectNotesCount },
                      { score: player2Result.score, accuracy: player2Result.accuracy, combo: player2Result.maxCombo, perfectNotesCount: player2Result.perfectNotesCount },
                    ],
                  );
                } else {
                  submitChallengeResult(
                    { id: profile.id, name: profile.name, avatar: profile.avatar, color: profile.color },
                    { score: playerResult.score, accuracy: playerResult.accuracy, combo: playerResult.maxCombo, perfectNotesCount: playerResult.perfectNotesCount },
                  );
                }

                // Also submit to weekly challenge if the metric type matches
                // The weekly challenge tracks best scores across the week
                submitWeeklyChallengeResult(
                  { id: profile.id, name: profile.name, avatar: profile.avatar, color: profile.color },
                  { score: playerResult.score, accuracy: playerResult.accuracy, combo: playerResult.maxCombo, perfectNotesCount: playerResult.perfectNotesCount },
                  'score',
                );
              }).catch(() => {});
            }
          }
        } catch {
          // Ignore daily challenge submission errors — not critical
        }

        // Upload to global leaderboard if enabled and player allows it
        if (onlineEnabled && (profile.privacy?.showOnLeaderboard ?? true)) {
          setUploadStatus('uploading');

          import('@/lib/api/leaderboard-service').then(({ leaderboardService }) => {
            // First, ensure player is registered/updated
            const playerPromise = leaderboardService.savePlayer(profile);

            // Then, register the song
            const songPromise = leaderboardService.registerSong(song);

            // Wait for both, then submit score
            Promise.all([playerPromise, songPromise])
              .then(() => {
                // Calculate notes stats from game state (recompute to avoid stale closure)
                const submitPerfectNotes = estimatePerfectNotes(playerResult.notesHit, playerResult.rating);
                const goodNotes = Math.max(0, playerResult.notesHit - submitPerfectNotes);

                return leaderboardService.submitScore(
                  profile,
                  song,
                  playerResult.score,
                  MAX_POINTS_PER_SONG,
                  {
                    perfectNotes: submitPerfectNotes,
                    goodNotes,
                    missedNotes: playerResult.notesMissed,
                    maxCombo: playerResult.maxCombo,
                  },
                  gameState.difficulty,
                  gameState.gameMode
                );
              })
              .then((result) => {
                setUploadStatus('success');
                if (result.is_new_high_score) {
                  setUploadMessage(t('resultsScreen.newGlobalHighscore'));
                } else {
                  setUploadMessage(t('resultsScreen.uploadedRank').replace('{n}', result.rank.toString()));
                }
              })
              .catch((err) => {
                setUploadStatus('error');
                setUploadMessage(err.message || t('resultsScreen.uploadFailed'));
              });
          });
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- isDuel excluded; derived from gameMode which IS in deps via gameState.gameMode
  }, [results, song, activeProfileId, profiles, addHighscore, gameState.difficulty, gameState.gameMode, onlineEnabled, updateProfile]);

  return { uploadStatus, uploadMessage };
}
