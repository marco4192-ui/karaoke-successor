import { OPTIMAL_EXTENDED_CONFIG, MAX_MICROPHONES } from './types';
import type { AssignedMicrophone, ExtendedMicConfig, MicrophoneDevice } from './types';
import { MicrophoneInstance } from './microphone-instance';
import { saveMicsConfig, loadMicsConfig } from './mic-config-storage';
import type { StoredMicConfig } from './mic-config-storage';

// Multi-Microphone Manager - manages up to 4 microphones simultaneously
export class MultiMicrophoneManager {
  private devices: MicrophoneDevice[] = [];
  private assignedMics: Map<string, AssignedMicrophone> = new Map();
  private micInstances: Map<string, MicrophoneInstance> = new Map();
  private onDevicesChange: ((_devices: MicrophoneDevice[]) => void) | null = null;
  private onAssignedMicsChange: ((_mics: AssignedMicrophone[]) => void) | null = null;
  // Parsed mic configs loaded from localStorage, consumed by restoreMics().
  // DO-NOT-CHANGE: This is intentionally populated in the synchronous loadConfig()
  // so the async restoreMics() can reference it after construction.
  private savedMicConfigs: StoredMicConfig[] = [];

  constructor() {
    this.loadConfig();
  }

  // Get list of all available microphones
  async getMicrophones(): Promise<MicrophoneDevice[]> {
    try {
      // Try enumerateDevices first — no permission prompt needed.
      // If labels are present (permission already granted), we can skip getUserMedia entirely.
      let allDevices = await navigator.mediaDevices.enumerateDevices();
      const hasLabels = allDevices.some(d => d.kind === 'audioinput' && d.label);

      if (!hasLabels) {
        // Labels are empty → permission not yet granted.
        // Request a temporary stream to trigger the permission prompt,
        // then release it immediately.
        const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        tempStream.getTracks().forEach(track => track.stop());
        allDevices = await navigator.mediaDevices.enumerateDevices();
      }
      
      this.devices = allDevices
        .filter(device => device.kind === 'audioinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Microphone (${device.deviceId.slice(0, 8)}...)`,
          kind: 'audioinput' as const,
          groupId: device.groupId,
        }));

      if (this.onDevicesChange) {
        this.onDevicesChange(this.devices);
      }

