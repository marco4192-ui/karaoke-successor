'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Song, Difficulty, GameResult, PitchDetectionResult, GameMode } from '@/types/game';
import type { AudioEffectsEngine } from '@/lib/audio/audio-effects';
import { useGameStore } from '@/lib/game/store';

export interface UseGameLoopOptions {
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
  setPitchDifficulty: (diff: Difficulty) => void;
  // Game store
  setCurrentTime: (time: number) => void;
  setDetectedPitch: (pitch: number | null) => void;
  endGame: () => void;
  setResults: (results: GameResult) => void;
  // Note scoring
  resetScoring: () => void;
  checkNoteHits: (time: number, pitch: PitchDetectionResult) => void;
  checkP2NoteHits: (time: number, pitch: PitchDetectionResult) => void;
  // Game mode / state
  difficulty: Difficulty;
  gameMode: GameMode;
  timingOffset: number;
  // Duet
  isDuetMode: boolean;
  p2DetectedPitch: number | null;
  p2Volume: number;
  setP2Volume: (vol: number) => void;
  // Lifecycle callbacks
  onEnd: () => void;
  // Audio effects (for cleanup)
  audioEffects: AudioEffectsEngine | null;
  setAudioEffects: (engine: AudioEffectsEngine | null) => void;
  // Song + players (for results generation)
  song: Song | null;
  players: Array<{ id: string; score: number; notesHit: number; notesMissed: number; maxCombo: number }>;
  // P2 scoring state (for duel/duet results)
  p2ScoringState?: { score: number; notesHit: number; notesMissed: number; maxCombo: number } | null;
  // Native audio (ASIO / WASAPI)
  isNativeAudio?: boolean;
  nativeAudioTime?: number;
  nativeAudioPlay?: (filePath: string) => Promise<void>;
  nativeAudioPause?: () => Promise<void>;
  nativeAudioResume?: () => Promise<void>;
  nativeAudioStop?: () => Promise<void>;
  nativeAudioSeek?: (positionMs: number) => Promise<void>;
}

