'use client';

import { useState, useEffect, useCallback } from 'react';
import { loadCustomSongsFromStorage } from '@/lib/game/song-library';
import { applyTheme, getStoredTheme } from '@/lib/game/themes';

/** Shared browser fullscreen helper (Escape exits — unavoidable with browser API) */
function toggleBrowserFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
}

/**
 * Enter fullscreen preferring Tauri native API.
 * Exported so other components (auto-fullscreen, exit button) can reuse it.
 */
export async function enterFullscreen() {
  if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const win = getCurrentWindow();
      const isFs = await win.isFullscreen();
      if (!isFs) await win.setFullscreen(true);
      return;
    } catch {
      // Fall through to browser API
    }
  }
  if (!document.fullscreenElement) {
    await document.documentElement.requestFullscreen().catch(() => {});
  }
}

/**
 * Exit fullscreen preferring Tauri native API.
 */
export async function exitFullscreen() {
  if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const win = getCurrentWindow();
      const isFs = await win.isFullscreen();
      if (isFs) await win.setFullscreen(false);
      return;
    } catch {
      // Fall through to browser API
    }
  }
  if (document.fullscreenElement) {
    await document.exitFullscreen().catch(() => {});
  }
}

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
    if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
      import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
        const win = getCurrentWindow();
        win.isFullscreen().then(isFs => {
          win.setFullscreen(!isFs).catch(() => {});
        }).catch(() => {
          toggleBrowserFullscreen();
        });
      }).catch(() => {
        toggleBrowserFullscreen();
      });
      return;
    }
    toggleBrowserFullscreen();
  }, []);

  // Track fullscreen state from both Tauri and browser sources
  useEffect(() => {
    // Browser fullscreen change
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    // Tauri fullscreen change (if available) — use v2 API via dynamic import
    let tauriUnlisten: (() => void) | null = null;
    let aborted = false;
    if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
      import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
        if (aborted) return;
        getCurrentWindow().onResized(() => {
          getCurrentWindow().isFullscreen().then((isFs: boolean) => {
            if (aborted) return;
            setIsFullscreen(isFs);
          }).catch(() => {});
        }).then((unlisten: () => void) => {
          tauriUnlisten = unlisten;
        }).catch(() => {});
      }).catch(() => {});
    }

    return () => {
      aborted = true;
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
