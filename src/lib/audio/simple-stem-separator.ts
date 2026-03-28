// Simple Stem Separator - Fallback using spectral subtraction
// Works without external models, but less accurate than ONNX-based separation

export interface SimpleSeparationResult {
  vocals: AudioBuffer;
  accompaniment: AudioBuffer;
  processingTime: number;
}

export interface SimpleSeparationProgress {
  progress: number;
  message: string;
  currentTime?: number;
  totalTime?: number;
}

/**
 * Simple voice separation using center channel removal and spectral subtraction
 * This is a basic approach that works without AI models
 */
export class SimpleStemSeparator {
  private audioContext: AudioContext | null = null;
  private onProgress?: (progress: SimpleSeparationProgress) => void;

  constructor(progressCallback?: (progress: SimpleSeparationProgress) => void) {
    this.onProgress = progressCallback;
  }

  /**
   * Separate stereo audio into vocals and accompaniment
   * Uses center channel extraction (works well for professionally mixed music)
   */
  async separate(audioBuffer: AudioBuffer): Promise<SimpleSeparationResult> {
    const startTime = performance.now();

    this.audioContext = new AudioContext({ sampleRate: audioBuffer.sampleRate });

    const { sampleRate, length, numberOfChannels } = audioBuffer;

    this.onProgress?.({
      progress: 0,
      message: 'Analyzing audio...',
      totalTime: length / sampleRate,
    });

    // Get stereo channels
    const left = audioBuffer.numberOfChannels > 0 ? audioBuffer.getChannelData(0) : new Float32Array(length);
    const right = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : left;

    // Create output buffers
    const vocalsLeft = new Float32Array(length);
    const vocalsRight = new Float32Array(length);
    const accLeft = new Float32Array(length);
    const accRight = new Float32Array(length);

    // FFT parameters
    const fftSize = 4096;
    const hopSize = 1024;
    const numFrames = Math.floor((length - fftSize) / hopSize) + 1;

    // Process in overlapping frames
    for (let frame = 0; frame < numFrames; frame++) {
      const start = frame * hopSize;
      const frameLength = Math.min(fftSize, length - start);

      // Extract and window frame
      const window = this.createWindow(frameLength);
      const leftFrame = new Float32Array(fftSize);
      const rightFrame = new Float32Array(fftSize);

      for (let i = 0; i < frameLength; i++) {
        leftFrame[i] = left[start + i] * window[i];
        rightFrame[i] = right[start + i] * window[i];
      }

      // Compute FFT for both channels
      const leftSpectrum = this.fft(leftFrame);
      const rightSpectrum = this.fft(rightFrame);

      // Center channel extraction
      // Vocals are typically in the center (similar in both channels)
      // Accompaniment often has stereo spread
      const vocalsSpectrum = this.extractCenter(leftSpectrum, rightSpectrum, 0.7);
      const accLeftSpectrum = this.subtractSpectrum(leftSpectrum, vocalsSpectrum, 0.3);
      const accRightSpectrum = this.subtractSpectrum(rightSpectrum, vocalsSpectrum, 0.3);

      // Add stereo spread to accompaniment
      this.addStereoWidth(accLeftSpectrum, accRightSpectrum, 0.2);

      // Inverse FFT
      const vocalsFrame = this.ifft(vocalsSpectrum);
      const accLeftFrame = this.ifft(accLeftSpectrum);
      const accRightFrame = this.ifft(accRightSpectrum);

      // Overlap-add to output
      for (let i = 0; i < frameLength && start + i < length; i++) {
        vocalsLeft[start + i] += vocalsFrame[i].real * window[i];
        vocalsRight[start + i] += vocalsFrame[i].real * window[i];
        accLeft[start + i] += accLeftFrame[i].real * window[i];
        accRight[start + i] += accRightFrame[i].real * window[i];
      }

      // Progress update
      if (frame % 10 === 0) {
        this.onProgress?.({
          progress: (frame / numFrames) * 80,
          message: `Processing frame ${frame}/${numFrames}`,
          currentTime: start / sampleRate,
          totalTime: length / sampleRate,
        });
      }
    }

    // Normalize
    this.normalize(vocalsLeft);
    this.normalize(vocalsRight);
    this.normalize(accLeft);
    this.normalize(accRight);

    // Create output AudioBuffers
    const vocalsBuffer = this.audioContext.createBuffer(2, length, sampleRate);
    vocalsBuffer.copyToChannel(vocalsLeft, 0);
    vocalsBuffer.copyToChannel(vocalsRight, 1);

    const accBuffer = this.audioContext.createBuffer(2, length, sampleRate);
    accBuffer.copyToChannel(accLeft, 0);
    accBuffer.copyToChannel(accRight, 1);

    const processingTime = performance.now() - startTime;

    this.onProgress?.({
      progress: 100,
      message: 'Separation complete!',
    });

    await this.audioContext.close();

    return {
      vocals: vocalsBuffer,
      accompaniment: accBuffer,
      processingTime,
    };
  }

