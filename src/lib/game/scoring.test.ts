import { describe, it, expect } from 'vitest'
import {
  MAX_POINTS_PER_SONG,
  GOLDEN_NOTE_MULTIPLIER,
  PERFECT_NOTE_MULTIPLIER,
  PERFECT_GOLDEN_MULTIPLIER,
  getPitchClass,
  getRelativePitchDiff,
  calculateScoringMetadata,
  evaluateTick,
  calculateTickPoints,
  calculateNoteCompletionBonus,
  calculateFinalRating,
  getRatingColor,
  getRatingText,
  type NoteProgress,
} from './scoring'
import type { Difficulty } from '@/types/game'

describe('Pitch Utilities', () => {
  describe('getPitchClass', () => {
    it('should return 0 for C notes (MIDI 0, 12, 24, ...)', () => {
      expect(getPitchClass(0)).toBe(0)   // C0
      expect(getPitchClass(12)).toBe(0)  // C1
      expect(getPitchClass(24)).toBe(0)  // C2
      expect(getPitchClass(60)).toBe(0)  // C4 (Middle C)
      expect(getPitchClass(72)).toBe(0)  // C5
    })

    it('should return correct pitch classes for all notes', () => {
      // C = 0, C# = 1, D = 2, D# = 3, E = 4, F = 5, F# = 6, G = 7, G# = 8, A = 9, A# = 10, B = 11
      expect(getPitchClass(60)).toBe(0)   // C4
      expect(getPitchClass(61)).toBe(1)   // C#4
      expect(getPitchClass(62)).toBe(2)   // D4
      expect(getPitchClass(63)).toBe(3)   // D#4
      expect(getPitchClass(64)).toBe(4)   // E4
      expect(getPitchClass(65)).toBe(5)   // F4
      expect(getPitchClass(66)).toBe(6)   // F#4
      expect(getPitchClass(67)).toBe(7)   // G4
      expect(getPitchClass(68)).toBe(8)   // G#4
      expect(getPitchClass(69)).toBe(9)   // A4
      expect(getPitchClass(70)).toBe(10)  // A#4
      expect(getPitchClass(71)).toBe(11)  // B4
    })

    it('should handle negative values correctly', () => {
      expect(getPitchClass(-12)).toBe(0)  // C-1
      expect(getPitchClass(-1)).toBe(11)  // B-1
    })

    it('should round to nearest integer', () => {
      expect(getPitchClass(60.4)).toBe(0)   // Rounds to 60 (C4)
      expect(getPitchClass(60.5)).toBe(1)   // Rounds to 61 (C#4)
      expect(getPitchClass(59.6)).toBe(0)   // Rounds to 60 (C4)
    })
  })

  describe('getRelativePitchDiff', () => {
    it('should return 0 for same pitch class', () => {
      expect(getRelativePitchDiff(60, 60)).toBe(0)  // C4 to C4
      expect(getRelativePitchDiff(60, 72)).toBe(0)  // C4 to C5 (same pitch class)
      expect(getRelativePitchDiff(60, 48)).toBe(0)  // C4 to C3 (same pitch class)
    })

    it('should return correct differences for semitone steps', () => {
      expect(getRelativePitchDiff(60, 61)).toBe(1)  // C to C#
      expect(getRelativePitchDiff(60, 62)).toBe(2)  // C to D
      expect(getRelativePitchDiff(60, 63)).toBe(3)  // C to D#
      expect(getRelativePitchDiff(60, 64)).toBe(4)  // C to E
      expect(getRelativePitchDiff(60, 65)).toBe(5)  // C to F
      expect(getRelativePitchDiff(60, 66)).toBe(6)  // C to F# (max)
    })

    it('should use octave wrapping (shortest path)', () => {
      // C to G# (going up is 8, going down is 4)
      expect(getRelativePitchDiff(60, 68)).toBe(4)
      
      // C to A (going up is 9, going down is 3)
      expect(getRelativePitchDiff(60, 69)).toBe(3)
      
      // C to B (going up is 11, going down is 1)
      expect(getRelativePitchDiff(60, 71)).toBe(1)
    })

    it('should return max 6 semitones', () => {
      // The maximum should be 6 (tritone)
      expect(getRelativePitchDiff(60, 66)).toBe(6)  // C to F#
      expect(getRelativePitchDiff(61, 67)).toBe(6)  // C# to G
    })
  })
})

