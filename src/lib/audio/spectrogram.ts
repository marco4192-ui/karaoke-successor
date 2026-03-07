// Spectrogram Visualization Component Utilities
export interface SpectrogramConfig {
  fftSize: number;
  smoothing: number;
  minDecibels: number;
  maxDecibels: number;
  colorScheme: 'rainbow' | 'heat' | 'neon' | 'ocean' | 'fire';
}

export const DEFAULT_SPECTROGRAM_CONFIG: SpectrogramConfig = {
  fftSize: 2048,
  smoothing: 0.8,
  minDecibels: -90,
  maxDecibels: -10,
  colorScheme: 'neon',
};

export function getColorFromValue(value: number, scheme: SpectrogramConfig['colorScheme']): string {
  const normalized = Math.max(0, Math.min(1, value));
  
  switch (scheme) {
    case 'rainbow': {
      const hue = (1 - normalized) * 270; // Purple to red
      return `hsl(${hue}, 100%, ${50 + normalized * 30}%)`;
    }
    case 'heat': {
      if (normalized < 0.33) {
        return `rgb(0, ${Math.floor(normalized * 3 * 255)}, 0)`;
      } else if (normalized < 0.66) {
        return `rgb(${Math.floor((normalized - 0.33) * 3 * 255)}, 255, 0)`;
      } else {
        return `rgb(255, ${255 - Math.floor((normalized - 0.66) * 3 * 255)}, 0)`;
      }
    }
    case 'neon': {
      const neonHue = 180 + normalized * 120; // Cyan to pink
      return `hsl(${neonHue}, 100%, ${50 + normalized * 30}%)`;
    }
    case 'ocean': {
      const oceanHue = 200 + normalized * 60; // Blue to cyan
      return `hsl(${oceanHue}, ${70 + normalized * 30}%, ${30 + normalized * 40}%)`;
    }
    case 'fire': {
      if (normalized < 0.5) {
        return `rgb(${Math.floor(normalized * 2 * 255)}, 0, 0)`;
      } else {
        return `rgb(255, ${Math.floor((normalized - 0.5) * 2 * 255)}, 0)`;
      }
    }
    default:
      return `rgb(${normalized * 255}, ${normalized * 255}, ${normalized * 255})`;
  }
}

export interface FrequencyBand {
  name: string;
  minHz: number;
  maxHz: number;
  color: string;
}

export const FREQUENCY_BANDS: FrequencyBand[] = [
  { name: 'Sub Bass', minHz: 20, maxHz: 60, color: '#ff0080' },
  { name: 'Bass', minHz: 60, maxHz: 250, color: '#ff4040' },
  { name: 'Low Mid', minHz: 250, maxHz: 500, color: '#ff8000' },
  { name: 'Mid', minHz: 500, maxHz: 2000, color: '#ffff00' },
  { name: 'High Mid', minHz: 2000, maxHz: 4000, color: '#80ff00' },
  { name: 'Presence', minHz: 4000, maxHz: 6000, color: '#00ff80' },
  { name: 'Brilliance', minHz: 6000, maxHz: 20000, color: '#00ffff' },
];

// Generate visual bars from frequency data
export function generateVisualBars(
  frequencyData: Uint8Array,
  numBars: number,
  sampleRate: number
): Array<{ value: number; frequency: number; color: string }> {
  const bars: Array<{ value: number; frequency: number; color: string }> = [];
  const binSize = sampleRate / (frequencyData.length * 2);
  
  // Use logarithmic scaling for better visual representation
  const minFreq = 20;
  const maxFreq = 20000;
  const logMin = Math.log10(minFreq);
  const logMax = Math.log10(maxFreq);
  
  for (let i = 0; i < numBars; i++) {
    // Calculate frequency range for this bar (logarithmic)
    const logFreq = logMin + (logMax - logMin) * (i / numBars);
    const freq = Math.pow(10, logFreq);
    
    // Find corresponding FFT bin
    const binIndex = Math.floor(freq / binSize);
    const value = binIndex < frequencyData.length ? frequencyData[binIndex] / 255 : 0;
    
    // Determine color based on frequency
    let color = '#00ffff';
    for (const band of FREQUENCY_BANDS) {
      if (freq >= band.minHz && freq < band.maxHz) {
        color = band.color;
        break;
      }
    }
    
    bars.push({ value, frequency: freq, color });
  }
  
  return bars;
}

// Create waveform path for visualization
export function createWaveformPath(
  timeData: Float32Array,
  width: number,
  height: number
): string {
  const centerY = height / 2;
  const points: string[] = [];
  const step = width / timeData.length;
  
  for (let i = 0; i < timeData.length; i++) {
    const x = i * step;
    const y = centerY + timeData[i] * (height / 2);
    
    if (i === 0) {
      points.push(`M ${x} ${y}`);
    } else {
      points.push(`L ${x} ${y}`);
    }
  }
  
  return points.join(' ');
}

// Circular spectrogram for more artistic visualization
export function createCircularSpectrogram(
  frequencyData: Uint8Array,
  centerX: number,
  centerY: number,
  innerRadius: number,
  maxRadius: number
): Array<{ x1: number; y1: number; x2: number; y2: number; color: string }> {
  const lines: Array<{ x1: number; y1: number; x2: number; y2: number; color: string }> = [];
  const numSegments = frequencyData.length / 2; // Only use lower frequencies for cleaner look
  const angleStep = (2 * Math.PI) / numSegments;
  
  for (let i = 0; i < numSegments; i++) {
    const angle = i * angleStep - Math.PI / 2; // Start from top
    const value = frequencyData[i] / 255;
    const outerRadius = innerRadius + value * (maxRadius - innerRadius);
    
    lines.push({
      x1: centerX + Math.cos(angle) * innerRadius,
      y1: centerY + Math.sin(angle) * innerRadius,
      x2: centerX + Math.cos(angle) * outerRadius,
      y2: centerY + Math.sin(angle) * outerRadius,
      color: getColorFromValue(value, 'neon'),
    });
  }
  
  return lines;
}
