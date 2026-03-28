// Multi-Platform Streaming Service
// Supports Twitch, YouTube, TikTok, Facebook, and custom RTMP

import { getTwitchService, TwitchChatMessage, TwitchEvent, KaraokeChatCommand } from './twitch-service';

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

export interface KaraokeSongRequest {
  id: string;
  query: string;
  requestedBy: {
    id: string;
    username: string;
    displayName: string;
    isMod: boolean;
    isSubscriber: boolean;
    isVip: boolean;
  };
  requestedAt: Date;
  status: 'pending' | 'queued' | 'playing' | 'played' | 'skipped';
}

// Platform configurations
const PLATFORM_CONFIGS = {
  twitch: {
    name: 'Twitch',
    icon: '📺',
    color: '#9146FF',
    rtmpUrl: 'rtmps://live.twitch.tv/app',
    features: ['chat', 'events', 'alerts', 'commands'],
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
  private commandCallbacks: Set<(cmd: KaraokeChatCommand) => void> = new Set();
  private unsubscribeTwitch: (() => void) | null = null;
  private unsubscribeTwitchCommands: (() => void) | null = null;
  private songQueue: KaraokeSongRequest[] = [];
  private maxQueueSize: number = 20;
  private maxSongsPerUser: number = 3;

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

    if (this.unsubscribeTwitchCommands) {
      this.unsubscribeTwitchCommands();
      this.unsubscribeTwitchCommands = null;
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

      // Subscribe to karaoke commands
      this.unsubscribeTwitchCommands = twitch.onKaraokeCommand((cmd: KaraokeChatCommand) => {
        this.handleKaraokeCommand(cmd);
        this.commandCallbacks.forEach(cb => cb(cmd));
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
   * Handle karaoke-specific commands
   */
  private handleKaraokeCommand(cmd: KaraokeChatCommand): void {
    switch (cmd.type) {
      case 'song_request':
        this.handleSongRequest(cmd);
        break;
      case 'skip':
        if (cmd.sender.isMod) {
          // Emit skip event
          this.eventCallbacks.forEach(cb => cb({
            type: 'donation', // Using donation as skip event
            platform: 'twitch',
            user: cmd.sender.username,
            message: 'Skip requested by mod',
            timestamp: new Date(),
          }));
        }
        break;
      case 'queue':
        // Send queue to chat
        const twitch = getTwitchService();
        const queueInfo = this.songQueue
          .filter(r => r.status === 'pending')
          .slice(0, 5)
          .map((r, i) => `${i + 1}. ${r.query}`)
          .join(' | ');
        if (queueInfo) {
          twitch.sendChatMessage(`📊 Queue: ${queueInfo}`);
        } else {
          twitch.sendChatMessage('📊 Queue is empty! Request a song with !sr <song>');
        }
        break;
      case 'stats':
        // Send current stats to chat
        const twitchStats = getTwitchService();
        twitchStats.sendChatMessage(
          `🎵 Current Score: ${this.stats.viewerCount} | Duration: ${this.formatDuration(this.stats.duration)} | Messages: ${this.stats.chatMessages}`
        );
        break;
      case 'help':
        const twitchHelp = getTwitchService();
        twitchHelp.sendChatMessage(
          '🎤 Commands: !sr <song> - Request song | !queue - View queue | !stats - View stats | !link - Get song link'
        );
        break;
    }
  }

  /**
   * Handle song request
   */
  private handleSongRequest(cmd: KaraokeChatCommand): void {
    if (this.songQueue.length >= this.maxQueueSize) {
      const twitch = getTwitchService();
      twitch.sendChatMessage(`❌ Queue is full (${this.maxQueueSize} songs max)`);
      return;
    }

    const query = cmd.args.join(' ').trim();
    if (!query) return;

    // Check user's queue count
    const userRequests = this.songQueue.filter(
      r => r.requestedBy.id === cmd.sender.id && r.status === 'pending'
    );
    if (userRequests.length >= this.maxSongsPerUser) {
      const twitch = getTwitchService();
      twitch.sendChatMessage(`❌ You already have ${this.maxSongsPerUser} songs in queue!`);
      return;
    }

    const request: KaraokeSongRequest = {
      id: `sr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      query,
      requestedBy: cmd.sender,
      requestedAt: new Date(),
      status: 'pending',
    };

    this.songQueue.push(request);

    // Confirm in chat
    const twitch = getTwitchService();
    const position = this.songQueue.filter(r => r.status === 'pending').length;
    twitch.sendChatMessage(`✅ "${query}" added to queue! Position: #${position}`);
  }

  /**
   * Get song queue
   */
  getSongQueue(): KaraokeSongRequest[] {
    return [...this.songQueue];
  }

  /**
   * Mark song as playing
   */
  playSong(requestId: string): void {
    const request = this.songQueue.find(r => r.id === requestId);
    if (request) {
      request.status = 'playing';
    }
  }

  /**
   * Mark song as played
   */
  completeSong(requestId: string): void {
    const request = this.songQueue.find(r => r.id === requestId);
    if (request) {
      request.status = 'played';
    }
  }

  /**
   * Skip song
   */
  skipSong(requestId: string): void {
    const request = this.songQueue.find(r => r.id === requestId);
    if (request) {
      request.status = 'skipped';
    }
  }

  /**
   * Remove song from queue
   */
  removeSong(requestId: string): void {
    this.songQueue = this.songQueue.filter(r => r.id !== requestId);
  }

  /**
   * Clear queue
   */
  clearQueue(): void {
    this.songQueue = [];
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

  /**
   * Register callback for karaoke commands
   */
  onKaraokeCommand(callback: (cmd: KaraokeChatCommand) => void): () => void {
    this.commandCallbacks.add(callback);
    return () => this.commandCallbacks.delete(callback);
  }

  /**
   * Set queue limits
   */
  setQueueLimits(maxSize: number, maxPerUser: number): void {
    this.maxQueueSize = maxSize;
    this.maxSongsPerUser = maxPerUser;
  }

  private notifyStatsCallbacks(): void {
    this.statsCallbacks.forEach(cb => cb(this.getStats()));
  }

  private formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
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
