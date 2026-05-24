'use client';

import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n/translations';

interface PauseButtonProps {
  isPlaying: boolean;
  onTogglePause: () => void;
}

/**
 * Universal pause/resume button for all game screens.
 * Uses consistent styling: ghost button, top-left position.
 */
export function PauseButton({ isPlaying, onTogglePause }: PauseButtonProps) {
  const { t } = useTranslation();

  return (
    <Button
      variant="ghost"
      onClick={onTogglePause}
      className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg w-10 h-10 p-0 text-sm"
      title={isPlaying ? t('game.pause') : t('game.resume')}
      data-testid="game-pause-button"
      aria-label={isPlaying ? t('game.pause') : t('game.resume')}
    >
      {isPlaying ? '⏸' : '▶'}
    </Button>
  );
}
