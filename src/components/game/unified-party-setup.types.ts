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
  defaultValue: string | number | boolean;
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
  /** If set, the input mode is forced to this value (no selector shown) */
  forceInputMode?: InputMode;
  /** If true, players share a single microphone instead of per-player mic assignment */
  sharedMic?: boolean;
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

// ===================== TYPED GAME MODE SETTINGS =====================
// Each game mode has its own settings interface with properly typed keys.
// Universal keys (difficulty, filters, shared mic) are included in every mode.
// Config-driven keys are optional since they may not exist in all code paths.

/** Universal settings present in every game mode */
interface BaseModeSettings {
  difficulty: Difficulty;
  filterGenre: string;
  filterLanguage: string;
  filterCombined: boolean;
}

/** Pass the Mic — no extra config settings, shared mic support */
export interface PassTheMicSettings extends BaseModeSettings {
  segmentDuration?: number;
  micId?: string;
  micName?: string;
  randomSwitches?: boolean;
  sharedMicId?: string | null;
  sharedMicName?: string | null;
}

/** Companion Sing-Along */
export interface CompanionSingAlongSettings extends BaseModeSettings {
  minTurnDuration?: number;
  maxTurnDuration?: number;
  blinkWarning?: number;
}

/** Companion Pass-the-Mic */
export interface CompanionPassTheMicSettings extends BaseModeSettings {
  minTurnDuration?: number;
  maxTurnDuration?: number;
  blinkWarning?: number;
}

/** Medley Contest */
export interface MedleyModeSettings extends BaseModeSettings {
  playMode?: 'ffa' | 'team';
  teamSize?: 1 | 2;
  snippetCount?: number;
  snippetDuration?: number;
  transitionTime?: number;
}

/** Tournament */
export interface TournamentModeSettings extends BaseModeSettings {
  maxPlayers?: 2 | 4 | 8 | 16 | 32;
  shortMode?: boolean;
  tournamentType?: 'single' | 'double';
  tiebreakMode?: 'coinflip' | 'accuracy' | 'combo' | 'goldenmic';
  dynamicDifficulty?: boolean;
  songSelectionMode?: 'random' | 'vote';
  seedingMode?: 'random' | 'strength';
}

/** Battle Royale */
export interface BattleRoyaleModeSettings extends BaseModeSettings {
  roundDuration?: number;
  finalRoundDuration?: number;
  medleyMode?: boolean;
}

/** Missing Words */
export interface MissingWordsModeSettings extends BaseModeSettings {
  missingWordFrequency?: 'light' | 'normal' | 'hard' | 'insane';
  bestOf?: 1 | 3 | 5 | 7;
  granularity?: 'word' | 'passage' | 'both';
  hardcoreMissingWords?: boolean;
  escalating?: boolean;
}

/** Blind Karaoke */
export interface BlindModeSettings extends BaseModeSettings {
  blindFrequency?: 'light' | 'normal' | 'hard' | 'insane';
  hardcore?: boolean;
  bestOf?: 1 | 3 | 5 | 7;
  escalating?: boolean;
}

/** Rate My Song */
export interface RateMySongModeSettings extends BaseModeSettings {
  duration?: 'short' | 'normal';
}

/** Duel — no extra config settings */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- Intentional marker in discriminated union for future extension
export interface DuelModeSettings extends BaseModeSettings {}

/** Standard — no extra config settings */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- Intentional marker in discriminated union for future extension
export interface StandardModeSettings extends BaseModeSettings {}

/** Duet — no extra config settings */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- Intentional marker in discriminated union for future extension
export interface DuetModeSettings extends BaseModeSettings {}

/** Online — no extra config settings */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- Intentional marker in discriminated union for future extension
export interface OnlineModeSettings extends BaseModeSettings {}

/** Union of all mode-specific settings */
export type GameModeSettings =
  | PassTheMicSettings
  | CompanionSingAlongSettings
  | MedleyModeSettings
  | TournamentModeSettings
  | BattleRoyaleModeSettings
  | MissingWordsModeSettings
  | BlindModeSettings
  | RateMySongModeSettings
  | DuelModeSettings
  | StandardModeSettings
  | DuetModeSettings
  | OnlineModeSettings
  | CompanionPassTheMicSettings;

/** Discriminated union: maps each GameMode to its typed settings */
export interface GameModeSettingsMap {
  'standard': StandardModeSettings;
  'pass-the-mic': PassTheMicSettings;
  'companion-singalong': CompanionSingAlongSettings;
  'medley': MedleyModeSettings;
  'tournament': TournamentModeSettings;
  'battle-royale': BattleRoyaleModeSettings;
  'missing-words': MissingWordsModeSettings;
  'blind': BlindModeSettings;
  'rate-my-song': RateMySongModeSettings;
  'duel': DuelModeSettings;
  'duet': DuetModeSettings;
  'online': OnlineModeSettings;
  'companion-pass-the-mic': CompanionPassTheMicSettings;
}

// ===================== GAME SETUP RESULT =====================

export interface GameSetupResult {
  /** Which game mode was selected — enables type narrowing on settings */
  mode: GameMode;
  players: SelectedPlayer[];
  /** Typed settings for the selected game mode */
  settings: GameModeSettingsMap[GameMode];
  songSelection: SongSelectionOption;
  difficulty: Difficulty;
  inputMode: InputMode;
}
