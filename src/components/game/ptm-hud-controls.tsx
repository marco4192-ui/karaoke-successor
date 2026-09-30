'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { usePartyStore } from '@/lib/game/party-store';
import { PauseButton } from '@/components/game/hud/pause-button';
import { EndSongButton } from '@/components/game/hud/end-song-button';
import { FullscreenButton } from '@/components/game/hud/fullscreen-button';
import { SongTitleBanner } from '@/components/game/hud/song-title-banner';
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
  /** End the current song early WITH evaluation (unified HUD layout: top-left next to Pause) */
  onEndSong?: () => void;
  /** Ref to active webcam streams (for cleanup on unmount). */
  activeWebcamStreamsRef?: React.RefObject<MediaStream[]>;
  /** Song title for the banner 20px right of the pause panel */
  songTitle?: string | null;
  /** Song artist for the banner 20px right of the pause panel */
  songArtist?: string | null;
}

/**
 * PTM-specific HUD controls that delegate to universal HUD components.
 * Adds PTM-specific logic: pause dialog action sync via party store and
 * WebcamQuickControls (same as the regular game screen).
 * Difficulty badge is read-only (configured in the party setup).
 */
export function PtmHudControls({
  safeSettings,
  isPlaying,
  onTogglePause,
  onEndSong,
  songTitle,
  songArtist,
}: PtmHudControlsProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>(safeSettings.difficulty);
  const pauseDialogAction = usePartyStore(s => s.pauseDialogAction);
  const setPauseDialogAction = usePartyStore(s => s.setPauseDialogAction);

  // Webcam config state (loaded from localStorage, same as regular GameScreen)
  const [webcamConfig, setWebcamConfig] = useState<WebcamBackgroundConfig>(() => loadWebcamConfig());

  const updateWebcamConfig = useCallback((updates: Partial<WebcamBackgroundConfig>) => {
    setWebcamConfig(prev => {
      const newConfig = { ...prev, ...updates };
      saveWebcamConfig(newConfig);
      return newConfig;
    });
  }, []);

  // Sync difficulty with safeSettings prop (read-only badge — NO cycling:
  // the difficulty is configured in the party setup, not changed in-game)
  useEffect(() => {
    setDifficulty(safeSettings.difficulty);
  }, [safeSettings.difficulty]);

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

  // Sync pause/resume state with party store (e.g. keyboard Escape sets it)
  // R37: latch-based (medley pattern). The old prev-based resume
  // (`prev === 'song-pause' && now null`) missed 'song-pause' → 'party-leave'
  // → null (desktop ESC-ESC → Back): at the null transition prev was
  // 'party-leave', so a paused PTM song never resumed. The latch records
  // "we paused via dialog" and resumes on the first null transition;
  // togglePause itself is phase-guarded (resume only in 'playing'), so a
  // song ended via EndSong (phase 'song-results') is not restarted.
  // Pausing now also freezes for ANY open dialog (BR parity, R20-2): a
  // 'party-leave' dialog opened while playing stops the song instead of
  // letting it run behind the confirmation.
  const wasPausedByDialogRef = useRef(false);
  useEffect(() => {
    if (pauseDialogAction === null) {
      if (wasPausedByDialogRef.current) {
        wasPausedByDialogRef.current = false;
        // Dialog dismissed (Resume clicked / Back) — toggle back to playing
        onTogglePause(); // internally guarded: resumes only in phase 'playing'
      }
      return;
    }
    // Any open dialog ('song-pause', 'party-leave') while playing → pause
    if (isPlaying) {
      wasPausedByDialogRef.current = true;
      onTogglePause(); // pauses
    }
  }, [pauseDialogAction, isPlaying, onTogglePause]);

  return (
    <>
      {/* Webcam Background — rendered at its own z-level (config.zIndex, default 5) */}
      <WebcamBackground config={webcamConfig} onConfigChange={updateWebcamConfig} />

      <div className="fixed inset-0 z-50 pointer-events-none">
        {/* Top-left cluster: Pause + End Song panel with the song title
            20px to its right (gap-5 = 20px, user request item 7) */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-5">
          <div className="flex items-center gap-1.5 pointer-events-auto rounded-2xl bg-black/35 backdrop-blur-md border border-white/10 p-1.5 shadow-lg shadow-black/40">
            <PauseButton isPlaying={isPlaying} onTogglePause={handlePauseButtonClick} />
            {onEndSong && <EndSongButton onEndSong={onEndSong} />}
          </div>
          <SongTitleBanner title={songTitle} artist={songArtist} />
        </div>

        {/* Top-right: Difficulty (read-only) + Webcam + Fullscreen */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 pointer-events-auto rounded-2xl bg-black/35 backdrop-blur-md border border-white/10 p-1.5 shadow-lg shadow-black/40">
          <DifficultyBadge difficulty={difficulty} />
          <WebcamQuickControls config={webcamConfig} onConfigChange={updateWebcamConfig} />
          <FullscreenButton />
        </div>
      </div>
    </>
  );
}
