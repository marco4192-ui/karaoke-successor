'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { AudioEffectsEngine } from '@/lib/audio/audio-effects';

/**
 * Hook for managing audio effects (reverb, echo) during gameplay.
 * Audio effects are initialized lazily — only when the user opens the panel.
 * This avoids requesting a second microphone stream at game start.
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
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      const engine = new AudioEffectsEngine();
      await engine.initialize(stream);
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
