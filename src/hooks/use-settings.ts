/**
 * useSettings Hook
 * Manages application settings state and localStorage persistence
 * Extracted from settings-screen.tsx for better code organization
 */

import { useState, useEffect, useCallback } from 'react';
import { Difficulty } from '@/types/game';
import { THEMES, applyTheme, getStoredTheme, Theme } from '@/lib/game/themes';
import { useGameStore } from '@/lib/game/store';
import { Language } from '@/lib/i18n/translations';
import { logger } from '@/lib/logger';

export interface SettingsState {
  previewVolume: number;
  micSensitivity: number;
  defaultDifficulty: Difficulty;
  showPitchGuide: boolean;
  currentThemeId: string;
  lyricsStyle: string;
  noteDisplayStyle: string;
  noteShapeStyle: string;
  bgVideo: boolean;
  useAnimatedBg: boolean;
  hasChanges: boolean;
}

export interface UseSettingsReturn extends SettingsState {
  // Setters
  setPreviewVolume: (volume: number) => void;
  setMicSensitivity: (sensitivity: number) => void;
  setDefaultDifficulty: (difficulty: Difficulty) => void;
  setShowPitchGuide: (show: boolean) => void;
  setLyricsStyle: (style: string) => void;
  setNoteDisplayStyle: (style: string) => void;
  setNoteShapeStyle: (style: string) => void;
  setBgVideo: (enabled: boolean) => void;
  setUseAnimatedBg: (enabled: boolean) => void;
  
  // Handlers
  handleThemeChange: (theme: Theme) => void;
  handleDifficultyChange: (difficulty: Difficulty) => void;
  handlePitchGuideToggle: (enabled: boolean) => void;
  handleSaveSettings: () => void;
  markAsChanged: () => void;
  clearChanges: () => void;
  
  // Utils
  safeGetItem: (key: string, defaultValue?: string) => string;
  safeGetBool: (key: string, defaultValue?: boolean) => boolean;
}

/**
 * Safe localStorage helper for string values
 */
