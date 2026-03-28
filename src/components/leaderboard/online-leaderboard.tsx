'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { leaderboardService, ApiPlayer, ApiScore } from '@/lib/api/leaderboard-service';
import { useGameStore } from '@/lib/game/store';
import { Difficulty, GameMode } from '@/types/game';

// Country data with flags
const COUNTRIES: Record<string, { name: string; flag: string }> = {
  DE: { name: 'Deutschland', flag: '🇩🇪' },
  AT: { name: 'Österreich', flag: '🇦🇹' },
  CH: { name: 'Schweiz', flag: '🇨🇭' },
  US: { name: 'USA', flag: '🇺🇸' },
  GB: { name: 'United Kingdom', flag: '🇬🇧' },
  FR: { name: 'France', flag: '🇫🇷' },
  ES: { name: 'España', flag: '🇪🇸' },
  IT: { name: 'Italia', flag: '🇮🇹' },
  NL: { name: 'Netherlands', flag: '🇳🇱' },
  PL: { name: 'Poland', flag: '🇵🇱' },
  CZ: { name: 'Czech Republic', flag: '🇨🇿' },
  JP: { name: '日本', flag: '🇯🇵' },
  KR: { name: '대한민국', flag: '🇰🇷' },
  AU: { name: 'Australia', flag: '🇦🇺' },
  CA: { name: 'Canada', flag: '🇨🇦' },
  BR: { name: 'Brazil', flag: '🇧🇷' },
  MX: { name: 'Mexico', flag: '🇲🇽' },
  RU: { name: 'Russia', flag: '🇷🇺' },
  CN: { name: '中国', flag: '🇨🇳' },
  IN: { name: 'India', flag: '🇮🇳' },
};

// Extended player interface with detailed stats
interface PlayerDetail {
  id: string;
  name: string;
  avatar?: string;
  country?: string;
  total_score: number;
  games_played: number;
  avgAccuracy: number;
  bestScore: number;
  recentScores: (ApiScore & { title: string; artist: string })[];
  songs: (ApiScore & { title: string; artist: string })[];
}

