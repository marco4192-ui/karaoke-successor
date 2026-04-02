'use client';

import { useState, useEffect, useCallback } from 'react';
import { getStoredTheme } from '@/lib/game/themes';
import type { NoteShapeStyle } from '@/lib/game/note-utils';

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
