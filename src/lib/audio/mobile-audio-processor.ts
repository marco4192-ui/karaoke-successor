/**
 * Audio Processing Service for Mobile Companion Audio Streams
 * 
 * This service receives audio chunks from mobile companions and performs
 * pitch detection on the PC side. Used for non-battle-royale game modes.
 */

// ===================== TYPES =====================
export interface ProcessedAudioResult {
  clientId: string;
  frequency: number | null;
  note: number | null;
  volume: number;
  clarity: number;
  timestamp: number;
  profile?: {
    id: string;
    name: string;
    avatar?: string;
    color: string;
  };
}

export interface AudioChunk {
  data: string; // base64 encoded
  sampleRate: number;
  channels: number;
  sequenceNumber: number;
  timestamp?: number;
}

export type GameType = 'battle-royale' | 'companion-singalong' | 'duet' | 'pass-the-mic' | 'single' | 'medley';

// ===================== YIN PITCH DETECTION =====================
// Optimized YIN algorithm for pitch detection
function yinPitchDetection(buffer: Float32Array, sampleRate: number): number | null {
  const yinThreshold = 0.15;
  const yinBufferLength = Math.floor(buffer.length / 2);
  
  if (yinBufferLength < 2) return null;
  
  const yinBuffer = new Float32Array(yinBufferLength);
  
  // Step 1: Difference function
  for (let tau = 0; tau < yinBufferLength; tau++) {
    yinBuffer[tau] = 0;
    for (let i = 0; i < yinBufferLength; i++) {
      const delta = buffer[i] - buffer[i + tau];
      yinBuffer[tau] += delta * delta;
    }
  }
  
  // Step 2: Cumulative mean normalized difference
  yinBuffer[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau < yinBufferLength; tau++) {
    runningSum += yinBuffer[tau];
    yinBuffer[tau] *= tau / runningSum;
  }
  
  // Step 3: Absolute threshold
  let tauEstimate = -1;
  for (let tau = 2; tau < yinBufferLength; tau++) {
    if (yinBuffer[tau] < yinThreshold) {
      while (tau + 1 < yinBufferLength && yinBuffer[tau + 1] < yinBuffer[tau]) {
        tau++;
      }
      tauEstimate = tau;
      break;
    }
  }
  
  if (tauEstimate === -1) return null;
  
  // Step 4: Parabolic interpolation
  let betterTau: number;
  const x0 = tauEstimate < 1 ? tauEstimate : tauEstimate - 1;
  const x2 = tauEstimate + 1 < yinBufferLength ? tauEstimate + 1 : tauEstimate;
  
  if (x0 === tauEstimate) {
    betterTau = yinBuffer[tauEstimate] <= yinBuffer[x2] ? tauEstimate : x2;
  } else if (x2 === tauEstimate) {
    betterTau = yinBuffer[tauEstimate] <= yinBuffer[x0] ? tauEstimate : x0;
  } else {
    const s0 = yinBuffer[x0];
    const s1 = yinBuffer[tauEstimate];
    const s2 = yinBuffer[x2];
    betterTau = tauEstimate + (s2 - s0) / (2 * (2 * s1 - s2 - s0));
  }
  
  return sampleRate / betterTau;
}

// ===================== AUDIO PROCESSOR CLASS =====================
export class MobileAudioProcessor {
  private audioContext: AudioContext | null = null;
  private processedResults: Map<string, ProcessedAudioResult> = new Map();
  private lastSequenceNumbers: Map<string, number> = new Map();
  
