'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';

interface GameScoreDisplayProps {
  /** Whether duet mode is active (accepted for compat, rendered elsewhere) */
  isDuetMode?: boolean;
  /** Current score (accepted for compat, rendered via ProminentScoreDisplay) */
  score?: number;
  /** Current combo (accepted for compat, rendered via ProminentScoreDisplay) */
  combo?: number;
  difficulty: string;
  activeChallenge: {
    difficulty: string;
    icon: string;
    name: string;
    xpReward: number;
    timeLimit?: number;
  } | null;
  timeRemaining?: number | null;
}

/**
 * Header badge display showing difficulty badge and active challenge mode indicator.
 * Mini score/combo has been moved to ProminentScoreDisplay for single-player.
 */
export const GameScoreDisplay = React.memo(function GameScoreDisplay({
  isDuetMode: _isDuetMode,
  score: _score,
  combo: _combo,
  difficulty,
  activeChallenge,
  timeRemaining,
}: GameScoreDisplayProps) {
  return (
    <div className="flex items-center gap-3">
      <Badge variant="outline" className="border-[3px] border-black text-[#FDFEFD] bg-[#2a1a3e]" style={{ boxShadow: '3px 3px 0px #BA279D' }}>
        {difficulty.toUpperCase()}
      </Badge>

      {/* Active Challenge Mode Indicator */}
      {activeChallenge && (
        <Badge
          className={`px-3 py-1 text-sm font-bold border-[3px] border-black ${
            activeChallenge.difficulty === 'extreme' ? 'bg-[#F939A3] text-white' :
            activeChallenge.difficulty === 'hard' ? 'bg-[#FC6B48] text-black' :
            activeChallenge.difficulty === 'medium' ? 'bg-[#FDE601] text-black' :
            'bg-[#00F3B2] text-black'
          }`}
          style={{ boxShadow: '3px 3px 0px #6B2E77' }}
        >
          {activeChallenge.icon} {activeChallenge.name} (+{activeChallenge.xpReward} XP)
        </Badge>
      )}
      {timeRemaining !== null && timeRemaining !== undefined && timeRemaining > 0 && (
        <Badge className={`px-3 py-1 text-sm font-bold animate-pulse border-[3px] border-black ${
          timeRemaining <= 30 ? 'bg-[#F939A3] text-white' :
          timeRemaining <= 60 ? 'bg-[#FC6B48] text-black' :
          'bg-[#00F3B2] text-black'
        }`}
          style={{ boxShadow: '3px 3px 0px #BA279D' }}
        >
          ⏱️ {Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, '0')}
        </Badge>
      )}
    </div>
  );
});
