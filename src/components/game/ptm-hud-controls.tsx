'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePartyStore } from '@/lib/game/party-store';
import type { PassTheMicSettings } from '@/components/game/ptm-types';

interface PtmHudControlsProps {
  safeSettings: PassTheMicSettings;
  isPlaying: boolean;
  onTogglePause: () => void;
  activeWebcamStreamsRef: React.MutableRefObject<MediaStream[]>;
  onEndSong: () => void;
}

export function PtmHudControls({
  safeSettings,
  isPlaying,
  onTogglePause,
  activeWebcamStreamsRef,
  onEndSong,
}: PtmHudControlsProps) {
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const pauseDialogAction = usePartyStore(s => s.pauseDialogAction);

  const [difficulty, setDifficulty] = useState(safeSettings.difficulty);

  // Sync difficulty with safeSettings prop
  useEffect(() => {
    setDifficulty(safeSettings.difficulty);
  }, [safeSettings.difficulty]);

  const setPassTheMicSettings = usePartyStore(s => s.setPassTheMicSettings);

  const cycleDifficulty = useCallback(() => {
    const levels: Array<'easy' | 'medium' | 'hard'> = ['easy', 'medium', 'hard'];
    const next = levels[(levels.indexOf(difficulty) + 1) % levels.length];
    setDifficulty(next);
    // Persist to party store so scoring uses the new difficulty
    setPassTheMicSettings({ ...safeSettings, difficulty: next });
  }, [difficulty, safeSettings, setPassTheMicSettings]);

  const toggleWebcam = useCallback(() => {
    if (webcamStream) {
      webcamStream.getTracks().forEach(t => t.stop());
      activeWebcamStreamsRef.current = activeWebcamStreamsRef.current.filter(s => s !== webcamStream);
      setWebcamStream(null);
    } else {
      navigator.mediaDevices?.getUserMedia({ video: true })
        .then(stream => {
          activeWebcamStreamsRef.current.push(stream);
          setWebcamStream(stream);
        })
        .catch(() => {});
    }
  }, [webcamStream, activeWebcamStreamsRef]);

  // Sync pause state with party store (e.g. keyboard Escape sets it)
  useEffect(() => {
    if (pauseDialogAction === 'song-pause' && isPlaying) {
      onTogglePause();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pauseDialogAction, isPlaying, onTogglePause]);

  // Clean up webcam stream on unmount
  useEffect(() => {
    return () => {
      if (webcamStream) {
        webcamStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [webcamStream]);

  const handleFullscreen = useCallback(() => {
    // Try Tauri fullscreen first, fall back to browser Document.fullscreen
    if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
      import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
        const win = getCurrentWindow();
        win.isFullscreen().then(isFs => {
          win.setFullscreen(!isFs).catch(() => {});
        }).catch(() => {
          // Fallback to browser fullscreen
          if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
          else document.documentElement.requestFullscreen().catch(() => {});
        });
      }).catch(() => {
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        else document.documentElement.requestFullscreen().catch(() => {});
      });
    } else {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      else document.documentElement.requestFullscreen().catch(() => {});
    }
  }, []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      {/* Webcam preview overlay */}
      {webcamStream && (
        <video
          autoPlay
          playsInline
          muted
          ref={(el) => { if (el) el.srcObject = webcamStream; }}
          className="pointer-events-auto fixed bottom-20 right-4 w-[200px] rounded-xl z-[100] border-2 border-white/30 cursor-pointer"
          onClick={toggleWebcam}
          title="Kamera schließen"
        />
      )}

      {/* Top-left: Beenden + Pause */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 pointer-events-auto">
        <Button
          onClick={onEndSong}
          variant="ghost"
          size="sm"
          className="text-white/30 hover:text-red-400 hover:bg-white/10 h-8 rounded-md gap-1.5 px-3 text-xs"
          title="Song beenden"
        >
          ⏹ Beenden
        </Button>
        <Button
          variant="ghost"
          onClick={onTogglePause}
          className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg w-10 h-10 p-0 text-sm"
          title={isPlaying ? 'Pause' : 'Fortsetzen'}
        >
          {isPlaying ? '⏸' : '▶'}
        </Button>
      </div>

      {/* Top-right: Kamera + Difficulty + Vollbild */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2 pointer-events-auto">
        <Button
          variant="ghost"
          onClick={toggleWebcam}
          className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg w-10 h-10 p-0 text-sm"
          title="Kamera"
        >
          📷
        </Button>
        <Badge
          variant="outline"
          onClick={cycleDifficulty}
          className={`text-[10px] px-2 py-0.5 border-white/20 cursor-pointer select-none hover:opacity-80 ${
            difficulty === 'easy'
              ? 'bg-green-500/20 text-green-400 border-green-500/30'
              : difficulty === 'hard'
                ? 'bg-red-500/20 text-red-400 border-red-500/30'
                : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
          }`}
        >
          {difficulty === 'easy'
            ? 'Leicht'
            : difficulty === 'hard'
              ? 'Schwer'
              : 'Mittel'}
        </Badge>
        <Button
          variant="ghost"
          onClick={handleFullscreen}
          className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg w-10 h-10 p-0 text-sm"
          title="Vollbild"
        >
          ⛶
        </Button>
      </div>
    </div>
  );
}
