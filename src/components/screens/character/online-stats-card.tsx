'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/lib/i18n/translations';
import type { PlayerProfile, Song } from '@/types/game';
import type { OnlinePlayEntry } from '@/lib/leaderboard/types';

/** Everything the card shows — fetched lazily on first expand. */
interface OnlineStats {
  crowns: number;
  crownSongs: Song[]; // local songs behind the crown hashes (up to 3)
  totalScore: number;
  rank: number | null;
  total: number;
  percentileTop: number | null;
  plays: OnlinePlayEntry[];
  playTitles: Map<string, Song>;
}

/**
 * R72/C+D: online statistics for one profile — song crowns ("#1 bei N
 * Songs"), Battle-Royale wins, world-wide percentile and the most recent
 * online rounds. Purely read-only public data (crowns, boards, play log);
 * nothing here needs the sync_code.
 */
export function OnlineStatsCard({ profile, onlineEnabled }: { profile: PlayerProfile; onlineEnabled: boolean }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState<OnlineStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uid = profile.syncUid || profile.id;

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { leaderboardService } = await import('@/lib/api/leaderboard-service');
      const { mapHashesToSongs } = await import('@/lib/leaderboard/hash-song-map');
      const [crownsRes, publicProfile, boardRes, plays] = await Promise.all([
        leaderboardService.fetchCrowns(uid).catch(() => null),
        leaderboardService.fetchPublicProfile(uid).catch(() => null),
        leaderboardService.fetchGlobalBoard({ window: 'all', sort: 'score', uid, limit: 1 }).catch(() => null),
        leaderboardService.fetchRecentPlays(uid, 10).catch(() => [] as OnlinePlayEntry[]),
      ]);
      const playHashes = plays.map(p => p.song_hash);
      const crownHashes = (crownsRes?.songs ?? []).map(s => s.song_hash);
      const [playSongs, crownSongsMap] = await Promise.all([
        mapHashesToSongs(playHashes),
        mapHashesToSongs(crownHashes),
      ]);
      const crownSongs = (crownsRes?.songs ?? [])
        .map(s => crownSongsMap.get(s.song_hash))
        .filter((s): s is Song => !!s)
        .slice(0, 3);
      setStats({
        crowns: crownsRes?.crowns ?? 0,
        crownSongs,
        // Points come from the public profile (always present for
        // the player themselves — not just when ranked in the Top N).
        totalScore: publicProfile?.total_score ?? 0,
        rank: boardRes?.you?.rank ?? null,
        total: boardRes?.total_players ?? 0,
        percentileTop: boardRes?.you?.percentile_top ?? null,
        plays,
        playTitles: playSongs,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    if (open && !stats && !isLoading) void load();
  }, [open, stats, isLoading, load]);

  // Not registered online (or online disabled) → nothing to show at all.
  if (!onlineEnabled || !profile.syncCode) return null;

  const formatDate = (iso: string) => {
    const d = new Date(iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z');
    if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
    return new Intl.DateTimeFormat(undefined, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(d);
  };

  return (
    <Card className="bg-white/5 border-white/10" data-testid="online-stats-card">
      <CardHeader className="pb-3">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex w-full items-center justify-between text-left"
          aria-expanded={open}
        >
          <CardTitle className="text-base flex items-center gap-2">
            📡 {t('onlineStats.title')}
            {stats && !open && (
              <span className="text-xs font-normal text-white/40">
                👑 {stats.crowns}
              </span>
            )}
          </CardTitle>
          <span className="text-white/40 text-sm">{open ? '▲' : '▼'}</span>
        </button>
      </CardHeader>

      {open && (
        <CardContent className="space-y-4">
          {isLoading && (
            <div className="flex items-center justify-center gap-3 py-6">
              <div className="animate-spin w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full" />
              <span className="text-sm text-white/50">{t('onlineStats.loading')}</span>
            </div>
          )}

          {error && (
            <div className="text-center py-4">
              <p className="text-sm text-amber-400/90 mb-2">{t('onlineStats.unavailable')}</p>
              <p className="text-xs text-white/40 mb-3">{error}</p>
              <button type="button" onClick={() => void load()} className="text-xs text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                {t('highscoreScreen.retry')}
              </button>
            </div>
          )}

          {!isLoading && !error && stats && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {/* Crowns */}
                <div className="rounded-lg border border-yellow-500/25 bg-yellow-500/5 p-3 text-center" data-testid="stat-crowns">
                  <p className="text-2xl font-bold text-yellow-400">👑 {stats.crowns}</p>
                  <p className="text-[11px] text-white/50 mt-0.5">{t('onlineStats.crowns')}</p>
                </div>
                {/* (R81) BR-wins tile removed — the BR online counter flew out
                    of the score system together with POST /br. */}
                {/* Percentile */}
                <div className="rounded-lg border border-cyan-500/25 bg-cyan-500/5 p-3 text-center" data-testid="stat-percentile">
                  <p className="text-xl font-bold text-cyan-300">
                    {stats.percentileTop != null ? t('onlineStats.topPercent').replace('{p}', String(stats.percentileTop)) : '—'}
                  </p>
                  <p className="text-[11px] text-white/50 mt-0.5">
                    {stats.rank != null
                      ? t('onlineStats.rankOf').replace('{rank}', String(stats.rank)).replace('{total}', String(stats.total))
                      : t('onlineStats.notRanked')}
                  </p>
                </div>
                {/* Online points */}
                <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-center" data-testid="stat-points">
                  <p className="text-xl font-bold text-white/80">{stats.totalScore.toLocaleString()}</p>
                  <p className="text-[11px] text-white/50 mt-0.5">{t('onlineStats.points')}</p>
                </div>
              </div>

              {stats.crownSongs.length > 0 && (
                <p className="text-xs text-white/40" data-testid="crown-songs">
                  👑 {t('onlineStats.crownExample')}: {stats.crownSongs.map(s => s.title).join(' · ')}
                  {stats.crowns > stats.crownSongs.length ? ` +${stats.crowns - stats.crownSongs.length}` : ''}
                </p>
              )}

              {/* Recent online rounds */}
              <div>
                <p className="text-xs uppercase tracking-wider text-white/30 mb-2">{t('onlineStats.recentPlays')}</p>
                {stats.plays.length === 0 ? (
                  <p className="text-xs text-white/40">{t('onlineStats.noPlays')}</p>
                ) : (
                  <div className="space-y-1 max-h-64 overflow-y-auto kz-scroll pr-1" data-testid="recent-plays-list">
                    {stats.plays.map((play, i) => {
                      const song = stats.playTitles.get(play.song_hash);
                      return (
                        <div key={`${play.song_hash}-${i}`} className="flex items-center gap-2 rounded-lg bg-white/5 px-2.5 py-1.5 text-xs">
                          <span className={`w-10 shrink-0 text-center ${play.game_type === 'd' ? 'text-purple-300' : 'text-cyan-400'}`}>
                            {play.game_type === 'd' ? '🎵🤝' : '🎤'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-white/80">{song ? `${song.title} — ${song.artist}` : t('onlineStats.unknownSong')}</p>
                            <p className="text-[10px] text-white/35">
                              {formatDate(play.created_at)} · {play.difficulty}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-bold text-cyan-400">{play.score.toLocaleString()}</p>
                            <p className="text-[10px] text-white/35">{Number(play.accuracy).toFixed(1)}%</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}
