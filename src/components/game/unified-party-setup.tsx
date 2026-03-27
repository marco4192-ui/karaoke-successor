'use client';

import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Song, PlayerProfile, PLAYER_COLORS, Difficulty, GameMode } from '@/types/game';

// Import extracted types, configs, and components
import {
  PARTY_GAME_CONFIGS,
  GameSettingConfig,
  PartyGameConfig,
  SongSelectionOption,
  SelectedPlayer,
  GameSetupResult,
} from '@/lib/game/party-game-configs';
import { SettingControl } from './setting-control';
import { PlayerSelectionGrid } from './player-selection-grid';
import { SongSelectionButtons } from './song-selection-buttons';

// Re-export types for backwards compatibility
export type { GameSettingConfig, PartyGameConfig, SongSelectionOption, SelectedPlayer, GameSetupResult };
export { PARTY_GAME_CONFIGS };

// ===================== UNIFIED PARTY SETUP COMPONENT =====================

interface UnifiedPartySetupProps {
  gameMode: GameMode;
  profiles: PlayerProfile[];
  songs: Song[];
  onStartGame: (result: GameSetupResult) => void;
  onSelectLibrary: (result: GameSetupResult) => void;
  onVoteMode: (result: GameSetupResult, suggestedSongs: Song[]) => void;
  onBack: () => void;
}

