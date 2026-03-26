'use client';

import { useState, useEffect, useCallback } from 'react';
import { getStoredTheme } from '@/lib/game/themes';
import type { NoteShapeStyle } from '@/lib/game/note-utils';
import { storage, STORAGE_KEYS } from '@/lib/storage';

export interface GameSettings {
  showBackgroundVideo: boolean;
  showPitchGuide: boolean;
  useAnimatedBackground: boolean;
  noteDisplayStyle: string;
  noteShapeStyle: NoteShapeStyle;
}

export function useGameSettings(): GameSettings & {
  setShowBackgroundVideo: (value: boolean) => void;
  setShowPitchGuide: (value: boolean) => void;
  setUseAnimatedBackground: (value: boolean) => void;
  setNoteDisplayStyle: (value: string) => void;
  setNoteShapeStyle: (value: NoteShapeStyle) => void;
} {
  // Initialize with defaults to avoid hydration mismatch
  const [showBackgroundVideo, setShowBackgroundVideo] = useState(true);
  const [showPitchGuide, setShowPitchGuide] = useState(true);
  const [useAnimatedBackground, setUseAnimatedBackground] = useState(false);
  const [noteDisplayStyle, setNoteDisplayStyle] = useState('classic');
  const [noteShapeStyle, setNoteShapeStyle] = useState<NoteShapeStyle>('rounded');

  // Load initial settings and listen for changes
  useEffect(() => {
    // Load initial values from storage
    setShowBackgroundVideo(storage.getBool(STORAGE_KEYS.BG_VIDEO, true));
    setShowPitchGuide(storage.getBool(STORAGE_KEYS.SHOW_PITCH_GUIDE, true));
    setNoteDisplayStyle(storage.get(STORAGE_KEYS.NOTE_STYLE) || 'classic');
    setUseAnimatedBackground(storage.getBool(STORAGE_KEYS.ANIMATED_BG, false));

    // Load note shape style from current theme
    const storedTheme = getStoredTheme();
    if (storedTheme) {
      setNoteShapeStyle(storedTheme.noteStyle);
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
      }
      // Always refresh from storage
      setShowBackgroundVideo(storage.getBool(STORAGE_KEYS.BG_VIDEO, true));
      setShowPitchGuide(storage.getBool(STORAGE_KEYS.SHOW_PITCH_GUIDE, true));
      setNoteDisplayStyle(storage.get(STORAGE_KEYS.NOTE_STYLE) || 'classic');
      setUseAnimatedBackground(storage.getBool(STORAGE_KEYS.ANIMATED_BG, false));

      // Refresh note shape style from theme
      const theme = getStoredTheme();
      if (theme) {
        setNoteShapeStyle(theme.noteStyle);
      }
    };

    // Listen for theme changes specifically
    const handleThemeChange = () => {
      const theme = getStoredTheme();
      if (theme) {
        setNoteShapeStyle(theme.noteStyle);
      }
    };

    window.addEventListener('storage', handleSettingsChange);
    window.addEventListener('settingsChange', handleSettingsChange);
    window.addEventListener('themeChanged', handleThemeChange);
    window.addEventListener('themeChange', handleThemeChange);
    
    // Poll for changes (needed for cross-tab sync)
    const interval = setInterval(handleSettingsChange, 500);
    
    return () => {
      window.removeEventListener('storage', handleSettingsChange);
      window.removeEventListener('settingsChange', handleSettingsChange);
      window.removeEventListener('themeChanged', handleThemeChange);
      window.removeEventListener('themeChange', handleThemeChange);
      clearInterval(interval);
    };
  }, []);

  return {
    showBackgroundVideo,
    showPitchGuide,
    useAnimatedBackground,
    noteDisplayStyle,
    noteShapeStyle,
    setShowBackgroundVideo,
    setShowPitchGuide,
    setUseAnimatedBackground,
    setNoteDisplayStyle,
    setNoteShapeStyle,
  };
}
