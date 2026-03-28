/**
 * useOnlineLeaderboard Hook
 * Manages online leaderboard data with search, filtering, and player details
 */

import { useState, useEffect, useCallback } from 'react';
import { leaderboardService, ApiPlayer, ApiScore } from '@/lib/api/leaderboard-service';
import { HighscoreEntry, Difficulty, GameMode } from '@/types/game';

export interface PlayerDetail extends ApiPlayer {
  avgAccuracy: number;
  bestScore: number;
  recentScores: ApiScore[];
  songs: (ApiScore & { title: string; artist: string })[];
}

export interface SongLeaderboardEntry {
  id: string;
  rank: number;
  playerId: string;
  playerName: string;
  playerAvatar?: string;
  playerCountry?: string;
  score: number;
  maxScore: number;
  accuracy: number;
  difficulty: Difficulty;
  gameMode: GameMode;
  maxCombo: number;
  perfectNotes: number;
  goodNotes: number;
  missedNotes: number;
  playedAt: number;
}

export type LeaderboardTab = 'global' | 'songs' | 'search';

interface UseOnlineLeaderboardReturn {
  // State
  isLoading: boolean;
  error: string | null;
  connectionStatus: 'unknown' | 'connected' | 'failed';

  // Global leaderboard
  globalLeaderboard: ApiPlayer[];

  // Song leaderboard
  selectedSongId: string | null;
  songLeaderboard: SongLeaderboardEntry[];

  // Player details
  selectedPlayer: PlayerDetail | null;
  isLoadingPlayer: boolean;

  // Search
  searchQuery: string;
  searchResults: ApiPlayer[];
  isSearching: boolean;

