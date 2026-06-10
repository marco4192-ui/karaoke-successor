'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Song, Difficulty, GameResult, PitchDetectionResult, GameMode } from '@/types/game';
import type { AudioEffectsEngine } from '@/lib/audio/audio-effects';
import { useGameStore } from '@/lib/game/store';
import { useGameResults } from '@/hooks/use-game-results';
import { playSongMedia, scheduleMediaWatchdog } from '@/hooks/use-media-playback';
import { computeGameElapsedMs, buildP2PitchResult, getEffectiveSongEnd } from '@/hooks/game-loop-utils';
import { getVisibleNotes, NOTE_WINDOW } from '@/lib/game/note-utils';
import type { TimingData } from '@/components/screens/game-screen-types';
import type { Note, LyricLine } from '@/types/game';

// ── Re-exports ──
export { useGameResults } from '@/hooks/use-game-results';
export { playSongMedia, scheduleMediaWatchdog } from '@/hooks/use-media-playback';
export { computeGameElapsedMs, buildP2PitchResult, getEffectiveSongEnd } from '@/hooks/game-loop-utils';

interface UseGameLoopOptions {
  // Song / media
  effectiveSong: Song | null;
  mediaLoaded: boolean;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isYouTube: boolean;
  youtubeVideoId: string | null;
  youtubeTime: number;
  // Playing state (owned by caller so it's available everywhere)
  isPlaying: boolean;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  // Pitch detector
  pitchResult: PitchDetectionResult | null;
  initialize: () => Promise<boolean>;
  start: () => void;
  stop: () => void;
  setPitchDifficulty: (_diff: Difficulty) => void;
  // Game store
  setCurrentTime: (_time: number) => void;
  setDetectedPitch: (_pitch: number | null) => void;
  endGame: () => void;
  setResults: (_results: GameResult) => void;
  // Note scoring
  resetScoring: () => void;
  checkNoteHits: (_time: number, _pitch: PitchDetectionResult) => void;
  checkP2NoteHits: (_time: number, _pitch: PitchDetectionResult) => void;
  // Game mode / state
  difficulty: Difficulty;
  gameMode: GameMode;
  timingOffset: number;
  // Duet
  isDuetMode: boolean;
  p2DetectedPitch: number | null;
  p2Volume: number;
  p2IsSinging?: boolean;
  setP2Volume: (_vol: number) => void;
  // Lifecycle callbacks
  onEnd: () => void;
  // Audio effects (for cleanup)
  audioEffects: AudioEffectsEngine | null;
  setAudioEffects: (_engine: AudioEffectsEngine | null) => void;
  // Song + players (for results generation)
  song: Song | null;
  players: Array<{ id: string; score: number; notesHit: number; notesMissed: number; combo: number; maxCombo: number; goldenNotesHit?: number }>;
  // P2 scoring state (for duel/duet results)
  p2ScoringState?: { score: number; notesHit: number; notesMissed: number; maxCombo: number; perfectNotesCount?: number; goldenNotesHit?: number } | null;
  // P1 perfect notes count (for daily challenge / leaderboard)
  p1PerfectNotesCount?: number;
  // Practice mode playback rate (for achievements that track speed)
  playbackRate?: number;
  // Native audio (ASIO / WASAPI)
  isNativeAudio?: boolean;
  nativeAudioTime?: number;
  nativeAudioPlay?: (_filePath: string) => Promise<void>;
  nativeAudioPause?: () => Promise<void>;
  nativeAudioResume?: () => Promise<void>;
  nativeAudioStop?: () => Promise<void>;
  nativeAudioSeek?: (_positionMs: number) => Promise<void>;
  // Refs for direct visible-notes updates (BR-pattern: ref updated every rAF frame,
  // component reads latest on render for smooth scrolling).
  timingDataRef?: React.RefObject<TimingData | null>;
  visibleNotesRef?: React.MutableRefObject<Array<Note & { lineIndex: number; line: LyricLine }>>;
  p1VisibleNotesRef?: React.MutableRefObject<Array<Note & { lineIndex: number; line: LyricLine }>>;
  p2VisibleNotesRef?: React.MutableRefObject<Array<Note & { lineIndex: number; line: LyricLine }>>;
}

