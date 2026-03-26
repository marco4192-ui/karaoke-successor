'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGameStore } from '@/lib/game/store';
import { Song, Player } from '@/types/game';
import { getExtendedStats, updateStatsAfterGame, saveExtendedStats, calculateSongXP, getLevelForXP } from '@/lib/game/player-progression';
import { createShareableCard, downloadScoreCard, shareScoreCard } from '@/lib/game/share-results';
import { ScoreCard } from '@/components/social/score-card';
import { ShortsCreator } from '@/components/social/shorts-creator';
import { TrophyIcon } from '@/components/icons';
import { SongHighscoreModal, ScoreVisualization } from '@/components/results';

// Constants
const MAX_POINTS_PER_SONG = 10000;

// Country options for flag display
const COUNTRY_OPTIONS: { code: string; name: string; flag: string }[] = [
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'CN', name: 'China', flag: '🇨🇳' },
  { code: 'RU', name: 'Russia', flag: '🇷🇺' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'TW', name: 'Taiwan', flag: '🇹🇼' },
  { code: 'HK', name: 'Hong Kong', flag: '🇭🇰' },
  { code: 'AE', name: 'UAE', flag: '🇦🇪' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬' },
  { code: 'IL', name: 'Israel', flag: '🇮🇱' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷' },
  { code: 'GR', name: 'Greece', flag: '🇬🇷' },
  { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿' },
  { code: 'HU', name: 'Hungary', flag: '🇭🇺' },
  { code: 'RO', name: 'Romania', flag: '🇷🇴' },
  { code: 'UA', name: 'Ukraine', flag: '🇺🇦' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮' },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪' },
];

// Country flag helper
export function getCountryFlag(code?: string): string {
  if (!code) return '';
  return COUNTRY_OPTIONS.find(c => c.code === code)?.flag || '';
}

// ===================== RESULTS SCREEN =====================
export function ResultsScreen({ onPlayAgain, onHome }: { onPlayAgain: () => void; onHome: () => void }) {
  const { gameState, resetGame, addHighscore, profiles, activeProfileId, onlineEnabled, updateProfile, highscores } = useGameStore();
  const savedToHighscoreRef = useRef(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const [showHighscoreModal, setShowHighscoreModal] = useState(false);
  const results = gameState.results;
  const song = gameState.currentSong;

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
    starPower: 0,
    isStarPowerActive: false,
    notes: [],
    totalNotes: playerResult.notesHit + playerResult.notesMissed,
  };

  return (
    <div className="max-w-4xl mx-auto">
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
      {onlineEnabled && uploadStatus !== 'idle' && (
        <Card className={`mb-8 ${
          uploadStatus === 'uploading' ? 'bg-blue-500/10 border-blue-500/30' :
          uploadStatus === 'success' ? 'bg-green-500/10 border-green-500/30' :
          'bg-red-500/10 border-red-500/30'
        }`}>
          <CardContent className="py-4 flex items-center justify-center gap-3">
            {uploadStatus === 'uploading' && (
              <>
                <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />
                <span className="text-blue-400">Uploading to global leaderboard...</span>
              </>
            )}
            {uploadStatus === 'success' && (
              <span className="text-green-400">{uploadMessage}</span>
            )}
            {uploadStatus === 'error' && (
              <span className="text-red-400">⚠️ {uploadMessage}</span>
            )}
          </CardContent>
        </Card>
      )}

      {/* Song Highscores Preview */}
      {songHighscores.length > 0 && (
        <Card className="bg-white/5 border-white/10 mb-8">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrophyIcon className="w-5 h-5 text-yellow-400" />
                Song Leaderboard
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHighscoreModal(true)}
                className="text-purple-400 hover:text-purple-300"
              >
                View All →
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {songHighscores.slice(0, 3).map((entry, index) => (
                <div 
                  key={entry.id}
                  className={`flex items-center gap-3 p-2 rounded-lg ${
                    entry.playerId === activeProfileId ? 'bg-cyan-500/20' : 'bg-white/5'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    index === 0 ? 'bg-yellow-500 text-black' :
                    index === 1 ? 'bg-gray-300 text-black' :
                    index === 2 ? 'bg-orange-500 text-black' :
                    'bg-white/10'
                  }`}>
                    {index + 1}
                  </div>
                  <span className="flex-1 text-sm truncate">{entry.playerName}</span>
                  <span className="text-sm font-bold text-cyan-400">{entry.score.toLocaleString()}</span>
                  {entry.playerId === activeProfileId && currentPlayerRank && (
                    <Badge className="bg-cyan-500/30 text-cyan-300 text-xs">You #{currentPlayerRank}</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Share Section */}
      <Card className="bg-white/5 border-white/10 mb-8">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            📤 Share Your Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="card" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="card">📸 Score Card</TabsTrigger>
              <TabsTrigger value="video">🎬 Video Short</TabsTrigger>
            </TabsList>
            
            <TabsContent value="card">
              {song && playerResult && (
                <ScoreCard
                  song={song}
                  score={{
                    id: 'current',
                    playerId: activeProfileId || '',
                    playerName: profiles.find(p => p.id === activeProfileId)?.name || 'Player',
                    playerAvatar: profiles.find(p => p.id === activeProfileId)?.avatar,
                    playerColor: profiles.find(p => p.id === activeProfileId)?.color || '#FF6B6B',
                    songId: song.id,
                    songTitle: song.title,
                    artist: song.artist,
                    score: playerResult.score,
                    accuracy: playerResult.accuracy,
                    maxCombo: playerResult.maxCombo,
                    difficulty: gameState.difficulty,
                    gameMode: gameState.gameMode,
                    rating: playerResult.rating,
                    rankTitle: '',
                    playedAt: Date.now(),
                  }}
                  playerName={profiles.find(p => p.id === activeProfileId)?.name || 'Player'}
                  playerAvatar={profiles.find(p => p.id === activeProfileId)?.avatar}
                />
              )}
            </TabsContent>
            
            <TabsContent value="video">
              {song && playerResult && (
                <ShortsCreator
                  song={song}
                  score={{
                    id: 'current',
                    playerId: activeProfileId || '',
                    playerName: profiles.find(p => p.id === activeProfileId)?.name || 'Player',
                    playerColor: profiles.find(p => p.id === activeProfileId)?.color || '#FF6B6B',
                    songId: song.id,
                    songTitle: song.title,
                    artist: song.artist,
                    score: playerResult.score,
                    accuracy: playerResult.accuracy,
                    maxCombo: playerResult.maxCombo,
                    difficulty: gameState.difficulty,
                    gameMode: gameState.gameMode,
                    rating: playerResult.rating,
                    rankTitle: '',
                    playedAt: Date.now(),
                  }}
                  audioUrl={song.audioUrl}
                />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Share Buttons */}
      <div className="flex gap-2 justify-center mb-4">
        <Button
          variant="outline"
          onClick={() => {
            if (playerResult && song) {
              const card = createShareableCard({
                id: '',
                playerId: '',
                playerName: profiles.find(p => p.id === activeProfileId)?.name || 'Player',
                playerAvatar: profiles.find(p => p.id === activeProfileId)?.avatar,
                playerColor: profiles.find(p => p.id === activeProfileId)?.color || '#FF6B6B',
                songId: song.id,
                songTitle: song.title,
                artist: song.artist,
                score: playerResult.score,
                accuracy: playerResult.accuracy,
                maxCombo: playerResult.maxCombo,
                difficulty: gameState.difficulty,
                gameMode: gameState.gameMode,
                rating: playerResult.rating,
                rankTitle: '',
                playedAt: Date.now(),
              });
              downloadScoreCard(card);
            }
          }}
          className="border-purple-500/50 text-purple-400"
        >
          📥 Download Card
        </Button>
        <Button
          variant="outline"
          onClick={async () => {
            if (playerResult && song) {
              const card = createShareableCard({
                id: '',
                playerId: '',
                playerName: profiles.find(p => p.id === activeProfileId)?.name || 'Player',
                playerAvatar: profiles.find(p => p.id === activeProfileId)?.avatar,
                playerColor: profiles.find(p => p.id === activeProfileId)?.color || '#FF6B6B',
                songId: song.id,
                songTitle: song.title,
                artist: song.artist,
                score: playerResult.score,
                accuracy: playerResult.accuracy,
                maxCombo: playerResult.maxCombo,
                difficulty: gameState.difficulty,
                gameMode: gameState.gameMode,
                rating: playerResult.rating,
                rankTitle: '',
                playedAt: Date.now(),
              });
              const success = await shareScoreCard(card);
              if (!success) {
                alert('Sharing not supported. Card downloaded instead.');
                downloadScoreCard(card);
              }
            }
          }}
          className="border-cyan-500/50 text-cyan-400"
        >
          📤 Share Score
        </Button>
      </div>

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
