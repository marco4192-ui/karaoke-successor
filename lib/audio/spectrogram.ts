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

interface FrequencyBand {
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
