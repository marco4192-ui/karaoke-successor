import { Difficulty, GameMode } from '@/types/game';

// ===================== GAME CONFIGURATION TYPES =====================

export interface GameSettingConfig {
  key: string;
  label: string;
  description?: string;
  type: 'slider' | 'toggle' | 'select';
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string | number; label: string }[];
  defaultValue: any;
  unit?: string;
}

export interface PartyGameConfig {
  mode: GameMode;
  title: string;
  icon: string;
  description: string;
  extendedDescription: string[];
  color: string;
  minPlayers: number;
  maxPlayers: number;
  settings: GameSettingConfig[];
  songSelectionOptions: SongSelectionOption[];
  supportsCompanionApp?: boolean;
}

export type SongSelectionOption = 'library' | 'random' | 'vote' | 'medley';

export interface SelectedPlayer {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  playerType: 'microphone' | 'companion';
}

export interface GameSetupResult {
  players: SelectedPlayer[];
  settings: Record<string, any>;
  songSelection: SongSelectionOption;
  difficulty: Difficulty;
}
