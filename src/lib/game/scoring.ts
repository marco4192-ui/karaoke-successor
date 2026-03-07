import {
  Note,
  Player,
  Difficulty,
  DIFFICULTY_SETTINGS,
  SCORE_VALUES,
  frequencyToMidi,
} from '@/types/game';

export interface NoteEvaluation {
  noteId: string;
  rating: 'perfect' | 'good' | 'okay' | 'miss';
  points: number;
  pitchAccuracy: number; // 0-1
  timingAccuracy: number; // 0-1
  isComboBreak: boolean;
}

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

  // Check pitch
  let pitchAccuracy = 0;
  let isPitchMatch = false;

  if (sungPitch !== null) {
    const sungMidi = frequencyToMidi(sungPitch);
    const pitchDiff = Math.abs(sungMidi - note.pitch);
    pitchAccuracy = Math.max(0, 1 - pitchDiff / settings.pitchTolerance);
    isPitchMatch = pitchDiff <= settings.pitchTolerance;
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
