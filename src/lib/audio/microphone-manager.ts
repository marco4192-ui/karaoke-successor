// Multi-Microphone Manager - Handles multiple microphone input devices simultaneously
// Supports USB mics, SingStar mics, 3.5mm jack mics, Bluetooth audio

export interface MicrophoneDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput';
  groupId: string;
  isDefault?: boolean;
}

export interface MicrophoneConfig {
  deviceId: string;
  gain: number; // 0.1 to 3.0
  noiseSuppression: boolean;
  echoCancellation: boolean;
  autoGainControl: boolean;
  sampleRate: number;
  latency: 'low' | 'normal' | 'high';
}

export interface MicrophoneStatus {
  isConnected: boolean;
  isMuted: boolean;
  volume: number; // 0-1
  peak: number; // 0-1
  deviceName: string;
}

export interface AssignedMicrophone {
  id: string;
  deviceId: string;
  deviceName: string;
  playerId?: string;
  playerName?: string;
  config: MicrophoneConfig;
  status: MicrophoneStatus;
}

const DEFAULT_CONFIG: MicrophoneConfig = {
  deviceId: 'default',
  gain: 1.0,
  noiseSuppression: true,
  echoCancellation: true,
  autoGainControl: true,
  sampleRate: 44100,
  latency: 'low',
};

// Single microphone instance
class MicrophoneInstance {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private config: MicrophoneConfig;
  private onStatusChange: ((status: MicrophoneStatus) => void) | null = null;
  private animationFrame: number | null = null;
  private isListening = false;
  private deviceName: string = 'Unknown';

  constructor(config: MicrophoneConfig, deviceName: string = 'Unknown') {
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
      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: this.config.deviceId !== 'default' ? { exact: this.config.deviceId } : undefined,
          echoCancellation: this.config.echoCancellation,
          noiseSuppression: this.config.noiseSuppression,
          autoGainControl: this.config.autoGainControl,
          sampleRate: this.config.sampleRate,
          channelCount: 1, // Mono for karaoke
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
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;

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
      await this.audioContext.close();
      this.audioContext = null;
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

  getConfig(): MicrophoneConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<MicrophoneConfig>): void {
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

  destroy(): void {
    this.disconnect();
    this.onStatusChange = null;
  }
}

// Multi-Microphone Manager - manages multiple microphones simultaneously
export class MultiMicrophoneManager {
  private devices: MicrophoneDevice[] = [];
  private assignedMics: Map<string, AssignedMicrophone> = new Map();
  private micInstances: Map<string, MicrophoneInstance> = new Map();
  private onDevicesChange: ((devices: MicrophoneDevice[]) => void) | null = null;
  private onAssignedMicsChange: ((mics: AssignedMicrophone[]) => void) | null = null;
  private multiMicEnabled: boolean = false;

