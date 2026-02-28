// Audio Analyzer for automatic note detection from audio files
// Uses Web Audio API and pitch detection algorithms

import { Note, LyricLine, Song, midiToFrequency, frequencyToMidi } from '@/types/game';

export interface AnalyzedNote {
  startTime: number;
  duration: number;
  pitch: number; // MIDI note
  frequency: number;
  confidence: number; // 0-1
}

export interface AnalysisProgress {
  stage: 'loading' | 'analyzing' | 'processing' | 'complete' | 'error';
  progress: number; // 0-100
  message: string;
}

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private onProgress: ((progress: AnalysisProgress) => void) | null = null;

  constructor(onProgress?: (progress: AnalysisProgress) => void) {
    this.onProgress = onProgress || null;
  }

  // Main analysis function
  async analyzeAudioFile(file: File): Promise<{
    notes: AnalyzedNote[];
    duration: number;
    bpm: number;
  }> {
    this.updateProgress('loading', 0, 'Loading audio file...');

    try {
      // Create audio context
      this.audioContext = new AudioContext();
      
      // Read file as array buffer
      const arrayBuffer = await file.arrayBuffer();
      
      this.updateProgress('loading', 30, 'Decoding audio data...');
      
      // Decode audio data
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      this.updateProgress('analyzing', 40, 'Analyzing audio...');
      
      // Get mono channel data
      const channelData = this.getMonoChannelData(audioBuffer);
      
      this.updateProgress('analyzing', 50, 'Detecting pitch...');
      
      // Detect pitches
      const pitches = await this.detectPitches(channelData, audioBuffer.sampleRate);
      
      this.updateProgress('processing', 70, 'Processing notes...');
      
      // Convert pitch detections to notes
      const notes = this.pitchesToNotes(pitches);
      
      this.updateProgress('processing', 85, 'Estimating BPM...');
      
      // Estimate BPM
      const bpm = this.estimateBPM(notes);
      
      this.updateProgress('complete', 100, 'Analysis complete!');
      
      return {
        notes,
        duration: audioBuffer.duration * 1000, // Convert to ms
        bpm,
      };
    } catch (error) {
      this.updateProgress('error', 0, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    } finally {
      if (this.audioContext) {
        await this.audioContext.close();
        this.audioContext = null;
      }
    }
  }

  // Get mono channel data (mix down if stereo)
  private getMonoChannelData(audioBuffer: AudioBuffer): Float32Array {
    if (audioBuffer.numberOfChannels === 1) {
      return audioBuffer.getChannelData(0);
    }
    
    const left = audioBuffer.getChannelData(0);
    const right = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : left;
    const mono = new Float32Array(left.length);
    
    for (let i = 0; i < left.length; i++) {
      mono[i] = (left[i] + right[i]) / 2;
    }
    
    return mono;
  }

  // Detect pitches using YIN algorithm
  private async detectPitches(
    audioData: Float32Array, 
    sampleRate: number
  ): Promise<Array<{ time: number; frequency: number | null; confidence: number }>> {
    const windowSize = 2048;
    const hopSize = 1024; // 50% overlap
    const pitches: Array<{ time: number; frequency: number | null; confidence: number }> = [];
    
    const totalWindows = Math.floor((audioData.length - windowSize) / hopSize);
    let processedWindows = 0;
    
    // Process in chunks to not block the UI
    const chunkSize = 100;
    
    for (let i = 0; i < totalWindows; i += chunkSize) {
      const end = Math.min(i + chunkSize, totalWindows);
      
      for (let j = i; j < end; j++) {
        const startSample = j * hopSize;
        const window = audioData.slice(startSample, startSample + windowSize);
        
        // Calculate RMS to detect silence
        const rms = this.calculateRMS(window);
        
        if (rms < 0.01) {
          // Silence
          pitches.push({
            time: (startSample / sampleRate) * 1000,
            frequency: null,
            confidence: 0,
          });
        } else {
          // Detect pitch using YIN
          const { frequency, confidence } = this.yinPitchDetection(window, sampleRate);
          pitches.push({
            time: (startSample / sampleRate) * 1000,
            frequency,
            confidence,
          });
        }
        
        processedWindows++;
      }
      
      // Update progress
      const progress = 50 + (processedWindows / totalWindows) * 20;
      this.updateProgress('analyzing', progress, `Analyzing pitch: ${Math.round((processedWindows / totalWindows) * 100)}%`);
      
      // Yield to event loop
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    return pitches;
  }

  // YIN pitch detection algorithm
  private yinPitchDetection(
    buffer: Float32Array, 
    sampleRate: number
  ): { frequency: number | null; confidence: number } {
    const yinThreshold = 0.15; // Lower threshold for better sensitivity
    const yinBuffer = new Float32Array(Math.floor(buffer.length / 2));
    const yinBufferLength = yinBuffer.length;

    // Compute difference function
    for (let tau = 0; tau < yinBufferLength; tau++) {
      yinBuffer[tau] = 0;
      for (let i = 0; i < yinBufferLength; i++) {
        const delta = buffer[i] - buffer[i + tau];
        yinBuffer[tau] += delta * delta;
      }
    }

    // Cumulative mean normalized difference function
    yinBuffer[0] = 1;
    let runningSum = 0;
    for (let tau = 1; tau < yinBufferLength; tau++) {
      runningSum += yinBuffer[tau];
      yinBuffer[tau] *= tau / runningSum;
    }

    // Find the first tau where the value is below threshold
    let tauEstimate = -1;
    let minVal = 1;
    for (let tau = 2; tau < yinBufferLength; tau++) {
      if (yinBuffer[tau] < yinThreshold) {
        while (tau + 1 < yinBufferLength && yinBuffer[tau + 1] < yinBuffer[tau]) {
          tau++;
        }
        tauEstimate = tau;
        break;
      }
      // Track minimum value for confidence
      if (yinBuffer[tau] < minVal) {
        minVal = yinBuffer[tau];
      }
    }

    if (tauEstimate === -1) {
      return { frequency: null, confidence: 0 };
    }

    // Parabolic interpolation for better accuracy
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

    const frequency = sampleRate / betterTau;
    
    // Calculate confidence based on how clear the pitch was
    const confidence = Math.max(0, 1 - yinBuffer[tauEstimate]);
    
    // Human vocal range: C2 (65Hz) to C6 (1047Hz)
    // Most karaoke songs use C3 to C5 range
    // Extended range for low male voices and high female voices
    if (frequency < 60 || frequency > 1200) {
      return { frequency: null, confidence: 0 };
    }

    // Additional check: very low confidence indicates noise or polyphonic audio
    if (confidence < 0.1) {
      return { frequency: null, confidence: 0 };
    }

    return { frequency, confidence };
  }

  // Calculate RMS (root mean square) for volume/silence detection
  private calculateRMS(buffer: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i] * buffer[i];
    }
    return Math.sqrt(sum / buffer.length);
  }

  // Convert pitch detections to note events
  private pitchesToNotes(
    pitches: Array<{ time: number; frequency: number | null; confidence: number }>
  ): AnalyzedNote[] {
    const notes: AnalyzedNote[] = [];
    let currentNote: { startTime: number; pitch: number; frequency: number; confidenceSum: number; count: number } | null = null;
    
    const pitchTolerance = 1; // semitones - be strict for better note detection
    const minNoteDuration = 80; // minimum note duration in ms
    const confidenceThreshold = 0.25; // minimum confidence to consider a pitch valid
    
    for (let i = 0; i < pitches.length; i++) {
      const pitch = pitches[i];
      
      if (pitch.frequency === null || pitch.confidence < confidenceThreshold) {
        // Silence or low confidence - end current note
        if (currentNote) {
          const duration = pitch.time - currentNote.startTime;
          if (duration >= minNoteDuration) {
            notes.push({
              startTime: currentNote.startTime,
              duration: duration,
              pitch: Math.round(currentNote.pitch / currentNote.count),
              frequency: currentNote.frequency / currentNote.count,
              confidence: currentNote.confidenceSum / currentNote.count,
            });
          }
          currentNote = null;
        }
        continue;
      }
      
      const midiNote = frequencyToMidi(pitch.frequency);
      
      if (currentNote === null) {
        // Start new note
        currentNote = {
          startTime: pitch.time,
          pitch: midiNote,
          frequency: pitch.frequency,
          confidenceSum: pitch.confidence,
          count: 1,
        };
      } else {
        // Check if this continues the current note
        const currentAvgPitch = currentNote.pitch / currentNote.count;
        const pitchDiff = Math.abs(midiNote - currentAvgPitch);
        
        if (pitchDiff <= pitchTolerance) {
          // Continue note - accumulate for averaging
          currentNote.pitch += midiNote;
          currentNote.frequency += pitch.frequency;
          currentNote.confidenceSum += pitch.confidence;
          currentNote.count++;
        } else {
          // Pitch changed - end current note and start new one
          const duration = pitch.time - currentNote.startTime;
          if (duration >= minNoteDuration) {
            notes.push({
              startTime: currentNote.startTime,
              duration: duration,
              pitch: Math.round(currentNote.pitch / currentNote.count),
              frequency: currentNote.frequency / currentNote.count,
              confidence: currentNote.confidenceSum / currentNote.count,
            });
          }
          
          currentNote = {
            startTime: pitch.time,
            pitch: midiNote,
            frequency: pitch.frequency,
            confidenceSum: pitch.confidence,
            count: 1,
          };
        }
      }
    }
    
    // Don't forget the last note
    if (currentNote) {
      const lastTime = pitches.length > 0 ? pitches[pitches.length - 1].time : currentNote.startTime;
      const duration = lastTime - currentNote.startTime;
      if (duration >= minNoteDuration) {
        notes.push({
          startTime: currentNote.startTime,
          duration: duration,
          pitch: Math.round(currentNote.pitch / currentNote.count),
          frequency: currentNote.frequency / currentNote.count,
          confidence: currentNote.confidenceSum / currentNote.count,
        });
      }
    }
    
    return notes;
  }

  // Estimate BPM from notes - improved algorithm
  private estimateBPM(notes: AnalyzedNote[]): number {
    if (notes.length < 4) return 120;
    
    // Calculate inter-onset intervals
    const intervals: number[] = [];
    for (let i = 1; i < notes.length; i++) {
      const interval = notes[i].startTime - notes[i - 1].startTime;
      // Only consider reasonable intervals (100ms to 2 seconds)
      if (interval >= 100 && interval <= 2000) {
        intervals.push(interval);
      }
    }
    
    if (intervals.length < 3) return 120;
    
    // Use histogram approach for BPM estimation
    // Test common BPM values and see which fits best
    const commonBPMs = [60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180];
    let bestBPM = 120;
    let bestScore = 0;
    
    for (const bpm of commonBPMs) {
      const beatDuration = 60000 / bpm;
      let score = 0;
      
      for (const interval of intervals) {
        // Check how well the interval aligns with beat divisions
        const beats = interval / beatDuration;
        const nearestBeat = Math.round(beats);
        const error = Math.abs(beats - nearestBeat);
        
        // Score based on how close to an integer number of beats
        if (error < 0.15) {
          score += 1 - error;
        }
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestBPM = bpm;
      }
    }
    
    return bestBPM;
  }

  // Update progress callback
  private updateProgress(stage: AnalysisProgress['stage'], progress: number, message: string) {
    if (this.onProgress) {
      this.onProgress({ stage, progress, message });
    }
  }
}

