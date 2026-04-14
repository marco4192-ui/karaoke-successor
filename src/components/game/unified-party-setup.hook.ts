import { useState, useMemo, useCallback, useEffect } from 'react';
import { Song, PlayerProfile, PLAYER_COLORS, Difficulty, GameMode } from '@/types/game';
import { PARTY_GAME_CONFIGS } from './unified-party-setup.config';
import type { SongSelectionOption, SelectedPlayer, GameSetupResult, InputMode } from './unified-party-setup.types';
import { getGenres, getLanguages, filterSongs } from '@/lib/game/song-library';
import { useGameStore } from '@/lib/game/store';

interface UsePartySetupArgs {
  gameMode: GameMode;
  profiles: PlayerProfile[];
  songs: Song[];
  onStartGame: (result: GameSetupResult) => void;
  onSelectLibrary: (result: GameSetupResult) => void;
  onVoteMode: (result: GameSetupResult, suggestedSongs: Song[]) => void;
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

  const initialSettings = useMemo(() => {
    const s: Record<string, any> = {};
    config.settings.forEach(setting => { s[setting.key] = setting.defaultValue; });
    return s;
  }, [config]);

  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [settings, setSettings] = useState<Record<string, any>>(initialSettings);
  const [songSelection, setSongSelection] = useState<SongSelectionOption | null>(null);
  const [error, setError] = useState<string | null>(null);
  const storeDifficulty = useGameStore((state) => state.gameState.difficulty);
  const [difficulty, setDifficulty] = useState<Difficulty>(storeDifficulty || 'medium');

  // ── Input Mode ──
  const [inputMode, setInputMode] = useState<InputMode>(
    config.forceInputMode || (config.supportsCompanionApp ? 'mixed' : 'microphone')
  );

  // ── Mic-to-Player assignment (micId → profileId) ──
  const [micAssignments, setMicAssignments] = useState<Record<string, string>>(() => {
    // Restore saved mic preferences when component mounts
    try {
      const saved = localStorage.getItem('karaoke-player-mic-preferences');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  // ── Song filter state ──
  const [filterGenre, setFilterGenre] = useState('all');
  const [filterLanguage, setFilterLanguage] = useState('all');
  const [filterCombined, setFilterCombined] = useState(true);

  const availableGenres = useMemo(() => getGenres(), [songs.length]);
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
      localStorage.setItem('karaoke-player-mic-preferences', JSON.stringify(assignments));
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
        const saved = localStorage.getItem('karaoke-player-mic-preferences');
        if (saved) {
          const preferences: Record<string, string> = JSON.parse(saved);
          const preferredMicId = preferences[playerId];
          if (preferredMicId) {
            // Check if this mic exists in current configs
            const micConfig = localStorage.getItem('karaoke-multi-mic-config');
            if (micConfig) {
              const parsed = JSON.parse(micConfig);
              const micExists = (parsed.assignedMics || []).some((m: any) => m.id === preferredMicId);
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
      for (const [m, p] of Object.entries(updated)) {
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
      const saved = localStorage.getItem('karaoke-multi-mic-config');
      if (saved) {
        const parsed = JSON.parse(saved);
        savedMics = parsed.assignedMics || [];
      }
    } catch { /* ignore */ }

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
  }, [selectedPlayers, profiles, inputMode, micAssignments]);

  const handleSongSelection = useCallback((option: SongSelectionOption) => {
    if (selectedPlayers.length < config.minPlayers) {
      setError(`Minimum ${config.minPlayers} players required`);
      return;
    }

    const result: GameSetupResult = {
      players: createPlayers(),
      settings: {
        ...settings,
        difficulty,
        filterGenre,
        filterLanguage,
        filterCombined,
      },
      songSelection: option,
      difficulty,
      inputMode,
    };

    setError(null);
    setSongSelection(option);

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
  }, [selectedPlayers, config.minPlayers, createPlayers, settings, difficulty, filteredSongs, filterGenre, filterLanguage, filterCombined, onSelectLibrary, onStartGame, onVoteMode, inputMode]);

  return {
    config,
    activeProfiles,
    selectedPlayers,
    settings,
    setSettings,
    songSelection,
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
