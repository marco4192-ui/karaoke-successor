// Audio Effects Engine - Professional Voice Processing
// Includes: Reverb, Echo, Pitch Shift, Compressor, EQ, Distortion
// With presets and real-time control

export type AudioEffectPreset = 'pop' | 'rock' | 'concert' | 'studio' | 'vintage' | 'ethereal' | 'power' | 'intimate';

export interface AudioEffectSettings {
  reverb: {
    enabled: boolean;
    amount: number;      // 0-1
    decay: number;       // 0.5-5 seconds
    preDelay: number;    // 0-100ms
  };
  delay: {
    enabled: boolean;
    time: number;        // 0-1 second
    feedback: number;    // 0-0.9
    mix: number;         // 0-1
  };
  pitch: {
    enabled: boolean;
    shift: number;       // -12 to +12 semitones
    formant: number;     // -12 to +12 semitones (formant preservation)
  };
  compressor: {
    enabled: boolean;
    threshold: number;   // -60 to 0 dB
    ratio: number;       // 1-20
    attack: number;      // 0-100ms
    release: number;     // 0-1000ms
  };
  eq: {
    enabled: boolean;
    low: number;         // -12 to +12 dB
    mid: number;         // -12 to +12 dB
    high: number;        // -12 to +12 dB
  };
  distortion: {
    enabled: boolean;
    amount: number;      // 0-1
    tone: number;        // 0-1 (low to high)
  };
  master: {
    volume: number;      // 0-2
    mix: number;         // 0-1 (dry/wet)
  };
}

// Preset configurations
export const AUDIO_PRESETS: Record<AudioEffectPreset, Partial<AudioEffectSettings>> = {
  pop: {
    reverb: { enabled: true, amount: 0.3, decay: 1.5, preDelay: 10 },
    delay: { enabled: true, time: 0.3, feedback: 0.2, mix: 0.15 },
    compressor: { enabled: true, threshold: -24, ratio: 4, attack: 10, release: 100 },
    eq: { enabled: true, low: 2, mid: 1, high: 3 },
    master: { volume: 1, mix: 0.7 },
  },
  rock: {
    reverb: { enabled: true, amount: 0.4, decay: 2.5, preDelay: 20 },
    delay: { enabled: false, time: 0.2, feedback: 0.3, mix: 0.1 },
    distortion: { enabled: true, amount: 0.3, tone: 0.6 },
    compressor: { enabled: true, threshold: -20, ratio: 6, attack: 5, release: 80 },
    eq: { enabled: true, low: 4, mid: 2, high: 2 },
    master: { volume: 1.1, mix: 0.65 },
  },
  concert: {
    reverb: { enabled: true, amount: 0.6, decay: 3.5, preDelay: 30 },
    delay: { enabled: true, time: 0.5, feedback: 0.35, mix: 0.25 },
    compressor: { enabled: true, threshold: -18, ratio: 5, attack: 15, release: 150 },
    eq: { enabled: true, low: 3, mid: 0, high: 4 },
    master: { volume: 1, mix: 0.6 },
  },
  studio: {
    reverb: { enabled: true, amount: 0.15, decay: 1.0, preDelay: 5 },
    delay: { enabled: false, time: 0.1, feedback: 0.1, mix: 0.05 },
    compressor: { enabled: true, threshold: -30, ratio: 3, attack: 20, release: 200 },
    eq: { enabled: true, low: 1, mid: 2, high: 1 },
    master: { volume: 1, mix: 0.8 },
  },
  vintage: {
    reverb: { enabled: true, amount: 0.5, decay: 2.0, preDelay: 15 },
    delay: { enabled: true, time: 0.25, feedback: 0.4, mix: 0.3 },
    eq: { enabled: true, low: 4, mid: -2, high: -4 },
    master: { volume: 0.95, mix: 0.55 },
  },
  ethereal: {
    reverb: { enabled: true, amount: 0.8, decay: 4.5, preDelay: 50 },
    delay: { enabled: true, time: 0.6, feedback: 0.5, mix: 0.4 },
    pitch: { enabled: true, shift: 0, formant: 5 },
    eq: { enabled: true, low: 0, mid: 3, high: 5 },
    master: { volume: 0.9, mix: 0.5 },
  },
  power: {
    reverb: { enabled: true, amount: 0.35, decay: 2.0, preDelay: 10 },
    distortion: { enabled: true, amount: 0.4, tone: 0.7 },
    compressor: { enabled: true, threshold: -15, ratio: 8, attack: 3, release: 50 },
    eq: { enabled: true, low: 5, mid: 3, high: 4 },
    master: { volume: 1.2, mix: 0.6 },
  },
  intimate: {
    reverb: { enabled: true, amount: 0.1, decay: 0.8, preDelay: 0 },
    delay: { enabled: false, time: 0, feedback: 0, mix: 0 },
    compressor: { enabled: true, threshold: -35, ratio: 2, attack: 30, release: 300 },
    eq: { enabled: true, low: 2, mid: 3, high: 0 },
    master: { volume: 0.9, mix: 0.85 },
  },
};

