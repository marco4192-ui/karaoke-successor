'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WebcamQuickControls, WebcamBackgroundConfig } from '@/components/game/webcam-background';

/**
 * GameHeader - Header component for the game screen
 * Contains back button, webcam/stream controls, score display, difficulty and challenge indicators
 */

interface PlayerStats {
  score: number;
  combo: number;
}

interface ChallengeMode {
  id: string;
  name: string;
  icon: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
  xpReward: number;
}

interface GameHeaderProps {
  // Back button
  onBack: () => void;
  
  // Webcam controls
  webcamConfig: WebcamBackgroundConfig;
  onWebcamConfigChange: (updates: Partial<WebcamBackgroundConfig>) => void;
  
  // Stream controls
  isLiveStreaming: boolean;
  onToggleStreamPanel: () => void;
  
  // Score display (single player only)
  playerStats: PlayerStats | null;
  isDuetMode: boolean;
  
  // Difficulty
  difficulty: string;
  
  // Challenge mode
  activeChallenge: ChallengeMode | null;
}

/**
 * Get badge styling based on challenge difficulty
 */
function getChallengeBadgeStyle(difficulty: string): string {
  switch (difficulty) {
    case 'extreme':
      return 'bg-red-500/30 text-red-300 border border-red-500/50';
    case 'hard':
      return 'bg-orange-500/30 text-orange-300 border border-orange-500/50';
    case 'medium':
      return 'bg-yellow-500/30 text-yellow-300 border border-yellow-500/50';
    default:
      return 'bg-green-500/30 text-green-300 border border-green-500/50';
  }
}

export function GameHeader({
  onBack,
  webcamConfig,
  onWebcamConfigChange,
  isLiveStreaming,
  onToggleStreamPanel,
  playerStats,
  isDuetMode,
  difficulty,
  activeChallenge,
}: GameHeaderProps) {
  return (
    <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-2 bg-gradient-to-b from-black/70 to-transparent">
      {/* Left: Back Button */}
      <Button 
        variant="ghost" 
        onClick={onBack} 
        className="text-white/80 hover:text-white hover:bg-white/10"
      >
        ← Back
      </Button>
      
      {/* Center: Webcam & Stream Controls */}
      <div className="flex items-center gap-3">
        <WebcamQuickControls 
          config={webcamConfig} 
          onConfigChange={onWebcamConfigChange}
        />
        <Button
          onClick={onToggleStreamPanel}
          className={`${isLiveStreaming ? 'bg-red-500 animate-pulse' : 'bg-purple-600 hover:bg-purple-500'} text-white`}
          size="sm"
        >
          {isLiveStreaming ? '🔴 LIVE' : '🎥 Stream'}
        </Button>
      </div>
      
      {/* Right: Score, Difficulty & Challenge */}
      <div className="flex items-center gap-3">
        {/* Mini Score Display - Only for Single Player */}
        {!isDuetMode && playerStats && (
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <span className="text-cyan-400 font-bold">{playerStats.score?.toLocaleString() || 0}</span>
              <span className="text-white/40">pts</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-purple-400 font-bold">{playerStats.combo || 0}x</span>
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
            className={`px-3 py-1 text-sm font-bold ${getChallengeBadgeStyle(activeChallenge.difficulty)}`}
          >
            {activeChallenge.icon} {activeChallenge.name} (+{activeChallenge.xpReward} XP)
          </Badge>
        )}
      </div>
    </div>
  );
}

export type { GameHeaderProps, PlayerStats, ChallengeMode };
