'use client';

import { useState, useCallback, useRef, useEffect, type RefObject } from 'react';
import { AudioEffectsEngine } from '@/lib/audio/audio-effects';
import { getPitchDetector } from '@/lib/audio/pitch-detector';
import { useGameStore } from '@/lib/game/store';

interface UseGameAudioEffectsOptions {
  /** Ref to the <audio> element playing the song. */
  audioRef?: RefObject<HTMLAudioElement | null>;
  /** Ref to the <video> element playing background video. */
  videoRef?: RefObject<HTMLVideoElement | null>;
}

/**
 * Hook for managing audio effects (reverb, echo) during gameplay.
 * Audio effects are initialized lazily — only when the user opens the panel.
 *
 * IMPORTANT: We reuse the existing MediaStream AND AudioContext from the
 * PitchDetector instead of calling getUserMedia() / new AudioContext().
 * On Tauri/WebView, creating a second AudioContext or a second
 * MediaStreamAudioSourceNode can steal audio focus from <audio>/<video>
 * elements, causing them to pause/reset.
 *
 * When opening the panel during playback:
 * 1. Pause the game (game loop saves position + pauses media)
 * 2. Await AudioEffects initialization (which connects to AudioContext.destination)
 * 3. After init completes, restore media positions (which may have been reset)
 * 4. When closing the panel, resumeGame() plays audio from the correct position
 */
export function useGameAudioEffects(options?: UseGameAudioEffectsOptions) {
  const { audioRef, videoRef } = options || {};
  const pauseGame = useGameStore((s) => s.pauseGame);
  const resumeGame = useGameStore((s) => s.resumeGame);
  const gameStatus = useGameStore((s) => s.gameState.status);
  const [audioEffects, setAudioEffects] = useState<AudioEffectsEngine | null>(null);
  const audioEffectsRef = useRef<AudioEffectsEngine | null>(null);
  const [showAudioEffects, setShowAudioEffects] = useState(false);
  const [reverbAmount, setReverbAmount] = useState(0);
  const [echoAmount, setEchoAmount] = useState(0);

  // Store saved positions so we can restore them after init
  const savedPositionsRef = useRef<{ audio: number | null; video: number | null }>({
    audio: null, video: null,
  });

  // Initialize audio effects lazily — only when the user opens the panel
  const initAudioEffects = useCallback(async (): Promise<boolean> => {
    if (audioEffectsRef.current) return true; // Already initialized
    try {
      let stream: MediaStream | null = null;
      let existingAudioContext: AudioContext | null = null;

      const pitchDetector = getPitchDetector();
      stream = pitchDetector.getMediaStream();
      existingAudioContext = pitchDetector.getAudioContext();

      if (!existingAudioContext) {
        console.warn(
          '[AudioEffects] PitchDetector AudioContext is not available. ' +
          'Refusing to create a new one to avoid stealing audio focus.'
        );
        return false;
      }

      if (!stream) {
        console.warn('[AudioEffects] No existing mic stream found, requesting new one');
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      }

      const engine = new AudioEffectsEngine();
      await engine.initialize(stream, existingAudioContext);
      audioEffectsRef.current = engine;
      setAudioEffects(engine);
      return true;
    } catch (error) {
      console.error('Failed to initialize audio effects:', error);
      return false;
    }
  }, []);

  /**
   * Restore media positions that may have been reset by AudioContext
   * destination connection on Tauri/WebView.
   */
  const restoreMediaPositions = useCallback(() => {
    const { audio, video } = savedPositionsRef.current;
    if (audio !== null && audioRef?.current && !audioRef.current.ended) {
      audioRef.current.currentTime = audio;
    }
    if (video !== null && videoRef?.current && !videoRef.current.ended) {
      videoRef.current.currentTime = video;
    }
  }, [audioRef, videoRef]);

  // Toggle audio effects panel with lazy initialization
  const toggleAudioEffects = useCallback(async () => {
    if (!showAudioEffects) {
      // Opening the panel
      if (gameStatus === 'playing') {
        // Save media positions BEFORE pauseGame (which triggers the game loop
        // to pause audio/video)
        savedPositionsRef.current = {
          audio: audioRef?.current?.currentTime ?? null,
          video: videoRef?.current?.currentTime ?? null,
        };

        // Pause the game — the game loop's effect will:
        // 1. Save pausedAtElapsedMsRef from audioRef.currentTime
        // 2. Pause audio/video elements
        // 3. Cancel the game loop
        pauseGame();

        // Initialize audio effects (async — connects AudioContext.destination)
        const initialized = await initAudioEffects();

        // After init completes, restore media positions which may have been
        // reset by the AudioContext destination connection on Tauri/WebView
        if (initialized) {
          // Small delay to ensure any async side effects settle
          await new Promise(r => setTimeout(r, 50));
          restoreMediaPositions();
        }
      } else {
        // Game is not playing, just initialize effects
        await initAudioEffects();
      }
    } else {
      // Closing the panel — resume the game from where it was paused
      if (gameStatus === 'paused') {
        // Before resuming, ensure media positions are correct
        restoreMediaPositions();
        resumeGame();
      }
    }
    setShowAudioEffects(prev => !prev);
  }, [showAudioEffects, initAudioEffects, pauseGame, resumeGame, gameStatus, audioRef, videoRef, restoreMediaPositions]);

  // Cleanup audio effects on unmount
  useEffect(() => {
    return () => {
      if (audioEffectsRef.current) {
        audioEffectsRef.current.disconnect();
        audioEffectsRef.current = null;
      }
    };
  }, []);

  return {
    audioEffects,
    setAudioEffects,
    showAudioEffects,
    toggleAudioEffects,
    reverbAmount,
    setReverbAmount,
    echoAmount,
    setEchoAmount,
  };
}
