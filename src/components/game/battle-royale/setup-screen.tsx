'use client';

import { useState, useMemo, useEffect } from 'react';
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
  const [availableMics, setAvailableMics] = useState<Array<{ deviceId: string; label: string }>>([]);
  const [playerMicDevices, setPlayerMicDevices] = useState<Record<string, string>>({});

  // Companion auto-registration
  const [connectedCompanionClients, setConnectedCompanionClients] = useState<Array<{
    id: string;
    connectionCode: string;
    name: string;
    profile: { id: string; name: string; avatar?: string; color: string } | null;
    hasPitch: boolean;
  }>>([]);
  const [autoCompanionIds, setAutoCompanionIds] = useState<Set<string>>(new Set());

  // Core settings
  const [roundDuration, setRoundDuration] = useState(DEFAULT_BATTLE_ROYALE_SETTINGS.roundDuration);
  const [finalRoundDuration, setFinalRoundDuration] = useState(DEFAULT_BATTLE_ROYALE_SETTINGS.finalRoundDuration);
  const [medleyMode, setMedleyMode] = useState(DEFAULT_BATTLE_ROYALE_SETTINGS.medleyMode);
  const [medleySnippets, setMedleySnippets] = useState(DEFAULT_BATTLE_ROYALE_SETTINGS.medleySnippets);
  const [error, setError] = useState<string | null>(null);

  // #2 Song selection
  const [songSelection, setSongSelection] = useState<'random' | 'vote'>(DEFAULT_BATTLE_ROYALE_SETTINGS.songSelection);

  // #3 No-repeat protection
  const [noRepeatProtection, setNoRepeatProtection] = useState(DEFAULT_BATTLE_ROYALE_SETTINGS.noRepeatProtection);
  const [noRepeatCount, setNoRepeatCount] = useState(DEFAULT_BATTLE_ROYALE_SETTINGS.noRepeatCount);

  // #4 Grand Finale
  const [grandFinaleBestOf, setGrandFinaleBestOf] = useState<1 | 3 | 5>(DEFAULT_BATTLE_ROYALE_SETTINGS.grandFinaleBestOf);

  // #6 Bounty
  const [bountyEnabled, setBountyEnabled] = useState(DEFAULT_BATTLE_ROYALE_SETTINGS.bountyEnabled);
  const [bountyMultiplier, setBountyMultiplier] = useState(DEFAULT_BATTLE_ROYALE_SETTINGS.bountyMultiplier);

  // #7 Dynamic difficulty
  const [escalatingDifficulty, setEscalatingDifficulty] = useState(DEFAULT_BATTLE_ROYALE_SETTINGS.escalatingDifficulty);

  // #8 Shrinking timer
  const [shrinkingTimer, setShrinkingTimer] = useState(DEFAULT_BATTLE_ROYALE_SETTINGS.shrinkingTimer);
  const [shrinkFactor, setShrinkFactor] = useState(DEFAULT_BATTLE_ROYALE_SETTINGS.shrinkFactor);
  const [minRoundDuration, setMinRoundDuration] = useState(DEFAULT_BATTLE_ROYALE_SETTINGS.minRoundDuration);

  // V13 Visual settings
  const [showNoteHighway, setShowNoteHighway] = useState(DEFAULT_BATTLE_ROYALE_SETTINGS.showNoteHighway);
  const [noteShapeStyle, setNoteShapeStyle] = useState(DEFAULT_BATTLE_ROYALE_SETTINGS.noteShapeStyle);
  const [noteDisplayStyle, setNoteDisplayStyle] = useState(DEFAULT_BATTLE_ROYALE_SETTINGS.noteDisplayStyle);
  const [showVideoBackground, setShowVideoBackground] = useState(DEFAULT_BATTLE_ROYALE_SETTINGS.showVideoBackground);
  const [countdownDuration, setCountdownDuration] = useState(DEFAULT_BATTLE_ROYALE_SETTINGS.countdownDuration);

  useEffect(() => {
    const enumerateMics = async () => {
      try {
        let devices = await navigator.mediaDevices.enumerateDevices();
        const hasLabels = devices.some(d => d.kind === 'audioinput' && d.label);
        if (!hasLabels) {
          // Request permission to get labels
          const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          tempStream.getTracks().forEach(track => track.stop());
          devices = await navigator.mediaDevices.enumerateDevices();
        }
        setAvailableMics(
          devices
            .filter(d => d.kind === 'audioinput')
            .map(d => ({
              deviceId: d.deviceId,
              label: d.label || `Microphone (${d.deviceId.slice(0, 8)}...)`,
            }))
        );
      } catch {
        // Silently fail — mic selection just won't be available
      }
    };
    enumerateMics();
  }, []);

  // Auto-detect companion clients on mount
  useEffect(() => {
    const fetchCompanions = async () => {
      try {
        const res = await fetch('/api/mobile?action=clients');
        const data = await res.json();
        if (data.success && data.clients) {
          setConnectedCompanionClients(data.clients);
          const autoIds: string[] = [];
          data.clients.forEach((client: typeof connectedCompanionClients[0]) => {
            if (client.profile && client.hasPitch) {
              autoIds.push(client.profile.id);
            }
          });
          if (autoIds.length > 0) {
            setAutoCompanionIds(new Set(autoIds));
            setCompanionPlayers(prev => {
              const merged = [...new Set([...prev, ...autoIds])];
              return merged;
            });
          }
        }
      } catch {
        // Silently fail
      }
    };
    fetchCompanions();
  }, []);

  const activeProfiles = useMemo(() =>
    profiles.filter(p => p.isActive !== false),
    [profiles]
  );

  const micAvailableProfiles = useMemo(() =>
    activeProfiles.filter(p => !autoCompanionIds.has(p.id)),
    [activeProfiles, autoCompanionIds]
  );

  const globalDifficulty = useGameStore((state) => state.gameState.difficulty);
  const setGlobalDifficulty = useGameStore((state) => state.setDifficulty);
  const difficulty = globalDifficulty;

  const totalPlayers = micPlayers.length + companionPlayers.length;

  const toggleMicPlayer = (playerId: string) => {
    if (micPlayers.includes(playerId)) {
      setMicPlayers(prev => prev.filter(id => id !== playerId));
      setPlayerMicDevices(prev => {
        const next = { ...prev };
        delete next[playerId];
        return next;
      });
      return;
    }
    if (micPlayers.length >= MAX_LOCAL_MIC_PLAYERS) {
      setError(t('battleRoyale.errorMaxLocalMic').replace('{n}', String(MAX_LOCAL_MIC_PLAYERS)));
      return;
    }
    setCompanionPlayers(cp => cp.filter(id => id !== playerId));
    setError(null);
    setMicPlayers(prev => [...prev, playerId]);
  };

  const toggleCompanionPlayer = (playerId: string) => {
    // Prevent removing auto-registered companion players
    if (autoCompanionIds.has(playerId)) {
      return;
    }
    if (companionPlayers.includes(playerId)) {
      setCompanionPlayers(prev => prev.filter(id => id !== playerId));
      return;
    }
    if (companionPlayers.length >= MAX_COMPANION_PLAYERS) {
      setError(t('battleRoyale.errorMaxCompanion').replace('{n}', String(MAX_COMPANION_PLAYERS)));
      return;
    }
    if (micPlayers.length + companionPlayers.length >= MAX_BATTLE_ROYALE_PLAYERS) {
      setError(t('battleRoyale.errorMaxTotal').replace('{n}', String(MAX_BATTLE_ROYALE_PLAYERS)));
      return;
    }
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
      microphoneId?: string;
      connectionCode?: string;
    }> = [];

    micPlayers.forEach((id) => {
      const profile = profiles.find(p => p.id === id);
      players.push({
        id,
        name: profile?.name || 'Unknown',
        avatar: profile?.avatar,
        color: profile?.color || PLAYER_COLORS[players.length % PLAYER_COLORS.length],
        playerType: 'microphone',
        microphoneId: playerMicDevices[id] || undefined,
      });
    });

    companionPlayers.forEach((id) => {
      const profile = profiles.find(p => p.id === id);
      const companionClient = connectedCompanionClients.find(c => c.profile?.id === id);
      players.push({
        id,
        name: profile?.name || 'Unknown',
        avatar: profile?.avatar,
        color: profile?.color || PLAYER_COLORS[players.length % PLAYER_COLORS.length],
        playerType: 'companion',
        connectionCode: companionClient?.connectionCode,
      });
    });

    const settings: BattleRoyaleSettings = {
      ...DEFAULT_BATTLE_ROYALE_SETTINGS,
      roundDuration,
      finalRoundDuration,
      medleyMode,
      difficulty,
      songSelection,
      noRepeatProtection,
      noRepeatCount,
      grandFinaleBestOf,
      bountyEnabled,
      bountyMultiplier,
      escalatingDifficulty,
      shrinkingTimer,
      shrinkFactor,
      minRoundDuration,
      medleySnippets,
      showNoteHighway,
      noteShapeStyle,
      noteDisplayStyle,
      showVideoBackground,
      countdownDuration,
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

      {/* ── Core Game Settings ── */}
      <Card className="bg-white/5 border-white/10 mb-4">
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

          {/* #2 Song Selection */}
          <div>
            <label className="text-sm text-white/60 mb-2 block">{t('battleRoyale.songSelectionLabel')}</label>
            <div className="flex gap-2">
              <Button
                variant={songSelection === 'random' ? 'default' : 'outline'}
                onClick={() => setSongSelection('random')}
                className={songSelection === 'random' ? 'bg-purple-500 hover:bg-purple-600' : 'border-white/20'}
              >
                🎲 {t('battleRoyale.songSelectionRandom')}
              </Button>
              <Button
                variant={songSelection === 'vote' ? 'default' : 'outline'}
                onClick={() => setSongSelection('vote')}
                className={songSelection === 'vote' ? 'bg-amber-500 hover:bg-amber-600' : 'border-white/20'}
              >
                🗳️ {t('battleRoyale.songSelectionVote')}
              </Button>
            </div>
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
          {medleyMode && (
            <div>
              <label className="text-sm text-white/60 mb-2 block">{t('battleRoyale.medleySnippetsLabel').replace('{n}', String(medleySnippets))}</label>
              <input
                type="range"
                min={2}
                max={8}
                step={1}
                value={medleySnippets}
                onChange={(e) => setMedleySnippets(Number(e.target.value))}
                className="w-full"
              />
            </div>
          )}

          {/* Difficulty */}
          <div>
            <label className="text-sm text-white/60 mb-2 block">{t('battleRoyale.difficulty')}</label>
            <div className="flex gap-2">
              {(['easy', 'medium', 'hard'] as Difficulty[]).map(diff => (
                <Button
                  key={diff}
                  variant={difficulty === diff ? 'default' : 'outline'}
                  onClick={() => setGlobalDifficulty(diff)}
                  className={difficulty === diff ? 'bg-red-500 hover:bg-red-600' : 'border-white/20'}
                >
                  {{ easy: t('song.easy'), medium: t('song.medium'), hard: t('song.hard') }[diff] as string}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Advanced Settings ── */}
      <Card className="bg-white/5 border-white/10 mb-4">
        <CardHeader>
          <CardTitle>{t('battleRoyale.advancedSettings')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* #3 No-Repeat Protection */}
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium">{t('battleRoyale.noRepeatProtection')}</label>
              <p className="text-sm text-white/60">{t('battleRoyale.noRepeatDesc').replace('{n}', String(noRepeatCount))}</p>
            </div>
            <Button
              variant={noRepeatProtection ? 'default' : 'outline'}
              onClick={() => setNoRepeatProtection(!noRepeatProtection)}
              className={noRepeatProtection ? 'bg-green-500 hover:bg-green-600' : 'border-white/20'}
            >
              {noRepeatProtection ? t('battleRoyale.on') : t('battleRoyale.off')}
            </Button>
          </div>
          {noRepeatProtection && (
            <div>
              <label className="text-sm text-white/60 mb-2 block">{t('battleRoyale.noRepeatCount').replace('{n}', String(noRepeatCount))}</label>
              <input
                type="range"
                min={3}
                max={30}
                step={1}
                value={noRepeatCount}
                onChange={(e) => setNoRepeatCount(Number(e.target.value))}
                className="w-full"
              />
            </div>
          )}

          {/* #4 Grand Finale */}
          <div>
            <label className="text-sm text-white/60 mb-2 block">{t('battleRoyale.grandFinaleLabel')}</label>
            <div className="flex gap-2">
              {([1, 3, 5] as const).map(bo => (
                <Button
                  key={bo}
                  variant={grandFinaleBestOf === bo ? 'default' : 'outline'}
                  onClick={() => setGrandFinaleBestOf(bo)}
                  className={grandFinaleBestOf === bo ? 'bg-amber-500 hover:bg-amber-600' : 'border-white/20'}
                >
                  {bo === 1
                    ? t('battleRoyale.normalFinal')
                    : t('battleRoyale.bestOf').replace('{n}', String(bo))
                  }
                </Button>
              ))}
            </div>
          </div>

          {/* #6 Bounty System */}
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium">{t('battleRoyale.bountySystem')}</label>
              <p className="text-sm text-white/60">{t('battleRoyale.bountyDesc')}</p>
            </div>
            <Button
              variant={bountyEnabled ? 'default' : 'outline'}
              onClick={() => setBountyEnabled(!bountyEnabled)}
              className={bountyEnabled ? 'bg-amber-500 hover:bg-amber-600' : 'border-white/20'}
            >
              {bountyEnabled ? t('battleRoyale.on') : t('battleRoyale.off')}
            </Button>
          </div>
          {bountyEnabled && (
            <div>
              <label className="text-sm text-white/60 mb-2 block">{t('battleRoyale.bountyMultiplierLabel').replace('{n}', String(bountyMultiplier))}</label>
              <input
                type="range"
                min={1.2}
                max={3}
                step={0.1}
                value={bountyMultiplier}
                onChange={(e) => setBountyMultiplier(Number(e.target.value))}
                className="w-full"
              />
            </div>
          )}

          {/* #7 Escalating Difficulty */}
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium">{t('battleRoyale.escalatingDifficulty')}</label>
              <p className="text-sm text-white/60">{t('battleRoyale.escalatingDesc')}</p>
            </div>
            <Button
              variant={escalatingDifficulty ? 'default' : 'outline'}
              onClick={() => setEscalatingDifficulty(!escalatingDifficulty)}
              className={escalatingDifficulty ? 'bg-green-500 hover:bg-green-600' : 'border-white/20'}
            >
              {escalatingDifficulty ? t('battleRoyale.on') : t('battleRoyale.off')}
            </Button>
          </div>

          {/* #8 Shrinking Timer */}
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium">{t('battleRoyale.shrinkingTimer')}</label>
              <p className="text-sm text-white/60">{t('battleRoyale.shrinkingDesc').replace('{n}', String(shrinkFactor))}</p>
            </div>
            <Button
              variant={shrinkingTimer ? 'default' : 'outline'}
              onClick={() => setShrinkingTimer(!shrinkingTimer)}
              className={shrinkingTimer ? 'bg-orange-500 hover:bg-orange-600' : 'border-white/20'}
            >
              {shrinkingTimer ? t('battleRoyale.on') : t('battleRoyale.off')}
            </Button>
          </div>
          {shrinkingTimer && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-white/60 mb-2 block">{t('battleRoyale.shrinkFactorLabel').replace('{n}', String(shrinkFactor))}</label>
                <input
                  type="range"
                  min={2}
                  max={15}
                  step={1}
                  value={shrinkFactor}
                  onChange={(e) => setShrinkFactor(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-sm text-white/60 mb-2 block">{t('battleRoyale.minDurationLabel').replace('{n}', String(minRoundDuration))}</label>
                <input
                  type="range"
                  min={15}
                  max={60}
                  step={5}
                  value={minRoundDuration}
                  onChange={(e) => setMinRoundDuration(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── V13 Visual Settings ── */}
      <Card className="bg-white/5 border-white/10 mb-4">
        <CardHeader>
          <CardTitle>{t('battleRoyale.visualSettings')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Note Highway */}
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium">{t('battleRoyale.noteHighwayLabel')}</label>
              <p className="text-sm text-white/60">{t('battleRoyale.noteHighwayDesc')}</p>
            </div>
            <Button
              variant={showNoteHighway ? 'default' : 'outline'}
              onClick={() => setShowNoteHighway(!showNoteHighway)}
              className={showNoteHighway ? 'bg-cyan-500 hover:bg-cyan-600' : 'border-white/20'}
            >
              {showNoteHighway ? t('battleRoyale.on') : t('battleRoyale.off')}
            </Button>
          </div>

          {/* Note Shape Style */}
          <div>
            <label className="text-sm text-white/60 mb-2 block">{t('battleRoyale.noteShapeLabel')}</label>
            <div className="flex gap-2">
              {(['rounded', 'sharp', 'pill', 'diamond'] as const).map(shape => (
                <Button
                  key={shape}
                  variant={noteShapeStyle === shape ? 'default' : 'outline'}
                  onClick={() => setNoteShapeStyle(shape)}
                  className={noteShapeStyle === shape ? 'bg-cyan-500 hover:bg-cyan-600' : 'border-white/20'}
                >
                  {{ rounded: '⬭', sharp: '◆', pill: '💊', diamond: '◇' }[shape] as string} {shape}
                </Button>
              ))}
            </div>
          </div>

          {/* Note Display Style */}
          <div>
            <label className="text-sm text-white/60 mb-2 block">{t('battleRoyale.noteDisplayStyleLabel')}</label>
            <div className="flex gap-2">
              {(['classic', 'fill-level', 'color-feedback', 'glow-intensity'] as const).map(style => (
                <Button
                  key={style}
                  variant={noteDisplayStyle === style ? 'default' : 'outline'}
                  onClick={() => setNoteDisplayStyle(style)}
                  className={noteDisplayStyle === style ? 'bg-indigo-500 hover:bg-indigo-600' : 'border-white/20'}
                >
                  {style}
                </Button>
              ))}
            </div>
          </div>

          {/* Video Background */}
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium">{t('battleRoyale.videoBackgroundLabel')}</label>
              <p className="text-sm text-white/60">{t('battleRoyale.videoBackgroundDesc')}</p>
            </div>
            <Button
              variant={showVideoBackground ? 'default' : 'outline'}
              onClick={() => setShowVideoBackground(!showVideoBackground)}
              className={showVideoBackground ? 'bg-purple-500 hover:bg-purple-600' : 'border-white/20'}
            >
              {showVideoBackground ? t('battleRoyale.on') : t('battleRoyale.off')}
            </Button>
          </div>

          {/* Countdown Duration */}
          <div>
            <label className="text-sm text-white/60 mb-2 block">{t('battleRoyale.countdownLabel').replace('{n}', String(countdownDuration))}</label>
            <input
              type="number"
              min={1}
              max={10}
              value={countdownDuration}
              onChange={(e) => setCountdownDuration(Math.min(10, Math.max(1, Number(e.target.value))))}
              className="w-24 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
            />
            <p className="text-xs text-white/40 mt-1">{t('battleRoyale.countdownDesc')}</p>
          </div>
        </CardContent>
      </Card>

      {/* Player Selection */}
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
              {micAvailableProfiles.map(profile => {
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
                    title={isCompanion ? t('battleRoyale.companionNotAssignable') : undefined}
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
                    {isSelected && availableMics.length > 0 && (
                      <div className="mt-1.5" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={playerMicDevices[profile.id] || ''}
                          onChange={(e) => setPlayerMicDevices(prev => ({ ...prev, [profile.id]: e.target.value }))}
                          className="w-full text-[10px] bg-white/10 border border-white/20 rounded px-1.5 py-1 text-white/80 focus:outline-none focus:border-purple-400"
                        >
                          <option value="" className="bg-gray-900">
                            {t('battleRoyale.defaultMicrophone')}
                          </option>
                          {availableMics.map(mic => (
                            <option key={mic.deviceId} value={mic.deviceId} className="bg-gray-900">
                              {mic.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
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
                const isAutoCompanion = autoCompanionIds.has(profile.id);
                const companionClient = connectedCompanionClients.find(c => c.profile?.id === profile.id);
                const isLocked = isAutoCompanion || isMic;
                return (
                  <div
                    key={profile.id}
                    onClick={() => !isLocked && toggleCompanionPlayer(profile.id)}
                    className={`p-3 rounded-lg transition-all ${
                      isMic
                        ? 'opacity-30 cursor-not-allowed'
                        : isAutoCompanion
                          ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-2 border-green-500 cursor-default'
                          : isSelected
                            ? 'bg-gradient-to-br from-purple-500/30 to-indigo-500/30 border-2 border-purple-500 cursor-pointer'
                            : 'bg-white/5 border border-white/10 hover:bg-white/10 cursor-pointer'
                    }`}
                    title={isMic ? t('battleRoyale.companionNotAssignable') : undefined}
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
                      {isAutoCompanion && (
                        <Badge variant="outline" className="ml-auto border-green-500 text-green-400 text-[10px] px-1.5 py-0">
                          {t('battleRoyale.companionConnectedBadge')}
                        </Badge>
                      )}
                      {!isAutoCompanion && isSelected && <span className="ml-auto text-purple-400 text-lg">📱</span>}
                    </div>
                    {isAutoCompanion && companionClient && (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-[10px] text-white/50">
                          {t('battleRoyale.companionCodeLabel').replace('{code}', companionClient.connectionCode)}
                        </span>
                        <span className="text-[10px] text-white/30">
                          · {t('battleRoyale.companionAutoDetected')}
                        </span>
                      </div>
                    )}
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