describe('Scoring Metadata', () => {
  describe('calculateScoringMetadata', () => {
    it('should calculate correct metadata for simple notes', () => {
      const notes = [
        { duration: 1000, isGolden: false },
        { duration: 1000, isGolden: false },
      ]
      const beatDuration = 500 // 2 ticks per note
      
      const metadata = calculateScoringMetadata(notes, beatDuration)
      
      expect(metadata.totalNoteTicks).toBe(4)  // 2 notes * 2 ticks each
      expect(metadata.goldenNoteTicks).toBe(0)
      expect(metadata.normalNoteTicks).toBe(4)
      expect(metadata.perfectScoreBase).toBe(8)  // 4 * PERFECT_NOTE_MULTIPLIER (2)
    })

    it('should handle golden notes correctly', () => {
      const notes = [
        { duration: 1000, isGolden: true },
        { duration: 1000, isGolden: false },
      ]
      const beatDuration = 500
      
      const metadata = calculateScoringMetadata(notes, beatDuration)
      
      expect(metadata.totalNoteTicks).toBe(4)
      expect(metadata.goldenNoteTicks).toBe(2)
      expect(metadata.normalNoteTicks).toBe(2)
      expect(metadata.perfectScoreBase).toBe(2 * PERFECT_GOLDEN_MULTIPLIER + 2 * PERFECT_NOTE_MULTIPLIER)
    })

    it('should calculate pointsPerTick to achieve MAX_POINTS_PER_SONG', () => {
      const notes = [{ duration: 1000, isGolden: false }]
      const beatDuration = 1000 // 1 tick
      
      const metadata = calculateScoringMetadata(notes, beatDuration)
      
      // With perfect score, we should reach MAX_POINTS_PER_SONG
      expect(metadata.pointsPerTick * metadata.perfectScoreBase).toBeCloseTo(MAX_POINTS_PER_SONG)
    })
  })
})

describe('Tick Evaluation', () => {
  describe('evaluateTick', () => {
    it('should return Miss for pitch outside tolerance', () => {
      // In easy mode, tolerance is 2 semitones
      const result = evaluateTick(60, 64, 'easy')  // 4 semitones difference
      
      expect(result.isHit).toBe(false)
      expect(result.displayType).toBe('Miss')
      expect(result.accuracy).toBe(0)
    })

    it('should return Perfect for exact pitch match', () => {
      const result = evaluateTick(60, 60, 'easy')
      
      expect(result.isHit).toBe(true)
      expect(result.displayType).toBe('Perfect')
      expect(result.accuracy).toBeCloseTo(1)
    })

    it('should have stricter tolerance for hard difficulty', () => {
      // In hard mode, tolerance is 0 (exact match only)
      const result = evaluateTick(60, 61, 'hard')  // 1 semitone difference
      
      expect(result.isHit).toBe(false)
      expect(result.displayType).toBe('Miss')
    })

    it('should return appropriate display types based on accuracy', () => {
      // Test different accuracy levels
      const exactMatch = evaluateTick(60, 60, 'easy')
      expect(exactMatch.displayType).toBe('Perfect')
      
      // Slightly off - still Great
      const slightlyOff = evaluateTick(60, 60.5, 'medium')
      expect(['Perfect', 'Great', 'Good']).toContain(slightlyOff.displayType)
    })
  })
})

