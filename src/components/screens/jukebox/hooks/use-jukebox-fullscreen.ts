'use client';

import { useState, useCallback, useEffect } from 'react';
import type { JukeboxCoreState } from './jukebox-hook-types';

// ===================== PARAMS / RETURN =====================

export interface UseJukeboxFullscreenParams {
  core: JukeboxCoreState;
}

export interface UseJukeboxFullscreenReturn {
  isFullscreen: boolean;
  toggleFullscreen: () => void;
}

// ===================== HOOK =====================

/**
 * Fullscreen handling for the jukebox (R10 extraction): the fullscreen
 * state, the container-based toggle, the fullscreenchange listener and the
 * jukebox:fullscreen event from the companion remote control.
 */
export function useJukeboxFullscreen({ core }: UseJukeboxFullscreenParams): UseJukeboxFullscreenReturn {
  const { containerRef } = core;
  const [isFullscreen, setIsFullscreen] = useState(false);

  // ==================== FULLSCREEN ====================

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement === containerRef.current) {
      document.exitFullscreen();
    } else if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current?.requestFullscreen().catch(() => {});
    }
  }, [containerRef]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [containerRef]);

  // Listen for jukebox:fullscreen event from companion remote control
  useEffect(() => {
    const handleJukeboxFullscreen = () => {
      toggleFullscreen();
    };
    window.addEventListener('jukebox:fullscreen', handleJukeboxFullscreen);
    return () => window.removeEventListener('jukebox:fullscreen', handleJukeboxFullscreen);
  }, [toggleFullscreen]);

  return { isFullscreen, toggleFullscreen };
}
