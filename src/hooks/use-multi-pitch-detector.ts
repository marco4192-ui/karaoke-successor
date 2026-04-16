'use client';

/**
 * DEAD CODE (Code Review #5, 2026-04-17)
 *
 * This file is not imported by any other file in the project.
 *
 * Possible function: This hook manages multiple simultaneous pitch detectors for
 * multi-player karaoke. It wraps PitchDetectorManager with React state, supporting
 * both local players (multiple microphones) and mobile players (pitch data via
 * WebSocket). Features dynamic player addition/removal, per-player difficulty, and
 * error handling per player.
 *
 * Currently, the app uses the single-pitch usePitchDetector hook in game-screen.tsx
 * for solo mode, and the mobile pitch polling system handles companion players.
 * There is no unified multi-pitch approach — local multiplayer uses a single
 * pitch detector and the second player's pitch is simulated or comes from mobile.
 *
 * The hook also exports useSinglePitchDetector() as a backward-compatible wrapper.
 *
 * This is the most substantial dead hook (~391 lines) and represents significant
 * design work for a feature that was planned but never fully integrated.
 *
 * Consider: This hook is the foundation for local split-screen multiplayer.
 * It should be used instead of the current ad-hoc pitch detection approach
 * when true local multiplayer is implemented.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { 
  PitchDetectorManager, 
  getPitchDetectorManager, 
} from '@/lib/audio/pitch-detector';
import type { PitchDetectionResult } from '@/types/game';
import { Difficulty } from '@/types/game';

export interface PlayerPitchConfig {
  playerId: string;
  type: 'local' | 'mobile';
  mobileClientId?: string; // Required for mobile type
}

export interface PlayerPitchState {
  playerId: string;
  pitch: PitchDetectionResult | null;
  isInitialized: boolean;
  error: string | null;
}

export interface UseMultiPitchDetectorOptions {
  players: PlayerPitchConfig[];
  difficulty: Difficulty;
  autoStart?: boolean;
}

export interface UseMultiPitchDetectorReturn {
  // State
  isInitialized: boolean;
  isRunning: boolean;
  playerPitches: Map<string, PitchDetectionResult | null>;
  errors: Map<string, string>;
  
  // Actions
  initialize: () => Promise<boolean>;
  start: () => void;
  stop: () => void;
  addPlayer: (config: PlayerPitchConfig) => Promise<boolean>;
  removePlayer: (playerId: string) => Promise<void>;
  setDifficulty: (difficulty: Difficulty) => void;
  getPlayerPitch: (playerId: string) => PitchDetectionResult | null;
}

/**
 * Hook for managing multiple pitch detectors for multi-player karaoke
 * 
 * Usage:
 * ```tsx
 * const multiPitch = useMultiPitchDetector({
 *   players: [
 *     { playerId: 'p1', type: 'local' },
 *     { playerId: 'p2', type: 'mobile', mobileClientId: 'mobile-123' },
 *   ],
 *   difficulty: 'medium',
 * });
 * 
 * // Start detection
 * multiPitch.start();
 * 
 * // Get individual player pitch
 * const p1Pitch = multiPitch.getPlayerPitch('p1');
 * ```
 */
