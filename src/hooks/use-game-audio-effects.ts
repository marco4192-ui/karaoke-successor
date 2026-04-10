'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { AudioEffectsEngine } from '@/lib/audio/audio-effects';
import { getPitchDetector } from '@/lib/audio/pitch-detector';

/**
 * Hook for managing audio effects (reverb, echo) during gameplay.
 * Audio effects are initialized lazily — only when the user opens the panel.
 *
 * IMPORTANT: We reuse the existing MediaStream from the PitchDetector instead
 * of calling getUserMedia() a second time. A second getUserMedia() call on the
 * same microphone device can kill the first stream on Tauri/WebView, which
 * would stop pitch detection during gameplay.
 */
export function useGameAudioEffects() {
  const [audioEffects, setAudioEffects] = useState<AudioEffectsEngine | null>(null);
  const audioEffectsRef = useRef<AudioEffectsEngine | null>(null);
  const [showAudioEffects, setShowAudioEffects] = useState(false);
  const [reverbAmount, setReverbAmount] = useState(0);
  const [echoAmount, setEchoAmount] = useState(0);

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

      // Strategy 2: Fallback — request a new stream (shouldn't happen during gameplay)
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
    } catch (error) {
      console.error('Failed to initialize audio effects:', error);
    }
  }, []);

  // Toggle audio effects panel with lazy initialization
  const toggleAudioEffects = useCallback(() => {
    if (!showAudioEffects) {
      // Opening the panel — initialize if needed
      initAudioEffects();
    }
    setShowAudioEffects(prev => !prev);
  }, [showAudioEffects, initAudioEffects]);

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