      return this.devices;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to get microphone list:', error);
      return [];
    }
  }

  // Get number of assigned microphones
  getAssignedCount(): number {
    return this.assignedMics.size;
  }

  // Check if we can add more microphones
  canAddMicrophone(): boolean {
    return this.assignedMics.size < MAX_MICROPHONES;
  }

  // Get next available player index
  getNextPlayerIndex(): number {
    const usedIndices = new Set(Array.from(this.assignedMics.values()).map(m => m.playerIndex));
    for (let i = 0; i < MAX_MICROPHONES; i++) {
      if (!usedIndices.has(i)) return i;
    }
    return -1;
  }

  // Assign a microphone with individual settings
  async assignMicrophone(deviceId: string, customName?: string): Promise<AssignedMicrophone | null> {
    // Check if we can add more mics
    if (!this.canAddMicrophone()) {
      // eslint-disable-next-line no-console
      console.warn(`Maximum of ${MAX_MICROPHONES} microphones already assigned.`);
      return null;
    }

    // Check if this device is already assigned
    const existingAssignment = Array.from(this.assignedMics.values())
      .find(m => m.deviceId === deviceId);
    if (existingAssignment) {
      return existingAssignment;
    }

    // Find device info
    const device = this.devices.find(d => d.deviceId === deviceId);
    const deviceName = device?.label || 'Unknown';
    const playerIndex = this.getNextPlayerIndex();

    // Create instance with optimal extended settings
    const id = `mic-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    const config: ExtendedMicConfig = {
      ...OPTIMAL_EXTENDED_CONFIG,
      deviceId,
      customName: customName || `Mikrofon ${playerIndex + 1}`,
    };
    
    const instance = new MicrophoneInstance(config, deviceName);
    
    // Connect
    const connected = await instance.connect();
    if (!connected) {
      return null;
    }

    // Create assignment
    const assigned: AssignedMicrophone = {
      id,
      deviceId,
      deviceName,
      customName: customName || `Mikrofon ${playerIndex + 1}`,
      playerIndex,
      config,
      status: {
        isConnected: true,
        isMuted: false,
        volume: 0,
        peak: 0,
        deviceName,
      },
    };

    // Set up status monitoring
    instance.onStatus((status) => {
      assigned.status = status;
      if (this.onAssignedMicsChange) {
        this.onAssignedMicsChange(Array.from(this.assignedMics.values()));
      }
    });

    // Store
    this.micInstances.set(id, instance);
    this.assignedMics.set(id, assigned);
    this.saveConfig();

    if (this.onAssignedMicsChange) {
      this.onAssignedMicsChange(Array.from(this.assignedMics.values()));
    }

    return assigned;
  }

  // Unassign a microphone (also removes stereo partner if present)
  async unassignMicrophone(id: string): Promise<void> {
    const assigned = this.assignedMics.get(id);
    if (assigned?.stereoPartnerId) {
      // Break bidirectional link first to prevent infinite recursion
      const partnerId = assigned.stereoPartnerId;
      assigned.stereoPartnerId = undefined;

      const partner = this.assignedMics.get(partnerId);
      if (partner) {
        partner.stereoPartnerId = undefined;
        const partnerInstance = this.micInstances.get(partnerId);
        if (partnerInstance) {
          await partnerInstance.destroy();
          this.micInstances.delete(partnerId);
        }
        this.assignedMics.delete(partnerId);
      }
    }

    const instance = this.micInstances.get(id);
    if (instance) {
      await instance.destroy();
      this.micInstances.delete(id);
    }
    this.assignedMics.delete(id);
    this.saveConfig();

    if (this.onAssignedMicsChange) {
      this.onAssignedMicsChange(Array.from(this.assignedMics.values()));
    }
  }

  // Enable stereo split for a microphone — creates a second entry for the other channel.
  // The original mic becomes "left" channel, a new entry is created for "right".
  async enableStereoSplit(id: string): Promise<AssignedMicrophone | null> {
    const assigned = this.assignedMics.get(id);
    if (!assigned) return null;
    if (assigned.stereoPartnerId) return assigned; // Already in stereo split mode
    if (this.assignedMics.size >= MAX_MICROPHONES) {
      // eslint-disable-next-line no-console
      console.warn(`Cannot enable stereo split: max ${MAX_MICROPHONES} microphones reached.`);
      return null;
    }

    // Update current mic to left channel
    assigned.config.stereoSplitMode = true;
    assigned.config.stereoChannel = 'left';

    // Reconnect with stereo routing
    const instance = this.micInstances.get(id);
    if (instance) {
      await instance.disconnect();
      instance.updateConfig(assigned.config);
      await instance.connect();
    }

    // Store base name (strip existing L/R suffix if present)
    const baseName = assigned.config.customName.replace(/ \([LR]\)$/, '');

    // Create right channel partner
    const partnerId = `mic-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    const partnerConfig: ExtendedMicConfig = {
      ...OPTIMAL_EXTENDED_CONFIG,
      deviceId: assigned.deviceId,
      customName: `${baseName} (R)`,
      stereoSplitMode: true,
      stereoChannel: 'right',
    };

    const partnerIndex = this.getNextPlayerIndex();
    const partnerInstance = new MicrophoneInstance(partnerConfig, assigned.deviceName);
    const connected = await partnerInstance.connect();
    if (!connected) {
      // Roll back — restore mono mode
      assigned.config.stereoSplitMode = false;
      assigned.config.stereoChannel = 'both';
      if (instance) {
        await instance.disconnect();
        instance.updateConfig(assigned.config);
        await instance.connect();
      }
      return null;
    }

    const partner: AssignedMicrophone = {
      id: partnerId,
      deviceId: assigned.deviceId,
      deviceName: assigned.deviceName,
      customName: `${baseName} (R)`,
      playerIndex: partnerIndex,
      config: partnerConfig,
      status: {
        isConnected: true,
        isMuted: false,
        volume: 0,
        peak: 0,
        deviceName: assigned.deviceName,
      },
      stereoPartnerId: id,
    };

    // Update original name to indicate left channel
    assigned.customName = `${baseName} (L)`;
    assigned.config.customName = assigned.customName;

    // Set up partner monitoring
    partnerInstance.onStatus((status) => {
      partner.status = status;
      if (this.onAssignedMicsChange) {
        this.onAssignedMicsChange(Array.from(this.assignedMics.values()));
      }
    });

    // Link them bidirectionally
    assigned.stereoPartnerId = partnerId;
    partner.stereoPartnerId = id;

    this.micInstances.set(partnerId, partnerInstance);
    this.assignedMics.set(partnerId, partner);
    this.saveConfig();

    if (this.onAssignedMicsChange) {
      this.onAssignedMicsChange(Array.from(this.assignedMics.values()));
    }

    return partner;
  }

  // Disable stereo split — removes the partner and restores mono mode
  async disableStereoSplit(id: string): Promise<void> {
    const assigned = this.assignedMics.get(id);
    if (!assigned) return;
    if (!assigned.stereoPartnerId) return; // Not in stereo mode

    // Remove partner
    const partnerId = assigned.stereoPartnerId;
    assigned.stereoPartnerId = undefined;

    const partner = this.assignedMics.get(partnerId);
    if (partner) {
      partner.stereoPartnerId = undefined;
      const partnerInstance = this.micInstances.get(partnerId);
      if (partnerInstance) {
        await partnerInstance.destroy();
        this.micInstances.delete(partnerId);
      }
      this.assignedMics.delete(partnerId);
    }

    // Restore mono mode
    assigned.config.stereoSplitMode = false;
    assigned.config.stereoChannel = 'both';
    assigned.customName = assigned.customName.replace(/ \([LR]\)$/, '');
    assigned.config.customName = assigned.customName;

    // Reconnect without stereo routing
    const instance = this.micInstances.get(id);
    if (instance) {
      await instance.disconnect();
      instance.updateConfig(assigned.config);
      await instance.connect();
    }

    this.saveConfig();

    if (this.onAssignedMicsChange) {
      this.onAssignedMicsChange(Array.from(this.assignedMics.values()));
    }
  }

  // Check if a mic is in stereo split mode
  isStereoSplit(id: string): boolean {
    const assigned = this.assignedMics.get(id);
    return !!assigned?.stereoPartnerId;
  }

  // Update custom name for a microphone
  updateCustomName(id: string, name: string): void {
    const assigned = this.assignedMics.get(id);
    if (assigned) {
      assigned.customName = name;
      assigned.config.customName = name;
      this.saveConfig();
      
      if (this.onAssignedMicsChange) {
        this.onAssignedMicsChange(Array.from(this.assignedMics.values()));
      }
    }
  }

  // Update player index for a microphone
  updatePlayerIndex(id: string, playerIndex: number): void {
    const assigned = this.assignedMics.get(id);
    if (assigned && playerIndex >= 0 && playerIndex < MAX_MICROPHONES) {
      assigned.playerIndex = playerIndex;
      this.saveConfig();
      
      if (this.onAssignedMicsChange) {
        this.onAssignedMicsChange(Array.from(this.assignedMics.values()));
      }
    }
  }

  // Update extended config for a specific microphone
  async updateExtendedConfig(id: string, config: Partial<ExtendedMicConfig>): Promise<void> {
    const instance = this.micInstances.get(id);
    const assigned = this.assignedMics.get(id);
    if (instance && assigned) {
      const needsReconnect = 
        config.deviceId !== assigned.config.deviceId ||
        config.sampleRate !== assigned.config.sampleRate ||
        config.echoCancellation !== assigned.config.echoCancellation ||
        config.noiseSuppression !== assigned.config.noiseSuppression ||
        config.autoGainControl !== assigned.config.autoGainControl ||
        config.fftSize !== assigned.config.fftSize ||
        config.stereoSplitMode !== assigned.config.stereoSplitMode ||
        config.stereoChannel !== assigned.config.stereoChannel;

      assigned.config = { ...assigned.config, ...config };
      
      if (needsReconnect) {
        await instance.disconnect();
        instance.updateConfig(assigned.config);
        await instance.connect();
      } else if (config.gain !== undefined) {
        instance.setGain(config.gain);
      }
      
      this.saveConfig();
    }
  }

  // Get all assigned microphones
  getAssignedMicrophones(): AssignedMicrophone[] {
    return Array.from(this.assignedMics.values());
  }

  // Get audio data from a specific microphone
  getAudioData(id: string): Float32Array | null {
    const instance = this.micInstances.get(id);
    return instance ? instance.getAudioData() : null;
  }

  // Get frequency data from a specific microphone
  getFrequencyData(id: string): Float32Array | null {
    const instance = this.micInstances.get(id);
    return instance ? instance.getFrequencyData() : null;
  }

  // Get volume from a specific microphone
  getVolume(id: string): number {
    const instance = this.micInstances.get(id);
    return instance ? instance.getVolume() : 0;
  }

  // Set gain for a specific microphone
  setGain(id: string, gain: number): void {
    const instance = this.micInstances.get(id);
    const assigned = this.assignedMics.get(id);
    if (instance && assigned) {
      instance.setGain(gain);
      assigned.config.gain = gain;
      this.saveConfig();
    }
  }

  // Subscribe to device list changes
  onDevices(callback: (_devices: MicrophoneDevice[]) => void): void {
    this.onDevicesChange = callback;
  }

  // Unsubscribe from device list changes
  offDevices(): void {
    this.onDevicesChange = null;
  }

  // Subscribe to assigned mics changes
  onAssignedMics(callback: (_mics: AssignedMicrophone[]) => void): void {
    this.onAssignedMicsChange = callback;
  }

  // Unsubscribe from assigned mics changes
  offAssignedMics(): void {
    this.onAssignedMicsChange = null;
  }

  // Disconnect all microphones
  async disconnectAll(): Promise<void> {
    for (const instance of this.micInstances.values()) {
      await instance.destroy();
    }
    this.micInstances.clear();
    this.assignedMics.clear();

    if (this.onAssignedMicsChange) {
      this.onAssignedMicsChange([]);
    }
  }

  // Apply optimal settings to a specific microphone
  async applyOptimalSettings(id: string): Promise<boolean> {
    const assigned = this.assignedMics.get(id);
    if (!assigned) return false;

    const optimalSettings: Partial<ExtendedMicConfig> = {
      ...OPTIMAL_EXTENDED_CONFIG,
      customName: assigned.customName, // Preserve custom name
      deviceId: assigned.config.deviceId, // Preserve device ID
      stereoSplitMode: assigned.config.stereoSplitMode, // Preserve stereo mode
      stereoChannel: assigned.config.stereoChannel,       // Preserve stereo channel
    };

    await this.updateExtendedConfig(id, optimalSettings);
    return true;
  }

  // Apply optimal settings to ALL assigned microphones
  async applyOptimalSettingsToAll(): Promise<void> {
    const ids = Array.from(this.assignedMics.keys());
    if (ids.length === 0) return;

    for (const id of ids) {
      const assigned = this.assignedMics.get(id);
      if (!assigned) continue;

      const optimalSettings: Partial<ExtendedMicConfig> = {
        ...OPTIMAL_EXTENDED_CONFIG,
        customName: assigned.customName,
        deviceId: assigned.config.deviceId,
        stereoSplitMode: assigned.config.stereoSplitMode, // Preserve stereo mode
        stereoChannel: assigned.config.stereoChannel,       // Preserve stereo channel
      };

      // Use updateExtendedConfig which handles reconnection when
      // audio constraints change (echoCancellation, noiseSuppression, etc.)
      await this.updateExtendedConfig(id, optimalSettings);
    }

    // Notify UI that all mics have been updated
    if (this.onAssignedMicsChange) {
      this.onAssignedMicsChange(Array.from(this.assignedMics.values()));
    }
  }

  // Refresh the device list and remove assigned microphones whose device is no longer available
  async removeDisconnectedDevices(): Promise<number> {
    const currentDevices = await this.getMicrophones();
    const connectedDeviceIds = new Set(currentDevices.map(d => d.deviceId));

    const toRemove: string[] = [];
    for (const [id, assigned] of this.assignedMics) {
      if (!connectedDeviceIds.has(assigned.deviceId)) {
        toRemove.push(id);
      }
    }

    for (const id of toRemove) {
      await this.unassignMicrophone(id);
    }

    return toRemove.length;
  }

  // Save config to localStorage
  private saveConfig(): void {
    saveMicsConfig(Array.from(this.assignedMics.values()));
  }

  // Load config from localStorage
  private loadConfig(): void {
    this.savedMicConfigs = loadMicsConfig();
  }

  // Restore microphones from saved config (call after constructor)
  // This must be async because it needs to enumerate devices and connect streams.
  // DO-NOT-CHANGE: The restore flow intentionally skips device enumeration
  // if no saved configs exist, avoiding an unnecessary permission prompt.
  async restoreMics(): Promise<void> {
    if (this.savedMicConfigs.length === 0) return;

    try {
      // Enumerate available devices to check which saved mics still exist
      await this.getMicrophones();

      for (const saved of this.savedMicConfigs) {
        // Skip if already assigned
        if (this.assignedMics.has(saved.id)) continue;

        // Skip if device no longer exists
        const deviceExists = this.devices.some(d => d.deviceId === saved.deviceId);
        if (!deviceExists) continue;

        // Reconnect the microphone
        try {
          const device = this.devices.find(d => d.deviceId === saved.deviceId);
          const deviceName = device?.label || saved.deviceName || 'Unknown';

          const instance = new MicrophoneInstance(saved.config, deviceName);
          const connected = await instance.connect();

          if (connected) {
            const assigned: AssignedMicrophone = {
              id: saved.id,
              deviceId: saved.deviceId,
              deviceName,
              customName: saved.customName || `Mikrofon ${saved.playerIndex + 1}`,
              playerIndex: saved.playerIndex,
              config: saved.config,
              stereoPartnerId: saved.stereoPartnerId,
              status: {
                isConnected: true,
                isMuted: false,
                volume: 0,
                peak: 0,
                deviceName,
              },
            };
            this.assignedMics.set(assigned.id, assigned);
            this.micInstances.set(assigned.id, instance);
          }
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn(`[MicManager] Failed to restore mic ${saved.customName || saved.deviceId}:`, e);
        }
      }

      // Notify listeners
      if (this.onAssignedMicsChange) {
        this.onAssignedMicsChange(Array.from(this.assignedMics.values()));
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[MicManager] Failed to restore microphones:', e);
    }
  }

  // Cleanup
  async destroy(): Promise<void> {
    await this.disconnectAll();
    this.onDevicesChange = null;
    this.onAssignedMicsChange = null;
  }
}
