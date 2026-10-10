import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useMultiPitchDetector, type PlayerPitchConfig, type UseMultiPitchDetectorReturn } from '@/hooks/use-multi-pitch-detector';
import type { Difficulty } from '@/types/game';
import type { MedleyPlayer, MedleySettings, MedleyGamePhase } from '../medley-types';

// ===================== PARAMS =====================

export interface UseMedleyPitchDetectionParams {
  initialPlayers: MedleyPlayer[];
  settings: MedleySettings;
  phase: MedleyGamePhase;
  isPlaying: boolean;
  setIsSongPlaying: (v: boolean) => void;
}

// ===================== RETURN =====================

export interface UseMedleyPitchDetectionReturn {
  multiPitch: UseMultiPitchDetectorReturn;
  /** Ref für multiPitch — useMultiPitchDetector gibt bei jedem Render ein neues Objekt zurück. */
  multiPitchRef: React.MutableRefObject<UseMultiPitchDetectorReturn>;
  /** Sets the difficulty on the pitch detector (used by the features hook). */
  setDifficultyOnDetector: (diff: Difficulty) => void;
  /** Ref-guard for the isSongPlaying store sync (prevents React #185). */
  lastIsSongPlayingRef: React.MutableRefObject<boolean>;
}

// ===================== HOOK =====================

/**
 * Multi-pitch detection wiring (one detector per player) plus the
 * `isSongPlaying` party-store sync (ref-guarded, incl. unmount reset).
 */
export function useMedleyPitchDetection({
  initialPlayers,
  settings,
  phase,
  isPlaying,
  setIsSongPlaying,
}: UseMedleyPitchDetectionParams): UseMedleyPitchDetectionReturn {
  // ── Multi-pitch detection (one detector per player) ──
  const playerConfigs = useMemo<PlayerPitchConfig[]>(() =>
    initialPlayers.map(p => ({
      playerId: p.id,
      type: p.inputType,
      deviceId: p.micId,
      mobileClientId: p.mobileClientId,
      stereoChannel: p.stereoChannel,
    })),
    [initialPlayers],
  );

  const multiPitch = useMultiPitchDetector({
    players: playerConfigs,
    difficulty: settings.difficulty,
    autoStart: false,
  });

  // Ref für multiPitch — useMultiPitchDetector gibt bei jedem Render ein neues Objekt zurück.
  // Wird in Effekts/Callbacks verwendet, um unnötige Neustarts zu vermeiden.
  const multiPitchRef = useRef(multiPitch);
  multiPitchRef.current = multiPitch;

  // ── Song playing status (ref-guarded to prevent React #185) ──
  const lastIsSongPlayingRef = useRef(false);
  useEffect(() => {
    const newVal = isPlaying && phase === 'playing';
    if (lastIsSongPlayingRef.current !== newVal) {
      lastIsSongPlayingRef.current = newVal;
      setIsSongPlaying(newVal);
    }
  }, [isPlaying, phase, setIsSongPlaying]);

  // ── Cleanup: reset isSongPlaying on unmount ──
  useEffect(() => {
    return () => {
      setIsSongPlaying(false);
      lastIsSongPlayingRef.current = false;
    };
  }, [setIsSongPlaying]);

  // ── Callback to set difficulty on the pitch detector (used by features hook) ──
  const setDifficultyOnDetector = useCallback((diff: Difficulty) => {
    multiPitchRef.current.setDifficulty(diff);
  }, []);

  return {
    multiPitch,
    multiPitchRef,
    setDifficultyOnDetector,
    lastIsSongPlayingRef,
  };
}
