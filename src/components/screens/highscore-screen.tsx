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
import { CountryFlagImage } from '@/components/screens/character/country-picker';
import type { LeaderboardWindow, LeaderboardSort } from '@/lib/leaderboard/types';
import type { RivalEntry } from '@/lib/leaderboard/rivals';
import { RivalCompareDialog } from './rival-compare-dialog';

/**
 * Leaderboard flag: rendered as a crisp flagcdn image (CountryFlagImage)
 * instead of an emoji — Windows has no flag glyphs in its fonts.
 * Keeps the title tooltip and the show/null-code handling intact.
 */
function CountryFlag({ code, show }: { code: string | null | undefined; show: boolean }) {
  if (!code || !show) return null;
  return (
    <span className="inline-flex items-center ml-1" title={code}>
      <CountryFlagImage code={code} className="h-3.5 w-5" />
    </span>
  );
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
  games_played?: number;
  avg_accuracy?: number;
  best_score?: number;
  br_wins?: number;
}

const WINDOWS: Array<{ id: LeaderboardWindow; key: string }> = [
  { id: 'all', key: 'highscoreScreen.windowAll' },
  { id: 'month', key: 'highscoreScreen.windowMonth' },
  { id: 'week', key: 'highscoreScreen.windowWeek' },
];

const SORTS: Array<{ id: LeaderboardSort; key: string }> = [
  { id: 'score', key: 'highscoreScreen.sortScore' },
  { id: 'best', key: 'highscoreScreen.sortBest' },
  { id: 'accuracy', key: 'highscoreScreen.sortAccuracy' },
  { id: 'plays', key: 'highscoreScreen.sortPlays' },
];