// Default settings
export const DEFAULT_EFFECTS_SETTINGS: AudioEffectSettings = {
  reverb: { enabled: true, amount: 0.3, decay: 1.5, preDelay: 10 },
  delay: { enabled: false, time: 0.3, feedback: 0.3, mix: 0.2 },
  pitch: { enabled: false, shift: 0, formant: 0 },
  compressor: { enabled: false, threshold: -24, ratio: 4, attack: 10, release: 100 },
  eq: { enabled: false, low: 0, mid: 0, high: 0 },
  distortion: { enabled: false, amount: 0, tone: 0.5 },
  master: { volume: 1, mix: 0.7 },
};

export class AudioEffectsEngine {
  private audioContext: AudioContext | null = null;
  private inputNode: MediaStreamAudioSourceNode | null = null;
  
  // Effect nodes
  private reverbNode: ConvolverNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;
  private delayMix: GainNode | null = null;
  private reverbMix: GainNode | null = null;
  private compressorNode: DynamicsCompressorNode | null = null;
  private eqLow: BiquadFilterNode | null = null;
  private eqMid: BiquadFilterNode | null = null;
  private eqHigh: BiquadFilterNode | null = null;
  private distortionNode: WaveShaperNode | null = null;
  
  // Gain nodes for mixing
  private dryGain: GainNode | null = null;
  private wetGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  
  // Current settings
  private settings: AudioEffectSettings = { ...DEFAULT_EFFECTS_SETTINGS };
  private currentPreset: AudioEffectPreset | null = null;
  // Track previous effect enable states to avoid unnecessary chain reconnects
  private prevEnabledState = '';
  
  private ownsAudioContext = false; // true if we created it, false if reused
  private isInitialized = false;

  /**
   * Initialize the audio effects engine.
   * @param stream - MediaStream to process (mic input)
   * @param existingAudioContext - Optional: reuse an existing AudioContext.
   *   On Tauri/WebView, creating a second AudioContext can steal audio focus
   *   from <audio>/<video> elements, stopping media playback. Pass the
   *   PitchDetector's AudioContext to avoid this.
   */
  async initialize(stream: MediaStream, existingAudioContext?: AudioContext | null): Promise<AudioContext> {
    this.audioContext = existingAudioContext ?? new AudioContext();
    
    // Ensure the AudioContext is running (important for Tauri webviews)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    // Create input from microphone
    this.inputNode = this.audioContext.createMediaStreamSource(stream);
    
    // Create analyser for visualization
    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = 2048;
    
    // Create master gain
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = this.settings.master.volume;
    
    // Create dry/wet mix
    this.dryGain = this.audioContext.createGain();
    this.wetGain = this.audioContext.createGain();
    this.dryGain.gain.value = 1 - this.settings.master.mix;
    this.wetGain.gain.value = this.settings.master.mix;
    
    // Create reverb
    this.reverbNode = this.audioContext.createConvolver();
    await this.createReverbImpulse(this.settings.reverb.decay);
    
    // Create delay
    this.delayNode = this.audioContext.createDelay(2.0);
    this.delayNode.delayTime.value = this.settings.delay.time;
    this.delayFeedback = this.audioContext.createGain();
    this.delayFeedback.gain.value = this.settings.delay.feedback;
    this.delayMix = this.audioContext.createGain();
    this.delayMix.gain.value = this.settings.delay.mix;
    
    // Create compressor
    this.compressorNode = this.audioContext.createDynamicsCompressor();
    this.compressorNode.threshold.value = this.settings.compressor.threshold;
    this.compressorNode.ratio.value = this.settings.compressor.ratio;
    this.compressorNode.attack.value = this.settings.compressor.attack / 1000;
    this.compressorNode.release.value = this.settings.compressor.release / 1000;
    
    // Create EQ
    this.eqLow = this.audioContext.createBiquadFilter();
    this.eqLow.type = 'lowshelf';
    this.eqLow.frequency.value = 320;
    this.eqLow.gain.value = this.settings.eq.low;
    
    this.eqMid = this.audioContext.createBiquadFilter();
    this.eqMid.type = 'peaking';
    this.eqMid.frequency.value = 1000;
    this.eqMid.Q.value = 0.5;
    this.eqMid.gain.value = this.settings.eq.mid;
    
    this.eqHigh = this.audioContext.createBiquadFilter();
    this.eqHigh.type = 'highshelf';
    this.eqHigh.frequency.value = 3200;
    this.eqHigh.gain.value = this.settings.eq.high;
    
    // Create distortion
    this.distortionNode = this.audioContext.createWaveShaper();
    this.distortionNode.curve = this.makeDistortionCurve(this.settings.distortion.amount) as Float32Array<ArrayBuffer>;
    this.distortionNode.oversample = '4x';
    
    // Connect the effect chain
    this.connectEffectChain();
    
    this.isInitialized = true;
    this.ownsAudioContext = !existingAudioContext; // only close what we created
    return this.audioContext;
  }

