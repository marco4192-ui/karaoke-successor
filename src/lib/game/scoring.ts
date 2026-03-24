import {
  Note,
  Player,
  Difficulty,
  DIFFICULTY_SETTINGS,
  SCORE_VALUES,
  frequencyToMidi,
} from '@/types/game';

// ===================== SCORING CONSTANTS =====================
export const MAX_POINTS_PER_SONG = 10000;
export const SCORING_TICK_INTERVAL = 100;
export const GOLDEN_NOTE_MULTIPLIER = 5;
export const PERFECT_NOTE_MULTIPLIER = 2;
export const PERFECT_GOLDEN_MULTIPLIER = 10;

// ===================== INTERFACES =====================
export interface NoteEvaluation {
  noteId: string;
  rating: 'perfect' | 'good' | 'okay' | 'miss';
  points: number;
  pitchAccuracy: number; // 0-1
  timingAccuracy: number; // 0-1
  isComboBreak: boolean;
}

export interface NoteProgress {
  noteId: string;
  totalTicks: number;
  ticksHit: number;
  ticksEvaluated: number;
  isGolden: boolean;
  lastEvaluatedTime: number;
  isComplete: boolean;
  wasPerfect: boolean;
}

export interface ScoringMetadata {
  totalNoteTicks: number;
  goldenNoteTicks: number;
  normalNoteTicks: number;
  perfectScoreBase: number;
  pointsPerTick: number;
}

export interface TickEvaluation {
  accuracy: number;
  isHit: boolean;
  displayType: 'Perfect' | 'Great' | 'Good' | 'Okay' | 'Miss';
}

export interface PointsResult {
  points: number;
  hitType: 'perfect' | 'good' | 'okay' | 'miss';
  displayType: 'Perfect' | 'Great' | 'Good' | 'Okay' | 'Miss';
  octaveBonus: boolean;
}

// ===================== PITCH UTILITIES =====================
/**
 * Get the pitch class (0-11) from a MIDI note number
 * Pitch class represents the note name regardless of octave (C=0, C#=1, ... B=11)
 * IMPORTANT: Rounds to nearest integer before computing pitch class
 */
export function getPitchClass(midiNote: number): number {
  return ((Math.round(midiNote) % 12) + 12) % 12;
}

/**
 * Calculate the relative pitch difference between two MIDI notes
 * Uses UltraStar-style octave wrapping: notes in the same pitch class have 0 difference
 * Maximum difference is 6 semitones (half an octave)
 */
export function getRelativePitchDiff(sungNote: number, targetNote: number): number {
  const sungClass = getPitchClass(sungNote);
  const targetClass = getPitchClass(targetNote);
  
  // Calculate the shortest distance on the pitch class circle
  let diff = Math.abs(sungClass - targetClass);
  if (diff > 6) {
    diff = 12 - diff;
  }
  
  return diff;
}

// ===================== SCORING METADATA =====================
/**
 * Calculate scoring metadata for duration-based scoring
 * This pre-computes the point distribution for a song
 */
export function calculateScoringMetadata(
  notes: Array<{ duration: number; isGolden: boolean }>,
  beatDuration: number
): ScoringMetadata {
  let totalNoteTicks = 0;
  let goldenNoteTicks = 0;
  
  for (const note of notes) {
    const ticksInNote = Math.max(1, Math.round(note.duration / beatDuration));
    totalNoteTicks += ticksInNote;
    if (note.isGolden) {
      goldenNoteTicks += ticksInNote;
    }
  }
  
  const normalNoteTicks = totalNoteTicks - goldenNoteTicks;
  const perfectScoreBase = (normalNoteTicks * PERFECT_NOTE_MULTIPLIER) + (goldenNoteTicks * PERFECT_GOLDEN_MULTIPLIER);
  const pointsPerTick = perfectScoreBase > 0 ? MAX_POINTS_PER_SONG / perfectScoreBase : 1;
  
  return { totalNoteTicks, goldenNoteTicks, normalNoteTicks, perfectScoreBase, pointsPerTick };
}

