'use client';

/**
 * Multi-Pitch Detector Hook (Code Review #6, 2026-04-17)
 *
 * Manages multiple simultaneous pitch detectors for multi-player karaoke.
 * Wraps PitchDetectorManager with React state, supporting both local players
 * (multiple microphones) and mobile players (pitch data via WebSocket/HTTP polling).
 *
 * Features:
 * - Dynamic player addition/removal during runtime
 * - Per-player pitch results with automatic state management
 * - Per-player error tracking
 * - Shared difficulty setting across all detectors
 * - Cleanup on unmount (singleton preserved)
 *
 * Usage example (2 local mics + 1 companion app):
 * ```tsx
 * const multiPitch = useMultiPitchDetector({
 *   players: [
 *     { playerId: 'p1', type: 'local' },
 *     { playerId: 'p2', type: 'local' },
 *     { playerId: 'p3', type: 'mobile', mobileClientId: 'mobile-123' },
 *   ],
 *   difficulty: 'medium',
 *   autoStart: true,
 * });
 *
 * // Get individual player pitch
 * const p1Pitch = multiPitch.getPlayerPitch('p1');
 * ```
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
  /** Specific microphone device ID (local only). If omitted, uses system default. */
  deviceId?: string;
  mobileClientId?: string; // Required for mobile type
  /** Stereo channel index for stereo split mode (0=left, 1=right). If omitted, uses mono. */
  stereoChannel?: number;
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
  addPlayer: (_config: PlayerPitchConfig) => Promise<boolean>;
  removePlayer: (_playerId: string) => Promise<void>;
  setDifficulty: (_difficulty: Difficulty) => void;
  getPlayerPitch: (_playerId: string) => PitchDetectionResult | null;
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

  // Keep players in a ref so the initialize callback doesn't need it as a dependency
  // (array reference changes every render, which would cause unnecessary re-initialization)
  const playersRef = useRef(players);
  playersRef.current = players;

  const [isInitialized, setIsInitialized] = useState(false);
  const isInitializedRef = useRef(false);
  const [isRunning, setIsRunning] = useState(false);
  const [playerPitches, setPlayerPitches] = useState<Map<string, PitchDetectionResult | null>>(new Map());
  const [errors, setErrors] = useState<Map<string, string>>(new Map());

  const managerRef = useRef<PitchDetectorManager | null>(null);

  /**
   * Initialize all players
   */
  const initialize = useCallback(async (): Promise<boolean> => {
    // H10: Allow re-initialization (e.g., player switch). Stop old manager first.
    // Use ref to check initialization state — avoids stale closure when called rapidly
    if (managerRef.current) {
      try { managerRef.current.stop(); } catch (error) { console.debug('[useMultiPitchDetector]: stop failed during re-init', error); }
      try { await managerRef.current.destroy(); } catch (error) { console.debug('[useMultiPitchDetector]: destroy failed during re-init', error); }
      managerRef.current = null;
      isInitializedRef.current = false;
      setIsInitialized(false);
      setIsRunning(false);
    }

    try {
      // Get or create manager
      const manager = getPitchDetectorManager();

      // DO-NOT-CHANGE: Always clean the singleton before reuse. When the hook
      // unmounts, managerRef is nulled but the singleton retains stale streams/
      // AudioContexts from the previous session. Without this cleanup, the next
      // initialize() call finds stale device state and enters the shared-mic
      // path with dead AudioContexts, causing all players to fail.
      if (manager.getPlayerIds().length > 0) {
        try { await manager.destroy(); } catch { /* best-effort cleanup */ }
      }

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

      // Add all players (read from ref to avoid stale closure)
      const playersList = playersRef.current;

      // CRITICAL: Players sharing the same microphone device MUST be
      // initialized SEQUENTIALLY, not in parallel. The first player on a
      // device calls getUserMedia() + creates the AudioContext. Subsequent
      // players on the same device reuse the shared AudioContext and only
      // create their own AnalyserNode. If they run in parallel via
      // Promise.all(), the second player checks deviceStreamMap BEFORE
      // the first player's async getUserMedia() completes, so it also
      // tries getUserMedia() → multiple AudioContexts → Tauri/WebKit failure.
      const results: boolean[] = [];

      // Group local players by device key
      const deviceKey = (deviceId?: string) => deviceId || '__default__';
      const deviceGroups = new Map<string, typeof playersList>();
      const mobilePlayers: typeof playersList = [];
      const processedPlayerIds = new Set<string>();

      for (const p of playersList) {
        if (p.type === 'mobile' && p.mobileClientId) {
          mobilePlayers.push(p);
        } else if (p.type === 'local') {
          const key = deviceKey(p.deviceId || undefined);
          if (!deviceGroups.has(key)) deviceGroups.set(key, []);
          deviceGroups.get(key)!.push(p);
        }
      }

      // Initialize each device group sequentially (first player opens device,
      // remaining players share the AudioContext)
      for (const [, groupPlayers] of deviceGroups) {
        for (const playerConfig of groupPlayers) {
          try {
            const deviceId = playerConfig.deviceId || undefined;
            const success = await manager.addLocalPlayer(playerConfig.playerId, deviceId, playerConfig.stereoChannel);
            if (!success) {
              setErrors(prev => {
                const newMap = new Map(prev);
                newMap.set(playerConfig.playerId, 'Failed to initialize microphone');
                return newMap;
              });
            }
            results.push(success);
            processedPlayerIds.add(playerConfig.playerId);
          } catch (error) {
            setErrors(prev => {
              const newMap = new Map(prev);
              newMap.set(playerConfig.playerId, error instanceof Error ? error.message : 'Unknown error');
              return newMap;
            });
            results.push(false);
            processedPlayerIds.add(playerConfig.playerId);
          }
        }
      }

      // Mobile players are non-blocking (no device contention)
      for (const playerConfig of mobilePlayers) {
        manager.addMobilePlayer(playerConfig.playerId, playerConfig.mobileClientId!);
        results.push(true);
      }

      const allSuccess = results.every(r => r);

      if (allSuccess || results.some(r => r)) {
        // Log warning if some players failed to initialize
        if (!allSuccess) {
          const failedCount = results.filter(r => !r).length;
          // eslint-disable-next-line no-console
          console.warn(`[useMultiPitchDetector] ${failedCount} player(s) failed to initialize, continuing with ${results.filter(r => r).length} active player(s)`);
        }
        isInitializedRef.current = true;
        setIsInitialized(true);
        
        // Initialize pitch state for all players
        const initialPitches = new Map<string, PitchDetectionResult | null>();
        playersRef.current.forEach(p => initialPitches.set(p.playerId, null));
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
      // eslint-disable-next-line no-console
      console.error('[useMultiPitchDetector] Initialization failed:', error);
      isInitializedRef.current = false;
      return false;
    }
  }, [difficulty, autoStart]);

  /**
   * Start pitch detection
   */
  const start = useCallback(() => {
    if (!managerRef.current || !isInitializedRef.current) {
      // eslint-disable-next-line no-console
      console.error('[useMultiPitchDetector] Not initialized');
      return;
    }

    managerRef.current.start();
    setIsRunning(true);
  }, []);

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
      // eslint-disable-next-line no-console
      console.error('[useMultiPitchDetector] Manager not initialized');
      return false;
    }

    try {
      if (config.type === 'local') {
        // Normalize deviceId: treat empty string same as undefined (use default mic)
        const deviceId = config.deviceId || undefined;
        const success = await managerRef.current.addLocalPlayer(config.playerId, deviceId, config.stereoChannel);
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
   * Get pitch for a specific player.
   * Uses ref to avoid playerPitches in dependency array — this callback
   * must be stable because it's consumed in hot paths (~50Hz pitch updates).
   */
  const playerPitchesRef = useRef(playerPitches);
  playerPitchesRef.current = playerPitches;
  const getPlayerPitch = useCallback((playerId: string): PitchDetectionResult | null => {
    return playerPitchesRef.current.get(playerId) || null;
  }, []);

  /**
   * Cleanup on unmount — fully destroy the singleton so the next
   * initialize() call starts with a clean slate. The old approach of only
   * calling stop() left stale streams/AudioContexts in the singleton, causing
   * subsequent games to fail (see initialize() guard above).
   */
  useEffect(() => {
    return () => {
      if (managerRef.current) {
        managerRef.current.stop();
        // Fire-and-forget async destroy — synchronous cleanup is not possible
        // in React unmount, but initialize() also guards against stale state.
        managerRef.current.destroy().catch(() => {});
        managerRef.current = null;
        isInitializedRef.current = false;
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

