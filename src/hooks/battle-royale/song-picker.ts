'use client';

/**
 * Random/vote song selection helpers for Battle Royale rounds. Extracted
 * from use-battle-royale-game.ts (R4) — logic byte-identical.
 */
import { useCallback } from 'react';
import type { Song } from '@/types/game';
import { shuffleArray } from '@/lib/utils';

interface UseBattleRoyaleSongPickerParams {
  songs: Song[];
}

interface UseBattleRoyaleSongPickerReturn {
  getRandomSong: (_excludeIds?: string[]) => Song | null;
  getRandomSongs: (_count: number, _excludeIds?: string[]) => Song[];
  /** Resolve a song by id (host-voted first-round song from party setup) */
  getSongById: (_id: string) => Song | null;
}

export function useBattleRoyaleSongPicker({ songs }: UseBattleRoyaleSongPickerParams): UseBattleRoyaleSongPickerReturn {
  // ── Random song picker ─────────────────────────────────────────────
  const getRandomSong = useCallback((excludeIds?: string[]): Song | null => {
    const playableSongs = songs.filter(s =>
      (s.audioUrl || s.relativeAudioPath || s.storedMedia) &&
      (!excludeIds || !excludeIds.includes(s.id))
    );
    if (playableSongs.length === 0) return null;
    return playableSongs[Math.floor(Math.random() * playableSongs.length)];
  }, [songs]);

  const getRandomSongs = useCallback((count: number, excludeIds?: string[]): Song[] => {
    const playableSongs = songs.filter(s =>
      (s.audioUrl || s.relativeAudioPath || s.storedMedia) &&
      (!excludeIds || !excludeIds.includes(s.id))
    );
    const shuffled = shuffleArray(playableSongs);
    return shuffled.slice(0, count);
  }, [songs]);

  // Resolve a song by id (host-voted first-round song from party setup)
  const getSongById = useCallback((id: string): Song | null => {
    return songs.find(s => s.id === id) ?? null;
  }, [songs]);

  return { getRandomSong, getRandomSongs, getSongById };
}