interface UseGameLoopResult {
  countdown: number;
  volume: number;
  pauseGame: () => void;
  resumeGame: () => void;
  endGameAndCleanup: () => void;
  /** Immediately stop the game loop and cancel the animation frame — used when aborting. */
  abortGameLoop: () => void;
}

/**
 * Hook that encapsulates the game lifecycle effects:
 * - Countdown initialization + media playback
 * - Game loop (requestAnimationFrame)
 * - Song-end detection and cleanup
 *
 * NOTE: `isPlaying` and `setIsPlaying` are owned by the caller so they are
 * accessible in effects/callbacks that are declared before this hook.
 */
export function useGameLoop(options: UseGameLoopOptions): UseGameLoopResult {
  const {
    effectiveSong,
    mediaLoaded,
    audioRef,
    videoRef,
    isYouTube,
    youtubeVideoId,
    youtubeTime,
    isPlaying,
    setIsPlaying,
    pitchResult,
    initialize,
    start,
    stop,
    setPitchDifficulty,
    setCurrentTime,
    setDetectedPitch,
    endGame,
    setResults,
    resetScoring,
    checkNoteHits,
    checkP2NoteHits,
    difficulty,
    gameMode,
    timingOffset,
    isDuetMode,
    p2DetectedPitch,
    p2Volume,
    p2IsSinging,
    setP2Volume,
    onEnd,
    audioEffects,
    setAudioEffects,
    song,
    players,
    p2ScoringState,
    p1PerfectNotesCount = 0,
    playbackRate = 1.0,
    isNativeAudio = false,
    nativeAudioTime = 0,
    nativeAudioPlay,
    nativeAudioPause,
    nativeAudioResume,
    nativeAudioStop,
    nativeAudioSeek,
    timingDataRef,
    visibleNotesRef,
    p1VisibleNotesRef,
    p2VisibleNotesRef,
  } = options;

  // Subscribe to the store's game status so the Escape-key pause dialog
  // (which calls store.pauseGame / store.resumeGame) actually pauses/resumes
  // audio, video and native-audio.
  const gameStatus = useGameStore((s) => s.gameState.status);
  const wasPausedByStoreRef = useRef(false); // tracks whether WE initiated the pause

  // ── Internal state (not needed outside the hook) ──
  const [countdown, setCountdown] = useState(3);
  const [volume, setVolume] = useState(0);
  const lastVolumeUpdateRef = useRef(0);
  const gameLoopRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);
  // Ref to playMedia closure (defined inside initGame effect) so the
  // pause-resume effect can call it when restarting an interrupted countdown.
  const playMediaRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const hasEndedRef = useRef(false); // Guard against double endGameAndCleanup
  const abortedRef = useRef(false);   // Set when user aborts to prevent endGameAndCleanup
  const comebackRef = useRef(false);  // Tracks if player had a comeback (combo >= 50 after missing >= 10)
  // Stores cleanup function returned by scheduleMediaWatchdog (replaces raw timeout ref)
  const mediaPlayWatchdogRef = useRef<(() => void) | null>(null);
  // ── Pause position tracking ──
  // When pausing during countdown, remember the countdown value so resume can restart it.
  const pausedAtCountdownRef = useRef<number | null>(null);
  // ── Refs for frequently-changing values (pitch, YouTube, native audio) ──
  // These MUST NOT be in the game loop dependency array, otherwise the loop
  // would be torn down and recreated on every pitch detection callback (~50Hz),
  // causing severe performance degradation and potential timing gaps.
  const pitchResultRef = useRef(pitchResult);
  const p2DetectedPitchRef = useRef(p2DetectedPitch);
  const p2VolumeRef = useRef(p2Volume);
  const p2IsSingingRef = useRef(p2IsSinging);
  const youtubeTimeRef = useRef(youtubeTime);
  const nativeAudioTimeRef = useRef(nativeAudioTime);
  // Refs for checkNoteHits / checkP2NoteHits — prevents game loop restart
  // when these callbacks are recreated (e.g. inline arrow functions in caller).
  const checkNoteHitsRef = useRef(checkNoteHits);
  const checkP2NoteHitsRef = useRef(checkP2NoteHits);

  // ── Result generation hook (extracted) ──
  const { generateResults, playersRef, p1PerfectNotesCountRef } = useGameResults({
    song,
    gameMode,
    isDuetMode,
    playbackRate,
    players,
    p2ScoringState,
    p1PerfectNotesCount,
    setResults,
    comebackRef,
  });

  // Sync all frequently-changing values to refs via effect (avoids ref access during render)
  useEffect(() => {
    pitchResultRef.current = pitchResult;
    p2DetectedPitchRef.current = p2DetectedPitch;
    p2VolumeRef.current = p2Volume;
    p2IsSingingRef.current = p2IsSinging;
    youtubeTimeRef.current = youtubeTime;
    nativeAudioTimeRef.current = nativeAudioTime;
    checkNoteHitsRef.current = checkNoteHits;
    checkP2NoteHitsRef.current = checkP2NoteHits;
  }, [pitchResult, p2DetectedPitch, p2Volume, p2IsSinging, youtubeTime, nativeAudioTime, checkNoteHits, checkP2NoteHits]);
  // DO-NOT-CHANGE: lastPitchStoreUpdateRef was removed to eliminate a
  // separate throttle gate for setDetectedPitch. Previously, setCurrentTime
  // and setDetectedPitch fired on alternating rAF frames (two independent
  // 16ms gates), creating ~120 Zustand gameState objects/sec. Now both are
  // called in the same rAF callback inside a single 16ms gate, so React 18
  // automatic batching produces ~60 gameState objects/sec instead.
  // Single throttle gate for BOTH setCurrentTime and setDetectedPitch store writes.
  // DO-NOT-CHANGE: This 16ms gate (~60fps) is the sole timing gate for all
  // Zustand store writes in the game loop. The two writes happen inside the
  // same if-block so React 18 automatic batching merges them into one render.
  const lastCurrentTimeUpdateRef = useRef(0);
  // When the game is paused mid-song we must remember where the song was so
  // that resume picks up from that exact wall-clock offset instead of from 0.
  const pausedAtElapsedMsRef = useRef<number | null>(null);

  // ── Helper: schedule the media playback watchdog ──
  const scheduleWatchdog = useCallback((isNonScoringMode: boolean) => {
    // Clear any previous watchdog
    mediaPlayWatchdogRef.current?.();
    mediaPlayWatchdogRef.current = scheduleMediaWatchdog({
      audioRef,
      videoRef,
      isYouTube,
      isNativeAudio,
      youtubeTimeRef,
      nativeAudioTimeRef,
      wasPausedByStoreRef,
      endGameAndCleanupRef,
      isNonScoringMode,
    });
  }, [audioRef, videoRef, isYouTube, isNativeAudio]);

  // ── End game and cleanup - stops all audio/microphone ──
  const endGameAndCleanup = useCallback(() => {
    // Guard: prevent execution if game was aborted (user pressed Back)
    if (abortedRef.current) return;
    // Guard: prevent double execution (e.g. game loop time check + onEnded event)
    if (hasEndedRef.current) return;
    hasEndedRef.current = true;

    // Clear the media play watchdog timeout (if song ended before the 10s watchdog fired)
    if (mediaPlayWatchdogRef.current) {
      mediaPlayWatchdogRef.current();
      mediaPlayWatchdogRef.current = null;
    }

    // Stop pitch detection (microphone)
    stop();

    // Stop audio effects
    // Use ref (not closure) to get the latest instance — matches unmount cleanup pattern.
    const effects = audioEffectsRef.current;
    if (effects) {
      effects.disconnect();
      setAudioEffects(null);
    }

    // Stop audio element
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    // Stop video element
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }

    // Stop native audio (ASIO / WASAPI)
    if (nativeAudioStop) {
      nativeAudioStop().catch(() => {});
    }

    // Set playing to false
    setIsPlaying(false);

    // End game state and generate results
    endGame();
    generateResults();

    // Notify mobile clients that song ended
    if (song) {
      fetch('/api/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'gamestate',
          payload: {
            currentSong: { id: song.id, title: song.title, artist: song.artist },
            isPlaying: false,
            currentTime: 0,
            songEnded: true,
            gameMode,
          },
        }),
      }).catch(() => {});
    }

    onEnd();
  }, [stop, setAudioEffects, audioRef, videoRef, endGame, generateResults, onEnd, song, gameMode, setIsPlaying, nativeAudioStop]);

  // Fix (Code Review #5): Use ref for endGameAndCleanup in the game loop.
  // Both generateResults and endGameAndCleanup read players via playersRef
  // (not from closure), so they are stable across scoring ticks (~10 Hz).
  // Using a ref lets the loop call the latest version without re-running.
  const endGameAndCleanupRef = useRef(endGameAndCleanup);
  useEffect(() => { endGameAndCleanupRef.current = endGameAndCleanup; }, [endGameAndCleanup]);

  // ── Pause / Resume helpers ──
  const pauseGame = useCallback(() => {
    if (audioRef.current) audioRef.current.pause();
    if (videoRef.current) videoRef.current.pause();
    if (nativeAudioPause) nativeAudioPause().catch(() => {});
    setIsPlaying(false);
  }, [audioRef, videoRef, setIsPlaying, nativeAudioPause]);

  const resumeGame = useCallback(() => {
    if (audioRef.current) audioRef.current.play().catch(() => {});
    if (videoRef.current) videoRef.current.play().catch(() => {});
    if (nativeAudioResume) nativeAudioResume().catch(() => {});
    setIsPlaying(true);
  }, [audioRef, videoRef, setIsPlaying, nativeAudioResume]);

  // ── Initialize and start game - countdown + media playback ──
  // DO-NOT-CHANGE: Dependencies use `effectiveSong?.id` instead of `effectiveSong`.
  // When lyrics load async from IndexedDB, effectiveSong gets a new object reference
  // but the song ID stays the same. Using the full effectiveSong as a dependency
  // would re-run this effect, calling stop() on the pitch detector and causing
  // pitch detection to stop mid-game. Using the song ID (a stable string) prevents
  // this while still correctly re-initializing when the song actually changes.
  const effectiveSongIdRef = useRef(effectiveSong?.id ?? null);
  useEffect(() => {
    const currentSongId = effectiveSong?.id ?? null;
    if (currentSongId !== effectiveSongIdRef.current) {
      effectiveSongIdRef.current = currentSongId;
    }

    if (!effectiveSong || !mediaLoaded) return;

    isMountedRef.current = true;

    const initGame = async () => {
      // Rate My Song mode does not require pitch detection (manual ratings only).
      // Skip microphone initialization so the game starts even if no mic is available.
      const isNonScoringMode = gameMode === 'rate-my-song';

      let success = true;
      if (!isNonScoringMode) {
        success = await initialize();
      }
      if (!isMountedRef.current) return; // Check if still mounted after async

      if (success) {
        // Set pitch detector to current difficulty
        if (!isNonScoringMode) {
          setPitchDifficulty(difficulty);
          start();
        }

        // Reset per-game tracking refs
        comebackRef.current = false;

        // Reset scoring state (note progress tracking is handled by the hook)
        resetScoring();

        // ── Media playback function (extracted to use-media-playback.ts) ──
        const playMedia = () => playSongMedia({
          audioRef,
          videoRef,
          song: effectiveSong,
          isNativeAudio,
          nativeAudioPlay,
          nativeAudioSeek,
        });

        // Store playMedia in ref so the pause-resume effect can call it
        // when restarting an interrupted countdown.
        playMediaRef.current = playMedia;

        // ── Medley mode: skip countdown (MedleyGameView already counted down) ──
        if (gameMode === 'medley') {
          setCountdown(0);
          setIsPlaying(true);
          startTimeRef.current = Date.now();
          playMedia();
          scheduleWatchdog(false);
          return;
        }

        // ── Normal mode: 3-second countdown then play ──
        // Start countdown from 3
        setCountdown(3);

        // Use a ref to track countdown value for proper timing
        let currentCount = 3;

        countdownIntervalRef.current = setInterval(() => {
          if (!isMountedRef.current) {
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
              countdownIntervalRef.current = null;
            }
            return;
          }

          currentCount -= 1;

          if (currentCount <= 0) {
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
              countdownIntervalRef.current = null;
            }

            setCountdown(0);
            setIsPlaying(true);
            startTimeRef.current = Date.now();
            playMedia();

            scheduleWatchdog(isNonScoringMode);
          } else {
            setCountdown(currentCount);
          }
        }, 1000);
      }
    };

    initGame();

    return () => {
      isMountedRef.current = false;

      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      if (mediaPlayWatchdogRef.current) {
        mediaPlayWatchdogRef.current();
        mediaPlayWatchdogRef.current = null;
      }
      stop();
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
      if (audioRef.current) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
        audioRef.current.pause();
      }
      if (videoRef.current) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
        videoRef.current.pause();
      }
      setIsPlaying(false);
      setCountdown(3);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- gameMode read from options but not needed as dep for init effect; effectiveSong?.id used instead of effectiveSong to prevent re-init on lyrics load
  }, [effectiveSong?.id, mediaLoaded, initialize, start, stop, setPitchDifficulty, difficulty, resetScoring, audioRef, videoRef, isYouTube, youtubeVideoId, setIsPlaying, nativeAudioPlay, nativeAudioSeek]);

  // ── CRITICAL: Cleanup on unmount ──
  const audioEffectsRef = useRef(audioEffects);
  useEffect(() => { audioEffectsRef.current = audioEffects; }, [audioEffects]);

  useEffect(() => {
    return () => {
      stop();

      const effects = audioEffectsRef.current;
      if (effects) {
        effects.disconnect();
      }

      if (audioRef.current) {
        audioRef.current.pause();
  // eslint-disable-next-line react-hooks/exhaustive-deps
        audioRef.current.currentTime = 0;
      }

      if (videoRef.current) {
        videoRef.current.pause();
  // eslint-disable-next-line react-hooks/exhaustive-deps
        videoRef.current.currentTime = 0;
      }

      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [stop, audioRef, videoRef]);

  // ── Sync media playback to store's pause status ──
  // When the Escape key sets gameState.status = 'paused' we must actually
  // pause audio/video/native-audio and stop the animation-frame loop.
  // When resumeGame() sets status back to 'playing' we resume everything.
  useEffect(() => {
    const startPositionMs = effectiveSong?.start || 0;

    if (gameStatus === 'paused' && !wasPausedByStoreRef.current) {
      wasPausedByStoreRef.current = true;

      // ── Remember where the song was when we paused ──
      // The audio/video element's currentTime is the source of truth.
      // We store the elapsed ms so the game loop can resume from this point.
      let elapsedAtPause = 0;
      if (audioRef.current && audioRef.current.readyState >= 2) {
        elapsedAtPause = audioRef.current.currentTime * 1000;
      } else if (videoRef.current && videoRef.current.readyState >= 2 && effectiveSong?.hasEmbeddedAudio) {
        elapsedAtPause = videoRef.current.currentTime * 1000;
      } else {
        // Wall-clock fallback
        elapsedAtPause = (Date.now() - startTimeRef.current) + startPositionMs;
      }
      pausedAtElapsedMsRef.current = elapsedAtPause;

      // Pause all media sources
      if (audioRef.current) audioRef.current.pause();
      if (videoRef.current) videoRef.current.pause();
      if (nativeAudioPause) nativeAudioPause().catch(() => {});
      setIsPlaying(false);
      // Cancel the animation-frame game loop
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
        gameLoopRef.current = null;
      }
      // Cancel the countdown if still counting down
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      // Remember countdown value so resume can restart it instead of
      // jumping straight to the game loop (which would start without media).
      pausedAtCountdownRef.current = countdown;
    } else if (gameStatus === 'playing' && wasPausedByStoreRef.current) {
      wasPausedByStoreRef.current = false;

      // If the countdown was interrupted by pause, restart it instead of
      // jumping to the game loop (which would start without media setup).
      if (pausedAtCountdownRef.current !== null && pausedAtCountdownRef.current > 0) {
        const remaining = pausedAtCountdownRef.current;
        pausedAtCountdownRef.current = null;

        setCountdown(remaining);
        let currentCount = remaining;

        countdownIntervalRef.current = setInterval(() => {
          if (!isMountedRef.current) {
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
              countdownIntervalRef.current = null;
            }
            return;
          }

          currentCount -= 1;

          if (currentCount <= 0) {
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
              countdownIntervalRef.current = null;
            }

            setCountdown(0);
            setIsPlaying(true);
            startTimeRef.current = Date.now();
            playMediaRef.current();

            const nonScoring = gameMode === 'rate-my-song';
            scheduleWatchdog(nonScoring);
          } else {
            setCountdown(currentCount);
          }
        }, 1000);
        return;
      }

      pausedAtCountdownRef.current = null;

      // Resume all media sources — audio/video elements keep their currentTime,
      // so calling .play() continues from where they were paused.
      if (audioRef.current) audioRef.current.play().catch(() => {});
      if (videoRef.current) videoRef.current.play().catch(() => {});
      if (nativeAudioResume) nativeAudioResume().catch(() => {});
      setIsPlaying(true);

      // Adjust startTimeRef so the wall-clock fallback in the game loop
      // picks up from the paused position instead of from 0.
      // Formula: elapsed = (Date.now() - startTimeRef) + startPositionMs
      // We want:  elapsed = pausedAtElapsedMs
      // Therefore: startTimeRef = Date.now() - (pausedAtElapsedMs - startPositionMs)
      if (pausedAtElapsedMsRef.current !== null) {
        startTimeRef.current = Date.now() - (pausedAtElapsedMsRef.current - startPositionMs);
        pausedAtElapsedMsRef.current = null;
      } else {
        startTimeRef.current = Date.now();
      }
    }
    // Reset the flag when game ends or is idle (so the next game starts fresh)
    if (gameStatus === 'ended' || gameStatus === 'idle') {
      wasPausedByStoreRef.current = false;
      pausedAtElapsedMsRef.current = null;
      pausedAtCountdownRef.current = null;
    }
  }, [gameStatus, audioRef, videoRef, nativeAudioPause, nativeAudioResume, setIsPlaying, effectiveSong]);

  // ── Game loop (requestAnimationFrame) ──
  useEffect(() => {
    if (!isPlaying || !effectiveSong) return;

    const gameLoop = () => {
      // Compute elapsed time using extracted utility
      const elapsed = computeGameElapsedMs({
        audioRef,
        videoRef,
        song: effectiveSong,
        isNativeAudio,
        isYouTube,
        youtubeTimeRef,
        nativeAudioTimeRef,
        startTimeRef,
      });

      const adjustedTime = elapsed + timingOffset;

      // Update visible notes refs every frame (BR-pattern).
      // This gives NoteHighway frame-accurate note positions without
      // going through the Zustand store. The component re-renders at
      // ~40fps from the batched store writes below, and reads these refs
      // for the latest frame data.
      if (timingDataRef?.current) {
        const td = timingDataRef.current;
        if (visibleNotesRef) {
          visibleNotesRef.current = getVisibleNotes(td.allNotes, adjustedTime, NOTE_WINDOW);
        }
        if (p1VisibleNotesRef) {
          p1VisibleNotesRef.current = getVisibleNotes(td.p1Notes, adjustedTime, NOTE_WINDOW);
        }
        if (p2VisibleNotesRef) {
          p2VisibleNotesRef.current = getVisibleNotes(td.p2Notes, adjustedTime, NOTE_WINDOW);
        }
      }

      // Throttled: batch both Zustand store writes into a single rAF callback
      // at ~40fps (25ms), matching BR's approach. React 18 automatic batching
      // merges state updates from the same callback into one re-render, so
      // calling setCurrentTime and setDetectedPitch here produces ONE gameState
      // object (~40/sec) instead of two on alternating frames.
      // Previous 60fps caused excessive Zustand store writes that triggered
      // cascading re-renders across 13+ subscribers in game-screen-hook.ts.
      // Scoring (checkNoteHits) runs at full rAF rate outside this throttle.
      const now = performance.now();
      // Read pitch from ref (not closure) to avoid stale values
      const currentPitch = pitchResultRef.current;
      if (now - lastCurrentTimeUpdateRef.current >= 25) {
        setCurrentTime(adjustedTime);
        lastCurrentTimeUpdateRef.current = now;
        // DO-NOT-CHANGE: setDetectedPitch MUST stay inside this if-block so
        // React 18 batches it with setCurrentTime in the same rAF callback.
        if (currentPitch) {
          setDetectedPitch(currentPitch.rawNote ?? currentPitch.note ?? null);
        }
      }

      if (currentPitch) {
        const pitchNow = performance.now();
        // Throttle volume update to ~60fps (16ms) for responsive volume meter.
        // Volume is a local useState (not Zustand), so this doesn't cause
        // extra re-renders of other components.
        if (pitchNow - lastVolumeUpdateRef.current >= 16) {
          setVolume(currentPitch.volume);
          lastVolumeUpdateRef.current = pitchNow;
        }
        checkNoteHitsRef.current(adjustedTime, currentPitch);

        // Comeback detection for achievement: current combo >= 50 after missing >= 10 notes
        const activePlayer = playersRef.current[0];
        if (activePlayer && !comebackRef.current) {
          const currentCombo = activePlayer.combo;
          const totalMissed = activePlayer.notesMissed;
          if (currentCombo >= 50 && totalMissed >= 10) {
            comebackRef.current = true;
          }
        }
      }

      // Read P2 pitch from ref (not closure) to avoid stale values
      const currentP2Pitch = p2DetectedPitchRef.current;
      const currentP2Vol = p2VolumeRef.current;
      if (isDuetMode && currentP2Pitch !== null && currentP2Pitch > 0) {
        const p2PitchResult = buildP2PitchResult({
          frequency: currentP2Pitch,
          volume: currentP2Vol,
          isSinging: p2IsSingingRef.current ?? true,
        });
        checkP2NoteHitsRef.current(adjustedTime, p2PitchResult);
      } else if (isDuetMode) {
        setP2Volume(0);
      }

      // End song by time ONLY when #END: tag is explicitly defined.
      const effectiveEnd = getEffectiveSongEnd(effectiveSong, gameMode);
      if (effectiveEnd && adjustedTime >= effectiveEnd) {
        endGameAndCleanupRef.current();
        return;
      }

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- isNativeAudio read from options but not needed as dep for game loop (read via ref); effectiveSong?.id used instead of effectiveSong to prevent rAF restart on lyrics load
  }, [isPlaying, effectiveSong?.id, setCurrentTime, setDetectedPitch, isYouTube, timingOffset, isDuetMode, setP2Volume, audioRef, videoRef]);

  // ── Abort: immediately stop game loop without saving results ──
  const abortGameLoop = useCallback(() => {
    abortedRef.current = true;
    hasEndedRef.current = true; // Also block endGameAndCleanup
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
      gameLoopRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  return {
    countdown,
    volume,
    pauseGame,
    resumeGame,
    endGameAndCleanup,
    abortGameLoop,
  };
}
