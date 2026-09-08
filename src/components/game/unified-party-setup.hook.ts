import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Song, PlayerProfile, PLAYER_COLORS, Difficulty, GameMode } from '@/types/game';
import { PARTY_GAME_CONFIGS } from './unified-party-setup.config';
import type { SongSelectionOption, SelectedPlayer, GameSetupResult, InputMode, GameModeSettingsMap, PartySetupDraft, PlayerDeviceChoice } from './unified-party-setup.types';
import { getGenres, getLanguages, filterSongs } from '@/lib/game/song-library';
import { useGameStore } from '@/lib/game/store';
import { StorageKeys, setItem, removeItem, setJson, getJson, getJsonOptional, getString } from '@/lib/storage';
import { t } from '@/lib/i18n/locales';

/** Saved mic entry shape from MULTI_MIC_CONFIG */
interface SavedMic {
  id: string;
  deviceId?: string;
  customName?: string;
  deviceName?: string;
  config?: { stereoSplitMode?: boolean; stereoChannel?: string };
}

/** Read the saved mic list from localStorage (synchronous — used for validation). */
function loadSavedMics(): SavedMic[] {
  try {
    const parsed = getJsonOptional<{ assignedMics?: SavedMic[] }>(StorageKeys.MULTI_MIC_CONFIG);
    return parsed?.assignedMics ?? [];
  } catch {
    return [];
  }
}

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
  /** Profile ids with a connected companion device (live status, for device validation) */
  connectedProfileIds?: Set<string>;
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
  connectedProfileIds,
}: UsePartySetupArgs) {
  const config = PARTY_GAME_CONFIGS[gameMode] || PARTY_GAME_CONFIGS['pass-the-mic'];
  const deviceMode = config.deviceAssignmentMode
    ?? (config.sharedMic ? 'shared-mic' : config.forceInputMode === 'companion' ? 'none' : 'flexible');

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

  // ── Input Mode (legacy — derived for the result; the selector UI is removed) ──
  const [inputMode, setInputMode] = useState<InputMode>(
    initialDraft?.inputMode ?? (config.forceInputMode || (config.supportsCompanionApp ? 'mixed' : 'microphone'))
  );

  // ── Saved mic list (synchronous read; re-read on mount) ──
  const [savedMics, setSavedMics] = useState<SavedMic[]>(() => loadSavedMics());
  useEffect(() => {
    setSavedMics(prev => {
      const mics = loadSavedMics();
      if (prev.length === mics.length && prev.every((m, i) => m.id === mics[i]?.id)) return prev;
      return mics;
    });
  }, []);
  const micCount = savedMics.length;

  // ── Per-player device choice (profileId → 'mic' | 'companion') ──
  const [deviceAssignments, setDeviceAssignments] = useState<Record<string, PlayerDeviceChoice>>(
    () => initialDraft?.deviceAssignments ?? (getJson<Record<string, PlayerDeviceChoice>>(StorageKeys.PLAYER_DEVICE_PREFERENCES, {}) || {})
  );

  // ── Mic-to-Player assignment (micId → profileId) — used for exclusive modes
  //    and the single-mic case of flexible modes ──
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

  const persistDeviceAssignments = useCallback((assignments: Record<string, PlayerDeviceChoice>) => {
    try {
      setJson(StorageKeys.PLAYER_DEVICE_PREFERENCES, assignments);
    } catch { /* ignore */ }
  }, []);

  /** Default device choice for a newly selected player (mode-dependent). */
  const defaultDeviceFor = useCallback((playerId: string, currentPlayers: string[]): PlayerDeviceChoice => {
    if (deviceMode === 'none') return 'companion';
    if (deviceMode === 'shared-mic') return 'mic'; // irrelevant — shared mic, no per-player choice
    if (deviceMode === 'flexible') {
      if (micCount >= 2) return 'mic';
      if (micCount === 1) {
        // Only ONE player can hold the single mic — first selected player defaults to mic.
        const firstPlayer = currentPlayers[0];
        return firstPlayer === playerId ? 'mic' : 'companion';
      }
      return 'companion';
    }
    // exclusive: prefer mic when a saved preference exists, otherwise mic when available
    return 'mic';
  }, [deviceMode, micCount]);

  const togglePlayer = useCallback((playerId: string) => {
    setSelectedPlayers(prev => {
      if (prev.includes(playerId)) {
        // Remove device + mic assignments when deselecting
        setDeviceAssignments(prevDev => {
          const updated = { ...prevDev };
          delete updated[playerId];
          persistDeviceAssignments(updated);
          return updated;
        });
        setMicAssignments(prevMic => {
          const updated = { ...prevMic };
          for (const [mic, pid] of Object.entries(updated)) {
            if (pid === playerId) delete updated[mic];
          }
          persistMicAssignments(updated);
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
        if (preferences && deviceMode === 'exclusive') {
          const preferredMicId = preferences[playerId];
          if (preferredMicId && loadSavedMics().some(m => m.id === preferredMicId)) {
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
      } catch { /* ignore */ }
      // Set a default device choice
      setDeviceAssignments(prevDev => {
        const updated = { ...prevDev, [playerId]: defaultDeviceFor(playerId, prev) };
        persistDeviceAssignments(updated);
        return updated;
      });
      return [...prev, playerId];
    });
  }, [config.maxPlayers, persistMicAssignments, persistDeviceAssignments, deviceMode, defaultDeviceFor]);

  /** Switch a player's singing device between 'mic' and 'companion'. */
  const setPlayerDevice = useCallback((playerId: string, choice: PlayerDeviceChoice) => {
    setDeviceAssignments(prev => {
      const updated = { ...prev, [playerId]: choice };
      persistDeviceAssignments(updated);
      return updated;
    });
    if (choice === 'companion') {
      // Free the mic this player held (if any)
      setMicAssignments(prev => {
        const held = Object.entries(prev).find(([, pid]) => pid === playerId);
        if (!held) return prev;
        const updated = { ...prev };
        delete updated[held[0]];
        persistMicAssignments(updated);
        return updated;
      });
    }
    // Switching to 'mic' does NOT auto-assign a concrete mic — the user
    // picks one in the dropdown (exclusive/single-mic modes) or sings on a
    // shared/auto mic (flexible with ≥2 mics).
  }, [persistDeviceAssignments, persistMicAssignments]);

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
    // Choosing a mic makes the player a mic player
    setDeviceAssignments(prev => {
      if (prev[playerId] === 'mic') return prev;
      const updated: Record<string, PlayerDeviceChoice> = { ...prev, [playerId]: 'mic' };
      persistDeviceAssignments(updated);
      return updated;
    });
  }, [persistMicAssignments, persistDeviceAssignments]);

  // Remove a mic assignment (persists to localStorage)
  const removeMicAssignment = useCallback((micId: string) => {
    setMicAssignments(prev => {
      const updated = { ...prev };
      delete updated[micId];
      persistMicAssignments(updated);
      return updated;
    });
  }, [persistMicAssignments]);

  // ── Device validation ──────────────────────────────────────────────────
  // A player "has a device" when:
  //   exclusive:  a concrete mic is assigned OR the companion is connected
  //   flexible:   mic choice valid (≥2 mics → auto mic, 1 mic → holds it)
  //               OR companion choice AND connected
  //   shared-mic: (single dropdown — validated separately: selectedMicId)
  //   none:       companion connected (CPTM)
  const playerHasDevice = useCallback((playerId: string): boolean => {
    const choice = deviceAssignments[playerId];
    const connected = !!connectedProfileIds?.has(playerId);
    switch (deviceMode) {
      case 'none':
        return connected;
      case 'shared-mic':
        return true; // validated via selectedMicId below
      case 'exclusive': {
        if (choice === 'mic') {
          return Object.entries(micAssignments).some(([micId, pid]) => pid === playerId && !!savedMics.find(m => m.id === micId));
        }
        return connected;
      }
      case 'flexible': {
        if (choice === 'mic') {
          if (micCount >= 2) return true; // no fixed mic needed
          if (micCount === 1) {
            const singleMicId = savedMics[0]?.id;
            return !!singleMicId && micAssignments[singleMicId] === playerId;
          }
          return false; // no mics at all
        }
        return connected;
      }
      default:
        return true;
    }
  }, [deviceMode, deviceAssignments, micAssignments, savedMics, micCount, connectedProfileIds]);

  const allPlayersHaveDevices = selectedPlayers.length > 0 && selectedPlayers.every(pid => playerHasDevice(pid));
  const playersWithoutDevice = useMemo(
    () => selectedPlayers.filter(pid => !playerHasDevice(pid)),
    [selectedPlayers, playerHasDevice]
  );

  // ── Ready-to-Play validation (players + song + devices) ──
  const songReady =
    songSelection === 'random' ||
    songSelection === 'medley' ||
    ((songSelection === 'library' || songSelection === 'vote') && !!resolvedSong);

  const devicesReady = (() => {
    switch (deviceMode) {
      case 'shared-mic':
        return !!selectedMicId;
      case 'none':
      case 'exclusive':
      case 'flexible':
        return selectedPlayers.length > 0 && allPlayersHaveDevices;
      default:
        return true;
    }
  })();

  const readyToPlay =
    selectedPlayers.length >= config.minPlayers &&
    songReady &&
    devicesReady;

  /** Human-readable reason why the game cannot start yet (for ReadySummary). */
  const deviceBlockReason = useMemo<string | null>(() => {
    if (selectedPlayers.length === 0) return null;
    if (devicesReady) return null;
    switch (deviceMode) {
      case 'shared-mic':
        return t('unifiedSetup.deviceNeedSharedMic');
      case 'none':
        return t('unifiedSetup.deviceNeedAllCompanion');
      case 'exclusive':
        return t('unifiedSetup.deviceNeedExclusive').replace('{n}', String(playersWithoutDevice.length));
      case 'flexible':
        if (micCount === 0 && config.supportsCompanionApp) return t('unifiedSetup.deviceNoMicsHint');
        if (micCount === 1) return t('unifiedSetup.deviceSingleMicHint');
        return t('unifiedSetup.deviceNeedFlexible').replace('{n}', String(playersWithoutDevice.length));
      default:
        return null;
    }
  }, [devicesReady, deviceMode, playersWithoutDevice.length, micCount, config.supportsCompanionApp]);

  const createPlayers = useCallback((): SelectedPlayer[] => {
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

    if (deviceMode === 'none') {
      // CPTM: all players are companion players
      return selectedPlayers.map((id, index) => {
        const profile = profiles.find(p => p.id === id);
        return {
          id,
          name: profile?.name || 'Unknown',
          avatar: profile?.avatar,
          color: profile?.color || PLAYER_COLORS[index % PLAYER_COLORS.length],
          playerType: 'companion' as const,
        };
      });
    }

    // exclusive / flexible: player type comes from the per-player device choice
    // Item 8.2: auto-assignment must never hand out a mic that is already
    // explicitly assigned to another player — otherwise two players share one
    // device while a configured mic stays unused (looks like "only 3 mics
    // accepted" with 4 mics connected). Track used mic ids and pick the first
    // FREE configured mic for auto-assigned players.
    const usedMicIds = new Set(Object.keys(micAssignments));

    return selectedPlayers.map((id, index) => {
      const profile = profiles.find(p => p.id === id);
      const choice = deviceAssignments[id] === 'companion' ? 'companion' as const : 'microphone' as const;

      // Explicit mic assignment for this player
      const micEntry = Object.entries(micAssignments).find(([, pid]) => pid === id);
      const assignedMic = micEntry ? savedMics.find(m => m.id === micEntry[0]) : null;

      // Auto-assign mic from saved configs for mic players without explicit
      // assignment — first mic that is not taken by an explicit assignment.
      const autoMic = choice === 'microphone' && !assignedMic
        ? savedMics.find(m => !usedMicIds.has(m.id)) ?? null
        : null;
      if (autoMic) usedMicIds.add(autoMic.id);

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
        playerType: choice,
        micId: assignedMic?.id || autoMic?.id,
        micName: assignedMic?.customName || assignedMic?.deviceName || autoMic?.customName,
        stereoChannel,
        isConnected: choice === 'companion' ? !!connectedProfileIds?.has(id) : undefined,
      };
    });
  }, [selectedPlayers, profiles, deviceAssignments, micAssignments, config.sharedMic, selectedMicId, selectedMicName, savedMics, deviceMode, connectedProfileIds]);

  /** Derived input mode for the legacy GameSetupResult field. */
  const derivedInputMode: InputMode = useMemo(() => {
    if (deviceMode === 'none') return 'companion';
    if (deviceMode === 'shared-mic') return 'microphone';
    const micPlayers = selectedPlayers.filter(id => deviceAssignments[id] !== 'companion').length;
    if (micPlayers === 0) return 'companion';
    if (micPlayers === selectedPlayers.length) return 'microphone';
    return 'mixed';
  }, [deviceMode, deviceAssignments, selectedPlayers]);
  // Keep the legacy state in sync so external consumers reading inputMode stay correct
  useEffect(() => {
    setInputMode(derivedInputMode);
  }, [derivedInputMode]);

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
      inputMode: derivedInputMode,
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
        inputMode: derivedInputMode,
        deviceAssignments,
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
  }, [selectedPlayers, config.minPlayers, createPlayers, settings, difficulty, resolvedSong, filteredSongs, filterGenre, filterLanguage, filterCombined, filterReleaseYear, onSelectLibrary, onVoteMode, derivedInputMode, config.sharedMic, selectedMicId, selectedMicName, onClearSelectedSong, onSaveDraft, deviceAssignments]);

  // ── "Ready to Play" — the single explicit start action for every party mode ──
  const handleReadyToPlay = useCallback(() => {
    if (!readyToPlay) {
      if (selectedPlayers.length < config.minPlayers) {
        setError(t('unifiedSetup.errorMinPlayers').replace('{n}', String(config.minPlayers)));
      } else if (!songReady) {
        setError(t('unifiedSetup.chooseSongFirst'));
      } else if (!devicesReady) {
        setError(deviceBlockReason || t('unifiedSetup.deviceNeedGeneric'));
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
      inputMode: derivedInputMode,
      selectedSong: songSelection === 'library' || songSelection === 'vote' ? resolvedSong : null,
    };

    setError(null);
    onStartGame(result);
  }, [readyToPlay, selectedPlayers, config.minPlayers, createPlayers, settings, difficulty, songSelection, resolvedSong, filterGenre, filterLanguage, filterCombined, filterReleaseYear, onStartGame, derivedInputMode, config.sharedMic, selectedMicId, selectedMicName, songReady, devicesReady, deviceBlockReason]);

  // ── Remote companion config apply ──
  const handleSongSelectionRef = useRef(handleSongSelection);
  useEffect(() => {
    handleSongSelectionRef.current = handleSongSelection;
  }, [handleSongSelection]);

  useEffect(() => {
    const handleRemoteConfig = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      // Apply players
      if (Array.isArray(detail.players)) {
        setSelectedPlayers(detail.players);
        // Ensure every applied player has a device choice
        setDeviceAssignments(prev => {
          const updated = { ...prev };
          for (const pid of detail.players as string[]) {
            if (!updated[pid]) updated[pid] = defaultDeviceFor(pid, detail.players);
          }
          persistDeviceAssignments(updated);
          return updated;
        });
      }
      // Apply difficulty
      if (detail.difficulty && ['easy', 'medium', 'hard'].includes(detail.difficulty)) {
        setDifficulty(detail.difficulty as Difficulty);
      }
      // Apply mode-specific settings
      if (detail.settings && typeof detail.settings === 'object') {
        setSettings((prev) => ({ ...prev, ...detail.settings }));
      }
      // Apply per-player device assignments (companion app "Singing Device Assignment")
      if (detail.deviceAssignments && typeof detail.deviceAssignments === 'object') {
        setDeviceAssignments(prev => {
          const updated = { ...prev, ...detail.deviceAssignments };
          persistDeviceAssignments(updated);
          return updated;
        });
      }
      // Apply mic assignments (micId → profileId) from the companion
      if (detail.micAssignments && typeof detail.micAssignments === 'object') {
        setMicAssignments(prev => {
          const updated = { ...prev, ...detail.micAssignments };
          persistMicAssignments(updated);
          return updated;
        });
      }
      // Apply song filters (companion Song Filter section)
      if (typeof detail.filterGenre === 'string') setFilterGenre(detail.filterGenre);
      if (typeof detail.filterLanguage === 'string') setFilterLanguage(detail.filterLanguage);
      if (typeof detail.filterReleaseYear === 'string') setFilterReleaseYear(detail.filterReleaseYear);
      if (typeof detail.filterCombined === 'boolean') setFilterCombined(detail.filterCombined);
      // Apply shared mic (PTM: companion picks the mic dropdown)
      if (typeof detail.sharedMicId === 'string' && detail.sharedMicId) {
        setSelectedMicId(detail.sharedMicId);
        if (typeof detail.sharedMicName === 'string') setSelectedMicName(detail.sharedMicName);
      }
      // Apply input mode (legacy companions still send it — accepted but no UI)
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
  }, [config.minPlayers, defaultDeviceFor, persistDeviceAssignments]);

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
    // Input mode (legacy/derived)
    inputMode,
    setInputMode,
    // Singing Device Assignment
    deviceMode,
    deviceAssignments,
    setPlayerDevice,
    micAssignments,
    assignMic,
    removeMicAssignment,
    savedMics,
    micCount,
    connectedProfileIds: connectedProfileIds ?? new Set<string>(),
    playerHasDevice,
    playersWithoutDevice,
    deviceBlockReason,
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
