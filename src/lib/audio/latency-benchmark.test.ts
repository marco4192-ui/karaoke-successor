/**
 * Latency Benchmark Tests
 * Measures and validates audio latency for the pitch detector
 */

import { describe, it, expect } from 'vitest';
import {
  yinPitchDetection,
  calculateClarity,
  generateSineWaveBuffer,
  calculateBufferLatency,
  estimateBufferSize,
  calculateRMS,
} from './pitch-detector-utils';

// ==================== LATENCY MEASUREMENTS ====================

describe('Latency Benchmarks', () => {
  const sampleRate = 44100;

  describe('Buffer Latency Calculations', () => {
    it('should calculate correct buffer latency for standard sizes', () => {
      // Common buffer sizes and their expected latencies at 44.1kHz
      const testCases = [
        { bufferSize: 512, expectedMs: 11.6 },
        { bufferSize: 1024, expectedMs: 23.2 },
        { bufferSize: 2048, expectedMs: 46.4 },
        { bufferSize: 4096, expectedMs: 92.9 },
      ];

      testCases.forEach(({ bufferSize, expectedMs }) => {
        const latency = calculateBufferLatency(bufferSize, sampleRate);
        expect(latency).toBeCloseTo(expectedMs, 0);
      });
    });

    it('should estimate optimal buffer size for target latency', () => {
      const targetLatencyMs = 20;
      const bufferSize = estimateBufferSize(sampleRate, targetLatencyMs);

      // Buffer size should be a power of 2
      expect(Math.log2(bufferSize) % 1).toBe(0);

      // Resulting latency should be close to target
      const actualLatency = calculateBufferLatency(bufferSize, sampleRate);
      expect(actualLatency).toBeLessThanOrEqual(targetLatencyMs * 2);
    });

    it('should show reduced latency with smaller buffers', () => {
      const latency512 = calculateBufferLatency(512, sampleRate);
      const latency2048 = calculateBufferLatency(2048, sampleRate);
      const latency4096 = calculateBufferLatency(4096, sampleRate);

      expect(latency512).toBeLessThan(latency2048);
      expect(latency2048).toBeLessThan(latency4096);
    });
  });

  describe('YIN Processing Performance', () => {
    it('should process a buffer in reasonable time', () => {
      const buffer = generateSineWaveBuffer(440, sampleRate, 2048);

      const start = performance.now();
      const frequency = yinPitchDetection(buffer, sampleRate, 0.15);
      const elapsed = performance.now() - start;

      expect(frequency).not.toBeNull();
      expect(elapsed).toBeLessThan(20); // Processing should be < 20ms
    });

    it('should handle multiple consecutive detections', () => {
      const buffer = generateSineWaveBuffer(440, sampleRate, 2048);
      const iterations = 50;

      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        yinPitchDetection(buffer, sampleRate, 0.15);
      }
      const elapsed = performance.now() - start;
      const avgTime = elapsed / iterations;

      expect(avgTime).toBeLessThan(15); // Average < 15ms per detection
    });

    it('should have consistent performance across frequencies', () => {
      const frequencies = [100, 220, 440, 880, 1000];
      const processingTimes: number[] = [];

      frequencies.forEach(freq => {
        const buffer = generateSineWaveBuffer(freq, sampleRate, 2048);

        const start = performance.now();
        yinPitchDetection(buffer, sampleRate, 0.15);
        const elapsed = performance.now() - start;

        processingTimes.push(elapsed);
      });

      // All times should be within a reasonable range
      const maxTime = Math.max(...processingTimes);
      const minTime = Math.min(...processingTimes);
      expect(maxTime - minTime).toBeLessThan(15); // < 15ms variance
    });
  });

  describe('Clarity Calculation Performance', () => {
    it('should calculate clarity efficiently', () => {
      const buffer = generateSineWaveBuffer(440, sampleRate, 2048);

      const start = performance.now();
      const clarity = calculateClarity(buffer, 440, sampleRate);
      const elapsed = performance.now() - start;

      expect(clarity).toBeGreaterThan(0.8);
      expect(elapsed).toBeLessThan(5); // Should be < 5ms
    });
  });

  describe('RMS Calculation Performance', () => {
    it('should calculate RMS efficiently', () => {
      const buffer = generateSineWaveBuffer(440, sampleRate, 2048);

      const start = performance.now();
      const rms = calculateRMS(buffer);
      const elapsed = performance.now() - start;

      expect(rms).toBeGreaterThan(0);
      expect(elapsed).toBeLessThan(2); // Should be < 2ms
    });
  });

  describe('End-to-End Latency Estimation', () => {
    it('should estimate total latency within acceptable range', () => {
      // Components of total latency:
      const bufferLatency = calculateBufferLatency(2048, sampleRate); // ~46ms
      const processingLatency = 10; // Estimated YIN processing
      const audioContextLatency = 5; // Typical system latency

      const totalLatency = bufferLatency + processingLatency + audioContextLatency;

      // With 2048 buffer, total latency is acceptable for karaoke
      expect(totalLatency).toBeLessThan(65);
    });

    it('should meet lower latency target with 1024 buffer size', () => {
      const bufferLatency = calculateBufferLatency(1024, sampleRate);
      const processingLatency = 10;
      const audioContextLatency = 5;

      const totalLatency = bufferLatency + processingLatency + audioContextLatency;

      expect(totalLatency).toBeLessThan(40); // Lower latency target
    });
  });
});

