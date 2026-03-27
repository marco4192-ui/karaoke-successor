import { useState, useMemo } from 'react';
import { PlayerProfile, PLAYER_COLORS, Difficulty } from '@/types/game';
import { useGameStore } from '@/lib/game/store';

export interface CompanionPlayer {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  score: number;
  notesHit: number;
  notesMissed: number;
  combo: number;
  maxCombo: number;
  deviceConnected: boolean;
  turnCount: number;
}

export interface CompanionSingAlongSettings {
  minTurnDuration: number;
  maxTurnDuration: number;
  difficulty: Difficulty;
  blinkWarning: number;
}

const DEFAULT_SETTINGS: CompanionSingAlongSettings = {
  minTurnDuration: 15,
  maxTurnDuration: 45,
  difficulty: 'medium',
  blinkWarning: 3,
};

export function useCompanionSetup(profiles: PlayerProfile[]) {
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [settings, setSettings] = useState<CompanionSingAlongSettings>(DEFAULT_SETTINGS);
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
      if (prev.length >= 8) {
        setError('Maximum 8 players allowed');
        return prev;
      }
      setError(null);
      return [...prev, playerId];
    });
  };

  const updateSettings = (updates: Partial<CompanionSingAlongSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  const createPlayers = (): CompanionPlayer[] => {
    return selectedPlayers.map((id, index) => {
      const profile = profiles.find(p => p.id === id);
      return {
        id,
        name: profile?.name || 'Unknown',
        avatar: profile?.avatar,
        color: profile?.color || PLAYER_COLORS[index % PLAYER_COLORS.length],
        score: 0,
        notesHit: 0,
        notesMissed: 0,
        combo: 0,
        maxCombo: 0,
        deviceConnected: true,
        turnCount: 0,
      };
    });
  };

  const validateSelection = (): { valid: boolean; error?: string } => {
    if (selectedPlayers.length < 2) {
      return { valid: false, error: 'Minimum 2 players required' };
    }
    return { valid: true };
  };

  const getFinalSettings = (): CompanionSingAlongSettings => ({
    ...settings,
    difficulty: globalDifficulty,
  });

  const clearError = () => setError(null);

  return {
    selectedPlayers,
    settings,
    error,
    activeProfiles,
    globalDifficulty,
    togglePlayer,
    updateSettings,
    setGlobalDifficulty,
    createPlayers,
    validateSelection,
    getFinalSettings,
    clearError,
  };
}
