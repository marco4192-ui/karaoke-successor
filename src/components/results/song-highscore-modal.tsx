'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useGameStore } from '@/lib/game/store';
import { Song, GameMode, HighscoreEntry } from '@/types/game';
import { TrophyIcon } from './constants';
import { useTranslation } from '@/lib/i18n/translations';
import type { OnlineScoreEntry } from '@/lib/leaderboard/types';

// ── Country Flag Helper ──
function CountryFlag({ code, show }: { code: string | null | undefined; show: boolean }) {
  if (!code || !show) return null;
  const codePoints = code.toUpperCase().split('').map(char => 127397 + char.charCodeAt(0));
  return <span className="text-sm ml-1" title={code}>{String.fromCodePoint(...codePoints)}</span>;
}

// ── Verified Badge ──
function VerifiedBadge({ verified }: { verified: boolean }) {
  if (!verified) return null;
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] text-green-400 bg-green-500/15 border border-green-500/30 rounded-full px-1.5 py-0.5" title="Verified">
      ✓
    </span>
  );
}

// ── Compute song hash for this song (memoized per song) ──
function useSongHash(song: Song): string | null {
  const [hash, setHash] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    import('@/lib/leaderboard/song-fingerprint').then(({ generateSongHash }) => {
      if (cancelled) return;
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
        const h = generateSongHash({ artist: song.artist, title: song.title, gameType: 's', notes: rawNotes });
        setHash(h);
      } catch {
        setHash(null);
      }
    });
    return () => { cancelled = true; };
  }, [song.artist, song.title, song.bpm, song.lyrics]);

  return hash;
}

