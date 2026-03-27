import { storage, STORAGE_KEYS } from '@/lib/storage';

export type WebcamSizeMode = 
  | 'fullscreen'    // Webcam fills entire background
  | '2:10'          // 20% of height (horizontal strip)
  | '3:10'          // 30% of height
  | '4:10';         // 40% of height

export type WebcamPosition = 
  | 'top'           // Top horizontal strip
  | 'bottom'        // Bottom horizontal strip
  | 'left'          // Left vertical strip
  | 'right';        // Right vertical strip

export type WebcamFilter = 
  | 'none'          // No filter
  | 'grayscale'     // Black and white
  | 'sepia'         // Vintage sepia tone
  | 'contrast'      // High contrast
  | 'brightness'    // Increased brightness
  | 'saturate'      // Vibrant colors
  | 'blur';         // Blur effect (for background)

export interface WebcamBackgroundConfig {
  enabled: boolean;
  sizeMode: WebcamSizeMode;
  position: WebcamPosition;
  deviceId: string | null;    // Selected camera device
  mirrored: boolean;          // Mirror the camera horizontally (selfie mode)
  opacity: number;            // 0-1 opacity for blending
  borderRadius: number;       // Border radius in pixels
  showBorder: boolean;        // Show border around webcam
  borderColor: string;        // Border color
  filter: WebcamFilter;       // Visual filter
  zIndex: number;             // Layer order
}

export const DEFAULT_WEBCAM_CONFIG: WebcamBackgroundConfig = {
  enabled: false,
  sizeMode: '2:10',
  position: 'bottom',
  deviceId: null,
  mirrored: true,
  opacity: 1,
  borderRadius: 16,
  showBorder: true,
  borderColor: 'rgba(0, 255, 255, 0.5)',
  filter: 'none',
  zIndex: 5,
};

// Storage key for webcam config
const WEBCAM_CONFIG_KEY = 'karaoke-webcam-config';

// Save webcam config to storage
export function saveWebcamConfig(config: WebcamBackgroundConfig): void {
  try {
    localStorage.setItem(WEBCAM_CONFIG_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('Failed to save webcam config:', error);
  }
}

// Load webcam config from storage
export function loadWebcamConfig(): WebcamBackgroundConfig {
  try {
    const saved = localStorage.getItem(WEBCAM_CONFIG_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_WEBCAM_CONFIG, ...parsed };
    }
  } catch (error) {
    console.error('Failed to load webcam config:', error);
  }
  return { ...DEFAULT_WEBCAM_CONFIG };
}
