/**
 * Streaming Overlay Service
 * Manages overlay state for OBS browser source and real-time updates
 */

import {
  OverlayConfig,
  OverlaySettings,
  OverlayState,
  OverlaySong,
  OverlayPlayer,
  OverlayRating,
  DEFAULT_OVERLAY_SETTINGS,
  SongRequest,
  ChatConfig,
  ChatMessage,
  ChatCommand,
  ChatCommandType,
  ChatUserRole,
  DEFAULT_CHAT_CONFIG,
  VotingPoll,
  Vote,
} from './types';
import { logger } from '@/lib/logger';

// Storage keys
const OVERLAY_KEY = 'overlay-config';
const OVERLAY_DATA_KEY = 'overlay-data';
const SONG_QUEUE_KEY = 'song-queue';

/**
 * Streaming Overlay Service
 * Singleton service for managing streaming overlay state
 */
export class StreamingOverlayService {
  private config: OverlayConfig;
  private state: OverlayState;
  private songQueue: SongRequest[] = [];
  private chatConfig: ChatConfig;
  private listeners: Set<(state: OverlayState) => void> = new Set();
  private updateInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.config = this.loadConfig();
    this.state = this.getInitialState();
    this.chatConfig = this.loadChatConfig();
    this.songQueue = this.loadSongQueue();