  /**
   * Extract center channel (vocals)
   */
  private extractCenter(
    left: { real: Float32Array; imag: Float32Array },
    right: { real: Float32Array; imag: Float32Array },
    strength: number
  ): { real: Float32Array; imag: Float32Array } {
    const n = left.real.length;
    const real = new Float32Array(n);
    const imag = new Float32Array(n);

    for (let i = 0; i < n; i++) {
      // Average of left and right (center channel)
      const centerReal = (left.real[i] + right.real[i]) / 2;
      const centerImag = (left.imag[i] + right.imag[i]) / 2;

      // Apply strength
      real[i] = centerReal * strength;
      imag[i] = centerImag * strength;
    }

    return { real, imag };
  }

  /**
   * Subtract spectrum
   */
  private subtractSpectrum(
    original: { real: Float32Array; imag: Float32Array },
    toSubtract: { real: Float32Array; imag: Float32Array },
    mix: number
  ): { real: Float32Array; imag: Float32Array } {
    const n = original.real.length;
    const real = new Float32Array(n);
    const imag = new Float32Array(n);

    for (let i = 0; i < n; i++) {
      real[i] = original.real[i] - toSubtract.real[i] * mix;
      imag[i] = original.imag[i] - toSubtract.imag[i] * mix;
    }

    return { real, imag };
  }

  /**
   * Add stereo width to spectrum
   */
  private addStereoWidth(
    left: { real: Float32Array; imag: Float32Array },
    right: { real: Float32Array; imag: Float32Array },
    amount: number
  ): void {
    const n = left.real.length;
    for (let i = 0; i < n; i++) {
      // Add slight phase difference for width
      const phaseShift = amount * Math.sin((i / n) * Math.PI * 2);
      left.imag[i] += phaseShift * left.real[i];
      right.imag[i] -= phaseShift * right.real[i];
    }
  }

  /**
   * FFT implementation
   */
  private fft(frame: Float32Array): { real: Float32Array; imag: Float32Array } {
    const n = frame.length;
    const real = new Float32Array(n);
    const imag = new Float32Array(n);

    // Simple DFT for small sizes, otherwise use Cooley-Tukey
    if (n <= 64) {
      for (let k = 0; k < n; k++) {
        for (let t = 0; t < n; t++) {
          const angle = (2 * Math.PI * k * t) / n;
          real[k] += frame[t] * Math.cos(angle);
          imag[k] -= frame[t] * Math.sin(angle);
        }
      }
    } else {
      // Cooley-Tukey FFT
      this.cooleyTukeyFFT(frame, real, imag);
    }

    return { real, imag };
  }

