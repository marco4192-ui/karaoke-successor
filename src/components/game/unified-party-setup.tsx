'use client';

import { useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Song, PlayerProfile, GameMode } from '@/types/game';
import { usePartySetup } from './unified-party-setup.hook';
import { useTranslation } from '@/lib/i18n/translations';
import { getYears } from '@/lib/game/song-library';
import { GameSidebar, MobileGameHeader, SettingsPanel, PlayerGrid, SongSelectionGrid, SongFilterSection, ReadySummary, SingingDeviceAssignment, SingleMicSelector } from './unified-party-setup.components';
import { useAutoFocus } from '@/hooks/use-roving-focus';
import { useCompanionConnections } from '@/hooks/use-companion-connections';

// Re-export public API (only exports actually consumed by other modules)
export { SongVotingModal } from './unified-party-setup.components';
export { PARTY_GAME_CONFIGS } from './unified-party-setup.config';
export type { GameSetupResult } from './unified-party-setup.types';

// ===================== UNIFIED PARTY SETUP COMPONENT =====================

interface UnifiedPartySetupProps {
  gameMode: GameMode;
  profiles: PlayerProfile[];
  songs: Song[];
  onStartGame: (result: import('./unified-party-setup.types').GameSetupResult) => void;
  onSelectLibrary: (result: import('./unified-party-setup.types').GameSetupResult) => void;
  onVoteMode: (result: import('./unified-party-setup.types').GameSetupResult, _suggestedSongs: Song[]) => void;
  onBack: () => void;
  /** Pre-selected song from library/vote (user returned after picking a song) */
  preSelectedSong?: Song | null;
  /** Which song-selection method produced the pre-selected song ('library' | 'vote') */
  preSelectedMethod?: import('./unified-party-setup.types').SongSelectionOption | null;
  /** Called when the user switches back to a songless method (random/medley) */
  onClearSelectedSong?: () => void;
  /** Called when user wants to pick a different song (go back to library) */
  onChangePreselectedSong?: () => void;
  /** Restored setup form snapshot after returning from library/voting */
  initialDraft?: import('./unified-party-setup.types').PartySetupDraft | null;
  /** Persist the setup form before leaving to library/voting */
  onSaveDraft?: (_draft: import('./unified-party-setup.types').PartySetupDraft) => void;
}

