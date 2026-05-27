/**
 * Sub-hook: medley mode support for Pass-the-Mic.
 * Handles medley state computation, snippet preloading, seek-on-segment-change,
 * and media error recovery (retry with replacement snippet).
 */
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Song, LyricLine } from '@/types/game';
import type { GamePhase } from './ptm-types';
import { usePartyStore } from '@/lib/game/party-store';

interface MedleySnippet {
  song: Song;
  startTime: number;
  endTime: number;
}

interface UsePtmMedleyOptions {
  phase: GamePhase;
  isPlaying: boolean;
  isYouTube: boolean;
  effectiveSong: Song | null;
  currentSegmentIndex: number;
  fallbackLyricsRef: React.RefObject<LyricLine[] | null>;
  unmountGuardRef: React.RefObject<boolean>;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  recordRound: () => void;
  setPhase: React.Dispatch<React.SetStateAction<GamePhase>>;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  segmentSwitchHandledRef: React.RefObject<boolean>;
  forceRender: () => void;
}

export function usePtmMedley({
  phase,
  isPlaying,
  isYouTube,
  effectiveSong,
  currentSegmentIndex,
  fallbackLyricsRef,
  unmountGuardRef,
  audioRef,
  videoRef,
  recordRound,
  setPhase,
  setIsPlaying,
  segmentSwitchHandledRef,
  forceRender,
}: UsePtmMedleyOptions): {
  isMedleyMode: boolean;
  currentSnippet: MedleySnippet | null;
  audioSong: Song | null;
  handleMediaError: () => void;
  isRetryingSnippet: boolean;
} {
  const ptmMedleySnippets = usePartyStore(s => s.ptmMedleySnippets);
  const [isRetryingSnippet, setIsRetryingSnippet] = useState(false);
  const isRetryingRef = useRef(false);

  // ── Medley mode support ──
  const isMedleyMode = ptmMedleySnippets.length > 1;
  const currentSnippet = isMedleyMode ? ptmMedleySnippets[currentSegmentIndex] : null;
  const audioSong = isMedleyMode && currentSnippet ? currentSnippet.song : effectiveSong;

  // ── Medley preloading: preload next snippet's audio while current is playing ──
  const preloadRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    if (!isMedleyMode || phase !== 'playing') {
      if (preloadRef.current) {
        preloadRef.current.src = '';
        preloadRef.current = null;
      }
      return;
    }

    const nextIdx = currentSegmentIndex + 1;
    if (nextIdx >= ptmMedleySnippets.length) return;

    const nextSnippet = ptmMedleySnippets[nextIdx];
    const nextAudioUrl = nextSnippet?.song?.audioUrl;
    if (!nextAudioUrl) return;

    if (!preloadRef.current) {
      preloadRef.current = new Audio();
    }
    const audio = preloadRef.current;
    if (audio.src !== nextAudioUrl) {
      audio.src = nextAudioUrl;
      audio.preload = 'auto';
      audio.load();
    }

    return () => {
      // Don't clean up during unmount — let the browser cache it
    };
  }, [isMedleyMode, phase, currentSegmentIndex, ptmMedleySnippets]);

  // ── Medley mode: seek to snippet start when segment changes ──
  const medleyRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const medleyCanplayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canplayHandlerRef = useRef<{ handler: () => void; media: HTMLMediaElement } | null>(null);

  useEffect(() => {
    if (!isMedleyMode || !currentSnippet || phase !== 'playing') return;

    medleyRetryTimerRef.current = null;
    medleyCanplayTimerRef.current = null;

    const rafId = requestAnimationFrame(() => {
      const media = audioRef.current || (videoRef.current && !isYouTube ? videoRef.current : null);
      if (!media) {
        const retryTimer = setTimeout(() => {
          if (unmountGuardRef.current) return;
          const m2 = audioRef.current || (videoRef.current && !isYouTube ? videoRef.current : null);
          if (m2 && isPlaying) {
            m2.currentTime = currentSnippet.startTime / 1000;
            m2.play().catch(() => {});
          }
        }, 200);
        medleyRetryTimerRef.current = retryTimer;
        return;
      }

      const seekAndPlay = () => {
        if (unmountGuardRef.current) return;
        media.currentTime = currentSnippet.startTime / 1000;
        if (isPlaying) {
          media.play().catch(() => {});
          if (media !== videoRef.current && videoRef.current && !isYouTube && videoRef.current.paused) {
            videoRef.current.currentTime = currentSnippet.startTime / 1000;
            videoRef.current.play().catch(() => {});
          }
        }
      };

      if (media.readyState >= 2) {
        seekAndPlay();
      } else {
        const onCanPlay = () => {
          if (unmountGuardRef.current) {
            media.removeEventListener('canplay', onCanPlay);
            return;
          }
          seekAndPlay();
          media.removeEventListener('canplay', onCanPlay);
        };
        media.addEventListener('canplay', onCanPlay);
        medleyCanplayTimerRef.current = setTimeout(() => {
          media.removeEventListener('canplay', onCanPlay);
        }, 5000);
        // Store cleanup ref so the effect cleanup can remove the listener
        canplayHandlerRef.current = { handler: onCanPlay, media };
      }
    });

    return () => {
      cancelAnimationFrame(rafId);
      if (medleyRetryTimerRef.current) { clearTimeout(medleyRetryTimerRef.current); medleyRetryTimerRef.current = null; }
      if (medleyCanplayTimerRef.current) { clearTimeout(medleyCanplayTimerRef.current); medleyCanplayTimerRef.current = null; }
      // Clean up orphaned canplay listener
      if (canplayHandlerRef.current) {
        canplayHandlerRef.current.media.removeEventListener('canplay', canplayHandlerRef.current.handler);
        canplayHandlerRef.current = null;
      }
    };
  }, [currentSegmentIndex, isMedleyMode, currentSnippet, phase, isPlaying, audioRef, videoRef, isYouTube, unmountGuardRef]);

  // ── Handle media error — in medley mode, retry with a different song ──
  const handleMediaError = useCallback(() => {
    if (!isMedleyMode || phase !== 'playing') return;
    if (isRetryingRef.current) return;
    isRetryingRef.current = true;
    setIsRetryingSnippet(true);
    setIsPlaying(false);

    (async () => {
      try {
        const { getAllSongs } = await import('@/lib/game/song-library');
        const { ensureSongUrls } = await import('@/lib/game/song-url-restore');
        const { generateMedleySnippets } = await import('@/components/game/medley/medley-snippet-generator');

        const songs = getAllSongs();
        const snippets = generateMedleySnippets(songs, 1, 30);
        if (snippets.length === 0) {
          setIsRetryingSnippet(false);
          isRetryingRef.current = false;
          recordRound();
          setPhase('song-results');
          return;
        }

        let prepared = await ensureSongUrls(snippets[0].song);
        if (!prepared.lyrics || prepared.lyrics.length === 0) {
          try {
            const { loadSongLyrics } = await import('@/lib/game/song-lyrics-loader');
            const lyrics = await loadSongLyrics(prepared);
            if (lyrics.length > 0) prepared = { ...prepared, lyrics };
          } catch { /* non-critical */ }
        }

        const newSnippet = { ...snippets[0], song: prepared };

        const setPtmMedleySnippets = usePartyStore.getState().setPtmMedleySnippets;
        const currentSnippets = usePartyStore.getState().ptmMedleySnippets;
        const updatedSnippets = [...currentSnippets];
        if (currentSegmentIndex < updatedSnippets.length) {
          updatedSnippets[currentSegmentIndex] = newSnippet;
          setPtmMedleySnippets(updatedSnippets);
        }

        segmentSwitchHandledRef.current = false;
        fallbackLyricsRef.current = null;
        setIsRetryingSnippet(false);
        isRetryingRef.current = false;

        setTimeout(() => {
          if (!unmountGuardRef.current) {
            setIsPlaying(true);
          }
        }, 500);
      } catch {
        setIsRetryingSnippet(false);
        isRetryingRef.current = false;
        recordRound();
        setPhase('song-results');
      }
    })();
  }, [isMedleyMode, phase, currentSegmentIndex, recordRound, setIsPlaying, setPhase, segmentSwitchHandledRef, fallbackLyricsRef, unmountGuardRef]);

  return { isMedleyMode, currentSnippet, audioSong, handleMediaError, isRetryingSnippet };
}
