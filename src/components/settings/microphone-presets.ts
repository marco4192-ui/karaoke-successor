import { ExtendedMicConfig, OPTIMAL_EXTENDED_CONFIG } from '@/lib/audio/microphone-manager';

export interface MicPreset {
  name: string;
  description: string;
  nameKey: string;
  descKey: string;
  settings: ExtendedMicConfig;
}

export const MIC_PRESETS: Record<string, MicPreset> = {
  optimal: {
    name: 'Optimal (Recommended)',
    description: 'Best settings for UltraStar/SingStar',
    nameKey: 'settingsMicPresets.optimalName',
    descKey: 'settingsMicPresets.optimalDesc',
    settings: OPTIMAL_EXTENDED_CONFIG,
  },
  lowLatency: {
    name: 'Low Latency',
    description: 'Minimal delay',
    nameKey: 'settingsMicPresets.lowLatencyName',
    descKey: 'settingsMicPresets.lowLatencyDesc',
    settings: {
      ...OPTIMAL_EXTENDED_CONFIG,
      fftSize: 2048,
      latency: 'interactive' as const,
      smoothingFactor: 0.3,
    },
  },
  highAccuracy: {
    name: 'High Accuracy',
    description: 'Precise pitch detection',
    nameKey: 'settingsMicPresets.highAccuracyName',
    descKey: 'settingsMicPresets.highAccuracyDesc',
    settings: {
      ...OPTIMAL_EXTENDED_CONFIG,
      fftSize: 8192,
      smoothingFactor: 0.7,
      yinThreshold: 0.12,
    },
  },
  noisy: {
    name: 'Noisy Environment',
    description: 'More noise suppression',
    nameKey: 'settingsMicPresets.noisyName',
    descKey: 'settingsMicPresets.noisyDesc',
    settings: {
      ...OPTIMAL_EXTENDED_CONFIG,
      noiseSuppression: true,
      yinThreshold: 0.20,
      volumeThreshold: 0.05,
      clarityThreshold: 0.6,
    },
  },
  bass: {
    name: 'Deep Voices (Bass)',
    description: 'Optimized for deep voices',
    nameKey: 'settingsMicPresets.bassName',
    descKey: 'settingsMicPresets.bassDesc',
    settings: {
      ...OPTIMAL_EXTENDED_CONFIG,
      minFrequency: 60,
      maxFrequency: 500,
    },
  },
  soprano: {
    name: 'High Voices (Soprano)',
    description: 'Optimized for high voices',
    nameKey: 'settingsMicPresets.sopranoName',
    descKey: 'settingsMicPresets.sopranoDesc',
    settings: {
      ...OPTIMAL_EXTENDED_CONFIG,
      minFrequency: 150,
      maxFrequency: 1200,
    },
  },
};
