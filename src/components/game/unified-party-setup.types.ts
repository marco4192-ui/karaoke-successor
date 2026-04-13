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

// ===================== INPUT MODE =====================

/** How players provide their voice input */
export type InputMode = 'microphone' | 'companion' | 'mixed';

export const INPUT_MODE_CONFIG: Record<InputMode, {
  icon: string;
  label: string;
  description: string;
  color: string;
}> = {
  microphone: {
    icon: '🎤',
    label: 'Nur Mikrofone',
    description: 'Alle Spieler nutzen die Mikrofone am Gerät',
    color: 'bg-cyan-500 hover:bg-cyan-600',
  },
  companion: {
    icon: '📱',
    label: 'Nur Companion-App',
    description: 'Alle Spieler nutzen ihr Handy als Mikro',
    color: 'bg-purple-500 hover:bg-purple-600',
  },
  mixed: {
    icon: '🎤📱',
    label: 'Gemischt',
    description: 'Einige am Gerät, einige über Companion-App',
    color: 'bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400',
  },
};

// ===================== SELECTED PLAYER =====================

export interface SelectedPlayer {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  playerType: 'microphone' | 'companion';
  /** Assigned microphone device ID (only for microphone players) */
  micId?: string;
  /** Assigned microphone display name (only for microphone players) */
  micName?: string;
  /** Companion connection code (only for companion players) */
  companionCode?: string;
  /** Whether the companion is currently connected */
  isConnected?: boolean;
}

// ===================== GAME SETUP RESULT =====================

export interface GameSetupResult {
  players: SelectedPlayer[];
  settings: Record<string, any>;
  songSelection: SongSelectionOption;
  difficulty: Difficulty;
  inputMode: InputMode;
}
