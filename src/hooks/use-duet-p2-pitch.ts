'use client';

import { useEffect, useRef, useState } from 'react';
import type { Song, Difficulty } from '@/types/game';
import type { MobilePitchData } from '@/hooks/use-mobile-pitch-polling';
import { PitchDetector } from '@/lib/audio/pitch-detector';
import { getMultiMicrophoneManager } from '@/lib/audio/microphone-manager';

interface DuetP2PitchParams {
  isDuetMode: boolean;
  song: Song | null;
  mobilePitch: MobilePitchData | null;
  setP2DetectedPitch: (pitch: number | null) => void;
  difficulty: Difficulty;
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
  mobilePitch,
  setP2DetectedPitch,
  difficulty,
}: DuetP2PitchParams): DuetP2PitchResult {
  const [p2Volume, setP2Volume] = useState(0);

  // Use mobile pitch for P2 in duet/duel mode
  useEffect(() => {
    if (isDuetMode && mobilePitch) {
      queueMicrotask(() => {
        // Use MIDI note (not frequency) for visual display consistency.
        // MobilePitchData.note is already a MIDI note number.
        setP2DetectedPitch(mobilePitch.note);
        setP2Volume(mobilePitch.volume || 0);
      });
    } else if (isDuetMode && !mobilePitch?.frequency) {
      queueMicrotask(() => {
        setP2DetectedPitch(null);
        setP2Volume(0);
      });
    }
  }, [isDuetMode, mobilePitch, setP2DetectedPitch, setP2Volume]);

  // ── P2 Local Microphone: Initialize a second pitch detector for P2 in duet/duel mode ──
  // When two microphones are assigned (playerIndex 0 and 1), use the second one for P2
  // instead of relying solely on the mobile companion app for P2 pitch data.
  const p2DetectorRef = useRef<PitchDetector | null>(null);
  const p2DetectorInitRef = useRef(false);
  // Use ref to read mobilePitch inside effect without adding it to deps
  // (mobilePitch?.frequency changes ~20x/sec, which would re-init the detector constantly)
  const mobilePitchRef = useRef(mobilePitch);
  mobilePitchRef.current = mobilePitch;

  useEffect(() => {
    if (!isDuetMode || !song) return;

    // Check if there's a second microphone assigned to playerIndex 1
    const micManager = getMultiMicrophoneManager();
    const assignedMics = micManager.getAssignedMicrophones();
    const p2Mic = assignedMics.find(m => m.playerIndex === 1);

    if (!p2Mic?.deviceId || p2DetectorInitRef.current) return;

    // Only initialize P2 detector if no mobile pitch is coming in
    // (mobile companion takes priority for P2 pitch data)
    if (mobilePitchRef.current?.frequency) return;

    let destroyed = false;
    const detector = new PitchDetector();

    detector.initialize(p2Mic.deviceId).then((success) => {
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
  }, [isDuetMode, song, setP2DetectedPitch, setP2Volume, difficulty]);

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
