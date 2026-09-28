// ===================== Party-Setup-Mirror — Konstanten =====================
//
// Party-Mode-Konfiguration, Schwierigkeits-Optionen und Song-Auswahl-Buttons
// für den Companion-Mirror des Unified-Party-Setups (R6-Auslagerung aus
// mirror-party-setup-lite.tsx — Daten byte-identisch übernommen).

import type { Difficulty, PartyModeInfo } from './types';

// ===================== Party-Mode-Konfiguration =====================

export const PARTY_MODE_INFO: Record<string, PartyModeInfo> = {
  'pass-the-mic': {
    command: 'start_ptm', icon: '\u{1F3A4}', labelKey: 'party.passTheMic', fallback: 'Pass the Mic',
    color: 'from-cyan-500 to-blue-500', minPlayers: 2, maxPlayers: 8,
    supportsCompanionApp: false, forceInputMode: 'microphone', sharedMic: true, deviceAssignmentMode: 'shared-mic',
    settings: [],
    songSelectionOptions: ['library', 'random', 'vote', 'medley'],
  },
  'companion-singalong': {
    command: 'start_companion_singalong', icon: '\u{1F4F1}', labelKey: 'party.companionSingalong', fallback: 'Companion Singalong',
    color: 'from-emerald-500 to-teal-500', minPlayers: 2, maxPlayers: 8,
    supportsCompanionApp: true, forceInputMode: 'companion', sharedMic: false, deviceAssignmentMode: 'none',
    settings: [
      { key: 'minTurnDuration', labelKey: 'modeSettings.minTurnDuration', fallback: 'Min. Runden-Dauer', type: 'slider', min: 5, max: 30, step: 5, defaultValue: 15, unit: 's' },
      { key: 'maxTurnDuration', labelKey: 'modeSettings.maxTurnDuration', fallback: 'Max. Runden-Dauer', type: 'slider', min: 30, max: 90, step: 5, defaultValue: 45, unit: 's' },
      { key: 'blinkWarning', labelKey: 'modeSettings.blinkWarning', fallback: 'Blink-Warnung', descKey: 'modeSettings.blinkWarningDesc', descFallback: 'Warnzeit vor Wechsel', type: 'slider', min: 1, max: 5, step: 1, defaultValue: 3, unit: 's' },
    ],
    songSelectionOptions: ['library', 'random', 'vote', 'medley'],
  },
  'medley': {
    command: 'start_medley', icon: '\u{1F3B5}', labelKey: 'party.medleyContest', fallback: 'Medley Contest',
    color: 'from-purple-500 to-pink-500', minPlayers: 2, maxPlayers: 4,
    supportsCompanionApp: true, sharedMic: false, deviceAssignmentMode: 'exclusive',
    settings: [
      { key: 'playMode', labelKey: 'modeSettings.playMode', fallback: 'Spielmodus', type: 'select',
        options: [
          { value: 'ffa', labelKey: 'modeSettings.ffa', fallback: 'FFA (Alle vs Alle)' },
          { value: 'team', labelKey: 'modeSettings.team', fallback: 'Team (1v1 / 2v2)' },
          { value: 'elimination', labelKey: 'modeSettings.elimination', fallback: 'Elimination' },
        ], defaultValue: 'ffa' },
      { key: 'teamSize', labelKey: 'modeSettings.teamSize', fallback: 'Team-Groesse', type: 'select',
        options: [
          { value: 1, labelKey: 'modeSettings.1v1Snippets', fallback: '1v1 (5 Snippets)' },
          { value: 2, labelKey: 'modeSettings.2v2Snippets', fallback: '2v2 (4 Snippets)' },
        ], defaultValue: 1 },
      { key: 'snippetDuration', labelKey: 'modeSettings.snippetDuration', fallback: 'Snippet-Dauer', type: 'slider', min: 15, max: 60, step: 5, defaultValue: 30, unit: 's' },
      { key: 'transitionTime', labelKey: 'modeSettings.transitionTime', fallback: 'Ueberblendzeit', type: 'slider', min: 1, max: 5, step: 1, defaultValue: 3, unit: 's' },
    ],
    songSelectionOptions: ['random'],
  },
  'missing-words': {
    command: 'start_missing_words', icon: '\u{1F4DD}', labelKey: 'party.missingWords', fallback: 'Missing Words',
    color: 'from-orange-500 to-red-500', minPlayers: 1, maxPlayers: 4,
    supportsCompanionApp: false, sharedMic: false, deviceAssignmentMode: 'flexible',
    settings: [
      { key: 'missingWordFrequency', labelKey: 'modeSettings.missingWordFrequency', fallback: 'Frequenz', type: 'select',
        options: [
          { value: 'light', labelKey: 'modeSettings.mwLight', fallback: 'Leicht (15%)' },
          { value: 'normal', labelKey: 'modeSettings.mwNormal', fallback: 'Normal (30%)' },
          { value: 'hard', labelKey: 'modeSettings.mwHard', fallback: 'Schwer (60%)' },
          { value: 'insane', labelKey: 'modeSettings.mwInsane', fallback: 'Verrueckt (90%)' },
        ], defaultValue: 'normal' },
      { key: 'granularity', labelKey: 'modeSettings.missingGranularity', fallback: 'Versteck-Modus', type: 'select',
        options: [
          { value: 'word', labelKey: 'modeSettings.mwWords', fallback: 'Woerter' },
          { value: 'passage', labelKey: 'modeSettings.mwPassages', fallback: 'Passagen' },
          { value: 'both', labelKey: 'modeSettings.mwBoth', fallback: 'Beides' },
        ], defaultValue: 'passage' },
      { key: 'hardcoreMissingWords', labelKey: 'modeSettings.hardcoreMode', fallback: 'Hardcore', descKey: 'modeSettings.mwHardcoreModeDesc', descFallback: 'Versteckte Woerter bleiben bis zum Ende verborgen', type: 'toggle', defaultValue: false },
      { key: 'escalating', labelKey: 'modeSettings.escalating', fallback: 'Steigernd', descKey: 'modeSettings.mwEscalatingDesc', descFallback: 'Frequenz steigt pro Runde', type: 'toggle', defaultValue: false },
      { key: 'bestOf', labelKey: 'modeSettings.bestOf', fallback: 'Best of', type: 'select',
        options: [
          { value: 1, labelKey: 'modeSettings.1Round', fallback: '1 Runde' },
          { value: 3, labelKey: 'modeSettings.bestOf3', fallback: 'Best of 3' },
          { value: 5, labelKey: 'modeSettings.bestOf5', fallback: 'Best of 5' },
          { value: 7, labelKey: 'modeSettings.bestOf7', fallback: 'Best of 7' },
        ], defaultValue: 3 },
    ],
    songSelectionOptions: ['random'],
  },
  'blind': {
    command: 'start_blind', icon: '\u{1F648}', labelKey: 'party.blindKaraoke', fallback: 'Blind Karaoke',
    color: 'from-green-500 to-teal-500', minPlayers: 1, maxPlayers: 4,
    supportsCompanionApp: false, sharedMic: false, deviceAssignmentMode: 'flexible',
    settings: [
      { key: 'blindFrequency', labelKey: 'modeSettings.blindFrequency', fallback: 'Blind-Frequenz', type: 'select',
        options: [
          { value: 'light', labelKey: 'modeSettings.blindLight', fallback: 'Leicht (15%)' },
          { value: 'normal', labelKey: 'modeSettings.blindNormal', fallback: 'Normal (30%)' },
          { value: 'hard', labelKey: 'modeSettings.blindHard', fallback: 'Schwer (60%)' },
          { value: 'insane', labelKey: 'modeSettings.blindInsane', fallback: 'Verrueckt (90%)' },
        ], defaultValue: 'normal' },
      { key: 'hardcore', labelKey: 'modeSettings.hardcoreMode', fallback: 'Hardcore', descKey: 'modeSettings.hardcoreModeDesc', descFallback: 'Text versteckt wenn Noten sichtbar', type: 'toggle', defaultValue: false },
      { key: 'escalating', labelKey: 'modeSettings.escalating', fallback: 'Steigernd', type: 'toggle', defaultValue: false },
      { key: 'bestOf', labelKey: 'modeSettings.bestOf', fallback: 'Best of', type: 'select',
        options: [
          { value: 1, labelKey: 'modeSettings.1Round', fallback: '1 Runde' },
          { value: 3, labelKey: 'modeSettings.bestOf3', fallback: 'Best of 3' },
          { value: 5, labelKey: 'modeSettings.bestOf5', fallback: 'Best of 5' },
          { value: 7, labelKey: 'modeSettings.bestOf7', fallback: 'Best of 7' },
        ], defaultValue: 3 },
    ],
    songSelectionOptions: ['random'],
  },
  'tournament': {
    command: 'start_tournament', icon: '\u{1F3C6}', labelKey: 'party.tournamentMode', fallback: 'Tournament',
    color: 'from-amber-500 to-yellow-500', minPlayers: 2, maxPlayers: 32,
    supportsCompanionApp: false, sharedMic: false, deviceAssignmentMode: 'flexible',
    settings: [
      { key: 'maxPlayers', labelKey: 'modeSettings.bracketSize', fallback: 'Turnier-Groesse', type: 'select',
        options: [
          { value: 2, labelKey: 'modeSettings.bracket2', fallback: '2 - Duell' },
          { value: 4, labelKey: 'modeSettings.bracket4', fallback: '4 Spieler' },
          { value: 8, labelKey: 'modeSettings.bracket8', fallback: '8 Spieler' },
          { value: 16, labelKey: 'modeSettings.bracket16', fallback: '16 Spieler' },
          { value: 32, labelKey: 'modeSettings.bracket32', fallback: '32 Spieler' },
        ], defaultValue: 8 },
      { key: 'shortMode', labelKey: 'modeSettings.shortMode', fallback: 'Kurz-Modus', descKey: 'modeSettings.shortModeDesc', descFallback: 'Jedes Match dauert nur 60 Sekunden', type: 'toggle', defaultValue: true },
      { key: 'tournamentType', labelKey: 'tournament.type', fallback: 'Turnier-Typ', type: 'select',
        options: [
          { value: 'single', labelKey: 'modeSettings.singleElimination', fallback: 'Single Elimination' },
          { value: 'double', labelKey: 'modeSettings.doubleElimination', fallback: 'Double Elimination' },
        ], defaultValue: 'single' },
      { key: 'tiebreakMode', labelKey: 'tournament.tiebreak', fallback: 'Tiebreak', type: 'select',
        options: [
          { value: 'coinflip', labelKey: 'modeSettings.coinFlip', fallback: 'Muenzwurf' },
          { value: 'accuracy', labelKey: 'modeSettings.accuracy', fallback: 'Genauigkeit' },
          { value: 'combo', labelKey: 'modeSettings.maxCombo', fallback: 'Max. Combo' },
          { value: 'goldenmic', labelKey: 'modeSettings.goldenMic', fallback: 'Golden Mic' },
        ], defaultValue: 'accuracy' },
      { key: 'dynamicDifficulty', labelKey: 'tournament.dynamicDifficulty', fallback: 'Dynamische Schwierigkeit', type: 'toggle', defaultValue: false },
      { key: 'songSelectionMode', labelKey: 'tournament.songSelection', fallback: 'Song-Auswahl', type: 'select',
        options: [
          { value: 'random', labelKey: 'modeSettings.random', fallback: 'Zufall' },
          { value: 'vote', labelKey: 'modeSettings.vote', fallback: 'Abstimmung' },
        ], defaultValue: 'random' },
      { key: 'seedingMode', labelKey: 'tournament.seeding', fallback: 'Seeding', type: 'select',
        options: [
          { value: 'random', labelKey: 'modeSettings.random', fallback: 'Zufall' },
          { value: 'strength', labelKey: 'modeSettings.byStrength', fallback: 'Nach Staerke' },
        ], defaultValue: 'random' },
    ],
    songSelectionOptions: ['random'],
  },
  'battle-royale': {
    command: 'start_br', icon: '\u{1F451}', labelKey: 'party.battleRoyaleTitle', fallback: 'Battle Royale',
    color: 'from-red-600 to-pink-600', minPlayers: 2, maxPlayers: 24,
    supportsCompanionApp: true, sharedMic: false, deviceAssignmentMode: 'exclusive',
    settings: [
      { key: 'roundDuration', labelKey: 'modeSettings.roundDuration', fallback: 'Runden-Dauer', type: 'slider', min: 30, max: 180, step: 15, defaultValue: 60, unit: 's' },
      { key: 'finalRoundDuration', labelKey: 'modeSettings.finalRoundDuration', fallback: 'Finale-Dauer', type: 'slider', min: 60, max: 300, step: 30, defaultValue: 120, unit: 's' },
      { key: 'medleyMode', labelKey: 'modeSettings.medleyMode', fallback: 'Medley-Modus', descKey: 'modeSettings.medleyModeDesc', descFallback: 'Mehrere Song-Snippets pro Runde', type: 'toggle', defaultValue: false },
      { key: 'grandFinaleBestOf', labelKey: 'modeSettings.grandFinale', fallback: 'Grosses Finale', type: 'select',
        options: [
          { value: 1, labelKey: 'modeSettings.normalFinal', fallback: 'Normales Finale' },
          { value: 3, labelKey: 'modeSettings.bestOf3', fallback: 'Best of 3' },
          { value: 5, labelKey: 'modeSettings.bestOf5', fallback: 'Best of 5' },
        ], defaultValue: 1 },
      { key: 'escalatingDifficulty', labelKey: 'modeSettings.escalatingDifficulty', fallback: 'Steigende Schwierigkeit', descKey: 'modeSettings.escalatingDifficultyDesc', descFallback: 'Schwierigkeit steigt alle 3 Runden', type: 'toggle', defaultValue: false },
      { key: 'shrinkingTimer', labelKey: 'modeSettings.shrinkingTimer', fallback: 'Schrumpfender Timer', type: 'toggle', defaultValue: false },
      { key: 'noRepeatProtection', labelKey: 'modeSettings.noRepeatProtection', fallback: 'Kein-Wiederholung-Schutz', type: 'toggle', defaultValue: true },
    ],
    songSelectionOptions: ['random', 'vote'],
  },
  'rate-my-song': {
    command: 'start_rate_my_song', icon: '\u{2B50}', labelKey: 'party.rateMySongTitle', fallback: 'Rate My Song',
    color: 'from-amber-500 to-orange-500', minPlayers: 1, maxPlayers: 2,
    supportsCompanionApp: true, sharedMic: false, deviceAssignmentMode: 'flexible',
    settings: [
      { key: 'duration', labelKey: 'modeSettings.duration', fallback: 'Dauer', type: 'select',
        options: [
          { value: 'short', labelKey: 'modeSettings.short60s', fallback: 'Kurz (60s)' },
          { value: 'normal', labelKey: 'modeSettings.normalDuration', fallback: 'Normal' },
        ], defaultValue: 'normal' },
      { key: 'seriesRounds', labelKey: 'modeSettings.seriesRounds', fallback: 'Runden', type: 'select',
        options: [
          { value: 1, labelKey: 'modeSettings.round1', fallback: '1 Runde' },
          { value: 3, labelKey: 'modeSettings.rounds3', fallback: '3 Runden' },
          { value: 5, labelKey: 'modeSettings.rounds5', fallback: '5 Runden' },
          { value: 7, labelKey: 'modeSettings.rounds7', fallback: '7 Runden' },
        ], defaultValue: 1 },
      { key: 'categoriesEnabled', labelKey: 'modeSettings.categories', fallback: 'Kategorien', descKey: 'modeSettings.categoriesDesc', descFallback: '4 Bewertungskategorien', type: 'toggle', defaultValue: true },
      { key: 'challengesEnabled', labelKey: 'modeSettings.challenges', fallback: 'Challenges', descKey: 'modeSettings.challengesDesc', descFallback: 'Zufaellige Challenges vor jeder Runde', type: 'toggle', defaultValue: false },
      { key: 'bettingEnabled', labelKey: 'modeSettings.betting', fallback: 'Wetten', descKey: 'modeSettings.bettingDesc', descFallback: 'Publikum kann Punkte tippen', type: 'toggle', defaultValue: false },
    ],
    songSelectionOptions: ['library', 'random'],
  },
};

