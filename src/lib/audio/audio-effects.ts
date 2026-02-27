// Audio Effects Engine - Reverb, Echo, and Voice Processing
export class AudioEffectsEngine {
  private audioContext: AudioContext | null = null;
  private inputNode: MediaStreamAudioSourceNode | null = null;
  private outputNode: AudioDestinationNode | null = null;
  
  // Effect nodes
  private reverbNode: ConvolverNode | null = null;
  private delayNode: DelayNode | null = null;
  private gainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  
  // Effect parameters
  private reverbAmount: number = 0.3;
  private delayTime: number = 0.3;
  private delayFeedback: number = 0.4;
  private masterVolume: number = 1.0;
  
  private isInitialized = false;

  async initialize(stream: MediaStream): Promise<AudioContext> {
    this.audioContext = new AudioContext();
    
    // Create input from microphone
    this.inputNode = this.audioContext.createMediaStreamSource(stream);
    
    // Create analyser for visualization
    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = 2048;
    
    // Create gain node for volume control
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = this.masterVolume;
    
    // Create reverb (convolver)
    this.reverbNode = this.audioContext.createConvolver();
    await this.createReverbImpulse();
    
    // Create delay (echo)
    this.delayNode = this.audioContext.createDelay(2.0);
    this.delayNode.delayTime.value = this.delayTime;
    
    // Create feedback for delay
    const feedbackNode = this.audioContext.createGain();
    feedbackNode.gain.value = this.delayFeedback;
    
    // Wet/dry mix for reverb
    const reverbGain = this.audioContext.createGain();
    reverbGain.gain.value = this.reverbAmount;
    const dryGain = this.audioContext.createGain();
    dryGain.gain.value = 1 - this.reverbAmount;
    
    // Connect the effect chain
    // Input -> Analyser (for visualization)
    this.inputNode.connect(this.analyserNode);
    
    // Dry path
    this.inputNode.connect(dryGain);
    dryGain.connect(this.gainNode);
    
    // Reverb path
    this.inputNode.connect(this.reverbNode);
    this.reverbNode.connect(reverbGain);
    reverbGain.connect(this.gainNode);
    
    // Delay/Echo path with feedback
    this.inputNode.connect(this.delayNode);
    this.delayNode.connect(feedbackNode);
    feedbackNode.connect(this.delayNode);
    this.delayNode.connect(this.gainNode);
    
    // Output to speakers
    this.gainNode.connect(this.audioContext.destination);
    
    this.isInitialized = true;
    return this.audioContext;
  }

  private async createReverbImpulse(): Promise<void> {
    if (!this.audioContext || !this.reverbNode) return;
    
    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * 2; // 2 second reverb
    const impulse = this.audioContext.createBuffer(2, length, sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        // Exponential decay
        const decay = Math.exp(-3 * i / length);
        channelData[i] = (Math.random() * 2 - 1) * decay;
      }
    }
    
    this.reverbNode.buffer = impulse;
  }

  setReverb(amount: number): void {
    this.reverbAmount = Math.max(0, Math.min(1, amount));
  }

  setDelay(time: number, feedback: number): void {
    if (this.delayNode) {
      this.delayNode.delayTime.value = Math.max(0, Math.min(2, time));
    }
    this.delayFeedback = Math.max(0, Math.min(0.9, feedback));
  }

  setVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(2, volume));
    if (this.gainNode) {
      this.gainNode.gain.value = this.masterVolume;
    }
  }

  getAnalyser(): AnalyserNode | null {
    return this.analyserNode;
  }

  getFrequencyData(): Uint8Array {
    if (!this.analyserNode) return new Uint8Array(0);
    const data = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(data);
    return data;
  }

  getTimeDomainData(): Float32Array {
    if (!this.analyserNode) return new Float32Array(0);
    const data = new Float32Array(this.analyserNode.fftSize);
    this.analyserNode.getFloatTimeDomainData(data);
    return data;
  }

  // Get spectrogram data for visualization
  getSpectrogramData(): number[] {
    const frequencyData = this.getFrequencyData();
    // Compress to 64 bands for visualization
    const bands: number[] = [];
    const bandSize = Math.floor(frequencyData.length / 64);
    
    for (let i = 0; i < 64; i++) {
      let sum = 0;
      for (let j = 0; j < bandSize; j++) {
        sum += frequencyData[i * bandSize + j];
      }
      bands.push(sum / bandSize / 255);
    }
    
    return bands;
  }

  disconnect(): void {
    if (this.inputNode) {
      this.inputNode.disconnect();
      this.inputNode = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.isInitialized = false;
  }

  isActive(): boolean {
    return this.isInitialized;
  }
}

// Voice recording for share feature
export class VoiceRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private isRecording = false;

  async startRecording(stream: MediaStream): Promise<void> {
    this.chunks = [];
    this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.chunks.push(e.data);
      }
    };
    
    this.mediaRecorder.start();
    this.isRecording = true;
  }

  stopRecording(): Promise<Blob> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        resolve(new Blob());
        return;
      }
      
      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: 'audio/webm' });
        this.isRecording = false;
        resolve(blob);
      };
      
      this.mediaRecorder.stop();
    });
  }

  getIsRecording(): boolean {
    return this.isRecording;
  }
}
