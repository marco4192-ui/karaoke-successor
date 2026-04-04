'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import type { Song, LyricLine } from '@/types/game';

export interface UseGameMediaResult {
  /** Song with URLs restored via ensureSongUrls (for Tauri compatibility) */
  restoredSong: Song | null;
  /** Song with restored URLs AND on-demand loaded lyrics */
  effectiveSong: Song | null;
  /** Lyrics loaded on-demand from IndexedDB */
  loadedLyrics: LyricLine[];
  /** Error message if lyrics loading failed */
  lyricsLoadError: string | null;
  /** Whether media (audio/video) has finished loading and is ready to play */
  mediaLoaded: boolean;
  /** Ref to the <audio> element */
  audioRef: React.RefObject<HTMLAudioElement | null>;
  /** Ref to the <video> element */
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** Ref tracking audio element load state */
  audioLoadedRef: React.RefObject<boolean>;
  /** Ref tracking video element load state */
  videoLoadedRef: React.RefObject<boolean>;
}

/**
 * Hook that encapsulates all song media preparation:
 * - URL restoration for Tauri (ensureSongUrls)
 * - On-demand lyrics loading from IndexedDB (storedTxt flag)
 * - Media loading detection (audio/video canplay events)
 * - Computes the final effectiveSong with restored URLs + loaded lyrics
 */
export function useGameMedia(song: Song | null): UseGameMediaResult {
  // ── State for song with restored URLs (if needed) ──
  const [restoredSong, setRestoredSong] = useState<Song | null>(null);

  // ── On-demand URL restoration for Tauri - ensure media URLs are valid ──
  useEffect(() => {
    if (!song) {
      setRestoredSong(null);
      return;
    }

    // Use ensureSongUrls to handle URL restoration
    const restoreUrls = async () => {
      try {
        const { ensureSongUrls } = await import('@/lib/game/song-library');
        const preparedSong = await ensureSongUrls(song);
        console.log('[GameScreen] Song URLs ensured:', {
          title: preparedSong.title,
          audioUrl: !!preparedSong.audioUrl,
          videoBackground: !!preparedSong.videoBackground,
          coverImage: !!preparedSong.coverImage
        });
        setRestoredSong(preparedSong);
      } catch (err) {
        console.error('[GameScreen] Error ensuring URLs:', err);
        setRestoredSong(song);
      }
    };

    restoreUrls();
  }, [song?.id, song?.audioUrl, song?.videoBackground, song?.coverImage, song?.relativeAudioPath, song?.relativeVideoPath, song?.relativeCoverPath]);

  // Use restored song if available, otherwise use original song
  const effectiveSongBase = restoredSong || song;

  // ── On-demand lyrics loading - load lyrics from IndexedDB if storedTxt flag is set ──
  const [loadedLyrics, setLoadedLyrics] = useState<LyricLine[]>([]);
  const [lyricsLoadError, setLyricsLoadError] = useState<string | null>(null);

  useEffect(() => {
    console.log('[GameScreen] Lyrics loading effect triggered', {
      songId: song?.id,
      storedTxt: song?.storedTxt,
      lyricsLength: song?.lyrics?.length || 0
    });

    if (song?.storedTxt && (!song.lyrics || song.lyrics.length === 0)) {
      // Load lyrics on-demand from IndexedDB
      console.log('[GameScreen] Loading lyrics from IndexedDB for song:', song.id);
      setLyricsLoadError(null);

      import('@/lib/game/song-library').then(({ loadSongLyrics }) => {
        loadSongLyrics(song).then(lyrics => {
          console.log('[GameScreen] Lyrics loaded, length:', lyrics.length);
          if (lyrics.length > 0) {
            setLoadedLyrics(lyrics);
            setLyricsLoadError(null);
          } else {
            setLyricsLoadError('Failed to load lyrics from IndexedDB - empty result');
          }
        }).catch(err => {
          console.error('[GameScreen] Error loading lyrics:', err);
          setLyricsLoadError(`Error loading lyrics: ${err.message}`);
        });
      }).catch(err => {
        console.error('[GameScreen] Error importing song-library:', err);
        setLyricsLoadError(`Error importing module: ${err.message}`);
      });
    } else {
      setLoadedLyrics([]);
      setLyricsLoadError(null);
    }
  }, [song?.id, song?.storedTxt, song?.lyrics]);

  // ── Compute effectiveSong: restored URLs + loaded lyrics ──
  const effectiveSong = useMemo(() => {
    console.log('[GameScreen] Computing effectiveSong', {
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

  // ── Media element refs ──
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioLoadedRef = useRef(false);
  const videoLoadedRef = useRef(false);

  // ── Media loaded state ──
  const [mediaLoaded, setMediaLoaded] = useState(false);

  // Initialize media elements on mount
  // Uses effectiveSong which has restored URLs for Tauri
  useEffect(() => {
    if (!effectiveSong) return;

    // Reset media loaded state
    setMediaLoaded(false);
    audioLoadedRef.current = false;
    videoLoadedRef.current = false;

    // Event-based media loading helper — avoids busy-waiting anti-pattern
    const waitForMediaEvent = (
      element: HTMLAudioElement | HTMLVideoElement | null,
      eventName: string,
      timeoutMs: number = 5000
    ): Promise<boolean> => {
      if (!element) return Promise.resolve(false);

      return new Promise((resolve) => {
        const onReady = () => {
          resolve(true);
        };

        element.addEventListener(eventName, onReady, { once: true });

        // Timeout fallback
        setTimeout(() => resolve(false), timeoutMs);
      });
    };

    const loadMedia = async () => {
      let audioReady = true;
      let videoReady = true;

      // For songs with audioUrl, wait for audio element to be canplay
      if (effectiveSong.audioUrl && audioRef.current) {
        audioReady = await waitForMediaEvent(audioRef.current, 'canplay', 5000);
        audioLoadedRef.current = audioReady;

        if (audioReady) {
          console.log('[GameScreen] Audio loaded successfully');
        } else {
          console.warn('[GameScreen] Audio load timeout, proceeding anyway');
        }
      }

      // For songs with embedded audio (video), wait for video element
      if (effectiveSong.hasEmbeddedAudio && effectiveSong.videoBackground && !effectiveSong.audioUrl) {
        if (videoRef.current) {
          videoReady = await waitForMediaEvent(videoRef.current, 'canplay', 5000);
          videoLoadedRef.current = videoReady;

          if (videoReady) {
            console.log('[GameScreen] Video loaded successfully');
          } else {
            console.warn('[GameScreen] Video load timeout, proceeding anyway');
          }
        }
      }

      // For YouTube videos, just need a small delay for iframe to initialize
      if (effectiveSong.youtubeUrl) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      setMediaLoaded(true);
    };

    loadMedia();
  }, [effectiveSong]);

  return {
    restoredSong,
    effectiveSong,
    loadedLyrics,
    lyricsLoadError,
    mediaLoaded,
    audioRef,
    videoRef,
    audioLoadedRef,
    videoLoadedRef,
  };
}
