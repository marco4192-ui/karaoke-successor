/**
 * Streaming Types
 * Types for streaming overlay, chat integration, and OBS browser source
 */

// ==================== Overlay Types ====================

export interface OverlayConfig {
  /** Unique overlay key for authentication */
  overlayKey: string;
  /** Whether overlay is active */
  isActive: boolean;
  /** Display settings */
  settings: OverlaySettings;
  /** Current overlay state */
  state: OverlayState;
}

export interface OverlaySettings {
  /** Show score on overlay */
  showScore: boolean;
  /** Show accuracy percentage */
  showAccuracy: boolean;
  /** Show combo counter */
  showCombo: boolean;
  /** Show song info (title, artist) */
  showSongInfo: boolean;
  /** Show player info */
  showPlayer: boolean;
  /** Show rating indicator */
  showRating: boolean;
  /** Visual theme */
  theme: OverlayTheme;
  /** Position on screen */
  position: OverlayPosition;
  /** Size preset */
  size: OverlaySize;
  /** Custom font family */
  fontFamily: string;
  /** Background color (CSS) */
  backgroundColor: string;
  /** Text color (CSS) */
  textColor: string;
  /** Accent color (CSS) */
  accentColor: string;
  /** Border radius in pixels */
  borderRadius: number;
  /** Background blur in pixels */
  backdropBlur: number;
  /** Animation speed (ms) */
  animationSpeed: number;
  /** Show live indicator */
  showLiveIndicator: boolean;
  /** Custom CSS */
  customCSS?: string;
}

export type OverlayTheme = 'dark' | 'light' | 'neon' | 'minimal' | 'glass' | 'custom';
export type OverlayPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
export type OverlaySize = 'small' | 'medium' | 'large' | 'custom';

export interface OverlayState {
  /** Current song being played */
  currentSong: OverlaySong | null;
  /** Current player info */
  currentPlayer: OverlayPlayer | null;
  /** Current score */
  score: number;
  /** Accuracy percentage (0-100) */
  accuracy: number;
  /** Current combo */
  combo: number;
  /** Maximum combo achieved */
  maxCombo: number;
  /** Current rating */
  rating: OverlayRating | null;
  /** Whether game is actively playing */
  isPlaying: boolean;
  /** Current time in song (seconds) */
  currentTime: number;
  /** Song duration (seconds) */
  duration: number;
  /** Last update timestamp */
  lastUpdate: number;
}