  /**
   * Initialize the audio processor with an AudioContext
   */
  async initialize(): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext({ sampleRate: 22050 });
    }
  }
  
  /**
   * Convert base64 audio data to Float32Array
   */
  private base64ToFloat32(base64: string): Float32Array {
    // Decode base64
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Convert Int16 to Float32
    const int16View = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16View.length);
    for (let i = 0; i < int16View.length; i++) {
      float32[i] = int16View[i] / (int16View[i] < 0 ? 0x8000 : 0x7FFF);
    }
    
    return float32;
  }
  
  /**
   * Process an audio chunk from a mobile client
   */
  processChunk(
    clientId: string,
    chunk: AudioChunk,
    profile?: { id: string; name: string; avatar?: string; color: string }
  ): ProcessedAudioResult | null {
    // Check for duplicate/out-of-order chunks
    const lastSeq = this.lastSequenceNumbers.get(clientId) || -1;
    if (chunk.sequenceNumber <= lastSeq) {
      return null; // Skip duplicate or old chunk
    }
    this.lastSequenceNumbers.set(clientId, chunk.sequenceNumber);
    
    try {
      // Decode audio data
      const audioData = this.base64ToFloat32(chunk.data);
      
      if (audioData.length === 0) {
        return null;
      }
      
      // Calculate volume (RMS)
      let sum = 0;
      for (let i = 0; i < audioData.length; i++) {
        sum += audioData[i] * audioData[i];
      }
      const rms = Math.sqrt(sum / audioData.length);
      const volume = Math.min(1, rms * 5);
      
      // Perform pitch detection
      const frequency = yinPitchDetection(audioData, chunk.sampleRate);
      
      // Convert frequency to MIDI note
      let note: number | null = null;
      if (frequency !== null && frequency >= 65 && frequency <= 1047) {
        note = 69 + 12 * Math.log2(frequency / 440);
      }
      
      // Calculate clarity (simplified)
      const clarity = volume > 0.02 ? Math.min(1, volume * 2) : 0;
      
      const result: ProcessedAudioResult = {
        clientId,
        frequency,
        note,
        volume,
        clarity,
        timestamp: Date.now(),
        profile,
      };
      
      // Store result
      this.processedResults.set(clientId, result);
      
      return result;
    } catch (error) {
      console.error('[MobileAudioProcessor] Error processing chunk:', error);
      return null;
    }
  }
  
  /**
   * Process multiple audio chunks from the server
   */
  processAudioBuffers(
    audioBuffers: Array<{
      clientId: string;
      chunks: AudioChunk[];
      profile?: { id: string; name: string; avatar?: string; color: string };
    }>
  ): ProcessedAudioResult[] {
    const results: ProcessedAudioResult[] = [];
    
    for (const buffer of audioBuffers) {
      // Process each chunk, keeping only the latest result per client
      for (const chunk of buffer.chunks) {
        const result = this.processChunk(buffer.clientId, chunk, buffer.profile);
        if (result) {
          // Only keep the latest result for each client
          const existingIndex = results.findIndex(r => r.clientId === buffer.clientId);
          if (existingIndex >= 0) {
            results[existingIndex] = result;
          } else {
            results.push(result);
          }
        }
      }
    }
    
    return results;
  }
  
  /**
   * Get the latest processed result for a client
   */
  getLatestResult(clientId: string): ProcessedAudioResult | null {
    return this.processedResults.get(clientId) || null;
  }
  
  /**
   * Get all latest processed results
   */
  getAllLatestResults(): ProcessedAudioResult[] {
    return Array.from(this.processedResults.values());
  }
  
  /**
   * Clear processed results (e.g., when starting a new song)
   */
  clearResults(): void {
    this.processedResults.clear();
    this.lastSequenceNumbers.clear();
  }
  
  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }
    this.clearResults();
  }
}

// ===================== SINGLETON INSTANCE =====================
let processorInstance: MobileAudioProcessor | null = null;

export function getMobileAudioProcessor(): MobileAudioProcessor {
  if (!processorInstance) {
    processorInstance = new MobileAudioProcessor();
  }
  return processorInstance;
}

// ===================== HELPER FUNCTIONS =====================
/**
 * Fetch audio from mobile API and process it
 */
export async function fetchAndProcessAudio(
  processor: MobileAudioProcessor
): Promise<ProcessedAudioResult[]> {
  try {
    const response = await fetch('/api/mobile?action=getaudio');
    const data = await response.json();
    
    if (!data.success || !data.audioBuffers) {
      return [];
    }
    
    const results = processor.processAudioBuffers(data.audioBuffers);
    
    // Consume the audio after processing
    if (results.length > 0) {
      await fetch('/api/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'consumeaudio',
          payload: { keepLast: 5 }, // Keep some chunks for reliability
        }),
      });
    }
    
    return results;
  } catch (error) {
    console.error('[MobileAudioProcessor] Error fetching audio:', error);
    return [];
  }
}

/**
 * Set the game type to determine transmission mode
 */
export async function setGameType(gameType: GameType): Promise<void> {
  try {
    await fetch('/api/mobile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'setgametype',
        payload: { gameType },
      }),
    });
  } catch (error) {
    console.error('[MobileAudioProcessor] Error setting game type:', error);
  }
}
