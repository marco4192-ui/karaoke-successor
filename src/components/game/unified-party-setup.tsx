'use client';

import { Button } from '@/components/ui/button';
import { Song, PlayerProfile, GameMode } from '@/types/game';
import { usePartySetup } from './unified-party-setup.hook';
import { SongVotingModal, GameSidebar, MobileGameHeader, SettingsPanel, PlayerGrid, SongSelectionGrid, SongFilterSection, ReadySummary, InputModeSelector, MicAssignmentPanel, SingleMicSelector } from './unified-party-setup.components';

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
  onVoteMode: (result: import('./unified-party-setup.types').GameSetupResult, suggestedSongs: Song[]) => void;
  onBack: () => void;
  /** Pre-selected song from library (user returned after picking a song) */
  preSelectedSong?: Song | null;
  /** Called when user clicks "Start Game" with the pre-selected library song */
  onStartWithPreselectedSong?: () => void;
  /** Called when user wants to change the pre-selected song (go back to library) */
  onChangePreselectedSong?: () => void;
}

export function UnifiedPartySetup({
  gameMode, profiles, songs, onStartGame, onSelectLibrary, onVoteMode, onBack,
  preSelectedSong, onStartWithPreselectedSong, onChangePreselectedSong,
}: UnifiedPartySetupProps) {
  const {
    config, activeProfiles, selectedPlayers, settings, setSettings,
    error, difficulty, setDifficulty, togglePlayer, handleSongSelection,
    inputMode, setInputMode,
    micAssignments, assignMic, removeMicAssignment,
    selectedMicId, selectedMicName, setSelectedMicId, setSelectedMicName,
    filterGenre, filterLanguage, filterCombined,
    setFilterGenre, setFilterLanguage, setFilterCombined,
    availableGenres, availableLanguages, filteredSongs,
  } = usePartySetup({ gameMode, profiles, songs, onStartGame, onSelectLibrary, onVoteMode });

  const onSettingChange = (key: string, value: string | number | boolean) =>
    setSettings(prev => ({ ...prev, [key]: value }));

  return (
    <div className="flex gap-4">
      <GameSidebar config={config} />

      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={onBack} className="text-white/60">← Back</Button>
          <div>
            <h1 className="text-3xl font-bold">{config.icon} {config.title}</h1>
            <p className="text-white/60">{config.description}</p>
          </div>
        </div>

        <MobileGameHeader config={config} />

        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6 text-red-400">{error}</div>
        )}

        <SettingsPanel
          config={config} settings={settings} difficulty={difficulty}
          onSettingChange={onSettingChange} onDifficultyChange={setDifficulty}
        />

        <InputModeSelector
          inputMode={inputMode}
          onInputModeChange={setInputMode}
          supportsCompanionApp={config.supportsCompanionApp}
          forceInputMode={config.forceInputMode}
        />

        <PlayerGrid
          config={config} activeProfiles={activeProfiles}
          selectedPlayers={selectedPlayers} togglePlayer={togglePlayer}
          inputMode={inputMode}
        />

        {/* Shared single mic (e.g. Pass-the-Mic) */}
        {config.sharedMic && selectedPlayers.length > 0 && (
          <SingleMicSelector
            selectedMicId={selectedMicId}
            onMicChange={(micId, micName) => {
              setSelectedMicId(micId);
              setSelectedMicName(micName);
            }}
          />
        )}

        {/* Per-player mic assignment */}
        {!config.sharedMic && !config.forceInputMode && (inputMode === 'microphone' || inputMode === 'mixed') && selectedPlayers.length > 0 && (
          <MicAssignmentPanel
            selectedPlayers={selectedPlayers}
            profiles={activeProfiles}
            micAssignments={micAssignments}
            onAssignMic={assignMic}
            onRemoveMic={removeMicAssignment}
            inputMode={inputMode}
          />
        )}

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
        />

        {/* Pre-selected Library Song Banner */}
        {preSelectedSong && (
          <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-3xl shrink-0">
                🎵
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-green-400 font-medium uppercase tracking-wider">Song Selected</p>
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
                  >
                    Change
                  </Button>
                )}
                {onStartWithPreselectedSong && (
                  <Button
                    size="sm"
                    onClick={onStartWithPreselectedSong}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold"
                  >
                    Start Game
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        <SongSelectionGrid
          config={config} selectedPlayerCount={selectedPlayers.length}
          onSongSelection={handleSongSelection}
        />

        <ReadySummary
          config={config} selectedPlayerCount={selectedPlayers.length}
          difficulty={difficulty} inputMode={inputMode}
        />
      </div>
    </div>
  );
}
