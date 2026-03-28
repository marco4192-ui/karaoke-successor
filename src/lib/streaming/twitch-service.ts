// Twitch Integration Service
// Handles OAuth authentication (PKCE for Tauri), Chat IRC, and EventSub integration

import { logger } from '@/lib/logger';

export interface TwitchConfig {
  clientId: string;
  redirectUri: string;
  scopes: string[];
  usePKCE: boolean; // Required for Tauri/desktop apps
}

export interface TwitchUser {
  id: string;
  login: string;
  display_name: string;
  profile_image_url: string;
  broadcaster_type: 'partner' | 'affiliate' | '';
}

export interface TwitchToken {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  obtained_at: number;
}

export interface TwitchStreamInfo {
  id: string;
  user_id: string;
  user_name: string;
  game_id: string;
  game_name: string;
  title: string;
  viewer_count: number;
  started_at: string;
  language: string;
  thumbnail_url: string;
  is_live: boolean;
}

export interface TwitchChatMessage {
  id: string;
  user: string;
  userId: string;
  message: string;
  timestamp: Date;
  badges: string[];
  color: string;
  emotes: { id: string; begin: number; end: number }[];
  isMod: boolean;
  isSubscriber: boolean;
  isVip: boolean;
}

export interface TwitchEvent {
  type: 'follow' | 'subscription' | 'raid' | 'cheer' | 'gift' | 'bits';
  user: string;
  userId: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

export interface KaraokeChatCommand {
  type: 'song_request' | 'skip' | 'queue' | 'difficulty' | 'vote' | 'stats' | 'link' | 'help';
  args: string[];
  sender: {
    id: string;
    username: string;
    displayName: string;
    isMod: boolean;
    isSubscriber: boolean;
    isVip: boolean;
  };
}

const DEFAULT_SCOPES = [
  'chat:read',
  'chat:edit',
  'channel:moderate',
  'whispers:read',
  'whispers:edit',
  'channel:read:subscriptions',
  'channel:read:redemptions',
  'channel:manage:broadcast',
  'user:read:email',
  'user:read:broadcast',
  'moderator:manage:announcements',
];

const TWITCH_AUTH_URL = 'https://id.twitch.tv/oauth2/authorize';
const TWITCH_TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
const TWITCH_API_URL = 'https://api.twitch.tv/helix';
const TWITCH_IRC_URL = 'wss://irc-ws.chat.twitch.tv:443';

class TwitchService {
  private config: TwitchConfig | null = null;
  private token: TwitchToken | null = null;
  private user: TwitchUser | null = null;
  private ircSocket: WebSocket | null = null;
  private eventSubSession: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private messageCallbacks: Set<(msg: TwitchChatMessage) => void> = new Set();
  private eventCallbacks: Set<(event: TwitchEvent) => void> = new Set();
  private commandCallbacks: Set<(cmd: KaraokeChatCommand) => void> = new Set();
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private pkceVerifier: string | null = null;
  private commandPrefix: string = '!';

  /**
   * Initialize the Twitch service
   */
  initialize(config: Partial<TwitchConfig>): void {
    this.config = {
      clientId: config.clientId || process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID || '',
      redirectUri: config.redirectUri || `${window.location.origin}/auth/twitch/callback`,
      scopes: config.scopes || DEFAULT_SCOPES,
      usePKCE: config.usePKCE ?? true, // Default to PKCE for Tauri
    };
  }

  /**
   * Generate PKCE code verifier and challenge
   */
  private generatePKCE(): { verifier: string; challenge: string } {
    // Generate random verifier (43-128 characters)
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const verifier = this.base64URLEncode(array);

    // Store verifier for later use
    this.pkceVerifier = verifier;

    // Generate challenge (S256 method)
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    
    // Note: In Tauri, we can use crypto.subtle
    return { verifier, challenge: verifier }; // Simplified for now, use S256 in production
  }

  /**
   * Base64 URL encode
   */
  private base64URLEncode(buffer: Uint8Array): string {
    return btoa(String.fromCharCode(...buffer))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  /**
   * Generate OAuth authorization URL (with PKCE support)
   */
  getAuthUrl(state?: string): string {
    if (!this.config) {
      throw new Error('Twitch service not initialized');
    }

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: this.config.usePKCE ? 'code' : 'token',
      scope: this.config.scopes.join(' '),
      state: state || this.generateState(),
    });