export function SongHighscoreModal({
  song,
  isOpen,
  onClose,
}: {
  song: Song;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { highscores, onlineEnabled, leaderboardType, setLeaderboardType, profiles } = useGameStore();
  const [globalScores, setGlobalScores] = useState<OnlineScoreEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [internalTab, setInternalTab] = useState<'local' | 'global'>(leaderboardType);

  const localProfileIds = useMemo(() => new Set(profiles.map(p => p.id)), [profiles]);

  const localScores = useMemo(() =>
    highscores
      .filter(h => h.songId === song.id)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10),
    [highscores, song.id]
  );

  // Compute the song hash for API calls
  const songHash = useSongHash(song);

  // Sync internal tab with global leaderboardType
  useEffect(() => {
    setInternalTab(leaderboardType);
  }, [leaderboardType]);

  const loadGlobalScores = useCallback(() => {
    if (!songHash) return;
    setIsLoading(true);
    setError(null);

    import('@/lib/api/leaderboard-service').then(({ leaderboardService }) => {
      leaderboardService.getSongLeaderboard(songHash, 's' as const, 10)
        .then((scores) => {
          setGlobalScores(scores);
        })
        .catch((err: Error) => setError(err.message || t('songHighscoreModal.failedToLoad')))
        .finally(() => setIsLoading(false));
    });
  }, [songHash, t]);

  // Load global scores when opening or switching to global tab
  useEffect(() => {
    if (isOpen && onlineEnabled && internalTab === 'global') {
      loadGlobalScores();
    }
  }, [isOpen, onlineEnabled, internalTab, loadGlobalScores]);

  // When clicking the global tab button, also update the global store
  const handleTabSwitch = (tab: 'local' | 'global') => {
    setInternalTab(tab);
    setLeaderboardType(tab);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-gray-900 border-white/10 text-white max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrophyIcon className="w-5 h-5 text-yellow-400" />
            {song.title}
          </DialogTitle>
          <DialogDescription className="text-white/60 text-sm">{t('songHighscoreModal.highscores').replace('{artist}', song.artist)}</DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          <Button
            onClick={() => handleTabSwitch('local')}
            size="sm"
            className={internalTab === 'local' ? 'bg-cyan-500' : 'bg-white/10'}
          >
            {t('songHighscoreModal.local').replace('{n}', String(localScores.length))}
          </Button>
          {onlineEnabled && (
            <Button
              onClick={() => handleTabSwitch('global')}
              size="sm"
              className={internalTab === 'global' ? 'bg-purple-500' : 'bg-white/10'}
            >
              {t('songHighscoreModal.global')}
            </Button>
          )}
        </div>

        <ScrollArea className="flex-1 -mx-6">
          <div className="px-6 space-y-2">
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full mr-2" />
                <span className="text-white/60">{t('songHighscoreModal.loading')}</span>
              </div>
            )}

            {error && (
              <div className="text-center py-8 text-red-400">{error}</div>
            )}

            {!isLoading && !error && internalTab === 'global' && globalScores.length === 0 && (
              <div className="text-center py-8 text-white/60">
                {t('songHighscoreModal.noGlobal')}
              </div>
            )}

            {!isLoading && !error && internalTab === 'local' && localScores.length === 0 && (
              <div className="text-center py-8 text-white/60">
                {t('songHighscoreModal.noLocal')}
              </div>
            )}

            {/* Global scores */}
            {internalTab === 'global' && !isLoading && !error && globalScores.map((entry, index) => {
              const isLocal = localProfileIds.has(entry.profile_uid);
              return (
                <div
                  key={`${entry.profile_uid}-${index}`}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    index < 3 ? 'bg-white/10' : 'bg-white/5'
                  } ${isLocal ? 'ring-1 ring-cyan-500/40 bg-cyan-500/5' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    index === 0 ? 'bg-yellow-500 text-black' :
                    index === 1 ? 'bg-gray-300 text-black' :
                    index === 2 ? 'bg-orange-500 text-black' :
                    'bg-white/10 text-white/60'
                  }`}>
                    {index === 0 ? '👑' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                  </div>

                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold overflow-hidden flex-shrink-0"
                    style={{ backgroundColor: entry.color }}
                  >
                    {entry.display_name?.[0] || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className={`font-medium truncate ${isLocal ? 'text-cyan-300' : 'text-white'}`}>{entry.display_name || 'Unknown'}</span>
                      <CountryFlag code={entry.country_code} show={!!entry.country_code} />
                      <VerifiedBadge verified={!!entry.verified} />
                    </div>
                    <div className="text-xs text-white/40">{entry.accuracy?.toFixed(1)}% • {entry.max_combo}x {t('songHighscoreModal.combo')}</div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-cyan-400">{entry.score.toLocaleString()}</div>
                    <div className="text-xs text-white/40">{t('songHighscoreModal.pts')}</div>
                  </div>
                </div>
              );
            })}

            {/* Local scores */}
            {internalTab === 'local' && !isLoading && localScores.map((entry, index) => (
              <div
                key={entry.id}
                className={`flex items-center gap-3 p-3 rounded-lg ${
                  index < 3 ? 'bg-white/10' : 'bg-white/5'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  index === 0 ? 'bg-yellow-500 text-black' :
                  index === 1 ? 'bg-gray-300 text-black' :
                  index === 2 ? 'bg-orange-500 text-black' :
                  'bg-white/10 text-white/60'
                }`}>
                  {index === 0 ? '👑' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                </div>

                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold overflow-hidden"
                  style={{ backgroundColor: entry.playerColor }}
                >
                  {entry.playerAvatar ? (
                    <img src={entry.playerAvatar} alt={entry.playerName} className="w-full h-full object-cover" />
                  ) : (
                    entry.playerName[0]
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white truncate">{entry.playerName}</div>
                  <div className="text-xs text-white/40">{entry.accuracy.toFixed(1)}% • {entry.maxCombo}x {t('songHighscoreModal.combo')}</div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-cyan-400">{entry.score.toLocaleString()}</div>
                  <div className="text-xs text-white/40">{entry.difficulty}</div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="pt-4">
          <Button onClick={onClose} className="w-full bg-white/10 hover:bg-white/20">
            {t('songHighscoreModal.close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