export function UnifiedPartySetup({
  gameMode, profiles, songs, onStartGame, onSelectLibrary, onVoteMode, onBack,
  preSelectedSong, preSelectedMethod, onClearSelectedSong, onChangePreselectedSong,
  initialDraft, onSaveDraft,
}: UnifiedPartySetupProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-focus first interactive element when setup screen appears or gameMode changes
  useAutoFocus(containerRef, gameMode);

  // Also auto-focus on initial mount
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const timer = setTimeout(() => {
      const btn = container.querySelector<HTMLElement>('button:not([disabled])');
      btn?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Live companion connection status — needed for Singing Device Assignment
  // (companion players must be connected) and the player grid status dots.
  const connectedProfileIds = useCompanionConnections(true);

  const {
    config, activeProfiles, selectedPlayers, settings, setSettings,
    error, difficulty, setDifficulty, togglePlayer, handleSongSelection,
    songSelection, setSongSelection, resolvedSong, setResolvedSong, readyToPlay, handleReadyToPlay,
    inputMode,
    deviceMode, deviceAssignments, setPlayerDevice,
    micAssignments, assignMic, removeMicAssignment,
    savedMics, micCount,
    playersWithoutDevice, deviceBlockReason,
    selectedMicId, setSelectedMicId, setSelectedMicName,
    filterGenre, filterLanguage, filterCombined, filterReleaseYear,
    setFilterGenre, setFilterLanguage, setFilterCombined, setFilterReleaseYear,
    availableGenres, availableLanguages, filteredSongs,
  } = usePartySetup({
    gameMode, profiles, songs, onStartGame, onSelectLibrary, onVoteMode,
    initialSongSelection: preSelectedMethod ?? null,
    initialSelectedSong: preSelectedSong ?? null,
    onClearSelectedSong,
    initialDraft,
    onSaveDraft,
    connectedProfileIds,
  });

  // Keep the hook's song state in sync when the parent (party store) updates
  // the pre-selected song (e.g. after returning from library or voting).
  useEffect(() => {
    setResolvedSong(preSelectedSong ?? null);
  }, [preSelectedSong, setResolvedSong]);
  useEffect(() => {
    if (preSelectedMethod) setSongSelection(preSelectedMethod);
  }, [preSelectedMethod, setSongSelection]);

  const onSettingChange = (key: string, value: string | number | boolean) =>
    setSettings(prev => ({ ...prev, [key]: value }));

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const availableYears = useMemo(() => getYears(), [songs.length]);

  return (
    <div className="flex gap-4" data-focus-container="party-setup">
      <GameSidebar config={config} />

      <div className="flex-1 min-w-0" ref={containerRef}>
        {/* ── A. Header: Back-Button + Title ── */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={onBack} className="text-white/60 focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none" data-testid="party-setup-back-button">{t('unifiedSetup.back')}</Button>
          <div>
            <h1 className="text-3xl font-bold">{config.icon} {config.titleKey ? t(config.titleKey) : config.title}</h1>
            <p className="text-white/60">{config.descriptionKey ? t(config.descriptionKey) : config.description}</p>
          </div>
        </div>

        <MobileGameHeader config={config} />

        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6 text-red-400">{error}</div>
        )}

        {/* ── B. Player Selection ── */}
        <PlayerGrid
          config={config} activeProfiles={activeProfiles}
          selectedPlayers={selectedPlayers} togglePlayer={togglePlayer}
          inputMode={inputMode}
          connectedProfileIds={connectedProfileIds}
          deviceAssignments={deviceAssignments}
        />

        {/* ── D. Singing Device Assignment ── */}
        {/* D1. Shared mic (PTM): single dropdown for the mic that gets passed around */}
        {deviceMode === 'shared-mic' && selectedPlayers.length > 0 && (
          <SingleMicSelector
            selectedMicId={selectedMicId}
            onMicChange={(micId, micName) => {
              setSelectedMicId(micId);
              setSelectedMicName(micName);
            }}
          />
        )}

        {/* D2. Per-player device assignment (exclusive: BR + Medley; flexible: duel modes) */}
        {(deviceMode === 'exclusive' || deviceMode === 'flexible') && selectedPlayers.length > 0 && (
          <SingingDeviceAssignment
            mode={deviceMode}
            selectedPlayers={selectedPlayers}
            profiles={activeProfiles}
            savedMics={savedMics}
            micAssignments={micAssignments}
            deviceAssignments={deviceAssignments}
            connectedProfileIds={connectedProfileIds}
            onAssignMic={assignMic}
            onRemoveMic={removeMicAssignment}
            onSetPlayerDevice={setPlayerDevice}
          />
        )}

        {/* D3. CPTM: no Singing Device Assignment section — every player sings
            via Companion App. Show the connection requirement instead. */}
        {deviceMode === 'none' && selectedPlayers.length > 0 && (
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 mb-6">
            <p className="text-sm font-semibold text-purple-300 flex items-center gap-2">
              <span aria-hidden="true">📱</span>
              {t('unifiedSetup.singingDeviceAssignment')} — {t('unifiedSetup.deviceCompanion')}
            </p>
            <p className="text-xs text-white/50 mt-1">{t('unifiedSetup.deviceNeedAllCompanion')}</p>
            {playersWithoutDevice.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {playersWithoutDevice.map(pid => {
                  const profile = activeProfiles.find(p => p.id === pid);
                  if (!profile) return null;
                  return (
                    <span
                      key={pid}
                      className="flex items-center gap-1.5 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-full px-2.5 py-1"
                    >
                      <span aria-hidden="true">⚠</span>
                      {profile.name} — {t('unifiedSetup.deviceNotConnected')}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── E. Game Settings ── */}
        <SettingsPanel
          config={config} settings={settings} difficulty={difficulty}
          onSettingChange={onSettingChange} onDifficultyChange={setDifficulty}
        />

        {/* ── F. Song Filter ── */}
        <SongFilterSection
          filterGenre={filterGenre}
          filterLanguage={filterLanguage}
          filterCombined={filterCombined}
          availableGenres={availableGenres}
          availableLanguages={availableLanguages}
          totalSongs={songs.length}
          filteredSongs={filteredSongs.length}
          onFilterGenreChange={setFilterGenre}
          onFilterLanguageChange={setFilterLanguage}
          onFilterCombinedChange={setFilterCombined}
          filterReleaseYear={filterReleaseYear}
          availableYears={availableYears}
          onFilterReleaseYearChange={setFilterReleaseYear}
        />

        {/* ── G. Song Selection ── */}
        {/* Pre-selected Library/Vote Song Banner (display-only — the "Ready to Play" button below starts the game) */}
        {preSelectedSong && (
          <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-3xl shrink-0">
                🎵
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-green-400 font-medium uppercase tracking-wider">{t('unifiedSetup.songSelected')}</p>
                <h3 className="text-white font-bold text-lg truncate">{preSelectedSong.title}</h3>
                <p className="text-white/60 text-sm truncate">{preSelectedSong.artist}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                {onChangePreselectedSong && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onChangePreselectedSong}
                    className="border-white/20 text-white/80 hover:bg-white/10"
                    data-testid="party-setup-change-song-button"
                  >
                    {t('unifiedSetup.change')}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        <SongSelectionGrid
          config={config} selectedPlayerCount={selectedPlayers.length}
          onSongSelection={handleSongSelection}
          selectedOption={songSelection ?? null}
        />

        {/* ── H. Ready to Play ── */}
        <ReadySummary
          config={config} selectedPlayerCount={selectedPlayers.length}
          difficulty={difficulty} inputMode={inputMode}
          songSelection={songSelection ?? null}
          selectedSong={preSelectedSong ?? resolvedSong ?? null}
          readyToPlay={readyToPlay}
          onReadyToPlay={handleReadyToPlay}
          deviceBlockReason={deviceBlockReason}
          micCount={micCount}
        />
      </div>
    </div>
  );
}
