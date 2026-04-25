import type { PartyGameConfig, SongSelectionOption } from './unified-party-setup.types';

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
      { key: 'segmentDuration', label: 'Segment Duration', description: 'Duration of each singing segment', type: 'slider', min: 15, max: 60, step: 5, defaultValue: 30, unit: 's' },
      { key: 'randomSwitches', label: 'Random Switches', description: 'Randomly switch players mid-segment', type: 'toggle', defaultValue: true },
    ],
    songSelectionOptions: ['library', 'random', 'vote', 'medley'],
    supportsCompanionApp: false,
    forceInputMode: 'microphone',
    sharedMic: true,
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
      { key: 'minTurnDuration', label: 'Min Turn Duration', type: 'slider', min: 5, max: 30, step: 5, defaultValue: 15, unit: 's' },
      { key: 'maxTurnDuration', label: 'Max Turn Duration', type: 'slider', min: 30, max: 90, step: 5, defaultValue: 45, unit: 's' },
      { key: 'blinkWarning', label: 'Blink Warning', description: 'Warning time before switch', type: 'slider', min: 1, max: 5, step: 1, defaultValue: 3, unit: 's' },
    ],
    songSelectionOptions: ['library', 'random', 'vote', 'medley'],
    supportsCompanionApp: true,
    forceInputMode: 'companion',
  },
  'medley': {
    mode: 'medley',
    title: 'Medley Contest',
    icon: '🎵',
    description: 'FFA or Team mode — sing random song snippets!',
    extendedDescription: [
      '👥 FFA: 4 Spieler singen gleichzeitig, einzeln bewertet',
      '⚔️ Team: 1v1 oder 2v2 — Teams treten in Duellen gegeneinander an',
      '🎵 Zufällige Song-Snippets — keine Vorschau, alles Überraschung!',
      '🏆 Punkte über alle Snippets summiert, zweite Runde möglich',
    ],
    color: 'from-purple-500 to-pink-500',
    minPlayers: 2,
    maxPlayers: 4,
    settings: [
      { key: 'playMode', label: 'Spielmodus', description: 'FFA oder Team', type: 'select', options: [
        { value: 'ffa', label: 'FFA (Jeder gegen Jeden — 4 Spieler)' },
        { value: 'team', label: 'Team (1v1 oder 2v2)' },
      ], defaultValue: 'ffa' },
      { key: 'teamSize', label: 'Team-Größe', description: 'Für Team-Modus', type: 'select', options: [
        { value: 1, label: '1v1 (5 Snippets)' },
        { value: 2, label: '2v2 (4 Snippets)' },
      ], defaultValue: 1 },
      { key: 'snippetDuration', label: 'Snippet-Dauer', type: 'slider', min: 15, max: 60, step: 5, defaultValue: 30, unit: 's' },
      { key: 'transitionTime', label: 'Übergangszeit', description: 'Zeit zwischen Snippets', type: 'slider', min: 1, max: 5, step: 1, defaultValue: 3, unit: 's' },
    ],
    songSelectionOptions: ['random'],
    supportsCompanionApp: true,
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
      { key: 'maxPlayers', label: 'Bracket Size', type: 'select', options: [
        { value: 2, label: '2 - Duel' }, { value: 4, label: '4 Players' },
        { value: 8, label: '8 Players' }, { value: 16, label: '16 Players' }, { value: 32, label: '32 Players' },
      ], defaultValue: 8 },
      { key: 'shortMode', label: 'Short Mode', description: 'Each match lasts only 60 seconds', type: 'toggle', defaultValue: true },
    ],
    songSelectionOptions: ['random'],
    supportsCompanionApp: false,
  },
  'battle-royale': {
    mode: 'battle-royale',
    title: 'Battle Royale',
    icon: '👑',
    description: 'All sing together - lowest score eliminated each round! Up to 24 players (4 mic + 20 companion)',
    extendedDescription: [
      '🎤 Bis zu 4 Spieler mit Mikrofon am Gerät',
      '📱 Bis zu 20 weitere Spieler über die Companion App',
      '📉 Der Spieler mit der niedrigsten Punktzahl scheidet aus',
      '🔄 Jede Runde ein neuer Song',
      '👑 Der letzte Sänger gewinnt!',
    ],
    color: 'from-red-600 to-pink-600',
    minPlayers: 2,
    maxPlayers: 24,
    settings: [
      { key: 'roundDuration', label: 'Round Duration', type: 'slider', min: 30, max: 180, step: 15, defaultValue: 60, unit: 's' },
      { key: 'finalRoundDuration', label: 'Final Round Duration', type: 'slider', min: 60, max: 300, step: 30, defaultValue: 120, unit: 's' },
      { key: 'medleyMode', label: 'Medley Mode', description: 'Multiple song snippets per round', type: 'toggle', defaultValue: false },
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
    description: 'Lyrics disappear for certain sections! Competitive multiplayer mode.',
    extendedDescription: [
      '🙈 Text verschwindet in bestimmten Abschnitten',
      '🧠 Singe aus dem Gedächtnis',
      '👥 2 Spieler singen gleichzeitig den gleichen Song',
      '🏆 Rangliste über mehrere Runden',
      '🎯 Best-of-3, Best-of-5 oder Best-of-7',
    ],
    color: 'from-green-500 to-teal-500',
    minPlayers: 2,
    maxPlayers: 4,
    settings: [
      { key: 'blindFrequency', label: 'Blind Frequency', description: 'How often lyrics disappear', type: 'select', options: [
        { value: 'rare', label: 'Rare (10%)' }, { value: 'normal', label: 'Normal (25%)' },
        { value: 'often', label: 'Often (40%)' }, { value: 'insane', label: 'Insane (60%)' },
      ], defaultValue: 'normal' },
      { key: 'bestOf', label: 'Best of', description: 'Number of rounds per player', type: 'select', options: [
        { value: 1, label: '1 Round' }, { value: 3, label: 'Best of 3' },
        { value: 5, label: 'Best of 5' }, { value: 7, label: 'Best of 7' },
      ], defaultValue: 3 },
    ],
    songSelectionOptions: ['random'],
    supportsCompanionApp: false,
  },
  'missing-words': {
    mode: 'missing-words',
    title: 'Missing Words',
    icon: '📝',
    description: 'Some lyrics disappear - competitive multiplayer mode!',
    extendedDescription: [
      '📝 Manche Wörter verschwinden aus dem Text',
      '🎤 Singe die fehlenden Wörter zur richtigen Zeit',
      '👥 2 Spieler singen gleichzeitig den gleichen Song',
      '⭐ Bonuspunkte für korrekte fehlende Wörter',
      '🏆 Rangliste über mehrere Runden (Best-of-3/5/7)',
    ],
    color: 'from-orange-500 to-red-500',
    minPlayers: 2,
    maxPlayers: 4,
    settings: [
      { key: 'missingWordFrequency', label: 'Missing Word Frequency', type: 'select', options: [
        { value: 'easy', label: 'Easy (few words)' }, { value: 'normal', label: 'Normal' }, { value: 'hard', label: 'Hard (many words)' },
      ], defaultValue: 'normal' },
      { key: 'bestOf', label: 'Best of', description: 'Number of rounds per player', type: 'select', options: [
        { value: 1, label: '1 Round' }, { value: 3, label: 'Best of 3' },
        { value: 5, label: 'Best of 5' }, { value: 7, label: 'Best of 7' },
      ], defaultValue: 3 },
    ],
    songSelectionOptions: ['random'],
    supportsCompanionApp: false,
  },
  'rate-my-song': {
    mode: 'rate-my-song',
    title: 'Rate my Song',
    icon: '⭐',
    description: 'Sing a song and let friends rate your performance!',
    extendedDescription: [
      '🎤 Singe einen Song deiner Wahl',
      '⭐ Deine Freunde bewerten deinen Auftritt (1-10)',
      '👥 Solo, Duell oder Duett Modus',
      '⏱️ Kurz (60s) oder ganzer Song',
      '🏆 Rangliste mit gewichtetem Score',
    ],
    color: 'from-amber-500 to-orange-500',
    minPlayers: 1,
    maxPlayers: 2,
    settings: [
      { key: 'duration', label: 'Dauer', description: 'Short = 60s, Normal = full song', type: 'select', options: [
        { value: 'short', label: 'Kurz (60s)' },
        { value: 'normal', label: 'Normal (ganzer Song)' },
      ], defaultValue: 'normal' },
    ],
    songSelectionOptions: ['library', 'random'],
    supportsCompanionApp: true,
    inputModeDefault: 'mixed',
  },
};

// ===================== SONG SELECTION BUTTONS CONFIG =====================

export const SONG_SELECTION_CONFIG: Record<SongSelectionOption, {
  icon: string; label: string; description: string; color: string;
}> = {
  library: { icon: '📚', label: 'From Library', description: 'Choose a song from your library', color: 'bg-cyan-500 hover:bg-cyan-600' },
  random: { icon: '🎲', label: 'Random Song', description: 'Let the game pick a random song', color: 'bg-purple-500 hover:bg-purple-600' },
  vote: { icon: '🗳️', label: 'Vote (3 Songs)', description: '3 songs are suggested - vote for your favorite', color: 'bg-amber-500 hover:bg-amber-600' },
  medley: { icon: '🎵', label: 'Medley Mix', description: 'Mix multiple songs together', color: 'bg-pink-500 hover:bg-pink-600' },
};
