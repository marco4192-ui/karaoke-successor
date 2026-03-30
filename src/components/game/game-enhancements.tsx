'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useGameStore } from '@/lib/game/store';
import { 
  createStarPowerState, 
  canActivateStarPower, 
  activateStarPower, 
  updateStarPower,
  getStarPowerChargeFromNote,
  STAR_POWER_CONFIG 
} from '@/lib/game/star-power';
import { StarPowerState } from '@/lib/game/star-power';

interface StarPowerBarProps {
  onActivate?: () => void;
  playerId?: string;
}

export function StarPowerBar({ onActivate, playerId }: StarPowerBarProps) {
  const { gameState, updatePlayer } = useGameStore();
  const player = playerId ? gameState.players.find(p => p.id === playerId) : gameState.players[0];
  const lastUpdateRef = useRef<number>(Date.now());
  
  // Derive star power state from player in store
  const starPower: StarPowerState = {
    meter: player?.starPower || 0,
    isActive: player?.isStarPowerActive || false,
    duration: STAR_POWER_CONFIG.duration,
    remainingTime: player?.isStarPowerActive ? STAR_POWER_CONFIG.duration : 0,
    multiplier: player?.isStarPowerActive ? STAR_POWER_CONFIG.multiplier : 1.0,
    cooldown: false,
  };
  
  // Update star power over time when active - drain meter
  useEffect(() => {
    if (!player?.id || !player?.isStarPowerActive) return;
    
    const interval = setInterval(() => {
      const now = Date.now();
      const delta = now - lastUpdateRef.current;
      lastUpdateRef.current = now;
      
      // Drain star power while active
      const drainAmount = (delta / 1000) * STAR_POWER_CONFIG.drainRate;
      const newMeter = Math.max(0, (player.starPower || 0) - drainAmount);
      
      if (newMeter <= 0) {
        // Deactivate when meter is empty
        updatePlayer(player.id, {
          starPower: 0,
          isStarPowerActive: false,
        });
      } else {
        updatePlayer(player.id, {
          starPower: newMeter,
        });
      }
    }, 50);
    
    return () => clearInterval(interval);
  }, [player?.id, player?.isStarPowerActive, player?.starPower, updatePlayer]);
  
  const handleActivate = useCallback(() => {
    if (!player?.id) return;
    
    // Check if we can activate (meter >= threshold and not already active)
    if (starPower.meter >= STAR_POWER_CONFIG.activationThreshold && !starPower.isActive) {
      updatePlayer(player.id, {
        isStarPowerActive: true,
      });
      onActivate?.();
    }
  }, [player?.id, starPower, onActivate, updatePlayer]);
  
  const percentage = (starPower.meter / STAR_POWER_CONFIG.maxMeter) * 100;
  const canActivate = starPower.meter >= STAR_POWER_CONFIG.activationThreshold && !starPower.isActive;
  
  return (
    <div className="relative">
      <div 
        className={`rounded-xl p-3 transition-all ${
          starPower.isActive 
            ? 'bg-gradient-to-r from-yellow-500/30 to-orange-500/30 animate-pulse' 
            : 'bg-white/5'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`text-2xl ${starPower.isActive ? 'animate-bounce' : ''}`}>
            ⭐
          </div>
          
          <div className="flex-1">
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium">
                {starPower.isActive ? 'STAR POWER ACTIVE!' : 'Star Power'}
              </span>
              <span className="text-white/60">
                {Math.round(starPower.meter)}%
              </span>
            </div>
            
            <div className="relative h-4 bg-white/10 rounded-full overflow-hidden">
              <div 
                className={`absolute inset-y-0 left-0 rounded-full transition-all ${
                  starPower.isActive 
                    ? 'bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-400 animate-pulse' 
                    : canActivate
                    ? 'bg-gradient-to-r from-yellow-400 to-orange-400'
                    : 'bg-gradient-to-r from-cyan-500 to-purple-500'
                }`}
                style={{ width: `${percentage}%` }}
              />
              
              {/* Activation threshold marker */}
              <div 
                className="absolute inset-y-0 w-0.5 bg-white/30"
                style={{ left: `${(STAR_POWER_CONFIG.activationThreshold / STAR_POWER_CONFIG.maxMeter) * 100}%` }}
              />
            </div>
            
            {starPower.isActive && (
              <div className="mt-1">
                <Progress 
                  value={(starPower.remainingTime / STAR_POWER_CONFIG.duration) * 100} 
                  className="h-1"
                />
              </div>
            )}
          </div>
          
          <Button
            size="sm"
            onClick={handleActivate}
            disabled={!canActivate}
            className={`min-w-20 ${
              canActivate 
                ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400' 
                : 'bg-white/20'
            }`}
          >
            {starPower.isActive ? `${Math.ceil(starPower.remainingTime / 1000)}s` : 'Activate'}
          </Button>
        </div>
        
        {/* Multiplier indicator */}
        {starPower.isActive && (
          <div className="absolute -top-2 -right-2 bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded-full animate-bounce">
            {starPower.multiplier}x POINTS!
          </div>
        )}
      </div>
    </div>
  );
}

// Spectrogram visualization component
export function SpectrogramVisualizer({ analyserData }: { analyserData: number[] }) {
  return (
    <div className="flex items-end gap-0.5 h-16">
      {analyserData.map((value, i) => (
        <div
          key={i}
          className="w-2 rounded-t transition-all duration-75"
          style={{
            height: `${value * 100}%`,
            background: `hsl(${180 + i * 3}, 100%, ${50 + value * 30}%)`,
          }}
        />
      ))}
    </div>
  );
}

// Performance stats display
export function PerformanceDisplay() {
  const { profiles, activeProfileId } = useGameStore();
  const activeProfile = profiles.find(p => p.id === activeProfileId);
  
  // Avoid hydration mismatch - only show content after mount
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  if (!isMounted) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardContent className="pt-4 text-center text-white/40">
          Loading stats...
        </CardContent>
      </Card>
    );
  }
  
  if (!activeProfile) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardContent className="pt-4 text-center text-white/60">
          Select or create a character to view performance stats
        </CardContent>
      </Card>
    );
  }
  
  const totalGames = activeProfile.gamesPlayed;
  const avgAccuracy = totalGames > 0 
    ? Math.round(activeProfile.stats.totalNotesHit / (activeProfile.stats.totalNotesHit + activeProfile.stats.totalNotesMissed) * 100) 
    : 0;
  
  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
            style={{ backgroundColor: activeProfile.color }}
          >
            {activeProfile.name[0]}
          </div>
          {activeProfile.name}'s Stats
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-2xl font-bold text-cyan-400">{activeProfile.totalScore.toLocaleString()}</p>
            <p className="text-sm text-white/60">Total Score</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-purple-400">{totalGames}</p>
            <p className="text-sm text-white/60">Games Played</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-400">{avgAccuracy}%</p>
            <p className="text-sm text-white/60">Avg Accuracy</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-yellow-400">{activeProfile.stats.bestCombo}</p>
            <p className="text-sm text-white/60">Best Combo</p>
          </div>
        </div>
        
        {activeProfile.achievements.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-white/60 mb-2">Recent Achievements</p>
            <div className="flex flex-wrap gap-2">
              {activeProfile.achievements.slice(0, 5).map(a => (
                <Badge key={a.id} variant="outline" className="border-yellow-500/50 text-yellow-400">
                  {a.icon} {a.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
