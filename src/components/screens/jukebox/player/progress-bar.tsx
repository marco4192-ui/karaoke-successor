'use client';

import type { UseJukeboxReturn } from '../jukebox-types';
import { formatDurationSec } from './format-utils';

// ==================== PROGRESS BAR (F1, F2) ====================

export function ProgressBar({ j }: { j: UseJukeboxReturn }) {
  const progress = j.duration > 0 ? j.currentTime / j.duration : 0;

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const fraction = (e.clientX - rect.left) / rect.width;
    j.seekTo(fraction);
  };

  return (
    <div className="flex items-center gap-3 w-full group/pb">
      <span className="text-white/60 text-xs font-mono w-10 text-right tabular-nums">
        {formatDurationSec(j.currentTime)}
      </span>
      <div
        className="flex-1 h-1.5 group-hover/pb:h-2.5 bg-white/15 rounded-full cursor-pointer group relative transition-all"
        onClick={handleSeek}
        role="slider"
        aria-label="Song progress"
        aria-valuenow={Math.round(progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') j.seekTo(Math.min(1, progress + 0.05));
          if (e.key === 'ArrowLeft') j.seekTo(Math.max(0, progress - 0.05));
        }}
      >
        {/* Filled portion with glow */}
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-cyan-300 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.5)] transition-colors"
          style={{ width: `${Math.max(0, Math.min(100, progress * 100))}%` }}
        />
        {/* Playhead dot */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-[0_0_12px_rgba(34,211,238,0.7)] scale-0 group-hover:scale-100 transition-transform"
          style={{ left: `${Math.max(0, Math.min(100, progress * 100))}%` }}
        />
      </div>
      <span className="text-white/60 text-xs font-mono w-10 tabular-nums">
        {formatDurationSec(j.duration)}
      </span>
    </div>
  );
}
