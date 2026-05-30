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
      <Badge variant="outline" className="text-white/80" style={{ borderColor: 'rgba(0, 229, 255, 0.4)' }}>
        {difficulty.toUpperCase()}
      </Badge>

      {/* Active Challenge Mode Indicator */}
      {activeChallenge && (
        <Badge
          className={`px-3 py-1 text-sm font-bold ${
            activeChallenge.difficulty === 'extreme' ? 'border' :
            activeChallenge.difficulty === 'hard' ? 'border' :
            activeChallenge.difficulty === 'medium' ? 'border' :
            'border'
          }`}
          style={{
            backgroundColor: activeChallenge.difficulty === 'extreme' ? 'rgba(255, 45, 149, 0.2)' :
              activeChallenge.difficulty === 'hard' ? 'rgba(255, 45, 149, 0.15)' :
              activeChallenge.difficulty === 'medium' ? 'rgba(255, 214, 10, 0.15)' :
              'rgba(57, 255, 20, 0.15)',
            color: activeChallenge.difficulty === 'extreme' ? '#ff2d95' :
              activeChallenge.difficulty === 'hard' ? '#ff2d95' :
              activeChallenge.difficulty === 'medium' ? '#ffd60a' :
              '#39ff14',
            borderColor: activeChallenge.difficulty === 'extreme' ? 'rgba(255, 45, 149, 0.4)' :
              activeChallenge.difficulty === 'hard' ? 'rgba(255, 45, 149, 0.3)' :
              activeChallenge.difficulty === 'medium' ? 'rgba(255, 214, 10, 0.3)' :
              'rgba(57, 255, 20, 0.3)',
          }}
        >
          {activeChallenge.icon} {activeChallenge.name} (+{activeChallenge.xpReward} XP)
        </Badge>
      )}
      {timeRemaining !== null && timeRemaining !== undefined && timeRemaining > 0 && (
        <Badge className={`px-3 py-1 text-sm font-bold animate-pulse border`}
          style={{
            backgroundColor: timeRemaining <= 30 ? 'rgba(255, 45, 149, 0.2)' :
              timeRemaining <= 60 ? 'rgba(255, 45, 149, 0.15)' :
              'rgba(0, 229, 255, 0.15)',
            color: timeRemaining <= 30 ? '#ff2d95' :
              timeRemaining <= 60 ? '#ff2d95' :
              '#00e5ff',
            borderColor: timeRemaining <= 30 ? 'rgba(255, 45, 149, 0.4)' :
              timeRemaining <= 60 ? 'rgba(255, 45, 149, 0.3)' :
              'rgba(0, 229, 255, 0.3)',
          }}>
          ⏱️ {Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, '0')}
        </Badge>
      )}
    </div>
  );
});
