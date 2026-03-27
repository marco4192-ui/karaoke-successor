'use client';

// Re-export all visual effects components from modular files
export {
  // Particle System
  ParticleSystem,
  useParticleEmitter,
  type Particle,
  
  // Animated Background
  AnimatedBackground,
  
  // Voice Visualization
  VoiceVisualizer,
  LiveWaveform,
  
  // Combo Effects
  ComboFireEffect,
  StarPowerEffect,
  
  // Hooks
  useSongEnergy,
} from '@/components/visual-effects';
