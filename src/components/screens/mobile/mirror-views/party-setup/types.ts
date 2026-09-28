// ===================== Party-Setup-Mirror — Typen =====================
//
// Typen für die Companion-Mirror-Ansicht des Unified-Party-Setups
// (mirror-party-setup-lite.tsx Orchestrator + Section-Module in diesem
// Ordner). Ausgelagert aus mirror-party-setup-lite.tsx (R6) — Typ-Ebene,
// keine Runtime-Kante.

import type { GameState } from '../../mobile-types';

/** Schwierigkeitsgrad (identisch zur Desktop-Einstellung) */
export type Difficulty = 'easy' | 'medium' | 'hard';

/** Eingabe-Modus (Mikrofon / Companion-App / gemischt) */
export type InputMode = 'microphone' | 'companion' | 'mixed';

/** Singing Device Assignment mode (spiegelt die Desktop-Zuweisung) */
export type DeviceAssignmentMode = 'shared-mic' | 'exclusive' | 'flexible' | 'none';

/** Wert einer Modus-Einstellung (slider = number, toggle = boolean, select = string | number) */
export type ModeSettingValue = string | number | boolean;

export interface PartyModeInfo {
  command: string;
  icon: string;
  labelKey: string;
  fallback: string;
  color: string;
  minPlayers: number;
  maxPlayers: number;
  supportsCompanionApp: boolean;
  forceInputMode?: InputMode;
  sharedMic: boolean;
  /** Mirrors the desktop's Singing Device Assignment mode */
  deviceAssignmentMode: 'shared-mic' | 'exclusive' | 'flexible' | 'none';
  settings: ModeSettingConfig[];
  songSelectionOptions: string[];
}

export interface ModeSettingConfig {
  key: string;
  labelKey: string;
  fallback: string;
  descKey?: string;
  descFallback?: string;
  type: 'slider' | 'toggle' | 'select';
  min?: number;
  max?: number;
  step?: number;
  defaultValue: string | number | boolean;
  unit?: string;
  options?: { value: string | number; labelKey: string; fallback: string }[];
}

/** Host-Profil vom /api/mobile?action=hostprofiles-Endpoint (alle Desktop-Profile) */
export interface PartySetupProfile {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  isActive?: boolean;
}

/** Desktop-Mikrofon (id + Anzeigename) für die Device-Dropdowns */
export interface DesktopMic {
  id: string;
  name: string;
}

/** Live-Setup-State, den der Desktop per 2s-Gamestate-Push sendet */
export type PartySetupState = NonNullable<GameState['partySetupState']>;
