'use client';

/**
 * Pre-fetches the next Battle Royale song during the last 5 seconds of a
 * round (warms audio so the next round starts without a loading pause).
 * Extracted from use-battle-royale-game.ts (R4) — logic byte-identical.
 */
import { useEffect, useRef } from 'react';
import type { BattleRoyaleGame } from '@/lib/game/battle-royale';
import type { Song } from '@/types/game';

interface UseBattleRoyaleSongPrefetchParams {
  game: BattleRoyaleGame;
  songs: Song[];
  roundTimeLeft: number;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  /** Pre-fetched next song ref shared with the round handlers (consumePrefetchedSong). */
  prefetchedSongRef: React.RefObject<Song | null>;
}

interface UseBattleRoyaleSongPrefetchReturn {
  prefetchedMediaRef: React.RefObject<{ audioUrl?: string; videoUrl?: string } | null>;
}

export function useBattleRoyaleSongPrefetch({
  game,
  songs,
  roundTimeLeft,
  audioRef,
  prefetchedSongRef,
}: UseBattleRoyaleSongPrefetchParams): UseBattleRoyaleSongPrefetchReturn {
  const prefetchAudioRef = useRef<HTMLAudioElement | null>(null);
  // ── Pre-fetch next song during last 5 seconds of round ──
  const prefetchedMediaRef = useRef<{ audioUrl?: string; videoUrl?: string } | null>(null);

  useEffect(() => {
    if (
      game.status !== 'playing' ||
      roundTimeLeft > 5 ||
      roundTimeLeft === 0 ||
      game.settings.songSelection === 'vote' || // can't pre-pick in voting mode
      game.settings.medleyMode // medley rounds bundle several fresh snippets
    ) return;

    // Only pre-fetch once per round
    if (prefetchedSongRef.current) return;

    const preFetch = async () => {
      try {
        // Pick a random song (same logic as handleStartRound)
        const recentlyPlayed = game.recentlyPlayedSongIds || [];
        const candidates = songs.filter(
          s => s.audioUrl && !recentlyPlayed.includes(s.id)
        );
        if (candidates.length === 0) return;

        const randomIndex = Math.floor(Math.random() * candidates.length);
        const nextSong = candidates[randomIndex];

        // Pre-resolve URLs
        let preparedSong = nextSong;
        try {
          const { ensureSongUrls } = await import('@/lib/game/song-url-restore');
          preparedSong = await ensureSongUrls(nextSong);
        } catch { /* non-critical */ }

        prefetchedSongRef.current = preparedSong;

        // Pre-warm audio element
        if (preparedSong.audioUrl && audioRef.current) {
          prefetchAudioRef.current = new Audio();
          prefetchAudioRef.current.preload = 'auto';
          prefetchAudioRef.current.src = preparedSong.audioUrl;
          prefetchedMediaRef.current = { audioUrl: preparedSong.audioUrl };
        }
      } catch {
        // eslint-disable-next-line no-console
        console.warn('[BattleRoyale] Pre-fetch failed');
      }
    };

    preFetch();

    return () => {
      // Clear pre-fetch when round ends (new game state)
      if (prefetchAudioRef.current) {
        prefetchAudioRef.current.pause();
        prefetchAudioRef.current.src = '';
        prefetchAudioRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.status, roundTimeLeft, songs, game.recentlyPlayedSongIds, game.settings.songSelection]);

  return { prefetchedMediaRef };
}