function safeGetItem(key: string, defaultValue: string = ''): string {
  try {
    if (typeof window === 'undefined') return defaultValue;
    return localStorage.getItem(key) || defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Safe localStorage helper for boolean values
 */
function safeGetBool(key: string, defaultValue: boolean = true): boolean {
  try {
    if (typeof window === 'undefined') return defaultValue;
    const val = localStorage.getItem(key);
    return val === null ? defaultValue : val === 'true';
  } catch {
    return defaultValue;
  }
}

/**
 * Hook for managing application settings with localStorage persistence
 */
export function useSettings(): UseSettingsReturn {
  const { setDifficulty } = useGameStore();
  
  // Core settings state
  const [previewVolume, setPreviewVolume] = useState(30);
  const [micSensitivity, setMicSensitivity] = useState(50);
  const [defaultDifficulty, setDefaultDifficulty] = useState<Difficulty>('medium');
  const [showPitchGuide, setShowPitchGuide] = useState(true);
  const [currentThemeId, setCurrentThemeId] = useState<string>('neon-nights');
  const [lyricsStyle, setLyricsStyle] = useState<string>('classic');
  const [noteDisplayStyle, setNoteDisplayStyle] = useState<string>('classic');
  const [noteShapeStyle, setNoteShapeStyle] = useState<string>('rounded');
  const [bgVideo, setBgVideo] = useState<boolean>(true);
  const [useAnimatedBg, setUseAnimatedBg] = useState<boolean>(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const savedPreviewVolume = safeGetItem('karaoke-preview-volume', '30');
      setPreviewVolume(parseInt(savedPreviewVolume) || 30);
      
      const savedMicSensitivity = safeGetItem('karaoke-mic-sensitivity', '50');
      setMicSensitivity(parseInt(savedMicSensitivity) || 50);
      
      const savedDifficulty = safeGetItem('karaoke-default-difficulty', 'medium') as Difficulty;
      if (['easy', 'medium', 'hard'].includes(savedDifficulty)) {
        setDefaultDifficulty(savedDifficulty);
      }
      
      setShowPitchGuide(safeGetBool('karaoke-show-pitch-guide', true));
      setLyricsStyle(safeGetItem('karaoke-lyrics-style', 'classic'));
      setNoteDisplayStyle(safeGetItem('karaoke-note-style', 'classic'));
      setNoteShapeStyle(safeGetItem('karaoke-note-shape', 'rounded'));
      setBgVideo(safeGetBool('karaoke-bg-video', true));
      setUseAnimatedBg(safeGetItem('karaoke-animated-bg', 'false') === 'true');
      
      try {
        const storedTheme = getStoredTheme();
        if (storedTheme) setCurrentThemeId(storedTheme.id);
      } catch {
        // Ignore theme errors
      }
    } catch {
      // Ignore any localStorage errors
    }
  }, []);
  
  // Theme change handler
  const handleThemeChange = useCallback((theme: Theme) => {
    applyTheme(theme);
    setCurrentThemeId(theme.id);
    setHasChanges(true);
  }, []);
  
  // Difficulty change handler
  const handleDifficultyChange = useCallback((difficulty: Difficulty) => {
    setDefaultDifficulty(difficulty);
    setHasChanges(true);
  }, []);
  
  // Pitch guide toggle handler
  const handlePitchGuideToggle = useCallback((enabled: boolean) => {
    setShowPitchGuide(enabled);
    setHasChanges(true);
  }, []);
  
  // Mark settings as changed
  const markAsChanged = useCallback(() => {
    setHasChanges(true);
  }, []);
  
  // Clear changes flag
  const clearChanges = useCallback(() => {
    setHasChanges(false);
  }, []);
  
  // Save all settings to localStorage and dispatch events
  const handleSaveSettings = useCallback(() => {
    try {
      localStorage.setItem('karaoke-preview-volume', previewVolume.toString());
      localStorage.setItem('karaoke-mic-sensitivity', micSensitivity.toString());
      localStorage.setItem('karaoke-default-difficulty', defaultDifficulty);
      localStorage.setItem('karaoke-show-pitch-guide', showPitchGuide.toString());
      localStorage.setItem('karaoke-lyrics-style', lyricsStyle);
      localStorage.setItem('karaoke-bg-video', bgVideo.toString());
      
      // Apply theme
      const theme = THEMES.find(t => t.id === currentThemeId);
      if (theme) {
        localStorage.setItem('karaoke-theme', JSON.stringify(theme));
        window.dispatchEvent(new CustomEvent('themeChange', { detail: theme.id }));
      }
      
      // Apply to current game state
      setDifficulty(defaultDifficulty);
      
      // Dispatch events for other components
      window.dispatchEvent(new CustomEvent('settingsChange', { 
        detail: { 
          difficulty: defaultDifficulty, 
          showPitchGuide: showPitchGuide,
          lyricsStyle: lyricsStyle,
          bgVideo: bgVideo
        } 
      }));
      
      setHasChanges(false);
      
      return true;
    } catch (error) {
      logger.error('[Settings]', 'Failed to save settings:', error);
      return false;
    }
  }, [previewVolume, micSensitivity, defaultDifficulty, showPitchGuide, 
      lyricsStyle, bgVideo, currentThemeId, setDifficulty]);
  
  return {
    // State
    previewVolume,
    micSensitivity,
    defaultDifficulty,
    showPitchGuide,
    currentThemeId,
    lyricsStyle,
    noteDisplayStyle,
    noteShapeStyle,
    bgVideo,
    useAnimatedBg,
    hasChanges,
    
    // Setters
    setPreviewVolume,
    setMicSensitivity,
    setDefaultDifficulty,
    setShowPitchGuide,
    setLyricsStyle,
    setNoteDisplayStyle,
    setNoteShapeStyle,
    setBgVideo,
    setUseAnimatedBg,
    
    // Handlers
    handleThemeChange,
    handleDifficultyChange,
    handlePitchGuideToggle,
    handleSaveSettings,
    markAsChanged,
    clearChanges,
    
    // Utils
    safeGetItem,
    safeGetBool,
  };
}

export default useSettings;