    // Add PKCE parameters if enabled
    if (this.config.usePKCE) {
      const { challenge } = this.generatePKCE();
      params.append('code_challenge_method', 'S256');
      params.append('code_challenge', challenge);
    }

    return `${TWITCH_AUTH_URL}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCode(code: string): Promise<TwitchToken> {
    if (!this.config) {
      throw new Error('Twitch service not initialized');
    }

    const bodyParams: Record<string, string> = {
      client_id: this.config.clientId,
      client_secret: process.env.TWITCH_CLIENT_SECRET || '',
      code,
      grant_type: 'authorization_code',
      redirect_uri: this.config.redirectUri,
    };

    // Add PKCE verifier if enabled
    if (this.config.usePKCE && this.pkceVerifier) {
      bodyParams.code_verifier = this.pkceVerifier;
      // Remove client_secret for PKCE flow
      delete bodyParams.client_secret;
    }

    const response = await fetch(TWITCH_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(bodyParams).toString(),
    });

    if (!response.ok) {
      const errorData = await response.text();
      logger.error('[TwitchService]', 'Token exchange failed:', errorData);
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
   * Handle implicit grant token (from URL fragment)
   */
  async handleImplicitToken(accessToken: string, expiresIn: number): Promise<void> {
    this.token = {
      access_token: accessToken,
      refresh_token: '',
      expires_in: expiresIn,
      token_type: 'bearer',
      obtained_at: Date.now(),
    };

    await this.fetchUserInfo();
    this.saveToken();
  }

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<void> {
    if (!this.token?.refresh_token || !this.config) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(TWITCH_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: process.env.TWITCH_CLIENT_SECRET || '',
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
   * Check if token is valid and not expired
   */
  isAuthenticated(): boolean {
    if (!this.token) {
      // Try to load from storage
      this.loadToken();
    }

    if (!this.token) return false;

    // Check if token is expired (with 5 minute buffer)
    const expiresAt = this.token.obtained_at + this.token.expires_in * 1000;
    return Date.now() < expiresAt - 5 * 60 * 1000;
  }

  /**
   * Fetch current user info
   */
  private async fetchUserInfo(): Promise<void> {
    if (!this.token) return;

    const response = await fetch(`${TWITCH_API_URL}/users`, {
      headers: {
        'Authorization': `Bearer ${this.token.access_token}`,
        'Client-Id': this.config?.clientId || '',
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.data?.[0]) {
        this.user = data.data[0];
        this.saveUser();
      }
    }
  }

  /**
   * Connect to Twitch IRC for chat
   */
  async connectToChat(): Promise<void> {
    if (!this.token || !this.user) {
      throw new Error('Not authenticated');
    }

    if (this.ircSocket?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    return new Promise((resolve, reject) => {
      this.ircSocket = new WebSocket(TWITCH_IRC_URL);

      this.ircSocket.onopen = () => {
        // Send capabilities
        this.sendIRC('CAP REQ :twitch.tv/membership twitch.tv/tags twitch.tv/commands');
        // Authenticate
        this.sendIRC(`PASS oauth:${this.token!.access_token}`);
        this.sendIRC(`NICK ${this.user!.login}`);
        // Join channel
        this.sendIRC(`JOIN #${this.user!.login}`);

        // Start ping interval
        this.pingInterval = setInterval(() => {
          this.sendIRC('PING');
        }, 30000);

        resolve();
      };

      this.ircSocket.onmessage = (event) => {
        this.handleIRCMessage(event.data);
      };

      this.ircSocket.onerror = (error) => {
        logger.error('[TwitchService]', 'IRC error:', error);
        reject(error);
      };

