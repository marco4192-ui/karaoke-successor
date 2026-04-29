'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Screen } from '@/types/screens';
import { loadCustomSongsFromStorage } from '@/lib/game/song-library';
import { applyTheme, getStoredTheme } from '@/lib/game/themes';

/**
 * Encapsulates all app-level initialization effects that run on mount
 * and a few reactive effects (fullscreen tracking, theme sync, etc.).
 *
 * Returns `isMounted` (for Tauri hydration guard) and `isFullscreen` /
 * `toggleFullscreen` (for the navbar and fullscreen exit button).
 */
export function useAppEffects(screen: Screen) {
  const [isMounted, setIsMounted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Mark as client-side mounted (Tauri hydration guard)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load custom songs from IndexedDB on mount
  useEffect(() => {
    loadCustomSongsFromStorage().catch(err => {
      console.warn('[App] Failed to load custom songs from IndexedDB:', err);
    });
  }, []);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Apply stored theme on app start + listen for runtime changes
  useEffect(() => {
    const storedTheme = getStoredTheme();
    if (storedTheme) {
      applyTheme(storedTheme);
    }

    const handleThemeChange = () => {
      const theme = getStoredTheme();
      if (theme) {
        applyTheme(theme);
      }
    };

    window.addEventListener('themeChanged', handleThemeChange);
    window.addEventListener('themeChange', handleThemeChange);

    return () => {
      window.removeEventListener('themeChanged', handleThemeChange);
      window.removeEventListener('themeChange', handleThemeChange);
    };
  }, []);

  // Redirect ?mobile=1 to /mobile companion app route
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mobile') !== null) {
      const profile = params.get('profile');
      const targetUrl = profile ? `/mobile?profile=${encodeURIComponent(profile)}` : '/mobile';
      window.location.replace(targetUrl);
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  return {
    isMounted,
    isFullscreen,
    toggleFullscreen,
  } as const;
}
