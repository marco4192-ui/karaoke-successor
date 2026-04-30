/**
 * Leaderboard Service
 * Connects to the PHP API for online leaderboards
 */

import type { PlayerProfile, PlayerStats, HighscoreEntry, Song, Difficulty, GameMode, Achievement } from '@/types/game';

// API Configuration — configurable via NEXT_PUBLIC_LEADERBOARD_URL env variable
const API_BASE_URL = process.env.NEXT_PUBLIC_LEADERBOARD_URL || 'https://hosting236176.ae88b.netcup.net/leaderboard-api';

export interface ApiPlayer {
  id: string;
  name: string;
  avatar?: string;
  country?: string;
  total_score: number;
  games_played: number;
  show_on_leaderboard: number;
  show_photo: number;
  show_country: number;
}

export interface ApiScore {
  id: number;
  player_id: string;
  song_id: string;
  score: number;
  max_score: number;
  difficulty: number;
  game_mode: string;
  perfect_notes: number;
  good_notes: number;
  missed_notes: number;
  max_combo: number;
  created_at: string;
  player_name?: string;
  player_avatar?: string;
  player_country?: string;
}

export interface ApiSong {
  id: string;
  title: string;
  artist: string;
  duration: number;
  difficulty: number;
  play_count: number;
}

class LeaderboardService {
  private apiUrl: string;
  private apiKey: string | null = null;

  constructor(apiUrl: string = API_BASE_URL) {
    this.apiUrl = apiUrl;
  }

  /**
   * Make API request with timeout
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.apiUrl}${endpoint}`;
    const timeout = 30000; // 30 second timeout

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        // Try to parse error as JSON, fallback to text
        let errorMessage = `HTTP ${response.status}`;
        try {
          const text = await response.text();
          try {
            const error = JSON.parse(text);
            errorMessage = error.message || errorMessage;
          } catch {
            // Not JSON, use raw text if short
            if (text.length < 100) errorMessage = text;
          }
        } catch {
          // Ignore parsing errors
        }
        throw new Error(errorMessage);
      }

      return response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.request<{ name: string }>('/');
      return result.name === 'Karaoke Leaderboard API';
    } catch {
      return false;
    }
  }

  /**
   * Get global leaderboard
   */
  async getGlobalLeaderboard(limit = 100, offset = 0): Promise<ApiPlayer[]> {
    const result = await this.request<{ leaderboard: ApiPlayer[] }>(
      `/leaderboard?limit=${limit}&offset=${offset}`
    );
    return result.leaderboard;
  }

  /**
   * Get leaderboard for a specific song
   */
  async getSongLeaderboard(songId: string, limit = 100): Promise<ApiScore[]> {
    const result = await this.request<{ leaderboard: ApiScore[] }>(
      `/leaderboard/${encodeURIComponent(songId)}?limit=${limit}`
    );
    return result.leaderboard;
  }

  /**
   * Register or update player
   */
  async savePlayer(profile: PlayerProfile): Promise<{ success: boolean; player_id: string }> {
    return this.request('/players', {
      method: 'POST',
      body: JSON.stringify({
        id: profile.id,
        name: profile.name,
        avatar: profile.avatar,
        country: profile.country,
        showOnLeaderboard: profile.privacy?.showOnLeaderboard ?? true,
        showPhoto: profile.privacy?.showPhoto ?? true,
        showCountry: profile.privacy?.showCountry ?? true,
      }),
    });
  }

  /**
   * Submit a score
   */
  async submitScore(
    player: PlayerProfile,
    song: Song,
    score: number,
    maxScore: number,
    stats: {
      perfectNotes: number;
      goodNotes: number;
      missedNotes: number;
      maxCombo: number;
    },
    difficulty: Difficulty,
    gameMode: GameMode
  ): Promise<{ success: boolean; rank: number; is_new_high_score: boolean }> {
    const result = await this.request<{ success: boolean; rank: number; is_new_high_score: boolean }>('/scores', {
      method: 'POST',
      body: JSON.stringify({
        playerId: player.id,
        songId: song.id,
        score,
        maxScore,
        difficulty: difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3,
        gameMode,
        ...stats,
      }),
    });

    return result;
  }

  /**
   * Register a song in the database
   */
  async registerSong(song: Song): Promise<{ success: boolean; song_id: string }> {
    return this.request('/songs', {
      method: 'POST',
      body: JSON.stringify({
        id: song.id,
        title: song.title,
        artist: song.artist,
        duration: Math.floor(song.duration / 1000),
        difficulty: song.rating,
      }),
    });
  }

  // ==================== PROFILE SYNC METHODS ====================

  /**
   * Upload full player profile to cloud
   */
  async uploadProfile(profile: PlayerProfile, highscores: Record<string, HighscoreEntry[]>): Promise<{ success: boolean; player_id: string; sync_code: string }> {
    return this.request('/profiles', {
      method: 'POST',
      body: JSON.stringify({
        id: profile.id,
        name: profile.name,
        avatar: profile.avatar,
        country: profile.country,
        color: profile.color,
        stats: profile.stats,
        highscores,
        achievements: profile.achievements,
        settings: {
          privacy: profile.privacy,
        },
      }),
    });
  }

  /**
   * Download profile by ID
   */
  async downloadProfile(profileId: string): Promise<{
    id: string;
    sync_code: string;
    name: string;
    avatar: string | null;
    country: string | null;
    color: string;
    stats: PlayerStats;
    highscores: Record<string, HighscoreEntry[]>;
    achievements: Achievement[];
    settings: { privacy: PlayerProfile['privacy'] };
  } | null> {
    try {
      const result = await this.request<{ profile: {
        id: string;
        sync_code: string;
        name: string;
        avatar: string | null;
        country: string | null;
        color: string;
        stats: PlayerStats;
        highscores: Record<string, HighscoreEntry[]>;
        achievements: Achievement[];
        settings: { privacy: PlayerProfile['privacy'] };
      } }>(`/profiles/${profileId}`);
      return result.profile;
    } catch {
      return null;
    }
  }

  /**
   * Download profile by sync code
   */
  async downloadProfileByCode(syncCode: string): Promise<{
    id: string;
    sync_code: string;
    name: string;
    avatar: string | null;
    country: string | null;
    color: string;
    stats: PlayerStats;
    highscores: Record<string, HighscoreEntry[]>;
    achievements: Achievement[];
    settings: { privacy: PlayerProfile['privacy'] };
  } | null> {
    try {
      const result = await this.request<{ profile: {
        id: string;
        sync_code: string;
        name: string;
        avatar: string | null;
        country: string | null;
        color: string;
        stats: PlayerStats;
        highscores: Record<string, HighscoreEntry[]>;
        achievements: Achievement[];
        settings: { privacy: PlayerProfile['privacy'] };
      } }>(`/profiles/code/${syncCode.toUpperCase()}`);
      return result.profile;
    } catch {
      return null;
    }
  }

}

// Export singleton instance
export const leaderboardService = new LeaderboardService();
