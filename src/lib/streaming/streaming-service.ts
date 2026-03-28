// Multi-Platform Streaming Service
// Supports Twitch, YouTube, TikTok, Facebook, and custom RTMP

import { getTwitchService, TwitchChatMessage, TwitchEvent } from './twitch-service';

export type StreamingPlatform = 'twitch' | 'youtube' | 'tiktok' | 'facebook' | 'custom';

export interface StreamingConfig {
  platform: StreamingPlatform;
  streamKey: string;
  serverUrl?: string;
  title?: string;
}

export interface StreamStats {
  isLive: boolean;
  duration: number;
  viewerCount: number;
  chatMessages: number;
  startTime: Date | null;
}

export interface ChatMessage {
  id: string;
  platform: StreamingPlatform;
  user: string;
  message: string;
  timestamp: Date;
  color?: string;
  badges?: string[];
  isHighlighted?: boolean;
}

export interface StreamEvent {
  type: 'follow' | 'subscription' | 'donation' | 'raid' | 'host' | 'cheer';
  platform: StreamingPlatform;
  user: string;
  amount?: number;
  message?: string;
  timestamp: Date;
}

// Platform configurations
const PLATFORM_CONFIGS = {
  twitch: {
    name: 'Twitch',
    icon: '📺',
    color: '#9146FF',
    rtmpUrl: 'rtmps://live.twitch.tv/app',
    features: ['chat', 'events', 'alerts'],
  },
  youtube: {
    name: 'YouTube Live',
    icon: '▶️',
    color: '#FF0000',
    rtmpUrl: 'rtmp://a.rtmp.youtube.com/live2',
    features: ['chat'],
  },
  tiktok: {
    name: 'TikTok LIVE',
    icon: '🎵',
    color: '#00F2EA',
    rtmpUrl: 'rtmp://push.tiktok.com/live',
    features: ['chat'],
  },
  facebook: {
    name: 'Facebook Live',
    icon: '📘',
    color: '#1877F2',
    rtmpUrl: 'rtmps://live-api-s.facebook.com:443/rtmp',
    features: ['chat'],
  },
  custom: {
    name: 'Custom RTMP',
    icon: '🔌',
    color: '#6B7280',
    rtmpUrl: '',
    features: [],
  },
};

class StreamingService {
  private config: StreamingConfig | null = null;
  private stats: StreamStats = {
    isLive: false,
    duration: 0,
    viewerCount: 0,
    chatMessages: 0,
    startTime: null,
  };
  private durationInterval: ReturnType<typeof setInterval> | null = null;
  private chatCallbacks: Set<(msg: ChatMessage) => void> = new Set();
  private eventCallbacks: Set<(event: StreamEvent) => void> = new Set();
  private statsCallbacks: Set<(stats: StreamStats) => void> = new Set();
  private unsubscribeTwitch: (() => void) | null = null;

  /**
   * Start streaming session
   */
  async startStream(config: StreamingConfig): Promise<void> {
    this.config = config;
    this.stats = {
      isLive: true,
      duration: 0,
      viewerCount: 0,
      chatMessages: 0,
      startTime: new Date(),
    };

    // Start duration counter
    this.durationInterval = setInterval(() => {
      this.stats.duration++;
      this.notifyStatsCallbacks();
    }, 1000);

    // Connect to platform chat if Twitch
    if (config.platform === 'twitch') {
      await this.connectTwitchChat();
    }

    this.notifyStatsCallbacks();
  }

  /**
   * Stop streaming session
   */
  stopStream(): void {
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
      this.durationInterval = null;
    }

    if (this.unsubscribeTwitch) {
      this.unsubscribeTwitch();
      this.unsubscribeTwitch = null;
    }

    this.stats.isLive = false;
    this.notifyStatsCallbacks();
  }

  /**
   * Connect to Twitch chat
   */
  private async connectTwitchChat(): Promise<void> {
    const twitch = getTwitchService();

    if (!twitch.isAuthenticated()) {
      console.warn('Twitch not authenticated, chat features unavailable');
      return;
    }

    try {
      await twitch.connectToChat();

      // Subscribe to chat messages
      this.unsubscribeTwitch = twitch.onChatMessage((msg: TwitchChatMessage) => {
        const chatMsg: ChatMessage = {
          id: msg.id,
          platform: 'twitch',
          user: msg.user,
          message: msg.message,
          timestamp: msg.timestamp,
          color: msg.color,
          badges: msg.badges,
          isHighlighted: msg.isMod || msg.isSubscriber,
        };

        this.stats.chatMessages++;
        this.chatCallbacks.forEach(cb => cb(chatMsg));
      });

      // Subscribe to events
      twitch.onEvent((event: TwitchEvent) => {
        const streamEvent: StreamEvent = {
          type: event.type as StreamEvent['type'],
          platform: 'twitch',
          user: event.user,
          message: event.data.message as string,
          timestamp: event.timestamp,
        };

        this.eventCallbacks.forEach(cb => cb(streamEvent));
      });
    } catch (error) {
      console.error('Failed to connect to Twitch chat:', error);
    }
  }

  /**
   * Send message to chat
   */
  async sendChatMessage(message: string): Promise<void> {
    if (!this.config) return;

    if (this.config.platform === 'twitch') {
      const twitch = getTwitchService();
      if (twitch.isAuthenticated()) {
        twitch.sendChatMessage(message);
      }
    }
    // Add other platforms as needed
  }

  /**
   * Get current stream stats
   */
  getStats(): StreamStats {
    return { ...this.stats };
  }

  /**
   * Get platform config
   */
  getPlatformConfig(platform: StreamingPlatform) {
    return PLATFORM_CONFIGS[platform];
  }

  /**
   * Get all platform configs
   */
  getAllPlatformConfigs() {
    return Object.entries(PLATFORM_CONFIGS).map(([id, config]) => ({
      id,
      ...config,
    }));
  }

  /**
   * Get RTMP URL for platform
   */
  getRtmpUrl(platform: StreamingPlatform, streamKey: string, customUrl?: string): string {
    if (platform === 'custom' && customUrl) {
      return customUrl;
    }

    const config = PLATFORM_CONFIGS[platform];
    return `${config.rtmpUrl}/${streamKey}`;
  }

  /**
   * Register callback for chat messages
   */
  onChatMessage(callback: (msg: ChatMessage) => void): () => void {
    this.chatCallbacks.add(callback);
    return () => this.chatCallbacks.delete(callback);
  }

  /**
   * Register callback for stream events
   */
  onEvent(callback: (event: StreamEvent) => void): () => void {
    this.eventCallbacks.add(callback);
    return () => this.eventCallbacks.delete(callback);
  }

  /**
   * Register callback for stats updates
   */
  onStats(callback: (stats: StreamStats) => void): () => void {
    this.statsCallbacks.add(callback);
    return () => this.statsCallbacks.delete(callback);
  }

  private notifyStatsCallbacks(): void {
    this.statsCallbacks.forEach(cb => cb(this.getStats()));
  }
}

// Singleton instance
let streamingServiceInstance: StreamingService | null = null;

export function getStreamingService(): StreamingService {
  if (!streamingServiceInstance) {
    streamingServiceInstance = new StreamingService();
  }
  return streamingServiceInstance;
}

export function resetStreamingService(): void {
  if (streamingServiceInstance) {
    streamingServiceInstance.stopStream();
    streamingServiceInstance = null;
  }
}
