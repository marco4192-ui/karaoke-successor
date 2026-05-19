import { PitchDetectionResult, Difficulty } from '@/types/game';
import { PitchDetector } from './pitch-detector';
import { registerCleanup } from '@/lib/utils/app-cleanup';

// ===================== PITCH DETECTOR MANAGER =====================
// Manages multiple PitchDetector instances for multi-player karaoke

interface PitchDetectorManagerCallbacks {
  onPitchDetected: (playerId: string, result: import('@/types/game').PitchDetectionResult) => void;
}

type PlayerType = 'local' | 'mobile';

interface ManagedPlayer {
  id: string;
  type: PlayerType;
  detector: PitchDetector | null;
  mobileClientId?: string;
  pollingInterval?: ReturnType<typeof setInterval>;
  stereoChannel?: number;  // 0=left, 1=right for stereo split mode
}

export class PitchDetectorManager {
  private players: Map<string, ManagedPlayer> = new Map();
  private callbacks: PitchDetectorManagerCallbacks | null = null;
  private difficulty: Difficulty = 'medium';
  private isRunning = false;

  setCallbacks(callbacks: PitchDetectorManagerCallbacks): void {
    this.callbacks = callbacks;
  }

  setDifficulty(difficulty: Difficulty): void {
    this.difficulty = difficulty;
    this.players.forEach((player) => {
      player.detector?.setDifficulty(difficulty);
    });
  }

  /**
   * Add a local player with their own pitch detector.
   * @param playerId - Unique identifier for this player
   * @param deviceId - Optional specific microphone device ID (multi-mic support)
   */
  async addLocalPlayer(playerId: string, deviceId?: string, stereoChannel?: number): Promise<boolean> {
    if (this.players.has(playerId)) {
      return true; // Already exists
    }

    const detector = new PitchDetector();
    detector.setDifficulty(this.difficulty);

    const success = await detector.initialize(deviceId, stereoChannel);
    if (success) {
      this.players.set(playerId, {
        id: playerId,
        type: 'local',
        detector,
      });

      // If already running, start this detector immediately
      if (this.isRunning) {
        detector.start((_result) => {
          this.callbacks?.onPitchDetected(playerId, _result);
        });
      }

      return true;
    }

    return false;
  }

  addMobilePlayer(playerId: string, mobileClientId: string): void {
    if (this.players.has(playerId)) {
      return; // Already exists
    }

    this.players.set(playerId, {
      id: playerId,
      type: 'mobile',
      detector: null,
      mobileClientId,
    });

    // Start polling for mobile player pitch if already running
    if (this.isRunning) {
      this.startMobilePolling(playerId, mobileClientId);
    }
  }

  async removePlayer(playerId: string): Promise<void> {
    const player = this.players.get(playerId);
    if (!player) return;

    // Stop and destroy detector for local players
    if (player.detector) {
      player.detector.stop();
      await player.detector.destroy();
    }

    // Clear polling interval for mobile players
    if (player.pollingInterval) {
      clearInterval(player.pollingInterval);
    }

    this.players.delete(playerId);
  }

  start(): void {
    this.isRunning = true;
    this.players.forEach((player, playerId) => {
      if (player.type === 'local' && player.detector) {
        player.detector.start((result) => {
          this.callbacks?.onPitchDetected(playerId, result);
        });
      } else if (player.type === 'mobile' && player.mobileClientId) {
        this.startMobilePolling(playerId, player.mobileClientId);
      }
    });
  }

  stop(): void {
    this.isRunning = false;
    this.players.forEach((player) => {
      player.detector?.stop();
      if (player.pollingInterval) {
        clearInterval(player.pollingInterval);
        player.pollingInterval = undefined;
      }
    });
  }

  getPlayerIds(): string[] {
    return Array.from(this.players.keys());
  }

  private startMobilePolling(playerId: string, mobileClientId: string): void {
    const player = this.players.get(playerId);
    if (!player) return;

    // Clear existing interval if any
    if (player.pollingInterval) {
      clearInterval(player.pollingInterval);
    }

    player.pollingInterval = setInterval(async () => {
      try {
        const response = await fetch('/api/mobile?action=getpitch');
        const data = await response.json();
        // Server returns "pitches" array — find the pitch for THIS specific
        // mobile client instead of blindly using pitches[0] (which could be
        // another player's data when multiple companions are connected).
        if (data.success && Array.isArray(data.pitches) && data.pitches.length > 0) {
          const matchingEntry = data.pitches.find(
            (p: { clientId?: string }) => p.clientId === mobileClientId
          );
          if (matchingEntry?.data) {
            const pitchData = matchingEntry.data;
            this.callbacks?.onPitchDetected(playerId, {
              frequency: pitchData.frequency,
              note: pitchData.note,
              clarity: pitchData.clarity || 0,
              volume: pitchData.volume || 0,
              isSinging: pitchData.isSinging,
              singingConfidence: pitchData.singingConfidence,
            });
          }
        }
      } catch (error) {
        console.debug('[pitch-detector]: mobile pitch polling error', error);
      }
    }, 100); // Poll every 100ms — sufficient for real-time sync, reduces server load
  }

  async destroy(): Promise<void> {
    this.stop();
    const destroyPromises = Array.from(this.players.entries()).map(async ([, player]) => {
      if (player.detector) {
        await player.detector.destroy();
      }
    });
    await Promise.all(destroyPromises);
    this.players.clear();
    this.callbacks = null;
  }
}

// Singleton instance for PitchDetectorManager
let pitchDetectorManagerInstance: PitchDetectorManager | null = null;

export function getPitchDetectorManager(): PitchDetectorManager {
  if (!pitchDetectorManagerInstance) {
    pitchDetectorManagerInstance = new PitchDetectorManager();
    registerCleanup('pitch-detector-manager', () => {
      pitchDetectorManagerInstance?.stop();
      // Fire-and-forget async destroy for individual detectors
      pitchDetectorManagerInstance?.destroy().catch(() => {});
      pitchDetectorManagerInstance = null;
    });
  }
  return pitchDetectorManagerInstance;
}
