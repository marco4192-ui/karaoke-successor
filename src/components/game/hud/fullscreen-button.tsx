'use client';

import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n/translations';

interface FullscreenButtonProps {
  className?: string;
}

/**
 * Universal fullscreen toggle button.
 * Tries Tauri fullscreen API first, falls back to browser Document.fullscreen.
 * Tauri-only: No browser-specific solution needed.
 */
export function FullscreenButton({ className }: FullscreenButtonProps) {
  const { t } = useTranslation();

  const handleFullscreen = () => {
    if (typeof window === 'undefined') return;

    // Try Tauri fullscreen first
    if ('__TAURI_INTERNALS__' in window) {
      import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
        const win = getCurrentWindow();
        win.isFullscreen().then(isFs => {
          win.setFullscreen(!isFs).catch(() => {});
        }).catch(() => {
          // Fallback to browser fullscreen
          toggleBrowserFullscreen();
        });
      }).catch(() => {
        toggleBrowserFullscreen();
      });
    } else {
      toggleBrowserFullscreen();
    }
  };

  return (
    <Button
      variant="ghost"
      onClick={handleFullscreen}
      className={`text-white/80 hover:text-white hover:bg-white/10 rounded-lg w-10 h-10 p-0 text-sm ${className || ''}`}
      title={t('webcamBackground.fullscreen')}
    >
      ⛶
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
