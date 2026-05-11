'use client';

import React from 'react';
import { PauseButton } from './pause-button';
import { FullscreenButton } from './fullscreen-button';
import { WebcamButton } from './webcam-button';
import { DifficultyBadge } from './difficulty-badge';
import type { Difficulty } from './difficulty-badge';
import { GameProgressBar } from '@/components/game/game-hud';
import { TimeDisplay } from '@/components/game/game-hud';
import { GameCountdown } from '@/components/game/game-countdown';

type GameMode = 'standard' | 'duel' | 'duet' | 'ptm' | 'battle-royale' | 'medley' | 'companion' | 'missing-words' | 'blind';

export interface GameHudShellProps {
  /** Current playback state */
  isPlaying: boolean;
  /** Callback to toggle pause/resume */
  onTogglePause: () => void;
  /** Current song time in ms */
  currentTime: number;
  /** Total song duration in ms */
  duration: number;
  /** Game mode — controls which elements are shown */
  gameMode?: GameMode;
  /** Countdown value (> 0 = show countdown overlay) */
  countdown?: number;

  // Optional features (right side)
  /** Show webcam toggle button */
  showWebcam?: boolean;
  /** Ref to track active webcam streams */
  activeWebcamStreamsRef?: React.MutableRefObject<MediaStream[]>;
  /** Show difficulty badge */
  showDifficulty?: boolean;
  /** Current difficulty */
  difficulty?: Difficulty;
  /** Callback to cycle difficulty */
  onCycleDifficulty?: () => void;
  /** Show fullscreen button */
  showFullscreen?: boolean;

  // Slot for mode-specific score displays (rendered between top controls and game area)
  scoreDisplay?: React.ReactNode;
  // Slot for mode-specific overlays (ranking, transitions, etc.)
  overlay?: React.ReactNode;
}

/**
 * Universal HUD shell for all game screens (except Jukebox).
 *
 * Layout:
 *   Top-left:    Pause button
 *   Top-right:   [DifficultyBadge] [WebcamButton] [FullscreenButton]
 *   Center:      (scoreDisplay slot — mode-specific)
 *   Bottom:      ProgressBar + TimeDisplay
 *   Overlay:     (overlay slot — mode-specific)
 *   Fullscreen:  GameCountdown (when countdown > 0)
 *
 * All elements are pointer-events-none except interactive controls.
 */
export function GameHudShell({
  isPlaying,
  onTogglePause,
  currentTime,
  duration,
  gameMode = 'standard',
  countdown = 0,
  showWebcam = true,
  activeWebcamStreamsRef,
  showDifficulty = true,
  difficulty = 'medium',
  onCycleDifficulty,
  showFullscreen = true,
  scoreDisplay,
  overlay,
}: GameHudShellProps) {
  // Hide difficulty in modes that don't use it
  const hideDifficulty = ['battle-royale', 'medley', 'companion'].includes(gameMode);
  const showDiff = showDifficulty && !hideDifficulty;

  // Hide webcam in party modes that don't support it
  const showCam = showWebcam && activeWebcamStreamsRef;

  return (
    <div className="absolute inset-0 z-20 pointer-events-none">
      {/* Top-left: Pause */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 pointer-events-auto">
        <PauseButton isPlaying={isPlaying} onTogglePause={onTogglePause} />
      </div>

      {/* Top-right: Difficulty + Webcam + Fullscreen */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2 pointer-events-auto">
        {showDiff && (
          <DifficultyBadge
            difficulty={difficulty}
            onCycleDifficulty={onCycleDifficulty}
          />
        )}
        {showCam && (
          <WebcamButton activeWebcamStreamsRef={activeWebcamStreamsRef} />
        )}
        {showFullscreen && (
          <FullscreenButton />
        )}
      </div>

      {/* Score display slot (center area, mode-specific) */}
      {scoreDisplay}

      {/* Bottom bar */}
      <GameProgressBar currentTime={currentTime} duration={duration} />
      <TimeDisplay currentTime={currentTime} duration={duration} />

      {/* Mode-specific overlay slot */}
      {overlay}

      {/* Countdown overlay */}
      {countdown > 0 && <GameCountdown countdown={countdown} />}
    </div>
  );
}