  /** Check if any effect enable/disable toggles changed since last chain connect.
   *  Returns true on first call (no previous state recorded). */
  private effectStateChanged(): boolean {
    const state = `${this.settings.reverb.enabled}|${this.settings.delay.enabled}|${this.settings.compressor.enabled}|${this.settings.eq.enabled}|${this.settings.distortion.enabled}`;
    if (this.prevEnabledState === '') {
      // First call — always reconnect to establish initial chain
      this.prevEnabledState = state;
      return true;
    }
    if (state !== this.prevEnabledState) {
      this.prevEnabledState = state;
      return true;
    }
    return false;
  }

  private connectEffectChain(): void {
    if (!this.audioContext || !this.inputNode) return;
    
    // Disconnect all existing connections
    this.inputNode.disconnect();
    
    // Connect to analyser for visualization
    this.inputNode.connect(this.analyserNode!);
    
    // Dry path (direct to output)
    this.inputNode.connect(this.dryGain!);
    this.dryGain!.connect(this.masterGain!);
    
    // Wet path through effects
    let wetChain: AudioNode = this.inputNode;
    
    // EQ
    if (this.settings.eq.enabled && this.eqLow && this.eqMid && this.eqHigh) {
      wetChain.connect(this.eqLow);
      this.eqLow.connect(this.eqMid);
      this.eqMid.connect(this.eqHigh);
      wetChain = this.eqHigh;
    }
    
    // Compressor
    if (this.settings.compressor.enabled && this.compressorNode) {
      const nextChain = wetChain;
      nextChain.connect(this.compressorNode);
      wetChain = this.compressorNode;
    }
    
    // Distortion
    if (this.settings.distortion.enabled && this.distortionNode) {
      wetChain.connect(this.distortionNode);
      wetChain = this.distortionNode;
    }
    
    // Reverb
    if (this.settings.reverb.enabled && this.reverbNode) {
      if (!this.reverbMix) {
        this.reverbMix = this.audioContext.createGain();
      }
      this.reverbMix.gain.value = this.settings.reverb.amount;
      wetChain.connect(this.reverbNode);
      this.reverbNode.connect(this.reverbMix);
      this.reverbMix.connect(this.wetGain!);
    }
    
    // Delay
    if (this.settings.delay.enabled && this.delayNode && this.delayFeedback && this.delayMix) {
      wetChain.connect(this.delayNode);
      this.delayNode.connect(this.delayFeedback);
      this.delayFeedback.connect(this.delayNode);
      this.delayNode.connect(this.delayMix);
      this.delayMix.connect(this.wetGain!);
    }
    
    // Connect wet to master
    // Only connect wetChain directly if no parallel sends (reverb/delay) are active.
    // When reverb or delay are enabled, they handle their own connection to wetGain
    // via parallel sends. Connecting wetChain directly would double the signal.
    const hasEffectSends =
      (this.settings.reverb.enabled && this.reverbNode) ||
      (this.settings.delay.enabled && this.delayNode);
    if (!hasEffectSends) {
      wetChain.connect(this.wetGain!);
    }
    this.wetGain!.connect(this.masterGain!);
    
    // Output to speakers
    this.masterGain!.connect(this.audioContext.destination);
  }

  private async createReverbImpulse(decay: number): Promise<void> {
    if (!this.audioContext || !this.reverbNode) return;
    
    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * decay;
    const impulse = this.audioContext.createBuffer(2, length, sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const decayFactor = Math.exp(-3 * i / length);
        channelData[i] = (Math.random() * 2 - 1) * decayFactor;
      }
    }
    
