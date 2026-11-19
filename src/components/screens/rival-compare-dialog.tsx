'use client';

import { useEffect, useState, useMemo } from 'react';
import { Angry } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useGameStore } from '@/lib/game/store';
import { useTranslation } from '@/lib/i18n/translations';
import type { RivalEntry } from '@/lib/leaderboard/rivals';
import type { PlayerProfile } from '@/types/game';

/** One compared song: both players have an online score for it. */
interface CompareRow {
  songTitle: string;
  artist: string;
  myScore: number;
  rivalScore: number;
  diff: number; // > 0 = I lead
}

interface CompareData {
  rows: CompareRow[];
  /** My songs the rival has no online score for. */
  mineOnly: number;
  /** Songs in the comparison basis (my distinct songs, capped at 200). */
  totalMine: number;
}

/**
 * R72/C: head-to-head comparison with a manually picked rival — entirely
 * client-side against GET /scores/batch (no server friend system by
 * design). Basis: MY local highscore songs (up to 200 hashes); a shared
 * song = both of us have an online score on it.
 */
export function RivalCompareDialog({
  rival,
  profile,
  open,
  onOpenChange,
}: {
  rival: RivalEntry;
  profile: PlayerProfile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const { highscores } = useGameStore();
  const [data, setData] = useState<CompareData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const myUid = profile.syncUid || profile.id;

  // My best local score per song (single board, 's' — the standard case).
  const mySongIds = useMemo(() => {
    const perSong = new Map<string, number>();
    highscores
      .filter(h => h.playerId === profile.id)
      .forEach(h => perSong.set(h.songId, Math.max(perSong.get(h.songId) ?? 0, h.score)));
    return [...perSong.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 200); // batch endpoint cap
  }, [highscores, profile.id]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setData(null);

    (async () => {
      const [{ leaderboardService }, { mapHashesToSongs }] = await Promise.all([
        import('@/lib/api/leaderboard-service'),
        import('@/lib/leaderboard/hash-song-map'),
      ]);
      // Resolve songIds → Song → online hash (needs the notes for hashing)
      const { getAllSongs } = await import('@/lib/game/song-library');
      const songsById = new Map(getAllSongs().map(s => [s.id, s]));
      const hashBySongId = new Map<string, string>();
      for (const [songId] of mySongIds) {
        const song = songsById.get(songId);
        if (!song) continue;
        try {
          const { songHashFromSong } = await import('@/lib/leaderboard/song-fingerprint');
          hashBySongId.set(songId, songHashFromSong(song, 's'));
        } catch { /* no notes → no fingerprint */ }
      }
      const hashes = [...new Set([...hashBySongId.values()])];
      if (hashes.length === 0) {
        if (!cancelled) { setData({ rows: [], mineOnly: 0, totalMine: 0 }); setIsLoading(false); }
        return;
      }
      const boards = await leaderboardService.fetchBatchScores(hashes, 's', 2000);
      const wantedHashes = new Set<string>();
      Object.values(boards).forEach(entries => {
        entries.forEach(e => {
          if (e.profile_uid === myUid || e.profile_uid === rival.uid) wantedHashes.add(e.song_hash);
        });
      });
      const songByHash = await mapHashesToSongs(wantedHashes);

      const rows: CompareRow[] = [];
      let mineOnly = 0;
      for (const [songId, hash] of hashBySongId) {
        const board = boards[hash];
        if (!board) continue; // no online scores at all for this song
        const myEntry = board.find(e => e.profile_uid === myUid);
        const rivalEntry = board.find(e => e.profile_uid === rival.uid);
        const song = songByHash.get(hash) ?? songsById.get(songId);
        if (myEntry && rivalEntry) {
          rows.push({
            songTitle: song?.title ?? t('rivals.unknownSong'),
            artist: song?.artist ?? '',
            myScore: myEntry.score,
            rivalScore: rivalEntry.score,
            diff: myEntry.score - rivalEntry.score,
          });
        } else if (myEntry) {
          mineOnly++;
        }
      }
      rows.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
      if (!cancelled) {
        setData({ rows, mineOnly, totalMine: hashBySongId.size });
        setIsLoading(false);
      }
    })().catch((err: Error) => {
      if (!cancelled) {
        setError(err.message || t('rivals.compareFailed'));
        setIsLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [open, mySongIds, myUid, rival.uid, t]);

  const myWins = data ? data.rows.filter(r => r.diff > 0).length : 0;
  const rivalWins = data ? data.rows.filter(r => r.diff < 0).length : 0;
  const pointsDiff = data ? data.rows.reduce((sum, r) => sum + r.diff, 0) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[rgb(24,24,32)] border-white/15 text-white max-w-lg max-h-[85vh] overflow-hidden flex flex-col" data-testid="rival-compare-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {/* R83: rival symbol = angry face (crossed swords are reserved
                for duel mode — same convention as the R81 song modal). */}
            <Angry className="w-5 h-5 text-red-400" aria-hidden />
            {t('rivals.compareTitle').replace('{name}', rival.name)}
          </DialogTitle>
          <DialogDescription className="text-white/60 text-xs">
            {t('rivals.compareBasis')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto kz-scroll px-1">
          {isLoading && (
            <div className="flex items-center justify-center gap-3 py-10">
              <div className="animate-spin w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full" />
              <span className="text-white/60 text-sm">{t('rivals.compareLoading')}</span>
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <p className="text-red-400 text-sm mb-2">{t('rivals.compareFailed')}</p>
              <p className="text-xs text-white/40">{error}</p>
            </div>
          )}

          {!isLoading && !error && data && data.rows.length === 0 && (
            <div className="text-center py-8 text-white/60 text-sm">
              {t('rivals.compareNoShared')}
            </div>
          )}

          {!isLoading && !error && data && data.rows.length > 0 && (
            <>
              <div className="grid grid-cols-3 gap-2 mb-3" data-testid="rival-compare-summary">
                <div className="rounded-lg bg-cyan-500/10 border border-cyan-500/25 p-2 text-center">
                  <p className="text-lg font-bold text-cyan-300">{myWins}</p>
                  <p className="text-[10px] text-white/50">{t('rivals.youLead')}</p>
                </div>
                <div className="rounded-lg bg-white/5 border border-white/10 p-2 text-center">
                  <p className="text-lg font-bold text-white/70">{data.rows.length - myWins - rivalWins}</p>
                  <p className="text-[10px] text-white/50">{t('rivals.tied')}</p>
                </div>
                <div className="rounded-lg bg-purple-500/10 border border-purple-500/25 p-2 text-center">
                  <p className="text-lg font-bold text-purple-300">{rivalWins}</p>
                  <p className="text-[10px] text-white/50">{t('rivals.rivalLeads').replace('{name}', rival.name)}</p>
                </div>
              </div>

              <p className="text-[11px] text-white/40 mb-2">
                {t('rivals.compareSummary')
                  .replace('{shared}', String(data.rows.length))
                  .replace('{diff}', `${pointsDiff > 0 ? '+' : ''}${pointsDiff.toLocaleString()}`)}
                {' · '}
                {t('rivals.compareMineOnly').replace('{n}', String(data.mineOnly))}
              </p>

              <div className="space-y-1.5 pb-2">
                {data.rows.map((row) => (
                  <div
                    key={`${row.songTitle}-${row.myScore}-${row.rivalScore}`}
                    className={`flex items-center gap-2 p-2 rounded-lg ${
                      row.diff > 0 ? 'bg-cyan-500/10' : row.diff < 0 ? 'bg-purple-500/10' : 'bg-white/5'
                    }`}
                    data-testid="rival-compare-row"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{row.songTitle}</p>
                      <p className="text-[10px] text-white/40 truncate">{row.artist}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-bold ${row.diff > 0 ? 'text-cyan-300' : 'text-white/60'}`}>
                        {row.myScore.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-white/30">{t('rivals.you')}</p>
                    </div>
                    <div className="text-white/20 text-xs">vs</div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-bold ${row.diff < 0 ? 'text-purple-300' : 'text-white/60'}`}>
                        {row.rivalScore.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-white/30 truncate max-w-20">{rival.name}</p>
                    </div>
                    <span
                      className={`shrink-0 text-xs font-bold w-14 text-right ${
                        row.diff > 0 ? 'text-cyan-400' : row.diff < 0 ? 'text-purple-400' : 'text-white/40'
                      }`}
                    >
                      {row.diff > 0 ? '+' : ''}{row.diff.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
