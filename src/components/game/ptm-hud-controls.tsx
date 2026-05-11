'use client';

import { useState, useCallback, useEffect } from 'react';
import { usePartyStore } from '@/lib/game/party-store';
import { PauseButton } from '@/components/game/hud/pause-button';
import { FullscreenButton } from '@/components/game/hud/fullscreen-button';
import { WebcamButton } from '@/components/game/hud/webcam-button';
import { DifficultyBadge } from '@/components/game/hud/difficulty-badge';
import type { Difficulty } from '@/components/game/hud/difficulty-badge';
import type { PassTheMicSettings } from '@/components/game/ptm-types';

interface PtmHudControlsProps {
  safeSettings: PassTheMicSettings;
  isPlaying: boolean;
  onTogglePause: () => void;
  activeWebcamStreamsRef: React.MutableRefObject<MediaStream[]>;
}

/**
 * PTM-specific HUD controls that delegate to universal HUD components.
 * Adds PTM-specific logic: difficulty cycling persisted to party store,
 * and pause dialog action sync via party store.
 */
export function PtmHudControls({
  safeSettings,
  isPlaying,
  onTogglePause,
  activeWebcamStreamsRef,
}: PtmHudControlsProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>(safeSettings.difficulty);
  const pauseDialogAction = usePartyStore(s => s.pauseDialogAction);
  const setPassTheMicSettings = usePartyStore(s => s.setPassTheMicSettings);

  // Sync difficulty with safeSettings prop
  useEffect(() => {
    setDifficulty(safeSettings.difficulty);
  }, [safeSettings.difficulty]);

  // Cycle difficulty and persist to party store so scoring uses the new value
  const cycleDifficulty = useCallback(() => {
    const levels: Difficulty[] = ['easy', 'medium', 'hard'];
    const next = levels[(levels.indexOf(difficulty) + 1) % levels.length];
    setDifficulty(next);
    setPassTheMicSettings({ ...safeSettings, difficulty: next });
  }, [difficulty, safeSettings, setPassTheMicSettings]);

  // Sync pause state with party store (e.g. keyboard Escape sets it)
  // NOTE: The hook (ptm-game-hook.tsx lines 307-315) also handles media pause/resume
  // directly via pauseDialogAction. This effect calls togglePause() to update the
  // isPlaying state as well, keeping UI and media in sync.
  useEffect(() => {
    if (pauseDialogAction === 'song-pause' && isPlaying) {
      onTogglePause();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pauseDialogAction, isPlaying, onTogglePause]);

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Top-left: Pause */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 pointer-events-auto">
        <PauseButton isPlaying={isPlaying} onTogglePause={onTogglePause} />
      </div>

      {/* Top-right: Kamera + Difficulty + Vollbild */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2 pointer-events-auto">
        <WebcamButton activeWebcamStreamsRef={activeWebcamStreamsRef} />
        <DifficultyBadge difficulty={difficulty} onCycleDifficulty={cycleDifficulty} />
        <FullscreenButton />
      </div>
    </div>
  );
}
