// Multi-Microphone Manager - Handles multiple microphone input devices simultaneously
// Supports USB mics, SingStar mics, 3.5mm jack mics, Bluetooth audio
// Each microphone has its own individual extended settings

export interface MicrophoneDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput';
  groupId: string;
  isDefault?: boolean;
}

// Basic microphone configuration (Web Audio API constraints)
export interface MicrophoneConfig {
  deviceId: string;
  gain: number; // 0.1 to 3.0
  noiseSuppression: boolean;
  echoCancellation: boolean;
  autoGainControl: boolean;
  sampleRate: number;
  latency: 'interactive' | 'balanced' | 'playback';
}

// Extended microphone configuration with pitch detection settings
// Each microphone gets its own instance of these settings
export interface ExtendedMicConfig extends MicrophoneConfig {
  // Custom name for this microphone
  customName: string;
  
  // Pitch Detection Settings
  yinThreshold: number;         // 0.05 - 0.30 (lower = more sensitive)
  minFrequency: number;         // 60 - 200 Hz (bass range start)
  maxFrequency: number;         // 500 - 1500 Hz (soprano range end)
  volumeThreshold: number;      // 0.01 - 0.20 (silence detection)
  fftSize: number;              // 1024, 2048, 4096, 8192 (larger = more accurate but slower)
  smoothingFactor: number;      // 0.0 - 0.95 (pitch stability)
  
  // Latency & Sync
  manualLatencyOffset: number;  // -200 to +200 ms
  
  // Advanced
  clarityThreshold: number;     // 0.3 - 0.9 (pitch quality threshold)

  // Stereo Split (for dual-mic adapters like SingStar USB)
  stereoSplitMode: boolean;     // Enable stereo channel splitting
  stereoChannel: 'left' | 'right' | 'both';  // Which channel to use
}

export interface MicrophoneStatus {
  isConnected: boolean;
  isMuted: boolean;
  volume: number; // 0-1
  peak: number; // 0-1
  deviceName: string;
  channelCount?: number;  // Detected audio channel count (1=mono, 2=stereo)
}

// Assigned microphone with all individual settings
export interface AssignedMicrophone {
  id: string;
  deviceId: string;
  deviceName: string;
  customName: string;           // User-defined name
  playerIndex: number;          // 0-3 for up to 4 players
  config: ExtendedMicConfig;    // Full extended config per mic
  status: MicrophoneStatus;
  stereoPartnerId?: string;     // ID of paired stereo mic (set when stereo split is active)
}

/**
 * OPTIMAL KARAOKE SETTINGS FOR PITCH DETECTION
 * Based on UltraStar/SingStar standards and audio engineering best practices
 */
const OPTIMAL_KARAOKE_CONFIG: MicrophoneConfig = {
  deviceId: 'default',
  gain: 1.0,
  noiseSuppression: true,   // ON - removes background noise
  echoCancellation: true,   // ON - prevents room reflections
  autoGainControl: false,   // OFF - critical for accurate pitch detection!
  sampleRate: 44100,        // CD quality, optimal for voice pitch range
  latency: 'interactive',   // Lowest latency for real-time feedback
};

/**
 * OPTIMAL EXTENDED SETTINGS FOR ULTRASTAR/SINGSTAR
 * These are applied by default to every new microphone
 */
export const OPTIMAL_EXTENDED_CONFIG: ExtendedMicConfig = {
  ...OPTIMAL_KARAOKE_CONFIG,
  customName: 'Mikrofon 1',
  
  // Pitch Detection - Optimized for karaoke
  yinThreshold: 0.15,           // Good balance for voice
  minFrequency: 80,             // Low bass (approximately C2)
  maxFrequency: 1000,           // High soprano (approximately C6)
  volumeThreshold: 0.02,        // Ignore very quiet sounds
  fftSize: 4096,                // Good accuracy for pitch detection
  smoothingFactor: 0.5,         // Balance between responsiveness and stability
  
  // Latency
  manualLatencyOffset: 0,       // No offset by default
  
  // Quality
  clarityThreshold: 0.5,        // Minimum clarity for valid pitch

  // Stereo Split (default: off, mono mode)
  stereoSplitMode: false,
  stereoChannel: 'both',
};

// Maximum number of microphones supported
export const MAX_MICROPHONES = 4;
