import { StorageKeys, getItem, setJson } from '@/lib/storage';

// Multi-Microphone Manager - Handles multiple microphone input devices simultaneously
// Supports USB mics, SingStar mics, 3.5mm jack mics, Bluetooth audio
// Each microphone has its own individual extended settings

export interface MicrophoneDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput';
  groupId: string;
  isDefault?: boolean;
}

// Basic microphone configuration (Web Audio API constraints)
export interface MicrophoneConfig {
  deviceId: string;
  gain: number; // 0.1 to 3.0
  noiseSuppression: boolean;
  echoCancellation: boolean;
  autoGainControl: boolean;
  sampleRate: number;
  latency: 'interactive' | 'balanced' | 'playback';
}

// Extended microphone configuration with pitch detection settings
// Each microphone gets its own instance of these settings
export interface ExtendedMicConfig extends MicrophoneConfig {
  // Custom name for this microphone
  customName: string;
  
  // Pitch Detection Settings
  yinThreshold: number;         // 0.05 - 0.30 (lower = more sensitive)
  minFrequency: number;         // 60 - 200 Hz (bass range start)
  maxFrequency: number;         // 500 - 1500 Hz (soprano range end)
  volumeThreshold: number;      // 0.01 - 0.20 (silence detection)
  fftSize: number;              // 1024, 2048, 4096, 8192 (larger = more accurate but slower)
  smoothingFactor: number;      // 0.0 - 0.95 (pitch stability)
  
  // Latency & Sync
  manualLatencyOffset: number;  // -200 to +200 ms
  
  // Advanced
  clarityThreshold: number;     // 0.3 - 0.9 (pitch quality threshold)

  // Stereo Split (for dual-mic adapters like SingStar USB)
  stereoSplitMode: boolean;     // Enable stereo channel splitting
  stereoChannel: 'left' | 'right' | 'both';  // Which channel to use
}

interface MicrophoneStatus {
  isConnected: boolean;
  isMuted: boolean;
  volume: number; // 0-1
  peak: number; // 0-1
  deviceName: string;
  channelCount?: number;  // Detected audio channel count (1=mono, 2=stereo)
}

// Assigned microphone with all individual settings
export interface AssignedMicrophone {
  id: string;
  deviceId: string;
  deviceName: string;
  customName: string;           // User-defined name
  playerIndex: number;          // 0-3 for up to 4 players
  config: ExtendedMicConfig;    // Full extended config per mic
  status: MicrophoneStatus;
  stereoPartnerId?: string;     // ID of paired stereo mic (set when stereo split is active)
}

/**
 * OPTIMAL KARAOKE SETTINGS FOR PITCH DETECTION
 * Based on UltraStar/SingStar standards and audio engineering best practices
 */
const OPTIMAL_KARAOKE_CONFIG: MicrophoneConfig = {
  deviceId: 'default',
  gain: 1.0,
  noiseSuppression: true,   // ON - removes background noise
  echoCancellation: true,   // ON - prevents room reflections
  autoGainControl: false,   // OFF - critical for accurate pitch detection!
  sampleRate: 44100,        // CD quality, optimal for voice pitch range
  latency: 'interactive',   // Lowest latency for real-time feedback
};

/**
 * OPTIMAL EXTENDED SETTINGS FOR ULTRASTAR/SINGSTAR
 * These are applied by default to every new microphone
 */
export const OPTIMAL_EXTENDED_CONFIG: ExtendedMicConfig = {
  ...OPTIMAL_KARAOKE_CONFIG,
  customName: 'Mikrofon 1',
  
  // Pitch Detection - Optimized for karaoke
  yinThreshold: 0.15,           // Good balance for voice
  minFrequency: 80,             // Low bass (approximately C2)
  maxFrequency: 1000,           // High soprano (approximately C6)
  volumeThreshold: 0.02,        // Ignore very quiet sounds
  fftSize: 4096,                // Good accuracy for pitch detection
  smoothingFactor: 0.5,         // Balance between responsiveness and stability
  
  // Latency
  manualLatencyOffset: 0,       // No offset by default
  
  // Quality
  clarityThreshold: 0.5,        // Minimum clarity for valid pitch

  // Stereo Split (default: off, mono mode)
  stereoSplitMode: false,
  stereoChannel: 'both',
};

// Maximum number of microphones supported
export const MAX_MICROPHONES = 4;

// Single microphone instance
class MicrophoneInstance {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private config: ExtendedMicConfig;
  private onStatusChange: ((_status: MicrophoneStatus) => void) | null = null;
  private animationFrame: number | null = null;
  private isListening = false;
  private channelSplitter: ChannelSplitterNode | null = null;
  private detectedChannelCount: number = 1;
  private deviceName: string = 'Unknown';

  constructor(config: ExtendedMicConfig, deviceName: string = 'Unknown') {
    this.config = { ...config };
    this.deviceName = deviceName;
  }

  async connect(): Promise<boolean> {
    try {
      // Disconnect existing connection
      await this.disconnect();

      // Create audio context with desired settings
      this.audioContext = new AudioContext({
        sampleRate: this.config.sampleRate,
        latencyHint: this.config.latency,
      });

      // Get microphone stream with constraints
      // NOTE: sampleRate and channelCount are not reliably supported as
      // required constraints in Tauri's WebView (WebView2/WebKitGTK).
      // The AudioContext sampleRate handles rate conversion, and mono
      // downmixing is done by the audio pipeline. Removing these avoids
      // getUserMedia failures on certain Tauri platforms.
      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: this.config.deviceId !== 'default' ? { exact: this.config.deviceId } : undefined,
          echoCancellation: this.config.echoCancellation,
          noiseSuppression: this.config.noiseSuppression,
          autoGainControl: this.config.autoGainControl,
        },
      };

      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

