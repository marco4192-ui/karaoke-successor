'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Song, PlayerProfile, Difficulty } from '@/types/game';
import { SONG_SELECTION_CONFIG } from './unified-party-setup.config';
import type { PartyGameConfig, GameSettingConfig, SelectedPlayer, SongSelectionOption, InputMode } from './unified-party-setup.types';
import { INPUT_MODE_CONFIG } from './unified-party-setup.types';
import { LANGUAGE_NAMES } from '@/lib/i18n/translations';
import { ConnectionStatusBadge } from './connection-status-badge';

// ===================== SETTING CONTROL =====================

function SettingControl({
  setting, value, onChange,
}: {
  setting: GameSettingConfig;
  value: string | number | boolean;
  onChange: (key: string, value: string | number | boolean) => void;
}) {
  switch (setting.type) {
    case 'slider':
      return (
        <div className="space-y-2">
          <label className="text-sm text-white/60 block">
            {setting.label}: {value}{setting.unit || ''}
          </label>
          <input
            type="range" min={setting.min} max={setting.max} step={setting.step}
            value={value}
            onChange={(e) => onChange(setting.key, Number(e.target.value))}
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
        <div className="flex items-center justify-between py-2">
          <div>
            <label className="font-medium">{setting.label}</label>
            {setting.description && <p className="text-sm text-white/60">{setting.description}</p>}
          </div>
          <Button
            variant={value ? 'default' : 'outline'}
            onClick={() => onChange(setting.key, !value)}
            className={value ? 'bg-cyan-500 hover:bg-cyan-600' : 'border-white/20'}
          >
            {value ? '✓ On' : 'Off'}
          </Button>
        </div>
      );
    case 'select':
      return (
        <div className="space-y-2">
          <label className="text-sm text-white/60 block">{setting.label}</label>
          <div className="flex gap-2 flex-wrap">
            {setting.options?.map(opt => (
              <Button
                key={String(opt.value)}
                variant={value === opt.value ? 'default' : 'outline'}
                onClick={() => onChange(setting.key, opt.value)}
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
}

// ===================== GAME SIDEBAR =====================

function GameSidebar({ config }: { config: PartyGameConfig }) {
  return (
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
              <Badge className="bg-white/20 text-white">{config.minPlayers}-{config.maxPlayers} players</Badge>
              {config.supportsCompanionApp && (
                <Badge className="bg-purple-500/30 text-purple-200">📱 Companion</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ===================== MOBILE GAME HEADER =====================

function MobileGameHeader({ config }: { config: PartyGameConfig }) {
  return (
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
  );
}

// ===================== SETTINGS PANEL =====================

function SettingsPanel({
  config, settings, difficulty, onSettingChange, onDifficultyChange,
}: {
  config: PartyGameConfig;
  settings: Record<string, any>;
  difficulty: Difficulty;
  onSettingChange: (key: string, value: string | number | boolean) => void;
  onDifficultyChange: (d: Difficulty) => void;
}) {
  if (config.settings.length === 0) return null;

  return (
    <Card className="bg-white/5 border-white/10 mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><span className="text-xl">⚙️</span>Game Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {config.settings.map(s => (
          <SettingControl key={s.key} setting={s} value={settings[s.key]} onChange={onSettingChange} />
        ))}
        <div className="pt-4 border-t border-white/10">
          <label className="text-sm text-white/60 mb-2 block">Difficulty</label>
          <div className="flex gap-2">
            {(['easy', 'medium', 'hard'] as Difficulty[]).map(diff => (
              <Button
                key={diff}
                variant={difficulty === diff ? 'default' : 'outline'}
                onClick={() => onDifficultyChange(diff)}
                className={difficulty === diff ? `bg-gradient-to-r ${config.color}` : 'border-white/20'}
              >
                {diff.charAt(0).toUpperCase() + diff.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ===================== PLAYER GRID =====================

// ===================== INPUT MODE SELECTOR =====================

function InputModeSelector({
  inputMode,
  onInputModeChange,
  supportsCompanionApp,
  forceInputMode,
}: {
  inputMode: InputMode;
  onInputModeChange: (mode: InputMode) => void;
  supportsCompanionApp?: boolean;
  forceInputMode?: InputMode;
}) {
  // If input mode is forced (e.g. companion-singalong requires companion-only),
  // don't show the selector at all.
  if (forceInputMode) return null;

  const modes: InputMode[] = supportsCompanionApp
    ? ['microphone', 'companion', 'mixed']
    : ['microphone'];

  return (
    <Card className="bg-white/5 border-white/10 mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-xl">🎮</span>
          Input Mode
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {modes.map(mode => {
            const modeConfig = INPUT_MODE_CONFIG[mode];
            const isActive = inputMode === mode;
            return (
              <button
                key={mode}
                onClick={() => onInputModeChange(mode)}
                className={`p-4 rounded-xl text-left transition-all ${
                  isActive
                    ? `${modeConfig.color} text-white ring-2 ring-white/30`
                    : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="text-2xl mb-1">{modeConfig.icon}</div>
                <div className="font-bold text-sm">{modeConfig.label}</div>
                <div className="text-xs opacity-70 mt-1">{modeConfig.description}</div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ===================== MIC ASSIGNMENT PANEL =====================

function MicAssignmentPanel({
  selectedPlayers,
  profiles,
  micAssignments,
  onAssignMic,
  onRemoveMic,
  inputMode,
}: {
  selectedPlayers: string[];
  profiles: PlayerProfile[];
  micAssignments: Record<string, string>;
  onAssignMic: (micId: string, playerId: string) => void;
  onRemoveMic: (micId: string) => void;
  inputMode: InputMode;
}) {
  // Load saved mic configs from localStorage
  const [savedMics, setSavedMics] = useState<Array<{ id: string; customName: string; deviceName: string }>>([]);

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('karaoke-multi-mic-config');
      if (saved) {
        const parsed = JSON.parse(saved);
        setSavedMics((parsed.assignedMics || []).map((m: { id: string; customName?: string; deviceName?: string }) => ({
          id: m.id,
          customName: m.customName,
          deviceName: m.deviceName,
        })));
      }
    } catch { /* ignore */ }
  }, []);

  const micPlayers = inputMode === 'mixed'
    ? selectedPlayers // In mixed mode, all players could use mics
    : selectedPlayers;

  const usedMicIds = new Set(Object.keys(micAssignments));

  return (
    <Card className="bg-white/5 border-white/10 mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-xl">🎤</span>
          Mikrofon-Zuordnung
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {micPlayers.map((playerId, index) => {
            const profile = profiles.find(p => p.id === playerId);
            if (!profile) return null;

            const currentMicEntry = Object.entries(micAssignments).find(([, pid]) => pid === playerId);
            const currentMicId = currentMicEntry?.[0];
            const currentMic = currentMicId ? savedMics.find(m => m.id === currentMicId) : null;

            return (
              <div key={playerId} className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                  style={{ backgroundColor: profile.color }}
                >
                  {profile.avatar ? (
                    <img src={profile.avatar} alt={profile.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    profile.name.charAt(0).toUpperCase()
                  )}
                </div>
                <span className="font-medium text-sm truncate min-w-[80px]">{profile.name}</span>
                <span className="text-white/40 text-xs">→</span>
                <select
                  value={currentMicId || ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      onAssignMic(e.target.value, playerId);
                    } else {
                      currentMicId && onRemoveMic(currentMicId);
                    }
                  }}
                  className="flex-1 bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                >
                  <option value="">— Kein Mikro zugewiesen —</option>
                  {savedMics
                    .filter(m => !usedMicIds.has(m.id) || m.id === currentMicId)
                    .map(mic => (
                      <option key={mic.id} value={mic.id}>
                        {mic.customName || mic.deviceName}
                      </option>
                    ))
                  }
                </select>
                {currentMic && (
                  <button
                    onClick={() => currentMicId && onRemoveMic(currentMicId)}
                    className="text-red-400/60 hover:text-red-400 transition-colors p-1"
                    title="Zuordnung entfernen"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {savedMics.length === 0 && (
          <p className="text-xs text-white/40 mt-3">
            ⚠️ Keine Mikrofone konfiguriert. Gehe zu Settings → Mikrofon, um Mikrofone hinzuzufügen.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ===================== SINGLE MIC SELECTOR =====================

export function SingleMicSelector({
  selectedMicId,
  onMicChange,
}: {
  selectedMicId: string | null;
  onMicChange: (micId: string, micName: string) => void;
}) {
  // Load savedMics synchronously from localStorage to avoid initial render
  // with empty list (which resets the selectedMicId to default)
  const [savedMics, setSavedMics] = useState<Array<{ id: string; customName: string; deviceName: string }>>(() => {
    try {
      const saved = localStorage.getItem('karaoke-multi-mic-config');
      if (saved) {
        const parsed = JSON.parse(saved);
        return (parsed.assignedMics || []).map((m: { id: string; customName?: string; deviceName?: string }) => ({
          id: m.id,
          customName: m.customName,
          deviceName: m.deviceName,
        }));
      }
    } catch { /* ignore */ }
    return [];
  });

  // Re-sync savedMics when component remounts (e.g., navigating back from game)
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('karaoke-multi-mic-config');
      if (saved) {
        const parsed = JSON.parse(saved);
        const mics = (parsed.assignedMics || []).map((m: { id: string; customName?: string; deviceName?: string }) => ({
          id: m.id,
          customName: m.customName,
          deviceName: m.deviceName,
        }));
        setSavedMics(prev => {
          if (prev.length === mics.length && prev.every((m, i) => m.id === mics[i].id)) return prev;
          return mics;
        });
      }
    } catch { /* ignore */ }
  }, []);

  // Ensure the currently selected mic is in savedMics (may be missing if mic
  // was configured in a different session or mic config was modified).
  // If found, also update the display name from the mic config.
  const micOptions = React.useMemo(() => {
    const ids = new Set(savedMics.map(m => m.id));
    if (selectedMicId && !ids.has(selectedMicId)) {
      // Selected mic not in list — add a placeholder entry so the
      // select dropdown shows the correct value instead of the placeholder.
      return [
        ...savedMics,
        { id: selectedMicId, customName: '', deviceName: selectedMicId },
      ];
    }
    return savedMics;
  }, [savedMics, selectedMicId]);

  // Derive display name for the currently selected mic
  const selectedMicDisplayName = selectedMicId
    ? savedMics.find(m => m.id === selectedMicId)?.customName
      || savedMics.find(m => m.id === selectedMicId)?.deviceName
      || selectedMicId
    : null;

  return (
    <Card className="bg-white/5 border-white/10 mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-xl">🎤</span>
          Mikrofon-Auswahl
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <select
            value={selectedMicId || ''}
            onChange={(e) => {
              const mic = savedMics.find(m => m.id === e.target.value);
              if (mic) {
                onMicChange(mic.id, mic.customName || mic.deviceName);
              }
            }}
            className="flex-1 bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value="">
              {selectedMicDisplayName
                ? `${selectedMicDisplayName}`
                : '— Mikrofon auswählen —'}
            </option>
            {micOptions.map(mic => (
              <option key={mic.id} value={mic.id}>
                {mic.customName || mic.deviceName}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-white/40 mt-2">
          Dieses Mikrofon wird von allen Spielern geteilt und bei jedem Spielerwechsel weitergegeben.
        </p>
        {savedMics.length === 0 && (
          <p className="text-xs text-yellow-400 mt-3">
            Keine Mikrofone konfiguriert. Gehe zu Settings &rarr; Mikrofon, um Mikrofone hinzuzufügen.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ===================== PLAYER GRID (Component) =====================

function PlayerGrid({
  config, activeProfiles, selectedPlayers, togglePlayer, inputMode,
}: {
  config: PartyGameConfig;
  activeProfiles: PlayerProfile[];
  selectedPlayers: string[];
  togglePlayer: (id: string) => void;
  inputMode?: InputMode;
}) {
  const getTypeIcon = (profile: PlayerProfile) => {
    if (!inputMode || inputMode === 'microphone') return '🎤';
    if (inputMode === 'companion') return '📱';
    // mixed: show mic by default
    return '🎤';
  };

  // Check if any input mode involves companion app
  const showConnectionStatus = inputMode === 'companion' || inputMode === 'mixed';

  return (
    <Card className="bg-white/5 border-white/10 mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-xl">👥</span>
          Player Selection ({selectedPlayers.length}/{config.maxPlayers})
          {showConnectionStatus && (
            <span className="text-xs text-white/40 font-normal ml-2">
              (🎮 Mic-Spieler • 📱 Companion)
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {activeProfiles.map((profile, profileIndex) => {
            const isSelected = selectedPlayers.includes(profile.id);
            const typeIcon = getTypeIcon(profile);
            // In mixed mode, first half uses mic, second half uses companion
            const isCompanionInMixed = inputMode === 'mixed' && profileIndex >= Math.ceil(activeProfiles.length / 2);
            const isCompanionPlayer = inputMode === 'companion' || isCompanionInMixed;

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
                  {/* Avatar with optional connection ring */}
                  <div className="relative flex-shrink-0">
                    {profile.avatar ? (
                      <img src={profile.avatar} alt={profile.name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: profile.color }}>
                        {profile.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {/* Show connection status badge for companion players when selected */}
                    {isSelected && isCompanionPlayer && (
                      <div className="absolute -bottom-0.5 -right-0.5">
                        <ConnectionStatusBadge
                          player={{
                            id: profile.id,
                            name: profile.name,
                            color: profile.color,
                            playerType: 'companion',
                            isConnected: false, // Will be updated by mobile sync
                          }}
                          size="sm"
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium truncate">{profile.name}</span>
                    {isSelected && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] opacity-70">
                          {isCompanionPlayer ? '📱' : '🎤'}
                        </span>
                        {isCompanionPlayer && (
                          <span className="text-[10px] text-white/40">
                            (nicht verbunden)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  {isSelected && <span className="ml-auto text-white">✓</span>}
                </div>
              </div>
            );
          })}
        </div>
        {activeProfiles.length < config.minPlayers && (
          <p className="text-yellow-400 mt-4">
            ⚠️ Mindestens {config.minPlayers} aktive Profile benötigt. Erstelle weitere in der Charakterauswahl oder aktiviere bestehende.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ===================== SONG FILTER SECTION =====================

interface SongFilterSectionProps {
  filterGenre: string;
  filterLanguage: string;
  filterCombined: boolean;
  availableGenres: string[];
  availableLanguages: string[];
  totalSongs: number;
  filteredSongs: number;
  onFilterGenreChange: (genre: string) => void;
  onFilterLanguageChange: (language: string) => void;
  onFilterCombinedChange: (combined: boolean) => void;
}

function SongFilterSection({
  filterGenre,
  filterLanguage,
  filterCombined,
  availableGenres,
  availableLanguages,
  totalSongs,
  filteredSongs,
  onFilterGenreChange,
  onFilterLanguageChange,
  onFilterCombinedChange,
}: SongFilterSectionProps) {
  const hasActiveFilter = filterGenre !== 'all' || filterLanguage !== 'all';

  return (
    <Card className="bg-white/5 border-white/10 mb-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2"><span className="text-xl">🔍</span>Song Filter</span>
          {hasActiveFilter && (
            <Badge className="bg-indigo-500/20 text-indigo-400">
              {filteredSongs} von {totalSongs} Songs
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4 items-end">
          {/* Genre Dropdown */}
          <div className="flex-1 min-w-[180px]">
            <label className="text-sm text-white/60 mb-1 block">🎸 Genre</label>
            <select
              value={filterGenre}
              onChange={(e) => onFilterGenreChange(e.target.value)}
              className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            >
              <option value="all">Alle Genres</option>
              {availableGenres.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* Language Dropdown */}
          <div className="flex-1 min-w-[180px]">
            <label className="text-sm text-white/60 mb-1 block">🌍 Sprache</label>
            <select
              value={filterLanguage}
              onChange={(e) => onFilterLanguageChange(e.target.value)}
              className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            >
              <option value="all">Alle Sprachen</option>
              {availableLanguages.map(l => (
                <option key={l} value={l}>{LANGUAGE_NAMES[l] || l}</option>
              ))}
            </select>
          </div>

          {/* Combined Toggle */}
          <div className="min-w-[160px]">
            <label className="text-sm text-white/60 mb-1 block">🔗 Filter-Logik</label>
            <div className="flex gap-1">
              <button
                onClick={() => onFilterCombinedChange(true)}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  filterCombined
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-700 text-white/60 hover:bg-gray-600'
                }`}
              >
                Kombiniert (UND)
              </button>
              <button
                onClick={() => onFilterCombinedChange(false)}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  !filterCombined
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-700 text-white/60 hover:bg-gray-600'
                }`}
              >
                Unabhängig (ODER)
              </button>
            </div>
          </div>

          {/* Clear Filter */}
          {hasActiveFilter && (
            <button
              onClick={() => {
                onFilterGenreChange('all');
                onFilterLanguageChange('all');
              }}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-white/60 hover:text-white transition-all"
              title="Filter zurücksetzen"
            >
              ✕
            </button>
          )}
        </div>

        {/* Song count when filter is active */}
        {hasActiveFilter && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <p className="text-xs text-white/40">
              {filteredSongs === totalSongs
                ? 'Kein Filter aktiv — alle Songs verfügbar'
                : `${filteredSongs} Song${filteredSongs !== 1 ? 's' : ''} passen auf die Filter${filterCombined ? ' (beide Bedingungen müssen erfüllt sein)' : ' (mindestens eine Bedingung)'}`
              }
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ===================== SONG SELECTION GRID =====================

function SongSelectionGrid({
  config, selectedPlayerCount, onSongSelection,
}: {
  config: PartyGameConfig;
  selectedPlayerCount: number;
  onSongSelection: (option: SongSelectionOption) => void;
}) {
  return (
    <Card className="bg-white/5 border-white/10 mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><span className="text-xl">🎵</span>Song Selection</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {config.songSelectionOptions.map(option => {
            const optConfig = SONG_SELECTION_CONFIG[option];
            const enabled = selectedPlayerCount >= config.minPlayers;
            return (
              <button
                key={option}
                onClick={() => onSongSelection(option)}
                disabled={!enabled}
                className={`p-4 rounded-xl text-center transition-all ${
                  enabled
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
      </CardContent>
    </Card>
  );
}

// ===================== READY SUMMARY =====================

function ReadySummary({
  config, selectedPlayerCount, difficulty, inputMode,
}: {
  config: PartyGameConfig;
  selectedPlayerCount: number;
  difficulty: Difficulty;
  inputMode?: InputMode;
}) {
  const modeLabel = inputMode
    ? INPUT_MODE_CONFIG[inputMode].label
    : 'Mikrofone';
  return (
    <Card className={`bg-gradient-to-r ${config.color} border-0 mb-6`}>
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg text-white">Ready to Play!</h3>
            <p className="text-sm text-white/80">{selectedPlayerCount} players • {difficulty} • {modeLabel}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-white">{selectedPlayerCount}</div>
            <div className="text-xs text-white/60">players</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ===================== SONG VOTING MODAL =====================

export function SongVotingModal({ songs, players, onVote, onClose, gameColor }: {
  songs: Song[];
  players: SelectedPlayer[];
  onVote: (songId: string) => void;
  onClose: () => void;
  gameColor: string;
}) {
  const [votes, setVotes] = useState<Record<string, string>>({});

  // Restore cover URLs for voting songs (Tauri: relative paths, Browser: IndexedDB)
  const [enrichedSongs, setEnrichedSongs] = useState<Song[]>(songs);
  useEffect(() => {
    let cancelled = false;
    const restoreCovers = async () => {
      try {
        const { ensureSongUrls } = await import('@/lib/game/song-library');
        const restored = await Promise.all(
          songs.map(async (s) => {
            if (s.coverImage) return s; // Already has cover
            // Try ensureSongUrls first (handles Tauri relative paths)
            try {
              const withUrls = await ensureSongUrls(s);
              if (withUrls.coverImage) return withUrls;
            } catch { /* continue fallback */ }
            // Fallback: check IndexedDB for stored media (browser mode)
            try {
              if (s.storedMedia) {
                const { getSongMediaUrls } = await import('@/lib/db/media-db');
                const urls = await getSongMediaUrls(s.id);
                if (urls.coverUrl) return { ...s, coverImage: urls.coverUrl };
              }
            } catch { /* non-critical */ }
            // Fallback: try constructing cover from coverFile and folderPath
            if (s.coverFile && s.folderPath) {
              try {
                const { isTauri } = await import('@/lib/game/song-library');
                if (isTauri()) {
                  const { convertFileSrc } = await import('@tauri-apps/api/core');
                  const path = s.baseFolder
                    ? `${s.baseFolder}/${s.folderPath}/${s.coverFile}`
                    : `${s.folderPath}/${s.coverFile}`;
                  const url = convertFileSrc(path);
                  return { ...s, coverImage: url };
                }
              } catch { /* non-critical */ }
            }
            return s;
          })
        );
        if (!cancelled) setEnrichedSongs(restored);
      } catch { /* non-critical */ }
    };
    restoreCovers();
    return () => { cancelled = true; };
  }, [songs]);

  const handleVote = (songId: string) => onVote(songId);

  const getVoteCount = (songId: string) =>
    Object.values(votes).filter(v => v === songId).length;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="bg-gray-900 border-white/20 max-w-4xl w-full max-h-[90vh] overflow-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl">🗳️ Vote for a Song!</CardTitle>
          <Button variant="ghost" onClick={onClose} className="text-white/60">✕</Button>
        </CardHeader>
        <CardContent>
          <p className="text-white/60 mb-6">Click on a song to vote for it. The song with the most votes will be played!</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {enrichedSongs.map((song, index) => (
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
                  <div className="w-full aspect-square rounded-lg bg-black/20 flex items-center justify-center text-6xl mb-3">🎵</div>
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

// ===================== EXPORT ALL SUB-COMPONENTS =====================

export { GameSidebar, MobileGameHeader, SettingsPanel, PlayerGrid, SongSelectionGrid, SongFilterSection, ReadySummary, InputModeSelector, MicAssignmentPanel, SingleMicSelector };
