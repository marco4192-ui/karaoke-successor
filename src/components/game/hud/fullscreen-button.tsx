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
      title={isFullscreen ? 'Exit Fullscreen' : t('webcamBackground.fullscreen')}
    >
      {isFullscreen ? '⛶' : '⛶'}
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
