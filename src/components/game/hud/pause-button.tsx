'use client';

import { Button } from '@/components/ui/button';

interface PauseButtonProps {
  isPlaying: boolean;
  onTogglePause: () => void;
}

/**
 * Universal pause/resume button for all game screens.
 * Uses consistent styling: ghost button, top-left position.
 */
export function PauseButton({ isPlaying, onTogglePause }: PauseButtonProps) {
  return (
    <Button
      variant="ghost"
      onClick={onTogglePause}
      className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg w-10 h-10 p-0 text-sm"
      title={isPlaying ? 'Pause' : 'Fortsetzen'}
    >
      {isPlaying ? '⏸' : '▶'}
    </Button>
  );
}