// ===================== TICK-BASED SCORING =====================
/**
 * Evaluate a single tick during note playback
 * Used for duration-based scoring where notes are evaluated continuously
 */
export function evaluateTick(
  sungNote: number,
  targetNote: number,
  difficulty: Difficulty
): TickEvaluation {
  const settings = DIFFICULTY_SETTINGS[difficulty];
  const relativeDiff = getRelativePitchDiff(sungNote, targetNote);
  const effectiveTolerance = difficulty === 'hard' ? 0 : settings.pitchTolerance;
  
  if (relativeDiff > effectiveTolerance) {
    return { accuracy: 0, isHit: false, displayType: 'Miss' };
  }
  
  const accuracy = 1 - (relativeDiff / (effectiveTolerance + 1));
  
  let displayType: 'Perfect' | 'Great' | 'Good' | 'Okay' | 'Miss' = 'Miss';
  
  if (accuracy > 0.95) {
    displayType = 'Perfect';
  } else if (accuracy > 0.8) {
    displayType = 'Great';
  } else if (accuracy > 0.6) {
    displayType = 'Good';
  } else if (accuracy > 0.4) {
    displayType = 'Okay';
  }
  
  return { accuracy, isHit: true, displayType };
}

/**
 * Calculate points for a single tick
 */
export function calculateTickPoints(
  accuracy: number,
  isGolden: boolean,
  pointsPerTick: number,
  difficulty: Difficulty
): number {
  if (accuracy <= 0) return 0;
  
  const settings = DIFFICULTY_SETTINGS[difficulty];
  let points = pointsPerTick * accuracy * settings.noteScoreMultiplier;
  
  if (isGolden) {
    points *= GOLDEN_NOTE_MULTIPLIER;
  }
  
  return points;
}

/**
 * Calculate bonus points for completing a note
 */
export function calculateNoteCompletionBonus(
  noteProgress: NoteProgress,
  pointsPerTick: number
): number {
  if (noteProgress.ticksHit < noteProgress.totalTicks) {
    return 0;
  }
  
  const basePoints = noteProgress.totalTicks * pointsPerTick;
  
  if (noteProgress.isGolden) {
    return basePoints * GOLDEN_NOTE_MULTIPLIER;
  } else {
    return basePoints;
  }
}

// ===================== NOTE-BASED SCORING =====================
/**
 * Calculate points for hitting a note
 * Includes combo multiplier, golden note bonus, and octave jump handling
 */
export function calculatePoints(
  sungNote: number,
  targetNote: number,
  difficulty: Difficulty,
  combo: number,
  isGolden: boolean,
  isBonus: boolean,
  totalNotes: number = 100
): PointsResult {
  const settings = DIFFICULTY_SETTINGS[difficulty];
  const relativeDiff = getRelativePitchDiff(sungNote, targetNote);
  const octaveDiff = Math.abs(Math.round(sungNote) - Math.round(targetNote));
  const isOctaveJump = relativeDiff === 0 && octaveDiff >= 12;
  const effectiveTolerance = difficulty === 'hard' ? 0 : settings.pitchTolerance;
  const baseNoteValue = Math.max(10, Math.floor(MAX_POINTS_PER_SONG / Math.max(totalNotes, 50)));
  
  let points = 0;
  let hitType: 'perfect' | 'good' | 'okay' | 'miss' = 'miss';
  let displayType: 'Perfect' | 'Great' | 'Good' | 'Okay' | 'Miss' = 'Miss';
  
  if (relativeDiff <= effectiveTolerance) {
    const accuracy = 1 - (relativeDiff / (effectiveTolerance + 1));
    
    if (accuracy > 0.95) {
      points = baseNoteValue * settings.noteScoreMultiplier;
      hitType = 'perfect';
      displayType = 'Perfect';
    } else if (accuracy > 0.8) {
      points = Math.floor(baseNoteValue * 0.75 * settings.noteScoreMultiplier);
      hitType = 'perfect';
      displayType = 'Great';
    } else if (accuracy > 0.6) {
      points = Math.floor(baseNoteValue * 0.5 * settings.noteScoreMultiplier);
      hitType = 'good';
      displayType = 'Good';
    } else if (accuracy > 0.4) {
      points = Math.floor(baseNoteValue * 0.25 * settings.noteScoreMultiplier);
      hitType = 'okay';
      displayType = 'Okay';
    }
    
    if (points > 0) {
      const comboMultiplier = 1 + Math.min(0.5, combo * 0.02 * (settings.comboMultiplier - 1));
      points = Math.floor(points * comboMultiplier);
      
      if (isGolden) {
        points = Math.floor(points * 1.5);
      }
      
      if (isBonus) {
        points = Math.floor(points * 1.25);
      }
      
      if (isOctaveJump) {
        points = Math.floor(points * 0.85);
      }
    }
  }
  
  return { points: Math.floor(points), hitType, displayType, octaveBonus: isOctaveJump };
}

