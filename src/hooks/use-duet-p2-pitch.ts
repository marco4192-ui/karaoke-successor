'use client';

import { useEffect, useRef, useState } from 'react';
import type { Song, Difficulty } from '@/types/game';
import type { MobilePitchData } from '@/hooks/use-mobile-pitch-polling';
import { PitchDetector } from '@/lib/audio/pitch-detector';
import { getMultiMicrophoneManager } from '@/lib/audio/microphone-manager';

interface DuetP2PitchParams {
  isDuetMode: boolean;
  song: Song | null;
  /** R60 — PERF-FIX: P2-Companion-Pitch als REF (30-Hz-Frames lösten zuvor
   *  pro Frame Effekt + SetState aus; mit 2 Companion-Sängern stockte das
   *  Duell). Der 100-ms-Sampler unten liest den Ref und settet State nur bei
   *  Änderung — max. 10 Updates/s statt 60+. null = P2 singt nicht über die
   *  Companion-App (Desktop-Mikro-Pfad). */
  mobilePitchRef: React.MutableRefObject<MobilePitchData | null> | null;
  setP2DetectedPitch: (pitch: number | null) => void;
  difficulty: Difficulty;
  /** R39/P5: true (Default), wenn P2 über die Companion-App singt — nur dann
   *   wird die Companion-Pitch-Quelle auf P2 gelegt. Hat der Nutzer für P2
   *   explizit ein Desktop-Mikrofon gewählt (deviceAssignment.p2Companion ===
   *   false), bleibt P2 beim lokalen Zweit-Mikrofon und die Handy-Pitch-
   *   Daten werden ignoriert. */
  p2Companion?: boolean;
}

interface DuetP2PitchResult {
  p2Volume: number;
  setP2Volume: (volume: number) => void;
}

/**
 * Manages P2 pitch detection in duet/duel mode:
 * - Wires mobile companion pitch data to P2 scoring
 * - Initializes a second local microphone pitch detector for P2 when available
 * Extracted from useGameScreenLogic.
 */
export function useDuetP2Pitch({
  isDuetMode,
  song,
  mobilePitchRef,
  setP2DetectedPitch,
  difficulty,
  p2Companion = true,
}: DuetP2PitchParams): DuetP2PitchResult {
  const [p2Volume, setP2Volume] = useState(0);

  // ── R60: Companion-Pitch → P2 (Ref-Sampler, 10 Hz, änderungsbasiert) ──
  // R39/P5: only when P2 actually sings via companion (explicit device
  // choice from the song-start modal / queue item overrides the default).
  // MIDI note (not frequency) for visual display consistency.
  // MobilePitchData.note is already a MIDI note number.
  useEffect(() => {
    if (!isDuetMode || !p2Companion) return;
    let lastNote: number | null = null;
    let lastVolume = -1;
    const iv = setInterval(() => {
      const mp = mobilePitchRef?.current ?? null;
      const note = mp?.note ?? null;
      const volume = mp?.volume || 0;
      if (note !== lastNote) {
        lastNote = note;
        setP2DetectedPitch(note);
      }
      if (volume !== lastVolume) {
        lastVolume = volume;
        setP2Volume(volume);
      }
    }, 100);
    return () => clearInterval(iv);
  }, [isDuetMode, p2Companion, mobilePitchRef, setP2DetectedPitch, setP2Volume]);

  // ── P2 Local Microphone: Initialize a second pitch detector for P2 in duet/duel mode ──
  // When two microphones are assigned (playerIndex 0 and 1), use the second one for P2
  // instead of relying solely on the mobile companion app for P2 pitch data.
  const p2DetectorRef = useRef<PitchDetector | null>(null);
  const p2DetectorInitRef = useRef(false);

  useEffect(() => {
    if (!isDuetMode || !song) return;

    // Check if there's a second microphone assigned to playerIndex 1
    const micManager = getMultiMicrophoneManager();
    const assignedMics = micManager.getAssignedMicrophones();
    const p2Mic = assignedMics.find(m => m.playerIndex === 1);

    if (!p2Mic?.deviceId || p2DetectorInitRef.current) return;

    // R39/P5: initialize the local P2 mic even when a companion streams —
    // when P2 explicitly chose a desktop mic (p2Companion === false), the
    // companion feed is NOT wired to P2 and this detector is the source.
    // (When p2Companion is true, the old behavior stays: companion takes
    // priority and the local mic is only a fallback.)
    if (p2Companion && mobilePitchRef?.current?.frequency) return;

    let destroyed = false;
    const detector = new PitchDetector();

    // Resolve stereo channel from mic config
    const p2StereoChannel = p2Mic.config?.stereoSplitMode
      ? (p2Mic.config.stereoChannel === 'right' ? 1 : 0)
      : undefined;
    detector.initialize(p2Mic.deviceId, p2StereoChannel).then((success) => {
      if (!success || destroyed) {
        detector.destroy();
        return;
      }

      p2DetectorRef.current = detector;
      p2DetectorInitRef.current = true;

      detector.start((result) => {
        if (result.frequency) {
          // Use rawNote (un-stabilized MIDI) for responsive P2 visual display
          setP2DetectedPitch(result.rawNote ?? result.note);
          setP2Volume(result.volume || 0);
        }
      });

      // Set difficulty to match P1
      detector.setDifficulty(difficulty);
    }).catch(() => {
      // Silently fail — P2 will just have no pitch from local mic
      p2DetectorInitRef.current = false;
    });

    return () => {
      destroyed = true;
      detector.stop();
      detector.destroy();
      p2DetectorRef.current = null;
      p2DetectorInitRef.current = false;
    };
  }, [isDuetMode, song, setP2DetectedPitch, setP2Volume, difficulty, p2Companion, mobilePitchRef]);

  // Stop P2 detector when game ends or component unmounts
  useEffect(() => {
    return () => {
      if (p2DetectorRef.current) {
        p2DetectorRef.current.stop();
        p2DetectorRef.current.destroy();
        p2DetectorRef.current = null;
      }
    };
  }, []);

  return { p2Volume, setP2Volume };
}
