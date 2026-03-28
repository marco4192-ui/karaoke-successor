'use client';

import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/lib/game/store';
import { Song, GameResult } from '@/types/game';
import {
  getExtendedStats,
  updateStatsAfterGame,
  saveExtendedStats,
  calculateSongXP,
  getLevelForXP
} from '@/lib/game/player-progression';

export interface UseHighscoreSaveOptions {
  song: Song | null;
  results: GameResult | null;
  activeProfileId: string | null;
  onlineEnabled: boolean;
}

export interface UseHighscoreSaveReturn {
  uploadStatus: 'idle' | 'uploading' | 'success' | 'error';
  uploadMessage: string;
  savedToHighscore: boolean;
}

export function useHighscoreSave({
  song,
  results,
  activeProfileId,
  onlineEnabled,
}: UseHighscoreSaveOptions): UseHighscoreSaveReturn {
  const { profiles, addHighscore, updateProfile, gameState } = useGameStore();
  const savedToHighscoreRef = useRef(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');

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

        // UPDATE PLAYER PROGRESSION (XP, Level, Rank, Titles)
        const currentStats = getExtendedStats();
        const xpResult = updateStatsAfterGame(currentStats, {
          songId: song.id,
          songTitle: song.title,
          genre: song.genre,
          score: playerResult.score,
          accuracy: playerResult.accuracy,
          maxCombo: playerResult.maxCombo,
          perfectNotes: Math.floor(playerResult.notesHit * 0.6),
          goldenNotes: 0,
          difficulty: gameState.difficulty,
          mode: gameState.gameMode,
          duration: song.duration,
        });
        saveExtendedStats(xpResult.stats);

        // UPDATE ACTIVE PROFILE XP AND LEVEL
        const earnedXP = calculateSongXP(
          playerResult.score,
          playerResult.accuracy,
          playerResult.maxCombo,
          Math.floor(playerResult.notesHit * 0.6),
          0,
          undefined
        );
        const currentProfileXP = profile.xp || 0;
        const newTotalXP = currentProfileXP + earnedXP;
        const levelInfo = getLevelForXP(newTotalXP);
        updateProfile(profile.id, {
          xp: newTotalXP,
          level: levelInfo.level,
        });

        // Upload to global leaderboard if enabled and player allows it
        if (onlineEnabled && (profile.privacy?.showOnLeaderboard ?? true)) {
          setUploadStatus('uploading');

          import('@/lib/api/leaderboard-service').then(({ leaderboardService }) => {
            const playerPromise = leaderboardService.savePlayer(profile);
            const songPromise = leaderboardService.registerSong(song);

            Promise.all([playerPromise, songPromise])
              .then(() => {
                const perfectNotes = Math.floor(playerResult.notesHit * 0.6);
                const goodNotes = Math.floor(playerResult.notesHit * 0.4);

                return leaderboardService.submitScore(
                  profile,
                  song,
                  playerResult.score,
                  10000,
                  {
                    perfectNotes,
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
                  setUploadMessage('🎉 New global high score!');
                } else {
                  setUploadMessage(`Uploaded! Rank #${result.rank}`);
                }
              })
              .catch((err) => {
                setUploadStatus('error');
                setUploadMessage(err.message || 'Upload failed');
              });
          });
        }
      }
    }
  }, [results, song, activeProfileId, profiles, addHighscore, gameState.difficulty, gameState.gameMode, onlineEnabled, updateProfile]);

  return {
    uploadStatus,
    uploadMessage,
    savedToHighscore: savedToHighscoreRef.current,
  };
}
