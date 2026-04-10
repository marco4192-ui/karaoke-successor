'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AudioEffectsEngine } from '@/lib/audio/audio-effects';

export interface UseAudioEffectsOptions {
  isPlaying: boolean;
}

export function useAudioEffects({ isPlaying }: UseAudioEffectsOptions): {
  audioEffects: AudioEffectsEngine | null;
  showAudioEffects: boolean;
  reverbAmount: number;
  echoAmount: number;
  setShowAudioEffects: (show: boolean) => void;
  setReverbAmount: (amount: number) => void;
  setEchoAmount: (amount: number) => void;
  toggleAudioEffects: () => void;
} {
  const [audioEffects, setAudioEffects] = useState<AudioEffectsEngine | null>(null);
  const [showAudioEffects, setShowAudioEffects] = useState(false);
  const [reverbAmount, setReverbAmount] = useState(0);
  const [echoAmount, setEchoAmount] = useState(0);

  const audioEffectsRef = useRef<AudioEffectsEngine | null>(null);

  // Initialize audio effects when microphone is active
  useEffect(() => {
    if (isPlaying && !audioEffectsRef.current) {
      const initAudioEffects = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const engine = new AudioEffectsEngine();
          await engine.initialize(stream, null);
          audioEffectsRef.current = engine;
          setAudioEffects(engine);
        } catch (error) {
          console.error('[useAudioEffects] Failed to initialize:', error);
        }
      };
      initAudioEffects();
    }

    return () => {
      if (audioEffectsRef.current) {
        audioEffectsRef.current.disconnect();
        audioEffectsRef.current = null;
      }
    };
  }, [isPlaying]);

  // Apply reverb when amount changes
  useEffect(() => {
    if (audioEffects) {
      audioEffects.setReverb(reverbAmount / 100);
    }
  }, [audioEffects, reverbAmount]);

  // Apply delay when amount changes  
  useEffect(() => {
    if (audioEffects) {
      audioEffects.setDelay(echoAmount / 1000, 0.3, echoAmount / 100);
    }
  }, [audioEffects, echoAmount]);

  // Toggle audio effects panel
  const toggleAudioEffects = useCallback(() => {
    setShowAudioEffects(prev => !prev);
  }, []);

  return {
    audioEffects,
    showAudioEffects,
    reverbAmount,
    echoAmount,
    setShowAudioEffects,
    setReverbAmount,
    setEchoAmount,
    toggleAudioEffects,
  };
}
