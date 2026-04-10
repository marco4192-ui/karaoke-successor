import { useState, useMemo, useCallback } from 'react';
import { Song, PlayerProfile, PLAYER_COLORS, Difficulty, GameMode } from '@/types/game';
import { PARTY_GAME_CONFIGS } from './unified-party-setup.config';
import type { SongSelectionOption, SelectedPlayer, GameSetupResult } from './unified-party-setup.types';
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

  // ── Song filter state ──
  const [filterGenre, setFilterGenre] = useState('all');
  const [filterLanguage, setFilterLanguage] = useState('all');
  const [filterCombined, setFilterCombined] = useState(true); // true = AND, false = OR

  // Available genres and languages from the library
  const availableGenres = useMemo(() => getGenres(), [songs.length]);
  const availableLanguages = useMemo(() => getLanguages(), [songs.length]);

  // Filtered songs (applies genre/language filter to the full song list)
  const filteredSongs = useMemo(() => {
    return filterSongs(songs, filterGenre, filterLanguage, filterCombined);
  }, [songs, filterGenre, filterLanguage, filterCombined]);

  const togglePlayer = useCallback((playerId: string) => {
    setSelectedPlayers(prev => {
      if (prev.includes(playerId)) return prev.filter(id => id !== playerId);
      if (prev.length >= config.maxPlayers) {
        setError(`Maximum ${config.maxPlayers} players allowed`);
        return prev;
      }
      setError(null);
      return [...prev, playerId];
    });
  }, [config.maxPlayers]);

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
        // Pass filter settings so party-setup-section can use filtered songs
        filterGenre,
        filterLanguage,
        filterCombined,
      },
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
      case 'medley':
        onStartGame(result);
        break;
      case 'vote': {
        // Use filtered songs for vote suggestions
        const shuffled = [...filteredSongs].sort(() => Math.random() - 0.5);
        onVoteMode(result, shuffled.slice(0, 3));
        break;
      }
    }
  }, [selectedPlayers, config.minPlayers, createPlayers, settings, difficulty, filteredSongs, filterGenre, filterLanguage, filterCombined, onSelectLibrary, onStartGame, onVoteMode]);

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
