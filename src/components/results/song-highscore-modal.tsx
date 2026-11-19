'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Angry } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useGameStore } from '@/lib/game/store';
import { isPartyGameMode } from '@/lib/game/party-modes';
import { Song } from '@/types/game';
import { TrophyIcon } from './constants';
import { useTranslation } from '@/lib/i18n/translations';
import { OutlierFlagBadge } from '@/components/results/outlier-badge';
import type { OnlineScoreEntry } from '@/lib/leaderboard/types';
import type { RivalEntry } from '@/lib/leaderboard/rivals';

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
function useSongHash(song: Song, gameType: 's' | 'd'): string | null {
  const [hash, setHash] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    import('@/lib/leaderboard/song-fingerprint').then(({ songHashFromSong }) => {
      if (cancelled) return;
      try {
        setHash(songHashFromSong(song, gameType));
      } catch {
        setHash(null);
      }
    });
    return () => { cancelled = true; };
  }, [song, gameType]);

  return hash;
}

/** R81/B: difficulty filter value for both boards ('all' = every entry). */
type DifficultyFilter = 'all' | 'easy' | 'normal' | 'hard';

/** R81/B: app difficulty ('easy'|'medium'|'hard') → API naming (medium → 'normal'). */
function toApiDifficulty(d: 'easy' | 'medium' | 'hard'): 'easy' | 'normal' | 'hard' {
  return d === 'medium' ? 'normal' : d;
}

