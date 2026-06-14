'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n/translations';

interface FullscreenButtonProps {
  className?: string;
}

/**
 * Universal fullscreen toggle button.
 * Tracks fullscreen state via fullscreenchange events so it stays correct
 * even when the user exits fullscreen via Escape key or OS controls.
 * Tries Tauri fullscreen API first, falls back to browser Document.fullscreen.
 */
export function FullscreenButton({ className }: FullscreenButtonProps) {
  const { t } = useTranslation();
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Track fullscreen state changes (Escape key, OS controls, etc.)
  useEffect(() => {
    const onFullscreenChange = () => {
      if ('__TAURI_INTERNALS__' in window) {
        // Tauri: query the window API
        import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
          getCurrentWindow().isFullscreen().then((fs) => setIsFullscreen(fs)).catch(() => setIsFullscreen(false));
        }).catch(() => setIsFullscreen(!!document.fullscreenElement));
      } else {
        setIsFullscreen(!!document.fullscreenElement);
      }
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
    };
  }, []);

  const handleFullscreen = useCallback(() => {
    if (typeof window === 'undefined') return;

    if ('__TAURI_INTERNALS__' in window) {
      import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
        const win = getCurrentWindow();
        win.isFullscreen().then(isFs => {
          win.setFullscreen(!isFs).then(() => {
            setIsFullscreen(!isFs);
          }).catch(() => {});
        }).catch(() => {
          toggleBrowserFullscreen();
        });
      }).catch(() => {
        toggleBrowserFullscreen();
      });
    } else {
      toggleBrowserFullscreen();
    }
  }, []);

  return (
    <Button
      variant="ghost"
      onClick={handleFullscreen}
      className={`text-white/80 hover:text-white hover:bg-white/10 rounded-lg w-10 h-10 p-0 text-sm ${className || ''}`}
      title={isFullscreen ? t('common.exitFullscreen') : t('webcamBackground.fullscreen')}
      data-testid="game-fullscreen-button"
      aria-label={isFullscreen ? t('common.exitFullscreen') : t('webcamBackground.fullscreen')}
    >
      {isFullscreen ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 3v3a2 2 0 0 1-2 2H3" />
          <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
          <path d="M3 16h3a2 2 0 0 1 2 2v3" />
          <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 14h6v6" />
          <path d="M20 10h-6v-6" />
          <path d="M14 10l7-7" />
          <path d="M3 21l7-7" />
        </svg>
      )}
    </Button>
  );
}

function toggleBrowserFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  } else {
    document.documentElement.requestFullscreen().catch(() => {});
  }
}