export function useMultiPitchDetector(options: UseMultiPitchDetectorOptions): UseMultiPitchDetectorReturn {
  const { players, difficulty, autoStart = false } = options;

  const [isInitialized, setIsInitialized] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [playerPitches, setPlayerPitches] = useState<Map<string, PitchDetectionResult | null>>(new Map());
  const [errors, setErrors] = useState<Map<string, string>>(new Map());

  const managerRef = useRef<PitchDetectorManager | null>(null);

  /**
   * Initialize all players
   */
  const initialize = useCallback(async (): Promise<boolean> => {
    if (isInitialized) return true;

    try {
      // Get or create manager
      const manager = getPitchDetectorManager();
      managerRef.current = manager;

      // Set callbacks
      manager.setCallbacks({
        onPitchDetected: (playerId: string, result: PitchDetectionResult) => {
          setPlayerPitches(prev => {
            const newMap = new Map(prev);
            newMap.set(playerId, result);
            return newMap;
          });
        },
      });

      // Set difficulty
      manager.setDifficulty(difficulty);

      // Add all players
      const initPromises = players.map(async (playerConfig) => {
        try {
          if (playerConfig.type === 'local') {
            const success = await manager.addLocalPlayer(playerConfig.playerId);
            if (!success) {
              setErrors(prev => {
                const newMap = new Map(prev);
                newMap.set(playerConfig.playerId, 'Failed to initialize microphone');
                return newMap;
              });
            }
            return success;
          } else if (playerConfig.type === 'mobile' && playerConfig.mobileClientId) {
            manager.addMobilePlayer(playerConfig.playerId, playerConfig.mobileClientId);
            return true;
          }
          return false;
        } catch (error) {
          setErrors(prev => {
            const newMap = new Map(prev);
            newMap.set(playerConfig.playerId, error instanceof Error ? error.message : 'Unknown error');
            return newMap;
          });
          return false;
        }
      });

      const results = await Promise.all(initPromises);
      const allSuccess = results.every(r => r);

      if (allSuccess || results.some(r => r)) {
        setIsInitialized(true);
        
        // Initialize pitch state for all players
        const initialPitches = new Map<string, PitchDetectionResult | null>();
        players.forEach(p => initialPitches.set(p.playerId, null));
        setPlayerPitches(initialPitches);

        // Auto-start if requested
        if (autoStart) {
          manager.start();
          setIsRunning(true);
        }

        return true;
      }

      return false;
    } catch (error) {
      console.error('[useMultiPitchDetector] Initialization failed:', error);
      return false;
    }
  }, [isInitialized, players, difficulty, autoStart]);

  /**
   * Start pitch detection
   */
  const start = useCallback(() => {
    if (!managerRef.current || !isInitialized) {
      console.error('[useMultiPitchDetector] Not initialized');
      return;
    }

    managerRef.current.start();
    setIsRunning(true);
  }, [isInitialized]);

  /**
   * Stop pitch detection
   */
  const stop = useCallback(() => {
    if (!managerRef.current) return;

    managerRef.current.stop();
    setIsRunning(false);
    setPlayerPitches(new Map());
  }, []);

  /**
   * Add a new player dynamically
   */
  const addPlayer = useCallback(async (config: PlayerPitchConfig): Promise<boolean> => {
    if (!managerRef.current) {
      console.error('[useMultiPitchDetector] Manager not initialized');
      return false;
    }

    try {
      if (config.type === 'local') {
        const success = await managerRef.current.addLocalPlayer(config.playerId);
        if (success) {
          setPlayerPitches(prev => {
            const newMap = new Map(prev);
            newMap.set(config.playerId, null);
            return newMap;
          });
        }
        return success;
      } else if (config.type === 'mobile' && config.mobileClientId) {
        managerRef.current.addMobilePlayer(config.playerId, config.mobileClientId);
        setPlayerPitches(prev => {
          const newMap = new Map(prev);
          newMap.set(config.playerId, null);
          return newMap;
        });
        return true;
      }
      return false;
    } catch (error) {
      setErrors(prev => {
        const newMap = new Map(prev);
        newMap.set(config.playerId, error instanceof Error ? error.message : 'Unknown error');
        return newMap;
      });
      return false;
    }
  }, []);

  /**
   * Remove a player
   */
  const removePlayer = useCallback(async (playerId: string): Promise<void> => {
    if (!managerRef.current) return;

    await managerRef.current.removePlayer(playerId);
    setPlayerPitches(prev => {
      const newMap = new Map(prev);
      newMap.delete(playerId);
      return newMap;
    });
    setErrors(prev => {
      const newMap = new Map(prev);
      newMap.delete(playerId);
      return newMap;
    });
  }, []);

  /**
   * Set difficulty for all detectors
   */
  const setDifficulty = useCallback((newDifficulty: Difficulty) => {
    if (!managerRef.current) return;
    managerRef.current.setDifficulty(newDifficulty);
  }, []);

  /**
   * Get pitch for a specific player
   */
  const getPlayerPitch = useCallback((playerId: string): PitchDetectionResult | null => {
    return playerPitches.get(playerId) || null;
  }, [playerPitches]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (managerRef.current) {
        managerRef.current.stop();
        // Don't destroy the singleton - it can be reused
      }
    };
  }, []);

  /**
   * Update difficulty when it changes
   */
  useEffect(() => {
    if (managerRef.current) {
      managerRef.current.setDifficulty(difficulty);
    }
  }, [difficulty]);

  /**
   * Sync players with manager when players list changes
   */
  useEffect(() => {
    if (!managerRef.current || !isInitialized) return;

    const manager = managerRef.current;
    const currentPlayerIds = manager.getPlayerIds();
    const newPlayerIds = players.map(p => p.playerId);

    // Remove players that are no longer in the list
    currentPlayerIds.forEach(id => {
      if (!newPlayerIds.includes(id)) {
        manager.removePlayer(id);
      }
    });

    // Add new players (this will be handled by addPlayer calls from the component)
  }, [players, isInitialized]);

  return {
    isInitialized,
    isRunning,
    playerPitches,
    errors,
    initialize,
    start,
    stop,
    addPlayer,
    removePlayer,
    setDifficulty,
    getPlayerPitch,
  };
}

/**
 * Simplified hook for single-player mode (backward compatibility)
 * Uses the same PitchDetectorManager under the hood
 */
export function useSinglePitchDetector(difficulty: Difficulty = 'medium') {
  const [pitch, setPitch] = useState<PitchDetectionResult | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const managerRef = useRef<PitchDetectorManager | null>(null);
  const playerIdRef = useRef<string>(`player-${Date.now()}`);

  const initialize = useCallback(async () => {
    if (isInitialized) return true;

    try {
      const manager = getPitchDetectorManager();
      managerRef.current = manager;

      manager.setCallbacks({
        onPitchDetected: (playerId: string, result: PitchDetectionResult) => {
          if (playerId === playerIdRef.current) {
            setPitch(result);
          }
        },
      });

      manager.setDifficulty(difficulty);

      const success = await manager.addLocalPlayer(playerIdRef.current);
      if (success) {
        setIsInitialized(true);
        return true;
      }

      setError('Failed to initialize microphone');
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  }, [isInitialized, difficulty]);

  const start = useCallback(() => {
    if (!managerRef.current || !isInitialized) return;
    managerRef.current.start();
    setIsListening(true);
  }, [isInitialized]);

  const stop = useCallback(() => {
    if (!managerRef.current) return;
    managerRef.current.stop();
    setIsListening(false);
    setPitch(null);
  }, []);

  const setDifficultyHook = useCallback((newDifficulty: Difficulty) => {
    if (!managerRef.current) return;
    managerRef.current.setDifficulty(newDifficulty);
  }, []);

  useEffect(() => {
    return () => {
      if (managerRef.current) {
        managerRef.current.stop();
      }
    };
  }, []);

  return {
    isInitialized,
    isListening,
    error,
    pitchResult: pitch,
    initialize,
    start,
    stop,
    setDifficulty: setDifficultyHook,
  };
}