// Create a Song from analyzed audio
export function createSongFromAnalysis(
  analyzedNotes: AnalyzedNote[],
  duration: number,
  bpm: number,
  audioUrl: string,
  videoUrl?: string,
  title: string = 'Unknown',
  artist: string = 'Unknown'
): Song {
  // Group notes into lyric lines
  const lyricLines: LyricLine[] = [];
  let currentLineNotes: Note[] = [];
  let currentLineStart = 0;
  let lastEndTime = 0;
  
  const LINE_BREAK_THRESHOLD = 2000; // 2 seconds gap = new line
  
  for (const analyzedNote of analyzedNotes) {
    // Check for line break
    if (lastEndTime > 0 && (analyzedNote.startTime - lastEndTime) >= LINE_BREAK_THRESHOLD) {
      if (currentLineNotes.length > 0) {
        const endTime = currentLineNotes[currentLineNotes.length - 1].startTime + 
                        currentLineNotes[currentLineNotes.length - 1].duration;
        lyricLines.push({
          id: `line-${lyricLines.length}`,
          text: '♪', // Placeholder since we don't have lyrics
          startTime: currentLineStart,
          endTime,
          notes: currentLineNotes,
        });
        currentLineNotes = [];
      }
    }
    
    if (currentLineNotes.length === 0) {
      currentLineStart = analyzedNote.startTime;
    }
    
    const note: Note = {
      id: `note-${lyricLines.length}-${currentLineNotes.length}`,
      pitch: analyzedNote.pitch,
      frequency: midiToFrequency(analyzedNote.pitch),
      startTime: analyzedNote.startTime,
      duration: analyzedNote.duration,
      lyric: '♪', // Placeholder
      isBonus: false,
      isGolden: analyzedNote.confidence > 0.9, // High confidence = golden
    };
    
    currentLineNotes.push(note);
    lastEndTime = analyzedNote.startTime + analyzedNote.duration;
  }
  
  // Add last line
  if (currentLineNotes.length > 0) {
    const endTime = currentLineNotes[currentLineNotes.length - 1].startTime + 
                    currentLineNotes[currentLineNotes.length - 1].duration;
    lyricLines.push({
      id: `line-${lyricLines.length}`,
      text: '♪',
      startTime: currentLineStart,
      endTime,
      notes: currentLineNotes,
    });
  }
  
  // Determine difficulty
  const totalNotes = analyzedNotes.length;
  const songDurationMinutes = duration / 60000;
  const notesPerMinute = totalNotes / songDurationMinutes;
  
  let difficulty: 'easy' | 'medium' | 'hard' = 'medium';
  if (notesPerMinute > 40) difficulty = 'hard';
  else if (notesPerMinute < 20) difficulty = 'easy';
  
  const rating = Math.min(5, Math.max(1, Math.ceil(notesPerMinute / 10)));
  
  return {
    id: `analyzed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title,
    artist,
    duration,
    bpm,
    difficulty,
    rating,
    gap: 0,
    audioUrl,
    videoBackground: videoUrl,
    lyrics: lyricLines,
  };
}
