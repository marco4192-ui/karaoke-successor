'use client';

import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Song, PlayerProfile, PLAYER_COLORS, Difficulty, GameMode } from '@/types/game';

// ===================== GAME CONFIGURATION TYPES =====================

export interface GameSettingConfig {
  key: string;
  label: string;
  description?: string;
  type: 'slider' | 'toggle' | 'select';
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string | number; label: string }[];
  defaultValue: string | number | boolean;
  unit?: string;
}

export interface PartyGameConfig {
  mode: GameMode;
  title: string;
  icon: string;
  description: string;
  extendedDescription: string[];
  color: string;
  minPlayers: number;
  maxPlayers: number;
  settings: GameSettingConfig[];
  songSelectionOptions: SongSelectionOption[];
  supportsCompanionApp?: boolean;
}

export type SongSelectionOption = 'library' | 'random' | 'vote' | 'medley';

export interface SelectedPlayer {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  playerType: 'microphone' | 'companion';
}

export interface GameSetupResult {
  players: SelectedPlayer[];
  settings: Record<string, any>;
  songSelection: SongSelectionOption;
  difficulty: Difficulty;
}

// ===================== DEFAULT GAME CONFIGURATIONS =====================

export const PARTY_GAME_CONFIGS: Record<string, PartyGameConfig> = {
  'pass-the-mic': {
    mode: 'pass-the-mic',
    title: 'Pass the Mic',
    icon: '🎤',
    description: 'Take turns singing parts of a song!',
    extendedDescription: [
      '🎵 Der Song wird in Segmente unterteilt',
      '🔄 Nach jedem Segment wechselt der Sänger',
      '⚡ Mit Random Switches kann jederzeit gewechselt werden',
      '🏆 Der Team-Score wird am Ende zusammengezählt',
    ],
    color: 'from-cyan-500 to-blue-500',
    minPlayers: 2,
    maxPlayers: 8,
    settings: [
      {
        key: 'segmentDuration',
        label: 'Segment Duration',
        description: 'Duration of each singing segment',
        type: 'slider',
        min: 15,
        max: 60,
        step: 5,
        defaultValue: 30,
        unit: 's',
      },
      {
        key: 'randomSwitches',
        label: 'Random Switches',
        description: 'Randomly switch players mid-segment',
        type: 'toggle',
        defaultValue: true,
      },
    ],
    songSelectionOptions: ['library', 'random', 'vote', 'medley'],
    supportsCompanionApp: false,
  },
  'companion-singalong': {
    mode: 'companion-singalong',
    title: 'Companion Sing-A-Long',
    icon: '📱',
    description: 'Your phone randomly lights up - sing when it blinks!',
    extendedDescription: [
      '📱 Alle Spieler halten ihr Handy bereit',
      '⚡ Wenn das Handy aufleuchtet, bist du dran!',
      '🎤 Niemand weiß, wer als nächstes dran ist',
      '🏆 Sammle Punkte für dein Team',
    ],
    color: 'from-emerald-500 to-teal-500',
    minPlayers: 2,
    maxPlayers: 8,
    settings: [
      {
        key: 'minTurnDuration',
        label: 'Min Turn Duration',
        type: 'slider',
        min: 5,
        max: 30,
        step: 5,
        defaultValue: 15,
        unit: 's',
      },
      {
        key: 'maxTurnDuration',
        label: 'Max Turn Duration',
        type: 'slider',
        min: 30,
        max: 90,
        step: 5,
        defaultValue: 45,
        unit: 's',
      },
      {
        key: 'blinkWarning',
        label: 'Blink Warning',
        description: 'Warning time before switch',
        type: 'slider',
        min: 1,
        max: 5,
        step: 1,
        defaultValue: 3,
        unit: 's',
      },
    ],
    songSelectionOptions: ['library', 'random', 'vote', 'medley'],
    supportsCompanionApp: true,
  },
  'medley': {
    mode: 'medley',
    title: 'Medley Contest',
    icon: '🎵',
    description: 'Sing short snippets of multiple songs in a row!',
    extendedDescription: [
      '🎵 Zufällige Song-Snippets werden abgespielt',
      '⏱️ Jedes Snippet dauert nur kurze Zeit',
      '🎤 Singe so viele Songs wie möglich',
      '🏆 Punkte werden über alle Snippets summiert',
    ],
    color: 'from-purple-500 to-pink-500',
    minPlayers: 1,
    maxPlayers: 4,
    settings: [
      {
        key: 'snippetDuration',
        label: 'Snippet Duration',
        type: 'slider',
        min: 15,
        max: 60,
        step: 5,
        defaultValue: 30,
        unit: 's',
      },
      {
        key: 'snippetCount',
        label: 'Number of Songs',
        type: 'slider',
        min: 3,
        max: 10,
        step: 1,
        defaultValue: 5,
      },
      {
        key: 'transitionTime',
        label: 'Transition Time',
        description: 'Time between snippets',
        type: 'slider',
        min: 1,
        max: 5,
        step: 1,
        defaultValue: 3,
        unit: 's',
      },
    ],
    songSelectionOptions: ['random'], // Medley always uses random songs
    supportsCompanionApp: false,
  },
  'tournament': {
    mode: 'tournament',
    title: 'Tournament Mode',
    icon: '🏆',
    description: 'Single elimination bracket - Sudden Death!',
    extendedDescription: [
      '🏆 K.O.-System: Verlierer scheidet aus',
      '⚔️ 1-gegen-1 Matches',
      '🎯 Short Mode: Nur 60 Sekunden pro Match',
      '👑 Der letzte Gewinner ist der Champion!',
    ],
    color: 'from-amber-500 to-yellow-500',
    minPlayers: 2,
    maxPlayers: 32,
    settings: [
      {
        key: 'maxPlayers',
        label: 'Bracket Size',
        type: 'select',
        options: [
          { value: 2, label: '2 - Duel' },
          { value: 4, label: '4 Players' },
          { value: 8, label: '8 Players' },
          { value: 16, label: '16 Players' },
          { value: 32, label: '32 Players' },
        ],
        defaultValue: 8,
      },
      {
        key: 'shortMode',
        label: 'Short Mode',
        description: 'Each match lasts only 60 seconds',
        type: 'toggle',
        defaultValue: true,
      },
    ],
    songSelectionOptions: ['random'], // Tournament uses random songs per match
    supportsCompanionApp: false,
  },
  'battle-royale': {
    mode: 'battle-royale',
    title: 'Battle Royale',
    icon: '👑',
    description: 'All sing together - lowest score eliminated each round!',
    extendedDescription: [
      '🎤 Alle singen gleichzeitig',
      '📉 Der Spieler mit der niedrigsten Punktzahl scheidet aus',
      '🔄 Jede Runde ein neuer Song',
      '👑 Der letzte Sänger gewinnt!',
    ],
    color: 'from-red-600 to-pink-600',
    minPlayers: 2,
    maxPlayers: 8,
    settings: [
      {
        key: 'roundDuration',
        label: 'Round Duration',
        type: 'slider',
        min: 30,
        max: 180,
        step: 15,
        defaultValue: 60,
        unit: 's',
      },
      {
        key: 'finalRoundDuration',
        label: 'Final Round Duration',
        type: 'slider',
        min: 60,
        max: 300,
        step: 30,
        defaultValue: 120,
        unit: 's',
      },
      {
        key: 'medleyMode',
        label: 'Medley Mode',
        description: 'Multiple song snippets per round',
        type: 'toggle',
        defaultValue: false,
      },
    ],
    songSelectionOptions: ['random'], // Battle Royale uses random songs
    supportsCompanionApp: true,
  },
  'duel': {
    mode: 'duel',
    title: 'Duel Mode',
    icon: '⚔️',
    description: 'Two players compete head-to-head!',
    extendedDescription: [
      '⚔️ 1-gegen-1 Duell',
      '🎤 Beide singen den gleichen Song',
      '📊 Punkte werden live verglichen',
      '🏆 Der Spieler mit der höheren Punktzahl gewinnt',
    ],
    color: 'from-cyan-500 to-pink-500',
    minPlayers: 2,
    maxPlayers: 2,
    settings: [],
    songSelectionOptions: ['library', 'random', 'vote'],
    supportsCompanionApp: false,
  },
  'blind': {
    mode: 'blind',
    title: 'Blind Karaoke',
    icon: '🙈',
    description: 'Lyrics disappear for certain sections!',
    extendedDescription: [
      '🙈 Text verschwindet in bestimmten Abschnitten',
      '🧠 Singe aus dem Gedächtnis',
      '⭐ Je mehr du triffst, desto mehr Punkte',
      '🎵 Eine Herausforderung für echte Profis',
    ],
    color: 'from-green-500 to-teal-500',
    minPlayers: 1,
    maxPlayers: 4,
    settings: [
      {
        key: 'blindFrequency',
        label: 'Blind Frequency',
        description: 'How often lyrics disappear',
        type: 'select',
        options: [
          { value: 'rare', label: 'Rare (10%)' },
          { value: 'normal', label: 'Normal (25%)' },
          { value: 'often', label: 'Often (40%)' },
          { value: 'insane', label: 'Insane (60%)' },
        ],
        defaultValue: 'normal',
      },
    ],
    songSelectionOptions: ['library', 'random', 'vote'],
    supportsCompanionApp: false,
  },
  'missing-words': {
    mode: 'missing-words',
    title: 'Missing Words',
    icon: '📝',
    description: 'Some lyrics disappear - can you sing the right words?',
    extendedDescription: [
      '📝 Manche Wörter verschwinden aus dem Text',
      '🎤 Singe die fehlenden Wörter zur richtigen Zeit',
      '⭐ Bonuspunkte für korrekte Wörter',
      '🎵 Teste dein Song-Wissen!',
    ],
    color: 'from-orange-500 to-red-500',
    minPlayers: 1,
    maxPlayers: 4,
    settings: [
      {
        key: 'missingWordFrequency',
        label: 'Missing Word Frequency',
        type: 'select',
        options: [
          { value: 'easy', label: 'Easy (few words)' },
          { value: 'normal', label: 'Normal' },
          { value: 'hard', label: 'Hard (many words)' },
        ],
        defaultValue: 'normal',
      },
    ],
    songSelectionOptions: ['library', 'random', 'vote'],
    supportsCompanionApp: false,
  },
};

