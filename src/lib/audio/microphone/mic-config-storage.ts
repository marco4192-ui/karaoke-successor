import { StorageKeys, getItem, setJson } from '@/lib/storage';
import type { AssignedMicrophone, ExtendedMicConfig } from './types';

// Shape of one persisted microphone entry (localStorage key MULTI_MIC_CONFIG, format version 2)
export interface StoredMicConfig {
  id: string;
  deviceId: string;
  deviceName: string;
  customName: string;
  playerIndex: number;
  config: ExtendedMicConfig;
  stereoPartnerId?: string;
}

// Save config to localStorage
export function saveMicsConfig(mics: AssignedMicrophone[]): void {
  try {
    const config = {
      version: 2, // Version for future migrations
      assignedMics: mics.map(m => ({
        id: m.id,
        deviceId: m.deviceId,
        deviceName: m.deviceName,
        customName: m.customName,
        playerIndex: m.playerIndex,
        config: m.config,
        stereoPartnerId: m.stereoPartnerId,
      })),
    };
    setJson(StorageKeys.MULTI_MIC_CONFIG, config);
  } catch {
    // Non-critical: config will reset to defaults
  }
}

// Load config from localStorage
export function loadMicsConfig(): StoredMicConfig[] {
  try {
    const saved = getItem(StorageKeys.MULTI_MIC_CONFIG);
    if (saved) {
      const config = JSON.parse(saved);
      
      // Migration from old format
      if (config.assignedMics && Array.isArray(config.assignedMics)) {
        let needsSave = false;
        config.assignedMics.forEach((mic: { id?: string; deviceId?: string; config?: { latency?: string; stereoSplitMode?: boolean; stereoChannel?: string; }; playerIndex?: number }) => {
          // Migrate missing id (was not saved before version bump)
          if (!mic.id && mic.deviceId) {
            mic.id = `mic-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
            needsSave = true;
          }
          // Migrate latency values
          if (mic.config?.latency) {
            if (mic.config.latency === 'low') {
              mic.config.latency = 'interactive';
              needsSave = true;
            } else if (mic.config.latency === 'normal') {
              mic.config.latency = 'balanced';
              needsSave = true;
            } else if (mic.config.latency === 'high') {
              mic.config.latency = 'playback';
              needsSave = true;
            }
          }
          // Ensure playerIndex
          if (mic.playerIndex === undefined) {
            mic.playerIndex = 0;
            needsSave = true;
          }
          // Migrate stereo split fields (added after v2)
          if (mic.config) {
            if (mic.config.stereoSplitMode === undefined) {
              mic.config.stereoSplitMode = false;
              needsSave = true;
            }
            if (!mic.config.stereoChannel) {
              mic.config.stereoChannel = 'both';
              needsSave = true;
            }
          }
        });
        // Persist migration results so they are not re-run every load
        if (needsSave) {
          setJson(StorageKeys.MULTI_MIC_CONFIG, config);
        }
      }

      // Store parsed configs for later restoration by restoreMics()
      if (config?.assignedMics && Array.isArray(config.assignedMics)) {
        return config.assignedMics;
      }
    }
  } catch {
    // Non-critical: config will reset to defaults
  }
  return [];
}
