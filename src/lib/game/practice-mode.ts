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