// ===================== SONG SELECTION BUTTONS CONFIG =====================

export const SONG_SELECTION_CONFIG = {
  library: {
    icon: '📚',
    label: 'From Library',
    description: 'Choose a song from your library',
    color: 'bg-cyan-500 hover:bg-cyan-600',
  },
  random: {
    icon: '🎲',
    label: 'Random Song',
    description: 'Let the game pick a random song',
    color: 'bg-purple-500 hover:bg-purple-600',
  },
  vote: {
    icon: '🗳️',
    label: 'Vote (3 Songs)',
    description: '3 songs are suggested - vote for your favorite',
    color: 'bg-amber-500 hover:bg-amber-600',
  },
  medley: {
    icon: '🎵',
    label: 'Medley Mix',
    description: 'Mix multiple songs together',
    color: 'bg-pink-500 hover:bg-pink-600',
  },
};

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
  
  // Filter to only show active profiles (isActive === true or undefined for backwards compatibility)
  const activeProfiles = useMemo(() => 
    profiles.filter(p => p.isActive !== false),
    [profiles]
  );
  
  // Initialize settings from config defaults
  const initialSettings = useMemo(() => {
    const settings: Record<string, any> = {};
    config.settings.forEach(s => {
      settings[s.key] = s.defaultValue;
    });
    return settings;
  }, [config]);

  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [settings, setSettings] = useState<Record<string, any>>(initialSettings);
  const [songSelection, setSongSelection] = useState<SongSelectionOption | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Difficulty from global store would be used, but for now local state
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');

  // Toggle player selection
  const togglePlayer = useCallback((playerId: string) => {
    setSelectedPlayers(prev => {
      if (prev.includes(playerId)) {
        return prev.filter(id => id !== playerId);
      }
      if (prev.length >= config.maxPlayers) {
        setError(`Maximum ${config.maxPlayers} players allowed`);
        return prev;
      }
      setError(null);
      return [...prev, playerId];
    });
  }, [config.maxPlayers]);

  // Create player objects
  const createPlayers = useCallback((): SelectedPlayer[] => {
    return selectedPlayers.map((id, index) => {
      const profile = profiles.find(p => p.id === id);
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
  const handleSongSelection = useCallback((option: SongSelectionOption) => {
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
        // Get 3 random songs for voting
        const shuffled = [...songs].sort(() => Math.random() - 0.5);
        const suggestedSongs = shuffled.slice(0, 3);
        onVoteMode(result, suggestedSongs);
        break;
      case 'medley':
        onStartGame(result);
        break;
    }
  }, [selectedPlayers, config.minPlayers, createPlayers, settings, difficulty, songs, onSelectLibrary, onStartGame, onVoteMode]);

  // Render setting control based on type
  const renderSettingControl = (setting: GameSettingConfig) => {
    const value = settings[setting.key];

    switch (setting.type) {
      case 'slider':
        return (
          <div key={setting.key} className="space-y-2">
            <label className="text-sm text-white/60 block">
              {setting.label}: {value}{setting.unit || ''}
            </label>
            <input
              type="range"
              min={setting.min}
              max={setting.max}
              step={setting.step}
              value={value}
              onChange={(e) => setSettings(prev => ({ ...prev, [setting.key]: Number(e.target.value) }))}
              className="w-full accent-cyan-500"
            />
            <div className="flex justify-between text-xs text-white/40">
              <span>{setting.min}{setting.unit || ''}</span>
              <span>{setting.max}{setting.unit || ''}</span>
            </div>
          </div>
        );

      case 'toggle':
        return (
          <div key={setting.key} className="flex items-center justify-between py-2">
            <div>
              <label className="font-medium">{setting.label}</label>
              {setting.description && (
                <p className="text-sm text-white/60">{setting.description}</p>
              )}
            </div>
            <Button
              variant={value ? 'default' : 'outline'}
              onClick={() => setSettings(prev => ({ ...prev, [setting.key]: !value }))}
              className={value ? 'bg-cyan-500 hover:bg-cyan-600' : 'border-white/20'}
            >
              {value ? '✓ On' : 'Off'}
            </Button>
          </div>
        );

      case 'select':
        return (
          <div key={setting.key} className="space-y-2">
            <label className="text-sm text-white/60 block">{setting.label}</label>
            <div className="flex gap-2 flex-wrap">
              {setting.options?.map(opt => (
                <Button
                  key={opt.value}
                  variant={value === opt.value ? 'default' : 'outline'}
                  onClick={() => setSettings(prev => ({ ...prev, [setting.key]: opt.value }))}
                  className={value === opt.value ? 'bg-cyan-500 hover:bg-cyan-600' : 'border-white/20'}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

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
                  <p key={i} className="text-sm text-white/70">{desc}</p>
                ))}
              </div>

              <div className="mt-4 flex gap-2">
                <Badge className="bg-white/20 text-white">
                  {config.minPlayers}-{config.maxPlayers} players
                </Badge>
                {config.supportsCompanionApp && (
                  <Badge className="bg-purple-500/30 text-purple-200">
                    📱 Companion
                  </Badge>
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
            <h1 className="text-3xl font-bold">{config.icon} {config.title}</h1>
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
              {config.settings.map(renderSettingControl)}

              {/* Difficulty (always shown) */}
              <div className="pt-4 border-t border-white/10">
                <label className="text-sm text-white/60 mb-2 block">Difficulty</label>
                <div className="flex gap-2">
                  {(['easy', 'medium', 'hard'] as Difficulty[]).map(diff => (
                    <Button
                      key={diff}
                      variant={difficulty === diff ? 'default' : 'outline'}
                      onClick={() => setDifficulty(diff)}
                      className={difficulty === diff ? `bg-gradient-to-r ${config.color}` : 'border-white/20'}
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
        <Card className="bg-white/5 border-white/10 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-xl">👥</span>
              Player Selection ({selectedPlayers.length}/{config.maxPlayers})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {activeProfiles.map(profile => {
                const isSelected = selectedPlayers.includes(profile.id);
                return (
                  <div
                    key={profile.id}
                    onClick={() => togglePlayer(profile.id)}
                    className={`p-4 rounded-lg cursor-pointer transition-all ${
                      isSelected 
                        ? `bg-gradient-to-br ${config.color} border-2 border-white/50` 
                        : 'bg-white/5 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {profile.avatar ? (
                        <img src={profile.avatar} alt={profile.name} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: profile.color }}
                        >
                          {profile.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="font-medium truncate">{profile.name}</span>
                      {isSelected && <span className="ml-auto text-white">✓</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {activeProfiles.length < config.minPlayers && (
              <p className="text-yellow-400 mt-4">
                ⚠️ Need at least {config.minPlayers} active profiles. Create more in Character selection or activate existing ones.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Section 3: Song Selection Options */}
        <Card className="bg-white/5 border-white/10 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-xl">🎵</span>
              Song Selection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {config.songSelectionOptions.map(option => {
                const optConfig = SONG_SELECTION_CONFIG[option];
                return (
                  <button
                    key={option}
                    onClick={() => handleSongSelection(option)}
                    disabled={selectedPlayers.length < config.minPlayers}
                    className={`p-4 rounded-xl text-center transition-all ${
                      selectedPlayers.length >= config.minPlayers
                        ? `${optConfig.color} text-white hover:scale-105`
                        : 'bg-white/5 text-white/30 cursor-not-allowed'
                    }`}
                  >
                    <div className="text-4xl mb-2">{optConfig.icon}</div>
                    <div className="font-bold">{optConfig.label}</div>
                    <div className="text-xs opacity-80 mt-1">{optConfig.description}</div>
                  </button>
                );
              })}
            </div>

            {/* Additional Ideas */}
            <div className="mt-6 pt-4 border-t border-white/10">
              <p className="text-white/40 text-sm mb-2">💡 Additional Ideas:</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="border-white/20 text-white/50">
                  🎯 Challenge Mode
                </Badge>
                <Badge variant="outline" className="border-white/20 text-white/50">
                  🌍 Country Selection
                </Badge>
                <Badge variant="outline" className="border-white/20 text-white/50">
                  📊 By Difficulty
                </Badge>
                <Badge variant="outline" className="border-white/20 text-white/50">
                  ⏱️ By Duration
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

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
  const [votes, setVotes] = useState<Record<string, string>>({}); // playerId -> songId

  const handleVote = (songId: string) => {
    // For now, direct click = immediate selection
    // TODO: In future, collect votes from all players (companion app)
    onVote(songId);
  };

  const getVoteCount = (songId: string) => {
    return Object.values(votes).filter(v => v === songId).length;
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
                  <img src={song.coverImage} alt="" className="w-full aspect-square rounded-lg object-cover mb-3" />
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
