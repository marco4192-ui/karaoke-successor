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
  // Player who is singing (profile ID from companion — maps to a Desktop profile)
  playerId?: string;
  playerName?: string;
  // Optional partner for duet/duel mode
  partnerId?: string;
  partnerName?: string;
  // Game mode for this queue item
  gameMode?: 'single' | 'duel' | 'duet';
  // Difficulty setting from companion
  difficulty?: 'easy' | 'medium' | 'hard';
  // Mic source preferences (companion = sing via phone, microphone = sing via main app mic)
  playerMicSource?: 'companion' | 'microphone';
  partnerMicSource?: 'companion' | 'microphone';
  // R39/P4+P5: chosen desktop mic (MULTI_MIC_CONFIG id + display name)
  playerMicId?: string;
  partnerMicId?: string;
  playerMicName?: string;
  partnerMicName?: string;
  // Duet parts swapped flag
  duetPartsSwapped?: boolean;
  // R39/P7: Entry originates from the DESKTOP's local (zustand) queue —
  // synced via syncdesktopqueue. Desktop consumers filter these out.
  isDesktop?: boolean;
}

export interface RemoteCommand {
  type: 'play' | 'pause' | 'stop' | 'next' | 'previous' | 'volume' | 'seek' | 'skip' | 'restart' | 'quit' | 'home' | 'library' | 'settings' | 'up' | 'down' | 'left' | 'right' | 'enter' | 'add_to_playlist' | 'create_and_add_to_playlist';
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
    // ── CPTM companion mirror context (optional — sent by the desktop) ──
    currentPlayerName?: string;
    currentPlayerColor?: string;
    nextPlayerName?: string;
    players?: Array<{
      profileId: string;
      name: string;
      color: string;
      score: number;
      segmentsSung: number;
    }>;
  } | null;
  // #10 Tournament match ID — spectators use this to vote on the current match
  tournamentMatchId: string | null;
  // Live leaderboard: companion player scores during singalong
  companionScores: CompanionScoreEntry[] | null;
  // Current screen name from the desktop app
  currentScreen?: string;
  // Party setup: which game mode is being configured
  partyGameMode?: string | null;
  // Whether party mode is active on the desktop
  isPartyModeActive?: boolean;
  // R39/P4: Configured desktop microphones (MULTI_MIC_CONFIG) — pushed with
  // the 2s gamestate so the companion library can offer mic vs. companion
  // device selection in the song options overlay.
  availableMics?: Array<{ id: string; name: string }>;
  // Recent party sessions synced from the desktop party screen (mobile mirror)
  recentParties?: Array<{
    id: string;
    mode: string;
    finishedAt: number;
    rounds?: number;
    songTitle?: string;
    winner?: { name: string; color?: string; score: number; scoreKind?: 'points' | 'rating' } | null;
    players: Array<{ name: string; color?: string; score: number; isWinner?: boolean; scoreKind?: 'points' | 'rating' }>;
  }>;
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
  /** Release year (#YEAR: tag) — used for the era/decade filter */
  year?: number;
  coverImage?: string;
  isDuet?: boolean;
}

export interface HostProfile {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  createdAt: number;
  isActive?: boolean;
  /** R33/P9: unlocked achievement ids for the companion Achievements mirror */
  achievements?: string[];
  /** R33/P9: XP + level for the companion Achievements/Daily mirrors */
  xp?: number;
  level?: number;
  /** R33/P9: stats for the companion profile cards */
  songsPlayed?: number;
  gamesPlayed?: number;
}