      // Get the actual device name
      const track = this.mediaStream.getAudioTracks()[0];
      if (track) {
        const settings = track.getSettings();
        this.detectedChannelCount = settings.channelCount || 1;
        const devices = await navigator.mediaDevices.enumerateDevices();
        const device = devices.find(d => d.deviceId === settings.deviceId);
        if (device) {
          this.deviceName = device.label || 'Unknown';
        }
      }

      // Create audio nodes
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = this.config.gain;
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.config.fftSize;
      this.analyser.smoothingTimeConstant = this.config.smoothingFactor;

      // Connect nodes: source -> gain -> [splitter?] -> analyser
      this.sourceNode.connect(this.gainNode);

      if (this.config.stereoSplitMode && this.config.stereoChannel !== 'both') {
        // Stereo split mode — extract a single channel via ChannelSplitterNode.
        // Even if channelCount is not reliably requestable as a constraint,
        // the browser preserves the device's native channel layout in the
        // MediaStream, so a stereo device will produce 2 channels here.
        this.channelSplitter = this.audioContext.createChannelSplitter(2);
        this.gainNode.connect(this.channelSplitter);
        const channelIndex = this.config.stereoChannel === 'left' ? 0 : 1;
        this.channelSplitter.connect(this.analyser, channelIndex);
      } else {
        // Mono / default mode
        this.channelSplitter = null;
        this.gainNode.connect(this.analyser);
      }

      // Start monitoring
      this.startMonitoring();

      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to connect microphone:', error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.stopMonitoring();

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      const ctx = this.audioContext;
      this.audioContext = null;
      try { await ctx.close(); } catch { /* already closed */ }
    }

    this.sourceNode = null;
    this.gainNode = null;
    this.analyser = null;
    this.channelSplitter = null;
  }

  getAudioData(): Float32Array | null {
    if (!this.analyser) return null;
    const data = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(data);
    return data;
  }

  getFrequencyData(): Float32Array | null {
    if (!this.analyser) return null;
    const data = new Float32Array(this.analyser.frequencyBinCount);
    this.analyser.getFloatFrequencyData(data);
    return data;
  }

  getVolume(): number {
    const data = this.getAudioData();
    if (!data) return 0;

    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
    }
    const rms = Math.sqrt(sum / data.length);
    return Math.min(1, rms * 5);
  }

  getPeak(): number {
    const data = this.getAudioData();
    if (!data) return 0;

    let max = 0;
    for (let i = 0; i < data.length; i++) {
      max = Math.max(max, Math.abs(data[i]));
    }
    return Math.min(1, max);
  }

  setGain(gain: number): void {
    this.config.gain = Math.max(0.1, Math.min(3.0, gain));
    if (this.gainNode) {
      this.gainNode.gain.value = this.config.gain;
    }
  }

  getConfig(): ExtendedMicConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<ExtendedMicConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getDetectedChannelCount(): number {
    return this.detectedChannelCount;
  }

  getDeviceName(): string {
    return this.deviceName;
  }

  isConnected(): boolean {
    return this.mediaStream !== null;
  }

  onStatus(callback: (_status: MicrophoneStatus) => void): void {
    this.onStatusChange = callback;
  }

  private startMonitoring(): void {
    if (this.isListening) return;
    this.isListening = true;

    const monitor = () => {
      if (!this.isListening) return;

      const _status: MicrophoneStatus = {
        isConnected: this.mediaStream !== null,
        isMuted: false,
        volume: this.getVolume(),
        peak: this.getPeak(),
        deviceName: this.deviceName,
        channelCount: this.detectedChannelCount,
      };

      if (this.onStatusChange) {
        this.onStatusChange(_status);
      }

      this.animationFrame = requestAnimationFrame(monitor);
    };

    monitor();
  }

  private stopMonitoring(): void {
    this.isListening = false;
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  async destroy(): Promise<void> {
    await this.disconnect();
    this.onStatusChange = null;
  }
}

// Multi-Microphone Manager - manages up to 4 microphones simultaneously
export class MultiMicrophoneManager {
  private devices: MicrophoneDevice[] = [];
  private assignedMics: Map<string, AssignedMicrophone> = new Map();
  private micInstances: Map<string, MicrophoneInstance> = new Map();
  private onDevicesChange: ((_devices: MicrophoneDevice[]) => void) | null = null;
  private onAssignedMicsChange: ((_mics: AssignedMicrophone[]) => void) | null = null;

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
    try {
      const config = {
        version: 2, // Version for future migrations
        assignedMics: Array.from(this.assignedMics.values()).map(m => ({
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
  private loadConfig(): void {
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
      }
    } catch {
      // Non-critical: config will reset to defaults
    }
  }

  // Cleanup
  async destroy(): Promise<void> {
    await this.disconnectAll();
    this.onDevicesChange = null;
    this.onAssignedMicsChange = null;
  }
}

// Singleton instance
let multiMicManagerInstance: MultiMicrophoneManager | null = null;

export function getMultiMicrophoneManager(): MultiMicrophoneManager {
  if (!multiMicManagerInstance) {
    multiMicManagerInstance = new MultiMicrophoneManager();
  }
  return multiMicManagerInstance;
}

