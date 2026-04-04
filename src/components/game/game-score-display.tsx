'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';

interface GameScoreDisplayProps {
  isDuetMode: boolean;
  score: number;
  combo: number;
  difficulty: string;
  activeChallenge: {
    difficulty: string;
    icon: string;
    name: string;
    xpReward: number;
  } | null;
}

/**
 * Header score display showing points, combo, difficulty badge,
 * and active challenge mode indicator.
 */
export function GameScoreDisplay({
  isDuetMode,
  score,
  combo,
  difficulty,
  activeChallenge,
}: GameScoreDisplayProps) {
  return (
    <div className="flex items-center gap-3">
      {/* Mini Score Display - Only for Single Player */}
      {!isDuetMode && (
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-cyan-400 font-bold">{score?.toLocaleString() || 0}</span>
            <span className="text-white/40">pts</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-purple-400 font-bold">{combo || 0}x</span>
            <span className="text-white/40">combo</span>
          </div>
        </div>
      )}
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
}
