// Party Game Configuration Types and Constants
// Extracted from unified-party-setup.tsx for better maintainability

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

// ===================== DEFAULT GAME CONFIGURATIONS =====================

export const PARTY_GAME_CONFIGS: Record<string, PartyGameConfig> = {
  'pass-the-mic': {
    mode: 'pass-the-mic',
    title: 'Pass the Mic',
    icon: '🎤',
    description: 'Take turns singing parts of a song!',
    extendedDescription: [
      '🎵 Der Song wird in Segmente unterteilt',
      '🔄 Nach jedem Segment wechselt der Sänger',
      '⚡ Mit Random Switches kann jederzeit gewechselt werden',
      '🏆 Der Team-Score wird am Ende zusammengezählt',
    ],
    color: 'from-cyan-500 to-blue-500',
    minPlayers: 2,
    maxPlayers: 8,
    settings: [
      {
        key: 'segmentDuration',
        label: 'Segment Duration',
        description: 'Duration of each singing segment',
        type: 'slider',
        min: 15,
        max: 60,
        step: 5,
        defaultValue: 30,
        unit: 's',
      },
      {
        key: 'randomSwitches',
        label: 'Random Switches',
        description: 'Randomly switch players mid-segment',
        type: 'toggle',
        defaultValue: true,
      },
    ],
    songSelectionOptions: ['library', 'random', 'vote', 'medley'],
    supportsCompanionApp: false,
  },
  'companion-singalong': {
    mode: 'companion-singalong',
    title: 'Companion Sing-A-Long',
    icon: '📱',
    description: 'Your phone randomly lights up - sing when it blinks!',
    extendedDescription: [
      '📱 Alle Spieler halten ihr Handy bereit',
      '⚡ Wenn das Handy aufleuchtet, bist du dran!',
      '🎤 Niemand weiß, wer als nächstes dran ist',
      '🏆 Sammle Punkte für dein Team',
    ],
    color: 'from-emerald-500 to-teal-500',
    minPlayers: 2,
    maxPlayers: 8,
    settings: [
      {
        key: 'minTurnDuration',
        label: 'Min Turn Duration',
        type: 'slider',
        min: 5,
        max: 30,
        step: 5,
        defaultValue: 15,
        unit: 's',
      },
      {
        key: 'maxTurnDuration',
        label: 'Max Turn Duration',
        type: 'slider',
        min: 30,
        max: 90,
        step: 5,
        defaultValue: 45,
        unit: 's',
      },
      {
        key: 'blinkWarning',
        label: 'Blink Warning',
        description: 'Warning time before switch',
        type: 'slider',
        min: 1,
        max: 5,
        step: 1,
        defaultValue: 3,
        unit: 's',
      },
    ],
    songSelectionOptions: ['library', 'random', 'vote', 'medley'],
    supportsCompanionApp: true,
  },
  'medley': {
    mode: 'medley',
    title: 'Medley Contest',
    icon: '🎵',
    description: 'Sing short snippets of multiple songs in a row!',
    extendedDescription: [
      '🎵 Zufällige Song-Snippets werden abgespielt',
      '⏱️ Jedes Snippet dauert nur kurze Zeit',
      '🎤 Singe so viele Songs wie möglich',
      '🏆 Punkte werden über alle Snippets summiert',
    ],
    color: 'from-purple-500 to-pink-500',
    minPlayers: 1,
    maxPlayers: 4,
    settings: [
      {
        key: 'snippetDuration',
        label: 'Snippet Duration',
        type: 'slider',
        min: 15,
        max: 60,
        step: 5,
        defaultValue: 30,
        unit: 's',
      },
      {
        key: 'snippetCount',
        label: 'Number of Songs',
        type: 'slider',
        min: 3,
        max: 10,
        step: 1,
        defaultValue: 5,
      },
      {
        key: 'transitionTime',
        label: 'Transition Time',
        description: 'Time between snippets',
        type: 'slider',
        min: 1,
        max: 5,
        step: 1,
        defaultValue: 3,
        unit: 's',
      },
    ],
    songSelectionOptions: ['random'],
    supportsCompanionApp: false,
  },
  'tournament': {
    mode: 'tournament',
    title: 'Tournament Mode',
    icon: '🏆',
    description: 'Single elimination bracket - Sudden Death!',
    extendedDescription: [
      '🏆 K.O.-System: Verlierer scheidet aus',
      '⚔️ 1-gegen-1 Matches',
      '🎯 Short Mode: Nur 60 Sekunden pro Match',
      '👑 Der letzte Gewinner ist der Champion!',
    ],
    color: 'from-amber-500 to-yellow-500',
    minPlayers: 2,
    maxPlayers: 32,
    settings: [
      {
        key: 'maxPlayers',
        label: 'Bracket Size',
        type: 'select',
        options: [
          { value: 2, label: '2 - Duel' },
          { value: 4, label: '4 Players' },
          { value: 8, label: '8 Players' },
          { value: 16, label: '16 Players' },
          { value: 32, label: '32 Players' },
        ],
        defaultValue: 8,
      },
      {
        key: 'shortMode',
        label: 'Short Mode',
        description: 'Each match lasts only 60 seconds',
        type: 'toggle',
        defaultValue: true,
      },
    ],
    songSelectionOptions: ['random'],
    supportsCompanionApp: false,
  },
  'battle-royale': {
    mode: 'battle-royale',
    title: 'Battle Royale',
    icon: '👑',
    description: 'All sing together - lowest score eliminated each round!',
    extendedDescription: [
      '🎤 Alle singen gleichzeitig',
      '📉 Der Spieler mit der niedrigsten Punktzahl scheidet aus',
      '🔄 Jede Runde ein neuer Song',
      '👑 Der letzte Sänger gewinnt!',
    ],
    color: 'from-red-600 to-pink-600',
    minPlayers: 2,
    maxPlayers: 8,
    settings: [
      {
        key: 'roundDuration',
        label: 'Round Duration',
        type: 'slider',
        min: 30,
        max: 180,
        step: 15,
        defaultValue: 60,
        unit: 's',
      },
      {
        key: 'finalRoundDuration',
        label: 'Final Round Duration',
        type: 'slider',
        min: 60,
        max: 300,
        step: 30,
        defaultValue: 120,
        unit: 's',
      },
      {
        key: 'medleyMode',
        label: 'Medley Mode',
        description: 'Multiple song snippets per round',
        type: 'toggle',
        defaultValue: false,
      },
    ],
    songSelectionOptions: ['random'],
    supportsCompanionApp: true,
  },
  'duel': {
    mode: 'duel',
    title: 'Duel Mode',
    icon: '⚔️',
    description: 'Two players compete head-to-head!',
    extendedDescription: [
      '⚔️ 1-gegen-1 Duell',
      '🎤 Beide singen den gleichen Song',
      '📊 Punkte werden live verglichen',
      '🏆 Der Spieler mit der höheren Punktzahl gewinnt',
    ],
    color: 'from-cyan-500 to-pink-500',
    minPlayers: 2,
    maxPlayers: 2,
    settings: [],
    songSelectionOptions: ['library', 'random', 'vote'],
    supportsCompanionApp: false,
  },
  'blind': {
    mode: 'blind',
    title: 'Blind Karaoke',
    icon: '🙈',
    description: 'Lyrics disappear for certain sections!',
    extendedDescription: [
      '🙈 Text verschwindet in bestimmten Abschnitten',
      '🧠 Singe aus dem Gedächtnis',
      '⭐ Je mehr du triffst, desto mehr Punkte',
      '🎵 Eine Herausforderung für echte Profis',
    ],
    color: 'from-green-500 to-teal-500',
    minPlayers: 1,
    maxPlayers: 4,
    settings: [
      {
        key: 'blindFrequency',
        label: 'Blind Frequency',
        description: 'How often lyrics disappear',
        type: 'select',
        options: [
          { value: 'rare', label: 'Rare (10%)' },
          { value: 'normal', label: 'Normal (25%)' },
          { value: 'often', label: 'Often (40%)' },
          { value: 'insane', label: 'Insane (60%)' },
        ],
        defaultValue: 'normal',
      },
    ],
    songSelectionOptions: ['library', 'random', 'vote'],
    supportsCompanionApp: false,
  },
  'missing-words': {
    mode: 'missing-words',
    title: 'Missing Words',
    icon: '📝',
    description: 'Some lyrics disappear - can you sing the right words?',
    extendedDescription: [
      '📝 Manche Wörter verschwinden aus dem Text',
      '🎤 Singe die fehlenden Wörter zur richtigen Zeit',
      '⭐ Bonuspunkte für korrekte Wörter',
      '🎵 Teste dein Song-Wissen!',
    ],
    color: 'from-orange-500 to-red-500',
    minPlayers: 1,
    maxPlayers: 4,
    settings: [
      {
        key: 'missingWordFrequency',
        label: 'Missing Word Frequency',
        type: 'select',
        options: [
          { value: 'easy', label: 'Easy (few words)' },
          { value: 'normal', label: 'Normal' },
          { value: 'hard', label: 'Hard (many words)' },
        ],
        defaultValue: 'normal',
      },
    ],
    songSelectionOptions: ['library', 'random', 'vote'],
    supportsCompanionApp: false,
  },
};

// ===================== SONG SELECTION BUTTONS CONFIG =====================

export const SONG_SELECTION_CONFIG = {
  library: {
    icon: '📚',
    label: 'From Library',
    description: 'Choose a song from your library',
    color: 'bg-cyan-500 hover:bg-cyan-600',
  },
  random: {
    icon: '🎲',
    label: 'Random Song',
    description: 'Let the game pick a random song',
    color: 'bg-purple-500 hover:bg-purple-600',
  },
  vote: {
    icon: '🗳️',
    label: 'Vote (3 Songs)',
    description: '3 songs are suggested - vote for your favorite',
    color: 'bg-amber-500 hover:bg-amber-600',
  },
  medley: {
    icon: '🎵',
    label: 'Medley Mix',
    description: 'Mix multiple songs together',
    color: 'bg-pink-500 hover:bg-pink-600',
  },
};
