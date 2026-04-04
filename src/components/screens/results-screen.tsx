'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { useGameStore } from '@/lib/game/store';
import { Player } from '@/types/game';
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

// ===================== RESULTS SCREEN =====================
export function ResultsScreen({ onPlayAgain, onHome }: { onPlayAgain: () => void; onHome: () => void }) {
  const { gameState, resetGame, addHighscore, profiles, activeProfileId, onlineEnabled, updateProfile, highscores, setSong, setGameMode, addPlayer } = useGameStore();
  const savedToHighscoreRef = useRef(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const [showHighscoreModal, setShowHighscoreModal] = useState(false);
  
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
    const { getAllSongsAsync } = await import('@/lib/game/song-library');
    const songs = await getAllSongsAsync();
    const fullSong = songs.find(s => s.id === nextQueueItem.songId);
    
    if (!fullSong) {
      alert('Song not found in library');
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
  const ratingColors: Record<string, string> = {
    perfect: 'from-yellow-400 to-orange-500',
    excellent: 'from-green-400 to-cyan-500',
    good: 'from-blue-400 to-purple-500',
    okay: 'from-gray-400 to-gray-500',
    poor: 'from-red-400 to-red-600',
  };

  // Get active profile for display
  const activeProfile = profiles.find(p => p.id === activeProfileId);

  // Create Player object for ScoreDisplay
  const playerForDisplay: Player = {
    id: 'current',
    name: activeProfile?.name || 'Player',
    score: playerResult.score,
    combo: 0,
    maxCombo: playerResult.maxCombo,
    accuracy: playerResult.accuracy,
    notesHit: playerResult.notesHit,
    notesMissed: playerResult.notesMissed,
    color: activeProfile?.color || '#FF6B6B',
    avatar: activeProfile?.avatar,
    notes: [],
    totalNotes: playerResult.notesHit + playerResult.notesMissed,
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
      <div className="text-center mb-8">
        <div className={`inline-block px-8 py-4 rounded-2xl bg-gradient-to-r ${ratingColors[playerResult.rating] || ratingColors.good} mb-4`}>
          <h1 className="text-4xl font-black text-white uppercase">{playerResult.rating}!</h1>
        </div>
        <h2 className="text-2xl font-bold text-white">{song.title}</h2>
        <p className="text-white/60">{song.artist}</p>
      </div>

      {/* Score Visualization with multiple modes */}
      <ScoreVisualization
        score={playerResult.score}
        maxScore={MAX_POINTS_PER_SONG}
        accuracy={playerResult.accuracy}
        notesHit={playerResult.notesHit}
        notesMissed={playerResult.notesMissed}
        maxCombo={playerResult.maxCombo}
        rating={playerResult.rating}
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

      {/* Share Section */}
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

      {/* Actions */}
      <div className="flex gap-4 justify-center">
        <Button 
          variant="outline"
          onClick={() => setShowHighscoreModal(true)}
          className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10 px-4"
        >
          <TrophyIcon className="w-4 h-4 mr-2" /> Scores
        </Button>
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
    </div>
  );
}