export interface UseGameLoopResult {
  countdown: number;
  volume: number;
  startTimeRef: React.RefObject<number>;
  gameLoopRef: React.RefObject<number | null>;
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
    setP2Volume,
    onEnd,
    audioEffects,
    setAudioEffects,
    song,
    players,
    p2ScoringState,
    isNativeAudio = false,
    nativeAudioTime = 0,
    nativeAudioPlay,
    nativeAudioPause,
    nativeAudioResume,
    nativeAudioStop,
    nativeAudioSeek,
  } = options;

  // Subscribe to the store's game status so the Escape-key pause dialog
  // (which calls store.pauseGame / store.resumeGame) actually pauses/resumes
  // audio, video and native-audio.
  const gameStatus = useGameStore((s) => s.gameState.status);
  const wasPausedByStoreRef = useRef(false); // tracks whether WE initiated the pause

  // ── Internal state (not needed outside the hook) ──
  const [countdown, setCountdown] = useState(3);
  const [volume, setVolume] = useState(0);
  const gameLoopRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);
  const hasEndedRef = useRef(false); // Guard against double endGameAndCleanup
  const abortedRef = useRef(false);   // Set when user aborts to prevent endGameAndCleanup
  const mediaPlayWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // ── Pause position tracking ──
  // When the game is paused mid-song we must remember where the song was so
  // that resume picks up from that exact wall-clock offset instead of from 0.
  const pausedAtElapsedMsRef = useRef<number | null>(null);

  // ── Generate results at song end ──
  const generateResults = useCallback(() => {
    const activePlayer = players[0];
    if (!activePlayer || !song) return;

    // Helper: calculate rating from accuracy
    const calcRating = (acc: number): 'perfect' | 'excellent' | 'good' | 'okay' | 'poor' => {
      if (acc >= 95) return 'perfect';
      if (acc >= 85) return 'excellent';
      if (acc >= 70) return 'good';
      if (acc >= 50) return 'okay';
      return 'poor';
    };

    // Count total notes for each player (P1 gets all notes, P2 only P2-assigned notes in duet/duel)
    const totalNotes = song.lyrics.reduce((acc, line) => acc + line.notes.length, 0);
    const p1Accuracy = totalNotes > 0 ? (activePlayer.notesHit / totalNotes) * 100 : 0;

    const playerResults = [{
      playerId: activePlayer.id,
      score: activePlayer.score,
      notesHit: activePlayer.notesHit,
      notesMissed: activePlayer.notesMissed,
      accuracy: p1Accuracy,
      maxCombo: activePlayer.maxCombo,
      rating: calcRating(p1Accuracy),
    }];

    // Add P2 results for duel/duet mode if P2 scoring data is available
    const p2 = p2ScoringState || null;
    const p2Player = players[1] || null;
    if (isDuetMode && p2 && (p2.notesHit > 0 || p2.notesMissed > 0)) {
      // For P2, count only notes assigned to P2 (or all notes if no explicit assignment)
      const p2TotalNotes = totalNotes; // In duel mode, P2 sings the same notes
      const p2Accuracy = p2TotalNotes > 0 ? (p2.notesHit / p2TotalNotes) * 100 : 0;
      playerResults.push({
        playerId: p2Player?.id || 'p2',
        score: p2.score,
        notesHit: p2.notesHit,
        notesMissed: p2.notesMissed,
        accuracy: p2Accuracy,
        maxCombo: p2.maxCombo,
        rating: calcRating(p2Accuracy),
      });
    }

    const results = {
      songId: song.id,
      players: playerResults,
      playedAt: Date.now(),
      duration: song.duration,
    };

    setResults(results);

    // Send results to mobile clients for social features
    fetch('/api/mobile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'results',
        payload: {
          songId: song.id,
          songTitle: song.title,
          songArtist: song.artist,
          score: activePlayer.score,
          accuracy: p1Accuracy,
          maxCombo: activePlayer.maxCombo,
          rating: calcRating(p1Accuracy),
          playedAt: Date.now(),
        },
      }),
    }).catch(() => {});
  }, [players, song, setResults, isDuetMode, p2ScoringState]);

  // ── End game and cleanup - stops all audio/microphone ──
  const endGameAndCleanup = useCallback(() => {
    // Guard: prevent execution if game was aborted (user pressed Back)
    if (abortedRef.current) return;
    // Guard: prevent double execution (e.g. game loop time check + onEnded event)
    if (hasEndedRef.current) return;
    hasEndedRef.current = true;

    // Stop pitch detection (microphone)
    stop();

    // Stop audio effects
    if (audioEffects) {
      audioEffects.disconnect();
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
  }, [stop, audioEffects, setAudioEffects, audioRef, videoRef, endGame, generateResults, onEnd, song, gameMode, setIsPlaying, nativeAudioStop]);

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
  useEffect(() => {
    if (!effectiveSong || !mediaLoaded) return;

    isMountedRef.current = true;

    const initGame = async () => {
      const success = await initialize();
      if (!isMountedRef.current) return; // Check if still mounted after async

      if (success) {
        // Set pitch detector to current difficulty
        setPitchDifficulty(difficulty);

        start();

        // Reset scoring state (note progress tracking is handled by the hook)
        resetScoring();

        // ── Extracted media playback function (shared by countdown + medley skip) ──
        const playMedia = async () => {
          try {
            const currentSong = effectiveSong;
            if (!currentSong) return;

            const startPosition = (currentSong.start || 0) / 1000;

            let currentAudioUrl = currentSong.audioUrl;
            let currentVideoUrl = currentSong.videoBackground;

            console.log('[GameScreen] playMedia - using URLs from effectiveSong:', {
              audioUrl: currentAudioUrl ? 'present' : 'missing',
              videoUrl: currentVideoUrl ? 'present' : 'missing',
              hasEmbeddedAudio: currentSong.hasEmbeddedAudio
            });

            // PRIORITY 1: Separate audio file (most common case)
            if (audioRef.current && currentAudioUrl) {
              // Only set src if it differs — avoids resetting playback
              if (audioRef.current.src !== currentAudioUrl) {
                audioRef.current.src = currentAudioUrl;
              }
              audioRef.current.currentTime = startPosition;
              // When native audio is active, mute the browser audio element
              if (isNativeAudio) {
                audioRef.current.muted = true;
              }
              await audioRef.current.play();

              // Start native audio playback if enabled and file path is available
              if (isNativeAudio && nativeAudioPlay && currentSong.baseFolder && currentSong.relativeAudioPath) {
                // Normalize both paths to use forward slashes for consistent path construction
                const normalizedBase = currentSong.baseFolder.replace(/\\/g, '/');
                const normalizedRelative = currentSong.relativeAudioPath.replace(/\\/g, '/');
                const nativePath = `${normalizedBase}/${normalizedRelative}`;
                console.log('[GameScreen] Starting native audio playback:', nativePath);
                nativeAudioPlay(nativePath).catch((err) => {
                  console.error('[GameScreen] Native audio play failed, falling back to browser:', err);
                  if (audioRef.current) audioRef.current.muted = false;
                });
                // Seek to start position after native audio begins
                if (nativeAudioSeek) {
                nativeAudioSeek(currentSong.start || 0).catch(() => {});
                }
              }
            }

            // PRIORITY 2: Video with embedded audio
            else if (currentSong.hasEmbeddedAudio && videoRef.current && currentVideoUrl && !currentAudioUrl) {
              if (videoRef.current.src !== currentVideoUrl) {
                videoRef.current.src = currentVideoUrl;
              }
              videoRef.current.currentTime = startPosition;

              try {
                videoRef.current.muted = false;
                await videoRef.current.play();
              } catch (autoplayError) {
                videoRef.current.muted = true;
                await videoRef.current.play();
                setTimeout(() => {
                  if (videoRef.current) {
                    videoRef.current.muted = false;
                  }
                }, 100);
              }
            }

            // PRIORITY 3: YouTube video
            else if (isYouTube && youtubeVideoId) {
              console.log('[GameScreen] Starting YouTube playback for video:', youtubeVideoId);
            }

            // BACKGROUND VIDEO (muted, synced with audio)
            if (videoRef.current && currentVideoUrl && !currentSong.hasEmbeddedAudio) {
              const videoGapSeconds = (currentSong.videoGap || 0) / 1000;
              videoRef.current.src = currentVideoUrl;
              videoRef.current.currentTime = Math.max(0, startPosition - videoGapSeconds);
              videoRef.current.muted = true;
              videoRef.current.play().catch(() => {});
            }
          } catch (error) {
            console.error('[GameScreen] Media playback failed:', error);
            // Do NOT set isPlaying(true) — the media didn't start,
            // so the game loop must not run (would cause infinite wall-clock hang).
          }
        };

        // ── Medley mode: skip countdown (MedleyGameView already counted down) ──
        if (gameMode === 'medley') {
          setCountdown(0);
          setIsPlaying(true);
          startTimeRef.current = Date.now();
          playMedia();
          return;
        }

        // ── Normal mode: 3-second countdown then play ──
        // Start countdown from 3
        setCountdown(3);

        // Use a ref to track countdown value for proper timing
        let currentCount = 3;

        // Clear any previous watchdog
        if (mediaPlayWatchdogRef.current) {
          clearTimeout(mediaPlayWatchdogRef.current);
          mediaPlayWatchdogRef.current = null;
        }

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

            // Watchdog: if audio/video still isn't actually playing after 10 seconds,
            // end the game to prevent infinite hang (wall-clock fallback loop).
            mediaPlayWatchdogRef.current = setTimeout(() => {
              const audioPlaying = audioRef.current && !audioRef.current.paused && audioRef.current.readyState >= 2;
              const videoPlaying = videoRef.current && !videoRef.current.paused && videoRef.current.readyState >= 2;
              const youTubeActive = isYouTube;
              const nativePlaying = isNativeAudio && nativeAudioTime > 0;

              if (!audioPlaying && !videoPlaying && !youTubeActive && !nativePlaying) {
                console.error('[GameLoop] Media playback watchdog: no media actually playing after 10s — ending game to prevent hang');
                endGameAndCleanup();
              }
            }, 10000);
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
        clearTimeout(mediaPlayWatchdogRef.current);
        mediaPlayWatchdogRef.current = null;
      }
      stop();
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (videoRef.current) {
        videoRef.current.pause();
      }
      setIsPlaying(false);
      setCountdown(3);
    };
  }, [effectiveSong, mediaLoaded, initialize, start, stop, setPitchDifficulty, difficulty, resetScoring, audioRef, videoRef, isYouTube, youtubeVideoId, setIsPlaying]);

  // ── CRITICAL: Cleanup on unmount ──
  useEffect(() => {
    return () => {
      stop();

      if (audioEffects) {
        audioEffects.disconnect();
      }

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }

      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [stop, audioEffects, setAudioEffects, audioRef, videoRef]);

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
    } else if (gameStatus === 'playing' && wasPausedByStoreRef.current) {
      wasPausedByStoreRef.current = false;

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
    }
  }, [gameStatus, audioRef, videoRef, nativeAudioPause, nativeAudioResume, setIsPlaying, effectiveSong]);

  // ── Game loop (requestAnimationFrame) ──
  useEffect(() => {
    if (!isPlaying || !effectiveSong) return;

    const startPositionMs = effectiveSong.start || 0;

    const gameLoop = () => {
      let elapsed: number;

      // Priority: native audio time (ASIO / WASAPI)
      if (isNativeAudio && nativeAudioTime > 0) {
        elapsed = nativeAudioTime;
      }
      else if (isYouTube && youtubeTime > 0) {
        elapsed = youtubeTime;
      }
      else if (audioRef.current && !audioRef.current.paused && audioRef.current.readyState >= 2) {
        elapsed = audioRef.current.currentTime * 1000;
      }
      else if (effectiveSong.hasEmbeddedAudio && videoRef.current && !videoRef.current.paused) {
        elapsed = videoRef.current.currentTime * 1000;
      }
      else {
        elapsed = (Date.now() - startTimeRef.current) + startPositionMs;
      }

      const adjustedTime = elapsed + timingOffset;

      setCurrentTime(adjustedTime);

      if (pitchResult) {
        setVolume(pitchResult.volume);
        setDetectedPitch(pitchResult.frequency);
        checkNoteHits(adjustedTime, pitchResult);
      }

      if (isDuetMode && p2DetectedPitch !== null) {
        const p2PitchResult = {
          frequency: p2DetectedPitch,
          note: Math.round(12 * (Math.log2(p2DetectedPitch / 440)) + 69),
          clarity: pitchResult?.clarity || 0,
          volume: p2Volume
        };
        checkP2NoteHits(adjustedTime, p2PitchResult);
      } else if (isDuetMode) {
        setP2Volume(0);
      }

      // End song by time ONLY when #END: tag is explicitly defined.
      // When #END: is not defined, the audio/video element's natural
      // "ended" event (handled via onEnded prop) terminates the game.
      if (effectiveSong.end && adjustedTime >= effectiveSong.end) {
        endGameAndCleanup();
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
  }, [isPlaying, effectiveSong, pitchResult, setCurrentTime, setDetectedPitch, checkNoteHits, checkP2NoteHits, endGameAndCleanup, isYouTube, youtubeTime, timingOffset, isDuetMode, p2DetectedPitch, p2Volume, setP2Volume, audioRef, videoRef, startTimeRef, isNativeAudio, nativeAudioTime]);

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
    startTimeRef,
    gameLoopRef,
    pauseGame,
    resumeGame,
    endGameAndCleanup,
    abortGameLoop,
  };
}
