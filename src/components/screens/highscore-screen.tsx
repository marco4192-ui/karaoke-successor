'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useGameStore } from '@/lib/game/store';
import { useTranslation } from '@/lib/i18n/translations';
import { TrophyIcon } from '@/components/icons';
import { HighscoreEntry, RANKING_TITLES, GameMode } from '@/types/game';

function getFlagEmoji(countryCode: string): string {
  const codePoints = countryCode.toUpperCase().split('').map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

function CountryFlag({ code, show }: { code: string | null | undefined; show: boolean }) {
  if (!code || !show) return null;
  return <span className="text-base ml-1" title={code}>{getFlagEmoji(code)}</span>;
}

function VerifiedBadge({ verified }: { verified: boolean }) {
  if (!verified) return null;
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] text-green-400 bg-green-500/15 border border-green-500/30 rounded-full px-1.5 py-0.5" title="Verified">
      ✓
    </span>
  );
}

interface ExtendedEntry extends HighscoreEntry {
  verified?: boolean;
  country_code?: string | null;
  show_country?: boolean;
  songs_played?: number;
  avg_accuracy?: number;
  best_score?: number;
}

export function HighscoreScreen() {
  const { t } = useTranslation();
  const { highscores, activeProfileId, onlineEnabled, leaderboardType, setLeaderboardType, profiles } = useGameStore();
  const [filter, setFilter] = useState<'all' | 'mine'>('all');
  const [globalLeaderboard, setGlobalLeaderboard] = useState<ExtendedEntry[]>([]);
  const [isLoadingGlobal, setIsLoadingGlobal] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const localProfileIds = useMemo(() => new Set(profiles.map(p => p.id)), [profiles]);

  useEffect(() => {
    if (onlineEnabled && leaderboardType === 'global') {
      setIsLoadingGlobal(true);
      setGlobalError(null);
      import('@/lib/api/leaderboard-service').then(({ leaderboardService }) => {
        leaderboardService.testConnection()
          .then(isConnected => {
            if (!isConnected) throw new Error('Cannot connect to leaderboard server.');
            return leaderboardService.getGlobalLeaderboard(100);
          })
          .then((players) => {
            const entries: ExtendedEntry[] = players.map((p) => ({
              id: `global-${p.profile_uid}`,
              playerId: p.profile_uid,
              playerName: p.display_name,
              playerAvatar: undefined,
              playerColor: p.color,
              songId: '',
              songTitle: '',
              artist: '',
              score: p.total_score,
              accuracy: p.avg_accuracy,
              maxCombo: 0,
              difficulty: 'medium',
              gameMode: 'standard' as GameMode,
              rating: 'good' as const,
              rankTitle: `${p.songs_played} songs`,
              playedAt: Date.now(),
              verified: true,
              country_code: p.country_code,

              songs_played: p.songs_played,
              avg_accuracy: p.avg_accuracy,
              best_score: p.best_score,
            }));
            setGlobalLeaderboard(entries);
          })
          .catch((err: Error) => {
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

  const retryGlobalLoad = useCallback(() => {
    setGlobalError(null);
    setLeaderboardType('global');
  }, [setLeaderboardType]);

  const filteredGlobal = useMemo(() => {
    if (!searchQuery.trim()) return globalLeaderboard;
    const q = searchQuery.toLowerCase();
    return globalLeaderboard.filter(entry => entry.playerName.toLowerCase().includes(q));
  }, [globalLeaderboard, searchQuery]);

  const displayHighscores = leaderboardType === 'global'
    ? filteredGlobal
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

      <div className="flex flex-wrap gap-2 mb-4">
        <Button onClick={() => setLeaderboardType('local')} className={leaderboardType === 'local' ? 'bg-cyan-500' : 'bg-white/10'}>
          {t('highscoreScreen.local')}
        </Button>
        {onlineEnabled && (
          <Button onClick={() => setLeaderboardType('global')} className={leaderboardType === 'global' ? 'bg-purple-500' : 'bg-white/10'}>
            {t('highscoreScreen.global')}
          </Button>
        )}
        {leaderboardType === 'local' && (
          <>
            <div className="w-px bg-white/20 mx-2" />
            <Button onClick={() => setFilter('all')} size="sm" className={filter === 'all' ? 'bg-white/20' : 'bg-white/5'}>
              {t('highscoreScreen.allScores')}
            </Button>
            <Button onClick={() => setFilter('mine')} size="sm" className={filter === 'mine' ? 'bg-white/20' : 'bg-white/5'} disabled={!activeProfileId}>
              {t('highscoreScreen.myScores')}
            </Button>
          </>
        )}
      </div>

      {leaderboardType === 'global' && onlineEnabled && (
        <div className="mb-4 relative">
          <Input ref={searchInputRef} type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t('highscoreScreen.searchPlaceholder')} className="bg-white/5 border-white/10 text-white pl-10" />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
              ✕
            </button>
          )}
        </div>
      )}

      {leaderboardType === 'local' && (
        <Card className="bg-white/5 border-white/10 mb-6">
          <CardHeader><CardTitle className="text-lg">{t('highscoreScreen.rankingTitles')}</CardTitle></CardHeader>
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

      {isLoadingGlobal && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mr-3" />
          <span className="text-white/60">{t('highscoreScreen.loadingGlobal')}</span>
        </div>
      )}

      {globalError && (
        <Card className="bg-red-500/10 border-red-500/30 mb-6">
          <CardContent className="py-4 text-center">
            <p className="text-red-400 mb-3">{globalError}</p>
            <div className="flex justify-center gap-2">
              <Button onClick={retryGlobalLoad} size="sm" className="bg-purple-500 hover:bg-purple-400">{t('highscoreScreen.retry')}</Button>
              <Button onClick={() => setLeaderboardType('local')} size="sm" className="bg-white/10">{t('highscoreScreen.switchToLocal')}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoadingGlobal && !globalError && leaderboardType === 'global' && searchQuery.trim() && filteredGlobal.length === 0 && (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="py-12 text-center">
            <p className="text-white/60">{t('highscoreScreen.searchNoResults').replace('{q}', searchQuery)}</p>
          </CardContent>
        </Card>
      )}

      {!isLoadingGlobal && !globalError && displayHighscores.length === 0 && !(leaderboardType === 'global' && searchQuery.trim()) && (
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
      )}

      {!isLoadingGlobal && !globalError && displayHighscores.length > 0 && (
        <div className="space-y-2">
          {displayHighscores.slice(0, 100).map((entry, index) => {
            const isLocalProfile = localProfileIds.has(entry.playerId);
            const ex = entry as ExtendedEntry;
            return (
              <Card key={entry.id} className={`bg-white/5 border-white/10 hover:bg-white/10 transition-colors ${index < 3 ? 'border-l-4' : ''} ${index === 0 ? 'border-l-yellow-400' : index === 1 ? 'border-l-gray-300' : index === 2 ? 'border-l-orange-400' : ''} ${isLocalProfile && leaderboardType === 'global' ? 'ring-1 ring-cyan-500/40 bg-cyan-500/5' : ''}`}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl ${index === 0 ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-black' : index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-black' : index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-black' : 'bg-white/10 text-white/60'}`}>
                    {index === 0 ? '\uD83D\uDC51' : index === 1 ? '\uD83E\uDD48' : index === 2 ? '\uD83E\uDD49' : `#${index + 1}`}
                  </div>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold overflow-hidden flex-shrink-0" style={{ backgroundColor: entry.playerColor }}>
                    {entry.playerAvatar ? (<img src={entry.playerAvatar} alt={entry.playerName} className="w-full h-full object-cover" />) : ((entry.playerName?.[0] || '?').toUpperCase())}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-semibold ${isLocalProfile && leaderboardType === 'global' ? 'text-cyan-300' : 'text-white'}`}>{entry.playerName}</span>
                      {isLocalProfile && leaderboardType === 'global' && (<Badge variant="outline" className="text-[10px] border-cyan-500/50 text-cyan-400">{t('highscoreScreen.localHighlight')}</Badge>)}
                      <CountryFlag code={ex.country_code} show={!!ex.country_code} />
                      <VerifiedBadge verified={!!ex.verified} />
                      {leaderboardType === 'local' && (<Badge variant="outline" className={`text-xs ${entry.difficulty === 'easy' ? 'border-green-500 text-green-400' : entry.difficulty === 'medium' ? 'border-yellow-500 text-yellow-400' : 'border-red-500 text-red-400'}`}>{entry.difficulty}</Badge>)}
                      {leaderboardType === 'global' && ex.songs_played && (<span className="text-xs text-white/40">{t('highscoreScreen.songsPlayed').replace('{n}', String(ex.songs_played))}</span>)}
                    </div>
                    {entry.songTitle && (<p className="text-sm text-white/60 truncate">{entry.songTitle} - {entry.artist}</p>)}
                    {leaderboardType === 'local' && entry.rankTitle && (<p className="text-xs text-white/40">{entry.rankTitle}</p>)}
                    {leaderboardType === 'global' && ex.avg_accuracy != null && (<p className="text-xs text-white/40">{t('highscoreScreen.avgAccuracy').replace('{n}', Number(ex.avg_accuracy).toFixed(1))}</p>)}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-2xl font-bold text-cyan-400">{entry.score.toLocaleString()}</div>
                    {leaderboardType === 'local' && (
                      <>
                        <div className="text-sm text-white/60">{t('highscoreScreen.accuracyLabel').replace('{n}', entry.accuracy.toFixed(1))}</div>
                        <div className="text-xs text-white/40">{t('highscoreScreen.maxComboLabel').replace('{n}', entry.maxCombo.toString())}</div>
                      </>
                    )}
                    {leaderboardType === 'global' && ex.best_score != null && (<div className="text-xs text-white/40">{t('highscoreScreen.bestScore').replace('{n}', Number(ex.best_score).toLocaleString())}</div>)}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
