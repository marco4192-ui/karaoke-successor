/**
 * use-settings-persistence.ts
 * 
 * Hook for managing settings persistence (loading/saving to localStorage)
 * Extracted from settings-screen.tsx for better maintainability
 */

import { useState, useEffect, useCallback } from 'react';
import { Difficulty } from '@/types/game';
import { THEMES, applyTheme, getStoredTheme, Theme } from '@/lib/game/themes';
import { useGameStore } from '@/lib/game/store';
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
}

const DEFAULT_SETTINGS: SettingsState = {
  previewVolume: 30,
  micSensitivity: 50,
  defaultDifficulty: 'medium',
  showPitchGuide: true,
  currentThemeId: 'neon-nights',
  lyricsStyle: 'classic',
  noteDisplayStyle: 'classic',
  noteShapeStyle: 'rounded',
  bgVideo: true,
  useAnimatedBg: false,
};

/**
 * Hook for managing settings persistence to localStorage
 */
export function useSettingsPersistence() {
  const { setDifficulty } = useGameStore();
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveComplete, setSaveComplete] = useState(false);

  // Safe localStorage helpers
  const safeGetItem = useCallback((key: string, defaultValue: string = ''): string => {
    try {
      if (typeof window === 'undefined') return defaultValue;
      return localStorage.getItem(key) || defaultValue;
    } catch {
      return defaultValue;
    }
  }, []);

  const safeGetBool = useCallback((key: string, defaultValue: boolean = true): boolean => {
    try {
      if (typeof window === 'undefined') return defaultValue;
      const val = localStorage.getItem(key);
      return val === null ? defaultValue : val === 'true';
    } catch {
      return defaultValue;
    }
  }, []);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const loadedSettings: Partial<SettingsState> = {};

      const savedPreviewVolume = safeGetItem('karaoke-preview-volume', '30');
      loadedSettings.previewVolume = parseInt(savedPreviewVolume) || 30;

      const savedMicSensitivity = safeGetItem('karaoke-mic-sensitivity', '50');
      loadedSettings.micSensitivity = parseInt(savedMicSensitivity) || 50;

      const savedDifficulty = safeGetItem('karaoke-default-difficulty', 'medium') as Difficulty;
      if (['easy', 'medium', 'hard'].includes(savedDifficulty)) {
        loadedSettings.defaultDifficulty = savedDifficulty;
      }

      loadedSettings.showPitchGuide = safeGetBool('karaoke-show-pitch-guide', true);
      loadedSettings.lyricsStyle = safeGetItem('karaoke-lyrics-style', 'classic');
      loadedSettings.noteDisplayStyle = safeGetItem('karaoke-note-style', 'classic');
      loadedSettings.noteShapeStyle = safeGetItem('karaoke-note-shape', 'rounded');
      loadedSettings.bgVideo = safeGetBool('karaoke-bg-video', true);
      loadedSettings.useAnimatedBg = safeGetItem('karaoke-animated-bg', 'false') === 'true';

      try {
        const storedTheme = getStoredTheme();
        if (storedTheme) loadedSettings.currentThemeId = storedTheme.id;
      } catch {
        // Ignore theme errors
      }

      setSettings(prev => ({ ...prev, ...loadedSettings }));
    } catch {
      // Ignore any localStorage errors
    }
  }, [safeGetItem, safeGetBool]);

  // Update individual setting
  const updateSetting = useCallback(<K extends keyof SettingsState>(
    key: K,
    value: SettingsState[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  }, []);

  // Handle theme change
  const handleThemeChange = useCallback((theme: Theme) => {
    applyTheme(theme);
    setSettings(prev => ({ ...prev, currentThemeId: theme.id }));
    setHasChanges(true);
  }, []);

  // Handle difficulty change
  const handleDifficultyChange = useCallback((diff: Difficulty) => {
    setSettings(prev => ({ ...prev, defaultDifficulty: diff }));
    setHasChanges(true);
  }, []);

  // Handle pitch guide toggle
  const handlePitchGuideToggle = useCallback((enabled: boolean) => {
    setSettings(prev => ({ ...prev, showPitchGuide: enabled }));
    setHasChanges(true);
  }, []);

  // Save all settings to localStorage
  const saveSettings = useCallback(() => {
    try {
      localStorage.setItem('karaoke-preview-volume', settings.previewVolume.toString());
      localStorage.setItem('karaoke-mic-sensitivity', settings.micSensitivity.toString());
      localStorage.setItem('karaoke-default-difficulty', settings.defaultDifficulty);
      localStorage.setItem('karaoke-show-pitch-guide', settings.showPitchGuide.toString());
      localStorage.setItem('karaoke-lyrics-style', settings.lyricsStyle);
      localStorage.setItem('karaoke-bg-video', settings.bgVideo.toString());

      // Apply theme
      const theme = THEMES.find(t => t.id === settings.currentThemeId);
      if (theme) {
        localStorage.setItem('karaoke-theme', JSON.stringify(theme));
        window.dispatchEvent(new CustomEvent('themeChange', { detail: theme.id }));
      }

      // Apply to current game state
      setDifficulty(settings.defaultDifficulty);

      // Dispatch events for other components
      window.dispatchEvent(new CustomEvent('settingsChange', {
        detail: {
          difficulty: settings.defaultDifficulty,
          showPitchGuide: settings.showPitchGuide,
          lyricsStyle: settings.lyricsStyle,
          bgVideo: settings.bgVideo
        }
      }));

      setHasChanges(false);
      setSaveComplete(true);
      setTimeout(() => setSaveComplete(false), 2000);
    } catch (error) {
      logger.error('[Settings]', 'Failed to save settings:', error);
    }
  }, [settings, setDifficulty]);

  return {
    settings,
    hasChanges,
    saveComplete,
    updateSetting,
    handleThemeChange,
    handleDifficultyChange,
    handlePitchGuideToggle,
    saveSettings,
    setHasChanges,
  };
}
