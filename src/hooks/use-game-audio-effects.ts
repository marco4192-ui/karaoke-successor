'use client';

import { useState, useCallback, useRef, useEffect, type RefObject } from 'react';
import { AudioEffectsEngine } from '@/lib/audio/audio-effects';
import { getPitchDetector } from '@/lib/audio/pitch-detector';
import { useGameStore } from '@/lib/game/store';

interface UseGameAudioEffectsOptions {
  /** Ref to the <audio> element playing the song. Used to resume after effects init. */
  audioRef?: RefObject<HTMLAudioElement | null>;
  /** Ref to the <video> element playing background video. Used to resume after effects init. */
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
 * elements, causing them to pause. We also resume any paused media elements
 * after initialization as a defensive measure.
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

  /**
   * Resume media elements that may have been paused by the WebView when
   * the AudioContext graph was connected to its destination.
   */
  const resumeMediaElements = useCallback(() => {
    if (audioRef?.current && audioRef.current.paused) {
      audioRef.current.play().catch(() => {
        // Silently ignore — the element may have ended or been unloaded
      });
    }
    if (videoRef?.current && videoRef.current.paused) {
      videoRef.current.play().catch(() => {
        // Silently ignore
      });
    }
  }, [audioRef, videoRef]);

  // Initialize audio effects lazily — only when the user opens the panel
  const initAudioEffects = useCallback(async () => {
    if (audioEffectsRef.current) return; // Already initialized
    try {
      let stream: MediaStream | null = null;
      let existingAudioContext: AudioContext | null = null;

      // Strategy 1: Reuse the existing MediaStream AND AudioContext from the
      // PitchDetector. This avoids a second getUserMedia() call that would
      // kill pitch detection AND a second AudioContext that would steal audio
      // focus from <audio>/<video> media elements on Tauri/WebView.
      const pitchDetector = getPitchDetector();
      stream = pitchDetector.getMediaStream();
      existingAudioContext = pitchDetector.getAudioContext();

      // Safety guard: If we don't have an existing AudioContext, creating a
      // new one would steal audio focus on Tauri/WebView. Only proceed if
      // there's already a shared context.
      if (!existingAudioContext) {
        console.warn(
          '[AudioEffects] PitchDetector AudioContext is not available. ' +
          'Refusing to create a new one to avoid stealing audio focus.'
        );
        return;
      }

      // Fallback: request a new stream if PitchDetector doesn't have one
      // (shouldn't happen during gameplay)
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

      // Defensive: On Tauri/WebView, connecting the effect chain to
      // AudioContext.destination can cause <audio>/<video> elements to
      // pause. Only resume them if the game is still playing — if we
      // intentionally paused (e.g. audio effects panel), don't resume.
      const currentStatus = useGameStore.getState().gameState.status;
      if (currentStatus === 'playing') {
        setTimeout(() => {
          resumeMediaElements();
        }, 100);
      }
    } catch (error) {
      console.error('Failed to initialize audio effects:', error);
    }
  }, [resumeMediaElements]);

  // Toggle audio effects panel with lazy initialization
  const toggleAudioEffects = useCallback(() => {
    if (!showAudioEffects) {
      // Opening the panel — pause the game first (saves current position)
      if (gameStatus === 'playing') {
        // Save media positions BEFORE initAudioEffects (which may reset them
        // on Tauri/WebView by stealing audio focus)
        const savedAudioTime = audioRef?.current?.currentTime ?? null;
        const savedVideoTime = videoRef?.current?.currentTime ?? null;

        pauseGame();
        initAudioEffects();

        // After initAudioEffects potentially resets media positions, restore them.
        // Use a delay longer than the 100ms resumeMediaElements timeout inside init.
        if (savedAudioTime !== null || savedVideoTime !== null) {
          setTimeout(() => {
            if (savedAudioTime !== null && audioRef?.current && !audioRef.current.ended) {
              audioRef.current.currentTime = savedAudioTime;
            }
            if (savedVideoTime !== null && videoRef?.current && !videoRef.current.ended) {
              videoRef.current.currentTime = savedVideoTime;
            }
          }, 150);
        }
      } else {
        initAudioEffects();
      }
    } else {
      // Closing the panel — resume the game from where it was paused
      if (gameStatus === 'paused') {
        resumeGame();
      }
    }
    setShowAudioEffects(prev => !prev);
  }, [showAudioEffects, initAudioEffects, pauseGame, resumeGame, gameStatus, audioRef, videoRef]);

  // Cleanup audio effects on unmount
  // NOTE: We do NOT stop the MediaStream tracks here because the PitchDetector
  // still owns them. Only the AudioContext and effect nodes are cleaned up.
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
