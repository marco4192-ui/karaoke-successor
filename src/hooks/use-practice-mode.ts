'use client';

/**
 * DEAD CODE (Code Review #5, 2026-04-17)
 *
 * This file is not imported by any other file in the project.
 *
 * Possible function: This hook provides practice mode controls — loop regions,
 * adjustable playback speed (0.5x-1.5x), pitch guide toggle, and auto-play notes.
 * It manages loop detection via currentTime monitoring and auto-seeks back to
 * the loop start when the end is reached.
 *
 * Currently, practice mode is handled differently — the practice-panel.tsx
 * component manages its own state and directly manipulates the audio element.
 * The lib/game/practice-mode.ts types (PracticeModeConfig, PRACTICE_MODE_DEFAULTS)
 * are still used, but through a different state management path.
 *
 * The loop detection logic here uses useEffect with currentTime dependency,
 * which could cause issues at high update frequencies. The practice-panel.tsx
 * approach using audio element events is more reliable.
 *
 * Consider: The playback rate and auto-play features from this hook could be
 * integrated into the existing practice panel if those features are desired.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { PRACTICE_MODE_DEFAULTS, PracticeModeConfig } from '@/lib/game/practice-mode';

export interface UsePracticeModeOptions {
  isPlaying: boolean;
  currentTime: number;
  onSeek?: (time: number) => void;
}

export function usePracticeMode({
  isPlaying,
  currentTime,
  onSeek,
}: UsePracticeModeOptions): {
  practiceMode: PracticeModeConfig;
  showPracticeControls: boolean;
  loopCount: number;
  setPracticeMode: React.Dispatch<React.SetStateAction<PracticeModeConfig>>;
  setShowPracticeControls: (show: boolean) => void;
  togglePracticeMode: () => void;
  setLoopRegion: (start: number, end: number) => void;
  clearLoopRegion: () => void;
  setPlaybackRate: (rate: number) => void;
  togglePitchGuide: () => void;
  toggleAutoPlayNotes: () => void;
  handleLoop: () => void;
} {
  const [practiceMode, setPracticeMode] = useState<PracticeModeConfig>(PRACTICE_MODE_DEFAULTS);
  const [showPracticeControls, setShowPracticeControls] = useState(false);
  const [loopCount, setLoopCount] = useState(0);
  const loopIterationRef = useRef(0);

  // Handle loop detection
  useEffect(() => {
    if (!practiceMode.enabled || !practiceMode.loopStart || !practiceMode.loopEnd || !isPlaying) {
      return;
    }

    // Check if we've reached the end of the loop
    if (currentTime >= practiceMode.loopEnd) {
      loopIterationRef.current += 1;
      setLoopCount(loopIterationRef.current);

      // Seek back to loop start
      if (onSeek) {
        onSeek(practiceMode.loopStart);
      }
    }
  }, [currentTime, practiceMode, isPlaying, onSeek]);

  // Toggle practice mode on/off
  const togglePracticeMode = useCallback(() => {
    setPracticeMode(prev => ({
      ...prev,
      enabled: !prev.enabled,
    }));
  }, []);

  // Set loop region
  const setLoopRegion = useCallback((start: number, end: number) => {
    setPracticeMode(prev => ({
      ...prev,
      loopStart: start,
      loopEnd: end,
    }));
    loopIterationRef.current = 0;
    setLoopCount(0);
  }, []);

  // Clear loop region
  const clearLoopRegion = useCallback(() => {
    setPracticeMode(prev => ({
      ...prev,
      loopStart: null,
      loopEnd: null,
    }));
    loopIterationRef.current = 0;
    setLoopCount(0);
  }, []);

  // Set playback rate
  const setPlaybackRate = useCallback((rate: number) => {
    setPracticeMode(prev => ({
      ...prev,
      playbackRate: Math.max(0.5, Math.min(1.5, rate)),
    }));
  }, []);

  // Toggle pitch guide
  const togglePitchGuide = useCallback(() => {
    setPracticeMode(prev => ({
      ...prev,
      pitchGuideEnabled: !prev.pitchGuideEnabled,
    }));
  }, []);

  // Toggle auto-play notes
  const toggleAutoPlayNotes = useCallback(() => {
    setPracticeMode(prev => ({
      ...prev,
      autoPlayEnabled: !prev.autoPlayEnabled,
    }));
  }, []);

  // Handle loop manually (for buttons)
  const handleLoop = useCallback(() => {
    if (practiceMode.loopStart !== null && onSeek) {
      onSeek(practiceMode.loopStart);
    }
  }, [practiceMode.loopStart, onSeek]);

  return {
    practiceMode,
    showPracticeControls,
    loopCount,
    setPracticeMode,
    setShowPracticeControls,
    togglePracticeMode,
    setLoopRegion,
    clearLoopRegion,
    setPlaybackRate,
    togglePitchGuide,
    toggleAutoPlayNotes,
    handleLoop,
  };
}
