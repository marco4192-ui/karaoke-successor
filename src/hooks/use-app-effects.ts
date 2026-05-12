'use client';

import { useState, useEffect, useCallback } from 'react';
import { loadCustomSongsFromStorage } from '@/lib/game/song-library';
import { applyTheme, getStoredTheme } from '@/lib/game/themes';

/**
 * Encapsulates all app-level initialization effects that run on mount
 * and a few reactive effects (fullscreen tracking, theme sync, etc.).
 *
 * Returns `isMounted` (for Tauri hydration guard) and `isFullscreen` /
 * `toggleFullscreen` (for the navbar and fullscreen exit button).
 */
export function useAppEffects() {
  const [isMounted, setIsMounted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Mark as client-side mounted (Tauri hydration guard)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync
    setIsMounted(true);
  }, []);

  // Load custom songs from IndexedDB on mount
  useEffect(() => {
    loadCustomSongsFromStorage().catch(err => {
      // eslint-disable-next-line no-console
      console.warn('[App] Failed to load custom songs from IndexedDB:', err);
    });
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

    // Both event names are registered for backward compatibility:
    // "themeChange" is the original event name; "themeChanged" was added later.
    // The Tauri backend may dispatch either depending on the version.
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
    // Prefer Tauri native fullscreen — it does NOT exit on Escape,
    // unlike the browser Fullscreen API which has hardcoded Escape-to-exit.
    if (typeof window !== 'undefined' && (window.__TAURI__ || window.__TAURI_INTERNALS__)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__TAURI__?.window?.appWindow?.toggleFullscreen?.().catch(() => {});
      return;
    }
    // Fallback: browser Fullscreen API (Escape will exit — unavoidable)
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  // Track fullscreen state from both Tauri and browser sources
  useEffect(() => {
    // Browser fullscreen change
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    // Tauri fullscreen change (if available)
    let tauriUnlisten: (() => void) | null = null;
    if (typeof window !== 'undefined' && (window.__TAURI__ || window.__TAURI_INTERNALS__)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__TAURI__?.window?.appWindow?.onResized?.(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).__TAURI__?.window?.appWindow?.isFullscreen?.().then((isFs: boolean) => {
          setIsFullscreen(isFs);
        }).catch(() => {});
      })?.then((unlisten: () => void) => {
        tauriUnlisten = unlisten;
      }).catch(() => {});
    }

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      tauriUnlisten?.();
    };
  }, []);

  return {
    isMounted,
    isFullscreen,
    toggleFullscreen,
  } as const;
}