describe('Tick Points', () => {
  describe('calculateTickPoints', () => {
    it('should return 0 for zero accuracy', () => {
      const points = calculateTickPoints(0, false, 10, 'easy')
      expect(points).toBe(0)
    })

    it('should multiply points by accuracy', () => {
      const points = calculateTickPoints(0.5, false, 10, 'easy')
      expect(points).toBeGreaterThan(0)
      expect(points).toBeLessThan(10)
    })

    it('should apply golden note multiplier', () => {
      const normalPoints = calculateTickPoints(1, false, 10, 'easy')
      const goldenPoints = calculateTickPoints(1, true, 10, 'easy')
      
      expect(goldenPoints).toBe(normalPoints * GOLDEN_NOTE_MULTIPLIER)
    })
  })
})

describe('Note Completion Bonus', () => {
  describe('calculateNoteCompletionBonus', () => {
    it('should return 0 for incomplete note', () => {
      const progress: NoteProgress = {
        noteId: 'test',
        totalTicks: 10,
        ticksHit: 5,
        ticksEvaluated: 5,
        isGolden: false,
        lastEvaluatedTime: 0,
        isComplete: false,
        wasPerfect: false,
      }
      
      const bonus = calculateNoteCompletionBonus(progress, 10)
      expect(bonus).toBe(0)
    })

    it('should calculate bonus for complete normal note', () => {
      const progress: NoteProgress = {
        noteId: 'test',
        totalTicks: 10,
        ticksHit: 10,
        ticksEvaluated: 10,
        isGolden: false,
        lastEvaluatedTime: 0,
        isComplete: true,
        wasPerfect: true,
      }
      
      const bonus = calculateNoteCompletionBonus(progress, 10)
      expect(bonus).toBe(100)  // 10 ticks * 10 pointsPerTick
    })

    it('should apply golden multiplier for golden notes', () => {
      const progress: NoteProgress = {
        noteId: 'test',
        totalTicks: 10,
        ticksHit: 10,
        ticksEvaluated: 10,
        isGolden: true,
        lastEvaluatedTime: 0,
        isComplete: true,
        wasPerfect: true,
      }
      
      const bonus = calculateNoteCompletionBonus(progress, 10)
      expect(bonus).toBe(100 * GOLDEN_NOTE_MULTIPLIER)
    })
  })
})

describe('Rating Helpers', () => {
  describe('calculateFinalRating', () => {
    it('should return perfect for 95%+ accuracy', () => {
      expect(calculateFinalRating(95)).toBe('perfect')
      expect(calculateFinalRating(100)).toBe('perfect')
      expect(calculateFinalRating(99.5)).toBe('perfect')
    })

    it('should return excellent for 85-94% accuracy', () => {
      expect(calculateFinalRating(85)).toBe('excellent')
      expect(calculateFinalRating(90)).toBe('excellent')
      expect(calculateFinalRating(94.9)).toBe('excellent')
    })

    it('should return good for 70-84% accuracy', () => {
      expect(calculateFinalRating(70)).toBe('good')
      expect(calculateFinalRating(77)).toBe('good')
      expect(calculateFinalRating(84.9)).toBe('good')
    })

    it('should return okay for 50-69% accuracy', () => {
      expect(calculateFinalRating(50)).toBe('okay')
      expect(calculateFinalRating(60)).toBe('okay')
      expect(calculateFinalRating(69.9)).toBe('okay')
    })

    it('should return poor for below 50% accuracy', () => {
      expect(calculateFinalRating(49)).toBe('poor')
      expect(calculateFinalRating(25)).toBe('poor')
      expect(calculateFinalRating(0)).toBe('poor')
    })
  })

  describe('getRatingColor', () => {
    it('should return correct colors for each rating', () => {
      expect(getRatingColor('perfect')).toBe('#FFD700')  // Gold
      expect(getRatingColor('good')).toBe('#4ADE80')     // Green
      expect(getRatingColor('okay')).toBe('#FBBF24')     // Yellow
      expect(getRatingColor('miss')).toBe('#EF4444')     // Red
    })
  })

  describe('getRatingText', () => {
    it('should return correct text for each rating', () => {
      expect(getRatingText('perfect')).toBe('PERFECT!')
      expect(getRatingText('good')).toBe('GOOD!')
      expect(getRatingText('okay')).toBe('OKAY')
      expect(getRatingText('miss')).toBe('MISS')
    })
  })
})
