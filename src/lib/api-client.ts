/**
 * Centralized API Client
 * Provides a unified interface for all API calls in the application
 */

// API endpoint constants
export const API_ENDPOINTS = {
  // Mobile client API
  MOBILE: '/api/mobile',
  // Songs API
  SONGS: '/api/songs',
  // Configuration API
  CONFIG: '/api/config',
  // Assets generation API
  ASSETS_GENERATE: '/api/assets/generate',
  // Lyrics suggestions API
  LYRICS_SUGGESTIONS: '/api/lyrics-suggestions',
  // Song identification API
  SONG_IDENTIFY: '/api/song-identify',
  // Cover generation API
  COVER_GENERATE: '/api/cover-generate',
} as const;

// Request options type
interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

// API response type
interface ApiResponse<T = unknown> {
  success?: boolean;
  data?: T;
  error?: string;
  [key: string]: unknown;
}

/**
 * Centralized API client for making HTTP requests
 */
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  /**
   * Make a GET request
   */
  async get<T = unknown>(endpoint: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    let url = `${this.baseUrl}${endpoint}`;
    
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return response.json();
  }

  /**
   * Make a POST request
   */
  async post<T = unknown>(endpoint: string, body?: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    return response.json();
  }

  /**
   * Make a PUT request
   */
  async put<T = unknown>(endpoint: string, body?: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    return response.json();
  }

  /**
   * Make a DELETE request
   */
  async delete<T = unknown>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return response.json();
  }

  /**
   * Make a generic request with full control
   */
  async request<T = unknown>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {}, signal } = options;

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });

    return response.json();
  }

  // ============================================
  // Mobile API Methods
  // ============================================

  /**
   * Connect to mobile server
   */
  async mobileConnect(): Promise<ApiResponse> {
    return this.get(API_ENDPOINTS.MOBILE, { action: 'connect' });
  }

  /**
   * Reconnect to mobile server with existing code
   */
  async mobileReconnect(code: string): Promise<ApiResponse> {
    return this.get(API_ENDPOINTS.MOBILE, { action: 'reconnect', code });
  }

  /**
   * Disconnect from mobile server
   */
  async mobileDisconnect(clientId: string): Promise<void> {
    await this.get(API_ENDPOINTS.MOBILE, { action: 'disconnect', clientId });
  }

  /**
   * Get mobile pitch data
   */
  async mobileGetPitch(): Promise<ApiResponse> {
    return this.get(API_ENDPOINTS.MOBILE, { action: 'getpitch' });
  }

  /**
   * Get mobile game state
   */
  async mobileGetGameState(): Promise<ApiResponse> {
    return this.get(API_ENDPOINTS.MOBILE, { action: 'gamestate' });
  }

  /**
   * Get remote control state
   */
  async mobileGetRemoteControl(clientId: string): Promise<ApiResponse> {
    return this.get(API_ENDPOINTS.MOBILE, { action: 'remotecontrol', clientId });
  }

  /**
   * Get queue
   */
  async mobileGetQueue(): Promise<ApiResponse> {
    return this.get(API_ENDPOINTS.MOBILE, { action: 'getqueue' });
  }

  /**
   * Get game results
   */
  async mobileGetResults(): Promise<ApiResponse> {
    return this.get(API_ENDPOINTS.MOBILE, { action: 'results' });
  }

  /**
   * Get jukebox wishlist
   */
  async mobileGetJukebox(): Promise<ApiResponse> {
    return this.get(API_ENDPOINTS.MOBILE, { action: 'getjukebox' });
  }

  /**
   * Get remote commands
   */
  async mobileGetCommands(): Promise<ApiResponse> {
    return this.get(API_ENDPOINTS.MOBILE, { action: 'getcommands' });
  }

  /**
   * Send mobile action (POST)
   */
  async mobileAction(type: string, clientId?: string, payload?: unknown): Promise<ApiResponse> {
    return this.post(API_ENDPOINTS.MOBILE, { type, clientId, payload });
  }

  /**
   * Send profile update
   */
  async mobileProfile(clientId: string, profile: unknown): Promise<ApiResponse> {
    return this.post(API_ENDPOINTS.MOBILE, { type: 'profile', clientId, payload: profile });
  }

  /**
   * Add to queue
   */
  async mobileQueue(clientId: string, songData: { songId: string; songTitle: string; songArtist: string }): Promise<ApiResponse> {
    return this.post(API_ENDPOINTS.MOBILE, { type: 'queue', clientId, payload: songData });
  }

  /**
   * Send pitch data
   */
  async mobilePitch(clientId: string, pitchData: unknown): Promise<void> {
    await this.post(API_ENDPOINTS.MOBILE, { type: 'pitch', clientId, payload: pitchData });
  }

  /**
   * Send game state update
   */
  async mobileGameState(payload: unknown): Promise<void> {
    await this.post(API_ENDPOINTS.MOBILE, { type: 'gamestate', payload });
  }

  /**
   * Send heartbeat
   */
  async mobileHeartbeat(clientId: string): Promise<void> {
    await this.post(API_ENDPOINTS.MOBILE, { type: 'heartbeat', clientId });
  }

  /**
   * Send game results
   */
  async mobileResults(payload: unknown): Promise<void> {
    await this.post(API_ENDPOINTS.MOBILE, { type: 'results', payload });
  }

  /**
   * Set ad playing state
   */
  async mobileSetAdPlaying(isAdPlaying: boolean): Promise<void> {
    await this.post(API_ENDPOINTS.MOBILE, { type: 'setAdPlaying', payload: { isAdPlaying } });
  }

  /**
   * Remote acquire
   */
  async mobileRemoteAcquire(clientId: string): Promise<ApiResponse> {
    return this.post(API_ENDPOINTS.MOBILE, { type: 'remote_acquire', clientId });
  }

  /**
   * Remote release
   */
  async mobileRemoteRelease(clientId: string): Promise<ApiResponse> {
    return this.post(API_ENDPOINTS.MOBILE, { type: 'remote_release', clientId });
  }

  /**
   * Remote command
   */
  async mobileRemoteCommand(clientId: string, command: string): Promise<ApiResponse> {
    return this.post(API_ENDPOINTS.MOBILE, { type: 'remote_command', clientId, payload: { command } });
  }

  // ============================================
  // Songs API Methods
  // ============================================

  /**
   * Get all songs
   */
  async getSongs(): Promise<ApiResponse> {
    return this.get(API_ENDPOINTS.SONGS);
  }

  // ============================================
  // Config API Methods
  // ============================================

  /**
   * Get configuration
   */
  async getConfig(): Promise<ApiResponse> {
    return this.get(API_ENDPOINTS.CONFIG);
  }

  /**
   * Save configuration
   */
  async saveConfig(config: { baseUrl?: string; apiKey?: string }): Promise<ApiResponse> {
    return this.post(API_ENDPOINTS.CONFIG, config);
  }

  /**
   * Test configuration connection
   */
  async testConfig(config: { baseUrl?: string; apiKey?: string }): Promise<ApiResponse> {
    return this.put(API_ENDPOINTS.CONFIG, config);
  }

  // ============================================
  // Assets API Methods
  // ============================================

  /**
   * Generate asset (image or audio)
   */
  async generateAsset(params: {
    type: 'image' | 'audio';
    prompt?: string;
    text?: string;
    filename: string;
    size?: string;
  }): Promise<ApiResponse> {
    return this.post(API_ENDPOINTS.ASSETS_GENERATE, params);
  }

  // ============================================
  // Lyrics API Methods
  // ============================================

  /**
   * Get lyrics suggestions
   */
  async getLyricsSuggestions(params: {
    lyrics: string[];
    title?: string;
    artist?: string;
    bpm?: number;
    checkTiming?: boolean;
    checkSpelling?: boolean;
    checkGaps?: boolean;
    singleLine?: boolean;
    language?: string;
    detectOnly?: boolean;
  }): Promise<ApiResponse> {
    return this.post(API_ENDPOINTS.LYRICS_SUGGESTIONS, params);
  }

  // ============================================
  // Song Identification API Methods
  // ============================================

  /**
   * Identify a song from filename or lyrics
   */
  async identifySong(input: string, type: 'filename' | 'lyrics' = 'filename'): Promise<ApiResponse> {
    return this.post(API_ENDPOINTS.SONG_IDENTIFY, { input, type });
  }

  // ============================================
  // Cover Generation API Methods
  // ============================================

  /**
   * Generate cover art for a song
   */
  async generateCoverArt(params: {
    title: string;
    artist: string;
    genre?: string;
    style?: string;
  }): Promise<ApiResponse> {
    return this.post(API_ENDPOINTS.COVER_GENERATE, params);
  }

  // ============================================
  // Mobile Status API Methods
  // ============================================

  /**
   * Get mobile status (connected clients)
   */
  async mobileStatus(): Promise<ApiResponse> {
    return this.get(API_ENDPOINTS.MOBILE, { action: 'status' });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export class for custom instances
export { ApiClient };
