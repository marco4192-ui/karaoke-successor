/**
 * YouTube Live Integration Service
 * Handles OAuth authentication, Live Chat, and stream management
 */

import { logger } from '@/lib/logger';

export interface YouTubeConfig {
  clientId: string;
  redirectUri: string;
  scopes: string[];
}

export interface YouTubeUser {
  id: string;
  name: string;
  displayName: string;
  profileImageUrl: string;
  channelId: string;
}

export interface YouTubeToken {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  obtained_at: number;
}

export interface YouTubeLiveStream {
  id: string;
  title: string;
  description: string;
  status: 'upcoming' | 'active' | 'completed' | 'all';
  scheduledStartTime?: string;
  actualStartTime?: string;
  concurrentViewers?: number;
  liveChatId?: string;
}

export interface YouTubeChatMessage {
  id: string;
  user: string;
  userId: string;
  message: string;
  timestamp: Date;
  isOwner: boolean;
  isModerator: boolean;
  isVerified: boolean;
  profileImageUrl?: string;
}

export interface YouTubeLiveChatConfig {
  liveChatId: string;
  pollInterval: number; // milliseconds
  maxResults: number;
}

const DEFAULT_SCOPES = [
  'https://www.googleapis.com/auth/youtube',
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.force-ssl',
];

const YOUTUBE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const YOUTUBE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3';

class YouTubeService {
  private config: YouTubeConfig | null = null;
  private token: YouTubeToken | null = null;
  private user: YouTubeUser | null = null;
  private messageCallbacks: Set<(msg: YouTubeChatMessage) => void> = new Set();
  private liveChatConfig: YouTubeLiveChatConfig | null = null;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private nextPageToken: string | null = null;

  /**
   * Initialize the YouTube service
   */
  initialize(config: Partial<YouTubeConfig>): void {
    this.config = {
      clientId: config.clientId || process.env.NEXT_PUBLIC_YOUTUBE_CLIENT_ID || '',
      redirectUri: config.redirectUri || `${window.location.origin}/auth/youtube/callback`,
      scopes: config.scopes || DEFAULT_SCOPES,
    };
  }