export function SongHighscoreModal({
  song,
  isOpen,
  onClose,
  gameType = 's',
}: {
  song: Song;
  isOpen: boolean;
  onClose: () => void;
  /** R69: 'd' shows the duet board (separate fingerprint → separate board). */
  gameType?: 's' | 'd';
}) {
  const { t } = useTranslation();
  const { highscores, onlineEnabled, leaderboardType, setLeaderboardType, profiles, gameState } = useGameStore();
  const [globalScores, setGlobalScores] = useState<OnlineScoreEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [internalTab, setInternalTab] = useState<'local' | 'global'>(leaderboardType);
  // R81/B: difficulty filter for BOTH boards (fixes the inconsistency that
  // only online scores could switch difficulties). The initial value is
  // NEVER 'all' — the modal opens pre-filtered to the app's set difficulty;
  // the user may still switch, including 'all'.
  const [difficulty, setDifficulty] = useState<DifficultyFilter>(() => toApiDifficulty(gameState.difficulty));
  // R81/B: locally stored rival list (localStorage) — loaded on open, kept in
  // sync by the toggle handler. Rival box + toggles are online-tab only.
  const [rivals, setRivals] = useState<RivalEntry[]>([]);

  // R69: match by id AND syncUid (sync/login-imported profiles)
  const localProfileIds = useMemo(
    () => new Set(profiles.flatMap(p => [p.id, p.syncUid].filter(Boolean) as string[])),
    [profiles],
  );

  const rivalUids = useMemo(() => new Set(rivals.map(r => r.uid)), [rivals]);

  // R81/B: local top-5 — song match, difficulty match (local entries store
  // 'medium' where the API filter says 'normal'), and never party game modes
  // (party games produce no highscores; older stored entries may contain them).
  const localScores = useMemo(() =>
    highscores
      .filter(h => {
        if (h.songId !== song.id) return false;
        if (isPartyGameMode(h.gameMode)) return false;
        if (difficulty === 'all') return true;
        return h.difficulty === (difficulty === 'normal' ? 'medium' : difficulty);
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5),
    [highscores, song.id, difficulty]
  );

  // Compute the song hash for API calls
  const songHash = useSongHash(song, gameType);

  // R81/B: rival entries on THIS song — from the fetched (difficulty-
  // filtered) online board, the stored rivals' best scores, top 3 by score.
  // Supplementary rows below the ranking, NOT part of the numbered top-5.
  const rivalScores = useMemo(() => {
    if (rivalUids.size === 0) return [];
    const bestByUid = new Map<string, OnlineScoreEntry>();
    for (const entry of globalScores) {
      if (!rivalUids.has(entry.profile_uid)) continue;
      const prev = bestByUid.get(entry.profile_uid);
      if (!prev || entry.score > prev.score) bestByUid.set(entry.profile_uid, entry);
    }
    return Array.from(bestByUid.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [globalScores, rivalUids]);

  // Sync internal tab with global leaderboardType
  useEffect(() => {
    setInternalTab(leaderboardType);
  }, [leaderboardType]);

  // R81/B: reset the difficulty default every time the modal opens for a
  // (new) song — sync with the app's set difficulty at open time.
  useEffect(() => {
    if (isOpen) setDifficulty(toApiDifficulty(gameState.difficulty));
  }, [isOpen, song.id, gameState.difficulty]);

  // R81/B: load the stored rival list when the modal opens (dynamic import —
  // same style as the other leaderboard modules in this file).
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    import('@/lib/leaderboard/rivals').then(({ getRivals }) => {
      if (!cancelled) setRivals(getRivals());
    });
    return () => { cancelled = true; };
  }, [isOpen, song.id]);

  const loadGlobalScores = useCallback(() => {
    if (!songHash) return;
    setIsLoading(true);
    setError(null);

    import('@/lib/api/leaderboard-service').then(({ leaderboardService }) => {
      // R81/B: limit 100 — only the top 5 are displayed, but the rival box
      // needs the full board to extract rival entries.
      leaderboardService.getSongLeaderboard(songHash, gameType, 100, difficulty)
        .then((scores) => {
          setGlobalScores(scores);
        })
        .catch((err: Error) => setError(err.message || t('songHighscoreModal.failedToLoad')))
        .finally(() => setIsLoading(false));
    });
  }, [songHash, gameType, difficulty, t]);

  // Load global scores when opening or switching to global tab / difficulty
  useEffect(() => {
    if (isOpen && onlineEnabled && internalTab === 'global') {
      loadGlobalScores();
    }
  }, [isOpen, onlineEnabled, internalTab, difficulty, loadGlobalScores]);

  // When clicking the global tab button, also update the global store
  const handleTabSwitch = (tab: 'local' | 'global') => {
    setInternalTab(tab);
    setLeaderboardType(tab);
  };

  // R81/B: add/remove rival toggle — moved here from the highscore screen
  // (which no longer has profile rows). Rival symbol: Angry face — crossed
  // swords are reserved for duel mode.
  const toggleRival = useCallback((entry: OnlineScoreEntry) => {
    import('@/lib/leaderboard/rivals').then(({ isRival, addRival, removeRival, getRivals }) => {
      if (isRival(entry.profile_uid)) {
        removeRival(entry.profile_uid);
      } else {
        addRival({ uid: entry.profile_uid, name: entry.display_name, color: entry.color });
      }
      setRivals(getRivals());
    });
  }, []);

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

        <div className="flex gap-2 mb-4 flex-wrap items-center">
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

          {/* R81/B: both lists are top-5 */}
          <span className="text-[11px] font-medium text-white/40 px-0.5">
            {t('songHighscoreModal.topScores')}
          </span>

          {/* R81/B: difficulty filter — visible on BOTH tabs (it drives the
              online fetch AND filters the local list). Default = the app's
              set difficulty at open time. */}
          <div className="flex gap-1 bg-white/5 rounded-lg p-1 border border-white/10 ml-auto" role="group" aria-label={t('songHighscoreModal.difficultyFilter')} data-testid="song-difficulty-filter">
            {(['all', 'easy', 'normal', 'hard'] as const).map(d => (
              <button
                key={d}
                type="button"
                onClick={() => setDifficulty(d)}
                data-testid={`song-difficulty-${d}`}
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium transition-all ${
                  d === 'easy' && difficulty === d ? 'bg-green-500 text-white' :
                  d === 'normal' && difficulty === d ? 'bg-yellow-500 text-black' :
                  d === 'hard' && difficulty === d ? 'bg-red-500 text-white' :
                  d === 'all' && difficulty === d ? 'bg-cyan-500 text-white' :
                  'text-white/50 hover:text-white'
                }`}
              >
                {t(`songHighscoreModal.difficulty_${d}`)}
              </button>
            ))}
          </div>
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

            {/* Global scores — R81/B: display only the top 5 (fetch keeps 100
                for rival extraction) */}
            {internalTab === 'global' && !isLoading && !error && globalScores.slice(0, 5).map((entry, index) => {
              const isLocal = localProfileIds.has(entry.profile_uid);
              const rivalListed = rivalUids.has(entry.profile_uid);
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
                      <OutlierFlagBadge flags={entry.ac_flags} />
                    </div>
                    <div className="text-xs text-white/40">{entry.accuracy?.toFixed(1)}% • {entry.max_combo}x {t('songHighscoreModal.combo')} • {entry.difficulty}</div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-cyan-400">{entry.score.toLocaleString()}</div>
                    <div className="text-xs text-white/40">{t('songHighscoreModal.pts')}</div>
                  </div>

                  {/* R81/B: add/remove rival — never on own profiles. Angry
                      face = rival symbol (crossed swords = duel mode). */}
                  {!isLocal && (
                    <button
                      type="button"
                      onClick={() => toggleRival(entry)}
                      className={`shrink-0 rounded-full border p-1.5 transition-colors ${
                        rivalListed
                          ? 'border-red-500/60 bg-red-500/15 text-red-400 hover:bg-red-500/25'
                          : 'border-white/15 text-white/40 hover:text-white/80'
                      }`}
                      title={rivalListed ? t('rivals.remove') : t('rivals.add')}
                      aria-label={rivalListed ? t('rivals.remove') : t('rivals.add')}
                      data-testid={`rival-toggle-${entry.profile_uid.slice(0, 8)}`}
                    >
                      <Angry className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}

            {/* R81/B: rival box — top-3 rivals on this song, supplementary
                rows BELOW the ranking (online tab only). Hidden entirely when
                no rivals are stored. */}
            {internalTab === 'global' && !isLoading && !error && rivals.length > 0 && (
              <div className="pt-3 mt-3 border-t border-white/10" data-testid="modal-rival-box">
                <div className="flex items-center gap-2 mb-2 px-1">
                  <Angry className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-semibold text-red-400">{t('songHighscoreModal.rivalsTitle')}</span>
                </div>

                {rivalScores.length === 0 ? (
                  <p className="text-xs text-white/40 text-center py-2">{t('songHighscoreModal.rivalsEmpty')}</p>
                ) : (
                  <div className="space-y-2">
                    {rivalScores.map((entry, i) => {
                      const stored = rivals.find(r => r.uid === entry.profile_uid);
                      return (
                        <div
                          key={`${entry.profile_uid}-${i}`}
                          data-testid={`modal-rival-row-${i}`}
                          className="flex items-center gap-3 p-2.5 border border-red-500/60 bg-red-500/5 rounded-lg"
                        >
                          <Angry className="h-4 w-4 text-red-500 shrink-0" />
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold overflow-hidden shrink-0"
                            style={{ backgroundColor: stored?.color ?? entry.color }}
                          >
                            {entry.display_name?.[0] || '?'}
                          </div>
                          <span className="flex-1 min-w-0 font-medium text-white truncate">{entry.display_name || 'Unknown'}</span>
                          <div className="text-right shrink-0">
                            <div className="font-bold text-cyan-400">{entry.score.toLocaleString()}</div>
                            <div className="text-xs text-white/40">{t('songHighscoreModal.pts')}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

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
