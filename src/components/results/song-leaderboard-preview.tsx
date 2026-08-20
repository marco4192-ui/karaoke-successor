'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HighscoreEntry, Song } from '@/types/game';
import { TrophyIcon } from './constants';
import { useTranslation } from '@/lib/i18n/translations';
import { useGameStore } from '@/lib/game/store';
import type { OnlineScoreEntry } from '@/lib/leaderboard/types';

// ── Compute song hash for a song ──
function computeSongHash(song: Song): Promise<string | null> {
  return import('@/lib/leaderboard/song-fingerprint').then(({ generateSongHash }) => {
    try {
      const rawNotes: { type: string; startBeat: number; duration: number; pitch: number; lyric: string }[] = [];
      const lyrics = song.lyrics || [];
      for (const line of lyrics) {
        const lineNotes = line.notes || [];
        for (const n of lineNotes) {
          rawNotes.push({
            type: n.isGolden ? '*' : n.isBonus ? 'F' : ':',
            startBeat: Math.round(n.startTime / (60000 / (song.bpm * 4 || 120))),
            duration: Math.round(n.duration / (60000 / (song.bpm * 4 || 120))),
            pitch: n.pitch - 48,
            lyric: '',
          });
        }
      }
      return generateSongHash({ artist: song.artist, title: song.title, gameType: 's', notes: rawNotes });
    } catch {
      return null;
    }
  });
}

// ── Mini rank badge ──
function MiniRank({ index }: { index: number }) {
  if (index === 0) return <span className="text-sm">👑</span>;
  if (index === 1) return <span className="text-sm">🥈</span>;
  if (index === 2) return <span className="text-sm">🥉</span>;
  return <span className="text-xs text-white/40 w-5 text-center">#{index + 1}</span>;
}

// ── Country Flag Helper ──
function CountryFlag({ code, show }: { code: string | null | undefined; show: boolean }) {
  if (!code || !show) return null;
  const codePoints = code.toUpperCase().split('').map(char => 127397 + char.charCodeAt(0));
  return <span className="text-xs ml-1" title={code}>{String.fromCodePoint(...codePoints)}</span>;
}

interface SongLeaderboardPreviewProps {
  songHighscores: HighscoreEntry[];
  song?: Song;
  activeProfileId: string | null;
  currentPlayerRank: number | null;
  onViewAll: () => void;
}

export function SongLeaderboardPreview({ songHighscores, song, activeProfileId, currentPlayerRank, onViewAll }: SongLeaderboardPreviewProps) {
  const { t } = useTranslation();
  const { onlineEnabled, profiles } = useGameStore();
  const [globalTop3, setGlobalTop3] = useState<OnlineScoreEntry[]>([]);
  const [isLoadingGlobal, setIsLoadingGlobal] = useState(false);
  const hasFetched = useRef(false);

  const localProfileIds = useMemo(() => new Set(profiles.map(p => p.id)), [profiles]);

  const localTop3 = useMemo(
    () => songHighscores.sort((a, b) => b.score - a.score).slice(0, 3),
    [songHighscores]
  );

  // Fetch global top 3 when song hash is available
  const fetchGlobal = useCallback(() => {
    if (!onlineEnabled || !song || hasFetched.current) return;
    hasFetched.current = true;
    setIsLoadingGlobal(true);
    computeSongHash(song).then(hash => {
      if (!hash) { setIsLoadingGlobal(false); return; }
      return import('@/lib/api/leaderboard-service').then(({ leaderboardService }) =>
        leaderboardService.getSongLeaderboard(hash, 's', 3)
      );
    }).then(scores => {
      if (scores) setGlobalTop3(scores);
    }).catch(() => {/* silent */})
      .finally(() => setIsLoadingGlobal(false));
  }, [song, onlineEnabled]);

  useEffect(() => { fetchGlobal(); }, [fetchGlobal]);

  const hasAnyScores = localTop3.length > 0 || globalTop3.length > 0;
  if (!hasAnyScores && !isLoadingGlobal) return null;

  return (
    <Card className="bg-white/5 border-white/10 mb-8">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrophyIcon className="w-5 h-5 text-yellow-400" />
            {t('songLeaderboardPreview.title')}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewAll}
            className="text-purple-400 hover:text-purple-300"
          >
            {t('songLeaderboardPreview.viewAll')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Worldwide Top 3 */}
          {onlineEnabled && globalTop3.length > 0 && (
            <div>
              <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1">{t('songLeaderboardPreview.worldwide')}</div>
              <div className="space-y-1">
                {globalTop3.map((entry, i) => {
                  const isLocal = localProfileIds.has(entry.profile_uid);
                  return (
                    <div key={`g-${entry.profile_uid}`} className={`flex items-center gap-3 p-2 rounded-lg ${isLocal ? 'bg-cyan-500/10 ring-1 ring-cyan-500/30' : 'bg-white/5'}`}>
                      <MiniRank index={i} />
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs text-white font-bold overflow-hidden flex-shrink-0"
                        style={{ backgroundColor: entry.color }}
                      >
                        {entry.display_name?.[0] || '?'}
                      </div>
                      <span className={`flex-1 text-sm truncate ${isLocal ? 'text-cyan-300' : ''}`}>{entry.display_name || 'Unknown'}</span>
                      <CountryFlag code={entry.country_code} show={!!entry.country_code} />
                      <span className="text-sm font-bold text-cyan-400">{entry.score.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {isLoadingGlobal && (
            <div className="flex items-center gap-2 py-1">
              <div className="animate-spin w-3 h-3 border-2 border-purple-500 border-t-transparent rounded-full" />
              <span className="text-xs text-white/40">{t('songLeaderboardPreview.loading')}</span>
            </div>
          )}

          {/* Local Top 3 */}
          {localTop3.length > 0 && (
            <div>
              <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1">{t('songLeaderboardPreview.local')}</div>
              <div className="space-y-1">
                {localTop3.map((entry, index) => (
                  <div
                    key={entry.id}
                    className={`flex items-center gap-3 p-2 rounded-lg ${
                      entry.playerId === activeProfileId ? 'bg-cyan-500/20' : 'bg-white/5'
                    }`}
                  >
                    <MiniRank index={index} />
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs text-white font-bold overflow-hidden flex-shrink-0"
                      style={{ backgroundColor: entry.playerColor }}
                    >
                      {entry.playerAvatar
                        ? <img src={entry.playerAvatar} alt={entry.playerName} className="w-full h-full object-cover" />
                        : entry.playerName[0]
                      }
                    </div>
                    <span className="flex-1 text-sm truncate">{entry.playerName}</span>
                    <span className="text-sm font-bold text-cyan-400">{entry.score.toLocaleString()}</span>
                    {entry.playerId === activeProfileId && currentPlayerRank && (
                      <Badge className="bg-cyan-500/30 text-cyan-300 text-xs">{t('songLeaderboardPreview.youRank').replace('{rank}', String(currentPlayerRank))}</Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!hasAnyScores && !isLoadingGlobal && (
            <div className="text-xs text-white/30 py-1">{t('songLeaderboardPreview.noScores')}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
