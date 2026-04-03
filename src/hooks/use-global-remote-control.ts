'use client';

import { useEffect, useCallback, useRef } from 'react';

/**
 * Global remote control command types from mobile companions
 */
interface RemoteCommand {
  type: 'play' | 'pause' | 'stop' | 'next' | 'previous' | 'volume' | 'seek' | 'skip' | 'restart' | 'quit' | 'home' | 'library' | 'settings' | 'queue' | 'party' | 'character';
  data?: unknown;
  timestamp: number;
  fromClientId: string;
  fromClientName: string;
}

/**
 * Props for the useGlobalRemoteControl hook
 */
export interface UseGlobalRemoteControlProps {
  /** Navigate to a screen */
  navigateToScreen: (screen: string) => void;
  /** Whether currently in a game */
  isPlaying?: boolean;
  /** Polling interval in milliseconds (default: 1000ms) */
  pollInterval?: number;
}

/**
 * Hook for polling and processing global remote control commands from mobile companions
 * 
 * Handles navigation commands like home, library, settings, etc.
 * This should be used at the app root level to handle commands when not in game.
 */
export function useGlobalRemoteControl({
  navigateToScreen,
  isPlaying = false,
  pollInterval = 1000,
}: UseGlobalRemoteControlProps) {
  const isPlayingRef = useRef(isPlaying);
  const lastCommandTimeRef = useRef(0);
  
  // Keep ref in sync
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Process a single command
  const processCommand = useCallback((cmd: RemoteCommand) => {
    // Skip if command is too old (more than 5 seconds)
    if (Date.now() - cmd.timestamp > 5000) {
      return;
    }
    
    // Skip duplicate commands (same timestamp)
    if (cmd.timestamp === lastCommandTimeRef.current) {
      return;
    }
    lastCommandTimeRef.current = cmd.timestamp;
    
    console.log('[GlobalRemoteControl] Processing command:', cmd.type, 'from:', cmd.fromClientName);
    
    switch (cmd.type) {
      case 'home':
        navigateToScreen('home');
        break;
        
      case 'library':
        navigateToScreen('library');
        break;
        
      case 'settings':
        navigateToScreen('settings');
        break;
        
      case 'queue':
        navigateToScreen('queue');
        break;
        
      case 'party':
        navigateToScreen('party');
        break;
        
      case 'character':
        navigateToScreen('character');
        break;
        
      case 'stop':
      case 'quit':
        // Navigate home and stop any playing content
        navigateToScreen('home');
        break;
        
      // These commands are handled by the GameScreen's useRemoteControl
      // But we also handle them here as fallback when not in game
      case 'play':
      case 'pause':
      case 'next':
      case 'previous':
      case 'restart':
      case 'skip':
      case 'seek':
      case 'volume':
        // These should be handled by GameScreen when playing
        // When not playing, 'play' could navigate to library
        if (!isPlayingRef.current && cmd.type === 'play') {
          navigateToScreen('library');
        }
        break;
        
      default:
        console.log('[GlobalRemoteControl] Unknown command:', cmd.type);
    }
  }, [navigateToScreen]);

  useEffect(() => {
    const pollRemoteCommands = async () => {
      try {
        const response = await fetch('/api/mobile?action=getcommands');
        const data = await response.json();
        
        if (data.success && data.commands && data.commands.length > 0) {
          console.log('[GlobalRemoteControl] Received', data.commands.length, 'commands');
          // Process each command
          for (const cmd of data.commands as RemoteCommand[]) {
            processCommand(cmd);
          }
        }
      } catch (error) {
        console.error('[GlobalRemoteControl] Error polling remote commands:', error);
      }
    };
    
    // Poll at the specified interval
    const interval = setInterval(pollRemoteCommands, pollInterval);
    
    // Initial poll
    pollRemoteCommands();
    
    return () => clearInterval(interval);
  }, [processCommand, pollInterval]);
}

export default useGlobalRemoteControl;
