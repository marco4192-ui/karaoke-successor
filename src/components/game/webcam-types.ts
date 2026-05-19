import { StorageKeys, setJson, getJson } from '@/lib/storage';

// ===================== Webcam Background Types =====================

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

// ===================== Webcam Config Storage =====================

// Save webcam config to localStorage
export function saveWebcamConfig(_config: WebcamBackgroundConfig): void {
  try {
    setJson(StorageKeys.WEBCAM_CONFIG, _config);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to save webcam config:', e);
  }
}

// Load webcam config from localStorage
export function loadWebcamConfig(): WebcamBackgroundConfig {
  // getJson handles SSR and error cases
  const parsed = getJson<Partial<WebcamBackgroundConfig>>(StorageKeys.WEBCAM_CONFIG, {});
  return { ...DEFAULT_WEBCAM_CONFIG, ...parsed };
}

// ===================== Filter Styles Helper =====================

export function getFilterStyle(filter: WebcamFilter): string {
  switch (filter) {
    case 'grayscale':
      return 'grayscale(100%)';
    case 'sepia':
      return 'sepia(80%)';
    case 'contrast':
      return 'contrast(150%)';
    case 'brightness':
      return 'brightness(130%)';
    case 'saturate':
      return 'saturate(180%)';
    case 'blur':
      return 'blur(3px)';
    case 'none':
    default:
      return 'none';
  }
}