  constructor() {
    this.loadConfig();
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

  // Enable or disable multi-microphone mode
  setMultiMicEnabled(enabled: boolean): void {
    this.multiMicEnabled = enabled;
    this.saveConfig();
    
    if (!enabled) {
      // Disconnect all but the first assigned mic
      const mics = Array.from(this.assignedMics.values());
      if (mics.length > 1) {
        for (let i = 1; i < mics.length; i++) {
          this.unassignMicrophone(mics[i].id);
        }
      }
    }
    
    if (this.onAssignedMicsChange) {
      this.onAssignedMicsChange(Array.from(this.assignedMics.values()));
    }
  }

  isMultiMicEnabled(): boolean {
    return this.multiMicEnabled;
  }

  // Assign a microphone to a player
  async assignMicrophone(deviceId: string, playerId?: string, playerName?: string): Promise<AssignedMicrophone | null> {
    // Check if we can add more mics
    if (!this.multiMicEnabled && this.assignedMics.size >= 1) {
      console.warn('Multi-mic mode is disabled. Enable it first to add more microphones.');
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

    // Create instance
    const id = `mic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const config: MicrophoneConfig = { ...DEFAULT_CONFIG, deviceId };
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
      playerId,
      playerName,
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
      instance.destroy();
      this.micInstances.delete(id);
    }
    this.assignedMics.delete(id);
    this.saveConfig();

    if (this.onAssignedMicsChange) {
      this.onAssignedMicsChange(Array.from(this.assignedMics.values()));
    }
  }

  // Update player assignment
  updatePlayerAssignment(id: string, playerId: string, playerName: string): void {
    const assigned = this.assignedMics.get(id);
    if (assigned) {
      assigned.playerId = playerId;
      assigned.playerName = playerName;
      this.saveConfig();
      
      if (this.onAssignedMicsChange) {
        this.onAssignedMicsChange(Array.from(this.assignedMics.values()));
      }
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

  // Update config for a specific microphone
  async updateConfig(id: string, config: Partial<MicrophoneConfig>): Promise<void> {
    const instance = this.micInstances.get(id);
    const assigned = this.assignedMics.get(id);
    if (instance && assigned) {
      const needsReconnect = 
        config.deviceId !== assigned.config.deviceId ||
        config.sampleRate !== assigned.config.sampleRate ||
        config.echoCancellation !== assigned.config.echoCancellation ||
        config.noiseSuppression !== assigned.config.noiseSuppression ||
        config.autoGainControl !== assigned.config.autoGainControl;

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

  // Get microphone for a specific player
  getMicrophoneForPlayer(playerId: string): AssignedMicrophone | null {
    return Array.from(this.assignedMics.values()).find(m => m.playerId === playerId) || null;
  }

  // Subscribe to device list changes
  onDevices(callback: (devices: MicrophoneDevice[]) => void): void {
    this.onDevicesChange = callback;
  }

  // Subscribe to assigned mics changes
  onAssignedMics(callback: (mics: AssignedMicrophone[]) => void): void {
    this.onAssignedMicsChange = callback;
  }

  // Disconnect all microphones
  async disconnectAll(): Promise<void> {
    for (const instance of this.micInstances.values()) {
      instance.destroy();
    }
    this.micInstances.clear();
    this.assignedMics.clear();
    
    if (this.onAssignedMicsChange) {
      this.onAssignedMicsChange([]);
    }
  }

  // Save config to localStorage
  private saveConfig(): void {
    try {
      const config = {
        multiMicEnabled: this.multiMicEnabled,
        assignedMics: Array.from(this.assignedMics.values()).map(m => ({
          deviceId: m.deviceId,
          deviceName: m.deviceName,
          playerId: m.playerId,
          playerName: m.playerName,
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
    try {
      const saved = localStorage.getItem('karaoke-multi-mic-config');
      if (saved) {
        const config = JSON.parse(saved);
        this.multiMicEnabled = config.multiMicEnabled || false;
        // Note: We don't restore mic instances on load, just the config
        // The UI will need to re-request microphone permissions and reconnect
      }
    } catch (e) {
      console.warn('Failed to load multi-mic config:', e);
    }
  }

  // Cleanup
  destroy(): void {
    this.disconnectAll();
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

  constructor() {
    this.multiMicManager = getMultiMicrophoneManager();
    this.loadConfig();
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
      
      // Forward status updates
      this.multiMicManager.onAssignedMics((mics) => {
        const current = mics.find(m => m.id === this.currentMicId);
        if (current && this.onStatusChange) {
          this.onStatusChange(current.status);
        }
      });
      
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
      await this.multiMicManager.updateConfig(this.currentMicId, config);
    }
    this.saveConfig();
  }

  getConfig(): MicrophoneConfig {
    return { ...this.config };
  }

  getConnectedDevice(): MicrophoneDevice | null {
    if (!this.currentMicId) return null;
    const assigned = this.multiMicManager.getAssignedMicrophones()
      .find(m => m.id === this.currentMicId);
    if (assigned) {
      return {
        deviceId: assigned.deviceId,
        label: assigned.deviceName,
        kind: 'audioinput',
        groupId: '',
      };
    }
    return null;
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
    try {
      localStorage.setItem('karaoke-mic-config', JSON.stringify(this.config));
    } catch (e) {
      console.warn('Failed to save mic config:', e);
    }
  }

  private loadConfig(): void {
    try {
      const saved = localStorage.getItem('karaoke-mic-config');
      if (saved) {
        this.config = { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Failed to load mic config:', e);
    }
  }

  destroy(): void {
    this.disconnect();
    this.onStatusChange = null;
    this.onDevicesChange = null;
  }
}

// Singleton instance for legacy compatibility
let micManagerInstance: MicrophoneManager | null = null;

export function getMicrophoneManager(): MicrophoneManager {
  if (!micManagerInstance) {
    micManagerInstance = new MicrophoneManager();
  }
  return micManagerInstance;
}
