// R27-b Auslagerung: This file is now a stable re-export facade.
// The implementation lives in ./microphone/:
//   types.ts                  – interfaces + OPTIMAL_EXTENDED_CONFIG + MAX_MICROPHONES
//   microphone-instance.ts    – single-mic Web Audio pipeline (connect/analyse/monitor)
//   mic-config-storage.ts     – localStorage persistence + migrations (MULTI_MIC_CONFIG v2)
//   multi-microphone-manager.ts – assignment/stereo-split/restore manager class
//   singleton.ts              – getMultiMicrophoneManager()
// Public API is byte-compatible with the pre-split module — importers are untouched.

export type { MicrophoneDevice, MicrophoneConfig, ExtendedMicConfig, AssignedMicrophone } from './microphone/types';
export { OPTIMAL_EXTENDED_CONFIG, MAX_MICROPHONES } from './microphone/types';
export { MultiMicrophoneManager } from './microphone/multi-microphone-manager';
export { getMultiMicrophoneManager } from './microphone/singleton';

