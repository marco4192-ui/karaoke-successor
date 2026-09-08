'use client';

import { useState, useCallback } from 'react';
import { PauseButton } from '@/components/game/hud/pause-button';
import { EndSongButton } from '@/components/game/hud/end-song-button';
import { FullscreenButton } from '@/components/game/hud/fullscreen-button';
import { DifficultyBadge } from '@/components/game/hud/difficulty-badge';
import { WebcamBackground, WebcamQuickControls } from '@/components/game/webcam-background';
import { loadWebcamConfig, saveWebcamConfig } from '@/components/game/webcam-background';
import type { WebcamBackgroundConfig } from '@/components/game/webcam-background';
import type { Difficulty } from '@/components/game/hud/difficulty-badge';

interface GameHudChromeProps {
  isPlaying: boolean;
  /** Pause handling (usually routes through the universal SongPauseDialog) */
  onTogglePause: () => void;
  /** End the current song early WITH evaluation. Omit to hide the button. */
  onEndSong?: () => void;
  /** Current difficulty — omit to hide the badge (read-only when no cycle handler) */
  difficulty?: Difficulty;
  /** When provided, clicking the difficulty badge cycles easy → medium → hard */
  onCycleDifficulty?: () => void;
  /** Show webcam quick controls (top-right). Default: true */
  showWebcamControls?: boolean;
  /** Render the webcam background layer. Default: true */
  renderWebcamBackground?: boolean;
}

/**
 * Unified HUD chrome for every party-mode game screen (PTM layout is the model):
 *
 *   top-left:  PauseButton + EndSongButton
 *   top-right: WebcamQuickControls + DifficultyBadge + FullscreenButton
 *
 * The chrome owns the webcam config state so modes without previous webcam
 * support (CPTM, Medley, Battle Royal) get it for free. Bottom elements
 * (progress bar, time display, mic indicator, player/score arrangements)
 * stay mode-specific and are composed by each game screen.
 */
export function GameHudChrome({
  isPlaying,
  onTogglePause,
  onEndSong,
  difficulty,
  onCycleDifficulty,
  showWebcamControls = true,
  renderWebcamBackground = true,
}: GameHudChromeProps) {
  const [webcamConfig, setWebcamConfig] = useState<WebcamBackgroundConfig>(() => loadWebcamConfig());

  const updateWebcamConfig = useCallback((updates: Partial<WebcamBackgroundConfig>) => {
    setWebcamConfig(prev => {
      const newConfig = { ...prev, ...updates };
      saveWebcamConfig(newConfig);
      return newConfig;
    });
  }, []);

  return (
    <>
      {renderWebcamBackground && (
        <WebcamBackground config={webcamConfig} onConfigChange={updateWebcamConfig} />
      )}

      <div className="fixed inset-0 z-50 pointer-events-none">
        {/* Top-left: Pause + End Song — glass panel keeps icons readable over bright backgrounds */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 pointer-events-auto rounded-2xl bg-black/35 backdrop-blur-md border border-white/10 p-1.5 shadow-lg shadow-black/40">
          <PauseButton isPlaying={isPlaying} onTogglePause={onTogglePause} />
          {onEndSong && <EndSongButton onEndSong={onEndSong} />}
        </div>

        {/* Top-right: Webcam controls + Difficulty + Fullscreen — matching glass panel */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 pointer-events-auto rounded-2xl bg-black/35 backdrop-blur-md border border-white/10 p-1.5 shadow-lg shadow-black/40">
          {showWebcamControls && (
            <WebcamQuickControls config={webcamConfig} onConfigChange={updateWebcamConfig} />
          )}
          {difficulty && (
            <DifficultyBadge difficulty={difficulty} onCycleDifficulty={onCycleDifficulty} />
          )}
          <FullscreenButton />
        </div>
      </div>
    </>
  );
}
