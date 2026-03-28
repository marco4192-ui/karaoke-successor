/**
 * Streaming Module
 * Provides streaming overlay, chat integration, and OBS browser source support
 */

// Services
export { StreamingOverlayService, getStreamingOverlayService } from './streaming-overlay-service';

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

// Constants
export {
  OVERLAY_PRESETS,
  DEFAULT_OVERLAY_SETTINGS,
  DEFAULT_CHAT_CONFIG,
} from './types';
