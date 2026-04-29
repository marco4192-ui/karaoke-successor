// Practice Mode System - Slow down, loop sections, pitch guide
export interface PracticeModeConfig {
  enabled: boolean;
  playbackRate: number; // 0.5 to 1.5
  loopStart: number | null; // ms
  loopEnd: number | null; // ms
  loopEnabled: boolean;
  pitchGuideEnabled: boolean;
  pitchGuideVolume: number; // 0-1
  autoPlayEnabled: boolean; // Auto-play target notes
  visualAidsEnabled: boolean; // Show extended visual hints
}

export const PRACTICE_MODE_DEFAULTS: PracticeModeConfig = {
  enabled: false,
  playbackRate: 1.0,
  loopStart: null,
  loopEnd: null,
  loopEnabled: false,
  pitchGuideEnabled: true,
  pitchGuideVolume: 0.5,
  autoPlayEnabled: false,
  visualAidsEnabled: true,
};

// Playback rate options
export const PLAYBACK_RATES = [
  { value: 0.5, label: '50%', description: 'Very Slow' },
  { value: 0.6, label: '60%', description: 'Slow' },
  { value: 0.75, label: '75%', description: 'Moderately Slow' },
  { value: 0.85, label: '85%', description: 'Slightly Slow' },
  { value: 1.0, label: '100%', description: 'Normal' },
  { value: 1.1, label: '110%', description: 'Slightly Fast' },
  { value: 1.25, label: '125%', description: 'Fast' },
  { value: 1.5, label: '150%', description: 'Very Fast' },
];
