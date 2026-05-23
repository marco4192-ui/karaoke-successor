// ===================== TYPES =====================
export interface MobileClient {
  id: string;
  connectionCode: string; // 4-character unique code
  type: 'microphone' | 'remote' | 'viewer';
  name: string;
  connected: number;
  lastActivity: number;
  pitchData: PitchData | null;
  profile: MobileProfile | null;
  queueCount: number; // Songs currently in queue
  hasRemoteControl: boolean; // Whether this client has remote control
  clientIp?: string; // Client IP address for IP-based reconnection
}

export interface PitchData {
  frequency: number | null;
  note: number | null;
  clarity: number;
  volume: number;
  timestamp: number;
  isSinging?: boolean;
  singingConfidence?: number;
}

export interface MobileProfile {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  createdAt: number;
}

export interface QueueItem {
  id: string;
  songId: string;
  songTitle: string;
  songArtist: string;
  addedBy: string;
  addedAt: number;
  companionCode: string;
  status: 'pending' | 'playing' | 'completed';
  // Optional partner for duet/duel mode
  partnerId?: string;
  partnerName?: string;
  // Game mode for this queue item
  gameMode?: 'single' | 'duel' | 'duet';
  // Difficulty setting from companion
  difficulty?: 'easy' | 'normal' | 'hard';
  // Mic source preferences (companion = sing via phone, microphone = sing via main app mic)
  playerMicSource?: 'companion' | 'microphone';
  partnerMicSource?: 'companion' | 'microphone';
  // Duet parts swapped flag
  duetPartsSwapped?: boolean;
}

export interface RemoteCommand {
  type: 'play' | 'pause' | 'stop' | 'next' | 'previous' | 'volume' | 'seek' | 'skip' | 'restart' | 'quit' | 'home' | 'library' | 'settings' | 'up' | 'down' | 'left' | 'right' | 'enter';
  data?: unknown;
  timestamp: number;
  fromClientId: string;
  fromClientName: string;
}

export interface RemoteControlState {
  lockedBy: string | null; // clientId that has control
  lockedByName: string | null; // name of the client
  lockedAt: number | null;
  pendingCommands: RemoteCommand[]; // Commands waiting to be executed by main app
}

// Additional type aliases used in state declarations
export interface CompanionScoreEntry {
  profileId: string;
  name: string;
  avatar?: string;
  color: string;
  score: number;
}

export interface MobileGameState {
  currentSong: { id: string; title: string; artist: string } | null;
  isPlaying: boolean;
  currentTime: number;
  songEnded: boolean;
  isAdPlaying: boolean;
  gameMode: string | null; // Current game mode (for pitch handling decision)
  // Companion Sing-A-Long turn info: which profileId is currently singing
  singalongTurn: {
    profileId: string | null;
    countdown: number | null; // 3 when switching, null when actively singing
    isActive: boolean;
  } | null;
  // Companion Pass-the-Mic turn info
  cptmTurn: {
    profileId: string | null; // currently active singer
    nextProfileId: string | null; // player whose phone will blink
    countdown: number | null; // 3 when warning, null when actively singing
    isActive: boolean;
  } | null;
  // #10 Tournament match ID — spectators use this to vote on the current match
  tournamentMatchId: string | null;
  // Live leaderboard: companion player scores during singalong
  companionScores: CompanionScoreEntry[] | null;
  // Current screen name from the desktop app
  currentScreen?: string;
}

export interface GameResults {
  songId: string;
  songTitle: string;
  songArtist: string;
  score: number;
  accuracy: number;
  maxCombo: number;
  rating: string;
  playedAt: number;
}

export interface SongSummary {
  id: string;
  title: string;
  artist: string;
  duration: number;
  genre?: string;
  language?: string;
  coverImage?: string;
}

export interface HostProfile {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  createdAt: number;
}