    this.reverbNode.buffer = impulse;
  }

  private makeDistortionCurve(amount: number): Float32Array<ArrayBufferLike> {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const deg = Math.PI / 180;
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((3 + amount * 100) * x * 20 * deg) / (Math.PI + amount * 100 * Math.abs(x));
    }
    
    return curve;
  }

  // Apply preset
  async applyPreset(preset: AudioEffectPreset): Promise<void> {
    this.currentPreset = preset;
    const presetSettings = AUDIO_PRESETS[preset];
    
    // Merge preset with defaults
    this.settings = {
      reverb: { ...DEFAULT_EFFECTS_SETTINGS.reverb, ...presetSettings.reverb },
      delay: { ...DEFAULT_EFFECTS_SETTINGS.delay, ...presetSettings.delay },
      pitch: { ...DEFAULT_EFFECTS_SETTINGS.pitch, ...presetSettings.pitch },
      compressor: { ...DEFAULT_EFFECTS_SETTINGS.compressor, ...presetSettings.compressor },
      eq: { ...DEFAULT_EFFECTS_SETTINGS.eq, ...presetSettings.eq },
      distortion: { ...DEFAULT_EFFECTS_SETTINGS.distortion, ...presetSettings.distortion },
      master: { ...DEFAULT_EFFECTS_SETTINGS.master, ...presetSettings.master },
    };
    
    // Apply all settings — must await so reverb impulse buffer is ready before chain connects
    await this.applyAllSettings();
  }

  private async applyAllSettings(): Promise<void> {
    if (!this.isInitialized) return;
    
    // Master
    if (this.masterGain) {
      this.masterGain.gain.value = this.settings.master.volume;
    }
    if (this.dryGain) {
      this.dryGain.gain.value = 1 - this.settings.master.mix;
    }
    if (this.wetGain) {
      this.wetGain.gain.value = this.settings.master.mix;
    }
    
    // Reverb — await impulse generation so buffer is ready before chain connects
    if (this.settings.reverb.enabled && this.reverbNode) {
      await this.createReverbImpulse(this.settings.reverb.decay);
    }
    
    // Delay
    if (this.delayNode) {
      this.delayNode.delayTime.value = this.settings.delay.time;
    }
    if (this.delayFeedback) {
      this.delayFeedback.gain.value = this.settings.delay.feedback;
    }
    if (this.delayMix) {
      this.delayMix.gain.value = this.settings.delay.mix;
    }
    
    // Compressor
    if (this.compressorNode) {
      this.compressorNode.threshold.value = this.settings.compressor.threshold;
      this.compressorNode.ratio.value = this.settings.compressor.ratio;
      this.compressorNode.attack.value = this.settings.compressor.attack / 1000;
      this.compressorNode.release.value = this.settings.compressor.release / 1000;
    }
    
    // EQ
    if (this.eqLow) {
      this.eqLow.gain.value = this.settings.eq.low;
    }
    if (this.eqMid) {
      this.eqMid.gain.value = this.settings.eq.mid;
    }
    if (this.eqHigh) {
      this.eqHigh.gain.value = this.settings.eq.high;
    }
    
    // Distortion
    if (this.distortionNode) {
      this.distortionNode.curve = this.makeDistortionCurve(this.settings.distortion.amount) as Float32Array<ArrayBuffer>;
    }
    
    // Only reconnect chain if effect enable/disable state changed —
    // parameter-only changes (volume, decay, EQ gain etc.) don't need reconnect.
    // Reconnecting the entire graph causes a brief audio interruption.
    if (this.effectStateChanged()) {
      this.connectEffectChain();
    }
  }

  // Individual effect controls
  async setReverb(amount: number, decay?: number): Promise<void> {
    this.settings.reverb.amount = Math.max(0, Math.min(1, amount));
    if (decay !== undefined) {
      this.settings.reverb.decay = Math.max(0.5, Math.min(5, decay));
      if (this.reverbNode) {
        await this.createReverbImpulse(this.settings.reverb.decay);
      }
    }
    // Update reverb mix gain without reconnecting entire chain
    if (this.reverbMix && this.isInitialized) {
      this.reverbMix.gain.value = this.settings.reverb.amount;
    }
  }

  setDelay(time: number, feedback: number, mix?: number): void {
    if (this.delayNode) {
      this.delayNode.delayTime.value = Math.max(0, Math.min(1, time));
    }
    if (this.delayFeedback) {
      this.delayFeedback.gain.value = Math.max(0, Math.min(0.9, feedback));
    }
    if (mix !== undefined && this.delayMix) {
      this.delayMix.gain.value = Math.max(0, Math.min(1, mix));
    }
  }

  disconnect(): void {
    if (this.inputNode) {
      this.inputNode.disconnect();
      this.inputNode = null;
    }
    // Only close the AudioContext if we created it ourselves.
    // If it was reused from PitchDetector, it must stay alive.
    if (this.audioContext && this.ownsAudioContext) {
      try { this.audioContext.close(); } catch { /* already closed */ }
    }
    this.audioContext = null;
    this.isInitialized = false;
  }

}