  /**
   * Cooley-Tukey FFT algorithm
   */
  private cooleyTukeyFFT(
    input: Float32Array,
    real: Float32Array,
    imag: Float32Array
  ): void {
    const n = input.length;
    const levels = Math.log2(n);

    // Bit-reversal permutation
    for (let i = 0; i < n; i++) {
      real[i] = input[this.bitReverse(i, levels)];
      imag[i] = 0;
    }

    // FFT
    for (let size = 2; size <= n; size *= 2) {
      const halfSize = size / 2;
      const step = Math.PI / halfSize;

      for (let i = 0; i < n; i += size) {
        for (let j = 0; j < halfSize; j++) {
          const angle = -j * step;
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);

          const idx1 = i + j;
          const idx2 = i + j + halfSize;

          const tReal = real[idx2] * cos - imag[idx2] * sin;
          const tImag = real[idx2] * sin + imag[idx2] * cos;

          real[idx2] = real[idx1] - tReal;
          imag[idx2] = imag[idx1] - tImag;
          real[idx1] += tReal;
          imag[idx1] += tImag;
        }
      }
    }
  }

  /**
   * Inverse FFT
   */
  private ifft(spectrum: { real: Float32Array; imag: Float32Array }): { real: Float32Array; imag: Float32Array } {
    const n = spectrum.real.length;
    const real = new Float32Array(n);
    const imag = new Float32Array(n);

    // Copy and conjugate
    for (let i = 0; i < n; i++) {
      real[i] = spectrum.real[i];
      imag[i] = -spectrum.imag[i];
    }

    // Apply FFT
    if (n <= 64) {
      const tempReal = new Float32Array(n);
      const tempImag = new Float32Array(n);
      for (let k = 0; k < n; k++) {
        for (let t = 0; t < n; t++) {
          const angle = (2 * Math.PI * k * t) / n;
          tempReal[k] += real[t] * Math.cos(angle) - imag[t] * Math.sin(angle);
          tempImag[k] += real[t] * Math.sin(angle) + imag[t] * Math.cos(angle);
        }
      }
      for (let i = 0; i < n; i++) {
        real[i] = tempReal[i] / n;
        imag[i] = -tempImag[i] / n;
      }
    } else {
      this.cooleyTukeyIFFT(real, imag);
    }

    return { real, imag };
  }

  /**
   * Cooley-Tukey IFFT
   */
  private cooleyTukeyIFFT(real: Float32Array, imag: Float32Array): void {
    const n = real.length;

    // Apply FFT (with conjugated input)
    for (let size = 2; size <= n; size *= 2) {
      const halfSize = size / 2;
      const step = Math.PI / halfSize;

      for (let i = 0; i < n; i += size) {
        for (let j = 0; j < halfSize; j++) {
          const angle = j * step;
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);

          const idx1 = i + j;
          const idx2 = i + j + halfSize;

          const tReal = real[idx2] * cos - imag[idx2] * sin;
          const tImag = real[idx2] * sin + imag[idx2] * cos;

          real[idx2] = real[idx1] - tReal;
          imag[idx2] = imag[idx1] - tImag;
          real[idx1] += tReal;
          imag[idx1] += tImag;
        }
      }
    }

    // Normalize and conjugate
    for (let i = 0; i < n; i++) {
      real[i] /= n;
      imag[i] = -imag[i] / n;
    }
  }

  /**
   * Bit reversal for FFT
   */
  private bitReverse(x: number, levels: number): number {
    let result = 0;
    for (let i = 0; i < levels; i++) {
      result = (result << 1) | (x & 1);
      x >>= 1;
    }
    return result;
  }

  /**
   * Create Hann window
   */
  private createWindow(size: number): Float32Array {
    const window = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)));
    }
    return window;
  }

  /**
   * Normalize audio buffer
   */
  private normalize(buffer: Float32Array): void {
    let max = 0;
    for (let i = 0; i < buffer.length; i++) {
      max = Math.max(max, Math.abs(buffer[i]));
    }
    if (max > 0) {
      const scale = 0.9 / max;
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] *= scale;
      }
    }
  }
}

/**
 * Quick voice removal using phase cancellation
 * Fast but basic - good for preview
 */
export function quickVoiceRemoval(
  left: Float32Array,
  right: Float32Array
): { vocals: Float32Array; accompaniment: Float32Array } {
  const length = Math.min(left.length, right.length);
  const vocals = new Float32Array(length);
  const accompaniment = new Float32Array(length);

  // Vocals = center (average of L and R)
  // Accompaniment = sides (difference of L and R)
  for (let i = 0; i < length; i++) {
    const center = (left[i] + right[i]) / 2;
    const side = (left[i] - right[i]) / 2;

    vocals[i] = center;
    accompaniment[i] = left[i] - center; // Original left minus center
  }

  return { vocals, accompaniment };
}
