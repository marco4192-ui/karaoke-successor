'use client';

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
