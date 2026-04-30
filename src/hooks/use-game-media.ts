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
  // Track blob URLs created by getSongMediaUrls for cleanup
  const lastIdxDbUrlsRef = useRef<{ audioUrl?: string; videoUrl?: string; coverUrl?: string; txtUrl?: string } | null>(null);

  // ── On-demand URL restoration for Tauri - ensure media URLs are valid ──
  useEffect(() => {
    if (!song) {
      setRestoredSong(null);
      return;
    }

    // Fix (Code Review #5): Add cancellation to prevent race condition
    // when song.id changes rapidly (e.g., quick navigation).
    // Without this, a slow restoreUrls() for song A could finish after
    // song B has already started, setting stale URL data.
    let cancelled = false;
    const restoreUrls = async () => {
      try {
        const { ensureSongUrls } = await import('@/lib/game/song-library');
        let preparedSong = await ensureSongUrls(song);

        // Browser: also restore audio/video from IndexedDB if storedMedia flag is set
        // and URLs are missing or stale (blob URLs may have expired after page reload)
        const isStaleBlob = (url: string | undefined) => url?.startsWith('blob:') ?? false;
        const needsIdxDbAudio = !preparedSong.audioUrl || isStaleBlob(preparedSong.audioUrl);
        const needsIdxDbVideo = !preparedSong.videoBackground || isStaleBlob(preparedSong.videoBackground);
        if (preparedSong.storedMedia && (needsIdxDbAudio || needsIdxDbVideo)) {
          try {
            // Revoke previous blob URLs before creating new ones
            const { getSongMediaUrls, revokeSongMediaUrls } = await import('@/lib/db/media-db');
            if (lastIdxDbUrlsRef.current) revokeSongMediaUrls(lastIdxDbUrlsRef.current);
            const mediaUrls = await getSongMediaUrls(preparedSong.id);
            lastIdxDbUrlsRef.current = mediaUrls;
            if (mediaUrls.audioUrl && needsIdxDbAudio) preparedSong = { ...preparedSong, audioUrl: mediaUrls.audioUrl };
            if (mediaUrls.videoUrl && needsIdxDbVideo) preparedSong = { ...preparedSong, videoBackground: mediaUrls.videoUrl };
          } catch (e) {
            console.warn('[GameScreen] Failed to restore media from IndexedDB:', e);
          }
        }

        if (cancelled) return;
        setRestoredSong(preparedSong);
      } catch (err) {
        console.error('[GameScreen] Error ensuring URLs:', err);
        if (cancelled) return;
        setRestoredSong(song);
      }
    };

    restoreUrls();
    return () => {
      cancelled = true;
      // Revoke blob URLs from previous song to prevent memory leaks
      if (lastIdxDbUrlsRef.current) {
        import('@/lib/db/media-db').then(({ revokeSongMediaUrls }) => {
          revokeSongMediaUrls(lastIdxDbUrlsRef.current!);
        });
      }
    };
  }, [song?.id, song?.audioUrl, song?.videoBackground, song?.coverImage, song?.relativeAudioPath, song?.relativeVideoPath, song?.relativeCoverPath]);

  // Use restored song if available, otherwise use original song
  const effectiveSongBase = restoredSong || song;

  // ── On-demand lyrics loading - load lyrics from IndexedDB if storedTxt flag is set ──
  const [loadedLyrics, setLoadedLyrics] = useState<LyricLine[]>([]);
  const [lyricsLoadError, setLyricsLoadError] = useState<string | null>(null);

  useEffect(() => {
    // Fix (#60): Cancellation flag to prevent stale lyrics from overwriting
    // when song changes rapidly during async lyrics loading.
    let cancelled = false;

    if (song && (!song.lyrics || song.lyrics.length === 0) && (song.storedTxt || song.relativeTxtPath)) {
      // Load lyrics on-demand from IndexedDB
      setLyricsLoadError(null);

      import('@/lib/game/song-library').then(({ loadSongLyrics }) => {
        loadSongLyrics(song).then(lyrics => {
          if (cancelled) return; // Song changed while loading — discard stale result
          if (lyrics.length > 0) {
            setLoadedLyrics(lyrics);
            setLyricsLoadError(null);
          } else {
            setLyricsLoadError('Failed to load lyrics from IndexedDB - empty result');
          }
        }).catch(err => {
          if (cancelled) return;
          console.error('[GameScreen] Error loading lyrics:', err);
          setLyricsLoadError(`Error loading lyrics: ${err.message}`);
        });
      }).catch(err => {
        if (cancelled) return;
        console.error('[GameScreen] Error importing song-library:', err);
        setLyricsLoadError(`Error importing module: ${err.message}`);
      });
    } else {
      setLoadedLyrics([]);
      setLyricsLoadError(null);
    }

    return () => { cancelled = true; };
  }, [song?.id, song?.storedTxt, song?.relativeTxtPath, song?.lyrics]);

  // ── Compute effectiveSong: restored URLs + loaded lyrics ──
  const effectiveSong = useMemo(() => {
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
        let settled = false;
        const abortController = new AbortController();

        const onReady = () => {
          if (settled) return;
          settled = true;
          abortController.abort(); // Clean up timeout
          resolve(true);
        };

        element.addEventListener(eventName, onReady, { once: true, signal: abortController.signal });

        // Timeout fallback — also cleans up listener
        setTimeout(() => {
          if (settled) return;
          settled = true;
          // Listener auto-removed by abort or once:true when element fires
          resolve(false);
        }, timeoutMs);
      });
    };

    const loadMedia = async () => {
      let audioReady = true;
      let videoReady = true;
      let anyMedia = false;

      // For songs with audioUrl, wait for audio element to be canplay
      if (effectiveSong.audioUrl && audioRef.current) {
        anyMedia = true;
        audioReady = await waitForMediaEvent(audioRef.current, 'canplay', 5000);
        audioLoadedRef.current = audioReady;

        if (audioReady) {
        } else {
          console.warn('[GameScreen] Audio load timeout, proceeding anyway');
        }
      }

      // For songs with embedded audio (video), wait for video element
      if (effectiveSong.hasEmbeddedAudio && effectiveSong.videoBackground && !effectiveSong.audioUrl) {
        anyMedia = true;
        if (videoRef.current) {
          videoReady = await waitForMediaEvent(videoRef.current, 'canplay', 5000);
          videoLoadedRef.current = videoReady;

          if (videoReady) {
          } else {
            console.warn('[GameScreen] Video load timeout, proceeding anyway');
          }
        }
      }

      // For YouTube videos, just need a small delay for iframe to initialize
      if (effectiveSong.youtubeUrl) {
        anyMedia = true;
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Only mark as loaded if no media was needed, or all media loaded successfully
      // If a timeout occurred, still proceed but log the warning
      if (!anyMedia || (audioReady && videoReady)) {
        setMediaLoaded(true);
      } else {
        console.warn('[GameScreen] Media load had failures, proceeding anyway after timeout');
        setMediaLoaded(true); // Still proceed — game should not hang
      }
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
