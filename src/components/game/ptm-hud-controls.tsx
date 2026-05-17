'use client';

import { useState, useCallback, useEffect } from 'react';
import { usePartyStore } from '@/lib/game/party-store';
import { PauseButton } from '@/components/game/hud/pause-button';
import { FullscreenButton } from '@/components/game/hud/fullscreen-button';
import { WebcamBackground, WebcamQuickControls } from '@/components/game/webcam-background';
import { loadWebcamConfig, saveWebcamConfig } from '@/components/game/webcam-background';
import type { WebcamBackgroundConfig } from '@/components/game/webcam-background';
import { DifficultyBadge } from '@/components/game/hud/difficulty-badge';
import type { Difficulty } from '@/components/game/hud/difficulty-badge';
import type { PassTheMicSettings } from '@/components/game/ptm-types';

interface PtmHudControlsProps {
  safeSettings: PassTheMicSettings;
  isPlaying: boolean;
  /** Legacy toggle — NOT used for the PauseButton anymore. Kept for backward compat. */
  onTogglePause: () => void;
  activeWebcamStreamsRef: React.MutableRefObject<MediaStream[]>;
}

/**
 * PTM-specific HUD controls that delegate to universal HUD components.
 * Adds PTM-specific logic: difficulty cycling persisted to party store,
 * pause dialog action sync via party store, and WebcamQuickControls
 * (same as the regular game screen) instead of a simple toggle.
 */
export function PtmHudControls({
  safeSettings,
  isPlaying,
  onTogglePause,
  activeWebcamStreamsRef: _activeWebcamStreamsRef,
}: PtmHudControlsProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>(safeSettings.difficulty);
  const pauseDialogAction = usePartyStore(s => s.pauseDialogAction);
  const setPauseDialogAction = usePartyStore(s => s.setPauseDialogAction);
  const setPassTheMicSettings = usePartyStore(s => s.setPassTheMicSettings);

  // Webcam config state (loaded from localStorage, same as regular GameScreen)
  const [webcamConfig, setWebcamConfig] = useState<WebcamBackgroundConfig>(() => loadWebcamConfig());

  const updateWebcamConfig = useCallback((updates: Partial<WebcamBackgroundConfig>) => {
    setWebcamConfig(prev => {
      const newConfig = { ...prev, ...updates };
      saveWebcamConfig(newConfig);
      return newConfig;
    });
  }, []);

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

  // Handle pause: route through the universal SongPauseDialog (via party store)
  // instead of toggling audio directly. This ensures the pause dialog appears
  // both when clicking the PauseButton and when pressing Escape, matching
   // the regular game screen behavior.
  // When the user clicks Resume in the dialog, closeDialog() resets
   // pauseDialogAction to null, which triggers the effect in ptm-game-hook.ts
  // to resume audio playback.
  const handlePauseButtonClick = useCallback(() => {
    if (isPlaying) {
      // Show the universal SongPauseDialog
      setPauseDialogAction('song-pause');
    } else {
      // Resume — close the dialog and let the hook resume audio
      setPauseDialogAction(null);
    }
  }, [isPlaying, setPauseDialogAction]);

  // Sync pause state with party store (e.g. keyboard Escape sets it)
  useEffect(() => {
    if (pauseDialogAction === 'song-pause' && isPlaying) {
      onTogglePause();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pauseDialogAction, isPlaying, onTogglePause]);

  return (
    <>
      {/* Webcam Background — rendered at its own z-level (config.zIndex, default 5) */}
      <WebcamBackground config={webcamConfig} onConfigChange={updateWebcamConfig} />

      <div className="fixed inset-0 z-50 pointer-events-none">
        {/* Top-left: Pause */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2 pointer-events-auto">
          <PauseButton isPlaying={isPlaying} onTogglePause={handlePauseButtonClick} />
        </div>

        {/* Top-right: WebcamQuickControls + Difficulty + Vollbild */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2 pointer-events-auto">
          <WebcamQuickControls config={webcamConfig} onConfigChange={updateWebcamConfig} />
          <DifficultyBadge difficulty={difficulty} onCycleDifficulty={cycleDifficulty} />
          <FullscreenButton />
        </div>
      </div>
    </>
  );
}