export function HighscoreScreen() {
  const { t } = useTranslation();
  const { highscores, activeProfileId, onlineEnabled, leaderboardType, setLeaderboardType, profiles } = useGameStore();
  const [filter, setFilter] = useState<'all' | 'mine'>('all');
  const [globalLeaderboard, setGlobalLeaderboard] = useState<ExtendedEntry[]>([]);
  const [isLoadingGlobal, setIsLoadingGlobal] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // R72/B: time window + alternative sort for the global board
  const [window, setWindow] = useState<LeaderboardWindow>('all');
  const [sort, setSort] = useState<LeaderboardSort>('score');
  // R72/C: total player count + own rank/percentile + local rivals
  const [totalPlayers, setTotalPlayers] = useState<number | null>(null);
  const [youInfo, setYouInfo] = useState<{ rank: number; total: number; percentile_top: number | null } | null>(null);
  const [rivals, setRivals] = useState<RivalEntry[]>([]);
  const [compareRival, setCompareRival] = useState<RivalEntry | null>(null);

  const localProfileIds = useMemo(() => new Set(profiles.map(p => p.id)), [profiles]);
  const activeProfile = useMemo(
    () => profiles.find(p => p.id === activeProfileId) ?? null,
    [profiles, activeProfileId],
  );
  const myUid = activeProfile ? (activeProfile.syncUid || activeProfile.id) : null;

  const refreshRivals = useCallback(() => {
    import('@/lib/leaderboard/rivals').then(({ getRivals }) => setRivals(getRivals()));
  }, []);

  useEffect(() => { refreshRivals(); }, [refreshRivals]);

  const toggleRival = useCallback((entry: ExtendedEntry) => {
    import('@/lib/leaderboard/rivals').then(({ isRival, addRival, removeRival }) => {
      if (isRival(entry.playerId)) {
        removeRival(entry.playerId);
      } else {
        addRival({ uid: entry.playerId, name: entry.playerName, color: entry.playerColor });
      }
      refreshRivals();
    });
  }, [refreshRivals]);

  useEffect(() => {
    if (onlineEnabled && leaderboardType === 'global') {
      setIsLoadingGlobal(true);
      setGlobalError(null);
      import('@/lib/api/leaderboard-service').then(({ leaderboardService }) => {
        leaderboardService.testConnection()
          .then(isConnected => {
            if (!isConnected) throw new Error('Cannot connect to leaderboard server.');
            // R72: full board — window, sort, own rank/percentile
            return leaderboardService.fetchGlobalBoard({
              window,
              sort,
              uid: myUid ?? undefined,
              limit: 100,
            });
          })
          .then((res) => {
            setTotalPlayers(res.total_players);
            setYouInfo(res.you);
            const entries: ExtendedEntry[] = res.leaderboard.map((p) => ({
              id: `global-${p.profile_uid}`,
              playerId: p.profile_uid,
              playerName: p.display_name,
              playerAvatar: undefined,
              playerColor: p.color,
              songId: '',
              songTitle: '',
              artist: '',
              // The sort metric is the headline number; the other stats
              // stay in the sub-lines (best/accuracy/songs).
              score: sort === 'best' ? p.best_score
                : sort === 'accuracy' ? Number(p.avg_accuracy)
                : sort === 'plays' ? p.songs_played
                : p.total_score,
              accuracy: p.avg_accuracy,
              maxCombo: 0,
              difficulty: 'medium',
              gameMode: 'standard' as GameMode,
              rating: 'good' as const,
              rankTitle: `${p.songs_played} songs`,
              playedAt: Date.now(),
              country_code: p.country_code,
              games_played: p.games_played,
              songs_played: p.songs_played,
              avg_accuracy: p.avg_accuracy,
              best_score: p.best_score,
              br_wins: p.br_wins,
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
  }, [onlineEnabled, leaderboardType, window, sort, myUid]);

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

  /** The headline number per sort (accuracy gets a % suffix). */
  const renderHeadline = (ex: ExtendedEntry) =>
    sort === 'accuracy'
      ? `${Number(ex.avg_accuracy ?? 0).toFixed(1)}%`
      : ex.score.toLocaleString();

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3" data-testid="highscore-title">
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
        <div className="mb-4 space-y-3">
          {/* R72/B: time window selector */}
          <div className="flex flex-wrap items-center gap-3" data-testid="global-window-sort">
            <div className="flex gap-1 bg-white/5 rounded-lg p-1 border border-white/10" role="group" aria-label={t('highscoreScreen.windowLabel')}>
              {WINDOWS.map(w => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setWindow(w.id)}
                  data-testid={`window-${w.id}`}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    window === w.id ? 'bg-purple-500 text-white' : 'text-white/60 hover:text-white'
                  }`}
                >
                  {t(w.key)}
                </button>
              ))}
            </div>
            {/* R72/B: alternative sort selector */}
            <div className="flex gap-1 bg-white/5 rounded-lg p-1 border border-white/10" role="group" aria-label={t('highscoreScreen.sortLabel')}>
              {SORTS.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSort(s.id)}
                  data-testid={`sort-${s.id}`}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    sort === s.id ? 'bg-cyan-500 text-white' : 'text-white/60 hover:text-white'
                  }`}
                >
                  {t(s.key)}
                </button>
              ))}
            </div>
            {totalPlayers != null && (
              <span className="text-xs text-white/40" data-testid="total-players">
                {t('highscoreScreen.totalPlayers').replace('{n}', totalPlayers.toLocaleString())}
              </span>
            )}
          </div>

          {/* R72/C: own rank + percentile banner */}
          {activeProfile && youInfo && (
            <div className="rounded-lg border border-cyan-500/25 bg-cyan-500/5 px-3 py-2 text-sm flex flex-wrap items-center gap-x-2 gap-y-1" data-testid="your-rank-banner">
              <span aria-hidden>🎯</span>
              <span className="text-cyan-300 font-semibold">
                {t('highscoreScreen.yourRank')
                  .replace('{rank}', String(youInfo.rank))
                  .replace('{total}', String(youInfo.total))}
              </span>
              {youInfo.percentile_top != null && (
                <Badge variant="outline" className="text-[10px] border-cyan-500/40 text-cyan-300">
                  {t('highscoreScreen.percentileTop').replace('{p}', String(youInfo.percentile_top))}
                </Badge>
              )}
            </div>
          )}
          {activeProfile && !youInfo && !isLoadingGlobal && totalPlayers != null && window !== 'all' && (
            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/50" data-testid="no-rounds-banner">
              {t('highscoreScreen.noRoundsInWindow')}
            </div>
          )}

          {/* R72/C: rival bar */}
          {rivals.length > 0 && (
            <div className="flex flex-wrap items-center gap-2" data-testid="rival-bar">
              <span className="text-xs text-white/40">⚔️ {t('rivals.title')}:</span>
              {rivals.map(r => (
                <span
                  key={r.uid}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 pl-1.5 pr-1 py-0.5 text-xs"
                >
                  <span
                    className="w-4 h-4 rounded-full inline-flex items-center justify-center text-[9px] font-bold text-white"
                    style={{ backgroundColor: r.color }}
                  >
                    {r.name?.[0]?.toUpperCase() || '?'}
                  </span>
                  <span className="max-w-24 truncate">{r.name}</span>
                  <button
                    type="button"
                    onClick={() => setCompareRival(r)}
                    className="text-cyan-400 hover:text-cyan-300 font-medium px-1"
                    title={t('rivals.compare').replace('{name}', r.name)}
                    data-testid={`rival-compare-btn-${r.uid.slice(0, 8)}`}
                  >
                    {t('rivals.compareButton')}
                  </button>
                  <button
                    type="button"
                    onClick={() => { import('@/lib/leaderboard/rivals').then(({ removeRival }) => { removeRival(r.uid); refreshRivals(); }); }}
                    className="text-white/30 hover:text-red-400 px-0.5"
                    title={t('rivals.remove')}
                    aria-label={t('rivals.remove')}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="relative">
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
                  <span className="truncate">{t(rank.titleKey)}</span>
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
            const isOwnEntry = leaderboardType === 'global' && entry.playerId === myUid;
            const rivalListed = leaderboardType === 'global' && rivals.some(r => r.uid === entry.playerId);
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
                      {leaderboardType === 'global' && ex.songs_played != null && (<span className="text-xs text-white/40">{t('highscoreScreen.songsPlayed').replace('{n}', String(ex.songs_played))}</span>)}
                      {leaderboardType === 'global' && !!ex.br_wins && ex.br_wins > 0 && (
                        <span className="text-xs text-amber-400/90" title={t('highscoreScreen.brWins')}>
                          ⚔️ {ex.br_wins}
                        </span>
                      )}
                    </div>
                    {entry.songTitle && (<p className="text-sm text-white/60 truncate">{entry.songTitle} - {entry.artist}</p>)}
                    {leaderboardType === 'local' && entry.rankTitle && (<p className="text-xs text-white/40">{entry.rankTitle}</p>)}
                    {leaderboardType === 'global' && ex.avg_accuracy != null && (<p className="text-xs text-white/40">{t('highscoreScreen.avgAccuracy').replace('{n}', Number(ex.avg_accuracy).toFixed(1))}</p>)}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-2xl font-bold text-cyan-400" data-testid="entry-headline">{renderHeadline(ex)}</div>
                    {leaderboardType === 'local' && (
                      <>
                        <div className="text-sm text-white/60">{t('highscoreScreen.accuracyLabel').replace('{n}', entry.accuracy.toFixed(1))}</div>
                        <div className="text-xs text-white/40">{t('highscoreScreen.maxComboLabel').replace('{n}', entry.maxCombo.toString())}</div>
                      </>
                    )}
                    {leaderboardType === 'global' && ex.best_score != null && sort !== 'best' && (<div className="text-xs text-white/40">{t('highscoreScreen.bestScore').replace('{n}', Number(ex.best_score).toLocaleString())}</div>)}
                    {leaderboardType === 'global' && ex.games_played != null && window !== 'all' && (
                      <div className="text-xs text-white/40">{t('highscoreScreen.roundsPlayed').replace('{n}', String(ex.games_played))}</div>
                    )}
                  </div>
                  {/* R72/C: rival toggle — never on own entries, never on the
                      local board (rivals are online profiles by uid). */}
                  {leaderboardType === 'global' && !isOwnEntry && (
                    <button
                      type="button"
                      onClick={() => toggleRival(entry)}
                      className={`shrink-0 rounded-full border px-2 py-1 text-[11px] transition-colors ${
                        rivalListed
                          ? 'border-amber-500/50 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25'
                          : 'border-white/15 text-white/40 hover:text-white/80 hover:border-white/30'
                      }`}
                      title={rivalListed ? t('rivals.remove') : t('rivals.add')}
                      aria-label={rivalListed ? t('rivals.remove') : t('rivals.add')}
                      data-testid={`rival-toggle-${entry.playerId.slice(0, 8)}`}
                    >
                      {rivalListed ? '⚔️✓' : '⚔️'}
                    </button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* R72/C: head-to-head comparison (client-side via /scores/batch) */}
      {compareRival && activeProfile && (
        <RivalCompareDialog
          rival={compareRival}
          profile={activeProfile}
          open
          onOpenChange={(open) => { if (!open) setCompareRival(null); }}
        />
      )}
    </div>
  );
}
