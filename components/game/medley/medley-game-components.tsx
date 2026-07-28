/**
 * Medley Contest — Small Reusable UI Components
 *
 * PlayerIntroCard and PitchIndicator used across multiple phases.
 */

import type { PitchDetectionResult } from '@/types/game';
import type { MedleyPlayer } from './medley-types';

// ===================== PLAYER INTRO CARD =====================

export function PlayerIntroCard({ player, inputLabel }: { player: MedleyPlayer; inputLabel: string }) {
  return (
    <div className="bg-white/5 border rounded-lg p-3" style={{ borderColor: player.color + '60' }}>
      <div className="flex items-center gap-3">
        {player.avatar ? (
          <img src={player.avatar} alt={player.name} className="w-10 h-10 rounded-full object-cover border-2" style={{ borderColor: player.color }} />
        ) : (
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold border-2"
            style={{ borderColor: player.color, backgroundColor: player.color + '40' }}>
            {player.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate" style={{ color: player.color }}>{player.name}</div>
          <div className="text-xs text-white/40">{inputLabel}</div>
        </div>
      </div>
    </div>
  );
}

// ===================== PITCH INDICATOR =====================

/** Per-player pitch indicator using individual pitch detection result */
export function PitchIndicator({ player, pitch }: { player: MedleyPlayer; pitch: PitchDetectionResult | null }) {
  const isSinging = pitch?.isSinging === true && (pitch?.volume ?? 0) > 0.05;

  // Calculate a simple accuracy visualization (0-100) based on clarity + singing state
  const accuracy = isSinging && pitch?.clarity != null
    ? Math.min(100, Math.round(pitch.clarity * 100))
    : 0;

  return (
    <div className="flex flex-col items-center gap-1 min-w-[60px]">
      {/* Colored ring with pulse on singing */}
      <div
        className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all ${isSinging ? 'scale-110' : 'scale-100'}`}
        style={{
          borderColor: player.color,
          backgroundColor: isSinging ? player.color + '30' : 'transparent',
          boxShadow: isSinging ? `0 0 12px ${player.color}40` : 'none',
        }}
      >
        <div
          className={`w-5 h-5 rounded-full transition-all ${isSinging ? 'animate-pulse' : ''}`}
          style={{
            backgroundColor: isSinging ? player.color : player.color + '20',
            opacity: isSinging ? 1 : 0.3,
          }}
        />
      </div>
      {/* Player name */}
      <span className="text-xs font-medium" style={{ color: player.color }}>
        {player.name}
      </span>
      {/* Accuracy bar */}
      <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-150"
          style={{ width: `${accuracy}%`, backgroundColor: player.color }}
        />
      </div>
    </div>
  );
}
