'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Song, LyricLine } from '@/types/game';
import { logger } from '@/lib/logger';

export interface UseGameSongOptions {
  song: Song | null;
}

export interface GameSongState {
  effectiveSong: Song | null;
  lyricsLoadError: string | null;
  isRestoringUrls: boolean;
  isLoadingLyrics: boolean;
}

/**
 * Hook for managing song data in the game screen.
 * Handles:
 * - On-demand URL restoration for Tauri songs
 * - On-demand lyrics loading from IndexedDB
 */
export function useGameSong({ song }: UseGameSongOptions): GameSongState {
  // State for song with restored URLs (if needed)
  const [restoredSong, setRestoredSong] = useState<Song | null>(null);
  const [isRestoringUrls, setIsRestoringUrls] = useState(false);
  
  // On-demand lyrics loading state
  const [loadedLyrics, setLoadedLyrics] = useState<LyricLine[]>([]);
  const [lyricsLoadError, setLyricsLoadError] = useState<string | null>(null);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);

  // On-demand URL restoration for Tauri - ensure media URLs are valid
  useEffect(() => {
    if (!song) {
      setRestoredSong(null);
      setIsRestoringUrls(false);
      return;
    }

    // Check if URLs need to be restored (Tauri songs with relative paths but no URLs)
    const needsUrlRestore = typeof window !== 'undefined' && '__TAURI__' in window &&
      (song.relativeAudioPath || song.relativeVideoPath || song.relativeCoverPath) &&
      (!song.audioUrl && !song.videoBackground);

    if (needsUrlRestore) {
      logger.info('[useGameSong]', 'Restoring URLs for song:', song.title);
      setIsRestoringUrls(true);
      
      import('@/lib/game/song-library').then(({ restoreSongUrls }) => {
        restoreSongUrls(song).then(restored => {
          logger.info('[useGameSong]', 'URLs restored:', {
            audioUrl: !!restored.audioUrl,
            videoBackground: !!restored.videoBackground,
            coverImage: !!restored.coverImage
          });
          setRestoredSong(restored);
          setIsRestoringUrls(false);
        }).catch(err => {
          logger.error('[useGameSong]', 'Error restoring URLs:', err);
          setRestoredSong(song);
          setIsRestoringUrls(false);
        });
      }).catch(err => {
        logger.error('[useGameSong]', 'Error importing restoreSongUrls:', err);
        setRestoredSong(song);
        setIsRestoringUrls(false);
      });
    } else {
      setRestoredSong(song);
      setIsRestoringUrls(false);
    }
  }, [song?.id, song?.audioUrl, song?.videoBackground, song?.relativeAudioPath, song?.relativeVideoPath]);

  // Use restored song if available, otherwise use original song
  const effectiveSongBase = restoredSong || song;

  // On-demand lyrics loading - load lyrics from IndexedDB if storedTxt flag is set
  useEffect(() => {
    logger.debug('[useGameSong]', 'Lyrics loading effect triggered', {
      songId: song?.id,
      storedTxt: song?.storedTxt,
      lyricsLength: song?.lyrics?.length || 0
    });

    if (song?.storedTxt && (!song.lyrics || song.lyrics.length === 0)) {
      // Load lyrics on-demand from IndexedDB
      logger.info('[useGameSong]', 'Loading lyrics from IndexedDB for song:', song.id);
      setLyricsLoadError(null);
      setIsLoadingLyrics(true);

      import('@/lib/game/song-library').then(({ loadSongLyrics }) => {
        loadSongLyrics(song).then(lyrics => {
          logger.info('[useGameSong]', 'Lyrics loaded, length:', lyrics.length);
          if (lyrics.length > 0) {
            setLoadedLyrics(lyrics);
            setLyricsLoadError(null);
          } else {
            setLyricsLoadError('Failed to load lyrics from IndexedDB - empty result');
          }
          setIsLoadingLyrics(false);
        }).catch(err => {
          logger.error('[useGameSong]', 'Error loading lyrics:', err);
          setLyricsLoadError(`Error loading lyrics: ${err.message}`);
          setIsLoadingLyrics(false);
        });
      }).catch(err => {
        logger.error('[useGameSong]', 'Error importing song-library:', err);
        setLyricsLoadError(`Error importing module: ${err.message}`);
        setIsLoadingLyrics(false);
      });
    } else {
      setLoadedLyrics([]);
      setLyricsLoadError(null);
      setIsLoadingLyrics(false);
    }
  }, [song?.id, song?.storedTxt, song?.lyrics]);

  // Compute the effective song with loaded lyrics
  const effectiveSong = useMemo(() => {
    logger.debug('[useGameSong]', 'Computing effectiveSong', {
      hasSong: !!effectiveSongBase,
      loadedLyricsLength: loadedLyrics.length,
      songLyricsLength: effectiveSongBase?.lyrics?.length || 0,
      lyricsLoadError
    });

    if (!effectiveSongBase) return null;
    if (loadedLyrics.length > 0) {
      return { ...effectiveSongBase, lyrics: loadedLyrics };
    }
    return effectiveSongBase;
  }, [effectiveSongBase, loadedLyrics, lyricsLoadError]);

  return {
    effectiveSong,
    lyricsLoadError,
    isRestoringUrls,
    isLoadingLyrics,
  };
}