    // Start periodic state broadcast
    this.startStateBroadcast();
  }

  // ==================== Overlay State Management ====================

  /**
   * Get initial overlay state
   */
  private getInitialState(): OverlayState {
    return {
      currentSong: null,
      currentPlayer: null,
      score: 0,
      accuracy: 0,
      combo: 0,
      maxCombo: 0,
      rating: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      lastUpdate: Date.now(),
    };
  }

  /**
   * Load config from storage
   */
  private loadConfig(): OverlayConfig {
    try {
      const stored = localStorage.getItem(OVERLAY_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...parsed,
          settings: { ...DEFAULT_OVERLAY_SETTINGS, ...parsed.settings },
        };
      }
    } catch {
      logger.warn('[StreamingOverlay]', 'Failed to load config');
    }

    return {
      overlayKey: this.generateOverlayKey(),
      isActive: false,
      settings: DEFAULT_OVERLAY_SETTINGS,
      state: this.getInitialState(),
    };
  }

  /**
   * Load chat config from storage
   */
  private loadChatConfig(): ChatConfig {
    try {
      const stored = localStorage.getItem('chat-config');
      if (stored) {
        return { ...DEFAULT_CHAT_CONFIG, ...JSON.parse(stored) };
      }
    } catch {
      logger.warn('[StreamingOverlay]', 'Failed to load chat config');
    }
    return DEFAULT_CHAT_CONFIG;
  }

  /**
   * Load song queue from storage
   */
  private loadSongQueue(): SongRequest[] {
    try {
      const stored = localStorage.getItem(SONG_QUEUE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      logger.warn('[StreamingOverlay]', 'Failed to load song queue');
    }
    return [];
  }

  /**
   * Generate unique overlay key
   */
  private generateOverlayKey(): string {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  }

  /**
   * Get overlay URL for OBS
   */
  getOverlayUrl(baseUrl: string): string {
    return `${baseUrl}/overlay?key=${this.config.overlayKey}&theme=${this.config.settings.theme}&position=${this.config.settings.position}`;
  }

  /**
   * Get current overlay key
   */
  getOverlayKey(): string {
    return this.config.overlayKey;
  }

  /**
   * Update overlay settings
   */
  updateSettings(settings: Partial<OverlaySettings>): void {
    this.config.settings = { ...this.config.settings, ...settings };
    this.saveConfig();
    this.notifyListeners();
  }

  /**
   * Update current song
   */
  updateSong(song: OverlaySong | null): void {
    this.state.currentSong = song;
    this.state.duration = song?.duration ?? 0;
    this.state.currentTime = 0;
    this.state.lastUpdate = Date.now();
    this.broadcastState();
  }

  /**
   * Update current player
   */
  updatePlayer(player: OverlayPlayer | null): void {
    this.state.currentPlayer = player;
    this.state.lastUpdate = Date.now();
    this.broadcastState();
  }

  /**
   * Update score
   */
  updateScore(score: number, accuracy: number, combo: number, maxCombo: number): void {
    this.state.score = score;
    this.state.accuracy = accuracy;
    this.state.combo = combo;
    this.state.maxCombo = Math.max(this.state.maxCombo, maxCombo);
    this.state.lastUpdate = Date.now();
    this.broadcastState();
  }

  /**
   * Update rating
   */
  updateRating(rating: OverlayRating | null): void {
    this.state.rating = rating;
    this.state.lastUpdate = Date.now();
    this.broadcastState();
  }

  /**
   * Update playing state
   */
  updatePlayingState(isPlaying: boolean, currentTime: number = 0): void {
    this.state.isPlaying = isPlaying;
    this.state.currentTime = currentTime;
    this.state.lastUpdate = Date.now();
    this.broadcastState();
  }

  /**
   * Reset state (end of song)
   */
  resetState(): void {
    this.state = this.getInitialState();
    this.broadcastState();
  }

  /**
   * Get current state
   */
  getState(): OverlayState {
    return { ...this.state };
  }

  /**
   * Get config
   */
  getConfig(): OverlayConfig {
    return { ...this.config };
  }

  // ==================== State Broadcasting ====================

  /**
   * Start periodic state broadcast to localStorage
   * This allows the overlay page to receive updates
   */
  private startStateBroadcast(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(() => {
      this.broadcastState();
    }, 500);
  }

  /**
   * Broadcast state to localStorage
   */
  private broadcastState(): void {
    try {
      const data = {
        song: this.state.currentSong,
        player: this.state.currentPlayer,
        score: this.state.score,
        accuracy: this.state.accuracy,
        combo: this.state.combo,
        maxCombo: this.state.maxCombo,
        rating: this.state.rating,
        isPlaying: this.state.isPlaying,
        currentTime: this.state.currentTime,
        settings: this.config.settings,
      };
      localStorage.setItem(OVERLAY_DATA_KEY, JSON.stringify(data));
      this.notifyListeners();
    } catch {
      logger.error('[StreamingOverlay]', 'Failed to broadcast state');
    }
  }

  /**
   * Save config to storage
   */
  private saveConfig(): void {
    try {
      localStorage.setItem(OVERLAY_KEY, JSON.stringify(this.config));
    } catch {
      logger.error('[StreamingOverlay]', 'Failed to save config');
    }
  }

  // ==================== Chat Integration ====================

  /**
   * Process chat command
   */
  processCommand(message: ChatMessage): SongRequest | null {
    if (!message.isCommand || !message.command) return null;

    const { command } = message;
    let result: SongRequest | null = null;

    switch (command.type) {
      case 'sr':
        result = this.handleSongRequest(command);
        break;
      case 'srm':
        this.handleSongRequestMe(command.sender);
        break;
      case 'wrongsong':
        this.handleWrongSong(command.sender.id);
        break;
      case 'skip':
        this.handleSkip(command.sender.role);
        break;
      case 'queue':
        this.handleShowQueue();
        break;
      case 'help':
        this.handleHelp();
        break;
    }

    return result;
  }

  /**
   * Handle song request command
   */
  private handleSongRequest(command: ChatCommand): SongRequest | null {
    if (!this.chatConfig.enableSongRequests) return null;
    if (this.songQueue.length >= this.chatConfig.maxQueueSize) return null;

    const query = command.args.join(' ').trim();
    if (!query) return null;

    // Check user's queue count
    const userRequests = this.songQueue.filter(
      r => r.requestedBy.id === command.sender.id && r.status === 'pending'
    );
    if (userRequests.length >= this.chatConfig.maxSongsPerUser) return null;

    const request: SongRequest = {
      id: `sr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      songId: query, // In production, would search for actual song
      songTitle: query,
      songArtist: 'Unknown',
      requestedBy: {
        id: command.sender.id,
        username: command.sender.username,
        displayName: command.sender.displayName,
        role: command.sender.role,
      },
      requestedAt: Date.now(),
      status: 'pending',
      position: this.songQueue.length + 1,
    };

    this.songQueue.push(request);
    this.saveSongQueue();

    return request;
  }

  /**
   * Handle song request me command
   */
  private handleSongRequestMe(sender: ChatCommand['sender']): void {
    const userRequests = this.songQueue.filter(
      r => r.requestedBy.id === sender.id && r.status === 'pending'
    );
    // Would send chat message with user's position
    logger.info('[StreamingOverlay]', `${sender.displayName} has ${userRequests.length} songs in queue`);
  }

  /**
   * Handle wrong song command
   */
  private handleWrongSong(userId: string): void {
    const index = this.songQueue.findIndex(
      r => r.requestedBy.id === userId && r.status === 'pending'
    );
    if (index !== -1) {
      this.songQueue.splice(index, 1);
      this.saveSongQueue();
    }
  }

  /**
   * Handle skip command (mod only)
   */
  private handleSkip(role: ChatUserRole): void {
    if (role !== 'broadcaster' && role !== 'moderator') return;
    // Would trigger skip action
    logger.info('[StreamingOverlay]', 'Skip requested');
  }

  /**
   * Handle show queue command
   */
  private handleShowQueue(): void {
    const queueInfo = this.songQueue
      .filter(r => r.status === 'pending')
      .slice(0, 5)
      .map((r, i) => `${i + 1}. ${r.songTitle}`)
      .join(' | ');
    logger.info('[StreamingOverlay]', 'Queue:', queueInfo);
  }

  /**
   * Handle help command
   */
  private handleHelp(): void {
    const helpText = `
      Commands: ${this.chatConfig.commandPrefix}sr <song> | ${this.chatConfig.commandPrefix}srm | ${this.chatConfig.commandPrefix}wrongsong | ${this.chatConfig.commandPrefix}queue
    `.trim();
    logger.info('[StreamingOverlay]', helpText);
  }

  /**
   * Save song queue
   */
  private saveSongQueue(): void {
    try {
      localStorage.setItem(SONG_QUEUE_KEY, JSON.stringify(this.songQueue));
    } catch {
      logger.error('[StreamingOverlay]', 'Failed to save song queue');
    }
  }

  /**
   * Get song queue
   */
  getSongQueue(): SongRequest[] {
    return [...this.songQueue];
  }

  /**
   * Remove song from queue
   */
  removeFromQueue(requestId: string): void {
    this.songQueue = this.songQueue.filter(r => r.id !== requestId);
    this.saveSongQueue();
  }

  /**
   * Clear queue
   */
  clearQueue(): void {
    this.songQueue = [];
    this.saveSongQueue();
  }

  // ==================== Event Handling ====================

  /**
   * Subscribe to state changes
   */
  subscribe(callback: (state: OverlayState) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach(callback => callback(this.state));
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    this.listeners.clear();
  }
}

// Singleton instance
let serviceInstance: StreamingOverlayService | null = null;

/**
 * Get streaming overlay service instance
 */
export function getStreamingOverlayService(): StreamingOverlayService {
  if (!serviceInstance) {
    serviceInstance = new StreamingOverlayService();
  }
  return serviceInstance;
}
