import type { ExtendedMicConfig, MicrophoneStatus } from './types';

// Single microphone instance
export class MicrophoneInstance {
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
