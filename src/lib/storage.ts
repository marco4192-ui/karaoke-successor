// Storage Abstraction Layer
// Provides a consistent API for localStorage operations with type safety
// This is especially important for Tauri apps where localStorage may behave differently

import { logger } from '@/lib/logger';

/**
 * Storage keys used throughout the application
 * Centralized for easier management and to prevent typos
 */
export const STORAGE_KEYS = {
  // App settings
  LANGUAGE: 'karaoke-language',
  THEME: 'karaoke-theme',
  SONGS_FOLDER: 'karaoke-songs-folder',
  PREVIEW_VOLUME: 'karaoke-preview-volume',
  MIC_SENSITIVITY: 'karaoke-mic-sensitivity',
  DEFAULT_DIFFICULTY: 'karaoke-default-difficulty',
  SHOW_PITCH_GUIDE: 'karaoke-show-pitch-guide',
  LYRICS_STYLE: 'karaoke-lyrics-style',
  BG_VIDEO: 'karaoke-bg-video',
  ANIMATED_BG: 'karaoke-animated-bg',
  NOTE_STYLE: 'karaoke-note-style',
  NOTE_SHAPE: 'karaoke-note-shape',

  // Song library
  CUSTOM_SONGS: 'karaoke-successor-custom-songs',
  LIBRARY_SETTINGS: 'karaoke-library-settings',
  SONGS: 'karaoke-songs',

  // Player data
  DEVICE_ID: 'karaoke-device-id',
  HIGHSCORES: 'karaoke-highscores',
  PLAYER_PROGRESSION: 'karaoke-player-stats',
  EXTENDED_STATS: 'karaoke-extended-stats',

  // Playlists
  PLAYLISTS: 'karaoke-playlists',
  PLAYLIST_FOLDERS: 'karaoke-playlist-folders',
  JUKEBOX_PLAYLIST: 'jukebox-playlist',

  // Daily challenge
  DAILY_CHALLENGE: 'karaoke-daily-challenge',
  DAILY_LEADERBOARD: 'karaoke-daily-leaderboard',
  PLAYER_DAILY_STATS: 'karaoke-player-daily-stats',
  CHALLENGE_MODE: 'karaoke-challenge-mode',

  // Microphone
  MIC_CONFIG: 'karaoke-mic-config',
  MULTI_MIC_CONFIG: 'karaoke-multi-mic-config',

  // Webcam
  WEBCAM_CONFIG: 'karaoke-webcam-config',

  // Mobile
  CONNECTION_CODE: 'karaoke-connection-code',
  MOBILE_PROFILE: 'karaoke-mobile-profile',

  // Streaming
  STREAM_CONFIG: 'lastStreamConfig',

  // Library cache
  LIBRARY_CACHE: 'karaoke-library',
} as const;

/**
 * Storage abstraction object with get, set, remove methods
 */
export const storage = {
  /**
   * Get a value from localStorage
   * @param key - The storage key
   * @param defaultValue - Default value if key doesn't exist
   * @returns The stored value or defaultValue
   */
  get<T = string>(key: string, defaultValue?: T): T | undefined {
    try {
      if (typeof window === 'undefined') return defaultValue;
      const value = localStorage.getItem(key);
      if (value === null) return defaultValue;
      return value as T;
    } catch {
      return defaultValue;
    }
  },

  /**
   * Get a JSON parsed value from localStorage
   * @param key - The storage key
   * @param defaultValue - Default value if key doesn't exist or parsing fails
   * @returns The parsed JSON value or defaultValue
   */
  getJSON<T>(key: string, defaultValue?: T): T | undefined {
    try {
      if (typeof window === 'undefined') return defaultValue;
      const value = localStorage.getItem(key);
      if (value === null) return defaultValue;
      return JSON.parse(value) as T;
    } catch {
      return defaultValue;
    }
  },

  /**
   * Get a boolean value from localStorage
   * @param key - The storage key
   * @param defaultValue - Default value if key doesn't exist
   * @returns The boolean value or defaultValue
   */
  getBool(key: string, defaultValue: boolean = true): boolean {
    try {
      if (typeof window === 'undefined') return defaultValue;
      const value = localStorage.getItem(key);
      if (value === null) return defaultValue;
      return value === 'true';
    } catch {
      return defaultValue;
    }
  },

  /**
   * Get a number value from localStorage
   * @param key - The storage key
   * @param defaultValue - Default value if key doesn't exist
   * @returns The number value or defaultValue
   */
  getNumber(key: string, defaultValue: number = 0): number {
    try {
      if (typeof window === 'undefined') return defaultValue;
      const value = localStorage.getItem(key);
      if (value === null) return defaultValue;
      const parsed = parseInt(value, 10);
      return isNaN(parsed) ? defaultValue : parsed;
    } catch {
      return defaultValue;
    }
  },

  /**
   * Set a value in localStorage
   * @param key - The storage key
   * @param value - The value to store
   */
  set(key: string, value: string | number | boolean): void {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(key, String(value));
    } catch (error) {
      logger.error('[Storage]', `Failed to set ${key}:`, error);
    }
  },

  /**
   * Set a JSON value in localStorage
   * @param key - The storage key
   * @param value - The value to JSON stringify and store
   */
  setJSON<T>(key: string, value: T): void {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      logger.error('[Storage]', `Failed to set JSON ${key}:`, error);
    }
  },

  /**
   * Remove a value from localStorage
   * @param key - The storage key
   */
  remove(key: string): void {
    try {
      if (typeof window === 'undefined') return;
      localStorage.removeItem(key);
    } catch (error) {
      logger.error('[Storage]', `Failed to remove ${key}:`, error);
    }
  },

  /**
   * Clear all localStorage
   */
  clear(): void {
    try {
      if (typeof window === 'undefined') return;
      localStorage.clear();
    } catch (error) {
      logger.error('[Storage]', 'Failed to clear:', error);
    }
  },

  /**
   * Get all keys matching a prefix
   * @param prefix - The prefix to match
   * @returns Array of matching keys
   */
  getKeysByPrefix(prefix: string): string[] {
    try {
      if (typeof window === 'undefined') return [];
      return Object.keys(localStorage).filter(k => k.startsWith(prefix));
    } catch {
      return [];
    }
  },

  /**
   * Remove all keys matching a prefix
   * @param prefix - The prefix to match
   */
  removeByPrefix(prefix: string): void {
    try {
      if (typeof window === 'undefined') return;
      const keys = Object.keys(localStorage).filter(k => k.startsWith(prefix));
      keys.forEach(k => localStorage.removeItem(k));
    } catch (error) {
      logger.error('[Storage]', `Failed to remove by prefix ${prefix}:`, error);
    }
  },
};

export default storage;
