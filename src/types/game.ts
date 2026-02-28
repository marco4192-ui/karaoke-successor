// Core game types for Karaoke Successor

export type Difficulty = 'easy' | 'medium' | 'hard';

export type GameMode = 'standard' | 'pass-the-mic' | 'companion-singalong' | 'medley' | 'missing-words' | 'duel' | 'blind';

export interface Note {
  id: string;
  pitch: number; // MIDI note number (0-127)
  frequency: number; // Hz
  startTime: number; // milliseconds from song start
  duration: number; // milliseconds
  lyric: string;
  isBonus: boolean;
  isGolden: boolean; // Star power note
}

export interface LyricLine {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  notes: Note[];
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  album?: string;
  year?: number;
  genre?: string;
  duration: number; // milliseconds
  bpm: number;
  difficulty: Difficulty;
  rating: number; // 1-5 stars
  lyrics: LyricLine[];
  coverImage?: string;
  videoBackground?: string;
  youtubeUrl?: string; // YouTube video URL
  videoGap?: number; // Offset for video sync (ms)
  audioUrl?: string;
  gap: number; // gap before lyrics start (ms)
  start?: number; // #START tag - milliseconds to skip at beginning of audio
  hasEmbeddedAudio?: boolean; // video file has audio, no separate audio needed
  lastPlayed?: number;
  dateAdded?: number;
  storageFolder?: string; // Tauri: folder name in app data for persistent storage
  relativeAudioPath?: string; // Tauri: relative path to audio file
  relativeVideoPath?: string; // Tauri: relative path to video file
  relativeCoverPath?: string; // Tauri: relative path to cover image
  timingOffset?: number; // User-adjusted timing sync offset (ms)
  preview?: {
    startTime: number;
    duration: number;
  };
  // IndexedDB media IDs for browser persistence
  audioMediaId?: string;
  videoMediaId?: string;
  coverMediaId?: string;
}

export interface Player {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  score: number;
  combo: number;
  maxCombo: number;
  notesHit: number;
  notesMissed: number;
  accuracy: number;
  starPower: number;
  isStarPowerActive: boolean;
}

export interface PlayerProfile {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  totalScore: number;
  gamesPlayed: number;
  songsCompleted: number;
  achievements: Achievement[];
  stats: PlayerStats;
  createdAt: number;
}

export interface PlayerStats {
  totalNotesHit: number;
  totalNotesMissed: number;
  bestCombo: number;
  perfectStreaks: number;
  goldenNotesHit: number;
  averageAccuracy: number;
  favoriteSong?: string;
  favoriteMode?: GameMode;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: number;
}

export interface GameState {
  status: 'idle' | 'loading' | 'countdown' | 'playing' | 'paused' | 'ended';
  currentSong: Song | null;
  players: Player[];
  difficulty: Difficulty;
  gameMode: GameMode;
  currentTime: number;
  isMicActive: boolean;
  detectedPitch: number | null;
  isBlindSection: boolean;
  missingWordsIndices: number[];
  currentLineIndex: number;
  results: GameResult | null;
}

export interface GameResult {
  songId: string;
  players: {
    playerId: string;
    score: number;
    notesHit: number;
    notesMissed: number;
    accuracy: number;
    maxCombo: number;
    rating: 'perfect' | 'excellent' | 'good' | 'okay' | 'poor';
  }[];
  playedAt: number;
  duration: number;
}

export interface QueueItem {
  id: string;
  song: Song;
  playerId: string;
  playerName: string;
  addedAt: number;
}

export interface ScoreEvent {
  type: 'perfect' | 'good' | 'okay' | 'miss';
  points: number;
  time: number;
  position: { x: number; y: number };
}

export interface PitchDetectionResult {
  frequency: number | null;
  note: number | null;
  clarity: number; // 0-1 confidence
  volume: number; // 0-1
}

export interface MobileMessage {
  type: 'pitch' | 'join' | 'leave' | 'queue' | 'command' | 'status';
  payload: unknown;
  playerId?: string;
}

export interface PartyGameState {
  mode: GameMode;
  turnIndex: number;
  currentSegment: number;
  medleySongs: Song[];
  medleyIndex: number;
  duelPlayer1: Player | null;
  duelPlayer2: Player | null;
}

