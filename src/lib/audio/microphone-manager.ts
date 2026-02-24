// Microphone Manager - Handles all microphone input devices
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

const DEFAULT_CONFIG: MicrophoneConfig = {
  deviceId: 'default',
  gain: 1.0,
  noiseSuppression: true,
  echoCancellation: true,
  autoGainControl: true,
  sampleRate: 44100,
  latency: 'low',
};

export class MicrophoneManager {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private devices: MicrophoneDevice[] = [];
  private config: MicrophoneConfig = { ...DEFAULT_CONFIG };
  private onStatusChange: ((status: MicrophoneStatus) => void) | null = null;
  private onDevicesChange: ((devices: MicrophoneDevice[]) => void) | null = null;
  private animationFrame: number | null = null;
  private isListening = false;

  constructor() {
    this.loadConfig();
  }

  // Get list of all available microphones
  async getMicrophones(): Promise<MicrophoneDevice[]> {
    try {
      // Need to request permission first
      const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      tempStream.getTracks().forEach(track => track.stop());

      const devices = await navigator.mediaDevices.enumerateDevices();
      
      this.devices = devices
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

  // Connect to a specific microphone
  async connect(deviceId?: string): Promise<boolean> {
    try {
      // Disconnect existing connection
      await this.disconnect();

      // Get available devices
      await this.getMicrophones();

      // Use specified device or default
      const targetDeviceId = deviceId || this.config.deviceId || 'default';

      // Create audio context with desired settings
      this.audioContext = new AudioContext({
        sampleRate: this.config.sampleRate,
        latencyHint: this.config.latency,
      });

      // Get microphone stream with constraints
      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: targetDeviceId !== 'default' ? { exact: targetDeviceId } : undefined,
          echoCancellation: this.config.echoCancellation,
          noiseSuppression: this.config.noiseSuppression,
          autoGainControl: this.config.autoGainControl,
          sampleRate: this.config.sampleRate,
          channelCount: 1, // Mono for karaoke
        },
      };

      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

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

      // Update config with actual device
      this.config.deviceId = targetDeviceId;
      this.saveConfig();

      // Start monitoring
      this.startMonitoring();

      return true;
    } catch (error) {
      console.error('Failed to connect microphone:', error);
      return false;
    }
  }

  // Disconnect microphone
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

  // Get audio data for analysis
  getAudioData(): Float32Array | null {
    if (!this.analyser) return null;
    
    const data = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(data);
    return data;
  }

  // Get frequency data
  getFrequencyData(): Float32Array | null {
    if (!this.analyser) return null;
    
    const data = new Float32Array(this.analyser.frequencyBinCount);
    this.analyser.getFloatFrequencyData(data);
    return data;
  }

  // Get current volume level (0-1)
  getVolume(): number {
    const data = this.getAudioData();
    if (!data) return 0;

    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
    }
    const rms = Math.sqrt(sum / data.length);
    
    // Normalize to 0-1 range, applying gain
    return Math.min(1, rms * this.config.gain * 5);
  }

  // Get peak level
  getPeak(): number {
    const data = this.getAudioData();
    if (!data) return 0;

    let max = 0;
    for (let i = 0; i < data.length; i++) {
      max = Math.max(max, Math.abs(data[i]));
    }
    
    return Math.min(1, max * this.config.gain);
  }

  // Set gain/volume
  setGain(gain: number): void {
    this.config.gain = Math.max(0.1, Math.min(3.0, gain));
    if (this.gainNode) {
      this.gainNode.gain.value = this.config.gain;
    }
    this.saveConfig();
  }

  // Update configuration
  async updateConfig(config: Partial<MicrophoneConfig>): Promise<void> {
    const needsReconnect = 
      config.deviceId !== this.config.deviceId ||
      config.sampleRate !== this.config.sampleRate ||
      config.echoCancellation !== this.config.echoCancellation ||
      config.noiseSuppression !== this.config.noiseSuppression ||
      config.autoGainControl !== this.config.autoGainControl;

    this.config = { ...this.config, ...config };
    this.saveConfig();

    if (needsReconnect && this.mediaStream) {
      await this.connect(this.config.deviceId);
    } else if (config.gain !== undefined && this.gainNode) {
      this.gainNode.gain.value = config.gain;
    }
  }

  // Get current configuration
  getConfig(): MicrophoneConfig {
    return { ...this.config };
  }

  // Get connected device info
  getConnectedDevice(): MicrophoneDevice | null {
    if (!this.mediaStream) return null;
    
    const track = this.mediaStream.getAudioTracks()[0];
    if (!track) return null;

    const settings = track.getSettings();
    return this.devices.find(d => d.deviceId === settings.deviceId) || null;
  }

  // Subscribe to status updates
  onStatus(callback: (status: MicrophoneStatus) => void): void {
    this.onStatusChange = callback;
  }

  // Subscribe to device list changes
  onDevices(callback: (devices: MicrophoneDevice[]) => void): void {
    this.onDevicesChange = callback;
  }

  // Start volume monitoring
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
        deviceName: this.getConnectedDevice()?.label || 'Unknown',
      };

      if (this.onStatusChange) {
        this.onStatusChange(status);
      }

      this.animationFrame = requestAnimationFrame(monitor);
    };

    monitor();
  }

  // Stop monitoring
  private stopMonitoring(): void {
    this.isListening = false;
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  // Save config to localStorage
  private saveConfig(): void {
    try {
      localStorage.setItem('karaoke-mic-config', JSON.stringify(this.config));
    } catch (e) {
      console.warn('Failed to save mic config:', e);
    }
  }

  // Load config from localStorage
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

  // Test microphone (returns true if audio is detected)
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

  // Cleanup
  destroy(): void {
    this.disconnect();
    this.onStatusChange = null;
    this.onDevicesChange = null;
  }
}

// Singleton instance
let micManagerInstance: MicrophoneManager | null = null;

export function getMicrophoneManager(): MicrophoneManager {
  if (!micManagerInstance) {
    micManagerInstance = new MicrophoneManager();
  }
  return micManagerInstance;
}
