'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  createBattleRoyale,
  BattleRoyaleGame,
  BattleRoyaleSettings,
  DEFAULT_BATTLE_ROYALE_SETTINGS,
  MAX_LOCAL_MIC_PLAYERS,
  MAX_COMPANION_PLAYERS,
  MAX_BATTLE_ROYALE_PLAYERS,
  PlayerType,
} from '@/lib/game/battle-royale';
import { Song, PlayerProfile, Difficulty, PLAYER_COLORS } from '@/types/game';
import { useGameStore } from '@/lib/game/store';

/**
 * BattleRoyaleSetupScreen - Setup screen for Battle Royale game mode
 * Allows players to select mic players, companion players, and configure game settings
 */

interface BattleRoyaleSetupProps {
  profiles: PlayerProfile[];
  songs: Song[];
  onStartGame: (game: BattleRoyaleGame) => void;
  onBack: () => void;
}

export function BattleRoyaleSetupScreen({ profiles, songs, onStartGame, onBack }: BattleRoyaleSetupProps) {
  const [micPlayers, setMicPlayers] = useState<string[]>([]);
  const [companionPlayers, setCompanionPlayers] = useState<string[]>([]);
  const [roundDuration, setRoundDuration] = useState(60);
  const [finalRoundDuration, setFinalRoundDuration] = useState(120);
  const [medleyMode, setMedleyMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter to only show active profiles (isActive === true or undefined for backwards compatibility)
  const activeProfiles = useMemo(() => 
    profiles.filter(p => p.isActive !== false),
    [profiles]
  );

  // Use global difficulty from store instead of local state
  const globalDifficulty = useGameStore((state) => state.gameState.difficulty);
  const setGlobalDifficulty = useGameStore((state) => state.setDifficulty);
  const difficulty = globalDifficulty;

  const totalPlayers = micPlayers.length + companionPlayers.length;

  const toggleMicPlayer = (playerId: string) => {
    setMicPlayers(prev => {
      if (prev.includes(playerId)) {
        return prev.filter(id => id !== playerId);
      }
      if (prev.length >= MAX_LOCAL_MIC_PLAYERS) {
        setError(`Maximum ${MAX_LOCAL_MIC_PLAYERS} local microphone players`);
        return prev;
      }
      // Remove from companion if present
      setCompanionPlayers(cp => cp.filter(id => id !== playerId));
      setError(null);
      return [...prev, playerId];
    });
  };

  const toggleCompanionPlayer = (playerId: string) => {
    setCompanionPlayers(prev => {
      if (prev.includes(playerId)) {
        return prev.filter(id => id !== playerId);
      }
      if (prev.length >= MAX_COMPANION_PLAYERS) {
        setError(`Maximum ${MAX_COMPANION_PLAYERS} companion players`);
        return prev;
      }
      if (totalPlayers >= MAX_BATTLE_ROYALE_PLAYERS) {
        setError(`Maximum ${MAX_BATTLE_ROYALE_PLAYERS} total players`);
        return prev;
      }
      // Remove from mic if present
      setMicPlayers(mp => mp.filter(id => id !== playerId));
      setError(null);
      return [...prev, playerId];
    });
  };

  const handleStartGame = () => {
    if (totalPlayers < 2) {
      setError('Minimum 2 players required');
      return;
    }

    const players: Array<{
      id: string;
      name: string;
      avatar?: string;
      color: string;
      playerType: PlayerType;
    }> = [];

    // Add microphone players
    micPlayers.forEach((id) => {
      const profile = profiles.find(p => p.id === id);
      players.push({
        id,
        name: profile?.name || 'Unknown',
        avatar: profile?.avatar,
        color: profile?.color || PLAYER_COLORS[players.length % PLAYER_COLORS.length],
        playerType: 'microphone',
      });
    });

    // Add companion players
    companionPlayers.forEach((id) => {
      const profile = profiles.find(p => p.id === id);
      players.push({
        id,
        name: profile?.name || 'Unknown',
        avatar: profile?.avatar,
        color: profile?.color || PLAYER_COLORS[players.length % PLAYER_COLORS.length],
        playerType: 'companion',
      });
    });

    const settings: BattleRoyaleSettings = {
      ...DEFAULT_BATTLE_ROYALE_SETTINGS,
      roundDuration,
      finalRoundDuration,
      medleyMode,
      difficulty,
    };

    const songIds = songs.map(s => s.id);

    try {
      const game = createBattleRoyale(players, settings, songIds);
      onStartGame(game);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create game');
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={onBack} className="text-white/60">
          ← Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">👑 Battle Royale</h1>
          <p className="text-white/60">All sing together - lowest score eliminated each round!</p>
        </div>
      </div>

      {/* Player Limits Info */}
      <div className="bg-gradient-to-r from-red-500/20 to-pink-500/20 border border-red-500/30 rounded-lg p-4 mb-6">
        <div className="flex flex-wrap gap-6 text-center justify-center">
          <div>
            <div className="text-3xl font-bold text-red-400">{micPlayers.length}/{MAX_LOCAL_MIC_PLAYERS}</div>
            <div className="text-sm text-white/60">🎤 Local Mics</div>
          </div>
          <div className="text-white/20 text-4xl">+</div>
          <div>
            <div className="text-3xl font-bold text-purple-400">{companionPlayers.length}/{MAX_COMPANION_PLAYERS}</div>
            <div className="text-sm text-white/60">📱 Companions</div>
          </div>
          <div className="text-white/20 text-4xl">=</div>
          <div>
            <div className="text-3xl font-bold text-amber-400">{totalPlayers}/{MAX_BATTLE_ROYALE_PLAYERS}</div>
            <div className="text-sm text-white/60">👥 Total</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6 text-red-400">
          {error}
        </div>
      )}

      {/* Game Settings */}
      <Card className="bg-white/5 border-white/10 mb-6">
        <CardHeader>
          <CardTitle>Game Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Round Duration */}
          <div>
            <label className="text-sm text-white/60 mb-2 block">Round Duration: {roundDuration}s</label>
            <input
              type="range"
              min={30}
              max={180}
              step={15}
              value={roundDuration}
              onChange={(e) => setRoundDuration(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-white/40 mt-1">
              <span>30s (Fast)</span>
              <span>180s (Long)</span>
            </div>
          </div>

          {/* Final Round Duration */}
          <div>
            <label className="text-sm text-white/60 mb-2 block">Final Round Duration: {finalRoundDuration}s</label>
            <input
              type="range"
              min={60}
              max={300}
              step={30}
              value={finalRoundDuration}
              onChange={(e) => setFinalRoundDuration(Number(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Medley Mode */}
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium">Medley Mode</label>
              <p className="text-sm text-white/60">Multiple song snippets per round</p>
            </div>
            <Button
              variant={medleyMode ? 'default' : 'outline'}
              onClick={() => setMedleyMode(!medleyMode)}
              className={medleyMode ? 'bg-purple-500 hover:bg-purple-600' : 'border-white/20'}
            >
              {medleyMode ? '✓ On' : 'Off'}
            </Button>
          </div>

          {/* Difficulty */}
          <div>
            <label className="text-sm text-white/60 mb-2 block">Difficulty</label>
            <div className="flex gap-2">
              {['easy', 'medium', 'hard'].map(diff => (
                <Button
                  key={diff}
                  variant={difficulty === diff ? 'default' : 'outline'}
                  onClick={() => setGlobalDifficulty(diff as Difficulty)}
                  className={difficulty === diff ? 'bg-red-500 hover:bg-red-600' : 'border-white/20'}
                >
                  {diff.charAt(0).toUpperCase() + diff.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Player Selection - Two Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Local Microphone Players */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">🎤</span>
              Local Microphone
              <Badge variant="outline" className="border-red-500 text-red-400">
                {micPlayers.length}/{MAX_LOCAL_MIC_PLAYERS}
              </Badge>
            </CardTitle>
            <p className="text-sm text-white/60">Players at this device with microphone</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {activeProfiles.map(profile => {
                const isSelected = micPlayers.includes(profile.id);
                const isCompanion = companionPlayers.includes(profile.id);
                return (
                  <div
                    key={profile.id}
                    onClick={() => !isCompanion && toggleMicPlayer(profile.id)}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      isCompanion 
                        ? 'opacity-30 cursor-not-allowed' 
                        : isSelected 
                          ? 'bg-gradient-to-br from-red-500/30 to-pink-500/30 border-2 border-red-500' 
                          : 'bg-white/5 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {profile.avatar ? (
                        <img src={profile.avatar} alt={profile.name} className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                          style={{ backgroundColor: profile.color }}
                        >
                          {profile.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="font-medium truncate text-sm">{profile.name}</span>
                      {isSelected && <span className="ml-auto text-red-400 text-lg">🎤</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Companion Players */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">📱</span>
              Companion App
              <Badge variant="outline" className="border-purple-500 text-purple-400">
                {companionPlayers.length}/{MAX_COMPANION_PLAYERS}
              </Badge>
            </CardTitle>
            <p className="text-sm text-white/60">Players using the mobile companion app</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {activeProfiles.map(profile => {
                const isSelected = companionPlayers.includes(profile.id);
                const isMic = micPlayers.includes(profile.id);
                return (
                  <div
                    key={profile.id}
                    onClick={() => !isMic && toggleCompanionPlayer(profile.id)}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      isMic 
                        ? 'opacity-30 cursor-not-allowed' 
                        : isSelected 
                          ? 'bg-gradient-to-br from-purple-500/30 to-indigo-500/30 border-2 border-purple-500' 
                          : 'bg-white/5 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {profile.avatar ? (
                        <img src={profile.avatar} alt={profile.name} className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                          style={{ backgroundColor: profile.color }}
                        >
                          {profile.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="font-medium truncate text-sm">{profile.name}</span>
                      {isSelected && <span className="ml-auto text-purple-400 text-lg">📱</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary */}
      <Card className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/30 mb-6">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">Ready to Battle!</h3>
              <p className="text-sm text-white/60">
                {micPlayers.length} mic + {companionPlayers.length} companion = {totalPlayers} total players
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-amber-400">{totalPlayers}</div>
              <div className="text-xs text-white/40">players selected</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Start Button */}
      <Button
        onClick={handleStartGame}
        disabled={totalPlayers < 2}
        className="w-full py-6 text-xl bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-400 hover:to-pink-400"
      >
        👑 Start Battle Royale ({totalPlayers} Players)
      </Button>
    </div>
  );
}

export type { BattleRoyaleSetupProps };