// ===================== PLAYER EVALUATION =====================
/**
 * Evaluate a note against sung pitch and timing
 */
export function evaluateNote(
  note: Note,
  sungPitch: number | null,
  sungTime: number,
  difficulty: Difficulty,
  player: Player
): NoteEvaluation {
  const settings = DIFFICULTY_SETTINGS[difficulty];

  // Check timing
  const timingDiff = Math.abs(sungTime - note.startTime);
  const timingAccuracy = Math.max(0, 1 - timingDiff / settings.timingTolerance);
  const isOnTime = timingDiff <= settings.timingTolerance;

  // Check pitch - using UltraStar-style octave-wrapped comparison
  let pitchAccuracy = 0;
  let isPitchMatch = false;

  if (sungPitch !== null) {
    const sungMidi = frequencyToMidi(sungPitch);
    
    // Use relative pitch difference (octave-wrapped)
    const relativeDiff = getRelativePitchDiff(sungMidi, note.pitch);
    
    // For hard mode, require exact pitch class (no tolerance)
    const effectiveTolerance = difficulty === 'hard' ? 0 : settings.pitchTolerance;
    
    pitchAccuracy = Math.max(0, 1 - relativeDiff / (effectiveTolerance + 1));
    isPitchMatch = relativeDiff <= effectiveTolerance;
  }

  // Determine rating
  let rating: 'perfect' | 'good' | 'okay' | 'miss';
  let points: number;

  if (!isOnTime || !isPitchMatch) {
    rating = 'miss';
    points = 0;
  } else if (pitchAccuracy >= 0.9 && timingAccuracy >= 0.9) {
    rating = 'perfect';
    points = SCORE_VALUES.perfect;
  } else if (pitchAccuracy >= 0.7 && timingAccuracy >= 0.7) {
    rating = 'good';
    points = SCORE_VALUES.good;
  } else {
    rating = 'okay';
    points = SCORE_VALUES.okay;
  }

  // Apply multipliers
  if (rating !== 'miss') {
    // Difficulty multiplier
    points = Math.round(points * settings.noteScoreMultiplier);

    // Combo bonus
    const comboBonus = Math.floor(player.combo / 10) * SCORE_VALUES.comboBonus;
    points += comboBonus;

    // Star power multiplier
    if (player.isStarPowerActive) {
      points = Math.round(points * SCORE_VALUES.starPowerMultiplier);
    }

    // Golden note bonus
    if (note.isGolden) {
      points += SCORE_VALUES.goldenNoteBonus;
    }
  }

  return {
    noteId: note.id,
    rating,
    points,
    pitchAccuracy,
    timingAccuracy,
    isComboBreak: rating === 'miss',
  };
}

