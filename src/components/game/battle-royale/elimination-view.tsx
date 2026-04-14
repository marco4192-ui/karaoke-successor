'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { BattleRoyalePlayer } from '@/lib/game/battle-royale';

interface EliminationViewProps {
  eliminatedPlayer: BattleRoyalePlayer | undefined;
  remainingPlayersCount: number;
}

export function EliminationView({ eliminatedPlayer, remainingPlayersCount }: EliminationViewProps) {
  return (
    <div className="max-w-4xl mx-auto text-center">
      <div className="bg-gradient-to-r from-red-500/30 to-pink-500/30 border-2 border-red-500 rounded-xl p-12">
        <div className="text-6xl mb-6 animate-bounce">💔</div>
        <h1 className="text-3xl font-bold text-red-400 mb-4">ELIMINATED!</h1>
        
        {/* Player card with "look up and turn gray" animation */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            {/* The avatar that "looks up" and turns gray */}
            {eliminatedPlayer?.avatar ? (
              <div className="relative">
                <img 
                  src={eliminatedPlayer.avatar} 
                  alt={eliminatedPlayer.name} 
                  className="w-24 h-24 rounded-full object-cover border-4 border-red-500 transition-all duration-1000"
                  style={{
                    filter: 'grayscale(100%)',
                    opacity: 0.5,
                    transform: 'rotateX(15deg)', // "Looking up" effect
                  }}
                />
                {/* Sad eyes overlay */}
                <div className="absolute inset-0 flex items-center justify-center text-3xl opacity-70">
                  😢
                </div>
              </div>
            ) : (
              <div 
                className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold border-4 border-red-500 transition-all duration-1000"
                style={{ 
                  backgroundColor: '#666',
                  filter: 'grayscale(100%)',
                  opacity: 0.5,
                  transform: 'rotateX(15deg)',
                }}
              >
                {eliminatedPlayer?.name?.charAt(0).toUpperCase()}
              </div>
            )}
            
            {/* X mark overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-6xl text-red-500 opacity-80 animate-pulse">✕</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold text-white/50">{eliminatedPlayer?.name}</span>
            <Badge className={`${eliminatedPlayer?.playerType === 'microphone' ? 'bg-red-500/20 text-red-400' : 'bg-purple-500/20 text-purple-400'}`}>
              {eliminatedPlayer?.playerType === 'microphone' ? '🎤' : '📱'}
            </Badge>
          </div>
          
          <p className="text-white/40 text-lg">
            Score: <span className="text-red-400 font-bold">{eliminatedPlayer?.score?.toLocaleString()}</span>
          </p>
          
          <p className="text-white/30 text-sm mt-2">
            Eliminated in Round {eliminatedPlayer?.eliminationRound}
          </p>
        </div>
        
        {/* Remaining players count */}
        <div className="mt-6 pt-4 border-t border-white/10">
          <p className="text-white/60">
            <span className="text-amber-400 font-bold">{remainingPlayersCount}</span> players remaining
          </p>
        </div>
      </div>
    </div>
  );
}
