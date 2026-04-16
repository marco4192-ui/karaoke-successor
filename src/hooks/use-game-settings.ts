'use client';

import { useState, useEffect, useCallback } from 'react';
import { getStoredTheme } from '@/lib/game/themes';
import type { NoteShapeStyle } from '@/lib/game/note-utils';

export type PerformanceMode = 'full' | 'low';

export interface GameSettings {
  showBackgroundVideo: boolean;
  showPitchGuide: boolean;
  useAnimatedBackground: boolean;
  noteDisplayStyle: string;
  noteShapeStyle: NoteShapeStyle;
  performanceMode: PerformanceMode;
}

export function useGameSettings(): GameSettings & {
  setShowBackgroundVideo: (value: boolean) => void;
  setShowPitchGuide: (value: boolean) => void;
  setUseAnimatedBackground: (value: boolean) => void;
  setNoteDisplayStyle: (value: string) => void;
  setNoteShapeStyle: (value: NoteShapeStyle) => void;
  setPerformanceMode: (value: PerformanceMode) => void;
} {
  // Helper to safely read localStorage (returns null in SSR)
  const getStored = (key: string): string | null => {
    try { return localStorage.getItem(key); } catch { return null; }
  };

  // Initialize with stored values to avoid flash of default on mount
  const [showBackgroundVideo, setShowBackgroundVideo] = useState(
    () => getStored('karaoke-bg-video') !== 'false'
  );
  const [showPitchGuide, setShowPitchGuide] = useState(
    () => getStored('karaoke-show-pitch-guide') !== 'false'
  );
  const [useAnimatedBackground, setUseAnimatedBackground] = useState(
    () => getStored('karaoke-animated-bg') === 'true'
  );
  const [noteDisplayStyle, setNoteDisplayStyle] = useState(
    () => getStored('karaoke-note-style') || 'classic'
  );
  const [noteShapeStyle, setNoteShapeStyle] = useState<NoteShapeStyle>(() => {
    const stored = getStored('karaoke-note-shape') as NoteShapeStyle | null;
    if (stored && ['rounded', 'sharp', 'pill', 'diamond'].includes(stored)) {
      return stored;
    }
    const theme = getStoredTheme();
    return theme?.noteStyle || 'rounded';
  });
  const [performanceMode, setPerformanceMode] = useState<PerformanceMode>(() => {
    const stored = getStored('karaoke-performance-mode') as PerformanceMode | null;
    return stored === 'low' ? 'low' : 'full';
  });

  // Load initial settings and listen for changes
  useEffect(() => {
    // Load initial values from localStorage
    setShowBackgroundVideo(localStorage.getItem('karaoke-bg-video') !== 'false');
    setShowPitchGuide(localStorage.getItem('karaoke-show-pitch-guide') !== 'false');
    setNoteDisplayStyle(localStorage.getItem('karaoke-note-style') || 'classic');
    setUseAnimatedBackground(localStorage.getItem('karaoke-animated-bg') === 'true');

    // Load note shape style - PRIORITIZE localStorage setting over theme
    const storedNoteShape = localStorage.getItem('karaoke-note-shape') as NoteShapeStyle | null;
    if (storedNoteShape && ['rounded', 'sharp', 'pill', 'diamond'].includes(storedNoteShape)) {
      setNoteShapeStyle(storedNoteShape);
    } else {
      // Fallback to theme only if no explicit localStorage setting
      const storedTheme = getStoredTheme();
      if (storedTheme) {
        setNoteShapeStyle(storedTheme.noteStyle);
      }
    }

    const handleSettingsChange = (e?: Event) => {
      // Handle custom event with detail
      if (e && 'detail' in e) {
        const detail = (e as CustomEvent).detail;
        if (detail.showPitchGuide !== undefined) {
          setShowPitchGuide(detail.showPitchGuide);
        }
        if (detail.noteDisplayStyle !== undefined) {
          setNoteDisplayStyle(detail.noteDisplayStyle);
        }
        if (detail.useAnimatedBackground !== undefined) {
          setUseAnimatedBackground(detail.useAnimatedBackground);
        }
        if (detail.noteShapeStyle !== undefined) {
          setNoteShapeStyle(detail.noteShapeStyle);
        }
      }
      // Always refresh from localStorage
      setShowBackgroundVideo(localStorage.getItem('karaoke-bg-video') !== 'false');
      setShowPitchGuide(localStorage.getItem('karaoke-show-pitch-guide') !== 'false');
      setNoteDisplayStyle(localStorage.getItem('karaoke-note-style') || 'classic');
      setUseAnimatedBackground(localStorage.getItem('karaoke-animated-bg') === 'true');

      // Refresh note shape style - PRIORITIZE localStorage
      const storedShape = localStorage.getItem('karaoke-note-shape') as NoteShapeStyle | null;
      if (storedShape && ['rounded', 'sharp', 'pill', 'diamond'].includes(storedShape)) {
        setNoteShapeStyle(storedShape);
      }
      // Refresh performance mode
      const storedPerf = localStorage.getItem('karaoke-performance-mode') as PerformanceMode | null;
      if (storedPerf === 'low' || storedPerf === 'full') {
        setPerformanceMode(storedPerf);
      }
    };

    // Listen for theme changes specifically - only update if no localStorage setting
    const handleThemeChange = () => {
      const storedShape = localStorage.getItem('karaoke-note-shape') as NoteShapeStyle | null;
      if (!storedShape || !['rounded', 'sharp', 'pill', 'diamond'].includes(storedShape)) {
        const theme = getStoredTheme();
        if (theme) {
          setNoteShapeStyle(theme.noteStyle);
        }
      }
    };

    window.addEventListener('storage', handleSettingsChange);
    window.addEventListener('settingsChange', handleSettingsChange);
    window.addEventListener('themeChanged', handleThemeChange);
    window.addEventListener('themeChange', handleThemeChange);
    
    // NOTE: No polling interval — this is a Tauri app, not a browser.
    // The storage event + custom events handle all settings changes.
    // Cross-tab sync is not needed for a desktop Tauri application.
    
    return () => {
      window.removeEventListener('storage', handleSettingsChange);
      window.removeEventListener('settingsChange', handleSettingsChange);
      window.removeEventListener('themeChanged', handleThemeChange);
      window.removeEventListener('themeChange', handleThemeChange);
    };
  }, []);

  return {
    showBackgroundVideo,
    showPitchGuide,
    useAnimatedBackground,
    noteDisplayStyle,
    noteShapeStyle,
    performanceMode,
    setShowBackgroundVideo,
    setShowPitchGuide,
    setUseAnimatedBackground,
    setNoteDisplayStyle,
    setNoteShapeStyle,
    setPerformanceMode,
  };
}
