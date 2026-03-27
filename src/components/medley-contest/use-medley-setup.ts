import { useState, useMemo, useCallback } from 'react';
import { Song, PlayerProfile, PLAYER_COLORS, Difficulty } from '@/types/game';
import { useGameStore } from '@/lib/game/store';

export interface MedleyPlayer {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  score: number;
  notesHit: number;
  notesMissed: number;
  combo: number;
  maxCombo: number;
  songsCompleted: number;
}

export interface MedleySong {
  song: Song;
  startTime: number;
  endTime: number;
  duration: number;
}

export interface MedleySettings {
  snippetDuration: number;
  snippetCount: number;
  transitionTime: number;
  difficulty: Difficulty;
}

const DEFAULT_SETTINGS: MedleySettings = {
  snippetDuration: 30,
  snippetCount: 5,
  transitionTime: 3,
  difficulty: 'medium',
};

export function useMedleySetup(profiles: PlayerProfile[], songs: Song[]) {
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [settings, setSettings] = useState<MedleySettings>(DEFAULT_SETTINGS);
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
      if (prev.length >= 4) {
        setError('Maximum 4 players allowed');
        return prev;
      }
      setError(null);
      return [...prev, playerId];
    });
  };

  const updateSettings = (updates: Partial<MedleySettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  // Generate random medley songs
  const generateMedleySongs = useCallback((): MedleySong[] => {
    const availableSongs = songs.filter(s => s.duration > settings.snippetDuration * 1000);
    const shuffled = [...availableSongs].sort(() => Math.random() - 0.5);
    const selectedSongs = shuffled.slice(0, settings.snippetCount);
    
    return selectedSongs.map(song => {
      const maxStartTime = song.duration - settings.snippetDuration * 1000;
      const startTime = Math.random() * maxStartTime;
      
      return {
        song,
        startTime,
        endTime: startTime + settings.snippetDuration * 1000,
        duration: settings.snippetDuration * 1000,
      };
    });
  }, [songs, settings.snippetCount, settings.snippetDuration]);

  const createPlayers = (): MedleyPlayer[] => {
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
        songsCompleted: 0,
      };
    });
  };

  const validateSelection = (): { valid: boolean; error?: string } => {
    if (selectedPlayers.length < 1) {
      return { valid: false, error: 'At least 1 player required' };
    }
    return { valid: true };
  };

  const getFinalSettings = (): MedleySettings => ({
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
    generateMedleySongs,
    validateSelection,
    getFinalSettings,
    clearError,
  };
}
