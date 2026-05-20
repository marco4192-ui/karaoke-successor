'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlayerProfile, Difficulty } from '@/types/game';
import { SONG_SELECTION_CONFIG } from './unified-party-setup.config';
import type { PartyGameConfig, SongSelectionOption, InputMode } from './unified-party-setup.types';
import { INPUT_MODE_CONFIG } from './unified-party-setup.types';
import { LANGUAGE_NAMES } from '@/lib/i18n/translations';
import type { Language } from '@/lib/i18n/translations';
import { useTranslation } from '@/lib/i18n/translations';
import { ConnectionStatusBadge } from './connection-status-badge';

// ===================== PLAYER GRID =====================

export function PlayerGrid({
  config, activeProfiles, selectedPlayers, togglePlayer, inputMode,
}: {
  config: PartyGameConfig;
  activeProfiles: PlayerProfile[];
  selectedPlayers: string[];
  togglePlayer: (_id: string) => void;
  inputMode?: InputMode;
}) {

  const { t } = useTranslation();

  // Check if any input mode involves companion app
  const showConnectionStatus = inputMode === 'companion' || inputMode === 'mixed';

  return (
    <Card className="bg-white/5 border-white/10 mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-xl">👥</span>
          {t('unifiedSetup.playerSelectionCount').replace('{n}', String(selectedPlayers.length)).replace('{m}', String(config.maxPlayers))}
          {showConnectionStatus && (
            <span className="text-xs text-white/40 font-normal ml-2">
              {t('unifiedSetup.micPlayersCompanion')}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {activeProfiles.map((profile) => {
            const isSelected = selectedPlayers.includes(profile.id);
            // In mixed mode, first half uses mic, second half uses companion.
            // Must use position in selectedPlayers (matches actual game logic in hook).
            const selectedIdx = selectedPlayers.indexOf(profile.id);
            const isCompanionInMixed = inputMode === 'mixed' && selectedIdx >= 0 && selectedIdx >= Math.ceil(selectedPlayers.length / 2);
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
                            {t('unifiedSetup.notConnected')}
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
            {t('unifiedSetup.minPlayersRequired').replace('{n}', String(config.minPlayers))}
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
  onFilterGenreChange: (_genre: string) => void;
  onFilterLanguageChange: (_language: string) => void;
  onFilterCombinedChange: (_combined: boolean) => void;
}

export function SongFilterSection({
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
  const { t } = useTranslation();
  const hasActiveFilter = filterGenre !== 'all' || filterLanguage !== 'all';

  return (
    <Card className="bg-white/5 border-white/10 mb-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2"><span className="text-xl">🔍</span>{t('unifiedSetup.songFilter')}</span>
          {hasActiveFilter && (
            <Badge className="bg-indigo-500/20 text-indigo-400">
              {t('unifiedSetup.songsOfTotal').replace('{n}', String(filteredSongs)).replace('{m}', String(totalSongs))}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4 items-end">
          {/* Genre Dropdown */}
          <div className="flex-1 min-w-[180px]">
            <label className="text-sm text-white/60 mb-1 block">{t('unifiedSetup.genre')}</label>
            <select
              value={filterGenre}
              onChange={(e) => onFilterGenreChange(e.target.value)}
              className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            >
              <option value="all">{t('unifiedSetup.allGenres')}</option>
              {availableGenres.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* Language Dropdown */}
          <div className="flex-1 min-w-[180px]">
            <label className="text-sm text-white/60 mb-1 block">{t('unifiedSetup.language')}</label>
            <select
              value={filterLanguage}
              onChange={(e) => onFilterLanguageChange(e.target.value)}
              className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            >
              <option value="all">{t('unifiedSetup.allLanguages')}</option>
              {availableLanguages.map(l => (
                <option key={l} value={l}>{LANGUAGE_NAMES[l as Language] || l}</option>
              ))}
            </select>
          </div>

          {/* Combined Toggle */}
          <div className="min-w-[160px]">
            <label className="text-sm text-white/60 mb-1 block">{t('unifiedSetup.filterLogic')}</label>
            <div className="flex gap-1">
              <button
                onClick={() => onFilterCombinedChange(true)}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  filterCombined
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-700 text-white/60 hover:bg-gray-600'
                }`}
              >
                {t('unifiedSetup.combined')}
              </button>
              <button
                onClick={() => onFilterCombinedChange(false)}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  !filterCombined
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-700 text-white/60 hover:bg-gray-600'
                }`}
              >
                {t('unifiedSetup.independent')}
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
              title={t('unifiedSetup.resetFilter')}
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
                ? t('unifiedSetup.noFilterActive')
                : (filterCombined ? t('unifiedSetup.songsMatchFilter') : t('unifiedSetup.songsMatchAnyFilter')).replace('{n}', String(filteredSongs))
              }
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ===================== SONG SELECTION GRID =====================

export function SongSelectionGrid({
  config, selectedPlayerCount, onSongSelection,
}: {
  config: PartyGameConfig;
  selectedPlayerCount: number;
  onSongSelection: (_option: SongSelectionOption) => void;
}) {
  const { t } = useTranslation();
  return (
    <Card className="bg-white/5 border-white/10 mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><span className="text-xl">🎵</span>{t('unifiedSetup.songSelection')}</CardTitle>
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
                <div className="font-bold">{t(optConfig.labelKey)}</div>
                <div className="text-xs opacity-80 mt-1">{t(optConfig.descriptionKey)}</div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ===================== READY SUMMARY =====================

export function ReadySummary({
  config, selectedPlayerCount, difficulty, inputMode,
}: {
  config: PartyGameConfig;
  selectedPlayerCount: number;
  difficulty: Difficulty;
  inputMode?: InputMode;
}) {
  const { t } = useTranslation();
  const modeLabel = inputMode
    ? t(INPUT_MODE_CONFIG[inputMode].labelKey)
    : t('unifiedSetup.fallbackMicrophones');
  return (
    <Card className={`bg-gradient-to-r ${config.color} border-0 mb-6`}>
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg text-white">{t('unifiedSetup.readyToPlay')}</h3>
            <p className="text-sm text-white/80">{selectedPlayerCount} {t('unifiedSetup.playerCountLabel')} • {difficulty} • {modeLabel}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-white">{selectedPlayerCount}</div>
            <div className="text-xs text-white/60">{t('unifiedSetup.playerCountLabel')}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
