/**
 * Sub-hook: medley mode support for Pass-the-Mic.
 * Handles medley state computation, snippet preloading, seek-on-segment-change,
 * background-video sync (videoGap + drift correction) and media error recovery
 * (retry with replacement snippet).
 */
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Song, LyricLine } from '@/types/game';
import { usePartyStore } from '@/lib/game/party-store';

interface MedleySnippet {
  song: Song;
  startTime: number;
  endTime: number;
}

interface UsePtmMedleyOptions {
  /** Phase value — compared against 'playing' only (works for PTM and CPTM). */
  phase: string;
  isPlaying: boolean;
  isYouTube: boolean;
  effectiveSong: Song | null;
  currentSegmentIndex: number;
  /**
   * Number of segments the game was started with. Medley games are built
   * 1:1 (one segment per snippet) — a MISMATCH means the snippets leaked
   * from a previous round (stale state) and the game must run as a normal
   * single song (zombie-notes guard, see karaoke-app.tsx library pick).
   */
  segmentCount?: number;
  fallbackLyricsRef: React.RefObject<LyricLine[] | null>;
  unmountGuardRef: React.RefObject<boolean>;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  recordRound: () => void;
  /** Narrow structural type — accepts PTM's and CPTM's setPhase. */
  setPhase: (phase: 'song-results') => void;
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
  segmentCount,
  fallbackLyricsRef,
  unmountGuardRef,
  audioRef,
  videoRef,
  recordRound,
  setPhase,
  setIsPlaying,
  segmentSwitchHandledRef,
}: UsePtmMedleyOptions): {
  isMedleyMode: boolean;
  currentSnippet: MedleySnippet | null;
  audioSong: Song | null;
  handleMediaError: () => void;
  isRetryingSnippet: boolean;
  /** Stale-clock guard: true only after the persistent media element was
   *  seeked to the CURRENT snippet's start. The time-based segment switch
   *  must not run before that — the audio clock still shows the PREVIOUS
   *  song's position ("medley cascade" bug: a stale position beyond the new
   *  segment's end burned through all remaining segments within a second). */
  medleyClockArmedRef: React.RefObject<boolean>;
} {
  const ptmMedleySnippets = usePartyStore(s => s.ptmMedleySnippets);
  const [isRetryingSnippet, setIsRetryingSnippet] = useState(false);
  const isRetryingRef = useRef(false);
  const medleyClockArmedRef = useRef(false);

  // ── Stale-snippet guard (user report: "Zombie-Noten") ──
  // A medley game always has segments.length === snippets.length (both are
  // generated together, one segment per snippet). If they diverge, the
  // snippets are leftovers from a PREVIOUS round and must never drive this
  // game — clear them and run as a normal single song. Defensive net on top
  // of the primary fix (karaoke-app library pick now clears the store).
  const snippetsMatchSegments =
    ptmMedleySnippets.length === 0 ||
    segmentCount === undefined ||
    ptmMedleySnippets.length === segmentCount;

  // ── Medley mode support ──
  const isMedleyMode = ptmMedleySnippets.length > 1 && snippetsMatchSegments;
  const currentSnippet = isMedleyMode ? ptmMedleySnippets[currentSegmentIndex] : null;
  const audioSong = isMedleyMode && currentSnippet ? currentSnippet.song : effectiveSong;

  useEffect(() => {
    if (ptmMedleySnippets.length > 0 && !snippetsMatchSegments) {
      // eslint-disable-next-line no-console
      console.warn(
        `[PTM-Medley] Stale snippet count (${ptmMedleySnippets.length}) ≠ segment count (${segmentCount}) — clearing leftover medley state`,
      );
      usePartyStore.getState().setPtmMedleySnippets([]);
    }
  }, [snippetsMatchSegments, ptmMedleySnippets.length, segmentCount]);

  // ── Background-video sync (user report: async video in PTM medley) ──
  // The VISIBLE background <video> (GameBackground, remounted per snippet
  // song) runs on its own clock. The normal single-player game seeks it to
  // `start - videoGap` (use-media-playback.ts) — the PTM medley path used
  // the raw snippet start, so every song with a videoGap rendered its video
  // permanently offset. We mirror the normal-game behaviour here.
  const bgVideoGapMsRef = useRef(0);

  const syncBackgroundVideo = useCallback((snippetStartMs: number) => {
    const video = videoRef.current;
    if (!video || isYouTube) return;
    const gapSec = (bgVideoGapMsRef.current || 0) / 1000;
    const targetSec = Math.max(0, snippetStartMs / 1000 - gapSec);
    const seek = () => {
      try {
        if (Math.abs(video.currentTime - targetSec) > 0.05) {
          video.currentTime = targetSec;
        }
        if (isPlaying && video.paused) {
          video.play().catch(() => { /* autoplay guard — GameBackground retries */ });
        }
      } catch {
        /* seeking an unloaded video can throw — the once-listener below retries */
      }
    };
    if (video.readyState >= 1) {
      seek();
    } else {
      // Fresh element (per-song remount) — seek sticks reliably only after
      // metadata loads; also try immediately for cached files.
      video.addEventListener('loadedmetadata', seek, { once: true });
    }
  }, [isPlaying, isYouTube, videoRef]);

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

  // ── Medley mode: on segment change, ensure the persistent media element
  //    plays this snippet's source, then seek to the snippet start ──
  const medleyRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const medleyCanplayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canplayHandlerRef = useRef<{ handler: () => void; media: HTMLMediaElement } | null>(null);
  // Last snippet whose source was (imperatively) loaded into the persistent
  // <audio> element — distinguishes real snippet handoffs from mere effect
  // re-runs (isPlaying toggles) so pause/resume never restarts the media.
  const lastLoadedSnippetRef = useRef<MedleySnippet | null>(null);

  useEffect(() => {
    if (!isMedleyMode || !currentSnippet || phase !== 'playing') return;

    medleyRetryTimerRef.current = null;
    medleyCanplayTimerRef.current = null;

    // ── SYNCHRONOUS stale-clock disarm (MUST run in the effect body, NOT in
    //    the rAF below!) ──
    // This effect is registered BEFORE the segment-switch effect in
    // ptm-game-hook.ts, so within the commit that follows a segment advance
    // it runs FIRST. Disarming here guarantees the switch effect (same
    // commit, still seeing the PREVIOUS song's audio clock) is blocked
    // before it can cascade through further segments. The old rAF placement
    // disarmed only AFTER paint — one commit too late.
    const isNewSnippet = lastLoadedSnippetRef.current !== currentSnippet;
    lastLoadedSnippetRef.current = currentSnippet;
    if (isNewSnippet) {
      medleyClockArmedRef.current = false;
    }

    // Background video sync target for this snippet (videoGap of ITS song)
    bgVideoGapMsRef.current = currentSnippet.song.videoGap || 0;

    const rafId = requestAnimationFrame(() => {
      const media = audioRef.current || (videoRef.current && !isYouTube ? videoRef.current : null);
      if (!media) {
        const retryTimer = setTimeout(() => {
          if (unmountGuardRef.current) return;
          const m2 = audioRef.current || (videoRef.current && !isYouTube ? videoRef.current : null);
          if (m2 && isPlaying) {
            m2.currentTime = currentSnippet.startTime / 1000;
            medleyClockArmedRef.current = true;
            m2.play().catch(() => {});
            syncBackgroundVideo(currentSnippet.startTime);
          }
        }, 200);
        medleyRetryTimerRef.current = retryTimer;
        return;
      }

      // ── Persistent audio element: load THIS snippet's source deterministically ──
      // The <audio> element is no longer remounted per snippet (the per-song
      // key was removed), so React reuses the same DOM element across player
      // handoffs. When the SNIPPET changes we set src + load() imperatively —
      // but only when the element is not already on track for this snippet,
      // and never on mere isPlaying toggles (pause/resume re-run this effect
      // too and must not restart the media):
      //   • different url (or nothing usable yet) → src + load() resets
      //     readyState synchronously, so the canplay-wait below observes the
      //     NEW resource deterministically instead of racing the async
      //     attribute-change reload.
      //   • same url but errored (the error-retry path may re-pick the same
      //     file) → load() resets the error and re-attempts. The old
      //     remount-per-song wiring got this reset for free.
      //   • same url, already loading or ready → no reload: an in-flight load
      //     is never aborted, and a ready element makes the handoff a gapless
      //     seek (the countdown preload of snippet 0 at game start stays
      //     intact too).
      // (isNewSnippet was computed SYNCHRONOUSLY in the effect body above —
      // the stale-clock disarm must not wait for this rAF.)
      const snippetAudioEl = audioRef.current;
      const snippetAudioUrl = currentSnippet.song.audioUrl;
      if (isNewSnippet && snippetAudioEl && snippetAudioUrl) {
        const sameUrl = snippetAudioEl.getAttribute('src') === snippetAudioUrl;
        const onTrack = sameUrl && !snippetAudioEl.error &&
          (snippetAudioEl.readyState >= 2 || snippetAudioEl.networkState === HTMLMediaElement.NETWORK_LOADING);
        if (!onTrack) {
          snippetAudioEl.src = snippetAudioUrl;
          snippetAudioEl.load();
        }
      }

      const seekAndPlay = () => {
        if (unmountGuardRef.current) return;
        media.currentTime = currentSnippet.startTime / 1000;
        // Clock now belongs to THIS snippet's song — time-based segment
        // switching may run again (see medleyClockArmedRef doc above).
        medleyClockArmedRef.current = true;
        if (isPlaying) {
          media.play().catch(() => {});
          // Keep the VISIBLE background video glued to the snippet position
          // (videoGap-aware) — it is a separate element on its own clock.
          if (media !== videoRef.current) {
            syncBackgroundVideo(currentSnippet.startTime);
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
  }, [currentSegmentIndex, isMedleyMode, currentSnippet, phase, isPlaying, audioRef, videoRef, isYouTube, unmountGuardRef, syncBackgroundVideo]);

  // ── Background-video drift corrector while a snippet plays ──
  // The persistent <audio> and the per-snippet background <video> decode via
  // different pipelines and wander apart over a snippet (same root cause the
  // medley contest fixed with its 1.5s corrector). Compare clocks every 1.5s
  // and re-seek the video when the drift exceeds ~350ms.
  useEffect(() => {
    if (!isMedleyMode || phase !== 'playing' || !isPlaying) return;

    const interval = setInterval(() => {
      const audio = audioRef.current;
      const video = videoRef.current;
      if (!audio || !video || audio === video) return;
      if (!audio.src || audio.paused || video.paused) return;
      if (video.readyState < 2 || audio.readyState < 2) return;

      const gapSec = (bgVideoGapMsRef.current || 0) / 1000;
      const expectedSec = Math.max(0, audio.currentTime - gapSec);
      const drift = video.currentTime - expectedSec;
      if (Math.abs(drift) > 0.35) {
        try {
          video.currentTime = expectedSec;
        } catch {
          /* seek during decode can throw — retried next interval */
        }
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [isMedleyMode, phase, isPlaying, audioRef, videoRef]);

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

  return { isMedleyMode, currentSnippet, audioSong, handleMediaError, isRetryingSnippet, medleyClockArmedRef };
}
