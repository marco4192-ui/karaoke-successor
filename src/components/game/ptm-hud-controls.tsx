'use client';

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
  return (
    <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2">
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
        onClick={() => {
          // Toggle camera/webcam: stop all existing streams, or start a new one
          if (activeWebcamStreamsRef.current.length > 0) {
            // Turn off: stop all streams and remove video elements
            activeWebcamStreamsRef.current.forEach(stream => {
              stream.getTracks().forEach(t => t.stop());
            });
            activeWebcamStreamsRef.current = [];
            document.querySelectorAll('video[style*="z-index:100"]').forEach(el => el.remove());
          } else {
            // Turn on: request camera
            navigator.mediaDevices?.getUserMedia({ video: true })
              .then(stream => {
                activeWebcamStreamsRef.current.push(stream);
                const video = document.createElement('video');
                video.srcObject = stream;
                video.style.cssText = 'position:fixed;bottom:80px;right:16px;width:200px;border-radius:12px;z-index:100;border:2px solid rgba(255,255,255,0.3);';
                document.body.appendChild(video);
                video.play();
                // Click to close
                video.addEventListener('click', () => {
                  stream.getTracks().forEach(t => t.stop());
                  activeWebcamStreamsRef.current = activeWebcamStreamsRef.current.filter(s => s !== stream);
                  video.remove();
                });
              })
              .catch(() => {});
          }
        }}
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
  );
}
