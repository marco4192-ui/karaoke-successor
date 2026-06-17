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
  /** For shared-mic players: the shared AudioContext + MediaStreamSource
   *  are created once by the first player. Subsequent players reuse them
   *  and only create their own AnalyserNode (connected to the shared source). */
  sharedAudioContext?: AudioContext;
  sharedAnalyser?: AnalyserNode;
}

export class PitchDetectorManager {
  private players: Map<string, ManagedPlayer> = new Map();
  private callbacks: PitchDetectorManagerCallbacks | null = null;
  private difficulty: Difficulty = 'medium';
  private isRunning = false;

  /** Tracks which device streams are already open. Key is the deviceId (or '__default__' for undefined). */
  private deviceStreamMap: Map<string, MediaStream> = new Map();
  /** Reference count per device key — stream is stopped only when count reaches 0. */
  private deviceStreamRefCount: Map<string, number> = new Map();
  /** Shared AudioContext per device key — reused across players sharing the same mic.
   *  Creating multiple AudioContexts from the same MediaStream fails in Tauri/WebKit. */
  private deviceAudioContextMap: Map<string, AudioContext> = new Map();
  /** Shared MediaStreamSource per device key. */
  private deviceSourceMap: Map<string, MediaStreamAudioSourceNode> = new Map();

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
   * Normalize a deviceId into a map key. Undefined / empty → '__default__'.
   */
  private static deviceKey(deviceId?: string): string {
    return deviceId || '__default__';
  }

  /**
   * Add a local player with their own pitch detector.
   * If another player has already opened the same microphone device, the
   * existing MediaStream is reused instead of requesting a second one.
   * @param playerId - Unique identifier for this player
   * @param deviceId - Optional specific microphone device ID (multi-mic support)
   */
  async addLocalPlayer(playerId: string, deviceId?: string, stereoChannel?: number): Promise<boolean> {
    if (this.players.has(playerId)) {
      return true; // Already exists
    }

    const key = PitchDetectorManager.deviceKey(deviceId);
    const existingStream = this.deviceStreamMap.get(key);

    if (existingStream) {
      // Another player already opened this device — share the AudioContext.
      // Creating multiple AudioContexts from the same MediaStream fails in
      // Tauri/WebKit. Instead we create a NEW AnalyserNode from the shared
      // source and let a lightweight "proxy" PitchDetector read from it.
      // eslint-disable-next-line no-console
      console.warn(
        `[PitchDetectorManager] Player "${playerId}" shares the same device (key=${JSON.stringify(deviceId ?? undefined)}) as an existing player. Reusing shared AudioContext.`
      );

      try {
        const sharedCtx = this.deviceAudioContextMap.get(key);
        const sharedSource = this.deviceSourceMap.get(key);
        if (!sharedCtx || !sharedSource) {
          // eslint-disable-next-line no-console
          console.error('[PitchDetectorManager] Shared AudioContext/Source missing for key:', key);
          return false;
        }

        // Resume if suspended
        if (sharedCtx.state === 'suspended') {
          await sharedCtx.resume();
        }

        // Create a dedicated AnalyserNode for this player
        const analyser = sharedCtx.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.5;

        if (stereoChannel !== undefined && stereoChannel >= 0) {
          const splitter = sharedCtx.createChannelSplitter(2);
          sharedSource.connect(splitter);
          splitter.connect(analyser, stereoChannel);
        } else {
          sharedSource.connect(analyser);
        }

        // Build a lightweight PitchDetector that uses the shared analyser
        // instead of creating its own AudioContext
        const detector = new PitchDetector();
        detector.setDifficulty(this.difficulty);
        const success = detector.initializeWithSharedAnalyser(analyser, sharedCtx, existingStream);
        if (!success) {
          // eslint-disable-next-line no-console
          console.error('[PitchDetectorManager] Failed to initialize shared analyser for player:', playerId);
          return false;
        }

        this.deviceStreamRefCount.set(key, (this.deviceStreamRefCount.get(key) ?? 0) + 1);
        this.players.set(playerId, {
          id: playerId,
          type: 'local',
          detector,
          stereoChannel,
          sharedAudioContext: sharedCtx,
          sharedAnalyser: analyser,
        });

        if (this.isRunning) {
          detector.start((_result) => {
            this.callbacks?.onPitchDetected(playerId, _result);
          });
        }
        return true;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[PitchDetectorManager] Failed to add shared-mic player:', error);
        return false;
      }
    }

    // No existing stream — this player opens the device
    const detector = new PitchDetector();
    detector.setDifficulty(this.difficulty);

    const success = await detector.initialize(deviceId, stereoChannel);
    if (success) {
      const stream = detector.getMediaStream();
      if (stream) {
        this.deviceStreamMap.set(key, stream);
        this.deviceStreamRefCount.set(key, 1);
        // Store the AudioContext for future shared-mic players
        const ctx = detector.getAudioContext();
        if (ctx) {
          this.deviceAudioContextMap.set(key, ctx);
          // Create a reusable MediaStreamSource from the same stream.
          // Multiple createMediaStreamSource() calls on the same stream are
          // valid per Web Audio API spec — each returns an independent node.
          const source = ctx.createMediaStreamSource(stream);
          this.deviceSourceMap.set(key, source);
        }
      }

      this.players.set(playerId, {
        id: playerId,
        type: 'local',
        detector,
        stereoChannel,
      });

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

    if (player.type === 'local') {
      // Find which device key this player belongs to
      let deviceKey: string | undefined;
      for (const [key, mappedStream] of this.deviceStreamMap.entries()) {
        const playerStream = player.detector?.getMediaStream();
        if (playerStream === mappedStream || player.sharedAudioContext) {
          deviceKey = key;
          break;
        }
      }

      if (deviceKey) {
        const newCount = (this.deviceStreamRefCount.get(deviceKey) ?? 1) - 1;

        // Disconnect shared analyser if this was a shared-mic player
        if (player.sharedAnalyser) {
          try { player.sharedAnalyser.disconnect(); } catch { /* already disconnected */ }
        }

        if (newCount <= 0) {
          // Last user — stop stream, close shared AudioContext, clean up all maps
          const stream = this.deviceStreamMap.get(deviceKey);
          if (stream) {
            stream.getTracks().forEach(track => track.stop());
          }
          const sharedSource = this.deviceSourceMap.get(deviceKey);
          if (sharedSource) {
            try { sharedSource.disconnect(); } catch { /* already disconnected */ }
          }
          // Only close AudioContext if no player owns it directly
          // (the first player's detector owns it and will close it in destroySync)
          this.deviceStreamMap.delete(deviceKey);
          this.deviceStreamRefCount.delete(deviceKey);
          this.deviceAudioContextMap.delete(deviceKey);
          this.deviceSourceMap.delete(deviceKey);
        } else {
          this.deviceStreamRefCount.set(deviceKey, newCount);
        }
      }

      // Stop and destroy the detector (won't close shared AudioContext
      // because ownsStream is false for shared-mic players, and for the
      // first player the AudioContext is still needed by shared-mic players)
      if (player.detector) {
        player.detector.stop();
        await player.detector.destroy();
      }
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
              rawNote: pitchData.note,
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
    // Clean up any remaining device streams and shared resources
    for (const stream of this.deviceStreamMap.values()) {
      stream.getTracks().forEach(track => track.stop());
    }
    for (const source of this.deviceSourceMap.values()) {
      try { source.disconnect(); } catch { /* already disconnected */ }
    }
    this.deviceStreamMap.clear();
    this.deviceStreamRefCount.clear();
    this.deviceAudioContextMap.clear();
    this.deviceSourceMap.clear();
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
