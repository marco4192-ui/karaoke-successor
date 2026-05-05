'use client';

import { useState, useEffect} from 'react';
import { StorageKeys, getItem, getBool, getString } from '@/lib/storage';
import { getStoredTheme } from '@/lib/game/themes';
import type { NoteShapeStyle } from '@/lib/game/note-utils';

export type PerformanceMode = 'full' | 'low';

const VALID_NOTE_SHAPES: readonly string[] = ['rounded', 'sharp', 'pill', 'diamond'];

/** Safely parse a stored string into NoteShapeStyle, returning null if invalid. */
export function parseNoteShape(raw: string | null): NoteShapeStyle | null {
  if (raw && VALID_NOTE_SHAPES.includes(raw)) return raw as NoteShapeStyle;
  return null;
}

/** Safely parse a stored string into PerformanceMode, returning null if invalid. */
function parsePerformanceMode(raw: string | null): PerformanceMode | null {
  if (raw === 'full' || raw === 'low') return raw;
  return null;
}

export interface GameSettings {
  showBackgroundVideo: boolean;
  showPitchGuide: boolean;
  useAnimatedBackground: boolean;
  noteDisplayStyle: string;
  noteShapeStyle: NoteShapeStyle;
  performanceMode: PerformanceMode;
}

export function useGameSettings(): GameSettings & {
  setShowBackgroundVideo: (_value: boolean) => void;
  setShowPitchGuide: (_value: boolean) => void;
  setUseAnimatedBackground: (_value: boolean) => void;
  setNoteDisplayStyle: (_value: string) => void;
  setNoteShapeStyle: (_value: NoteShapeStyle) => void;
  setPerformanceMode: (_value: PerformanceMode) => void;
} {
  // Initialize with stored values to avoid flash of default on mount
  const [showBackgroundVideo, setShowBackgroundVideo] = useState(
    () => getBool(StorageKeys.BG_VIDEO, true)
  );
  const [showPitchGuide, setShowPitchGuide] = useState(
    () => getBool(StorageKeys.SHOW_PITCH_GUIDE, true)
  );
  const [useAnimatedBackground, setUseAnimatedBackground] = useState(
    () => getBool(StorageKeys.ANIMATED_BG, false)
  );
  const [noteDisplayStyle, setNoteDisplayStyle] = useState(
    () => getString(StorageKeys.NOTE_STYLE, 'classic')
  );
  const [noteShapeStyle, setNoteShapeStyle] = useState<NoteShapeStyle>(() => {
    const stored = parseNoteShape(getString(StorageKeys.NOTE_SHAPE));
    if (stored) return stored;
    const theme = getStoredTheme();
    return theme?.noteStyle || 'rounded';
  });
  const [performanceMode, setPerformanceMode] = useState<PerformanceMode>(() => {
    return parsePerformanceMode(getString(StorageKeys.PERFORMANCE_MODE)) || 'full';
  });

  // Load initial settings and listen for changes
  useEffect(() => {
    // Load initial values from localStorage
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync
    setShowBackgroundVideo(getBool(StorageKeys.BG_VIDEO, true));
    setShowPitchGuide(getBool(StorageKeys.SHOW_PITCH_GUIDE, true));
    setNoteDisplayStyle(getString(StorageKeys.NOTE_STYLE, 'classic'));
    setUseAnimatedBackground(getBool(StorageKeys.ANIMATED_BG, false));

    // Load note shape style - PRIORITIZE localStorage setting over theme
    const storedNoteShape = parseNoteShape(getString(StorageKeys.NOTE_SHAPE));
    if (storedNoteShape) {
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
        if (detail && typeof detail === 'object') {
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
      }
      // Always refresh from localStorage
      setShowBackgroundVideo(getBool(StorageKeys.BG_VIDEO, true));
      setShowPitchGuide(getBool(StorageKeys.SHOW_PITCH_GUIDE, true));
      setNoteDisplayStyle(getString(StorageKeys.NOTE_STYLE, 'classic'));
      setUseAnimatedBackground(getBool(StorageKeys.ANIMATED_BG, false));

      // Refresh note shape style - PRIORITIZE localStorage
      const storedShape = parseNoteShape(getString(StorageKeys.NOTE_SHAPE));
      if (storedShape) {
        setNoteShapeStyle(storedShape);
      }
      // Refresh performance mode
      const storedPerf = parsePerformanceMode(getString(StorageKeys.PERFORMANCE_MODE));
      if (storedPerf) {
        setPerformanceMode(storedPerf);
      }
    };

    // Listen for theme changes specifically - only update if no localStorage setting
    const handleThemeChange = () => {
      const storedShape = parseNoteShape(getString(StorageKeys.NOTE_SHAPE));
      if (!storedShape) {
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