// ===================== PLAYER STATS UPDATE =====================
export function updatePlayerStats(
  player: Player,
  evaluation: NoteEvaluation
): Player {
  const updatedPlayer = { ...player };

  if (evaluation.rating === 'miss') {
    // Reset combo on miss
    updatedPlayer.combo = 0;
    updatedPlayer.notesMissed += 1;
  } else {
    // Increment combo and score
    updatedPlayer.combo += 1;
    updatedPlayer.maxCombo = Math.max(updatedPlayer.maxCombo, updatedPlayer.combo);
    updatedPlayer.notesHit += 1;
    updatedPlayer.score += evaluation.points;

    // Build star power
    if (evaluation.rating === 'perfect') {
      updatedPlayer.starPower = Math.min(100, updatedPlayer.starPower + 5);
    } else {
      updatedPlayer.starPower = Math.min(100, updatedPlayer.starPower + 2);
    }
  }

  // Update accuracy
  const totalNotes = updatedPlayer.notesHit + updatedPlayer.notesMissed;
  if (totalNotes > 0) {
    updatedPlayer.accuracy = (updatedPlayer.notesHit / totalNotes) * 100;
  }

  return updatedPlayer;
}

// ===================== STAR POWER =====================
export function activateStarPower(player: Player): Player {
  if (player.starPower >= 100 && !player.isStarPowerActive) {
    return {
      ...player,
      isStarPowerActive: true,
      starPower: 100,
    };
  }
  return player;
}

export function deactivateStarPower(player: Player): Player {
  if (player.isStarPowerActive) {
    return {
      ...player,
      isStarPowerActive: false,
      starPower: 0,
    };
  }
  return player;
}

export function drainStarPower(player: Player, deltaTime: number): Player {
  if (player.isStarPowerActive) {
    const drainRate = 20; // % per second
    const drain = (drainRate * deltaTime) / 1000;
    const newStarPower = player.starPower - drain;

    if (newStarPower <= 0) {
      return {
        ...player,
        isStarPowerActive: false,
        starPower: 0,
      };
    }

    return {
      ...player,
      starPower: newStarPower,
    };
  }
  return player;
}

// ===================== RATING HELPERS =====================
export function calculateFinalRating(accuracy: number): 'perfect' | 'excellent' | 'good' | 'okay' | 'poor' {
  if (accuracy >= 95) return 'perfect';
  if (accuracy >= 85) return 'excellent';
  if (accuracy >= 70) return 'good';
  if (accuracy >= 50) return 'okay';
  return 'poor';
}

export function getRatingColor(rating: 'perfect' | 'good' | 'okay' | 'miss'): string {
  switch (rating) {
    case 'perfect':
      return '#FFD700'; // Gold
    case 'good':
      return '#4ADE80'; // Green
    case 'okay':
      return '#FBBF24'; // Yellow
    case 'miss':
      return '#EF4444'; // Red
    default:
      return '#FFFFFF';
  }
}

export function getRatingText(rating: 'perfect' | 'good' | 'okay' | 'miss'): string {
  switch (rating) {
    case 'perfect':
      return 'PERFECT!';
    case 'good':
      return 'GOOD!';
    case 'okay':
      return 'OKAY';
    case 'miss':
      return 'MISS';
    default:
      return '';
  }
}

// ===================== NOTE PROGRESS HELPERS =====================
/**
 * Create a new NoteProgress object for tracking note duration
 */
export function createNoteProgress(
  noteId: string,
  duration: number,
  beatDuration: number,
  isGolden: boolean
): NoteProgress {
  return {
    noteId,
    totalTicks: Math.max(1, Math.round(duration / beatDuration)),
    ticksHit: 0,
    ticksEvaluated: 0,
    isGolden,
    lastEvaluatedTime: 0,
    isComplete: false,
    wasPerfect: false,
  };
}

/**
 * Update note progress with a new tick evaluation
 */
export function updateNoteProgress(
  progress: NoteProgress,
  isHit: boolean,
  accuracy: number,
  currentTime: number
): NoteProgress {
  const newTicksHit = isHit ? progress.ticksHit + 1 : progress.ticksHit;
  const newTicksEvaluated = progress.ticksEvaluated + 1;
  const isComplete = newTicksEvaluated >= progress.totalTicks;
  const wasPerfect = isComplete ? (newTicksHit / progress.totalTicks) >= 0.95 : false;
  
  return {
    ...progress,
    ticksHit: newTicksHit,
    ticksEvaluated: newTicksEvaluated,
    lastEvaluatedTime: currentTime,
    isComplete,
    wasPerfect,
  };
}
