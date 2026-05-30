'use client';


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
    <div key={countdown} className="absolute inset-0 flex items-center justify-center z-30" style={{ backgroundColor: 'rgba(10, 0, 20, 0.7)' }}>
      <div
        className="text-9xl font-black animate-pulse"
        style={{
          color: '#00e5ff',
          textShadow: '0 0 20px rgba(0, 229, 255, 0.8), 0 0 40px rgba(0, 229, 255, 0.6), 0 0 80px rgba(0, 229, 255, 0.4), 0 0 120px rgba(0, 229, 255, 0.2)',
          animation: 'countdownPop 0.3s ease-out'
        }}
      >
        {countdown}
      </div>
    </div>
  );
}
