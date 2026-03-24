// Core game types for Karaoke Successor

export type Difficulty = 'easy' | 'medium' | 'hard';

export type GameMode = 'standard' | 'pass-the-mic' | 'companion-singalong' | 'medley' | 'missing-words' | 'duel' | 'blind' | 'tournament' | 'battle-royale' | 'duet' | 'online';

// Duet Mode - Player assignment for lyrics
export type DuetPlayer = 'P1' | 'P2' | 'both';

export interface Note {
  id: string;
  pitch: number; // MIDI note number (0-127)
  frequency: number; // Hz
  startTime: number; // milliseconds from song start
  duration: number; // milliseconds
  lyric: string;
  isBonus: boolean;
  isGolden: boolean; // Star power note
  player?: DuetPlayer; // For duet mode - which player sings this note
}

export interface LyricLine {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  notes: Note[];
  player?: DuetPlayer; // For duet mode - which player sings this line (defaults based on notes)
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  album?: string;
  year?: number;
  genre?: string;
  language?: string; // Language code (en, de, es, fr, etc.)
  duration: number; // milliseconds
  bpm: number;
  difficulty: Difficulty;
  rating: number; // 1-5 stars
  lyrics: LyricLine[];
  coverImage?: string;
  backgroundImage?: string; // #BACKGROUND: from UltraStar txt
  videoBackground?: string;
  youtubeUrl?: string; // YouTube video URL
  youtubeId?: string; // YouTube video ID (extracted from URL)
  videoUrl?: string; // Direct video URL (for local video files)
  videoGap?: number; // Offset for video sync (ms)
  audioUrl?: string;
  gap: number; // gap before lyrics start (ms)
  start?: number; // #START tag - milliseconds to skip at beginning of audio
  end?: number; // #END tag - song end time in ms
  hasEmbeddedAudio?: boolean; // video file has audio, no separate audio needed
  lastPlayed?: number;
  dateAdded?: number;
  storageFolder?: string; // Tauri: folder name in app data for persistent storage
  folderPath?: string; // Relative folder path from base songs folder (e.g., "Lieblingslieder/Pop")
  baseFolder?: string; // Tauri: absolute path to base songs folder (e.g., "/home/user/karaoke-songs")
  relativeAudioPath?: string; // Tauri: relative path to audio file
  relativeVideoPath?: string; // Tauri: relative path to video file
  relativeCoverPath?: string; // Tauri: relative path to cover image
  relativeBackgroundPath?: string; // Tauri: relative path to background image
  relativeTxtPath?: string; // Tauri: relative path to UltraStar txt file (for saving edits)
  timingOffset?: number; // User-adjusted timing sync offset (ms)
  storedMedia?: boolean; // Browser: media files stored in IndexedDB for persistence
  storedTxt?: boolean; // Browser: TXT file stored in IndexedDB (lyrics loaded on-demand)
  preview?: {
    startTime: number;
    duration: number;
  };
  // Duet mode support
  isDuet?: boolean; // True if this is a duet song
  duetPlayerNames?: [string, string]; // Optional names for P1/P2 (e.g., ["Artist", "Featuring"])
  duetPlayerColors?: [string, string]; // Optional colors for P1/P2
  // UltraStar TXT Metadata (editable in editor)
  version?: string; // #VERSION: - format version
  creator?: string; // #CREATOR: - who created the txt file
  mp3File?: string; // #MP3: - audio file name
  coverFile?: string; // #COVER: - cover image file name
  backgroundFile?: string; // #BACKGROUND: - background image file name
  videoFile?: string; // #VIDEO: - video file name (non-URL)
  previewStart?: number; // #PREVIEWSTART: - preview start time in seconds
  previewDuration?: number; // #PREVIEWDURATION: - preview duration in seconds
  medleyStartBeat?: number; // #MEDLEYSTARTBEAT: - medley start beat
  medleyEndBeat?: number; // #MEDLEYENDBEAT: - medley end beat
  tags?: string; // #TAGS: - comma-separated tags
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
  notes?: Note[]; // Optional notes array for detailed display
  totalNotes?: number; // Total notes count for display
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
  // XP and Level system (character-based)
  xp: number; // Total XP earned
  level: number; // Current level (calculated from XP)
  // Rank display options
  showRankInName?: boolean; // Show rank icon in player name
  rankDisplayStyle?: 'prefix' | 'suffix' | 'nickname' | 'none'; // How to display the rank
  // Online leaderboard settings
  country?: string; // ISO 3166-1 alpha-2 code
  privacy?: {
    showOnLeaderboard: boolean;
    showPhoto: boolean;
    showCountry: boolean;
  };
  // Profile sync
  syncCode?: string; // 8-character code for cross-device sync
  // Active status for party mode
  isActive?: boolean; // When false, profile won't appear in party mode selections
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
  // Extended Statistics
  totalGamesPlayed: number;
  totalSongsCompleted: number;
  totalTimeSung: number; // in seconds
  bestScore: number;
  worstScore: number;
  perfectGames: number; // 100% accuracy games
  // Per-difficulty stats
  difficultyStats: {
    easy: { games: number; avgAccuracy: number; bestScore: number };
    medium: { games: number; avgAccuracy: number; bestScore: number };
    hard: { games: number; avgAccuracy: number; bestScore: number };
  };
  // Vocal range
  lowestNote: number | null; // MIDI note
  highestNote: number | null; // MIDI note
  // Recent performance (last 10 games)
  recentScores: Array<{ score: number; accuracy: number; songId: string; date: number }>;
  // Genre stats
  genreStats: Record<string, { games: number; avgAccuracy: number }>;
  // Streak info
  currentStreak: number;
  bestStreak: number;
  lastPlayedDate: number | null;
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
    pitchTolerance: 3, // +/- 3 semitones - very lenient for beginners
    timingTolerance: 400, // ms - very lenient timing
    noteScoreMultiplier: 0.8, // Lower points for easier difficulty
    comboMultiplier: 1.5,
    visualNoteWidth: 1.3,
    // Karaoke-optimized settings - very sensitive for beginners
    volumeThreshold: 0.02, // Very low volume threshold - picks up quiet singing
    pitchStabilityFrames: 2, // Quick response for pitch detection
  },
  medium: {
    pitchTolerance: 2, // +/- 2 semitones - standard karaoke tolerance
    timingTolerance: 300, // ms - lenient timing
    noteScoreMultiplier: 1.0, // Standard points
    comboMultiplier: 2,
    visualNoteWidth: 1,
    // Standard settings
    volumeThreshold: 0.04, // Reasonable volume threshold
    pitchStabilityFrames: 3, // Quick but stable response
  },
  hard: {
    pitchTolerance: 1, // +/- 1 semitone - stricter but still playable
    timingTolerance: 150, // ms - stricter timing
    noteScoreMultiplier: 1.3, // Higher points for harder difficulty
    comboMultiplier: 2.5,
    visualNoteWidth: 0.8,
    // Strict settings
    volumeThreshold: 0.06, // Moderate volume threshold
    pitchStabilityFrames: 5, // More stable pitch required
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

// ===================== PLAYLIST SYSTEM =====================

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  coverImage?: string;
  songIds: string[];  // Ordered list of song IDs
  createdAt: number;
  updatedAt: number;
  isSystem?: boolean;  // For built-in playlists like "Favorites", "Recently Played"
  tags?: string[];  // User-defined tags for organization
  totalDuration?: number;  // Total duration in ms (calculated)
  playCount?: number;  // How many times this playlist has been played
}

export interface PlaylistFolder {
  id: string;
  name: string;
  playlistIds: string[];
  createdAt: number;
}

// Playlist import/export format
export interface PlaylistExport {
  version: 1;
  exportedAt: number;
  playlist: {
    name: string;
    description?: string;
    songIds: string[];  // These can be song IDs or YouTube URLs
    tags?: string[];
  };
}

// Built-in system playlists
export const SYSTEM_PLAYLISTS = {
  FAVORITES: 'system-favorites',
  RECENTLY_PLAYED: 'system-recently-played',
  MOST_PLAYED: 'system-most-played',
} as const;

// Playlist sort options
export type PlaylistSortOption = 
  | 'name-asc' 
  | 'name-desc' 
  | 'created-desc' 
  | 'created-asc' 
  | 'updated-desc' 
  | 'songs-count-desc';

// Default playlist settings
export const DEFAULT_PLAYLIST_SETTINGS = {
  maxSongsPerPlaylist: 500,
  maxPlaylists: 100,
  maxFolders: 20,
} as const;
