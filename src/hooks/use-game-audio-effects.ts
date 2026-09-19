'use client';

import { useState, useCallback, useRef, useEffect, useMemo, type RefObject } from 'react';
import { AudioEffectsEngine, AUDIO_PRESETS, type AudioEffectPreset } from '@/lib/audio/audio-effects';
import { getPitchDetector } from '@/lib/audio/pitch-detector';
import { useGameStore } from '@/lib/game/store';
import { StorageKeys, getNumber, setItem } from '@/lib/storage';
import {
  setVocalRemoval,
  clearVocalRemoval,
  getVocalFilterUnsupportedReason,
  type VocalFilterUnsupportedReason,
} from '@/lib/audio/vocal-filter';

interface UseGameAudioEffectsOptions {
  /** Ref to the <audio> element playing the song. */
  audioRef?: RefObject<HTMLAudioElement | null>;
  /** Ref to the <video> element playing background video. */
  videoRef?: RefObject<HTMLVideoElement | null>;
  /** True when the song's music is the Web Audio MIDI synth adapter — the vocal filter is a no-op then. */
  midiMusicActive?: boolean;
  /** The song's own audio-file URL (null → music comes from the platform player / embedded video). */
  songAudioUrl?: string | null;
  /** True when native audio (ASIO/WASAPI) bypasses the <audio> element's output. */
  nativeAudioEnabled?: boolean;
}

/**
 * Hook for managing audio effects (reverb, echo, vocal filter) during gameplay.
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
 *
 * The VOCAL FILTER (Gesangsfilter) is independent of the mic effects engine:
 * it runs on the song's <audio> element through the SHARED media context
 * (getSharedMediaSource), NOT on the PitchDetector context — a
 * MediaElementAudioSourceNode chain cannot cross AudioContexts (see
 * src/lib/audio/vocal-filter.ts). It therefore works even when the mic
 * effects engine failed to initialize.
 */
export function useGameAudioEffects(options?: UseGameAudioEffectsOptions) {
  const { audioRef, videoRef, midiMusicActive = false, songAudioUrl = null, nativeAudioEnabled = false } = options || {};
  const pauseGame = useGameStore((s) => s.pauseGame);
  const resumeGame = useGameStore((s) => s.resumeGame);
  const gameStatus = useGameStore((s) => s.gameState.status);
  const [audioEffects, setAudioEffects] = useState<AudioEffectsEngine | null>(null);
  const audioEffectsRef = useRef<AudioEffectsEngine | null>(null);
  const [showAudioEffects, setShowAudioEffects] = useState(false);
  const [reverbAmount, setReverbAmount] = useState(0);
  const [echoAmount, setEchoAmount] = useState(0);

  // ── Vocal filter (Gesangsfilter): persisted 0..1, applied to the song's
  // <audio> element via the shared media source. 0 = off. The initial value
  // comes from localStorage so the setting survives sessions; it is applied
  // on game start by the game-screen volume effect (piggybacked after
  // applyLoudnessVolume) and directly whenever the user moves the slider.
  const [vocalFilterAmount, setVocalFilterAmountState] = useState(() =>
    Math.min(1, Math.max(0, getNumber(StorageKeys.VOCAL_FILTER_AMOUNT, 0))),
  );
  /** Latest amount without re-rendering — read by the game-screen piggyback. */
  const vocalFilterAmountRef = useRef(vocalFilterAmount);

  /** Why the vocal filter is unavailable for the current song/medium (null = available). */
  const vocalFilterUnsupportedReason: VocalFilterUnsupportedReason | null = useMemo(
    () => getVocalFilterUnsupportedReason({ midiMusicActive, songAudioUrl, nativeAudioEnabled }),
    [midiMusicActive, songAudioUrl, nativeAudioEnabled],
  );

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
        // eslint-disable-next-line no-console
        console.warn(
          '[AudioEffects] PitchDetector AudioContext is not available. ' +
          'Refusing to create a new one to avoid stealing audio focus.'
        );
        return false;
      }

      if (!stream) {
        // eslint-disable-next-line no-console
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
      // eslint-disable-next-line no-console
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

  // Cleanup audio effects on unmount — also bypass the vocal filter chain
  // so the (about-to-be-discarded) element is left in pristine routing.
  useEffect(() => {
    return () => {
      if (audioEffectsRef.current) {
        audioEffectsRef.current.disconnect();
        audioEffectsRef.current = null;
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps -- unmount cleanup intentionally reads the CURRENT element (latest song), not a stale mount-time snapshot
      const el = audioRef?.current;
      if (el) clearVocalRemoval(el);
    };
  }, [audioRef]);

  // Wire reverb/echo state changes to the audio effects engine
  useEffect(() => {
    if (!audioEffectsRef.current) return;
    audioEffectsRef.current.setReverb(reverbAmount);
  }, [reverbAmount]);

  useEffect(() => {
    if (!audioEffectsRef.current) return;
    // echoAmount is 0-100 from the slider, normalize to 0-1 for mix
    audioEffectsRef.current.setDelay(0.3, 0.4, echoAmount);
  }, [echoAmount]);

  /** Apply a named audio effect preset and sync UI sliders */
  const applyEffectPreset = useCallback((preset: AudioEffectPreset) => {
    if (!audioEffectsRef.current) return;
    audioEffectsRef.current.applyPreset(preset);
    const presetSettings = AUDIO_PRESETS[preset];
    if (presetSettings.reverb) setReverbAmount(presetSettings.reverb.amount ?? 0);
    if (presetSettings.delay) setEchoAmount(presetSettings.delay.mix ?? 0);
  }, [audioEffectsRef]);

  /**
   * Set the vocal filter amount (0..1). Persists to localStorage, updates the
   * UI state and applies it to the song's audio element immediately (the
   * Web Audio chain is built lazily on the first non-zero amount). No-op when
   * the filter is unavailable for the current medium — setVocalRemoval's
   * internal guards (cross-origin / MIDI adapter) are the second line of
   * defense and simply return false (playback never breaks).
   */
  const setVocalFilterAmount = useCallback((val: number) => {
    if (vocalFilterUnsupportedReason) return; // locked for this medium
    const clamped = Math.min(1, Math.max(0, Number.isFinite(val) ? val : 0));
    setVocalFilterAmountState(clamped);
    vocalFilterAmountRef.current = clamped;
    setItem(StorageKeys.VOCAL_FILTER_AMOUNT, String(clamped));
    const el = audioRef?.current;
    if (el) {
      void setVocalRemoval(el, clamped);
    }
  }, [audioRef, vocalFilterUnsupportedReason]);

  return {
    audioEffects,
    setAudioEffects,
    showAudioEffects,
    toggleAudioEffects,
    reverbAmount,
    setReverbAmount,
    echoAmount,
    setEchoAmount,
    applyEffectPreset,
    /** Vocal filter (0..1, persisted; 0 = off). */
    vocalFilterAmount,
    setVocalFilterAmount,
    /** Latest vocal-filter amount without re-render (game-start piggyback). */
    vocalFilterAmountRef,
    /** null = vocal filter available; otherwise the reason it is not. */
    vocalFilterUnsupportedReason,
  };
}