  /**
   * Generate OAuth authorization URL
   */
  getAuthUrl(state?: string): string {
    if (!this.config) {
      throw new Error('YouTube service not initialized');
    }

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.config.scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state: state || this.generateState(),
    });

    return `${YOUTUBE_AUTH_URL}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCode(code: string): Promise<YouTubeToken> {
    if (!this.config) {
      throw new Error('YouTube service not initialized');
    }

    const response = await fetch(YOUTUBE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: process.env.YOUTUBE_CLIENT_SECRET || '',
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.config.redirectUri,
      }).toString(),
    });

    if (!response.ok) {
      const errorData = await response.text();
      logger.error('[YouTubeService]', 'Token exchange failed:', errorData);
      throw new Error('Failed to exchange code for token');
    }

    const data = await response.json();
    this.token = {
      ...data,
      obtained_at: Date.now(),
    };

    // Get user info
    await this.fetchUserInfo();

    // Save token
    this.saveToken();

    return this.token;
  }

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<void> {
    if (!this.token?.refresh_token || !this.config) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(YOUTUBE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: process.env.YOUTUBE_CLIENT_SECRET || '',
        refresh_token: this.token.refresh_token,
        grant_type: 'refresh_token',
      }).toString(),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const data = await response.json();
    this.token = {
      ...data,
      obtained_at: Date.now(),
    };

    this.saveToken();
  }

  /**
   * Check if token is valid
   */
  isAuthenticated(): boolean {
    if (!this.token) {
      this.loadToken();
    }

    if (!this.token) return false;

    const expiresAt = this.token.obtained_at + this.token.expires_in * 1000;
    return Date.now() < expiresAt - 5 * 60 * 1000;
  }

  /**
   * Fetch current user info
   */
  private async fetchUserInfo(): Promise<void> {
    if (!this.token) return;

    const response = await fetch(`${YOUTUBE_API_URL}/channels?part=snippet&mine=true`, {
      headers: {
        'Authorization': `Bearer ${this.token.access_token}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.items?.[0]) {
        const channel = data.items[0];
        this.user = {
          id: channel.id,
          name: channel.snippet.customUrl || channel.snippet.title,
          displayName: channel.snippet.title,
          profileImageUrl: channel.snippet.thumbnails?.default?.url || '',
          channelId: channel.id,
        };
        this.saveUser();
      }
    }
  }

  /**
   * Get live streams for the authenticated user
   */
  async getLiveStreams(): Promise<YouTubeLiveStream[]> {
    if (!this.token || !this.user) {
      throw new Error('Not authenticated');
    }

    // Get live broadcasts
    const response = await fetch(
      `${YOUTUBE_API_URL}/liveBroadcasts?part=snippet,contentDetails,status&mine=true`,
      {
        headers: {
          'Authorization': `Bearer ${this.token.access_token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get live streams');
    }

    const data = await response.json();
    
    return (data.items || []).map((item: Record<string, unknown>) => ({
      id: item.id as string,
      title: (item.snippet as Record<string, unknown>)?.title as string,
      description: (item.snippet as Record<string, unknown>)?.description as string,
      status: (item.status as Record<string, unknown>)?.lifeCycleStatus as YouTubeLiveStream['status'],
      scheduledStartTime: (item.snippet as Record<string, unknown>)?.scheduledStartTime as string,
      actualStartTime: (item.snippet as Record<string, unknown>)?.actualStartTime as string,
      concurrentViewers: (item.liveStreamingDetails as Record<string, unknown>)?.concurrentViewers as number,
      liveChatId: (item.snippet as Record<string, unknown>)?.liveChatId as string,
    }));
  }

  /**
   * Get the active live stream
   */
  async getActiveLiveStream(): Promise<YouTubeLiveStream | null> {
    const streams = await this.getLiveStreams();
    return streams.find(s => s.status === 'active') || null;
  }

  /**
   * Start polling live chat
   */
  async startLiveChat(liveChatId: string, pollInterval: number = 5000): Promise<void> {
    this.liveChatConfig = {
      liveChatId,
      pollInterval,
      maxResults: 100,
    };

    // Start polling
    this.pollLiveChat();
  }

  /**
   * Stop live chat polling
   */
  stopLiveChat(): void {
    if (this.pollInterval) {
      clearTimeout(this.pollInterval);
      this.pollInterval = null;
    }
    this.liveChatConfig = null;
    this.nextPageToken = null;
  }

  /**
   * Poll for new chat messages
   */
  private async pollLiveChat(): Promise<void> {
    if (!this.liveChatConfig || !this.token) return;

    try {
      const params = new URLSearchParams({
        liveChatId: this.liveChatConfig.liveChatId,
        part: 'snippet,authorDetails',
        maxResults: this.liveChatConfig.maxResults.toString(),
      });

      if (this.nextPageToken) {
        params.append('pageToken', this.nextPageToken);
      }

      const response = await fetch(
        `${YOUTUBE_API_URL}/liveChat/messages?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${this.token.access_token}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 403) {
          // Rate limited, wait longer
          logger.warn('[YouTubeService]', 'Rate limited, waiting...');
          this.scheduleNextPoll(this.liveChatConfig.pollInterval * 2);
          return;
        }
        throw new Error('Failed to fetch live chat');
      }

      const data = await response.json();
      
      // Update page token
      this.nextPageToken = data.nextPageToken;

      // Process messages
      for (const item of data.items || []) {
        const msg: YouTubeChatMessage = {
          id: item.id,
          user: item.authorDetails.displayName,
          userId: item.authorDetails.channelId,
          message: item.snippet.displayMessage,
          timestamp: new Date(item.snippet.publishedAt),
          isOwner: item.authorDetails.isChatOwner,
          isModerator: item.authorDetails.isChatModerator,
          isVerified: item.authorDetails.isVerified,
          profileImageUrl: item.authorDetails.profileImageUrl,
        };

        this.messageCallbacks.forEach(cb => cb(msg));
      }

      // Schedule next poll
      this.scheduleNextPoll(data.pollingIntervalMillis || this.liveChatConfig.pollInterval);
    } catch (error) {
      logger.error('[YouTubeService]', 'Poll error:', error);
      this.scheduleNextPoll(this.liveChatConfig.pollInterval * 2);
    }
  }

  /**
   * Schedule next poll
   */
  private scheduleNextPoll(delay: number): void {
    this.pollInterval = setTimeout(() => this.pollLiveChat(), delay);
  }

  /**
   * Send message to live chat
   */
  async sendChatMessage(message: string): Promise<void> {
    if (!this.liveChatConfig || !this.token) {
      throw new Error('Not connected to live chat');
    }

    const response = await fetch(`${YOUTUBE_API_URL}/liveChat/messages?part=snippet`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        snippet: {
          liveChatId: this.liveChatConfig.liveChatId,
          textMessageDetails: {
            messageText: message,
          },
          type: 'textMessageEvent',
        },
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send message');
    }
  }

  /**
   * Register callback for chat messages
   */
  onChatMessage(callback: (msg: YouTubeChatMessage) => void): () => void {
    this.messageCallbacks.add(callback);
    return () => this.messageCallbacks.delete(callback);
  }

  /**
   * Create a live broadcast
   */
  async createBroadcast(title: string, description: string = '', scheduledStartTime?: Date): Promise<YouTubeLiveStream> {
    if (!this.token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${YOUTUBE_API_URL}/liveBroadcasts?part=snippet,contentDetails,status`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        snippet: {
          title,
          description,
          scheduledStartTime: scheduledStartTime?.toISOString() || new Date().toISOString(),
        },
        contentDetails: {
          enableDvr: true,
          recordFromStart: true,
        },
        status: {
          privacyStatus: 'public',
          selfDeclaredMadeForKids: false,
        },
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create broadcast');
    }

    const data = await response.json();
    return {
      id: data.id,
      title: data.snippet.title,
      description: data.snippet.description,
      status: data.status.lifeCycleStatus,
      scheduledStartTime: data.snippet.scheduledStartTime,
      liveChatId: data.snippet.liveChatId,
    };
  }

  /**
   * Transition broadcast status
   */
  async transitionBroadcast(broadcastId: string, status: 'testing' | 'live' | 'complete'): Promise<void> {
    if (!this.token) {
      throw new Error('Not authenticated');
    }

    await fetch(
      `${YOUTUBE_API_URL}/liveBroadcasts/transition?id=${broadcastId}&status=${status}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token.access_token}`,
        },
      }
    );
  }

  /**
   * Get stream key (RTMP)
   */
  async getStreamKey(): Promise<{ streamName: string; ingestionAddress: string } | null> {
    if (!this.token) return null;

    const response = await fetch(
      `${YOUTUBE_API_URL}/liveStreams?part=cdn,snippet&mine=true`,
      {
        headers: {
          'Authorization': `Bearer ${this.token.access_token}`,
        },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const stream = data.items?.[0];
    
    if (!stream) return null;

    return {
      streamName: stream.cdn.ingestionInfo.streamName,
      ingestionAddress: stream.cdn.ingestionInfo.ingestionAddress,
    };
  }

  // Private methods

  private generateState(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  private saveToken(): void {
    if (this.token) {
      localStorage.setItem('youtube_token', JSON.stringify(this.token));
    }
  }

  private loadToken(): void {
    const stored = localStorage.getItem('youtube_token');
    if (stored) {
      try {
        this.token = JSON.parse(stored);
      } catch {
        this.token = null;
      }
    }
  }

  private saveUser(): void {
    if (this.user) {
      localStorage.setItem('youtube_user', JSON.stringify(this.user));
    }
  }

  loadUser(): YouTubeUser | null {
    if (this.user) return this.user;

    const stored = localStorage.getItem('youtube_user');
    if (stored) {
      try {
        this.user = JSON.parse(stored);
      } catch {
        this.user = null;
      }
    }
    return this.user;
  }

  /**
   * Logout and clear stored data
   */
  logout(): void {
    this.stopLiveChat();
    this.token = null;
    this.user = null;
    localStorage.removeItem('youtube_token');
    localStorage.removeItem('youtube_user');
  }

  getUser(): YouTubeUser | null {
    return this.user || this.loadUser();
  }
}

// Singleton instance
let youtubeServiceInstance: YouTubeService | null = null;

export function getYouTubeService(): YouTubeService {
  if (!youtubeServiceInstance) {
    youtubeServiceInstance = new YouTubeService();
  }
  return youtubeServiceInstance;
}

export function resetYouTubeService(): void {
  if (youtubeServiceInstance) {
    youtubeServiceInstance.logout();
    youtubeServiceInstance = null;
  }
}
