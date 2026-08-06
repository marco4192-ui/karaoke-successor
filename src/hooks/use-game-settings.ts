'use client';

import { useState, useEffect } from 'react';
import { StorageKeys, getBool, getString } from '@/lib/storage';

type PerformanceMode = 'full' | 'low';

function parsePerformanceMode(raw: string | null): PerformanceMode | null {
  if (raw === 'full' || raw === 'low') return raw;
  return null;
}

interface GameSettings {
  showBackgroundVideo: boolean;
  showPitchGuide: boolean;
  useAnimatedBackground: boolean;
  performanceMode: PerformanceMode;
}

export function useGameSettings(): GameSettings & {
  setShowBackgroundVideo: (_value: boolean) => void;
  setShowPitchGuide: (_value: boolean) => void;
  setUseAnimatedBackground: (_value: boolean) => void;
  setPerformanceMode: (_value: PerformanceMode) => void;
} {
  const [showBackgroundVideo, setShowBackgroundVideo] = useState(
    () => getBool(StorageKeys.BG_VIDEO, true)
  );
  const [showPitchGuide, setShowPitchGuide] = useState(
    () => getBool(StorageKeys.SHOW_PITCH_GUIDE, true)
  );
  const [useAnimatedBackground, setUseAnimatedBackground] = useState(
    () => getBool(StorageKeys.ANIMATED_BG, false)
  );
  const [performanceMode, setPerformanceMode] = useState<PerformanceMode>(() => {
    return parsePerformanceMode(getString(StorageKeys.PERFORMANCE_MODE)) || 'full';
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync
    setShowBackgroundVideo(getBool(StorageKeys.BG_VIDEO, true));
    setShowPitchGuide(getBool(StorageKeys.SHOW_PITCH_GUIDE, true));
    setUseAnimatedBackground(getBool(StorageKeys.ANIMATED_BG, false));
    setPerformanceMode(parsePerformanceMode(getString(StorageKeys.PERFORMANCE_MODE)) || 'full');

    const handleSettingsChange = () => {
      setShowBackgroundVideo(getBool(StorageKeys.BG_VIDEO, true));
      setShowPitchGuide(getBool(StorageKeys.SHOW_PITCH_GUIDE, true));
      setUseAnimatedBackground(getBool(StorageKeys.ANIMATED_BG, false));

      const storedPerf = parsePerformanceMode(
        typeof window !== 'undefined' ? localStorage.getItem(StorageKeys.PERFORMANCE_MODE) : null
      );
      if (storedPerf) {
        setPerformanceMode(storedPerf);
      }
    };

    window.addEventListener('storage', handleSettingsChange);
    window.addEventListener('settingsChange', handleSettingsChange);

    return () => {
      window.removeEventListener('storage', handleSettingsChange);
      window.removeEventListener('settingsChange', handleSettingsChange);
    };
  }, []);

  return {
    showBackgroundVideo,
    showPitchGuide,
    useAnimatedBackground,
    performanceMode,
    setShowBackgroundVideo,
    setShowPitchGuide,
    setUseAnimatedBackground,
    setPerformanceMode,
  };
}
