'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { PassTheMicSettings } from '@/components/game/ptm-types';

interface PtmHudControlsProps {
  safeSettings: PassTheMicSettings;
  onPause?: () => void;
  activeWebcamStreamsRef: React.MutableRefObject<MediaStream[]>;
  onEndSong: () => void;
}

export function PtmHudControls({
  safeSettings,
  onPause,
  activeWebcamStreamsRef,
  onEndSong,
}: PtmHudControlsProps) {
  // React-driven webcam state (replaces imperative document.createElement / document.body.appendChild)
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);

  const toggleWebcam = useCallback(() => {
    if (webcamStream) {
      // Turn off
      webcamStream.getTracks().forEach(t => t.stop());
      activeWebcamStreamsRef.current = activeWebcamStreamsRef.current.filter(s => s !== webcamStream);
      setWebcamStream(null);
    } else {
      // Turn on
      navigator.mediaDevices?.getUserMedia({ video: true })
        .then(stream => {
          activeWebcamStreamsRef.current.push(stream);
          setWebcamStream(stream);
        })
        .catch(() => {});
    }
  }, [webcamStream, activeWebcamStreamsRef]);

  // Clean up webcam stream on unmount
  useEffect(() => {
    return () => {
      if (webcamStream) {
        webcamStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [webcamStream]);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      {/* Webcam preview overlay — rendered via React instead of imperative DOM */}
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
      <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2 pointer-events-auto">
      <div className="flex items-center gap-2">
        {/* Difficulty badge */}
        <Badge
          variant="outline"
          className={`text-[10px] px-2 py-0.5 border-white/20 ${
            safeSettings.difficulty === 'easy'
              ? 'bg-green-500/20 text-green-400 border-green-500/30'
              : safeSettings.difficulty === 'hard'
                ? 'bg-red-500/20 text-red-400 border-red-500/30'
                : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
          }`}
        >
          {safeSettings.difficulty === 'easy'
            ? 'Leicht'
            : safeSettings.difficulty === 'hard'
              ? 'Schwer'
              : 'Mittel'}
        </Badge>
      </div>
      <Button
        variant="ghost"
        onClick={() => onPause?.()}
        className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg w-10 h-10 p-0"
        title="Pause"
      >
        ⏸
      </Button>
      <Button
        variant="ghost"
        onClick={() => {
          // Tauri uses its own Window API for fullscreen (DOM fullscreen API
          // does not work reliably inside Tauri webviews)
          import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
            const win = getCurrentWindow();
            win.isFullscreen().then(isFs => {
              win.setFullscreen(!isFs).catch(() => {});
            }).catch(() => {});
          }).catch(() => {});
        }}
        className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg w-10 h-10 p-0"
        title="Vollbild"
      >
        ⛶
      </Button>
      <Button
        variant="ghost"
        onClick={toggleWebcam}
        className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg w-10 h-10 p-0"
        title="Kamera"
      >
        📷
      </Button>
      {/* Stop button */}
      <Button
        onClick={onEndSong}
        variant="ghost"
        size="sm"
        className="text-white/30 hover:text-red-400 text-xs"
        title="Song beenden"
      >
        ⏹ Beenden
      </Button>
      </div>
    </div>
  );
}
