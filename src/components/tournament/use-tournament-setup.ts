import { useState, useMemo } from 'react';
import { 
  createTournament, 
  TournamentBracket, 
  TournamentPlayer, 
  TournamentSettings,
} from '@/lib/game/tournament';
import { PlayerProfile, PLAYER_COLORS, Difficulty } from '@/types/game';
import { useGameStore } from '@/lib/game/store';

export function useTournamentSetup(profiles: PlayerProfile[]) {
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [maxPlayers, setMaxPlayers] = useState<2 | 4 | 8 | 16 | 32>(8);
  const [shortMode, setShortMode] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter to only show active profiles
  const activeProfiles = useMemo(() => 
    profiles.filter(p => p.isActive !== false),
    [profiles]
  );

  // Use global difficulty from store
  const globalDifficulty = useGameStore((state) => state.gameState.difficulty);
  const setGlobalDifficulty = useGameStore((state) => state.setDifficulty);

  const togglePlayer = (playerId: string) => {
    setSelectedPlayers(prev => {
      if (prev.includes(playerId)) {
        return prev.filter(id => id !== playerId);
      }
      if (prev.length >= maxPlayers) {
        setError(`Maximum ${maxPlayers} players allowed`);
        return prev;
      }
      setError(null);
      return [...prev, playerId];
    });
  };

  const updateMaxPlayers = (size: 2 | 4 | 8 | 16 | 32) => {
    setMaxPlayers(size);
    if (selectedPlayers.length > size) {
      setSelectedPlayers(prev => prev.slice(0, size));
    }
  };

  const createTournamentPlayers = (): TournamentPlayer[] => {
    return selectedPlayers.map((id, index) => {
      const profile = profiles.find(p => p.id === id);
      return {
        id,
        name: profile?.name || 'Unknown',
        avatar: profile?.avatar,
        color: profile?.color || PLAYER_COLORS[index % PLAYER_COLORS.length],
        eliminated: false,
        seed: index + 1,
      };
    });
  };

  const createTournamentBracket = (): { bracket: TournamentBracket; songDuration: number } | null => {
    if (selectedPlayers.length < 2) {
      setError('Minimum 2 players required');
      return null;
    }
    
    const players = createTournamentPlayers();

    const settings: TournamentSettings = {
      maxPlayers,
      songDuration: shortMode ? 60 : 180,
      randomSongs: true,
      difficulty: globalDifficulty,
    };

    try {
      const bracket = createTournament(players, settings);
      return { bracket, songDuration: settings.songDuration };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tournament');
      return null;
    }
  };

  const clearError = () => setError(null);

  return {
    selectedPlayers,
    maxPlayers,
    shortMode,
    error,
    activeProfiles,
    globalDifficulty,
    togglePlayer,
    updateMaxPlayers,
    setShortMode,
    setGlobalDifficulty,
    createTournamentBracket,
    clearError,
  };
}
