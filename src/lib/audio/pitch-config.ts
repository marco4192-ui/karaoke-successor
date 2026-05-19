import { Difficulty } from '@/types/game';

// Karaoke-optimized pitch detection settings
export interface PitchDetectorConfig {
  volumeThreshold: number;        // Minimum volume to register (0-1)
  pitchStabilityFrames: number;   // Consecutive frames required for stable pitch
  yinThreshold: number;           // YIN algorithm threshold (0.1-0.3, lower = more sensitive)
  noiseGateEnabled: boolean;      // Enable noise gate
  noiseGateThreshold: number;     // Noise gate threshold in dB (-60 to -20)
  minFrequency: number;           // Minimum frequency to detect (Hz)
  maxFrequency: number;           // Maximum frequency to detect (Hz)
}

// Karaoke-optimized defaults - more lenient for casual singing
export const KARAOKE_DEFAULT_CONFIG: PitchDetectorConfig = {
  volumeThreshold: 0.03,          // Sensitive - picks up normal singing
  pitchStabilityFrames: 3,        // Quick response (~50ms at 60fps)
  yinThreshold: 0.12,             // Lenient YIN threshold for better detection
  noiseGateEnabled: true,
  noiseGateThreshold: -45,        // -45dB noise gate
  minFrequency: 65,               // C2
  maxFrequency: 1047,             // C6
};

// Difficulty-based configurations - optimized for karaoke
export const DIFFICULTY_PITCH_CONFIGS: Record<Difficulty, PitchDetectorConfig> = {
  easy: {
    volumeThreshold: 0.02,        // Very sensitive - picks up quiet singing
    pitchStabilityFrames: 2,      // Quick response
    yinThreshold: 0.10,           // Very lenient pitch detection
    noiseGateEnabled: true,
    noiseGateThreshold: -50,      // Lenient noise gate
    minFrequency: 65,
    maxFrequency: 1047,
  },
  medium: {
    volumeThreshold: 0.04,        // Sensitive
    pitchStabilityFrames: 3,      // Quick but stable
    yinThreshold: 0.12,           // Standard detection
    noiseGateEnabled: true,
    noiseGateThreshold: -45,
    minFrequency: 65,
    maxFrequency: 1047,
  },
  hard: {
    volumeThreshold: 0.06,        // Moderate sensitivity
    pitchStabilityFrames: 5,      // More stable pitch required
    yinThreshold: 0.15,           // Stricter detection
    noiseGateEnabled: true,
    noiseGateThreshold: -40,
    minFrequency: 65,
    maxFrequency: 1047,
  },
};
