import { ExtendedMicConfig, OPTIMAL_EXTENDED_CONFIG } from '@/lib/audio/microphone-manager';

export interface MicPreset {
  name: string;
  description: string;
  settings: ExtendedMicConfig;
}

export const MIC_PRESETS: Record<string, MicPreset> = {
  optimal: {
    name: 'Optimal (Empfohlen)',
    description: 'Beste Einstellungen für UltraStar/SingStar',
    settings: OPTIMAL_EXTENDED_CONFIG,
  },
  lowLatency: {
    name: 'Niedrige Latenz',
    description: 'Minimale Verzögerung',
    settings: {
      ...OPTIMAL_EXTENDED_CONFIG,
      fftSize: 2048,
      latency: 'interactive' as const,
      smoothingFactor: 0.3,
    },
  },
  highAccuracy: {
    name: 'Hohe Genauigkeit',
    description: 'Präzise Pitch-Detection',
    settings: {
      ...OPTIMAL_EXTENDED_CONFIG,
      fftSize: 8192,
      smoothingFactor: 0.7,
      yinThreshold: 0.12,
    },
  },
  noisy: {
    name: 'Laute Umgebung',
    description: 'Mehr Noise-Suppression',
    settings: {
      ...OPTIMAL_EXTENDED_CONFIG,
      noiseSuppression: true,
      yinThreshold: 0.20,
      volumeThreshold: 0.05,
      clarityThreshold: 0.6,
    },
  },
  bass: {
    name: 'Tiefe Stimmen (Bass)',
    description: 'Optimiert für tiefe Stimmen',
    settings: {
      ...OPTIMAL_EXTENDED_CONFIG,
      minFrequency: 60,
      maxFrequency: 500,
    },
  },
  soprano: {
    name: 'Hohe Stimmen (Sopran)',
    description: 'Optimiert für hohe Stimmen',
    settings: {
      ...OPTIMAL_EXTENDED_CONFIG,
      minFrequency: 150,
      maxFrequency: 1200,
    },
  },
};
