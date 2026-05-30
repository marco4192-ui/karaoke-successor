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
    <div key={countdown} className="absolute inset-0 flex items-center justify-center bg-[#1a0a2e]/80 z-30">
      <div
        className="text-9xl font-black text-[#FDE601] border-[4px] border-black rounded-2xl px-8 py-4"
        style={{
          WebkitTextStroke: '3px #000',
          paintOrder: 'stroke fill',
          boxShadow: '6px 6px 0px #F939A3',
          animation: 'countdownPop 0.3s ease-out'
        }}
      >
        {countdown}
      </div>
    </div>
  );
}