// ===================== Schwierigkeits-Optionen =====================

export const DIFFICULTIES: { id: Difficulty; labelKey: string; fallback: string; color: string }[] = [
  { id: 'easy', labelKey: 'difficulty.easy', fallback: 'Leicht', color: 'bg-green-500/25 border-green-400/40 text-green-400' },
  { id: 'medium', labelKey: 'difficulty.medium', fallback: 'Normal', color: 'bg-amber-500/25 border-amber-400/40 text-amber-400' },
  { id: 'hard', labelKey: 'difficulty.hard', fallback: 'Schwer', color: 'bg-red-500/25 border-red-400/40 text-red-400' },
];

// ===================== Song-Auswahl-Buttons =====================

export const SONG_SEL_CONFIG: Record<string, { icon: string; fallback: string; labelKey: string }> = {
  library: { icon: '\u{1F4DA}', fallback: 'Bibliothek', labelKey: 'unifiedSetup.fromLibrary' },
  random:  { icon: '\u{1F3B2}', fallback: 'Zufall', labelKey: 'unifiedSetup.randomSong' },
  vote:    { icon: '\u{1F5F3}\uFE0F', fallback: 'Abstimmung', labelKey: 'unifiedSetup.voteSongs' },
  medley:  { icon: '\u{1F3B5}', fallback: 'Medley', labelKey: 'unifiedSetup.medleyMix' },
};
