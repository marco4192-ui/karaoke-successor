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
}

export interface MicrophoneStatus {
  isConnected: boolean;
  isMuted: boolean;
  volume: number; // 0-1
  peak: number; // 0-1
  deviceName: string;
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
}

/**
 * OPTIMAL KARAOKE SETTINGS FOR PITCH DETECTION
 * Based on UltraStar/SingStar standards and audio engineering best practices
 */
export const OPTIMAL_KARAOKE_CONFIG: MicrophoneConfig = {
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
};

// Maximum number of microphones supported
export const MAX_MICROPHONES = 4;

// Default config now uses optimal karaoke settings
const DEFAULT_CONFIG: MicrophoneConfig = {
  ...OPTIMAL_KARAOKE_CONFIG,
};

// Single microphone instance
class MicrophoneInstance {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private config: ExtendedMicConfig;
  private onStatusChange: ((status: MicrophoneStatus) => void) | null = null;
  private animationFrame: number | null = null;
  private isListening = false;
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

      // Connect nodes: source -> gain -> analyser
      this.sourceNode.connect(this.gainNode);
      this.gainNode.connect(this.analyser);

      // Start monitoring
      this.startMonitoring();

      return true;
    } catch (error) {
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
    return Math.min(1, rms * this.config.gain * 5);
  }

  getPeak(): number {
    const data = this.getAudioData();
    if (!data) return 0;

    let max = 0;
    for (let i = 0; i < data.length; i++) {
      max = Math.max(max, Math.abs(data[i]));
    }
    return Math.min(1, max * this.config.gain);
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

  getDeviceName(): string {
    return this.deviceName;
  }

  isConnected(): boolean {
    return this.mediaStream !== null;
  }

  onStatus(callback: (status: MicrophoneStatus) => void): void {
    this.onStatusChange = callback;
  }

  private startMonitoring(): void {
    if (this.isListening) return;
    this.isListening = true;

    const monitor = () => {
      if (!this.isListening) return;

      const status: MicrophoneStatus = {
        isConnected: this.mediaStream !== null,
        isMuted: false,
        volume: this.getVolume(),
        peak: this.getPeak(),
        deviceName: this.deviceName,
      };

      if (this.onStatusChange) {
        this.onStatusChange(status);
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
  private onDevicesChange: ((devices: MicrophoneDevice[]) => void) | null = null;
  private onAssignedMicsChange: ((mics: AssignedMicrophone[]) => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadConfig();
    }
  }

  // Get list of all available microphones
  async getMicrophones(): Promise<MicrophoneDevice[]> {
    try {
      // Need to request permission first
      const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      tempStream.getTracks().forEach(track => track.stop());

      const allDevices = await navigator.mediaDevices.enumerateDevices();
      
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

  // Unassign a microphone
  async unassignMicrophone(id: string): Promise<void> {
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
        config.fftSize !== assigned.config.fftSize;

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
  onDevices(callback: (devices: MicrophoneDevice[]) => void): void {
    this.onDevicesChange = callback;
  }

  // Unsubscribe from device list changes
  offDevices(): void {
    this.onDevicesChange = null;
  }

  // Subscribe to assigned mics changes
  onAssignedMics(callback: (mics: AssignedMicrophone[]) => void): void {
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
    };

    await this.updateExtendedConfig(id, optimalSettings);
    return true;
  }

  // Apply optimal settings to ALL assigned microphones
  async applyOptimalSettingsToAll(): Promise<void> {
    const promises = Array.from(this.assignedMics.keys()).map(id => this.applyOptimalSettings(id));
    await Promise.all(promises);
  }

  // Save config to localStorage
  private saveConfig(): void {
    try {
      const config = {
        version: 2, // Version for future migrations
        assignedMics: Array.from(this.assignedMics.values()).map(m => ({
          deviceId: m.deviceId,
          deviceName: m.deviceName,
          customName: m.customName,
          playerIndex: m.playerIndex,
          config: m.config,
        })),
      };
      localStorage.setItem('karaoke-multi-mic-config', JSON.stringify(config));
    } catch (e) {
      console.warn('Failed to save multi-mic config:', e);
    }
  }

  // Load config from localStorage
  private loadConfig(): void {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem('karaoke-multi-mic-config');
      if (saved) {
        const config = JSON.parse(saved);
        
        // Migration from old format
        if (config.assignedMics && Array.isArray(config.assignedMics)) {
          let needsSave = false;
          config.assignedMics.forEach((mic: { config?: { latency?: string; }; playerIndex?: number }) => {
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
          });
          // Persist migration results so they are not re-run every load
          if (needsSave) {
            localStorage.setItem('karaoke-multi-mic-config', JSON.stringify(config));
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load multi-mic config:', e);
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

// Legacy single-microphone manager for backward compatibility
export class MicrophoneManager {
  private multiMicManager: MultiMicrophoneManager;
  private currentMicId: string | null = null;
  private config: MicrophoneConfig = { ...DEFAULT_CONFIG };
  private onStatusChange: ((status: MicrophoneStatus) => void) | null = null;
  private onDevicesChange: ((devices: MicrophoneDevice[]) => void) | null = null;
  private statusCallbackRegistered: boolean = false;

  constructor() {
    this.multiMicManager = getMultiMicrophoneManager();
    if (typeof window !== 'undefined') {
      this.loadConfig();
    }
  }

  async getMicrophones(): Promise<MicrophoneDevice[]> {
    return this.multiMicManager.getMicrophones();
  }

  async connect(deviceId?: string): Promise<boolean> {
    const targetDeviceId = deviceId || this.config.deviceId || 'default';
    
    // Unassign previous mic if exists
    if (this.currentMicId) {
      await this.multiMicManager.unassignMicrophone(this.currentMicId);
    }
    
    // Assign new mic
    const assigned = await this.multiMicManager.assignMicrophone(targetDeviceId);
    if (assigned) {
      this.currentMicId = assigned.id;
      this.config.deviceId = targetDeviceId;
      this.saveConfig();
      
      // Forward status updates - only register callback once
      if (!this.statusCallbackRegistered) {
        this.multiMicManager.onAssignedMics((mics) => {
          const current = mics.find(m => m.id === this.currentMicId);
          if (current && this.onStatusChange) {
            this.onStatusChange(current.status);
          }
        });
        this.statusCallbackRegistered = true;
      }
      
      return true;
    }
    return false;
  }

  async disconnect(): Promise<void> {
    if (this.currentMicId) {
      await this.multiMicManager.unassignMicrophone(this.currentMicId);
      this.currentMicId = null;
    }
  }

  getAudioData(): Float32Array | null {
    if (!this.currentMicId) return null;
    return this.multiMicManager.getAudioData(this.currentMicId);
  }

  getFrequencyData(): Float32Array | null {
    if (!this.currentMicId) return null;
    return this.multiMicManager.getFrequencyData(this.currentMicId);
  }

  getVolume(): number {
    if (!this.currentMicId) return 0;
    return this.multiMicManager.getVolume(this.currentMicId);
  }

  getPeak(): number {
    const data = this.getAudioData();
    if (!data) return 0;

    let max = 0;
    for (let i = 0; i < data.length; i++) {
      max = Math.max(max, Math.abs(data[i]));
    }
    
    return Math.min(1, max * this.config.gain);
  }

  setGain(gain: number): void {
    this.config.gain = Math.max(0.1, Math.min(3.0, gain));
    if (this.currentMicId) {
      this.multiMicManager.setGain(this.currentMicId, this.config.gain);
    }
    this.saveConfig();
  }

  async updateConfig(config: Partial<MicrophoneConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    if (this.currentMicId) {
      await this.multiMicManager.updateExtendedConfig(this.currentMicId, config);
    }
    this.saveConfig();
  }

  getConfig(): MicrophoneConfig {
    return { ...this.config };
  }

  onStatus(callback: (status: MicrophoneStatus) => void): void {
    this.onStatusChange = callback;
  }

  onDevices(callback: (devices: MicrophoneDevice[]) => void): void {
    this.onDevicesChange = callback;
    this.multiMicManager.onDevices(callback);
  }

  async testMicrophone(duration: number = 3000): Promise<{ success: boolean; avgVolume: number; message: string }> {
    const startTime = Date.now();
    const volumes: number[] = [];

    return new Promise((resolve) => {
      const test = () => {
        if (Date.now() - startTime > duration) {
          const avgVolume = volumes.length > 0 
            ? volumes.reduce((a, b) => a + b) / volumes.length 
            : 0;
          
          resolve({
            success: avgVolume > 0.01,
            avgVolume,
            message: avgVolume > 0.01 
              ? `Microphone working! Average volume: ${(avgVolume * 100).toFixed(1)}%`
              : 'No audio detected. Please check your microphone.',
          });
          return;
        }

        volumes.push(this.getVolume());
        requestAnimationFrame(test);
      };

      test();
    });
  }

  private saveConfig(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('karaoke-mic-config', JSON.stringify(this.config));
    } catch (e) {
      console.warn('Failed to save mic config:', e);
    }
  }

  private loadConfig(): void {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem('karaoke-mic-config');
      if (saved) {
        const parsed = JSON.parse(saved);

        // Migration: Convert old latency values to new valid values
        if (parsed.latency === 'low') {
          parsed.latency = 'interactive';
        } else if (parsed.latency === 'normal') {
          parsed.latency = 'balanced';
        } else if (parsed.latency === 'high') {
          parsed.latency = 'playback';
        }

        this.config = { ...DEFAULT_CONFIG, ...parsed };
        this.saveConfig();
      }
    } catch (e) {
      console.warn('Failed to load mic config:', e);
    }
  }

  /**
   * Apply optimal karaoke settings for pitch detection
   */
  async applyOptimalSettings(): Promise<void> {
    await this.updateConfig({
      noiseSuppression: true,
      echoCancellation: true,
      autoGainControl: false,
      sampleRate: 44100,
      latency: 'interactive',
    });
  }

  /**
   * Check if current settings are optimal for pitch detection
   */
  checkSettings(): { isOptimal: boolean; issues: string[] } {
    const issues: string[] = [];

    if (this.config.autoGainControl !== false) {
      issues.push('Auto Gain Control should be OFF for accurate pitch detection');
    }
    if (this.config.noiseSuppression !== true) {
      issues.push('Noise Suppression should be ON');
    }
    if (this.config.echoCancellation !== true) {
      issues.push('Echo Cancellation should be ON');
    }
    if (this.config.latency !== 'interactive') {
      issues.push('Latency should be "interactive" for real-time feedback');
    }

    return {
      isOptimal: issues.length === 0,
      issues
    };
  }

  async destroy(): Promise<void> {
    await this.disconnect();
    this.onStatusChange = null;
    this.onDevicesChange = null;
    this.statusCallbackRegistered = false;
  }
}

// Singleton instance for legacy compatibility
let micManagerInstance: MicrophoneManager | null = null;
let micManagerCleanupRegistered = false;

export function getMicrophoneManager(): MicrophoneManager {
  if (!micManagerInstance) {
    micManagerInstance = new MicrophoneManager();

    // Cleanup on page unload (only register once)
    if (typeof window !== 'undefined' && !micManagerCleanupRegistered) {
      micManagerCleanupRegistered = true;
      window.addEventListener('beforeunload', () => {
        micManagerInstance?.destroy();
        micManagerInstance = null;
      });
    }
  }
  return micManagerInstance;
}
