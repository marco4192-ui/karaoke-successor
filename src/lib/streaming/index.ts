/**
 * Streaming Module
 * Provides streaming overlay, chat integration, and OBS browser source support
 */

// Services
export { StreamingOverlayService, getStreamingOverlayService } from './streaming-overlay-service';
export { getTwitchService, resetTwitchService } from './twitch-service';
export { getYouTubeService, resetYouTubeService } from './youtube-service';
export { getStreamingService, resetStreamingService } from './streaming-service';

// Types
export type {
  OverlayConfig,
  OverlaySettings,
  OverlayState,
  OverlaySong,
  OverlayPlayer,
  OverlayRating,
  ChatConfig,
  ChatMessage,
  ChatCommand,
  ChatCommandType,
  ChatUserRole,
  ChatBadge,
  SongRequest,
  SongRequestStatus,
  VotingPoll,
  VotingOption,
  Vote,
  StreamStatus,
  ChatActivity,
} from './types';

export type {
  OverlayTheme,
  OverlayPosition,
  OverlaySize,
  ChatPlatform,
} from './types';

// Twitch Types
export type {
  TwitchConfig,
  TwitchUser,
  TwitchToken,
  TwitchStreamInfo,
  TwitchChatMessage,
  TwitchEvent,
  KaraokeChatCommand,
} from './twitch-service';

// YouTube Types
export type {
  YouTubeConfig,
  YouTubeUser,
  YouTubeToken,
  YouTubeLiveStream,
  YouTubeChatMessage,
  YouTubeLiveChatConfig,
} from './youtube-service';

// Streaming Types
export type {
  StreamingPlatform,
  StreamingConfig,
  StreamStats,
  StreamEvent,
  KaraokeSongRequest,
} from './streaming-service';

// Constants
export {
  OVERLAY_PRESETS,
  DEFAULT_OVERLAY_SETTINGS,
  DEFAULT_CHAT_CONFIG,
} from './types';
