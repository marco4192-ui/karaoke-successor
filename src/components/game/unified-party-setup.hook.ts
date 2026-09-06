import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Song, PlayerProfile, PLAYER_COLORS, Difficulty, GameMode } from '@/types/game';
import { PARTY_GAME_CONFIGS } from './unified-party-setup.config';
import type { SongSelectionOption, SelectedPlayer, GameSetupResult, InputMode, GameModeSettingsMap, PartySetupDraft } from './unified-party-setup.types';
import { getGenres, getLanguages, filterSongs } from '@/lib/game/song-library';
import { useGameStore } from '@/lib/game/store';
import { StorageKeys, getItem, setItem, removeItem, setJson, getJson, getJsonOptional, getString } from '@/lib/storage';
import { t } from '@/lib/i18n/locales';

interface UsePartySetupArgs {
  gameMode: GameMode;
  profiles: PlayerProfile[];
  songs: Song[];
  onStartGame: (_result: GameSetupResult) => void;
  onSelectLibrary: (_result: GameSetupResult) => void;
  onVoteMode: (_result: GameSetupResult, _suggestedSongs: Song[]) => void;
  /** Song-selection method restored after returning from library/voting (party store) */
  initialSongSelection?: SongSelectionOption | null;
  /** Explicitly selected song (library pick / vote winner) restored after navigation */
  initialSelectedSong?: Song | null;
  /** Called when the user switches back to a songless method (random/medley) so the parent can clear the pre-selected song */
  onClearSelectedSong?: () => void;
  /** Restored setup form snapshot (players/settings/filters) after returning from library/voting */
  initialDraft?: PartySetupDraft | null;
  /** Persist the setup form before leaving to library/voting so it can be restored */
  onSaveDraft?: (_draft: PartySetupDraft) => void;
}

