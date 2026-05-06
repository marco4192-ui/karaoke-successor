import { useState, useMemo, useCallback, useEffect } from 'react';
import { Song, PlayerProfile, PLAYER_COLORS, Difficulty, GameMode } from '@/types/game';
import { PARTY_GAME_CONFIGS } from './unified-party-setup.config';
import type { SongSelectionOption, SelectedPlayer, GameSetupResult, InputMode, GameModeSettingsMap } from './unified-party-setup.types';
import { getGenres, getLanguages, filterSongs } from '@/lib/game/song-library';
import { useGameStore } from '@/lib/game/store';
import { StorageKeys, getItem, setItem, removeItem, setJson, getJson, getString } from '@/lib/storage';

interface UsePartySetupArgs {
  gameMode: GameMode;
  profiles: PlayerProfile[];
  songs: Song[];
  onStartGame: (_result: GameSetupResult) => void;
  onSelectLibrary: (_result: GameSetupResult) => void;
  onVoteMode: (_result: GameSetupResult, _suggestedSongs: Song[]) => void;
}

export function usePartySetup({
  gameMode,
  profiles,
  songs,
  onStartGame,
  onSelectLibrary,
  onVoteMode,
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

  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [settings, setSettings] = useState<Record<string, any>>(initialSettings); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [error, setError] = useState<string | null>(null);
  const storeDifficulty = useGameStore((state) => state.gameState.difficulty);
  const [difficulty, setDifficulty] = useState<Difficulty>(storeDifficulty || 'medium');

  // ── Input Mode ──
  const [inputMode, setInputMode] = useState<InputMode>(
    config.forceInputMode || (config.supportsCompanionApp ? 'mixed' : 'microphone')
  );

  // ── Mic-to-Player assignment (micId → profileId) ──
  const [micAssignments, setMicAssignments] = useState<Record<string, string>>(() => {
    return getJson<Record<string, string>>(StorageKeys.PLAYER_MIC_PREFERENCES, {}) || {};
  });

  // ── Shared single mic (for modes like pass-the-mic) ──
  const [selectedMicId, setSelectedMicId] = useState<string | null>(() => {
    return getString(StorageKeys.PTM_SHARED_MIC_ID) || null;
  });
  const [selectedMicName, setSelectedMicName] = useState<string | null>(() => {
    return getString(StorageKeys.PTM_SHARED_MIC_NAME) || null;
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

  // ── Song filter state ──
  const [filterGenre, setFilterGenre] = useState('all');
  const [filterLanguage, setFilterLanguage] = useState('all');
  const [filterCombined, setFilterCombined] = useState(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- songs.length is a proxy for songs identity change; songs itself would cause infinite loop
  const availableGenres = useMemo(() => getGenres(), [songs.length]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- songs.length is a proxy for songs identity change
  const availableLanguages = useMemo(() => getLanguages(), [songs.length]);

  const filteredSongs = useMemo(() => {
    return filterSongs(songs, filterGenre, filterLanguage, filterCombined);
  }, [songs, filterGenre, filterLanguage, filterCombined]);

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
        setError(`Maximum ${config.maxPlayers} players allowed`);
        return prev;
      }
      setError(null);
      // Auto-restore this player's last mic assignment from localStorage
      // (only if the mic still exists in saved mic configs)
      try {
        const preferences = getJson<Record<string, string>>(StorageKeys.PLAYER_MIC_PREFERENCES, undefined as any);
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
    let savedMics: Array<{ id: string; deviceId: string; customName: string; deviceName: string }> = [];
    try {
      const parsed = getJson<{ assignedMics?: Array<{ id: string; deviceId: string; customName: string; deviceName: string }> }>(StorageKeys.MULTI_MIC_CONFIG, undefined as any);
      if (parsed) {
        savedMics = parsed.assignedMics || [];
      }
    } catch { /* ignore */ }

    // Shared mic mode: all players use the same mic
    if (config.sharedMic && selectedMicId) {
      return selectedPlayers.map((id, index) => {
        const profile = profiles.find(p => p.id === id);
        return {
          id,
          name: profile?.name || 'Unknown',
          avatar: profile?.avatar,
          color: profile?.color || PLAYER_COLORS[index % PLAYER_COLORS.length],
          playerType: 'microphone' as const,
          micId: selectedMicId,
          micName: selectedMicName || undefined,
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

      return {
        id,
        name: profile?.name || 'Unknown',
        avatar: profile?.avatar,
        color: profile?.color || PLAYER_COLORS[index % PLAYER_COLORS.length],
        playerType: isMicPlayer ? 'microphone' as const : 'companion' as const,
        micId: assignedMic?.id || autoMic?.id,
        micName: assignedMic?.customName || autoMic?.customName,
      };
    });
  }, [selectedPlayers, profiles, inputMode, micAssignments, config.sharedMic, selectedMicId, selectedMicName]);

  const handleSongSelection = useCallback((option: SongSelectionOption) => {
    if (selectedPlayers.length < config.minPlayers) {
      setError(`Minimum ${config.minPlayers} players required`);
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
        ...(config.sharedMic && selectedMicId ? { sharedMicId: selectedMicId, sharedMicName: selectedMicName } : {}),
      } as GameModeSettingsMap[typeof gameMode],
      songSelection: option,
      difficulty,
      inputMode,
    };

    setError(null);

    switch (option) {
      case 'library':
        onSelectLibrary(result);
        break;
      case 'random':
      case 'medley':
        onStartGame(result);
        break;
      case 'vote': {
        const shuffled = [...filteredSongs].sort(() => Math.random() - 0.5);
        onVoteMode(result, shuffled.slice(0, 3));
        break;
      }
    }
  }, [selectedPlayers, config.minPlayers, createPlayers, settings, difficulty, filteredSongs, filterGenre, filterLanguage, filterCombined, onSelectLibrary, onStartGame, onVoteMode, inputMode, config.sharedMic, selectedMicId, selectedMicName]);

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
    setFilterGenre,
    setFilterLanguage,
    setFilterCombined,
    availableGenres,
    availableLanguages,
    filteredSongs,
  };
}
