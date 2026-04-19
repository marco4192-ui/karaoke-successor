'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { useGameStore } from '@/lib/game/store';
import { safeAlert } from '@/lib/safe-dialog';
import { getExtendedStats, updateStatsAfterGame, saveExtendedStats, calculateSongXP, getLevelForXP } from '@/lib/game/player-progression';

// Re-export moved components for backward compatibility
export { SongHighscoreModal } from '@/components/results/song-highscore-modal';
export { ScoreVisualization } from '@/components/results/score-visualization';
export type { VisualizationMode } from '@/components/results/score-visualization';
export { getCountryFlag, TrophyIcon, MAX_POINTS_PER_SONG } from '@/components/results/constants';

// Internal imports from extracted components
import { MAX_POINTS_PER_SONG } from '@/components/results/constants';
import { TrophyIcon } from '@/components/results/constants';
import { SongHighscoreModal } from '@/components/results/song-highscore-modal';
import { ScoreVisualization } from '@/components/results/score-visualization';
import { UploadStatus } from '@/components/results/upload-status';
import { SongLeaderboardPreview } from '@/components/results/song-leaderboard-preview';
import { ShareSection } from '@/components/results/share-section';
import { QueueNextSong } from '@/components/results/queue-next-song';
import { ReplayModal } from '@/components/results/replay-modal';
import { getLastReplayId } from '@/lib/replay-state';
import { getReplay, type ReplayRecord } from '@/lib/db/replay-db';

