'use client';

import { useCallback, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { STAR_POWER_CONFIG } from '@/lib/game/star-power';
import { Player } from '@/types/game';

/**
 * Props for the useStarPower hook
 */
export interface UseStarPowerProps {
  /** Current player data */
  player: Player | undefined;
  /** Function to update player state */
  updatePlayer: (playerId: string, updates: Partial<Player>) => void;
  /** Whether the hook is enabled (default: true) */
  enabled?: boolean;
}

/**
 * Return type for the useStarPower hook
 */
export interface UseStarPowerReturn {
  /** Function to activate Star Power manually */
  activateStarPower: () => void;
  /** Whether Star Power can be activated */
  canActivate: boolean;
}

/**
 * Hook for managing Star Power activation logic
 * 
 * Handles:
 * - Checking if Star Power can be activated
 * - Activating Star Power via keyboard (Space) or button click
 * - Showing visual feedback via toast
 */
export function useStarPower({
  player,
  updatePlayer,
  enabled = true,
}: UseStarPowerProps): UseStarPowerReturn {
  
  // Check if Star Power can be activated
  const canActivate = player
    ? player.starPower >= STAR_POWER_CONFIG.activationThreshold && !player.isStarPowerActive
    : false;

  // Handle Star Power activation
  const activateStarPower = useCallback(() => {
    if (!player || !canActivate) return;
    
    updatePlayer(player.id, {
      isStarPowerActive: true,
    });
    
    // Show visual feedback
    toast({
      title: '⭐ STAR POWER ACTIVATED!',
      description: '2x points for 10 seconds!',
    });
  }, [player, canActivate, updatePlayer]);

  // Keyboard shortcut for Star Power (Space key)
  useEffect(() => {
    if (!enabled) return;
    
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger if typing in input fields
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }
      
      // Space key activates Star Power
      if (event.key === ' ' || event.code === 'Space') {
        event.preventDefault();
        activateStarPower();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activateStarPower, enabled]);

  return {
    activateStarPower,
    canActivate,
  };
}

export default useStarPower;
