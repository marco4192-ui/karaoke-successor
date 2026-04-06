'use client';

import React from 'react';

interface GameCountdownProps {
  countdown: number;
}

/**
 * Full-screen countdown overlay shown before the song starts.
 * Displays 3, 2, 1 with a pop animation.
 */
export function GameCountdown({ countdown }: GameCountdownProps) {
  if (countdown <= 0) return null;

  return (
    <div key={countdown} className="absolute inset-0 flex items-center justify-center bg-black/60 z-30">
      <div
        className="text-9xl font-black text-white drop-shadow-2xl"
        style={{
          animation: 'countdownPop 0.3s ease-out'
        }}
      >
        {countdown}
      </div>
    </div>
  );
}