// ===================== RESULTS SCREEN =====================
export function ResultsScreen({ onPlayAgain, onHome }: { onPlayAgain: () => void; onHome: () => void }) {
  const { gameState, resetGame, addHighscore, profiles, activeProfileId, onlineEnabled, updateProfile, highscores, setSong, setGameMode, addPlayer } = useGameStore();
  const savedToHighscoreRef = useRef(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const [showHighscoreModal, setShowHighscoreModal] = useState(false);
  const [showReplay, setShowReplay] = useState(false);
  const [replayRecord, setReplayRecord] = useState<ReplayRecord | null>(null);
  
  // Queue state - for showing next song from companion queue
  const [nextQueueItem, setNextQueueItem] = useState<{
    id: string;
    songId: string;
    songTitle: string;
    songArtist: string;
    addedBy: string;
    gameMode?: 'single' | 'duel' | 'duet';
    isFromCompanion: boolean;
  } | null>(null);
  
  const results = gameState.results;
  const song = gameState.currentSong;

  // Load last replay from IndexedDB (set by game-screen during recording)
  useEffect(() => {
    const loadReplay = async () => {
      const replayId = getLastReplayId();
      if (replayId) {
        try {
          const record = await getReplay(replayId);
          if (record) {
            setReplayRecord(record);
          }
        } catch (err) {
          console.warn('[ResultsScreen] Failed to load replay:', err);
        }
      }
    };
    loadReplay();
  }, []);

  // Fetch next song from queue (both local and companion)
  useEffect(() => {
    const fetchNextInQueue = async () => {
      try {
        const response = await fetch('/api/mobile?action=getqueue');
        const data = await response.json();
        if (data.success && data.queue && data.queue.length > 0) {
          const nextItem = data.queue.find((q: { status: string }) => q.status === 'pending');
          if (nextItem) {
            setNextQueueItem({
              id: nextItem.id,
              songId: nextItem.songId,
              songTitle: nextItem.songTitle,
              songArtist: nextItem.songArtist,
              addedBy: nextItem.addedBy,
              gameMode: nextItem.gameMode || 'single',
              isFromCompanion: true,
            });
          }
        }
      } catch {
        // Ignore errors
      }
    };
    
    fetchNextInQueue();
  }, []);
  
  // Play next song from queue
  const handlePlayFromQueue = async () => {
    if (!nextQueueItem) return;
    
    // Get full song from library
    const { getAllSongsAsync, getSongByIdWithLyrics, ensureSongUrls } = await import('@/lib/game/song-library');
    const songs = await getAllSongsAsync();
    let fullSong = songs.find(s => s.id === nextQueueItem.songId);
    
    // Fallback: match by title + artist (handles companion song ID mismatches)
    if (!fullSong) {
      fullSong = songs.find(s =>
        s.title.toLowerCase() === nextQueueItem.songTitle.toLowerCase() &&
        s.artist.toLowerCase() === nextQueueItem.songArtist.toLowerCase()
      );
      if (fullSong) {
        console.log('[ResultsScreen] Song found via title+artist fallback:', nextQueueItem.songTitle);
      }
    }
    
    if (!fullSong) {
      safeAlert(`Song "${nextQueueItem.songTitle}" not found in local library`);
      // Mark as completed so it doesn't block the queue
      try {
        await fetch('/api/mobile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'queuecompleted', payload: { itemId: nextQueueItem.id } }),
        });
      } catch { /* ignore */ }
      setNextQueueItem(null);
      return;
    }
    
    // CRITICAL FIX: Pre-resolve lyrics + URLs before setting the song.
    // Without this, the song may lack audioUrl/lyrics → watchdog fires.
    try {
      const withLyrics = await getSongByIdWithLyrics(fullSong.id) || fullSong;
      fullSong = await ensureSongUrls(withLyrics);
    } catch (err) {
      console.error('[ResultsScreen] Failed to prepare song:', err);
    }
    
    // After URL resolution, check if the song has playable media.
    const hasMedia = fullSong.audioUrl || fullSong.videoUrl || fullSong.relativeVideoPath || fullSong.relativeAudioPath;
    if (!hasMedia) {
      console.warn('[ResultsScreen] No playable media for song:', fullSong.title, '- skipping');
      safeAlert(`No media found for "${fullSong.title}" — skipping`);
      try {
        await fetch('/api/mobile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'queuecompleted', payload: { itemId: nextQueueItem.id } }),
        });
      } catch { /* ignore */ }
      setNextQueueItem(null);
      return;
    }
    
    // Mark as playing
    try {
      await fetch('/api/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'markplaying',
          payload: { itemId: nextQueueItem.id },
        }),
      });
    } catch {
      // Ignore
    }
    
    // Set up game
    setSong(fullSong);
    if (nextQueueItem.gameMode === 'duel') {
      setGameMode('duel');
    } else if (nextQueueItem.gameMode === 'duet') {
      setGameMode('duet');
    } else {
      setGameMode('standard');
    }
    
    // Add active player
    if (activeProfileId) {
      const profile = profiles.find(p => p.id === activeProfileId);
      if (profile) {
        addPlayer(profile);
      }
    }
    
    resetGame();
    onPlayAgain();
  };

  // Get song highscores for comparison
  const songHighscores = useMemo(() => {
    if (!song) return [];
    return highscores
      .filter(h => h.songId === song.id)
      .sort((a, b) => b.score - a.score);
  }, [highscores, song]);

  // Find player's rank on this song
  const currentPlayerRank = useMemo(() => {
    if (!song || !activeProfileId) return null;
    const index = songHighscores.findIndex(h => h.playerId === activeProfileId);
    return index >= 0 ? index + 1 : null;
  }, [songHighscores, activeProfileId, song]);

  // Save highscore when results are shown (only once)
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

        // Also save P2 highscore for duel/duet if P2 has a registered profile
        const player2Result = results.players[1];
        if (player2Result && player2Result.playerId) {
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
            const p2XP = calculateSongXP(
              player2Result.score,
              player2Result.accuracy,
              player2Result.maxCombo,
              Math.floor(player2Result.notesHit * 0.6),
              0,
              undefined
            );
            const p2CurrentXP = p2Profile.xp || 0;
            const p2NewXP = p2CurrentXP + p2XP;
            const p2LevelInfo = getLevelForXP(p2NewXP);
            updateProfile(p2Profile.id, {
              xp: p2NewXP,
              level: p2LevelInfo.level,
            });
          }
        }
        
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
          goldenNotes: 0, // Would need to track this during gameplay
          difficulty: gameState.difficulty,
          mode: gameState.gameMode,
          duration: song.duration,
        });
        saveExtendedStats(xpResult.stats);
        
        // UPDATE ACTIVE PROFILE XP AND LEVEL (character-based progression)
        const earnedXP = calculateSongXP(
          playerResult.score,
          playerResult.accuracy,
          playerResult.maxCombo,
          Math.floor(playerResult.notesHit * 0.6),
          0, // goldenNotes - would need to track during gameplay
          undefined // challengeMode
        );
        const currentProfileXP = profile.xp || 0;
        const newTotalXP = currentProfileXP + earnedXP;
        const levelInfo = getLevelForXP(newTotalXP);
        updateProfile(profile.id, {
          xp: newTotalXP,
          level: levelInfo.level,
        });
        
        // Show XP earned notification if leveled up or got new titles
        if (xpResult.leveledUp) {
          // Level up happened
        }
        if (xpResult.newTitles.length > 0) {
          // New titles unlocked
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
                // Calculate notes stats from game state
                const perfectNotes = Math.floor(playerResult.notesHit * 0.6); // Estimate
                const goodNotes = Math.floor(playerResult.notesHit * 0.4); // Estimate
                
                return leaderboardService.submitScore(
                  profile,
                  song,
                  playerResult.score,
                  10000, // maxScore baseline
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

  if (!results || !song) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <p className="text-white/60 mb-4">No results available</p>
        <Button onClick={onHome} className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white">Back to Home</Button>
      </div>
    );
  }

  const playerResult = results.players[0];
  const player2Result = results.players[1] || null;
  const isDuel = gameState.gameMode === 'duel' || gameState.gameMode === 'duet';
  const ratingColors: Record<string, string> = {
    perfect: 'from-yellow-400 to-orange-500',
    excellent: 'from-green-400 to-cyan-500',
    good: 'from-blue-400 to-purple-500',
    okay: 'from-gray-400 to-gray-500',
    poor: 'from-red-400 to-red-600',
  };

  // Get active profile for display
  const activeProfile = profiles.find(p => p.id === activeProfileId);
  const player2Profile = player2Result ? profiles.find(p => p.id === player2Result.playerId) : null;

  // Determine winner for duel/duet
  const winnerSide = isDuel && player2Result
    ? playerResult.score > player2Result.score ? 'p1' : playerResult.score < player2Result.score ? 'p2' : 'draw'
    : null;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
      {/* Song title */}
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold text-white">{song.title}</h2>
        <p className="text-white/60">{song.artist}</p>
      </div>

      {/* Rating header - Single Player */}
      {!isDuel && (
        <div className="text-center mb-8">
          <div className={`inline-block px-8 py-4 rounded-2xl bg-gradient-to-r ${ratingColors[playerResult.rating] || ratingColors.good} mb-4`}>
            <h1 className="text-4xl font-black text-white uppercase">{playerResult.rating}!</h1>
          </div>
        </div>
      )}

      {/* Rating header - Duel / Duet: show both players */}
      {isDuel && player2Result && (
        <div className="flex justify-center items-stretch gap-6 mb-8">
          {/* Player 1 rating card */}
          <div className={`flex-1 max-w-xs rounded-2xl p-6 text-center ${
            winnerSide === 'p1' ? 'ring-2 ring-yellow-400 shadow-lg shadow-yellow-400/20' : ''
          }`}>
            <div className={`inline-block px-6 py-3 rounded-xl bg-gradient-to-r ${ratingColors[playerResult.rating] || ratingColors.good} mb-3`}>
              <h2 className="text-2xl font-black text-white uppercase">{playerResult.rating}!</h2>
            </div>
            <div className="text-cyan-400 font-semibold text-lg">{activeProfile?.name || 'Player 1'}</div>
            <div className="text-3xl font-black text-white mt-2">{playerResult.score.toLocaleString()}</div>
            <div className="text-white/40 text-sm">{playerResult.accuracy.toFixed(1)}% accuracy</div>
            {winnerSide === 'p1' && <div className="mt-3 text-xl">🏆</div>}
          </div>

          {/* VS / Duet indicator */}
          <div className="flex flex-col items-center justify-center">
            <span className="text-4xl font-black text-white/30">{gameState.gameMode === 'duet' ? '🎤' : '⚔️'}</span>
            {winnerSide === 'draw' && <span className="mt-2 text-sm text-purple-400 font-bold">UNENTSCHIEDEN</span>}
          </div>

          {/* Player 2 rating card */}
          <div className={`flex-1 max-w-xs rounded-2xl p-6 text-center bg-white/5 border border-white/10 ${
            winnerSide === 'p2' ? 'ring-2 ring-yellow-400 shadow-lg shadow-yellow-400/20' : ''
          }`}>
            <div className={`inline-block px-6 py-3 rounded-xl bg-gradient-to-r ${ratingColors[player2Result.rating] || ratingColors.good} mb-3`}>
              <h2 className="text-2xl font-black text-white uppercase">{player2Result.rating}!</h2>
            </div>
            <div className="text-pink-400 font-semibold text-lg">{player2Profile?.name || song?.duetPlayerNames?.[1] || 'Player 2'}</div>
            <div className="text-3xl font-black text-white mt-2">{player2Result.score.toLocaleString()}</div>
            <div className="text-white/40 text-sm">{player2Result.accuracy.toFixed(1)}% accuracy</div>
            {winnerSide === 'p2' && <div className="mt-3 text-xl">🏆</div>}
          </div>
        </div>
      )}

      {/* Score Visualization with multiple modes */}
      <ScoreVisualization
        score={playerResult.score}
        maxScore={MAX_POINTS_PER_SONG}
        accuracy={playerResult.accuracy}
        notesHit={playerResult.notesHit}
        notesMissed={playerResult.notesMissed}
        maxCombo={playerResult.maxCombo}
        rating={playerResult.rating}
        player2Score={player2Result?.score}
        player2Accuracy={player2Result?.accuracy}
        player2NotesHit={player2Result?.notesHit}
        player2NotesMissed={player2Result?.notesMissed}
        player2MaxCombo={player2Result?.maxCombo}
        player2Rating={player2Result?.rating}
        isDuel={isDuel}
      />

      {/* Upload Status */}
      <UploadStatus
        onlineEnabled={onlineEnabled}
        uploadStatus={uploadStatus}
        uploadMessage={uploadMessage}
      />

      {/* Song Leaderboard Preview */}
      <SongLeaderboardPreview
        songHighscores={songHighscores}
        activeProfileId={activeProfileId}
        currentPlayerRank={currentPlayerRank}
        onViewAll={() => setShowHighscoreModal(true)}
      />

      {/* Share Section — only for single player (duel/duet doesn't make sense to share a single player stat) */}
      {!isDuel && (
        <ShareSection
          song={song}
          playerResult={{
            score: playerResult.score,
            accuracy: playerResult.accuracy,
            maxCombo: playerResult.maxCombo,
            notesHit: playerResult.notesHit,
            notesMissed: playerResult.notesMissed,
            rating: playerResult.rating,
          }}
          activeProfileId={activeProfileId}
          playerName={activeProfile?.name || 'Player'}
          playerAvatar={activeProfile?.avatar}
          playerColor={activeProfile?.color || '#FF6B6B'}
          difficulty={gameState.difficulty}
          gameMode={gameState.gameMode}
        />
      )}

      {/* Actions */}
      <div className="flex gap-4 justify-center">
        <Button 
          variant="outline"
          onClick={() => setShowHighscoreModal(true)}
          className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10 px-4"
        >
          <TrophyIcon className="w-4 h-4 mr-2" /> Scores
        </Button>
        {replayRecord && (
          <Button
            variant="outline"
            onClick={() => setShowReplay(true)}
            className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 px-4"
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
            Replay
          </Button>
        )}
        <Button onClick={() => { resetGame(); onPlayAgain(); }} className="bg-gradient-to-r from-cyan-500 to-purple-500 px-8">
          Play Again
        </Button>
        <Button variant="outline" onClick={() => { resetGame(); onHome(); }} className="border-white/20 text-white px-8">
          Back to Home
        </Button>
      </div>

      {/* Next Song from Queue - Companion Queue Integration */}
      <QueueNextSong
        nextQueueItem={nextQueueItem}
        onPlay={handlePlayFromQueue}
      />

      {/* Song Highscore Modal */}
      {song && (
        <SongHighscoreModal
          song={song}
          isOpen={showHighscoreModal}
          onClose={() => setShowHighscoreModal(false)}
        />
      )}

      {/* Replay Modal */}
      {replayRecord && (
        <ReplayModal
          isOpen={showReplay}
          onClose={() => setShowReplay(false)}
          replay={replayRecord}
          originalAudioUrl={song?.audioUrl}
        />
      )}
    </div>
  );
}
