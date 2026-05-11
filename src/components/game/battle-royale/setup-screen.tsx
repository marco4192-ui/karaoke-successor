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
import { Song, PlayerProfile, PLAYER_COLORS, Difficulty } from '@/types/game';
import { useGameStore } from '@/lib/game/store';
import { useTranslation } from '@/lib/i18n/translations';

interface BattleRoyaleSetupProps {
  profiles: PlayerProfile[];
  songs: Song[];
  onStartGame: (_game: BattleRoyaleGame) => void;
  onBack: () => void;
}

export function BattleRoyaleSetupScreen({ profiles, songs, onStartGame, onBack }: BattleRoyaleSetupProps) {
  const { t } = useTranslation();
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
    // H12: Don't call setState inside setState updater. Instead, compute the new
    // companion players list here and set both states sequentially.
    if (micPlayers.includes(playerId)) {
      setMicPlayers(prev => prev.filter(id => id !== playerId));
      return;
    }
    if (micPlayers.length >= MAX_LOCAL_MIC_PLAYERS) {
      setError(t('battleRoyale.errorMaxLocalMic').replace('{n}', String(MAX_LOCAL_MIC_PLAYERS)));
      return;
    }
    // Remove from companion if present
    setCompanionPlayers(cp => cp.filter(id => id !== playerId));
    setError(null);
    setMicPlayers(prev => [...prev, playerId]);
  };

  const toggleCompanionPlayer = (playerId: string) => {
    // H11: Calculate total using micPlayers.length + prev.length inside the updater
    // to avoid stale totalPlayers value.
    if (companionPlayers.includes(playerId)) {
      setCompanionPlayers(prev => prev.filter(id => id !== playerId));
      return;
    }
    if (companionPlayers.length >= MAX_COMPANION_PLAYERS) {
      setError(t('battleRoyale.errorMaxCompanion').replace('{n}', String(MAX_COMPANION_PLAYERS)));
      return;
    }
    // Check total limit using current micPlayers + new companion count
    if (micPlayers.length + companionPlayers.length >= MAX_BATTLE_ROYALE_PLAYERS) {
      setError(t('battleRoyale.errorMaxTotal').replace('{n}', String(MAX_BATTLE_ROYALE_PLAYERS)));
      return;
    }
    // Remove from mic if present
    setMicPlayers(mp => mp.filter(id => id !== playerId));
    setError(null);
    setCompanionPlayers(prev => [...prev, playerId]);
  };

  const handleStartGame = () => {
    if (totalPlayers < 2) {
      setError(t('battleRoyale.errorMinPlayers'));
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
      setError(err instanceof Error ? err.message : t('battleRoyale.errorCreateGame'));
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={onBack} className="text-white/60">
          {t('battleRoyale.back')}
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{t('battleRoyale.setupTitle')}</h1>
          <p className="text-white/60">{t('battleRoyale.setupSubtitle')}</p>
        </div>
      </div>

      {/* Player Limits Info */}
      <div className="bg-gradient-to-r from-red-500/20 to-pink-500/20 border border-red-500/30 rounded-lg p-4 mb-6">
        <div className="flex flex-wrap gap-6 text-center justify-center">
          <div>
            <div className="text-3xl font-bold text-red-400">{micPlayers.length}/{MAX_LOCAL_MIC_PLAYERS}</div>
            <div className="text-sm text-white/60">{t('battleRoyale.localMics')}</div>
          </div>
          <div className="text-white/20 text-4xl">+</div>
          <div>
            <div className="text-3xl font-bold text-purple-400">{companionPlayers.length}/{MAX_COMPANION_PLAYERS}</div>
            <div className="text-sm text-white/60">{t('battleRoyale.companions')}</div>
          </div>
          <div className="text-white/20 text-4xl">=</div>
          <div>
            <div className="text-3xl font-bold text-amber-400">{totalPlayers}/{MAX_BATTLE_ROYALE_PLAYERS}</div>
            <div className="text-sm text-white/60">{t('battleRoyale.total')}</div>
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
          <CardTitle>{t('battleRoyale.gameSettings')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Round Duration */}
          <div>
            <label className="text-sm text-white/60 mb-2 block">{t('battleRoyale.roundDuration').replace('{n}', String(roundDuration))}</label>
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
              <span>{t('battleRoyale.fast')}</span>
              <span>{t('battleRoyale.long')}</span>
            </div>
          </div>

          {/* Final Round Duration */}
          <div>
            <label className="text-sm text-white/60 mb-2 block">{t('battleRoyale.finalRoundDuration').replace('{n}', String(finalRoundDuration))}</label>
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
              <label className="font-medium">{t('battleRoyale.medleyMode')}</label>
              <p className="text-sm text-white/60">{t('battleRoyale.medleyModeDesc')}</p>
            </div>
            <Button
              variant={medleyMode ? 'default' : 'outline'}
              onClick={() => setMedleyMode(!medleyMode)}
              className={medleyMode ? 'bg-purple-500 hover:bg-purple-600' : 'border-white/20'}
            >
              {medleyMode ? t('battleRoyale.on') : t('battleRoyale.off')}
            </Button>
          </div>

          {/* Difficulty */}
          <div>
            <label className="text-sm text-white/60 mb-2 block">{t('battleRoyale.difficulty')}</label>
            <div className="flex gap-2">
              {['easy', 'medium', 'hard'].map(diff => (
                <Button
                  key={diff}
                  variant={difficulty === diff ? 'default' : 'outline'}
                  onClick={() => setGlobalDifficulty(diff as Difficulty)}
                  className={difficulty === diff ? 'bg-red-500 hover:bg-red-600' : 'border-white/20'}
                >
                  {{easy: t('song.easy'), medium: t('song.medium'), hard: t('song.hard')}[diff] as string}
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
              {t('battleRoyale.localMicrophone')}
              <Badge variant="outline" className="border-red-500 text-red-400">
                {micPlayers.length}/{MAX_LOCAL_MIC_PLAYERS}
              </Badge>
            </CardTitle>
            <p className="text-sm text-white/60">{t('battleRoyale.localMicrophoneDesc')}</p>
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
              {t('battleRoyale.companionApp')}
              <Badge variant="outline" className="border-purple-500 text-purple-400">
                {companionPlayers.length}/{MAX_COMPANION_PLAYERS}
              </Badge>
            </CardTitle>
            <p className="text-sm text-white/60">{t('battleRoyale.companionAppDesc')}</p>
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
              <h3 className="font-bold text-lg">{t('battleRoyale.readyToBattle')}</h3>
              <p className="text-sm text-white/60">
                {micPlayers.length} {t('battleRoyale.mic')} + {companionPlayers.length} {t('battleRoyale.companion')} = {totalPlayers} {t('battleRoyale.playersSelected')}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-amber-400">{totalPlayers}</div>
              <div className="text-xs text-white/40">{t('battleRoyale.playersSelected')}</div>
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
        {t('battleRoyale.startBattle').replace('{n}', String(totalPlayers))}
      </Button>
    </div>
  );
}