export interface OverlaySong {
  id: string;
  title: string;
  artist: string;
  album?: string;
  coverImage?: string;
  duration: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface OverlayPlayer {
  id: string;
  name: string;
  avatar?: string;
  color: string;
}

export type OverlayRating = 'perfect' | 'excellent' | 'good' | 'okay' | 'poor';

// ==================== Chat Integration Types ====================

export interface ChatConfig {
  /** Platform for chat integration */
  platform: ChatPlatform;
  /** Channel name (for Twitch/YouTube) */
  channelName: string;
  /** OAuth token (for Twitch) */
  oauthToken?: string;
  /** Bot username (for responding to commands) */
  botUsername?: string;
  /** Command prefix */
  commandPrefix: string;
  /** Enable song requests */
  enableSongRequests: boolean;
  /** Enable voting */
  enableVoting: boolean;
  /** Allowed user roles */
  allowedRoles: ChatUserRole[];
  /** Cooldown between commands (seconds) */
  commandCooldown: number;
  /** Max songs in queue per user */
  maxSongsPerUser: number;
  /** Max queue size */
  maxQueueSize: number;
}

export type ChatPlatform = 'twitch' | 'youtube' | 'discord' | 'custom';
export type ChatUserRole = 'broadcaster' | 'moderator' | 'vip' | 'subscriber' | 'everyone';

export interface ChatMessage {
  id: string;
  platform: ChatPlatform;
  username: string;
  displayName: string;
  message: string;
  timestamp: number;
  badges: ChatBadge[];
  role: ChatUserRole;
  isCommand: boolean;
  command?: ChatCommand;
}

export interface ChatBadge {
  type: 'broadcaster' | 'moderator' | 'vip' | 'subscriber' | 'bits' | 'partner';
  url?: string;
}

export interface ChatCommand {
  type: ChatCommandType;
  args: string[];
  sender: {
    id: string;
    username: string;
    displayName: string;
    role: ChatUserRole;
  };
}

export type ChatCommandType =
  | 'sr'           // Song request
  | 'srm'          // Song request me (show my position)
  | 'wrongsong'    // Remove last request
  | 'skip'         // Skip current song (mod only)
  | 'queue'        // Show queue
  | 'vote'         // Vote for option
  | 'difficulty'   // Set difficulty vote
  | 'help'         // Show help
  | 'link'         // Show song link
  | 'stats'        // Show player stats
  | 'custom';      // Custom command

// ==================== Song Request Types ====================

export interface SongRequest {
  id: string;
  songId: string;
  songTitle: string;
  songArtist: string;
  requestedBy: {
    id: string;
    username: string;
    displayName: string;
    role: ChatUserRole;
  };
  requestedAt: number;
  status: SongRequestStatus;
  position?: number;
}

export type SongRequestStatus = 'pending' | 'queued' | 'playing' | 'played' | 'skipped' | 'error';

// ==================== Voting Types ====================

export interface VotingPoll {
  id: string;
  title: string;
  options: VotingOption[];
  isActive: boolean;
  startedAt: number;
  endsAt?: number;
  totalVotes: number;
  allowedRoles: ChatUserRole[];
}

export interface VotingOption {
  id: string;
  label: string;
  votes: number;
  percentage: number;
}

export interface Vote {
  pollId: string;
  optionId: string;
  userId: string;
  username: string;
  timestamp: number;
}

// ==================== Stream Status Types ====================

export interface StreamStatus {
  /** Whether stream is live */
  isLive: boolean;
  /** Platform being streamed to */
  platform: ChatPlatform;
  /** Stream duration in seconds */
  duration: number;
  /** Viewer count */
  viewerCount: number;
  /** Chat activity */
  chatActivity: ChatActivity;
  /** Song requests enabled */
  songRequestsEnabled: boolean;
  /** Queue size */
  queueSize: number;
  /** Last chat message time */
  lastChatMessage: number;
}

export interface ChatActivity {
  messagesPerMinute: number;
  activeUsers: number;
  commandsUsed: number;
  songsRequested: number;
}

// ==================== Presets ====================

export const OVERLAY_PRESETS: Record<string, Partial<OverlaySettings>> = {
  dark: {
    theme: 'dark',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    textColor: '#ffffff',
    accentColor: '#8B5CF6',
    backdropBlur: 10,
  },
  light: {
    theme: 'light',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    textColor: '#1a1a1a',
    accentColor: '#6366F1',
    backdropBlur: 5,
  },
  neon: {
    theme: 'neon',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    textColor: '#00ff88',
    accentColor: '#ff00ff',
    backdropBlur: 15,
  },
  minimal: {
    theme: 'minimal',
    backgroundColor: 'transparent',
    textColor: '#ffffff',
    accentColor: '#ffffff',
    backdropBlur: 0,
    showLiveIndicator: false,
  },
  glass: {
    theme: 'glass',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    textColor: '#ffffff',
    accentColor: '#60A5FA',
    backdropBlur: 20,
  },
};

export const DEFAULT_OVERLAY_SETTINGS: OverlaySettings = {
  showScore: true,
  showAccuracy: true,
  showCombo: true,
  showSongInfo: true,
  showPlayer: true,
  showRating: true,
  theme: 'dark',
  position: 'top-left',
  size: 'medium',
  fontFamily: 'Inter, system-ui, sans-serif',
  backgroundColor: 'rgba(0, 0, 0, 0.8)',
  textColor: '#ffffff',
  accentColor: '#8B5CF6',
  borderRadius: 12,
  backdropBlur: 10,
  animationSpeed: 300,
  showLiveIndicator: true,
};

export const DEFAULT_CHAT_CONFIG: ChatConfig = {
  platform: 'twitch',
  channelName: '',
  commandPrefix: '!',
  enableSongRequests: true,
  enableVoting: true,
  allowedRoles: ['broadcaster', 'moderator', 'vip', 'subscriber', 'everyone'],
  commandCooldown: 5,
  maxSongsPerUser: 3,
  maxQueueSize: 20,
};
