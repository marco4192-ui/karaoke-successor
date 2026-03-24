'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGameStore } from '@/lib/game/store';
import { TrophyIcon } from '@/components/icons';
import { HighscoreEntry, RANKING_TITLES } from '@/types/game';

export function HighscoreScreen() {
  const { highscores, profiles, activeProfileId, onlineEnabled, leaderboardType, setLeaderboardType } = useGameStore();
  const [filter, setFilter] = useState<'all' | 'mine'>('all');
  const [globalLeaderboard, setGlobalLeaderboard] = useState<typeof highscores>([]);
  const [isLoadingGlobal, setIsLoadingGlobal] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'failed'>('unknown');

  // Test API connection
  const testConnection = useCallback(async () => {
    try {
      const { leaderboardService } = await import('@/lib/api/leaderboard-service');
      const isConnected = await leaderboardService.testConnection();
      setConnectionStatus(isConnected ? 'connected' : 'failed');
      return isConnected;
    } catch {
      setConnectionStatus('failed');
      return false;
    }
  }, []);

  // Load global leaderboard when switched to global tab
  useEffect(() => {
    if (onlineEnabled && leaderboardType === 'global') {
      setIsLoadingGlobal(true);
      setGlobalError(null);
      
      import('@/lib/api/leaderboard-service').then(({ leaderboardService }) => {
        // First test connection
        leaderboardService.testConnection()
          .then(isConnected => {
            if (!isConnected) {
              throw new Error('Cannot connect to leaderboard server. Please check your internet connection.');
            }
            setConnectionStatus('connected');
            return leaderboardService.getGlobalLeaderboard(50);
          })
          .then(players => {
            // Convert API players to highscore format
            const entries = players.map((p, i): HighscoreEntry => ({
              id: `global-${p.id}`,
              playerId: p.id,
              playerName: p.name,
              playerAvatar: p.avatar,
              playerColor: '#FF6B6B',
              songId: '',
              songTitle: '',
              artist: '',
              score: p.total_score,
              accuracy: 0,
              maxCombo: 0,
              difficulty: 'medium',
              gameMode: 'standard',
              rating: 'good',
              rankTitle: `${p.games_played} games`,
              playedAt: Date.now(),
            }));
            setGlobalLeaderboard(entries);
          })
          .catch(err => {
            setConnectionStatus('failed');
            const errorMsg = err.message || 'Failed to load global leaderboard';
            if (errorMsg.includes('HTTP 500') || errorMsg.includes('500')) {
              setGlobalError('Server error (HTTP 500). The leaderboard service is temporarily unavailable. Please try again later.');
            } else if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError')) {
              setGlobalError('Network error. Please check your internet connection.');
            } else {
              setGlobalError(errorMsg);
            }
          })
          .finally(() => setIsLoadingGlobal(false));
      });
    }
  }, [onlineEnabled, leaderboardType]);

  // Retry loading global leaderboard
  const retryGlobalLoad = useCallback(() => {
    setGlobalError(null);
    setLeaderboardType('global');
  }, [setLeaderboardType]);

  const displayHighscores = leaderboardType === 'global' 
    ? globalLeaderboard 
    : (filter === 'mine' 
      ? highscores.filter(h => h.playerId === activeProfileId)
      : highscores);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <TrophyIcon className="w-8 h-8 text-yellow-400" />
          Highscore Leaderboard
        </h1>
        <p className="text-white/60">Top singers and their legendary performances!</p>
      </div>

      {/* Global/Local Toggle */}
      <div className="flex flex-wrap gap-2 mb-6">
        {/* Local Tab */}
        <Button 
          onClick={() => setLeaderboardType('local')}
          className={leaderboardType === 'local' ? 'bg-cyan-500' : 'bg-white/10'}
        >
          🏠 Local
        </Button>
        
        {/* Global Tab */}
        {onlineEnabled && (
          <Button 
            onClick={() => setLeaderboardType('global')}
            className={leaderboardType === 'global' ? 'bg-purple-500' : 'bg-white/10'}
          >
            🌍 Global
          </Button>
        )}

        {leaderboardType === 'local' && (
          <>
            <div className="w-px bg-white/20 mx-2" />
            <Button 
              onClick={() => setFilter('all')}
              size="sm"
              className={filter === 'all' ? 'bg-white/20' : 'bg-white/5'}
            >
              All Scores
            </Button>
            <Button 
              onClick={() => setFilter('mine')}
              size="sm"
              className={filter === 'mine' ? 'bg-white/20' : 'bg-white/5'}
              disabled={!activeProfileId}
            >
              My Scores
            </Button>
          </>
        )}
      </div>

      {/* Ranking Legend - only for local */}
      {leaderboardType === 'local' && (
        <Card className="bg-white/5 border-white/10 mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Ranking Titles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2 text-sm">
              {RANKING_TITLES.slice(0, 10).map((rank) => (
                <div key={rank.minScore} className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                  <span>{rank.emoji}</span>
                  <span className="truncate">{rank.title.split(' ').slice(1).join(' ')}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoadingGlobal && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mr-3" />
          <span className="text-white/60">Loading global leaderboard...</span>
        </div>
      )}

      {/* Error State */}
      {globalError && (
        <Card className="bg-red-500/10 border-red-500/30 mb-6">
          <CardContent className="py-4 text-center">
            <p className="text-red-400 mb-3">{globalError}</p>
            <div className="flex justify-center gap-2">
              <Button onClick={retryGlobalLoad} size="sm" className="bg-purple-500 hover:bg-purple-400">
                🔄 Retry
              </Button>
              <Button onClick={() => setLeaderboardType('local')} size="sm" className="bg-white/10">
                Switch to Local
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Highscore List */}
      {!isLoadingGlobal && !globalError && displayHighscores.length === 0 ? (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="py-12 text-center">
            <TrophyIcon className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p className="text-white/60">
              {leaderboardType === 'global' 
                ? "No global scores yet. Be the first to upload!" 
                : filter === 'mine' 
                  ? "You haven't set any scores yet!" 
                  : "No highscores yet. Be the first to sing!"}
            </p>
          </CardContent>
        </Card>
      ) : (
        !isLoadingGlobal && !globalError && (
          <div className="space-y-2">
            {displayHighscores.slice(0, 50).map((entry, index) => (
              <Card 
                key={entry.id}
                className={`bg-white/5 border-white/10 hover:bg-white/10 transition-colors ${
                  index < 3 ? 'border-l-4' : ''
                } ${
                  index === 0 ? 'border-l-yellow-400' :
                  index === 1 ? 'border-l-gray-300' :
                  index === 2 ? 'border-l-orange-400' : ''
                }`}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  {/* Rank */}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl ${
                    index === 0 ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-black' :
                    index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-black' :
                    index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-black' :
                    'bg-white/10 text-white/60'
                  }`}>
                    {index === 0 ? '👑' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                  </div>

                  {/* Player Info */}
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold overflow-hidden"
                    style={{ backgroundColor: entry.playerColor }}
                  >
                    {entry.playerAvatar ? (
                      <img src={entry.playerAvatar} alt={entry.playerName} className="w-full h-full object-cover" />
                    ) : (
                      entry.playerName[0].toUpperCase()
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{entry.playerName}</span>
                      {leaderboardType === 'local' && (
                        <Badge variant="outline" className={`text-xs ${
                          entry.difficulty === 'easy' ? 'border-green-500 text-green-400' :
                          entry.difficulty === 'medium' ? 'border-yellow-500 text-yellow-400' :
                          'border-red-500 text-red-400'
                        }`}>
                          {entry.difficulty}
                        </Badge>
                      )}
                      {leaderboardType === 'global' && entry.playerAvatar === undefined && (
                        <span className="text-xs text-white/40">({entry.rankTitle})</span>
                      )}
                    </div>
                    {entry.songTitle && (
                      <p className="text-sm text-white/60 truncate">{entry.songTitle} - {entry.artist}</p>
                    )}
                    {leaderboardType === 'local' && entry.rankTitle && (
                      <p className="text-xs text-white/40">{entry.rankTitle}</p>
                    )}
                  </div>

                  {/* Score */}
                  <div className="text-right">
                    <div className="text-2xl font-bold text-cyan-400">{entry.score.toLocaleString()}</div>
                    {leaderboardType === 'local' && (
                      <>
                        <div className="text-sm text-white/60">{entry.accuracy.toFixed(1)}% accuracy</div>
                        <div className="text-xs text-white/40">{entry.maxCombo}x max combo</div>
                      </>
                    )}
                    {leaderboardType === 'global' && (
                      <div className="text-xs text-white/40">total points</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  );
}