export function usePartySetup({
  gameMode,
  profiles,
  songs,
  onStartGame,
  onSelectLibrary,
  onVoteMode,
  initialSongSelection = null,
  initialSelectedSong = null,
  onClearSelectedSong,
  initialDraft = null,
  onSaveDraft,
}: UsePartySetupArgs) {
  const config = PARTY_GAME_CONFIGS[gameMode] || PARTY_GAME_CONFIGS['pass-the-mic'];

  const activeProfiles = useMemo(() => profiles.filter(p => p.isActive !== false), [profiles]);

  // NOTE: Settings use Record<string, any> to accommodate dynamic game-mode configs
  // whose keys and value types vary at runtime. This trades compile-time type safety
  // for flexibility; individual consumers should validate specific settings as needed.
  const initialSettings = useMemo(() => {
    const s: Record<string, any> = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
    config.settings.forEach(setting => { s[setting.key] = setting.defaultValue; });
    return s;
  }, [config]);

  const [selectedPlayers, setSelectedPlayers] = useState<string[]>(initialDraft?.selectedPlayers ?? []);
  const [settings, setSettings] = useState<Record<string, any>>( // eslint-disable-line @typescript-eslint/no-explicit-any
    initialDraft ? { ...initialSettings, ...initialDraft.settings } : initialSettings
  );
  const [error, setError] = useState<string | null>(null);
  const storeDifficulty = useGameStore((state) => state.gameState.difficulty);
  const [difficulty, setDifficulty] = useState<Difficulty>(initialDraft?.difficulty ?? storeDifficulty ?? 'medium');

  // ── Input Mode ──
  const [inputMode, setInputMode] = useState<InputMode>(
    initialDraft?.inputMode ?? (config.forceInputMode || (config.supportsCompanionApp ? 'mixed' : 'microphone'))
  );

  // ── Mic-to-Player assignment (micId → profileId) ──
  const [micAssignments, setMicAssignments] = useState<Record<string, string>>(() => {
    return getJson<Record<string, string>>(StorageKeys.PLAYER_MIC_PREFERENCES, {}) || {};
  });

  // ── Shared single mic (for modes like pass-the-mic) ──
  const [selectedMicId, setSelectedMicId] = useState<string | null>(() => {
    return initialDraft?.selectedMicId ?? getString(StorageKeys.PTM_SHARED_MIC_ID) ?? null;
  });
  const [selectedMicName, setSelectedMicName] = useState<string | null>(() => {
    return initialDraft?.selectedMicName ?? getString(StorageKeys.PTM_SHARED_MIC_NAME) ?? null;
  });

  // Persist shared mic selection to localStorage
  useEffect(() => {
    try {
      if (selectedMicId) setItem(StorageKeys.PTM_SHARED_MIC_ID, selectedMicId);
      else removeItem(StorageKeys.PTM_SHARED_MIC_ID);
      if (selectedMicName) setItem(StorageKeys.PTM_SHARED_MIC_NAME, selectedMicName);
      else removeItem(StorageKeys.PTM_SHARED_MIC_NAME);
    } catch { /* ignore */ }
  }, [selectedMicId, selectedMicName]);

  // ── Song selection state ──
  // The chosen song-selection method ('random' | 'library' | 'vote' | 'medley').
  // Picking a method NEVER starts the game — the explicit "Ready to Play"
  // button (handleReadyToPlay) is the only start trigger.
  const [songSelection, setSongSelection] = useState<SongSelectionOption | null>(initialSongSelection);
  // Explicitly chosen song (library pick / vote winner) — null for random/medley.
  const [resolvedSong, setResolvedSong] = useState<Song | null>(initialSelectedSong);

  // ── Song filter state ──
  const [filterGenre, setFilterGenre] = useState(initialDraft?.filterGenre ?? 'all');
  const [filterLanguage, setFilterLanguage] = useState(initialDraft?.filterLanguage ?? 'all');
  const [filterCombined, setFilterCombined] = useState(initialDraft?.filterCombined ?? true);
  const [filterReleaseYear, setFilterReleaseYear] = useState(initialDraft?.filterReleaseYear ?? 'all');

  // eslint-disable-next-line react-hooks/exhaustive-deps -- songs.length is a proxy for songs identity change; songs itself would cause infinite loop
  const availableGenres = useMemo(() => getGenres(), [songs.length]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- songs.length is a proxy for songs identity change
  const availableLanguages = useMemo(() => getLanguages(), [songs.length]);

  const filteredSongs = useMemo(() => {
    return filterSongs(songs, filterGenre, filterLanguage, filterCombined, filterReleaseYear);
  }, [songs, filterGenre, filterLanguage, filterCombined, filterReleaseYear]);

  // Sync difficulty from global store
  useEffect(() => {
    if (storeDifficulty) {
      setDifficulty(storeDifficulty);
    }
  }, [storeDifficulty]);

  // Persist mic assignments to localStorage
  const persistMicAssignments = useCallback((assignments: Record<string, string>) => {
    try {
      setJson(StorageKeys.PLAYER_MIC_PREFERENCES, assignments);
    } catch { /* ignore */ }
  }, []);

  const togglePlayer = useCallback((playerId: string) => {
    setSelectedPlayers(prev => {
      if (prev.includes(playerId)) {
        // Remove mic assignment when deselecting
        setMicAssignments(prevMic => {
          const updated = { ...prevMic };
          for (const [mic, pid] of Object.entries(updated)) {
            if (pid === playerId) delete updated[mic];
          }
          return updated;
        });
        return prev.filter(id => id !== playerId);
      }
      if (prev.length >= config.maxPlayers) {
        setError(t('unifiedSetup.errorMaxPlayers').replace('{n}', String(config.maxPlayers)));
        return prev;
      }
      setError(null);
      // Auto-restore this player's last mic assignment from localStorage
      // (only if the mic still exists in saved mic configs)
      try {
        const preferences = getJsonOptional<Record<string, string>>(StorageKeys.PLAYER_MIC_PREFERENCES);
        if (preferences) {
          const preferredMicId = preferences[playerId];
          if (preferredMicId) {
            // Check if this mic exists in current configs
            const micConfig = getItem(StorageKeys.MULTI_MIC_CONFIG);
            if (micConfig) {
              const parsed = JSON.parse(micConfig);
              const micExists = (parsed.assignedMics || []).some((m: { id: string }) => m.id === preferredMicId);
              if (micExists) {
                setMicAssignments(prevMic => {
                  const updated = { ...prevMic };
                  // Don't overwrite if this mic is already taken by another selected player
                  if (!updated[preferredMicId]) {
                    updated[preferredMicId] = playerId;
                    persistMicAssignments(updated);
                  }
                  return updated;
                });
              }
            }
          }
        }
      } catch { /* ignore */ }
      return [...prev, playerId];
    });
  }, [config.maxPlayers, persistMicAssignments]);

  // Assign a mic to a player (persists to localStorage)
  const assignMic = useCallback((micId: string, playerId: string) => {
    setMicAssignments(prev => {
      const updated = { ...prev };
      // Remove any existing assignment for this mic (from a different player)
      for (const [m, _p] of Object.entries(updated)) {
        if (m === micId) delete updated[m];
      }
      // Remove any existing mic assignment for this player (player switches mic)
      for (const [m, p] of Object.entries(updated)) {
        if (p === playerId) delete updated[m];
      }
      updated[micId] = playerId;
      persistMicAssignments(updated);
      return updated;
    });
  }, [persistMicAssignments]);

  // Remove a mic assignment (persists to localStorage)
  const removeMicAssignment = useCallback((micId: string) => {
    setMicAssignments(prev => {
      const updated = { ...prev };
      delete updated[micId];
      persistMicAssignments(updated);
      return updated;
    });
  }, [persistMicAssignments]);

  const createPlayers = useCallback((): SelectedPlayer[] => {
    // Load saved mic configs to get mic names
    let savedMics: Array<{ id: string; deviceId: string; customName: string; deviceName: string; config?: { stereoSplitMode?: boolean; stereoChannel?: string } }> = [];
    try {
      const parsed = getJsonOptional<{ assignedMics?: Array<{ id: string; deviceId: string; customName: string; deviceName: string; config?: { stereoSplitMode?: boolean; stereoChannel?: string } }> }>(StorageKeys.MULTI_MIC_CONFIG);
      if (parsed) {
        savedMics = parsed.assignedMics || [];
      }
    } catch { /* ignore */ }

    // Shared mic mode: all players use the same mic
    if (config.sharedMic && selectedMicId) {
      return selectedPlayers.map((id, index) => {
        const profile = profiles.find(p => p.id === id);
        // Resolve stereo channel from saved mic config
        const sharedMicEntry = savedMics.find(m => m.id === selectedMicId);
        const sharedStereoChannel = sharedMicEntry?.config?.stereoSplitMode
          ? (sharedMicEntry.config.stereoChannel === 'right' ? 1 : 0)
          : undefined;
        return {
          id,
          name: profile?.name || 'Unknown',
          avatar: profile?.avatar,
          color: profile?.color || PLAYER_COLORS[index % PLAYER_COLORS.length],
          playerType: 'microphone' as const,
          micId: selectedMicId,
          micName: selectedMicName || undefined,
          stereoChannel: sharedStereoChannel,
        };
      });
    }

    // In mixed mode, split players: first half uses mic, second half uses companion
    const micPlayerCount = inputMode === 'companion'
      ? 0
      : inputMode === 'mixed'
        ? Math.ceil(selectedPlayers.length / 2)
        : selectedPlayers.length;

    // Track mic index for auto-assignment (when no explicit mic assignment exists)
    let autoMicIndex = 0;

    return selectedPlayers.map((id, index) => {
      const profile = profiles.find(p => p.id === id);
      const isMicPlayer = index < micPlayerCount;

      // Find explicit mic assignment for this player
      const micEntry = Object.entries(micAssignments).find(([, pid]) => pid === id);
      const assignedMic = micEntry ? savedMics.find(m => m.id === micEntry[0]) : null;

      // Auto-assign mic from saved configs for mic players without explicit assignment
      const autoMic = isMicPlayer && !assignedMic ? savedMics[autoMicIndex] : null;
      if (isMicPlayer && !assignedMic) autoMicIndex++;

      // Resolve stereo channel from saved mic config
      const micSource = assignedMic || autoMic;
      const stereoChannel = micSource?.config?.stereoSplitMode
        ? (micSource.config.stereoChannel === 'right' ? 1 : 0)
        : undefined;
      return {
        id,
        name: profile?.name || 'Unknown',
        avatar: profile?.avatar,
        color: profile?.color || PLAYER_COLORS[index % PLAYER_COLORS.length],
        playerType: isMicPlayer ? 'microphone' as const : 'companion' as const,
        micId: assignedMic?.id || autoMic?.id,
        micName: assignedMic?.customName || autoMic?.customName,
        stereoChannel,
      };
    });
  }, [selectedPlayers, profiles, inputMode, micAssignments, config.sharedMic, selectedMicId, selectedMicName]);

  const handleSongSelection = useCallback((option: SongSelectionOption) => {
    if (selectedPlayers.length < config.minPlayers) {
      setError(t('unifiedSetup.errorMinPlayers').replace('{n}', String(config.minPlayers)));
      return;
    }

    const result: GameSetupResult = {
      mode: gameMode,
      players: createPlayers(),
      settings: {
        ...settings,
        difficulty,
        filterGenre,
        filterLanguage,
        filterCombined,
        filterReleaseYear,
        ...(config.sharedMic && selectedMicId ? { sharedMicId: selectedMicId, sharedMicName: selectedMicName } : {}),
      } as GameModeSettingsMap[typeof gameMode],
      songSelection: option,
      difficulty,
      inputMode,
      selectedSong: resolvedSong ?? null,
    };

    setError(null);
    setSongSelection(option);

    // Persist the current setup form so it survives the navigation
    // to library/voting and back (remount would lose the state otherwise).
    const saveDraft = () => {
      onSaveDraft?.({
        selectedPlayers,
        settings,
        difficulty,
        inputMode,
        selectedMicId,
        selectedMicName,
        filterGenre,
        filterLanguage,
        filterCombined,
        filterReleaseYear,
      });
    };

    switch (option) {
      case 'library':
        // Navigate to the library — the game is NOT started here.
        // The user picks a song, returns to this setup and presses "Ready to Play".
        saveDraft();
        onSelectLibrary(result);
        break;
      case 'random':
      case 'medley':
        // Random/medley need no explicit song — just mark the method as selected.
        // The game starts exclusively via the "Ready to Play" button.
        setResolvedSong(null);
        onClearSelectedSong?.();
        break;
      case 'vote': {
        // Navigate to the voting screen — the game is NOT started here.
        // Picking a song in the voting modal returns to this setup.
        saveDraft();
        const shuffled = [...filteredSongs].sort(() => Math.random() - 0.5);
        onVoteMode(result, shuffled.slice(0, 3));
        break;
      }
    }
  }, [selectedPlayers, config.minPlayers, createPlayers, settings, difficulty, resolvedSong, filteredSongs, filterGenre, filterLanguage, filterCombined, filterReleaseYear, onSelectLibrary, onVoteMode, inputMode, config.sharedMic, selectedMicId, selectedMicName, onClearSelectedSong, onSaveDraft]);

  // ── "Ready to Play" — the single explicit start action for every party mode ──
  const readyToPlay =
    selectedPlayers.length >= config.minPlayers &&
    (
      songSelection === 'random' ||
      songSelection === 'medley' ||
      ((songSelection === 'library' || songSelection === 'vote') && !!resolvedSong)
    );

  const handleReadyToPlay = useCallback(() => {
    if (!readyToPlay) {
      if (selectedPlayers.length < config.minPlayers) {
        setError(t('unifiedSetup.errorMinPlayers').replace('{n}', String(config.minPlayers)));
      } else {
        setError(t('unifiedSetup.chooseSongFirst'));
      }
      return;
    }

    const result: GameSetupResult = {
      mode: gameMode,
      players: createPlayers(),
      settings: {
        ...settings,
        difficulty,
        filterGenre,
        filterLanguage,
        filterCombined,
        filterReleaseYear,
        ...(config.sharedMic && selectedMicId ? { sharedMicId: selectedMicId, sharedMicName: selectedMicName } : {}),
      } as GameModeSettingsMap[typeof gameMode],
      songSelection: songSelection!,
      difficulty,
      inputMode,
      selectedSong: songSelection === 'library' || songSelection === 'vote' ? resolvedSong : null,
    };

    setError(null);
    onStartGame(result);
  }, [readyToPlay, selectedPlayers, config.minPlayers, createPlayers, settings, difficulty, songSelection, resolvedSong, filterGenre, filterLanguage, filterCombined, filterReleaseYear, onStartGame, inputMode, config.sharedMic, selectedMicId, selectedMicName]);

  // ── Remote companion config apply ──
  const handleSongSelectionRef = useRef(handleSongSelection);
  handleSongSelectionRef.current = handleSongSelection;

  useEffect(() => {
    const handleRemoteConfig = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      // Apply players
      if (Array.isArray(detail.players)) {
        setSelectedPlayers(detail.players);
      }
      // Apply difficulty
      if (detail.difficulty && ['easy', 'medium', 'hard'].includes(detail.difficulty)) {
        setDifficulty(detail.difficulty as Difficulty);
      }
      // Apply mode-specific settings
      if (detail.settings && typeof detail.settings === 'object') {
        setSettings((prev) => ({ ...prev, ...detail.settings }));
      }
      // Apply input mode
      if (detail.inputMode && ['microphone', 'companion', 'mixed'].includes(detail.inputMode)) {
        setInputMode(detail.inputMode as InputMode);
      }
      // Apply song selection after a short delay to let state settle
      const songSel = detail.songSelection;
      if (songSel && ['library', 'random', 'vote', 'medley'].includes(songSel)) {
        const minP = config.minPlayers;
        if (Array.isArray(detail.players) && detail.players.length >= minP) {
          setTimeout(() => {
            handleSongSelectionRef.current(songSel as SongSelectionOption);
          }, 200);
        }
      }
    };
    window.addEventListener('remote-party-apply-config', handleRemoteConfig);
    return () => window.removeEventListener('remote-party-apply-config', handleRemoteConfig);
  }, [config.minPlayers]);

  return {
    config,
    activeProfiles,
    selectedPlayers,
    settings,
    setSettings,
    error,
    difficulty,
    setDifficulty,
    togglePlayer,
    handleSongSelection,
    // Ready to Play (explicit start)
    songSelection,
    setSongSelection,
    resolvedSong,
    setResolvedSong,
    readyToPlay,
    handleReadyToPlay,
    // Input mode
    inputMode,
    setInputMode,
    // Mic assignments
    micAssignments,
    assignMic,
    removeMicAssignment,
    // Shared mic (single mic for modes like pass-the-mic)
    selectedMicId,
    selectedMicName,
    setSelectedMicId,
    setSelectedMicName,
    // Song filter
    filterGenre,
    filterLanguage,
    filterCombined,
    filterReleaseYear,
    setFilterGenre,
    setFilterLanguage,
    setFilterCombined,
    setFilterReleaseYear,
    availableGenres,
    availableLanguages,
    filteredSongs,
  };
}
