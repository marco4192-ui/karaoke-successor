'use client';

import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n/translations';

interface EndSongButtonProps {
  onEndSong: () => void;
  /** Visual variant — compact icon button (matches PauseButton) or with label */
  variant?: 'icon' | 'labeled';
  disabled?: boolean;
}

/**
 * Universal "End Song" button for all game screens.
 * Ends the current song early WITH evaluation (unlike abort, which discards).
 * Rendered top-left next to the PauseButton in every party mode.
 */
export function EndSongButton({ onEndSong, variant = 'icon', disabled }: EndSongButtonProps) {
  const { t } = useTranslation();

  return (
    <Button
      variant="ghost"
      onClick={onEndSong}
      disabled={disabled}
      className={`text-white/80 hover:text-white hover:bg-white/10 rounded-lg ${
        variant === 'icon'
          ? 'w-10 h-10 p-0 text-sm'
          : 'h-10 px-3 text-sm font-medium'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
      title={t('game.endSong')}
      data-testid="game-end-song-button"
      aria-label={t('game.endSong')}
    >
      {variant === 'icon' ? (
        <span className="flex items-center justify-center gap-1 text-base leading-none">
          <span aria-hidden="true">⏭</span>
        </span>
      ) : (
        <>
          <span className="mr-1.5" aria-hidden="true">⏭</span>
          {t('game.endSong')}
        </>
      )}
    </Button>
  );
}