// ==================== ACCURACY TESTS ====================

describe('Detection Accuracy at Low Latency', () => {
  const sampleRate = 44100;

  it('should maintain accuracy with smaller buffer (1024)', () => {
    const buffer = generateSineWaveBuffer(440, sampleRate, 1024);
    const frequency = yinPitchDetection(buffer, sampleRate, 0.15);

    expect(frequency).not.toBeNull();
    expect(Math.abs(frequency! - 440)).toBeLessThan(5);
  });

  it('should detect various notes accurately with 2048 buffer', () => {
    const testNotes = [
      { freq: 261.63, name: 'C4' },
      { freq: 329.63, name: 'E4' },
      { freq: 440.00, name: 'A4' },
      { freq: 523.25, name: 'C5' },
    ];

    testNotes.forEach(({ freq }) => {
      const buffer = generateSineWaveBuffer(freq, sampleRate, 2048);
      const detected = yinPitchDetection(buffer, sampleRate, 0.15);

      expect(detected).not.toBeNull();
      // Allow 1% error at lower latency
      expect(Math.abs(detected! - freq)).toBeLessThan(freq * 0.01);
    });
  });

  it('should have high clarity for clean signals', () => {
    const buffer = generateSineWaveBuffer(440, sampleRate, 2048);
    const clarity = calculateClarity(buffer, 440, sampleRate);

    expect(clarity).toBeGreaterThan(0.9);
  });

  it('should detect low frequencies accurately', () => {
    const lowFreqs = [80, 100, 150];

    lowFreqs.forEach(freq => {
      // Use larger buffer for low frequencies
      const buffer = generateSineWaveBuffer(freq, sampleRate, 4096);
      const detected = yinPitchDetection(buffer, sampleRate, 0.15);

      expect(detected).not.toBeNull();
      expect(Math.abs(detected! - freq)).toBeLessThan(freq * 0.02);
    });
  });

  it('should detect high frequencies accurately', () => {
    const highFreqs = [800, 1000];

    highFreqs.forEach(freq => {
      const buffer = generateSineWaveBuffer(freq, sampleRate, 2048);
      const detected = yinPitchDetection(buffer, sampleRate, 0.15);

      expect(detected).not.toBeNull();
      expect(Math.abs(detected! - freq)).toBeLessThan(freq * 0.01);
    });
  });
});

// ==================== EDGE CASES ====================

describe('Edge Cases', () => {
  const sampleRate = 44100;

  it('should handle silent buffers gracefully', () => {
    const buffer = new Float32Array(2048); // All zeros
    const frequency = yinPitchDetection(buffer, sampleRate, 0.15);

    expect(frequency).toBeNull();
  });

  it('should handle noisy buffers', () => {
    const buffer = new Float32Array(2048);
    for (let i = 0; i < buffer.length; i++) {
      buffer[i] = Math.random() * 0.1 - 0.05; // Low-level noise
    }
    const frequency = yinPitchDetection(buffer, sampleRate, 0.15);

    // Should either return null or a frequency
    expect(frequency === null || typeof frequency === 'number').toBe(true);
  });

  it('should handle clipped signals', () => {
    // Generate a clipped sine wave
    const buffer = generateSineWaveBuffer(440, sampleRate, 2048);
    for (let i = 0; i < buffer.length; i++) {
      buffer[i] = Math.max(-0.5, Math.min(0.5, buffer[i] * 2));
    }
    const frequency = yinPitchDetection(buffer, sampleRate, 0.15);

    expect(frequency).not.toBeNull();
    // Should still detect the fundamental frequency
    expect(Math.abs(frequency! - 440)).toBeLessThan(20);
  });
});
