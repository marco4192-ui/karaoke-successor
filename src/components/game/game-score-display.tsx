'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';

interface GameScoreDisplayProps {
  difficulty: string;
  activeChallenge: {
    difficulty: string;
    icon: string;
    name: string;
    xpReward: number;
  } | null;
}

/**
 * Header badge display showing difficulty badge and active challenge mode indicator.
 * Mini score/combo has been moved to ProminentScoreDisplay for single-player.
 */
export const GameScoreDisplay = React.memo(function GameScoreDisplay({
  difficulty,
  activeChallenge,
}: GameScoreDisplayProps) {
  return (
    <div className="flex items-center gap-3">
      <Badge variant="outline" className="border-white/20 text-white/80">
        {difficulty.toUpperCase()}
      </Badge>

      {/* Active Challenge Mode Indicator */}
      {activeChallenge && (
        <Badge
          className={`px-3 py-1 text-sm font-bold ${
            activeChallenge.difficulty === 'extreme' ? 'bg-red-500/30 text-red-300 border border-red-500/50' :
            activeChallenge.difficulty === 'hard' ? 'bg-orange-500/30 text-orange-300 border border-orange-500/50' :
            activeChallenge.difficulty === 'medium' ? 'bg-yellow-500/30 text-yellow-300 border border-yellow-500/50' :
            'bg-green-500/30 text-green-300 border border-green-500/50'
          }`}
        >
          {activeChallenge.icon} {activeChallenge.name} (+{activeChallenge.xpReward} XP)
        </Badge>
      )}
    </div>
  );
});