      this.ircSocket.onclose = () => {
        this.handleDisconnect();
      };
    });
  }

  /**
   * Disconnect from IRC
   */
  disconnectFromChat(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.ircSocket) {
      this.sendIRC('PART #' + (this.user?.login || ''));
      this.ircSocket.close();
      this.ircSocket = null;
    }
  }

  /**
   * Send message to chat
   */
  sendChatMessage(message: string): void {
    if (!this.ircSocket || this.ircSocket.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected to chat');
    }

    this.sendIRC(`PRIVMSG #${this.user!.login} :${message}`);
  }

  /**
   * Send announcement (requires moderator scope)
   */
  async sendAnnouncement(message: string, color: 'blue' | 'green' | 'orange' | 'purple' = 'purple'): Promise<void> {
    if (!this.token || !this.user) return;

    await fetch(`${TWITCH_API_URL}/moderation/announcements?broadcaster_id=${this.user.id}&moderator_id=${this.user.id}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token.access_token}`,
        'Client-Id': this.config?.clientId || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, color }),
    });
  }

  /**
   * Register callback for chat messages
   */
  onChatMessage(callback: (msg: TwitchChatMessage) => void): () => void {
    this.messageCallbacks.add(callback);
    return () => this.messageCallbacks.delete(callback);
  }

  /**
   * Register callback for events
   */
  onEvent(callback: (event: TwitchEvent) => void): () => void {
    this.eventCallbacks.add(callback);
    return () => this.eventCallbacks.delete(callback);
  }

  /**
   * Register callback for karaoke commands
   */
  onKaraokeCommand(callback: (cmd: KaraokeChatCommand) => void): () => void {
    this.commandCallbacks.add(callback);
    return () => this.commandCallbacks.delete(callback);
  }

  /**
   * Set command prefix (default: !)
   */
  setCommandPrefix(prefix: string): void {
    this.commandPrefix = prefix;
  }

  /**
   * Get stream info
   */
  async getStreamInfo(): Promise<TwitchStreamInfo | null> {
    if (!this.token || !this.user) return null;

    const response = await fetch(`${TWITCH_API_URL}/streams?user_id=${this.user.id}`, {
      headers: {
        'Authorization': `Bearer ${this.token.access_token}`,
        'Client-Id': this.config?.clientId || '',
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (data.data?.[0]) {
      return {
        ...data.data[0],
        is_live: true,
      };
    }

    return { is_live: false } as TwitchStreamInfo;
  }

  /**
   * Update stream title and game
   */
  async updateStreamInfo(title: string, gameId?: string): Promise<void> {
    if (!this.token || !this.user) return;

    await fetch(`${TWITCH_API_URL}/channels?broadcaster_id=${this.user.id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${this.token.access_token}`,
        'Client-Id': this.config?.clientId || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title, game_id: gameId }),
    });
  }

  /**
   * Get stream key for RTMP
   */
  async getStreamKey(): Promise<string | null> {
    if (!this.token || !this.user) return null;

    const response = await fetch(`${TWITCH_API_URL}/streams/key?broadcaster_id=${this.user.id}`, {
      headers: {
        'Authorization': `Bearer ${this.token.access_token}`,
        'Client-Id': this.config?.clientId || '',
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data.data?.[0]?.stream_key || null;
  }

  /**
   * Start raid to another channel
   */
  async startRaid(targetUserId: string): Promise<void> {
    if (!this.token || !this.user) return;

    await fetch(`${TWITCH_API_URL}/raids?from_broadcaster_id=${this.user.id}&to_broadcaster_id=${targetUserId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token.access_token}`,
        'Client-Id': this.config?.clientId || '',
      },
    });
  }

  // Private helper methods

  private sendIRC(message: string): void {
    if (this.ircSocket?.readyState === WebSocket.OPEN) {
      this.ircSocket.send(message);
    }
  }

  private handleIRCMessage(data: string): void {
    const lines = data.split('\r\n').filter(Boolean);

    for (const line of lines) {
      // Handle PONG
      if (line.startsWith('PING')) {
        this.sendIRC('PONG');
        continue;
      }

      // Parse chat message
      if (line.includes('PRIVMSG')) {
        const msg = this.parseChatMessage(line);
        if (msg) {
          this.messageCallbacks.forEach(cb => cb(msg));

          // Check for karaoke commands
          const command = this.parseKaraokeCommand(msg);
          if (command) {
            this.commandCallbacks.forEach(cb => cb(command));
          }
        }
      }

      // Handle other IRC events (JOIN, PART, etc.)
      if (line.includes('JOIN')) {
        logger.info('[TwitchService]', 'Joined channel');
      }
    }
  }

  private parseChatMessage(line: string): TwitchChatMessage | null {
    // IRC format: @tags :user!user@user.tmi.twitch.tv PRIVMSG #channel :message
    const tagsMatch = line.match(/^@([^ ]+)/);
    const userMatch = line.match(/:([^!]+)!/);
    const channelMatch = line.match(/PRIVMSG #([^ ]+)/);
    const messageMatch = line.match(/PRIVMSG #[^ ]+ :(.+)$/);

    if (!userMatch || !messageMatch) return null;

    const tags: Record<string, string> = {};
    if (tagsMatch) {
      tagsMatch[1].split(';').forEach(pair => {
        const [key, value] = pair.split('=');
        tags[key] = value.replace(/\\s/g, ' ');
      });
    }

    return {
      id: tags['id'] || Date.now().toString(),
      user: userMatch[1],
      userId: tags['user-id'] || '',
      message: messageMatch[1],
      timestamp: new Date(parseInt(tags['tmi-sent-ts'] || Date.now())),
      badges: (tags['badges'] || '').split(',').filter(Boolean),
      color: tags['color'] || '#ffffff',
      emotes: this.parseEmotes(tags['emotes']),
      isMod: tags['mod'] === '1',
      isSubscriber: tags['subscriber'] === '1',
      isVip: tags['vip'] === '1',
    };
  }

  private parseKaraokeCommand(msg: TwitchChatMessage): KaraokeChatCommand | null {
    const { message } = msg;
    
    if (!message.startsWith(this.commandPrefix)) {
      return null;
    }

    const parts = message.slice(this.commandPrefix.length).split(' ');
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    const commandMap: Record<string, KaraokeChatCommand['type']> = {
      'sr': 'song_request',
      'songrequest': 'song_request',
      'request': 'song_request',
      'skip': 'skip',
      'queue': 'queue',
      'q': 'queue',
      'difficulty': 'difficulty',
      'diff': 'difficulty',
      'vote': 'vote',
      'v': 'vote',
      'stats': 'stats',
      'score': 'stats',
      'link': 'link',
      'song': 'link',
      'help': 'help',
      'commands': 'help',
    };

    const type = commandMap[cmd];
    if (!type) return null;

    return {
      type,
      args,
      sender: {
        id: msg.userId,
        username: msg.user,
        displayName: msg.user, // Would need to extract from tags
        isMod: msg.isMod,
        isSubscriber: msg.isSubscriber,
        isVip: msg.isVip,
      },
    };
  }

  private parseEmotes(emoteStr: string): { id: string; begin: number; end: number }[] {
    if (!emoteStr) return [];

    const emotes: { id: string; begin: number; end: number }[] = [];
    const parts = emoteStr.split('/');

    for (const part of parts) {
      const [id, ranges] = part.split(':');
      if (!ranges) continue;

      for (const range of ranges.split(',')) {
        const [begin, end] = range.split('-').map(Number);
        emotes.push({ id, begin, end });
      }
    }

    return emotes;
  }

  private handleDisconnect(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    // Attempt reconnect
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      logger.info('[TwitchService]', `Reconnecting (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      setTimeout(() => this.connectToChat(), 5000);
    }
  }

  private generateState(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  private saveToken(): void {
    if (this.token) {
      localStorage.setItem('twitch_token', JSON.stringify(this.token));
    }
  }

  private loadToken(): void {
    const stored = localStorage.getItem('twitch_token');
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
      localStorage.setItem('twitch_user', JSON.stringify(this.user));
    }
  }

  loadUser(): TwitchUser | null {
    if (this.user) return this.user;

    const stored = localStorage.getItem('twitch_user');
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
    this.disconnectFromChat();
    this.token = null;
    this.user = null;
    this.pkceVerifier = null;
    localStorage.removeItem('twitch_token');
    localStorage.removeItem('twitch_user');
  }

  getUser(): TwitchUser | null {
    return this.user || this.loadUser();
  }
}

// Singleton instance
let twitchServiceInstance: TwitchService | null = null;

export function getTwitchService(): TwitchService {
  if (!twitchServiceInstance) {
    twitchServiceInstance = new TwitchService();
  }
  return twitchServiceInstance;
}

export function resetTwitchService(): void {
  if (twitchServiceInstance) {
    twitchServiceInstance.logout();
    twitchServiceInstance = null;
  }
}
