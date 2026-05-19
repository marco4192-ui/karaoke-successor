'use client';

import type { GameState, LyricLine, Note } from '@/types/game';
import { usePitchDetector } from '@/hooks/use-pitch-detector';
import { useNoteScoring } from '@/hooks/use-note-scoring';
import { useGameMedia } from '@/hooks/use-game-media';
import { useParticleEmitter } from '@/components/game/visual-effects';
import { useGameAudioEffects } from '@/hooks/use-game-audio-effects';
import { useNativeAudio } from '@/hooks/use-native-audio';
import type { PracticeModeConfig } from '@/lib/game/practice-mode';
import { CHALLENGE_MODES } from '@/lib/game/player-progression';
import type { WebcamBackgroundConfig } from '@/components/game/webcam-background';
import type { PitchStats } from '@/lib/game/note-utils';
import type { ScoringMetadata } from '@/lib/game/scoring';

// ===================== HOOK INTERFACE =====================

export interface GameScreenProps {
  onEnd: () => void;
  onBack: () => void;
  onPause?: () => void;
}

export interface TimingData {
  allNotes: Array<Note & { lineIndex: number; line: LyricLine }>;
  sortedLines: LyricLine[];
  noteCount: number;
  lineCount: number;
  p1Notes: Array<Note & { lineIndex: number; line: LyricLine }>;
  p2Notes: Array<Note & { lineIndex: number; line: LyricLine }>;
  p1Lines: LyricLine[];
  p2Lines: LyricLine[];
  p1NoteCount: number;
  p2NoteCount: number;
  scoringMetadata: ScoringMetadata | null;
  p1ScoringMetadata: ScoringMetadata | null;
  p2ScoringMetadata: ScoringMetadata | null;
  beatDuration: number;
}

export interface GameScreenHookReturn {
  // Game state
  gameState: GameState;
  song: GameState['currentSong'];
  isPlaying: boolean;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  isDuetMode: boolean;
  isLowPerf: boolean;

  // Media
  effectiveSong: ReturnType<typeof useGameMedia>['effectiveSong'];
  mediaLoaded: ReturnType<typeof useGameMedia>['mediaLoaded'];
  audioRef: React.RefObject<HTMLAudioElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  audioLoadedRef: React.RefObject<boolean>;
  videoLoadedRef: React.RefObject<boolean>;
  spectrogramAudioEl: HTMLAudioElement | null;
  audioElRefCallback: (el: HTMLAudioElement | null) => void;
  displayDuration: number;
  setDisplayDuration: React.Dispatch<React.SetStateAction<number>>;
  nativeAudio: ReturnType<typeof useNativeAudio>;

  // YouTube
  youtubeVideoId: string | null;
  isYouTube: boolean;
  useYouTubeAudio: boolean;
  isAdPlaying: boolean;
  adCountdown: number | null;
  handleAdStart: () => void;
  handleAdEnd: () => void;
  youtubeTime: number;
  setYoutubeTime: React.Dispatch<React.SetStateAction<number>>;
  youtubeError: string | null;
  setYoutubeError: React.Dispatch<React.SetStateAction<string | null>>;

  // Pitch & Scoring
  pitchResult: ReturnType<typeof usePitchDetector>['pitchResult'];
  smoothedPitch: number | null;
  scoreEvents: ReturnType<typeof useNoteScoring>['scoreEvents'];
  notePerformance: ReturnType<typeof useNoteScoring>['notePerformance'];
  p2State: ReturnType<typeof useNoteScoring>['p2State'];
  p2NotePerformance: ReturnType<typeof useNoteScoring>['p2NotePerformance'];
  p2DetectedPitch: number | null;

  // Timing
  timingData: TimingData | null;
  visibleNotes: Array<Note & { lineIndex: number; line: LyricLine }>;
  p1VisibleNotes: Array<Note & { lineIndex: number; line: LyricLine }>;
  p2VisibleNotes: Array<Note & { lineIndex: number; line: LyricLine }>;
  pitchStats: PitchStats;
  p1PitchStats: PitchStats;
  p2PitchStats: PitchStats;

  // Settings
  showBackgroundVideo: boolean;
  showPitchGuide: boolean;
  useAnimatedBackground: boolean;
  noteDisplayStyle: string;
  noteShapeStyle: 'rounded' | 'sharp' | 'pill' | 'diamond';
  hasChallengeNoPitchGuide: boolean;
  activeChallenge: typeof CHALLENGE_MODES[0] | null;
  showScore: boolean;
  showParticles: boolean;
  showCombo: boolean;
  autoFullscreen: boolean;
  masterVolume: number;
  lyricsSize: string;
  youtubeQuality: string;

  // Practice mode
  practiceMode: PracticeModeConfig;
  showPracticeControls: boolean;
  setShowPracticeControls: React.Dispatch<React.SetStateAction<boolean>>;
  setPracticeMode: React.Dispatch<React.SetStateAction<PracticeModeConfig>>;

  // Audio effects
  audioEffects: ReturnType<typeof useGameAudioEffects>['audioEffects'];
  showAudioEffects: boolean;
  toggleAudioEffects: () => void;
  reverbAmount: number;
  setReverbAmount: React.Dispatch<React.SetStateAction<number>>;
  echoAmount: number;
  setEchoAmount: React.Dispatch<React.SetStateAction<number>>;
  applyEffectPreset: (preset: 'pop' | 'rock' | 'concert' | 'studio' | 'vintage' | 'ethereal' | 'power' | 'intimate') => void;

  // Webcam
  webcamConfig: WebcamBackgroundConfig;
  updateWebcamConfig: (updates: Partial<WebcamBackgroundConfig>) => void;

  // Visual effects
  songEnergy: number | undefined;
  particles: ReturnType<typeof useParticleEmitter>['particles'];

  // Game loop
  countdown: number;
  volume: number;
  pauseGame: () => void;
  resumeGame: () => void;
  endGameAndCleanup: () => void;
  abortGameLoop: () => void;
  resetScoring: () => void;
  stop: () => void;

  // Callbacks
  handleEnd: () => void;
}
