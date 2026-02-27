export class AudioManager {
  private audioContext: AudioContext | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private gainNode: GainNode | null = null;
  private isPlaying = false;
  private currentTime = 0;
  private startTime = 0;
  private onTimeUpdate: ((time: number) => void) | null = null;
  private onEnded: (() => void) | null = null;
  private timeUpdateInterval: NodeJS.Timeout | null = null;

  async initialize(): Promise<void> {
    this.audioContext = new AudioContext();
    this.gainNode = this.audioContext.createGain();
    this.gainNode.connect(this.audioContext.destination);
  }

  async loadAudio(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.audioElement = new Audio(url);
      this.audioElement.crossOrigin = 'anonymous';

      this.audioElement.addEventListener('canplaythrough', () => {
        if (this.audioContext && this.gainNode) {
          const source = this.audioContext.createMediaElementSource(this.audioElement!);
          source.connect(this.gainNode);
        }
        resolve();
      }, { once: true });

      this.audioElement.addEventListener('error', (e) => {
        reject(new Error(`Failed to load audio: ${e}`));
      }, { once: true });

      this.audioElement.load();
    });
  }

  play(startTime = 0): void {
    if (!this.audioElement) return;

    this.audioElement.currentTime = startTime / 1000;
    this.audioElement.play();
    this.isPlaying = true;
    this.startTime = Date.now() - startTime;

    this.startTimeUpdate();
  }

  pause(): void {
    if (!this.audioElement) return;

    this.audioElement.pause();
    this.isPlaying = false;
    this.stopTimeUpdate();
  }

  seek(time: number): void {
    if (!this.audioElement) return;

    this.audioElement.currentTime = time / 1000;
    this.currentTime = time;
    this.startTime = Date.now() - time;
  }

  stop(): void {
    this.pause();
    if (this.audioElement) {
      this.audioElement.currentTime = 0;
    }
    this.currentTime = 0;
  }

  setVolume(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  private startTimeUpdate(): void {
    this.stopTimeUpdate();
    this.timeUpdateInterval = setInterval(() => {
      if (this.audioElement && this.isPlaying) {
        this.currentTime = this.audioElement.currentTime * 1000;
        this.onTimeUpdate?.(this.currentTime);

        if (this.audioElement.ended) {
          this.isPlaying = false;
          this.onEnded?.();
        }
      }
    }, 16); // ~60fps
  }

  private stopTimeUpdate(): void {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
      this.timeUpdateInterval = null;
    }
  }

  onTimeUpdateCallback(callback: (time: number) => void): void {
    this.onTimeUpdate = callback;
  }

  onEndedCallback(callback: () => void): void {
    this.onEnded = callback;
  }

  getCurrentTime(): number {
    return this.currentTime;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  destroy(): void {
    this.stop();
    this.stopTimeUpdate();
    if (this.audioElement) {
      this.audioElement = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.gainNode = null;
  }
}

// Generate synthetic audio for demo songs (since we don't have real audio files)
export class SyntheticAudioGenerator {
  private audioContext: AudioContext | null = null;
  private oscillators: OscillatorNode[] = [];
  private gainNode: GainNode | null = null;
  private isPlaying = false;

  async initialize(): Promise<void> {
    this.audioContext = new AudioContext();
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 0.1;
    this.gainNode.connect(this.audioContext.destination);
  }

  playNote(frequency: number, duration: number, startTime: number): void {
    if (!this.audioContext || !this.gainNode) return;

    const oscillator = this.audioContext.createOscillator();
    const noteGain = this.audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;

    noteGain.gain.setValueAtTime(0, startTime);
    noteGain.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
    noteGain.gain.linearRampToValueAtTime(0.1, startTime + duration - 0.05);
    noteGain.gain.linearRampToValueAtTime(0, startTime + duration);

    oscillator.connect(noteGain);
    noteGain.connect(this.gainNode);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  }

  setVolume(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(0.5, volume));
    }
  }

  destroy(): void {
    this.oscillators.forEach(osc => {
      try {
        osc.stop();
      } catch {
        // Ignore
      }
    });
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.gainNode = null;
    this.isPlaying = false;
  }
}

// Singleton instance
let audioManagerInstance: AudioManager | null = null;

export function getAudioManager(): AudioManager {
  if (!audioManagerInstance) {
    audioManagerInstance = new AudioManager();
  }
  return audioManagerInstance;
}
