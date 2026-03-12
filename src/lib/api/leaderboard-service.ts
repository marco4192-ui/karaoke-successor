/**
 * Leaderboard Service
 * Connects to the PHP API for online leaderboards
 */

import type { PlayerProfile, PlayerStats, HighscoreEntry, Song, Difficulty, GameMode, Achievement } from '@/types/game';

// API Configuration - Update this to your hosted API URL
const API_BASE_URL = 'https://hosting236176.ae88b.netcup.net/leaderboard-api';

// Country codes for player profiles
export const COUNTRIES: Record<string, string> = {
  'DE': 'Deutschland',
  'AT': 'Österreich',
  'CH': 'Schweiz',
  'US': 'United States',
  'GB': 'United Kingdom',
  'FR': 'France',
  'IT': 'Italy',
  'ES': 'Spain',
  'NL': 'Netherlands',
  'PL': 'Poland',
  'CZ': 'Czech Republic',
  'JP': 'Japan',
  'KR': 'South Korea',
  'AU': 'Australia',
  'CA': 'Canada',
  'BR': 'Brazil',
  'MX': 'Mexico',
  'RU': 'Russia',
  'CN': 'China',
  'IN': 'India',
  // Add more as needed
};

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
   * Set API key for authenticated requests
   */
  setApiKey(key: string) {
    this.apiKey = key;
  }

  /**
   * Make API request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.apiUrl}${endpoint}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
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
   * Get all players
   */
  async getPlayers(): Promise<ApiPlayer[]> {
    const result = await this.request<{ players: ApiPlayer[] }>('/players');
    return result.players;
  }

  /**
   * Get player by ID
   */
  async getPlayer(playerId: string): Promise<ApiPlayer | null> {
    try {
      const result = await this.request<{ player: ApiPlayer }>(`/players/${playerId}`);
      return result.player;
    } catch {
      return null;
    }
  }

  /**
   * Get all songs a player has scores for
   */
  async getPlayerSongs(playerId: string): Promise<(ApiScore & { title: string; artist: string })[]> {
    const result = await this.request<{ scores: (ApiScore & { title: string; artist: string })[] }>(
      `/player/${playerId}/songs`
    );
    return result.scores;
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
    const result = await this.request('/scores', {
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

  /**
   * Get all songs
   */
  async getSongs(): Promise<ApiSong[]> {
    const result = await this.request<{ songs: ApiSong[] }>('/songs');
    return result.songs;
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

  /**
   * Convert API player to local PlayerProfile format
   */
  apiPlayerToLocal(apiPlayer: ApiPlayer): Partial<PlayerProfile> {
    return {
      id: apiPlayer.id,
      name: apiPlayer.name,
      avatar: apiPlayer.avatar,
      totalScore: apiPlayer.total_score,
      gamesPlayed: apiPlayer.games_played,
      country: apiPlayer.country,
      privacy: {
        showOnLeaderboard: apiPlayer.show_on_leaderboard === 1,
        showPhoto: apiPlayer.show_photo === 1,
        showCountry: apiPlayer.show_country === 1,
      },
    };
  }

  /**
   * Convert API score to local HighscoreEntry format
   */
  apiScoreToHighscore(apiScore: ApiScore, songTitle: string, artist: string): HighscoreEntry {
    const accuracy = apiScore.max_score > 0
      ? (apiScore.score / apiScore.max_score) * 100
      : 0;

    const rating = accuracy >= 95 ? 'perfect'
      : accuracy >= 90 ? 'excellent'
      : accuracy >= 80 ? 'good'
      : accuracy >= 70 ? 'okay'
      : 'poor';

    return {
      id: String(apiScore.id),
      playerId: apiScore.player_id,
      playerName: apiScore.player_name || 'Unknown',
      playerAvatar: apiScore.player_avatar,
      playerColor: '#FF6B6B',
      songId: apiScore.song_id,
      songTitle,
      artist,
      score: apiScore.score,
      accuracy,
      maxCombo: apiScore.max_combo,
      difficulty: apiScore.difficulty === 1 ? 'easy' : apiScore.difficulty === 2 ? 'medium' : 'hard',
      gameMode: apiScore.game_mode as GameMode,
      rating,
      rankTitle: '',
      playedAt: new Date(apiScore.created_at).getTime(),
    };
  }
}

// Export singleton instance
export const leaderboardService = new LeaderboardService();

// Export class for custom instances
export { LeaderboardService };
