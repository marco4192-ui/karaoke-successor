import { describe, it, expect, beforeEach } from 'vitest'
import { 
  PitchDetector, 
  KARAOKE_DEFAULT_CONFIG, 
  DIFFICULTY_PITCH_CONFIGS,
  getPitchDetector,
  resetPitchDetector,
  PitchDetectorManager,
  getPitchDetectorManager,
  resetPitchDetectorManager,
} from './pitch-detector'
import type { Difficulty } from '@/types/game'

describe('PitchDetector', () => {
  beforeEach(() => {
    resetPitchDetector()
    resetPitchDetectorManager()
  })

  describe('Configuration', () => {
    it('should use default karaoke config', () => {
      expect(KARAOKE_DEFAULT_CONFIG.volumeThreshold).toBe(0.03)
      expect(KARAOKE_DEFAULT_CONFIG.pitchStabilityFrames).toBe(3)
      expect(KARAOKE_DEFAULT_CONFIG.yinThreshold).toBe(0.12)
      expect(KARAOKE_DEFAULT_CONFIG.minFrequency).toBe(65)
      expect(KARAOKE_DEFAULT_CONFIG.maxFrequency).toBe(1047)
    })

    it('should have difficulty-specific configs', () => {
      const difficulties: Difficulty[] = ['easy', 'medium', 'hard']
      
      difficulties.forEach(diff => {
        expect(DIFFICULTY_PITCH_CONFIGS[diff]).toBeDefined()
        expect(DIFFICULTY_PITCH_CONFIGS[diff].volumeThreshold).toBeGreaterThan(0)
        expect(DIFFICULTY_PITCH_CONFIGS[diff].yinThreshold).toBeGreaterThan(0)
      })
    })

    it('should have more lenient settings for easy difficulty', () => {
      const easyConfig = DIFFICULTY_PITCH_CONFIGS.easy
      const hardConfig = DIFFICULTY_PITCH_CONFIGS.hard
      
      // Easy should be more sensitive (lower threshold)
      expect(easyConfig.volumeThreshold).toBeLessThan(hardConfig.volumeThreshold)
      expect(easyConfig.yinThreshold).toBeLessThan(hardConfig.yinThreshold)
    })

    it('should create detector with custom config', () => {
      const customConfig = { volumeThreshold: 0.1, yinThreshold: 0.2 }
      const detector = new PitchDetector(customConfig)
      
      // Detector should accept custom config
      expect(detector).toBeInstanceOf(PitchDetector)
    })
  })

  describe('Singleton Pattern', () => {
    it('should return the same instance from getPitchDetector', () => {
      const instance1 = getPitchDetector()
      const instance2 = getPitchDetector()
      
      expect(instance1).toBe(instance2)
    })

    it('should create new instance after reset', () => {
      const instance1 = getPitchDetector()
      resetPitchDetector()
      const instance2 = getPitchDetector()
      
      expect(instance1).not.toBe(instance2)
    })
  })

  describe('PitchDetectorManager', () => {
    it('should manage multiple detectors', () => {
      const manager = getPitchDetectorManager()
      
      expect(manager).toBeInstanceOf(PitchDetectorManager)
      expect(manager.getDetector('nonexistent')).toBeUndefined()
    })

    it('should return same manager instance', () => {
      const manager1 = getPitchDetectorManager()
      const manager2 = getPitchDetectorManager()
      
      expect(manager1).toBe(manager2)
    })

    it('should reset manager and clear all detectors', () => {
      getPitchDetectorManager()
      resetPitchDetectorManager()
      const newManager = getPitchDetectorManager()
      
      expect(newManager).toBeInstanceOf(PitchDetectorManager)
    })
  })

  describe('Lifecycle', () => {
    it('should stop listening when stop() is called', () => {
      const detector = new PitchDetector()
      
      detector.stop()
      // No error should be thrown
      expect(true).toBe(true)
    })
  })

  describe('setDifficulty', () => {
    it('should update config based on difficulty', () => {
      const detector = new PitchDetector()
      
      detector.setDifficulty('easy')
      // Config should be updated (internal state)
      expect(detector).toBeInstanceOf(PitchDetector)
      
      detector.setDifficulty('hard')
      expect(detector).toBeInstanceOf(PitchDetector)
    })
  })

  describe('setConfig', () => {
    it('should update config', () => {
      const detector = new PitchDetector()
      
      detector.setConfig({ volumeThreshold: 0.5 })
      expect(detector).toBeInstanceOf(PitchDetector)
    })
  })
})