export function UnifiedPartySetup({
  gameMode,
  profiles,
  songs,
  onStartGame,
  onSelectLibrary,
  onVoteMode,
  onBack,
}: UnifiedPartySetupProps) {
  // Get game configuration
  const config = PARTY_GAME_CONFIGS[gameMode] || PARTY_GAME_CONFIGS['pass-the-mic'];

  // Filter to only show active profiles
  const activeProfiles = useMemo(
    () => profiles.filter((p) => p.isActive !== false),
    [profiles]
  );

  // Initialize settings from config defaults
  const initialSettings = useMemo(() => {
    const settings: Record<string, any> = {};
    config.settings.forEach((s) => {
      settings[s.key] = s.defaultValue;
    });
    return settings;
  }, [config]);

  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [settings, setSettings] = useState<Record<string, any>>(initialSettings);
  const [songSelection, setSongSelection] = useState<SongSelectionOption | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');

  // Toggle player selection
  const togglePlayer = useCallback(
    (playerId: string) => {
      setSelectedPlayers((prev) => {
        if (prev.includes(playerId)) {
          return prev.filter((id) => id !== playerId);
        }
        if (prev.length >= config.maxPlayers) {
          setError(`Maximum ${config.maxPlayers} players allowed`);
          return prev;
        }
        setError(null);
        return [...prev, playerId];
      });
    },
    [config.maxPlayers]
  );

  // Create player objects
  const createPlayers = useCallback((): SelectedPlayer[] => {
    return selectedPlayers.map((id, index) => {
      const profile = profiles.find((p) => p.id === id);
      return {
        id,
        name: profile?.name || 'Unknown',
        avatar: profile?.avatar,
        color: profile?.color || PLAYER_COLORS[index % PLAYER_COLORS.length],
        playerType: 'microphone' as const,
      };
    });
  }, [selectedPlayers, profiles]);

  // Handle song selection
  const handleSongSelection = useCallback(
    (option: SongSelectionOption) => {
      if (selectedPlayers.length < config.minPlayers) {
        setError(`Minimum ${config.minPlayers} players required`);
        return;
      }

      const result: GameSetupResult = {
        players: createPlayers(),
        settings: { ...settings, difficulty },
        songSelection: option,
        difficulty,
      };

      setError(null);
      setSongSelection(option);

      switch (option) {
        case 'library':
          onSelectLibrary(result);
          break;
        case 'random':
          onStartGame(result);
          break;
        case 'vote':
          const shuffled = [...songs].sort(() => Math.random() - 0.5);
          const suggestedSongs = shuffled.slice(0, 3);
          onVoteMode(result, suggestedSongs);
          break;
        case 'medley':
          onStartGame(result);
          break;
      }
    },
    [
      selectedPlayers,
      config.minPlayers,
      createPlayers,
      settings,
      difficulty,
      songs,
      onSelectLibrary,
      onStartGame,
      onVoteMode,
    ]
  );

  // Handle setting change
  const handleSettingChange = useCallback((key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  return (
    <div className="flex gap-4">
      {/* Left Sidebar - Game Explanation */}
      <div className="hidden lg:block w-64 flex-shrink-0">
        <div className="sticky top-24">
          <Card className={`bg-gradient-to-br ${config.color} border-0`}>
            <CardContent className="pt-6">
              <div className="text-6xl mb-4">{config.icon}</div>
              <h2 className="text-2xl font-bold text-white mb-2">{config.title}</h2>
              <p className="text-white/80 mb-4">{config.description}</p>

              <div className="bg-black/20 rounded-lg p-4 space-y-2">
                <h3 className="font-bold text-white/90 mb-2">🎮 How it works</h3>
                {config.extendedDescription.map((desc, i) => (
                  <p key={i} className="text-sm text-white/70">
                    {desc}
                  </p>
                ))}
              </div>

              <div className="mt-4 flex gap-2">
                <Badge className="bg-white/20 text-white">
                  {config.minPlayers}-{config.maxPlayers} players
                </Badge>
                {config.supportsCompanionApp && (
                  <Badge className="bg-purple-500/30 text-purple-200">📱 Companion</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={onBack} className="text-white/60">
            ← Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {config.icon} {config.title}
            </h1>
            <p className="text-white/60">{config.description}</p>
          </div>
        </div>

        {/* Mobile Game Description */}
        <div className="lg:hidden mb-6">
          <Card className={`bg-gradient-to-br ${config.color} border-0`}>
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <div className="text-5xl">{config.icon}</div>
                <div>
                  <h3 className="font-bold text-lg text-white">{config.title}</h3>
                  <p className="text-white/80 text-sm">{config.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6 text-red-400">
            {error}
          </div>
        )}

        {/* Section 1: Game Settings */}
        {config.settings.length > 0 && (
          <Card className="bg-white/5 border-white/10 mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-xl">⚙️</span>
                Game Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {config.settings.map((setting) => (
                <SettingControl
                  key={setting.key}
                  setting={setting}
                  value={settings[setting.key]}
                  onChange={(value) => handleSettingChange(setting.key, value)}
                />
              ))}

              {/* Difficulty */}
              <div className="pt-4 border-t border-white/10">
                <label className="text-sm text-white/60 mb-2 block">Difficulty</label>
                <div className="flex gap-2">
                  {(['easy', 'medium', 'hard'] as Difficulty[]).map((diff) => (
                    <Button
                      key={diff}
                      variant={difficulty === diff ? 'default' : 'outline'}
                      onClick={() => setDifficulty(diff)}
                      className={
                        difficulty === diff
                          ? `bg-gradient-to-r ${config.color}`
                          : 'border-white/20'
                      }
                    >
                      {diff.charAt(0).toUpperCase() + diff.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section 2: Player Selection */}
        <PlayerSelectionGrid
          profiles={activeProfiles}
          selectedPlayers={selectedPlayers}
          maxPlayers={config.maxPlayers}
          minPlayers={config.minPlayers}
          gameColor={config.color}
          onTogglePlayer={togglePlayer}
        />

        {/* Section 3: Song Selection Options */}
        <SongSelectionButtons
          options={config.songSelectionOptions}
          minPlayers={config.minPlayers}
          selectedPlayerCount={selectedPlayers.length}
          onSelect={handleSongSelection}
        />

        {/* Summary */}
        <Card className={`bg-gradient-to-r ${config.color} border-0 mb-6`}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-white">Ready to Play!</h3>
                <p className="text-sm text-white/80">
                  {selectedPlayers.length} players selected • {difficulty} difficulty
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-white">{selectedPlayers.length}</div>
                <div className="text-xs text-white/60">players</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ===================== SONG VOTING MODAL =====================

interface SongVotingModalProps {
  songs: Song[];
  players: SelectedPlayer[];
  onVote: (songId: string) => void;
  onClose: () => void;
  gameColor: string;
}

export function SongVotingModal({ songs, players, onVote, onClose, gameColor }: SongVotingModalProps) {
  const [votes, setVotes] = useState<Record<string, string>>({});

  const handleVote = (songId: string) => {
    onVote(songId);
  };

  const getVoteCount = (songId: string) => {
    return Object.values(votes).filter((v) => v === songId).length;
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="bg-gray-900 border-white/20 max-w-4xl w-full max-h-[90vh] overflow-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl">🗳️ Vote for a Song!</CardTitle>
          <Button variant="ghost" onClick={onClose} className="text-white/60">
            ✕
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-white/60 mb-6">
            Click on a song to vote for it. The song with the most votes will be played!
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {songs.map((song, index) => (
              <div
                key={song.id}
                onClick={() => handleVote(song.id)}
                className={`relative p-4 rounded-xl cursor-pointer transition-all hover:scale-105 bg-gradient-to-br ${gameColor} border-2 border-transparent hover:border-white/50`}
              >
                <div className="absolute top-2 left-2 w-8 h-8 rounded-full bg-black/30 flex items-center justify-center font-bold">
                  {index + 1}
                </div>

                {song.coverImage ? (
                  <img
                    src={song.coverImage}
                    alt=""
                    className="w-full aspect-square rounded-lg object-cover mb-3"
                  />
                ) : (
                  <div className="w-full aspect-square rounded-lg bg-black/20 flex items-center justify-center text-6xl mb-3">
                    🎵
                  </div>
                )}

                <h3 className="font-bold text-white truncate">{song.title}</h3>
                <p className="text-white/70 text-sm truncate">{song.artist}</p>

                {getVoteCount(song.id) > 0 && (
                  <div className="absolute bottom-2 right-2 bg-white/20 rounded-full px-2 py-1 text-sm">
                    {getVoteCount(song.id)} vote{getVoteCount(song.id) > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 text-center text-white/40 text-sm">
            💡 In future, players can vote via the Companion App!
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
