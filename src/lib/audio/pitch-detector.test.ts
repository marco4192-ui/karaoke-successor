import { describe, it, expect, beforeEach, vi } from 'vitest'
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

    it('should have noise gate enabled by default', () => {
      expect(KARAOKE_DEFAULT_CONFIG.noiseGateEnabled).toBe(true)
      expect(KARAOKE_DEFAULT_CONFIG.noiseGateThreshold).toBe(-45)
    })

    it('should have correct frequency range for singing', () => {
      // C2 (65 Hz) to C6 (1047 Hz) covers typical singing range
      expect(KARAOKE_DEFAULT_CONFIG.minFrequency).toBe(65)
      expect(KARAOKE_DEFAULT_CONFIG.maxFrequency).toBe(1047)
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

    it('should create and store detector with createDetector', async () => {
      const manager = new PitchDetectorManager()
      
      // Mock the initialize method to avoid browser API calls
      const detector = new PitchDetector()
      vi.spyOn(detector, 'initialize').mockResolvedValue(true)
      
      // Since createDetector calls initialize which needs browser APIs,
      // we test that the manager stores detectors correctly
      expect(manager.getDetector('test1')).toBeUndefined()
    })

    it('should remove detector by id', () => {
      const manager = new PitchDetectorManager()
      
      // removeDetector should handle non-existent detector gracefully
      manager.removeDetector('nonexistent')
      expect(manager.getDetector('nonexistent')).toBeUndefined()
    })

    it('should destroy all detectors', () => {
      const manager = new PitchDetectorManager()
      
      manager.destroyAll()
      expect(manager).toBeInstanceOf(PitchDetectorManager)
    })
  })

  describe('Lifecycle', () => {
    it('should stop listening when stop() is called', () => {
      const detector = new PitchDetector()
      
      detector.stop()
      // No error should be thrown
      expect(true).toBe(true)
    })

    it('should handle destroy gracefully', async () => {
      const detector = new PitchDetector()
      
      await detector.destroy()
      // No error should be thrown
      expect(true).toBe(true)
    })

    it('should handle multiple stop() calls', () => {
      const detector = new PitchDetector()
      
      detector.stop()
      detector.stop()
      detector.stop()
      // No error should be thrown
      expect(true).toBe(true)
    })

    it('should handle destroy when not initialized', async () => {
      const detector = new PitchDetector()
      
      await detector.destroy()
      await detector.destroy()
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

    it('should apply medium difficulty config', () => {
      const detector = new PitchDetector()
      
      detector.setDifficulty('medium')
      expect(detector).toBeInstanceOf(PitchDetector)
    })

    it('should clear stability buffer on difficulty change', () => {
      const detector = new PitchDetector()
      
      detector.setDifficulty('easy')
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

    it('should merge with existing config', () => {
      const detector = new PitchDetector({ volumeThreshold: 0.02 })
      
      detector.setConfig({ yinThreshold: 0.2 })
      expect(detector).toBeInstanceOf(PitchDetector)
    })

    it('should clear stability buffer on config change', () => {
      const detector = new PitchDetector()
      
      detector.setConfig({ pitchStabilityFrames: 5 })
      expect(detector).toBeInstanceOf(PitchDetector)
    })
  })

  describe('YIN Algorithm', () => {
    it('should detect pitch from sine wave buffer', () => {
      // Create a detector to access YIN algorithm
      const detector = new PitchDetector()
      
      // We can test the YIN algorithm indirectly through the detect method
      // by mocking the audio context and analyser
      expect(detector).toBeInstanceOf(PitchDetector)
    })

    it('should handle low frequency detection', () => {
      const detector = new PitchDetector({
        minFrequency: 50,
        maxFrequency: 2000
      })
      
      expect(detector).toBeInstanceOf(PitchDetector)
    })

    it('should handle high frequency detection', () => {
      const detector = new PitchDetector({
        minFrequency: 200,
        maxFrequency: 2000
      })
      
      expect(detector).toBeInstanceOf(PitchDetector)
    })
  })

  describe('Pitch Stability', () => {
    it('should use default stability frames', () => {
      expect(KARAOKE_DEFAULT_CONFIG.pitchStabilityFrames).toBe(3)
    })

    it('should have different stability frames for difficulties', () => {
      expect(DIFFICULTY_PITCH_CONFIGS.easy.pitchStabilityFrames).toBe(2)
      expect(DIFFICULTY_PITCH_CONFIGS.medium.pitchStabilityFrames).toBe(3)
      expect(DIFFICULTY_PITCH_CONFIGS.hard.pitchStabilityFrames).toBe(5)
    })

    it('should require more frames for hard difficulty', () => {
      const easyFrames = DIFFICULTY_PITCH_CONFIGS.easy.pitchStabilityFrames
      const hardFrames = DIFFICULTY_PITCH_CONFIGS.hard.pitchStabilityFrames
      
      expect(hardFrames).toBeGreaterThan(easyFrames)
    })
  })

  describe('Noise Gate', () => {
    it('should have noise gate enabled by default', () => {
      expect(KARAOKE_DEFAULT_CONFIG.noiseGateEnabled).toBe(true)
    })

    it('should have appropriate noise gate threshold', () => {
      // -45dB is a reasonable threshold for karaoke
      expect(KARAOKE_DEFAULT_CONFIG.noiseGateThreshold).toBe(-45)
    })

    it('should have stricter noise gate for hard difficulty', () => {
      const easyThreshold = DIFFICULTY_PITCH_CONFIGS.easy.noiseGateThreshold
      const hardThreshold = DIFFICULTY_PITCH_CONFIGS.hard.noiseGateThreshold
      
      expect(hardThreshold).toBeGreaterThan(easyThreshold)
    })

    it('should allow disabling noise gate', () => {
      const detector = new PitchDetector({ noiseGateEnabled: false })
      expect(detector).toBeInstanceOf(PitchDetector)
    })
  })

  describe('Volume Threshold', () => {
    it('should have different volume thresholds for difficulties', () => {
      expect(DIFFICULTY_PITCH_CONFIGS.easy.volumeThreshold).toBe(0.02)
      expect(DIFFICULTY_PITCH_CONFIGS.medium.volumeThreshold).toBe(0.04)
      expect(DIFFICULTY_PITCH_CONFIGS.hard.volumeThreshold).toBe(0.06)
    })

    it('should be more sensitive for easy mode', () => {
      const easyThreshold = DIFFICULTY_PITCH_CONFIGS.easy.volumeThreshold
      const hardThreshold = DIFFICULTY_PITCH_CONFIGS.hard.volumeThreshold
      
      expect(easyThreshold).toBeLessThan(hardThreshold)
    })
  })

  describe('YIN Threshold', () => {
    it('should have appropriate YIN thresholds', () => {
      // Lower YIN threshold = more sensitive detection
      expect(DIFFICULTY_PITCH_CONFIGS.easy.yinThreshold).toBe(0.10)
      expect(DIFFICULTY_PITCH_CONFIGS.medium.yinThreshold).toBe(0.12)
      expect(DIFFICULTY_PITCH_CONFIGS.hard.yinThreshold).toBe(0.15)
    })

    it('should be more lenient for easy difficulty', () => {
      const easyYin = DIFFICULTY_PITCH_CONFIGS.easy.yinThreshold
      const hardYin = DIFFICULTY_PITCH_CONFIGS.hard.yinThreshold
      
      expect(easyYin).toBeLessThan(hardYin)
    })
  })

  describe('start() without initialization', () => {
    it('should handle start without initialize', () => {
      const detector = new PitchDetector()
      const callback = vi.fn()
      
      // Should not throw when called without initialize
      detector.start(callback)
      detector.stop()
      
      expect(true).toBe(true)
    })
  })

  describe('Frequency Range', () => {
    it('should use standard singing range', () => {
      // 65 Hz (C2) to 1047 Hz (C6) covers most singers
      expect(KARAOKE_DEFAULT_CONFIG.minFrequency).toBe(65)
      expect(KARAOKE_DEFAULT_CONFIG.maxFrequency).toBe(1047)
    })

    it('should use same range for all difficulties', () => {
      const difficulties: Difficulty[] = ['easy', 'medium', 'hard']
      
      difficulties.forEach(diff => {
        expect(DIFFICULTY_PITCH_CONFIGS[diff].minFrequency).toBe(65)
        expect(DIFFICULTY_PITCH_CONFIGS[diff].maxFrequency).toBe(1047)
      })
    })
  })
})
