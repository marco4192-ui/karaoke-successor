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

export interface PracticeSection {
  id: string;
  name: string;
  startTime: number;
  endTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  notes: Array<{
    pitch: number;
    duration: number;
    lyric: string;
  }>;
}

// Create practice sections from song lyrics
export function createPracticeSections(
  lyrics: Array<{ startTime: number; endTime: number; text: string; notes: Array<{ pitch: number; duration: number; lyric: string }> }>
): PracticeSection[] {
  const sections: PracticeSection[] = [];
  let sectionIndex = 0;
  
  for (const line of lyrics) {
    // Skip short lines (likely intros/outros)
    if (line.endTime - line.startTime < 2000) continue;
    
    const avgPitch = line.notes.reduce((sum, n) => sum + n.pitch, 0) / line.notes.length || 60;
    const pitchRange = Math.max(...line.notes.map(n => n.pitch)) - Math.min(...line.notes.map(n => n.pitch));
    
    let difficulty: 'easy' | 'medium' | 'hard' = 'easy';
    if (pitchRange > 12) difficulty = 'hard';
    else if (pitchRange > 6) difficulty = 'medium';
    
    sections.push({
      id: `section-${sectionIndex}`,
      name: line.text.slice(0, 20) + (line.text.length > 20 ? '...' : ''),
      startTime: line.startTime,
      endTime: line.endTime,
      difficulty,
      notes: line.notes,
    });
    
    sectionIndex++;
  }
  
  return sections;
}

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

// Pitch guide - generates tones for target notes
export class PitchGuidePlayer {
  private audioContext: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private isPlaying = false;

  initialize(): void {
    if (this.audioContext) return;
    this.audioContext = new AudioContext();
    this.gainNode = this.audioContext.createGain();
    this.gainNode.connect(this.audioContext.destination);
  }

  playNote(frequency: number, duration: number, volume: number = 0.5): void {
    if (!this.audioContext || !this.gainNode) {
      this.initialize();
    }
    
    if (!this.audioContext || !this.gainNode) return;
    
    // Stop previous note
    this.stopNote();
    
    // Create new oscillator
    this.oscillator = this.audioContext.createOscillator();
    this.oscillator.type = 'sine';
    this.oscillator.frequency.value = frequency;
    
    // Set volume
    this.gainNode.gain.value = volume;
    
    // Connect and play
    this.oscillator.connect(this.gainNode);
    this.oscillator.start();
    this.isPlaying = true;
    
    // Auto-stop after duration
    setTimeout(() => this.stopNote(), duration);
  }

  stopNote(): void {
    if (this.oscillator && this.isPlaying) {
      this.oscillator.stop();
      this.oscillator.disconnect();
      this.oscillator = null;
      this.isPlaying = false;
    }
  }

  setVolume(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  destroy(): void {
    this.stopNote();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.gainNode = null;
  }
}

// Practice statistics
export interface PracticeStats {
  attempts: number;
  bestAccuracy: number;
  averageAccuracy: number;
  timeSpent: number; // ms
  difficultSections: Array<{
    sectionId: string;
    misses: number;
  }>;
}

export function createPracticeStats(): PracticeStats {
  return {
    attempts: 0,
    bestAccuracy: 0,
    averageAccuracy: 0,
    timeSpent: 0,
    difficultSections: [],
  };
}

export function updatePracticeStats(
  stats: PracticeStats,
  accuracy: number,
  sectionMisses: Array<{ sectionId: string; misses: number }>,
  timeSpent: number
): PracticeStats {
  const newAttempts = stats.attempts + 1;
  const newAverage = (stats.averageAccuracy * stats.attempts + accuracy) / newAttempts;
  
  // Update difficult sections
  const newDifficultSections = [...stats.difficultSections];
  for (const miss of sectionMisses) {
    const existing = newDifficultSections.find(s => s.sectionId === miss.sectionId);
    if (existing) {
      existing.misses += miss.misses;
    } else {
      newDifficultSections.push(miss);
    }
  }
  
  return {
    attempts: newAttempts,
    bestAccuracy: Math.max(stats.bestAccuracy, accuracy),
    averageAccuracy: newAverage,
    timeSpent: stats.timeSpent + timeSpent,
    difficultSections: newDifficultSections,
  };
}
