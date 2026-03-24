'use client';

import React from 'react';
import { Player } from '@/types/game';
import { MAX_POINTS_PER_SONG } from '@/lib/game/scoring';

interface ProminentScoreDisplayProps {
  player: Player | undefined;
}

/**
 * Prominent score display shown at the top center of the game screen.
 * Shows the current score relative to max possible score and combo multiplier.
 */
export function ProminentScoreDisplay({ player }: ProminentScoreDisplayProps) {
  const score = player?.score || 0;
  const combo = player?.combo || 0;

  return (
    <>
      {/* Total Score Display - Larger, more prominent with max score */}
      <div className="fixed top-14 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
        <div 
          className="bg-black/60 backdrop-blur-md px-10 py-4 rounded-2xl border-2 border-white/20 shadow-xl" 
          style={{ boxShadow: '0 0 40px rgba(34, 211, 238, 0.2)' }}
        >
          <div className="flex flex-col items-center gap-1">
            {/* Main Score */}
            <div className="flex items-baseline gap-3">
              <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 drop-shadow-lg">
                {score.toLocaleString()}
              </span>
              <span className="text-white/40 text-lg">/ {MAX_POINTS_PER_SONG.toLocaleString()}</span>
            </div>
            
            {/* Combo and Multiplier Row */}
            <div className="flex items-center gap-4 text-sm">
              {combo >= 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-yellow-400 font-bold text-lg">
                    {combo}x
                  </span>
                  <span className="text-white/60">COMBO</span>
                  {/* Combo multiplier indicator */}
                  {combo >= 5 && (
                    <span className="text-green-400 font-semibold">
                      (+{Math.round(Math.min(0.5, combo * 0.02) * 100)}%)
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Combo indicator with glow effect */}
      {combo >= 5 && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div 
            className="text-4xl font-black animate-pulse"
            style={{
              color: combo >= 20 ? '#FFD700' : 
                     combo >= 10 ? '#FF6B6B' : '#4ECDC4',
              textShadow: `0 0 20px currentColor, 0 0 40px currentColor, 0 0 60px currentColor`,
            }}
          >
            {combo}x COMBO! 🔥
          </div>
        </div>
      )}
    </>
  );
}