// Song leaderboard entry
interface SongLeaderboardEntry {
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

// Online song with leaderboard data
interface OnlineSong {
  id: string;
  title: string;
  artist: string;
  playCount: number;
}

type LeaderboardTab = 'global' | 'songs' | 'search' | 'privacy';

export function OnlineLeaderboard() {
  // Store
  const { profiles, activeProfileId, onlineEnabled, setOnlineEnabled } = useGameStore();
  const activeProfile = profiles.find(p => p.id === activeProfileId);

  // Tab state
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('global');

  // Loading and error states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'failed'>('unknown');

  // Global leaderboard
  const [globalLeaderboard, setGlobalLeaderboard] = useState<ApiPlayer[]>([]);

  // Song leaderboard
  const [songs, setSongs] = useState<OnlineSong[]>([]);
  const [selectedSong, setSelectedSong] = useState<OnlineSong | null>(null);
  const [songLeaderboard, setSongLeaderboard] = useState<SongLeaderboardEntry[]>([]);
  const [isLoadingSongs, setIsLoadingSongs] = useState(false);
  const [isLoadingSongLeaderboard, setIsLoadingSongLeaderboard] = useState(false);

  // Player details
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerDetail | null>(null);
  const [isLoadingPlayer, setIsLoadingPlayer] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ApiPlayer[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Privacy settings
  const [privacySettings, setPrivacySettings] = useState({
    showOnLeaderboard: activeProfile?.privacy?.showOnLeaderboard ?? true,
    showPhoto: activeProfile?.privacy?.showPhoto ?? true,
    showCountry: activeProfile?.privacy?.showCountry ?? true,
  });
  const [isSavingPrivacy, setIsSavingPrivacy] = useState(false);

  // Test connection on mount
  useEffect(() => {
    testConnection();
  }, []);

  // Load global leaderboard on mount
  useEffect(() => {
    if (connectionStatus === 'connected') {
      loadGlobalLeaderboard();
    }
  }, [connectionStatus]);

  // Test API connection
  const testConnection = async () => {
    try {
      const isConnected = await leaderboardService.testConnection();
      setConnectionStatus(isConnected ? 'connected' : 'failed');
      if (!isConnected) {
        setError('Cannot connect to leaderboard server. Please check your internet connection.');
      }
    } catch {
      setConnectionStatus('failed');
      setError('Failed to connect to leaderboard server.');
    }
  };

  // Load global leaderboard
  const loadGlobalLeaderboard = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await leaderboardService.getGlobalLeaderboard(100);
      setGlobalLeaderboard(result || []);
    } catch (err) {
      setError('Could not load global leaderboard.');
      setGlobalLeaderboard([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load songs list
  const loadSongs = async () => {
    setIsLoadingSongs(true);
    try {
      const result = await leaderboardService.getSongs();
      setSongs(result.map(s => ({
        id: s.id,
        title: s.title,
        artist: s.artist,
        playCount: s.play_count,
      })).sort((a, b) => b.playCount - a.playCount));
    } catch (err) {
      console.error('Failed to load songs:', err);
    } finally {
      setIsLoadingSongs(false);
    }
  };

  // Load song leaderboard
  const loadSongLeaderboard = async (song: OnlineSong) => {
    setSelectedSong(song);
    setIsLoadingSongLeaderboard(true);
    try {
      const scores = await leaderboardService.getSongLeaderboard(song.id);
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
        gameMode: (score.game_mode as GameMode) || 'standard',
        maxCombo: score.max_combo,
        perfectNotes: score.perfect_notes,
        goodNotes: score.good_notes,
        missedNotes: score.missed_notes,
        playedAt: new Date(score.created_at).getTime(),
      }));
      setSongLeaderboard(entries);
    } catch (err) {
      console.error('Failed to load song leaderboard:', err);
      setSongLeaderboard([]);
    } finally {
      setIsLoadingSongLeaderboard(false);
    }
  };

  // Load player detail
  const loadPlayerDetail = async (playerId: string) => {
    setIsLoadingPlayer(true);
    try {
      const player = await leaderboardService.getPlayer(playerId);
      if (!player) {
        throw new Error('Player not found');
      }

      const songsData = await leaderboardService.getPlayerSongs(playerId);
      let totalAccuracy = 0;
      let count = 0;
      songsData.forEach(song => {
        if (song.max_score > 0) {
          totalAccuracy += (song.score / song.max_score) * 100;
          count++;
        }
      });

      const playerDetail: PlayerDetail = {
        id: player.id,
        name: player.name,
        avatar: player.avatar,
        country: player.country,
        total_score: player.total_score,
        games_played: player.games_played,
        avgAccuracy: count > 0 ? totalAccuracy / count : 0,
        bestScore: songsData.length > 0 ? Math.max(...songsData.map(s => s.score)) : 0,
        recentScores: songsData.slice(0, 10),
        songs: songsData,
      };

      setSelectedPlayer(playerDetail);
    } catch (err) {
      console.error('Failed to load player detail:', err);
    } finally {
      setIsLoadingPlayer(false);
    }
  };

  // Search players
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const players = await leaderboardService.getPlayers();
      const filtered = players.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchResults(filtered);
    } catch (err) {
      console.error('Search failed:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  // Save privacy settings
  const savePrivacySettings = async () => {
    if (!activeProfile) return;

    setIsSavingPrivacy(true);
    try {
      await leaderboardService.savePlayer({
        ...activeProfile,
        privacy: privacySettings,
      });

      // Update local profile
      useGameStore.getState().updateProfile(activeProfile.id, {
        privacy: privacySettings,
      });
    } catch (err) {
      console.error('Failed to save privacy settings:', err);
    } finally {
      setIsSavingPrivacy(false);
    }
  };

  // Get rank badge
  const getRankBadge = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  // Get rating badge
  const getRatingBadge = (accuracy: number) => {
    if (accuracy >= 95) return { label: 'Perfect', color: 'bg-purple-500' };
    if (accuracy >= 90) return { label: 'Excellent', color: 'bg-cyan-500' };
    if (accuracy >= 80) return { label: 'Great', color: 'bg-green-500' };
    if (accuracy >= 70) return { label: 'Good', color: 'bg-yellow-500' };
    if (accuracy >= 60) return { label: 'Okay', color: 'bg-orange-500' };
    return { label: 'Poor', color: 'bg-red-500' };
  };

  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Load songs when songs tab is active
  useEffect(() => {
    if (activeTab === 'songs' && songs.length === 0 && connectionStatus === 'connected') {
      loadSongs();
    }
  }, [activeTab, songs.length, connectionStatus]);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          🏆 Online Leaderboard
        </h1>
        <p className="text-white/60">Compete with singers worldwide!</p>
      </div>

      {/* Connection Status */}
      {connectionStatus === 'failed' && (
        <Card className="bg-red-500/10 border-red-500/30 mb-4">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-400 font-medium">Connection Failed</p>
                <p className="text-red-400/60 text-sm">Could not connect to leaderboard server.</p>
              </div>
              <Button onClick={testConnection} size="sm" className="bg-red-500 hover:bg-red-400">
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as LeaderboardTab)} className="w-full">
        <TabsList className="grid grid-cols-4 mb-6 bg-white/5 border border-white/10">
          <TabsTrigger value="global" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
            🌍 Global
          </TabsTrigger>
          <TabsTrigger value="songs" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">
            🎵 Songs
          </TabsTrigger>
          <TabsTrigger value="search" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">
            🔍 Search
          </TabsTrigger>
          <TabsTrigger value="privacy" className="data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400">
            🔒 Privacy
          </TabsTrigger>
        </TabsList>

        {/* Global Leaderboard Tab */}
        <TabsContent value="global">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto" />
              <p className="text-white/60 mt-4">Loading leaderboard...</p>
            </div>
          ) : globalLeaderboard.length === 0 ? (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="py-12 text-center text-white/60">
                <p className="text-4xl mb-4">🎤</p>
                <p>No players on the leaderboard yet!</p>
                <p className="text-sm mt-2">Be the first to submit a score.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {globalLeaderboard.map((player, i) => {
                const country = player.country ? COUNTRIES[player.country] : null;
                return (
                  <Card
                    key={player.id}
                    className="bg-white/5 border-white/10 hover:bg-white/10 cursor-pointer transition-colors"
                    onClick={() => loadPlayerDetail(player.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 text-center text-xl font-bold">
                          {getRankBadge(i + 1)}
                        </div>
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold overflow-hidden bg-gradient-to-br from-cyan-400 to-purple-500"
                        >
                          {player.avatar ? (
                            <img src={player.avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            player.name[0].toUpperCase()
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{player.name}</span>
                            {country && <span title={country.name}>{country.flag}</span>}
                          </div>
                          <div className="text-sm text-white/60">
                            {player.games_played} games played
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-cyan-400">
                            {player.total_score.toLocaleString()}
                          </div>
                          <div className="text-xs text-white/40">total points</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Songs Tab */}
        <TabsContent value="songs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Songs List */}
            <div>
              <h3 className="text-lg font-semibold mb-3 text-white/80">Popular Songs</h3>
              {isLoadingSongs ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full mx-auto" />
                </div>
              ) : (
                <ScrollArea className="h-[500px] pr-2">
                  <div className="space-y-2">
                    {songs.map((song) => (
                      <Card
                        key={song.id}
                        className={`bg-white/5 border-white/10 cursor-pointer transition-colors ${
                          selectedSong?.id === song.id ? 'border-purple-500 bg-purple-500/10' : 'hover:bg-white/10'
                        }`}
                        onClick={() => loadSongLeaderboard(song)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded bg-white/10 flex items-center justify-center text-xl">
                              🎵
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{song.title}</p>
                              <p className="text-sm text-white/60 truncate">{song.artist}</p>
                            </div>
                            <div className="text-xs text-white/40">
                              {song.playCount} plays
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>

            {/* Song Leaderboard */}
            <div>
              <h3 className="text-lg font-semibold mb-3 text-white/80">
                {selectedSong ? `🏆 ${selectedSong.title}` : 'Select a song'}
              </h3>
              {isLoadingSongLeaderboard ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto" />
                </div>
              ) : selectedSong ? songLeaderboard.length === 0 ? (
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="py-8 text-center text-white/60">
                    <p>No scores yet for this song!</p>
                  </CardContent>
                </Card>
              ) : (
                <ScrollArea className="h-[500px] pr-2">
                  <div className="space-y-2">
                    {songLeaderboard.map((entry) => {
                      const rating = getRatingBadge(entry.accuracy);
                      return (
                        <Card
                          key={entry.id}
                          className="bg-white/5 border-white/10 hover:bg-white/10 cursor-pointer"
                          onClick={() => loadPlayerDetail(entry.playerId)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 text-center font-bold">
                                {getRankBadge(entry.rank)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium truncate">{entry.playerName}</span>
                                  {entry.playerCountry && COUNTRIES[entry.playerCountry] && (
                                    <span title={COUNTRIES[entry.playerCountry].name}>
                                      {COUNTRIES[entry.playerCountry].flag}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-white/60">
                                  <span>{entry.accuracy.toFixed(1)}%</span>
                                  <span>•</span>
                                  <span>{entry.maxCombo}x combo</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-cyan-400">{entry.score.toLocaleString()}</div>
                                <Badge className={`text-xs ${rating.color}`}>{rating.label}</Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </ScrollArea>
              ) : (
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="py-12 text-center text-white/60">
                    <p className="text-4xl mb-4">🎵</p>
                    <p>Select a song to view its leaderboard</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Search Tab */}
        <TabsContent value="search">
          <div className="mb-6">
            <div className="flex gap-2">
              <Input
                placeholder="Search players by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="bg-white/5 border-white/10 text-white"
              />
              <Button onClick={handleSearch} className="bg-green-500 hover:bg-green-400" disabled={isSearching}>
                {isSearching ? 'Searching...' : 'Search'}
              </Button>
            </div>
          </div>

          {searchResults.length === 0 && searchQuery && !isSearching ? (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="py-12 text-center text-white/60">
                <p className="text-4xl mb-4">🔍</p>
                <p>No players found for "{searchQuery}"</p>
              </CardContent>
            </Card>
          ) : searchResults.length === 0 ? (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="py-12 text-center text-white/60">
                <p className="text-4xl mb-4">🔍</p>
                <p>Enter a name to search for players</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {searchResults.map((player, i) => {
                const country = player.country ? COUNTRIES[player.country] : null;
                return (
                  <Card
                    key={player.id}
                    className="bg-white/5 border-white/10 hover:bg-white/10 cursor-pointer transition-colors"
                    onClick={() => loadPlayerDetail(player.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold overflow-hidden bg-gradient-to-br from-green-400 to-cyan-500">
                          {player.avatar ? (
                            <img src={player.avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            player.name[0].toUpperCase()
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{player.name}</span>
                            {country && <span title={country.name}>{country.flag}</span>}
                          </div>
                          <div className="text-sm text-white/60">
                            {player.games_played} games • {player.total_score.toLocaleString()} pts
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Privacy Settings Tab */}
        <TabsContent value="privacy">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🔒 Privacy Settings
              </CardTitle>
              <CardDescription>
                Control what information is visible on the online leaderboard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!activeProfile ? (
                <div className="text-center py-4 text-white/60">
                  <p>Please select a profile to manage privacy settings.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {/* Show on Leaderboard */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Show on Leaderboard</p>
                        <p className="text-sm text-white/60">Allow your scores to appear in global rankings</p>
                      </div>
                      <Button
                        variant={privacySettings.showOnLeaderboard ? 'default' : 'outline'}
                        onClick={() => setPrivacySettings(s => ({ ...s, showOnLeaderboard: !s.showOnLeaderboard }))}
                        className={privacySettings.showOnLeaderboard ? 'bg-cyan-500' : 'border-white/20'}
                      >
                        {privacySettings.showOnLeaderboard ? 'Visible' : 'Hidden'}
                      </Button>
                    </div>

                    <Separator className="bg-white/10" />

                    {/* Show Photo */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Show Profile Photo</p>
                        <p className="text-sm text-white/60">Display your avatar on the leaderboard</p>
                      </div>
                      <Button
                        variant={privacySettings.showPhoto ? 'default' : 'outline'}
                        onClick={() => setPrivacySettings(s => ({ ...s, showPhoto: !s.showPhoto }))}
                        className={privacySettings.showPhoto ? 'bg-cyan-500' : 'border-white/20'}
                      >
                        {privacySettings.showPhoto ? 'Visible' : 'Hidden'}
                      </Button>
                    </div>

                    <Separator className="bg-white/10" />

                    {/* Show Country */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Show Country</p>
                        <p className="text-sm text-white/60">Display your country flag on the leaderboard</p>
                      </div>
                      <Button
                        variant={privacySettings.showCountry ? 'default' : 'outline'}
                        onClick={() => setPrivacySettings(s => ({ ...s, showCountry: !s.showCountry }))}
                        className={privacySettings.showCountry ? 'bg-cyan-500' : 'border-white/20'}
                      >
                        {privacySettings.showCountry ? 'Visible' : 'Hidden'}
                      </Button>
                    </div>
                  </div>

                  <Separator className="bg-white/10" />

                  {/* Save Button */}
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-white/60">
                      Profile: <span className="text-white font-medium">{activeProfile.name}</span>
                    </p>
                    <Button
                      onClick={savePrivacySettings}
                      disabled={isSavingPrivacy}
                      className="bg-orange-500 hover:bg-orange-400"
                    >
                      {isSavingPrivacy ? 'Saving...' : 'Save Settings'}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Player Detail Modal */}
      {selectedPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <Card className="bg-gray-900 border-white/20 text-white max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b border-white/10">
              <CardTitle className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl overflow-hidden bg-gradient-to-br from-cyan-400 to-purple-500">
                  {selectedPlayer.avatar ? (
                    <img src={selectedPlayer.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    selectedPlayer.name[0]
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    {selectedPlayer.name}
                    {selectedPlayer.country && COUNTRIES[selectedPlayer.country] && (
                      <span className="text-xl" title={COUNTRIES[selectedPlayer.country].name}>
                        {COUNTRIES[selectedPlayer.country].flag}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-white/60 font-normal">
                    {selectedPlayer.games_played} games played
                  </p>
                </div>
              </CardTitle>
              <Button variant="ghost" onClick={() => setSelectedPlayer(null)} className="text-white/60 hover:text-white">
                ✕
              </Button>
            </CardHeader>
            <CardContent className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Stats Overview */}
              <div className="grid grid-cols-4 gap-3 mb-6">
                <div className="p-4 bg-white/5 rounded-lg text-center">
                  <div className="text-2xl font-bold text-cyan-400">{selectedPlayer.total_score.toLocaleString()}</div>
                  <div className="text-xs text-white/60">Total Score</div>
                </div>
                <div className="p-4 bg-white/5 rounded-lg text-center">
                  <div className="text-2xl font-bold text-purple-400">{selectedPlayer.bestScore.toLocaleString()}</div>
                  <div className="text-xs text-white/60">Best Score</div>
                </div>
                <div className="p-4 bg-white/5 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-400">{selectedPlayer.avgAccuracy.toFixed(1)}%</div>
                  <div className="text-xs text-white/60">Avg Accuracy</div>
                </div>
                <div className="p-4 bg-white/5 rounded-lg text-center">
                  <div className="text-2xl font-bold text-orange-400">{selectedPlayer.games_played}</div>
                  <div className="text-xs text-white/60">Games</div>
                </div>
              </div>

              {/* Recent Scores */}
              <h4 className="font-semibold mb-3">Recent Scores</h4>
              {selectedPlayer.recentScores.length === 0 ? (
                <p className="text-white/60 text-sm">No scores yet.</p>
              ) : (
                <div className="space-y-2">
                  {selectedPlayer.recentScores.map((score, i) => {
                    const accuracy = score.max_score > 0 ? (score.score / score.max_score) * 100 : 0;
                    const rating = getRatingBadge(accuracy);
                    return (
                      <div key={i} className="p-3 bg-white/5 rounded-lg flex items-center gap-3">
                        <div className="flex-1">
                          <p className="font-medium">{score.title}</p>
                          <p className="text-sm text-white/60">{score.artist}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-cyan-400">{score.score.toLocaleString()}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-white/60">{accuracy.toFixed(1)}%</span>
                            <Badge className={`text-xs ${rating.color}`}>{rating.label}</Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default OnlineLeaderboard;