  // Actions
  loadGlobalLeaderboard: (limit?: number) => Promise<void>;
  loadSongLeaderboard: (songId: string, songTitle: string, artist: string) => Promise<void>;
  loadPlayerDetail: (playerId: string) => Promise<void>;
  searchPlayers: (query: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setSelectedSongId: (songId: string | null) => void;
  setSelectedPlayer: (player: PlayerDetail | null) => void;
  testConnection: () => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function useOnlineLeaderboard(): UseOnlineLeaderboardReturn {
  // State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'failed'>('unknown');

  // Global leaderboard
  const [globalLeaderboard, setGlobalLeaderboard] = useState<ApiPlayer[]>([]);

  // Song leaderboard
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const [songLeaderboard, setSongLeaderboard] = useState<SongLeaderboardEntry[]>([]);

  // Player details
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerDetail | null>(null);
  const [isLoadingPlayer, setIsLoadingPlayer] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ApiPlayer[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Test connection
  const testConnection = useCallback(async (): Promise<boolean> => {
    try {
      const isConnected = await leaderboardService.testConnection();
      setConnectionStatus(isConnected ? 'connected' : 'failed');
      return isConnected;
    } catch {
      setConnectionStatus('failed');
      return false;
    }
  }, []);

  // Load global leaderboard
  const loadGlobalLeaderboard = useCallback(async (limit = 100) => {
    setIsLoading(true);
    setError(null);

    try {
      const isConnected = await testConnection();
      if (!isConnected) {
        throw new Error('Cannot connect to leaderboard server. Please check your internet connection.');
      }

      const players = await leaderboardService.getGlobalLeaderboard(limit);
      setGlobalLeaderboard(players);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load leaderboard';
      setError(errorMsg);
      setGlobalLeaderboard([]);
    } finally {
      setIsLoading(false);
    }
  }, [testConnection]);

  // Load song leaderboard
  const loadSongLeaderboard = useCallback(async (songId: string, songTitle: string, artist: string) => {
    setIsLoading(true);
    setError(null);
    setSelectedSongId(songId);

    try {
      const scores = await leaderboardService.getSongLeaderboard(songId);

      const entries: SongLeaderboardEntry[] = scores.map((score, index) => ({
        id: String(score.id),
        rank: index + 1,
        playerId: score.player_id,
        playerName: score.player_name || 'Unknown',
        playerAvatar: score.player_avatar,
        playerCountry: score.player_country,
        score: score.score,
        maxScore: score.max_score,
        accuracy: score.max_score > 0 ? (score.score / score.max_score) * 100 : 0,
        difficulty: score.difficulty === 1 ? 'easy' : score.difficulty === 2 ? 'medium' : 'hard',
        gameMode: score.game_mode as GameMode || 'standard',
        maxCombo: score.max_combo,
        perfectNotes: score.perfect_notes,
        goodNotes: score.good_notes,
        missedNotes: score.missed_notes,
        playedAt: new Date(score.created_at).getTime(),
      }));

      setSongLeaderboard(entries);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load song leaderboard';
      setError(errorMsg);
      setSongLeaderboard([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load player detail
  const loadPlayerDetail = useCallback(async (playerId: string) => {
    setIsLoadingPlayer(true);

    try {
      // Get player info
      const player = await leaderboardService.getPlayer(playerId);
      if (!player) {
        throw new Error('Player not found');
      }

      // Get player's songs
      const songs = await leaderboardService.getPlayerSongs(playerId);

      // Calculate average accuracy
      let totalAccuracy = 0;
      let count = 0;
      songs.forEach(song => {
        if (song.max_score > 0) {
          totalAccuracy += (song.score / song.max_score) * 100;
          count++;
        }
      });

      const avgAccuracy = count > 0 ? totalAccuracy / count : 0;
      const bestScore = songs.length > 0 ? Math.max(...songs.map(s => s.score)) : 0;

      const playerDetail: PlayerDetail = {
        ...player,
        avgAccuracy,
        bestScore,
        recentScores: songs.slice(0, 10),
        songs,
      };

      setSelectedPlayer(playerDetail);
    } catch (err) {
      console.error('Failed to load player detail:', err);
      setSelectedPlayer(null);
    } finally {
      setIsLoadingPlayer(false);
    }
  }, []);

  // Search players
  const searchPlayers = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    try {
      // Get all players and filter locally (API may not have search endpoint)
      const players = await leaderboardService.getPlayers();
      const filtered = players.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(filtered);
    } catch (err) {
      console.error('Search failed:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Refresh data
  const refresh = useCallback(async () => {
    setError(null);
    await loadGlobalLeaderboard();
  }, [loadGlobalLeaderboard]);

  // Test connection on mount
  useEffect(() => {
    testConnection();
  }, [testConnection]);

  return {
    isLoading,
    error,
    connectionStatus,
    globalLeaderboard,
    selectedSongId,
    songLeaderboard,
    selectedPlayer,
    isLoadingPlayer,
    searchQuery,
    searchResults,
    isSearching,
    loadGlobalLeaderboard,
    loadSongLeaderboard,
    loadPlayerDetail,
    searchPlayers,
    setSearchQuery,
    setSelectedSongId,
    setSelectedPlayer,
    testConnection,
    refresh,
  };
}

// Convert API player to HighscoreEntry format
export function apiPlayerToHighscore(player: ApiPlayer, index: number): HighscoreEntry {
  return {
    id: `global-${player.id}`,
    playerId: player.id,
    playerName: player.name,
    playerAvatar: player.avatar,
    playerColor: '#22D3EE',
    songId: '',
    songTitle: '',
    artist: '',
    score: player.total_score,
    accuracy: 0,
    maxCombo: 0,
    difficulty: 'medium',
    gameMode: 'standard',
    rating: 'good',
    rankTitle: `${player.games_played} games`,
    playedAt: Date.now(),
  };
}

// Convert song leaderboard entry to HighscoreEntry
export function songEntryToHighscore(entry: SongLeaderboardEntry, songTitle: string, artist: string): HighscoreEntry {
  const rating = entry.accuracy >= 95 ? 'perfect'
    : entry.accuracy >= 90 ? 'excellent'
    : entry.accuracy >= 80 ? 'good'
    : entry.accuracy >= 70 ? 'okay'
    : 'poor';

  return {
    id: entry.id,
    playerId: entry.playerId,
    playerName: entry.playerName,
    playerAvatar: entry.playerAvatar,
    playerColor: '#22D3EE',
    songId: '',
    songTitle,
    artist,
    score: entry.score,
    accuracy: entry.accuracy,
    maxCombo: entry.maxCombo,
    difficulty: entry.difficulty,
    gameMode: entry.gameMode,
    rating,
    rankTitle: '',
    playedAt: entry.playedAt,
  };
}

export default useOnlineLeaderboard;