export const DIFFICULTY_SETTINGS = {
  easy: {
    pitchTolerance: 2, // +/- 2 semitones tolerance
    timingTolerance: 200, // ms
    noteScoreMultiplier: 1,
    comboMultiplier: 1.5,
    visualNoteWidth: 1.3,
  },
  medium: {
    pitchTolerance: 1, // +/- 1 semitone tolerance
    timingTolerance: 150, // ms
    noteScoreMultiplier: 1.25,
    comboMultiplier: 2,
    visualNoteWidth: 1,
  },
  hard: {
    pitchTolerance: 0.5, // Very precise - must hit exact pitch
    timingTolerance: 100, // ms
    noteScoreMultiplier: 1.5,
    comboMultiplier: 2.5,
    visualNoteWidth: 0.8,
  },
} as const;

export const SCORE_VALUES = {
  perfect: 100,
  good: 75,
  okay: 50,
  miss: 0,
  goldenNoteBonus: 50,
  holdNoteBonus: 10, // per 100ms held
  comboBonus: 25, // per combo level
  starPowerMultiplier: 2,
} as const;

// Musical constants
export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function frequencyToMidi(frequency: number): number {
  return 69 + 12 * Math.log2(frequency / 440);
}

export function midiToNoteName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  const noteIndex = midi % 12;
  return `${NOTE_NAMES[noteIndex]}${octave}`;
}

export const PLAYER_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#FFE66D', // Yellow
  '#95E1D3', // Mint
  '#F38181', // Coral
  '#AA96DA', // Lavender
  '#FF9F43', // Orange
  '#6C5CE7', // Purple
] as const;

// Highscore System
export interface HighscoreEntry {
  id: string;
  playerId: string;
  playerName: string;
  playerAvatar?: string;
  playerColor: string;
  songId: string;
  songTitle: string;
  artist: string;
  score: number;
  accuracy: number;
  maxCombo: number;
  difficulty: Difficulty;
  gameMode: GameMode;
  rating: 'perfect' | 'excellent' | 'good' | 'okay' | 'poor';
  rankTitle: string;
  playedAt: number;
}

// Funny ranking titles based on score percentage
export const RANKING_TITLES = [
  { minScore: 100, title: '🎤 Shower Singing Sensation', emoji: '🚿' },
  { minScore: 95, title: '👑 Karaoke Royalty', emoji: '👑' },
  { minScore: 90, title: '🌟 Vocal Virtuoso', emoji: '🌟' },
  { minScore: 85, title: '🔥 Mic Drop Master', emoji: '🎤' },
  { minScore: 80, title: '💎 Diamond Voice', emoji: '💎' },
  { minScore: 75, title: '🎭 Broadway Wannabe', emoji: '🎭' },
  { minScore: 70, title: '🎵 Note Nailer', emoji: '🎵' },
  { minScore: 65, title: '🦜 Pitchy Parrot', emoji: '🦜' },
  { minScore: 60, title: '🎪 Circus Singer', emoji: '🎪' },
  { minScore: 55, title: '🤷 Humble Hummer', emoji: '🤷' },
  { minScore: 50, title: '🚧 Under Construction', emoji: '🚧' },
  { minScore: 45, title: '😜 Bathroom Baritone', emoji: '😜' },
  { minScore: 40, title: '👻 Phantom Phony', emoji: '👻' },
  { minScore: 35, title: '🦆 Duck Tape Singer', emoji: '🦆' },
  { minScore: 30, title: '🥴 Tuneless Troubadour', emoji: '🥴' },
  { minScore: 25, title: '🌪️ Vocal Tornado (Disaster)', emoji: '🌪️' },
  { minScore: 20, title: '🫣 Tone Deaf Titan', emoji: '🫣' },
  { minScore: 15, title: '🤡 Clown Car Crooner', emoji: '🤡' },
  { minScore: 10, title: '🧟 Tone Zombie', emoji: '🧟' },
  { minScore: 5, title: '💀 Whispering Wimp', emoji: '💀' },
  { minScore: 0, title: '🔇 Silent Scream', emoji: '🔇' },
];

export function getRankTitle(accuracy: number): { title: string; emoji: string } {
  for (const rank of RANKING_TITLES) {
    if (accuracy >= rank.minScore) {
      return { title: rank.title, emoji: rank.emoji };
    }
  }
  return { title: '🔇 Silent Scream', emoji: '🔇' };
}

// Global highscore leaderboard (stored per song and globally)
export interface Leaderboard {
  global: HighscoreEntry[];  // Top scores across all songs
  bySong: Record<string, HighscoreEntry[]>;  // Top scores per song
  byPlayer: Record<string, HighscoreEntry[]>;  // Personal bests per player
}
