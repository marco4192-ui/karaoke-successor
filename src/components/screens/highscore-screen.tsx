'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGameStore } from '@/lib/game/store';
import { useTranslation } from '@/lib/i18n/translations';
import { TrophyIcon } from '@/components/icons';
import { HighscoreEntry, RANKING_TITLES } from '@/types/game';

export function HighscoreScreen() {
  const { t } = useTranslation();
  const { highscores, activeProfileId, onlineEnabled, leaderboardType, setLeaderboardType } = useGameStore();
  const [filter, setFilter] = useState<'all' | 'mine'>('all');
  const [globalLeaderboard, setGlobalLeaderboard] = useState<typeof highscores>([]);
  const [isLoadingGlobal, setIsLoadingGlobal] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

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
            return leaderboardService.getGlobalLeaderboard(50);
          })
          .then(players => {
            // Convert API players to highscore format
            const entries = players.map((p, _i): HighscoreEntry => ({
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
    <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <TrophyIcon className="w-8 h-8 text-yellow-400" />
          {t('highscoreScreen.title')}
        </h1>
        <p className="text-white/60">{t('highscoreScreen.description')}</p>
      </div>

      {/* Global/Local Toggle */}
      <div className="flex flex-wrap gap-2 mb-6">
        {/* Local Tab */}
        <Button 
          onClick={() => setLeaderboardType('local')}
          className={leaderboardType === 'local' ? 'bg-cyan-500' : 'bg-white/10'}
        >
          {t('highscoreScreen.local')}
        </Button>
        
        {/* Global Tab */}
        {onlineEnabled && (
          <Button 
            onClick={() => setLeaderboardType('global')}
            className={leaderboardType === 'global' ? 'bg-purple-500' : 'bg-white/10'}
          >
            {t('highscoreScreen.global')}
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
              {t('highscoreScreen.allScores')}
            </Button>
            <Button 
              onClick={() => setFilter('mine')}
              size="sm"
              className={filter === 'mine' ? 'bg-white/20' : 'bg-white/5'}
              disabled={!activeProfileId}
            >
              {t('highscoreScreen.myScores')}
            </Button>
          </>
        )}
      </div>

      {/* Ranking Legend - only for local */}
      {leaderboardType === 'local' && (
        <Card className="bg-white/5 border-white/10 mb-6">
          <CardHeader>
            <CardTitle className="text-lg">{t('highscoreScreen.rankingTitles')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2 text-sm">
              {RANKING_TITLES.slice(0, 10).map((rank) => (
                <div key={rank.minScore} className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                  <span>{rank.emoji}</span>
                  <span className="truncate">{t(`rankingTitles.${rank.minScore}`)}</span>
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
          <span className="text-white/60">{t('highscoreScreen.loadingGlobal')}</span>
        </div>
      )}

      {/* Error State */}
      {globalError && (
        <Card className="bg-red-500/10 border-red-500/30 mb-6">
          <CardContent className="py-4 text-center">
            <p className="text-red-400 mb-3">{globalError}</p>
            <div className="flex justify-center gap-2">
              <Button onClick={retryGlobalLoad} size="sm" className="bg-purple-500 hover:bg-purple-400">
                {t('highscoreScreen.retry')}
              </Button>
              <Button onClick={() => setLeaderboardType('local')} size="sm" className="bg-white/10">
                {t('highscoreScreen.switchToLocal')}
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
                ? t('highscoreScreen.noGlobal') 
                : filter === 'mine' 
                  ? t('highscoreScreen.noMine')
                  : t('highscoreScreen.noAll')}
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
                      (entry.playerName?.[0] || '?').toUpperCase()
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
                        <div className="text-sm text-white/60">{t('highscoreScreen.accuracyLabel').replace('{n}', entry.accuracy.toFixed(1))}</div>
                        <div className="text-xs text-white/40">{t('highscoreScreen.maxComboLabel').replace('{n}', entry.maxCombo.toString())}</div>
                      </>
                    )}
                    {leaderboardType === 'global' && (
                      <div className="text-xs text-white/40">{t('highscoreScreen.totalPoints')}</div>
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
