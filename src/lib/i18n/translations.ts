// Comprehensive i18n system for Karaoke Successor
// Supports multiple languages with fallback to English
// Allows both function call t('key') and object access t.settings.title

import { useState, useEffect, useCallback } from 'react';
import { storage, STORAGE_KEYS } from '@/lib/storage';

export type Language = 'en' | 'de' | 'es' | 'fr' | 'it' | 'pt' | 'ja' | 'ko' | 'zh' | 'ru' | 'nl' | 'pl' | 'sv' | 'no' | 'da' | 'fi';

export const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  de: 'Deutsch',
  es: 'Español',
  fr: 'Français',
  it: 'Italiano',
  pt: 'Português',
  ja: '日本語',
  ko: '한국어',
  zh: '中文',
  ru: 'Русский',
  nl: 'Nederlands',
  pl: 'Polski',
  sv: 'Svenska',
  no: 'Norsk',
  da: 'Dansk',
  fi: 'Suomi',
};

export const LANGUAGE_FLAGS: Record<Language, string> = {
  en: '🇬🇧',
  de: '🇩🇪',
  es: '🇪🇸',
  fr: '🇫🇷',
  it: '🇮🇹',
  pt: '🇵🇹',
  ja: '🇯🇵',
  ko: '🇰🇷',
  zh: '🇨🇳',
  ru: '🇷🇺',
  nl: '🇳🇱',
  pl: '🇵🇱',
  sv: '🇸🇪',
  no: '🇳🇴',
  da: '🇩🇰',
  fi: '🇫🇮',
};

// English translations (base)
const enTranslations = {
  nav: {
    library: 'Library',
    import: 'Import',
    party: 'Party',
    characters: 'Characters',
    queue: 'Queue',
    highscores: 'Highscores',
    jukebox: 'Jukebox',
    mobile: 'Mobile',
    achievements: 'Achievements',
    daily: 'Daily',
    settings: 'Settings',
  },
  home: {
    title: 'Karaoke Successor',
    subtitle: 'The ultimate karaoke experience. Sing your heart out with real-time pitch detection, compete with friends, and enjoy party games!',
    startSinging: 'Start Singing',
    partyMode: 'Party Mode',
    songsAvailable: 'Songs Available',
    charactersCreated: 'Characters Created',
    partyGames: 'Party Games',
    difficultyLevels: 'Difficulty Levels',
    selectCharacter: 'Select Your Character',
    createNew: 'Create New',
  },
  library: {
    title: 'Music Library',
    songsAvailable: 'songs available',
    loadingSongs: 'Loading songs...',
    searchPlaceholder: 'Search songs, artists, or genres...',
    noSongs: 'No songs found',
    noSongsDesc: 'Try adjusting your search or filters',
    selectSong: 'Select a song to start singing',
    selectSongDesc: 'Choose from your library or import new songs',
    sortBy: 'Sort by',
    filterGenre: 'Genre',
    filterLanguage: 'Language',
    allGenres: 'All Genres',
    allLanguages: 'All Languages',
    gridView: 'Grid View',
    folderView: 'Folder View',
    groupBy: 'Group by',
    groupNone: 'None',
    groupArtist: 'Artist',
    groupTitle: 'Title',
    groupGenre: 'Genre',
    groupLanguage: 'Language',
    groupFolder: 'Folder',
  },
  song: {
    difficulty: 'Difficulty',
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
    mode: 'Mode',
    singlePlayer: 'Single Player',
    duel: 'Duel',
    addToQueue: 'Add to Queue',
    startGame: 'Start Game',
    highscores: 'Highscores',
    duration: 'Duration',
    bpm: 'BPM',
    preview: 'Preview',
  },
  game: {
    back: 'Back',
    sync: 'Sync',
    pts: 'pts',
    combo: 'combo',
    practiceMode: 'Practice Mode',
    enablePractice: 'Enable Practice Mode',
    playbackSpeed: 'Playback Speed',
    pitchGuide: 'Pitch Guide',
    audioEffects: 'Audio Effects',
    reverb: 'Reverb',
    echo: 'Echo',
    pause: 'Pause',
    resume: 'Resume',
    restart: 'Restart',
    endSong: 'End Song',
    lyrics: 'Lyrics',
    notes: 'Notes',
    score: 'Score',
  },
  results: {
    perfect: 'Perfect!',
    excellent: 'Excellent!',
    good: 'Good!',
    okay: 'Okay!',
    poor: 'Poor',
    totalScore: 'Total Score',
    notesHit: 'Notes Hit',
    notesMissed: 'Notes Missed',
    bestCombo: 'Best Combo',
    accuracy: 'Accuracy',
    playAgain: 'Play Again',
    backToHome: 'Back to Home',
    shareScore: 'Share Your Score',
    scoreCard: 'Score Card',
    videoShort: 'Video Short',
    downloadCard: 'Download Card',
    uploadingToLeaderboard: 'Uploading to global leaderboard...',
    newHighscore: 'New Highscore!',
    rating: 'Rating',
  },
  settings: {
    title: 'Settings',
    subtitle: 'Configure your karaoke experience',
    tabLibrary: 'Library',
    tabGeneral: 'General',
    tabAbout: 'About',
    library: 'Library',
    general: 'General',
    about: 'About',
    songsFolder: 'Songs Folder',
    songsFolderDesc: 'Enter the path to your songs folder',
    browse: 'Browse',
    save: 'Save',
    libraryStats: 'Library Statistics',
    songsInLibrary: 'Songs in Library',
    highscoreEntries: 'Highscore Entries',
    dangerZone: 'Danger Zone',
    resetLibrary: 'Reset Song Library',
    resetLibraryDesc: 'Remove all songs from the library. Highscores will be preserved.',
    clearAll: 'Clear All Data',
    clearAllDesc: 'Delete everything including highscores, profiles, and settings.',
    language: 'Language',
    languageDesc: 'Choose your preferred language',
    languageNote: 'Changes apply immediately. Some content may need refresh.',
    themeSettings: 'Theme Settings',
    themeSettingsDesc: 'Customize the visual appearance',
    colorTheme: 'Color Theme',
    lyricsStyle: 'Lyrics Style',
    backgroundVideo: 'Background Video',
    backgroundVideoDesc: 'Show video background while singing',
    audioSettings: 'Audio Settings',
    audioSettingsDesc: 'Configure audio input and output',
    previewVolume: 'Audio Preview Volume',
    previewVolumeDesc: 'Volume for song previews in the library',
    micSensitivity: 'Microphone Sensitivity',
    micSensitivityDesc: 'Adjust microphone input sensitivity',
    selectInputDevice: 'Select Input Device',
    defaultMicrophone: 'Default Microphone',
    microphoneGain: 'Microphone Gain',
    noiseSuppression: 'Noise Suppression',
    noiseSuppressionDesc: 'Reduce background noise',
    echoCancellation: 'Echo Cancellation',
    echoCancellationDesc: 'Reduce speaker feedback',
    testMicrophone: 'Test Microphone',
    gameSettings: 'Game Settings',
    gameSettingsDesc: 'Configure gameplay options',
    defaultDifficulty: 'Default Difficulty',
    defaultDifficultyDesc: 'Starting difficulty for new songs',
    showPitchGuide: 'Show Pitch Guide',
    showPitchGuideDesc: 'Display note guide while singing',
    keyboardShortcuts: 'Keyboard Shortcuts',
    keyboardShortcutsDesc: 'Quick navigation shortcuts',
    searchShortcut: 'Search',
    fullscreenShortcut: 'Fullscreen',
    libraryShortcut: 'Library',
    settingsShortcut: 'Settings',
    closeShortcut: 'Close/Back',
    searchAltShortcut: 'Search (Alt)',
    technologyStack: 'Technology Stack',
    framework: 'Framework',
    uiLibrary: 'UI Library',
    stateManagement: 'State Management',
    styling: 'Styling',
    onlineLeaderboard: 'Online Leaderboard',
    onlineLeaderboardDesc: 'Connect to global highscores',
    testConnection: 'Test Connection',
    installApp: 'Install App',
    installAppDesc: 'Install for offline access',
    appInstalled: 'App is installed',
    version: 'Version',
    aboutDesc: 'Karaoke Successor is a modern karaoke application with real-time pitch detection, party modes, and more.',
    feature1: 'Real-time pitch detection with YIN algorithm',
    feature2: 'Multiple party game modes',
    feature3: 'Mobile app integration for remote control',
    feature4: 'Import your own UltraStar format songs',
  },
  mic: {
    title: 'Microphone Settings',
    multiMic: 'Multi-Microphone Mode',
    multiMicDesc: 'Use multiple microphones simultaneously for duets or group singing',
    selectDevice: 'Select Microphone',
    defaultMic: 'Default Microphone',
    addMic: 'Add Microphone',
    removeMic: 'Remove',
    assignToPlayer: 'Assign to Player',
    level: 'Level',
    gain: 'Gain',
    noiseSuppression: 'Noise Suppression',
    noiseSuppressionDesc: 'Reduce background noise',
    echoCancellation: 'Echo Cancellation',
    echoCancellationDesc: 'Reduce speaker feedback',
    test: 'Test Microphone',
    testing: 'Testing...',
    noMicsFound: 'No microphones found. Please connect a microphone and refresh.',
    connected: 'Connected',
    disconnected: 'Disconnected',
  },
  party: {
    title: 'Party Games',
    subtitle: 'Choose a game mode for your party!',
    passTheMic: 'Pass the Mic',
    passTheMicDesc: 'Take turns singing parts of a song. When the music stops, the next singer takes over!',
    companionSingalong: 'Companion Sing-A-Long',
    companionSingalongDesc: 'Your phone randomly lights up - that\'s your cue to sing! No one knows who\'s next until the blink!',
    medleyContest: 'Medley Contest',
    medleyContestDesc: 'Sing short snippets of multiple songs in a row. How many can you nail?',
    missingWords: 'Missing Words',
    missingWordsDesc: 'Some lyrics disappear! Can you sing the right words at the right time?',
    duelMode: 'Duel Mode',
    duelModeDesc: 'Two players sing the same song side by side. Who will score higher?',
    blindKaraoke: 'Blind Karaoke',
    blindKaraokeDesc: 'Lyrics disappear for certain sections. Can you remember the words?',
    players: 'players',
    selectPlayers: 'Select Players',
    startGame: 'Start Game',
    endGame: 'End Game',
    nextRound: 'Next Round',
  },
  character: {
    title: 'Characters',
    createCharacter: 'Create Character',
    name: 'Name',
    country: 'Country',
    avatar: 'Avatar',
    uploadPhoto: 'Upload Photo',
    create: 'Create',
    edit: 'Edit',
    delete: 'Delete',
    active: 'Active',
    selectAsActive: 'Select as Active',
    noCharacters: 'No characters yet',
    noCharactersDesc: 'Create a character to track your scores and progress!',
  },
  queue: {
    title: 'Song Queue',
    empty: 'Queue is empty',
    emptyDesc: 'Add songs from the library to start a queue',
    removeFromQueue: 'Remove from Queue',
    clearQueue: 'Clear Queue',
    upNext: 'Up Next',
    nowPlaying: 'Now Playing',
    startQueue: 'Start Queue',
  },
  highscore: {
    title: 'Highscores',
    local: 'Local',
    global: 'Global',
    noScores: 'No highscores yet',
    noScoresDesc: 'Play some songs to set your first highscore!',
    rank: 'Rank',
    player: 'Player',
    song: 'Song',
    score: 'Score',
    date: 'Date',
    clearAll: 'Clear All Highscores',
  },
  jukebox: {
    title: 'Jukebox Mode',
    subtitle: 'Sit back and enjoy the music!',
    songsInPlaylist: 'songs in playlist',
    searchPlaceholder: 'Search songs, artists, albums...',
    allGenres: 'All Genres',
    allArtists: 'All Artists',
    songsFound: 'songs found',
    startJukebox: 'Start Jukebox',
    stopJukebox: 'Stop Jukebox',
    nowPlaying: 'NOW PLAYING',
    upNext: 'Up Next',
    exitFullscreen: 'Exit Fullscreen',
    hidePlaylist: 'Hide Playlist',
    showPlaylist: 'Show Playlist',
    playlistSettings: 'Playlist Settings',
    customizeExperience: 'Customize your music experience',
    filterByGenre: 'Filter by Genre',
    filterByArtist: 'Filter by Artist',
    shuffle: 'Shuffle',
    repeat: 'Repeat',
    repeatNone: 'No Repeat',
    repeatAll: 'Repeat All',
    repeatOne: 'Repeat One',
  },
  mobile: {
    title: 'Mobile Integration',
    subtitle: 'Use your smartphone as a microphone or remote control',
    yourLanIp: 'Your LAN IP Address',
    port: 'Port',
    detecting: 'Detecting...',
    sameWifi: 'Make sure your phone is connected to the same WiFi network as this computer',
    scanToConnect: 'Scan to Connect',
    scanQrCode: 'Scan this QR code with your phone',
    detectingNetwork: 'Detecting network address...',
    retryDetection: 'Retry Detection',
    connectedDevices: 'Connected Devices',
    noDevices: 'No devices connected',
    scanQrToConnect: 'Scan the QR code to connect your phone',
    useAsMicrophone: 'Use as Microphone',
    useAsMicrophoneDesc: 'Your phone becomes a high-quality wireless microphone',
    browseLibrary: 'Browse Library',
    browseLibraryDesc: 'Scroll through songs and add to queue from your phone',
    manageQueue: 'Manage Queue',
    manageQueueDesc: 'View and manage the song queue remotely',
    howToConnect: 'How to Connect',
    howToConnect1: 'Make sure your phone is connected to the same WiFi network',
    howToConnect2: 'Open your phone\'s camera app and point it at the QR code',
    howToConnect3: 'Tap the notification to open the link',
    howToConnect4: 'Grant microphone permission when prompted',
    howToConnect5: 'Tap the microphone button to start singing!',
  },
  achievements: {
    title: 'Achievements',
    unlocked: 'Unlocked',
    locked: 'Locked',
    progress: 'Progress',
    noAchievements: 'No achievements yet',
    playToUnlock: 'Play songs to unlock achievements!',
    rarity: 'Rarity',
    common: 'Common',
    uncommon: 'Uncommon',
    rare: 'Rare',
    epic: 'Epic',
    legendary: 'Legendary',
  },
  daily: {
    title: 'Daily Challenge',
    todayChallenge: 'Today\'s Challenge',
    playChallenge: 'Play Challenge',
    alreadyCompleted: 'Already completed today',
    comeBackTomorrow: 'Come back tomorrow for a new challenge!',
    streak: 'Day Streak',
    bestStreak: 'Best Streak',
    rewards: 'Rewards',
  },
  common: {
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    cancel: 'Cancel',
    confirm: 'Confirm',
    delete: 'Delete',
    edit: 'Edit',
    save: 'Save',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    start: 'Start',
    stop: 'Stop',
    play: 'Play',
    pause: 'Pause',
    reset: 'Reset',
    clear: 'Clear',
    all: 'All',
    none: 'None',
    yes: 'Yes',
    no: 'No',
    ok: 'OK',
    close: 'Close',
    search: 'Search',
    filter: 'Filter',
    sort: 'Sort',
    refresh: 'Refresh',
  },
};

// German translations
const deTranslations = {
  nav: {
    library: 'Bibliothek',
    import: 'Import',
    party: 'Party',
    characters: 'Charaktere',
    queue: 'Warteschlange',
    highscores: 'Highscores',
    jukebox: 'Jukebox',
    mobile: 'Mobil',
    achievements: 'Erfolge',
    daily: 'Täglich',
    settings: 'Einstellungen',
  },
  home: {
    title: 'Karaoke Successor',
    subtitle: 'Das ultimative Karaoke-Erlebnis. Singe dein Herz aus mit Echtzeit-Pitch-Erkennung, compete mit Freunden und genieße Party-Spiele!',
    startSinging: 'Singen Starten',
    partyMode: 'Party-Modus',
    songsAvailable: 'Songs verfügbar',
    charactersCreated: 'Charaktere erstellt',
    partyGames: 'Party-Spiele',
    difficultyLevels: 'Schwierigkeitsstufen',
    selectCharacter: 'Wähle deinen Charakter',
    createNew: 'Neu erstellen',
  },
  library: {
    title: 'Musikbibliothek',
    songsAvailable: 'Songs verfügbar',
    loadingSongs: 'Lade Songs...',
    searchPlaceholder: 'Songs, Künstler oder Genres suchen...',
    noSongs: 'Keine Songs gefunden',
    noSongsDesc: 'Versuche deine Suche oder Filter anzupassen',
    selectSong: 'Wähle einen Song um zu starten',
    selectSongDesc: 'Wähle aus deiner Bibliothek oder importiere neue Songs',
    sortBy: 'Sortieren nach',
    filterGenre: 'Genre',
    filterLanguage: 'Sprache',
    allGenres: 'Alle Genres',
    allLanguages: 'Alle Sprachen',
    gridView: 'Rasteransicht',
    folderView: 'Ordneransicht',
    groupBy: 'Gruppieren nach',
    groupNone: 'Keine',
    groupArtist: 'Künstler',
    groupTitle: 'Titel',
    groupGenre: 'Genre',
    groupLanguage: 'Sprache',
    groupFolder: 'Ordner',
  },
  song: {
    difficulty: 'Schwierigkeit',
    easy: 'Leicht',
    medium: 'Mittel',
    hard: 'Schwer',
    mode: 'Modus',
    singlePlayer: 'Einzelspieler',
    duel: 'Duell',
    addToQueue: 'Zur Warteschlange',
    startGame: 'Spiel Starten',
    highscores: 'Highscores',
    duration: 'Dauer',
    bpm: 'BPM',
    preview: 'Vorschau',
  },
  game: {
    back: 'Zurück',
    sync: 'Sync',
    pts: 'Pkt',
    combo: 'Combo',
    practiceMode: 'Übungsmodus',
    enablePractice: 'Übungsmodus aktivieren',
    playbackSpeed: 'Wiedergabegeschwindigkeit',
    pitchGuide: 'Tonhöhenführung',
    audioEffects: 'Audio-Effekte',
    reverb: 'Hall',
    echo: 'Echo',
    pause: 'Pause',
    resume: 'Fortsetzen',
    restart: 'Neustart',
    endSong: 'Song beenden',
    lyrics: 'Songtext',
    notes: 'Noten',
    score: 'Punkte',
  },
  results: {
    perfect: 'Perfekt!',
    excellent: 'Ausgezeichnet!',
    good: 'Gut!',
    okay: 'Okay!',
    poor: 'Schlecht',
    totalScore: 'Gesamtpunktzahl',
    notesHit: 'Treffer',
    notesMissed: 'Verfehlt',
    bestCombo: 'Beste Combo',
    accuracy: 'Genauigkeit',
    playAgain: 'Nochmal spielen',
    backToHome: 'Zurück zum Start',
    shareScore: 'Ergebnis teilen',
    scoreCard: 'Punktekarte',
    videoShort: 'Video Short',
    downloadCard: 'Karte herunterladen',
    uploadingToLeaderboard: 'Wird zum globalen Leaderboard hochgeladen...',
    newHighscore: 'Neuer Highscore!',
    rating: 'Bewertung',
  },
  settings: {
    title: 'Einstellungen',
    subtitle: 'Konfiguriere dein Karaoke-Erlebnis',
    tabLibrary: 'Bibliothek',
    tabGeneral: 'Allgemein',
    tabAbout: 'Über',
    library: 'Bibliothek',
    general: 'Allgemein',
    about: 'Über',
    songsFolder: 'Songs-Ordner',
    songsFolderDesc: 'Gib den Pfad zu deinem Songs-Ordner ein',
    browse: 'Durchsuchen',
    save: 'Speichern',
    libraryStats: 'Bibliotheksstatistiken',
    songsInLibrary: 'Songs in Bibliothek',
    highscoreEntries: 'Highscore-Einträge',
    dangerZone: 'Gefahrenbereich',
    resetLibrary: 'Bibliothek zurücksetzen',
    resetLibraryDesc: 'Alle Songs aus der Bibliothek entfernen. Highscores bleiben erhalten.',
    clearAll: 'Alle Daten löschen',
    clearAllDesc: 'Alles löschen inklusive Highscores, Profile und Einstellungen.',
    language: 'Sprache',
    languageDesc: 'Wähle deine bevorzugte Sprache',
    languageNote: 'Änderungen werden sofort angewendet. Manche Inhalte müssen aktualisiert werden.',
    themeSettings: 'Theme-Einstellungen',
    themeSettingsDesc: 'Passe das visuelle Erscheinungsbild an',
    colorTheme: 'Farb-Theme',
    lyricsStyle: 'Songtext-Stil',
    backgroundVideo: 'Hintergrundvideo',
    backgroundVideoDesc: 'Video-Hintergrund beim Singen anzeigen',
    audioSettings: 'Audio-Einstellungen',
    audioSettingsDesc: 'Audio-Ein- und -Ausgabe konfigurieren',
    previewVolume: 'Audio-Vorschau-Lautstärke',
    previewVolumeDesc: 'Lautstärke für Song-Vorschau in der Bibliothek',
    micSensitivity: 'Mikrofon-Empfindlichkeit',
    micSensitivityDesc: 'Mikrofon-Eingangsempfindlichkeit anpassen',
    selectInputDevice: 'Eingabegerät wählen',
    defaultMicrophone: 'Standard-Mikrofon',
    microphoneGain: 'Mikrofon-Verstärkung',
    noiseSuppression: 'Rauschunterdrückung',
    noiseSuppressionDesc: 'Hintergrundgeräusche reduzieren',
    echoCancellation: 'Echo-Unterdrückung',
    echoCancellationDesc: 'Lautsprecher-Feedback reduzieren',
    testMicrophone: 'Mikrofon testen',
    gameSettings: 'Spieleinstellungen',
    gameSettingsDesc: 'Gameplay-Optionen konfigurieren',
    defaultDifficulty: 'Standard-Schwierigkeit',
    defaultDifficultyDesc: 'Startschwierigkeit für neue Songs',
    showPitchGuide: 'Tonhöhenführung anzeigen',
    showPitchGuideDesc: 'Notenführung beim Singen anzeigen',
    keyboardShortcuts: 'Tastaturkürzel',
    keyboardShortcutsDesc: 'Schnellnavigation',
    searchShortcut: 'Suchen',
    fullscreenShortcut: 'Vollbild',
    libraryShortcut: 'Bibliothek',
    settingsShortcut: 'Einstellungen',
    closeShortcut: 'Schließen/Zurück',
    searchAltShortcut: 'Suchen (Alt)',
    technologyStack: 'Technologie-Stack',
    framework: 'Framework',
    uiLibrary: 'UI-Bibliothek',
    stateManagement: 'Zustandsverwaltung',
    styling: 'Styling',
    onlineLeaderboard: 'Online-Leaderboard',
    onlineLeaderboardDesc: 'Mit globalen Highscores verbinden',
    testConnection: 'Verbindung testen',
    installApp: 'App installieren',
    installAppDesc: 'Für Offline-Zugriff installieren',
    appInstalled: 'App ist installiert',
    version: 'Version',
    aboutDesc: 'Karaoke Successor ist eine moderne Karaoke-Anwendung mit Echtzeit-Pitch-Erkennung, Party-Modi und mehr.',
    feature1: 'Echtzeit-Pitch-Erkennung mit YIN-Algorithmus',
    feature2: 'Mehrere Party-Spielmodi',
    feature3: 'Mobile-App-Integration zur Fernsteuerung',
    feature4: 'Eigene UltraStar-Format-Songs importieren',
  },
  mic: {
    title: 'Mikrofon-Einstellungen',
    multiMic: 'Multi-Mikrofon-Modus',
    multiMicDesc: 'Mehrere Mikrofone gleichzeitig für Duelle oder Gruppensingerei nutzen',
    selectDevice: 'Mikrofon wählen',
    defaultMic: 'Standard-Mikrofon',
    addMic: 'Mikrofon hinzufügen',
    removeMic: 'Entfernen',
    assignToPlayer: 'Spieler zuweisen',
    level: 'Pegel',
    gain: 'Verstärkung',
    noiseSuppression: 'Rauschunterdrückung',
    noiseSuppressionDesc: 'Hintergrundgeräusche reduzieren',
    echoCancellation: 'Echo-Unterdrückung',
    echoCancellationDesc: 'Lautsprecher-Feedback reduzieren',
    test: 'Mikrofon testen',
    testing: 'Teste...',
    noMicsFound: 'Keine Mikrofone gefunden. Bitte verbinde ein Mikrofon und aktualisiere die Seite.',
    connected: 'Verbunden',
    disconnected: 'Getrennt',
  },
  party: {
    title: 'Party-Spiele',
    subtitle: 'Wähle einen Spielmodus für deine Party!',
    passTheMic: 'Mikrofon weitergeben',
    passTheMicDesc: 'Wechsle dich beim Singen ab. Wenn die Musik stoppt, ist der nächste dran!',
    companionSingalong: 'Begleit-App Sing-A-Long',
    companionSingalongDesc: 'Dein Handy leuchtet zufällig auf - dann bist du dran! Niemand weiß, wer als nächstes dran ist!',
    medleyContest: 'Medley-Wettbewerb',
    medleyContestDesc: 'Sing kurze Ausschnitte mehrerer Songs hintereinander. Wie viele schaffst du?',
    missingWords: 'Fehlende Wörter',
    missingWordsDesc: 'Manche Texte verschwinden! Kannst du die richtigen Wörter zur richtigen Zeit singen?',
    duelMode: 'Duell-Modus',
    duelModeDesc: 'Zwei Spieler singen den gleichen Song nebeneinander. Wer gewinnt?',
    blindKaraoke: 'Blind-Karaoke',
    blindKaraokeDesc: 'Texte verschwinden in bestimmten Abschnitten. Kannst du dich erinnern?',
    players: 'Spieler',
    selectPlayers: 'Spieler wählen',
    startGame: 'Spiel starten',
    endGame: 'Spiel beenden',
    nextRound: 'Nächste Runde',
  },
  character: {
    title: 'Charaktere',
    createCharacter: 'Charakter erstellen',
    name: 'Name',
    country: 'Land',
    avatar: 'Avatar',
    uploadPhoto: 'Foto hochladen',
    create: 'Erstellen',
    edit: 'Bearbeiten',
    delete: 'Löschen',
    active: 'Aktiv',
    selectAsActive: 'Als aktiv auswählen',
    noCharacters: 'Noch keine Charaktere',
    noCharactersDesc: 'Erstelle einen Charakter um deine Punkte und deinen Fortschritt zu verfolgen!',
  },
  queue: {
    title: 'Song-Warteschlange',
    empty: 'Warteschlange ist leer',
    emptyDesc: 'Füge Songs aus der Bibliothek hinzu',
    removeFromQueue: 'Aus Warteschlange entfernen',
    clearQueue: 'Warteschlange leeren',
    upNext: 'Als nächstes',
    nowPlaying: 'Jetzt läuft',
    startQueue: 'Warteschlange starten',
  },
  highscore: {
    title: 'Highscores',
    local: 'Lokal',
    global: 'Global',
    noScores: 'Noch keine Highscores',
    noScoresDesc: 'Spiele einige Songs um deinen ersten Highscore zu setzen!',
    rank: 'Rang',
    player: 'Spieler',
    song: 'Song',
    score: 'Punkte',
    date: 'Datum',
    clearAll: 'Alle Highscores löschen',
  },
  jukebox: {
    title: 'Jukebox-Modus',
    subtitle: 'Setz dich zurück und genieß die Musik!',
    songsInPlaylist: 'Songs in Playlist',
    searchPlaceholder: 'Songs, Künstler, Alben suchen...',
    allGenres: 'Alle Genres',
    allArtists: 'Alle Künstler',
    songsFound: 'Songs gefunden',
    startJukebox: 'Jukebox starten',
    stopJukebox: 'Jukebox stoppen',
    nowPlaying: 'JETZT LÄUFT',
    upNext: 'Als nächstes',
    exitFullscreen: 'Vollbild beenden',
    hidePlaylist: 'Playlist ausblenden',
    showPlaylist: 'Playlist anzeigen',
    playlistSettings: 'Playlist-Einstellungen',
    customizeExperience: 'Passe dein Musik-Erlebnis an',
    filterByGenre: 'Nach Genre filtern',
    filterByArtist: 'Nach Künstler filtern',
    shuffle: 'Zufällig',
    repeat: 'Wiederholen',
    repeatNone: 'Nicht wiederholen',
    repeatAll: 'Alle wiederholen',
    repeatOne: 'Einen wiederholen',
  },
  mobile: {
    title: 'Mobil-Integration',
    subtitle: 'Nutze dein Smartphone als Mikrofon oder Fernbedienung',
    yourLanIp: 'Deine LAN-IP-Adresse',
    port: 'Port',
    detecting: 'Erkenne...',
    sameWifi: 'Stelle sicher, dass dein Handy mit dem gleichen WLAN verbunden ist wie dieser Computer',
    scanToConnect: 'Scannen zum Verbinden',
    scanQrCode: 'Scanne diesen QR-Code mit deinem Handy',
    detectingNetwork: 'Erkenne Netzwerk-Adresse...',
    retryDetection: 'Erkennung wiederholen',
    connectedDevices: 'Verbundene Geräte',
    noDevices: 'Keine Geräte verbunden',
    scanQrToConnect: 'Scanne den QR-Code um dein Handy zu verbinden',
    useAsMicrophone: 'Als Mikrofon nutzen',
    useAsMicrophoneDesc: 'Dein Handy wird zu einem hochwertigen kabellosen Mikrofon',
    browseLibrary: 'Bibliothek durchsuchen',
    browseLibraryDesc: 'Durchsuche Songs und füge sie zur Warteschlange hinzu',
    manageQueue: 'Warteschlange verwalten',
    manageQueueDesc: 'Zeige und verwalte die Song-Warteschlange aus der Ferne',
    howToConnect: 'Wie man verbindet',
    howToConnect1: 'Stelle sicher, dass dein Handy mit dem gleichen WLAN verbunden ist',
    howToConnect2: 'Öffne die Kamera-App und richte sie auf den QR-Code',
    howToConnect3: 'Tippe auf die Benachrichtigung um den Link zu öffnen',
    howToConnect4: 'Erlaube den Mikrofon-Zugriff wenn gefragt',
    howToConnect5: 'Tippe auf den Mikrofon-Button um zu singen!',
  },
  achievements: {
    title: 'Erfolge',
    unlocked: 'Freigeschaltet',
    locked: 'Gesperrt',
    progress: 'Fortschritt',
    noAchievements: 'Noch keine Erfolge',
    playToUnlock: 'Spiele Songs um Erfolge freizuschalten!',
    rarity: 'Seltenheit',
    common: 'Gewöhnlich',
    uncommon: 'Ungewöhnlich',
    rare: 'Selten',
    epic: 'Episch',
    legendary: 'Legendär',
  },
  daily: {
    title: 'Tägliche Herausforderung',
    todayChallenge: 'Heutige Herausforderung',
    playChallenge: 'Herausforderung spielen',
    alreadyCompleted: 'Heute bereits abgeschlossen',
    comeBackTomorrow: 'Komm morgen für eine neue Herausforderung zurück!',
    streak: 'Tage in Folge',
    bestStreak: 'Beste Serie',
    rewards: 'Belohnungen',
  },
  common: {
    loading: 'Laden...',
    error: 'Fehler',
    success: 'Erfolg',
    cancel: 'Abbrechen',
    confirm: 'Bestätigen',
    delete: 'Löschen',
    edit: 'Bearbeiten',
    save: 'Speichern',
    back: 'Zurück',
    next: 'Weiter',
    previous: 'Zurück',
    start: 'Start',
    stop: 'Stopp',
    play: 'Abspielen',
    pause: 'Pause',
    reset: 'Zurücksetzen',
    clear: 'Löschen',
    all: 'Alle',
    none: 'Keine',
    yes: 'Ja',
    no: 'Nein',
    ok: 'OK',
    close: 'Schließen',
    search: 'Suchen',
    filter: 'Filter',
    sort: 'Sortieren',
    refresh: 'Aktualisieren',
  },
};

// Spanish translations
const esTranslations = {
  nav: { library: 'Biblioteca', import: 'Importar', party: 'Fiesta', characters: 'Personajes', queue: 'Cola', highscores: 'Puntuaciones', jukebox: 'Jukebox', mobile: 'Móvil', achievements: 'Logros', daily: 'Diario', settings: 'Ajustes' },
  home: { title: 'Karaoke Successor', subtitle: 'La experiencia de karaoke definitiva. ¡Canta con detección de tono en tiempo real, compite con amigos y disfruta de los juegos de fiesta!', startSinging: 'Empezar a Cantar', partyMode: 'Modo Fiesta', songsAvailable: 'Canciones Disponibles', charactersCreated: 'Personajes Creados', partyGames: 'Juegos de Fiesta', difficultyLevels: 'Niveles de Dificultad', selectCharacter: 'Selecciona tu Personaje', createNew: 'Crear Nuevo' },
  library: { title: 'Biblioteca Musical', songsAvailable: 'canciones disponibles', loadingSongs: 'Cargando canciones...', searchPlaceholder: 'Buscar canciones, artistas o géneros...', noSongs: 'No se encontraron canciones', noSongsDesc: 'Intenta ajustar tu búsqueda o filtros', selectSong: 'Selecciona una canción para empezar', selectSongDesc: 'Elige de tu biblioteca o importa nuevas canciones', sortBy: 'Ordenar por', filterGenre: 'Género', filterLanguage: 'Idioma', allGenres: 'Todos los Géneros', allLanguages: 'Todos los Idiomas', gridView: 'Vista de Cuadrícula', folderView: 'Vista de Carpeta', groupBy: 'Agrupar por', groupNone: 'Ninguno', groupArtist: 'Artista', groupTitle: 'Título', groupGenre: 'Género', groupLanguage: 'Idioma', groupFolder: 'Carpeta' },
  song: { difficulty: 'Dificultad', easy: 'Fácil', medium: 'Medio', hard: 'Difícil', mode: 'Modo', singlePlayer: 'Un Jugador', duel: 'Duelo', addToQueue: 'Añadir a Cola', startGame: 'Empezar Juego', highscores: 'Puntuaciones', duration: 'Duración', bpm: 'BPM', preview: 'Vista Previa' },
  game: { back: 'Atrás', sync: 'Sinc', pts: 'pts', combo: 'combo', practiceMode: 'Modo Práctica', enablePractice: 'Activar Modo Práctica', playbackSpeed: 'Velocidad de Reproducción', pitchGuide: 'Guía de Tono', audioEffects: 'Efectos de Audio', reverb: 'Reverberación', echo: 'Eco', pause: 'Pausar', resume: 'Continuar', restart: 'Reiniciar', endSong: 'Terminar Canción', lyrics: 'Letras', notes: 'Notas', score: 'Puntuación' },
  results: { perfect: '¡Perfecto!', excellent: '¡Excelente!', good: '¡Bien!', okay: '¡Okay!', poor: 'Pobre', totalScore: 'Puntuación Total', notesHit: 'Notas Acertadas', notesMissed: 'Notas Falladas', bestCombo: 'Mejor Combo', accuracy: 'Precisión', playAgain: 'Jugar de Nuevo', backToHome: 'Volver al Inicio', shareScore: 'Compartir Puntuación', scoreCard: 'Tarjeta de Puntuación', videoShort: 'Video Corto', downloadCard: 'Descargar Tarjeta', uploadingToLeaderboard: 'Subiendo a la tabla de clasificación global...', newHighscore: '¡Nuevo Récord!', rating: 'Calificación' },
  settings: { title: 'Ajustes', subtitle: 'Configura tu experiencia de karaoke', tabLibrary: 'Biblioteca', tabGeneral: 'General', tabAbout: 'Acerca de', library: 'Biblioteca', general: 'General', about: 'Acerca de', songsFolder: 'Carpeta de Canciones', songsFolderDesc: 'Ingresa la ruta a tu carpeta de canciones', browse: 'Explorar', save: 'Guardar', libraryStats: 'Estadísticas de Biblioteca', songsInLibrary: 'Canciones en Biblioteca', highscoreEntries: 'Entradas de Puntuación', dangerZone: 'Zona de Peligro', resetLibrary: 'Reiniciar Biblioteca', resetLibraryDesc: 'Eliminar todas las canciones de la biblioteca. Las puntuaciones se conservarán.', clearAll: 'Borrar Todos los Datos', clearAllDesc: 'Eliminar todo incluyendo puntuaciones, perfiles y ajustes.', language: 'Idioma', languageDesc: 'Elige tu idioma preferido', languageNote: 'Los cambios se aplican inmediatamente. Algún contenido puede necesitar actualización.', themeSettings: 'Ajustes de Tema', themeSettingsDesc: 'Personaliza la apariencia visual', colorTheme: 'Tema de Color', lyricsStyle: 'Estilo de Letras', backgroundVideo: 'Video de Fondo', backgroundVideoDesc: 'Mostrar video de fondo mientras cantas', audioSettings: 'Ajustes de Audio', audioSettingsDesc: 'Configurar entrada y salida de audio', previewVolume: 'Volumen de Vista Previa', previewVolumeDesc: 'Volumen para vistas previas de canciones en la biblioteca', micSensitivity: 'Sensibilidad del Micrófono', micSensitivityDesc: 'Ajustar sensibilidad de entrada del micrófono', selectInputDevice: 'Seleccionar Dispositivo de Entrada', defaultMicrophone: 'Micrófono Predeterminado', microphoneGain: 'Ganancia del Micrófono', noiseSuppression: 'Supresión de Ruido', noiseSuppressionDesc: 'Reducir ruido de fondo', echoCancellation: 'Cancelación de Eco', echoCancellationDesc: 'Reducir retroalimentación de altavoces', testMicrophone: 'Probar Micrófono', gameSettings: 'Ajustes de Juego', gameSettingsDesc: 'Configurar opciones de juego', defaultDifficulty: 'Dificultad Predeterminada', defaultDifficultyDesc: 'Dificultad inicial para nuevas canciones', showPitchGuide: 'Mostrar Guía de Tono', showPitchGuideDesc: 'Mostrar guía de notas mientras cantas', keyboardShortcuts: 'Atajos de Teclado', keyboardShortcutsDesc: 'Atajos de navegación rápida', searchShortcut: 'Buscar', fullscreenShortcut: 'Pantalla Completa', libraryShortcut: 'Biblioteca', settingsShortcut: 'Ajustes', closeShortcut: 'Cerrar/Atrás', searchAltShortcut: 'Buscar (Alt)', technologyStack: 'Stack Tecnológico', framework: 'Framework', uiLibrary: 'Biblioteca UI', stateManagement: 'Gestión de Estado', styling: 'Estilo', onlineLeaderboard: 'Tabla de Clasificación Online', onlineLeaderboardDesc: 'Conectar con puntuaciones globales', testConnection: 'Probar Conexión', installApp: 'Instalar App', installAppDesc: 'Instalar para acceso sin conexión', appInstalled: 'App está instalada', version: 'Versión', aboutDesc: 'Karaoke Successor es una aplicación de karaoke moderna con detección de tono en tiempo real, modos de fiesta y más.', feature1: 'Detección de tono en tiempo real con algoritmo YIN', feature2: 'Múltiples modos de juegos de fiesta', feature3: 'Integración de app móvil para control remoto', feature4: 'Importa tus propias canciones en formato UltraStar' },
  mic: { title: 'Ajustes de Micrófono', multiMic: 'Modo Multi-Micrófono', multiMicDesc: 'Usar múltiples micrófonos simultáneamente para dúos o canto grupal', selectDevice: 'Seleccionar Micrófono', defaultMic: 'Micrófono Predeterminado', addMic: 'Añadir Micrófono', removeMic: 'Eliminar', assignToPlayer: 'Asignar a Jugador', level: 'Nivel', gain: 'Ganancia', noiseSuppression: 'Supresión de Ruido', noiseSuppressionDesc: 'Reducir ruido de fondo', echoCancellation: 'Cancelación de Eco', echoCancellationDesc: 'Reducir retroalimentación de altavoces', test: 'Probar Micrófono', testing: 'Probando...', noMicsFound: 'No se encontraron micrófonos. Por favor conecta un micrófono y actualiza.', connected: 'Conectado', disconnected: 'Desconectado' },
  party: { title: 'Juegos de Fiesta', subtitle: '¡Elige un modo de juego para tu fiesta!', passTheMic: 'Pasa el Micrófono', passTheMicDesc: 'Toma turnos cantando partes de una canción. ¡Cuando la música para, el siguiente toma el micrófono!', companionSingalong: 'Cantando con Compañero', companionSingalongDesc: '¡Tu teléfono se ilumina aleatoriamente - esa es tu señal para cantar! Nadie sabe quién sigue hasta que parpadea!', medleyContest: 'Concurso de Popurrí', medleyContestDesc: 'Canta fragmentos cortos de múltiples canciones seguidas. ¿Cuántas puedes acertar?', missingWords: 'Palabras Faltantes', missingWordsDesc: '¡Algunas letras desaparecen! ¿Puedes cantar las palabras correctas en el momento correcto?', duelMode: 'Modo Duelo', duelModeDesc: 'Dos jugadores cantan la misma canción lado a lado. ¿Quién obtendrá más puntos?', blindKaraoke: 'Karaoke Ciego', blindKaraokeDesc: 'Las letras desaparecen en ciertas secciones. ¿Puedes recordar las palabras?', players: 'jugadores', selectPlayers: 'Seleccionar Jugadores', startGame: 'Empezar Juego', endGame: 'Terminar Juego', nextRound: 'Siguiente Ronda' },
  character: { title: 'Personajes', createCharacter: 'Crear Personaje', name: 'Nombre', country: 'País', avatar: 'Avatar', uploadPhoto: 'Subir Foto', create: 'Crear', edit: 'Editar', delete: 'Eliminar', active: 'Activo', selectAsActive: 'Seleccionar como Activo', noCharacters: 'Aún no hay personajes', noCharactersDesc: '¡Crea un personaje para seguir tus puntuaciones y progreso!' },
  queue: { title: 'Cola de Canciones', empty: 'La cola está vacía', emptyDesc: 'Añade canciones desde la biblioteca para empezar una cola', removeFromQueue: 'Eliminar de Cola', clearQueue: 'Limpiar Cola', upNext: 'Siguiente', nowPlaying: 'Reproduciendo', startQueue: 'Iniciar Cola' },
  highscore: { title: 'Puntuaciones', local: 'Local', global: 'Global', noScores: 'Aún no hay puntuaciones', noScoresDesc: '¡Juega algunas canciones para establecer tu primer récord!', rank: 'Rango', player: 'Jugador', song: 'Canción', score: 'Puntuación', date: 'Fecha', clearAll: 'Borrar Todas las Puntuaciones' },
  jukebox: { title: 'Modo Jukebox', subtitle: '¡Siéntate y disfruta la música!', songsInPlaylist: 'canciones en lista', searchPlaceholder: 'Buscar canciones, artistas, álbumes...', allGenres: 'Todos los Géneros', allArtists: 'Todos los Artistas', songsFound: 'canciones encontradas', startJukebox: 'Iniciar Jukebox', stopJukebox: 'Detener Jukebox', nowPlaying: 'REPRODUCIENDO', upNext: 'Siguiente', exitFullscreen: 'Salir de Pantalla Completa', hidePlaylist: 'Ocultar Lista', showPlaylist: 'Mostrar Lista', playlistSettings: 'Ajustes de Lista', customizeExperience: 'Personaliza tu experiencia musical', filterByGenre: 'Filtrar por Género', filterByArtist: 'Filtrar por Artista', shuffle: 'Aleatorio', repeat: 'Repetir', repeatNone: 'No Repetir', repeatAll: 'Repetir Todo', repeatOne: 'Repetir Uno' },
  mobile: { title: 'Integración Móvil', subtitle: 'Usa tu smartphone como micrófono o control remoto', yourLanIp: 'Tu Dirección IP LAN', port: 'Puerto', detecting: 'Detectando...', sameWifi: 'Asegúrate de que tu teléfono esté conectado a la misma red WiFi que esta computadora', scanToConnect: 'Escanear para Conectar', scanQrCode: 'Escanea este código QR con tu teléfono', detectingNetwork: 'Detectando dirección de red...', retryDetection: 'Reintentar Detección', connectedDevices: 'Dispositivos Conectados', noDevices: 'No hay dispositivos conectados', scanQrToConnect: 'Escanea el código QR para conectar tu teléfono', useAsMicrophone: 'Usar como Micrófono', useAsMicrophoneDesc: 'Tu teléfono se convierte en un micrófono inalámbrico de alta calidad', browseLibrary: 'Explorar Biblioteca', browseLibraryDesc: 'Navega canciones y añade a la cola desde tu teléfono', manageQueue: 'Gestionar Cola', manageQueueDesc: 'Ver y gestionar la cola de canciones de forma remota', howToConnect: 'Cómo Conectar', howToConnect1: 'Asegúrate de que tu teléfono esté conectado al mismo WiFi', howToConnect2: 'Abre la app de cámara de tu teléfono y apunta al código QR', howToConnect3: 'Toca la notificación para abrir el enlace', howToConnect4: 'Permite el acceso al micrófono cuando se solicite', howToConnect5: '¡Toca el botón de micrófono para empezar a cantar!' },
  achievements: { title: 'Logros', unlocked: 'Desbloqueado', locked: 'Bloqueado', progress: 'Progreso', noAchievements: 'Aún no hay logros', playToUnlock: '¡Juega canciones para desbloquear logros!', rarity: 'Rareza', common: 'Común', uncommon: 'Poco Común', rare: 'Raro', epic: 'Épico', legendary: 'Legendario' },
  daily: { title: 'Desafío Diario', todayChallenge: 'Desafío de Hoy', playChallenge: 'Jugar Desafío', alreadyCompleted: 'Ya completado hoy', comeBackTomorrow: '¡Vuelve mañana para un nuevo desafío!', streak: 'Racha de Días', bestStreak: 'Mejor Racha', rewards: 'Recompensas' },
  common: { loading: 'Cargando...', error: 'Error', success: 'Éxito', cancel: 'Cancelar', confirm: 'Confirmar', delete: 'Eliminar', edit: 'Editar', save: 'Guardar', back: 'Atrás', next: 'Siguiente', previous: 'Anterior', start: 'Inicio', stop: 'Detener', play: 'Reproducir', pause: 'Pausar', reset: 'Reiniciar', clear: 'Limpiar', all: 'Todo', none: 'Ninguno', yes: 'Sí', no: 'No', ok: 'OK', close: 'Cerrar', search: 'Buscar', filter: 'Filtrar', sort: 'Ordenar', refresh: 'Actualizar' },
};

// French translations
const frTranslations = {
  nav: { library: 'Bibliothèque', import: 'Importer', party: 'Fête', characters: 'Personnages', queue: 'File', highscores: 'Scores', jukebox: 'Jukebox', mobile: 'Mobile', achievements: 'Succès', daily: 'Quotidien', settings: 'Paramètres' },
  home: { title: 'Karaoke Successor', subtitle: 'L\'expérience karaoké ultime. Chantez avec détection de ton en temps réel, rivalisez avec des amis et profitez des jeux de fête!', startSinging: 'Commencer à Chanter', partyMode: 'Mode Fête', songsAvailable: 'Chansons Disponibles', charactersCreated: 'Personnages Créés', partyGames: 'Jeux de Fête', difficultyLevels: 'Niveaux de Difficulté', selectCharacter: 'Sélectionnez votre Personnage', createNew: 'Créer Nouveau' },
  library: { title: 'Bibliothèque Musicale', songsAvailable: 'chansons disponibles', loadingSongs: 'Chargement des chansons...', searchPlaceholder: 'Rechercher des chansons, artistes ou genres...', noSongs: 'Aucune chanson trouvée', noSongsDesc: 'Essayez d\'ajuster votre recherche ou vos filtres', selectSong: 'Sélectionnez une chanson pour commencer', selectSongDesc: 'Choisissez dans votre bibliothèque ou importez de nouvelles chansons', sortBy: 'Trier par', filterGenre: 'Genre', filterLanguage: 'Langue', allGenres: 'Tous les Genres', allLanguages: 'Toutes les Langues', gridView: 'Vue Grille', folderView: 'Vue Dossier', groupBy: 'Grouper par', groupNone: 'Aucun', groupArtist: 'Artiste', groupTitle: 'Titre', groupGenre: 'Genre', groupLanguage: 'Langue', groupFolder: 'Dossier' },
  song: { difficulty: 'Difficulté', easy: 'Facile', medium: 'Moyen', hard: 'Difficile', mode: 'Mode', singlePlayer: 'Un Joueur', duel: 'Duel', addToQueue: 'Ajouter à la File', startGame: 'Commencer le Jeu', highscores: 'Scores', duration: 'Durée', bpm: 'BPM', preview: 'Aperçu' },
  game: { back: 'Retour', sync: 'Sync', pts: 'pts', combo: 'combo', practiceMode: 'Mode Pratique', enablePractice: 'Activer le Mode Pratique', playbackSpeed: 'Vitesse de Lecture', pitchGuide: 'Guide de Ton', audioEffects: 'Effets Audio', reverb: 'Réverbération', echo: 'Écho', pause: 'Pause', resume: 'Reprendre', restart: 'Redémarrer', endSong: 'Terminer la Chanson', lyrics: 'Paroles', notes: 'Notes', score: 'Score' },
  results: { perfect: 'Parfait!', excellent: 'Excellent!', good: 'Bien!', okay: 'Okay!', poor: 'Médiocre', totalScore: 'Score Total', notesHit: 'Notes Réussies', notesMissed: 'Notes Manquées', bestCombo: 'Meilleur Combo', accuracy: 'Précision', playAgain: 'Rejouer', backToHome: 'Retour à l\'Accueil', shareScore: 'Partager le Score', scoreCard: 'Carte de Score', videoShort: 'Vidéo Courte', downloadCard: 'Télécharger la Carte', uploadingToLeaderboard: 'Téléchargement vers le classement mondial...', newHighscore: 'Nouveau Record!', rating: 'Note' },
  settings: { title: 'Paramètres', subtitle: 'Configurez votre expérience karaoké', tabLibrary: 'Bibliothèque', tabGeneral: 'Général', tabAbout: 'À Propos', library: 'Bibliothèque', general: 'Général', about: 'À Propos', songsFolder: 'Dossier des Chansons', songsFolderDesc: 'Entrez le chemin vers votre dossier de chansons', browse: 'Parcourir', save: 'Enregistrer', libraryStats: 'Statistiques de Bibliothèque', songsInLibrary: 'Chansons dans la Bibliothèque', highscoreEntries: 'Entrées de Score', dangerZone: 'Zone de Danger', resetLibrary: 'Réinitialiser la Bibliothèque', resetLibraryDesc: 'Supprimer toutes les chansons de la bibliothèque. Les scores seront préservés.', clearAll: 'Effacer Toutes les Données', clearAllDesc: 'Supprimer tout y compris les scores, profils et paramètres.', language: 'Langue', languageDesc: 'Choisissez votre langue préférée', languageNote: 'Les changements s\'appliquent immédiatement. Certains contenus peuvent nécessiter une actualisation.', themeSettings: 'Paramètres de Thème', themeSettingsDesc: 'Personnaliser l\'apparence visuelle', colorTheme: 'Thème de Couleur', lyricsStyle: 'Style des Paroles', backgroundVideo: 'Vidéo de Fond', backgroundVideoDesc: 'Afficher la vidéo de fond en chantant', audioSettings: 'Paramètres Audio', audioSettingsDesc: 'Configurer l\'entrée et la sortie audio', previewVolume: 'Volume d\'Aperçu Audio', previewVolumeDesc: 'Volume pour les aperçus de chansons dans la bibliothèque', micSensitivity: 'Sensibilité du Microphone', micSensitivityDesc: 'Ajuster la sensibilité d\'entrée du microphone', selectInputDevice: 'Sélectionner le Périphérique d\'Entrée', defaultMicrophone: 'Microphone par Défaut', microphoneGain: 'Gain du Microphone', noiseSuppression: 'Suppression du Bruit', noiseSuppressionDesc: 'Réduire le bruit de fond', echoCancellation: 'Annulation d\'Écho', echoCancellationDesc: 'Réduire la rétroaction des haut-parleurs', testMicrophone: 'Tester le Microphone', gameSettings: 'Paramètres de Jeu', gameSettingsDesc: 'Configurer les options de jeu', defaultDifficulty: 'Difficulté par Défaut', defaultDifficultyDesc: 'Difficulté de départ pour les nouvelles chansons', showPitchGuide: 'Afficher le Guide de Ton', showPitchGuideDesc: 'Afficher le guide de notes en chantant', keyboardShortcuts: 'Raccourcis Clavier', keyboardShortcutsDesc: 'Raccourcis de navigation rapide', searchShortcut: 'Rechercher', fullscreenShortcut: 'Plein Écran', libraryShortcut: 'Bibliothèque', settingsShortcut: 'Paramètres', closeShortcut: 'Fermer/Retour', searchAltShortcut: 'Rechercher (Alt)', technologyStack: 'Stack Technologique', framework: 'Framework', uiLibrary: 'Bibliothèque UI', stateManagement: 'Gestion d\'État', styling: 'Style', onlineLeaderboard: 'Classement en Ligne', onlineLeaderboardDesc: 'Se connecter aux scores mondiaux', testConnection: 'Tester la Connexion', installApp: 'Installer l\'App', installAppDesc: 'Installer pour un accès hors ligne', appInstalled: 'L\'app est installée', version: 'Version', aboutDesc: 'Karaoke Successor est une application karaoké moderne avec détection de ton en temps réel, modes de fête et plus.', feature1: 'Détection de ton en temps réel avec l\'algorithme YIN', feature2: 'Plusieurs modes de jeux de fête', feature3: 'Intégration d\'application mobile pour contrôle à distance', feature4: 'Importez vos propres chansons au format UltraStar' },
  mic: { title: 'Paramètres du Microphone', multiMic: 'Mode Multi-Microphones', multiMicDesc: 'Utiliser plusieurs microphones simultanément pour les duos ou le chant de groupe', selectDevice: 'Sélectionner le Microphone', defaultMic: 'Microphone par Défaut', addMic: 'Ajouter un Microphone', removeMic: 'Supprimer', assignToPlayer: 'Assigner au Joueur', level: 'Niveau', gain: 'Gain', noiseSuppression: 'Suppression du Bruit', noiseSuppressionDesc: 'Réduire le bruit de fond', echoCancellation: 'Annulation d\'Écho', echoCancellationDesc: 'Réduire la rétroaction des haut-parleurs', test: 'Tester le Microphone', testing: 'Test en cours...', noMicsFound: 'Aucun microphone trouvé. Veuillez connecter un microphone et actualiser.', connected: 'Connecté', disconnected: 'Déconnecté' },
  party: { title: 'Jeux de Fête', subtitle: 'Choisissez un mode de jeu pour votre fête!', passTheMic: 'Passe le Micro', passTheMicDesc: 'Chantez à tour de rôle des parties d\'une chanson. Quand la musique s\'arrête, le suivant prend le relais!', companionSingalong: 'Chant Compagnon', companionSingalongDesc: 'Votre téléphone s\'allume aléatoirement - c\'est votre signal pour chanter! Personne ne sait qui suit jusqu\'au clignotement!', medleyContest: 'Concours Medley', medleyContestDesc: 'Chantez de courts extraits de plusieurs chansons à la suite. Combien pouvez-vous en réussir?', missingWords: 'Mots Manquants', missingWordsDesc: 'Certaines paroles disparaissent! Pouvez-vous chanter les bons mots au bon moment?', duelMode: 'Mode Duel', duelModeDesc: 'Deux joueurs chantent la même chanson côte à côte. Qui aura le meilleur score?', blindKaraoke: 'Karaoké Aveugle', blindKaraokeDesc: 'Les paroles disparaissent dans certaines sections. Pouvez-vous vous souvenir des mots?', players: 'joueurs', selectPlayers: 'Sélectionner les Joueurs', startGame: 'Commencer le Jeu', endGame: 'Terminer le Jeu', nextRound: 'Tour Suivant' },
  character: { title: 'Personnages', createCharacter: 'Créer un Personnage', name: 'Nom', country: 'Pays', avatar: 'Avatar', uploadPhoto: 'Télécharger une Photo', create: 'Créer', edit: 'Modifier', delete: 'Supprimer', active: 'Actif', selectAsActive: 'Sélectionner comme Actif', noCharacters: 'Pas encore de personnages', noCharactersDesc: 'Créez un personnage pour suivre vos scores et votre progression!' },
  queue: { title: 'File de Chansons', empty: 'La file est vide', emptyDesc: 'Ajoutez des chansons depuis la bibliothèque pour commencer une file', removeFromQueue: 'Retirer de la File', clearQueue: 'Vider la File', upNext: 'Suivant', nowPlaying: 'En Cours', startQueue: 'Démarrer la File' },
  highscore: { title: 'Scores', local: 'Local', global: 'Mondial', noScores: 'Pas encore de scores', noScoresDesc: 'Jouez quelques chansons pour établir votre premier record!', rank: 'Rang', player: 'Joueur', song: 'Chanson', score: 'Score', date: 'Date', clearAll: 'Effacer Tous les Scores' },
  jukebox: { title: 'Mode Jukebox', subtitle: 'Asseyez-vous et profitez de la musique!', songsInPlaylist: 'chansons dans la liste', searchPlaceholder: 'Rechercher des chansons, artistes, albums...', allGenres: 'Tous les Genres', allArtists: 'Tous les Artistes', songsFound: 'chansons trouvées', startJukebox: 'Démarrer le Jukebox', stopJukebox: 'Arrêter le Jukebox', nowPlaying: 'EN COURS', upNext: 'Suivant', exitFullscreen: 'Quitter le Plein Écran', hidePlaylist: 'Masquer la Liste', showPlaylist: 'Afficher la Liste', playlistSettings: 'Paramètres de Liste', customizeExperience: 'Personnalisez votre expérience musicale', filterByGenre: 'Filtrer par Genre', filterByArtist: 'Filtrer par Artiste', shuffle: 'Aléatoire', repeat: 'Répéter', repeatNone: 'Ne Pas Répéter', repeatAll: 'Répéter Tout', repeatOne: 'Répéter Un' },
  mobile: { title: 'Intégration Mobile', subtitle: 'Utilisez votre smartphone comme microphone ou télécommande', yourLanIp: 'Votre Adresse IP LAN', port: 'Port', detecting: 'Détection...', sameWifi: 'Assurez-vous que votre téléphone est connecté au même réseau WiFi que cet ordinateur', scanToConnect: 'Scanner pour Connecter', scanQrCode: 'Scannez ce code QR avec votre téléphone', detectingNetwork: 'Détection de l\'adresse réseau...', retryDetection: 'Réessayer la Détection', connectedDevices: 'Appareils Connectés', noDevices: 'Aucun appareil connecté', scanQrToConnect: 'Scannez le code QR pour connecter votre téléphone', useAsMicrophone: 'Utiliser comme Microphone', useAsMicrophoneDesc: 'Votre téléphone devient un microphone sans fil de haute qualité', browseLibrary: 'Parcourir la Bibliothèque', browseLibraryDesc: 'Parcourir les chansons et ajouter à la file depuis votre téléphone', manageQueue: 'Gérer la File', manageQueueDesc: 'Voir et gérer la file de chansons à distance', howToConnect: 'Comment Connecter', howToConnect1: 'Assurez-vous que votre téléphone est connecté au même WiFi', howToConnect2: 'Ouvrez l\'appareil photo de votre téléphone et pointez-le vers le code QR', howToConnect3: 'Touchez la notification pour ouvrir le lien', howToConnect4: 'Autorisez l\'accès au microphone lorsque demandé', howToConnect5: 'Touchez le bouton microphone pour commencer à chanter!' },
  achievements: { title: 'Succès', unlocked: 'Débloqué', locked: 'Verrouillé', progress: 'Progression', noAchievements: 'Pas encore de succès', playToUnlock: 'Jouez des chansons pour débloquer des succès!', rarity: 'Rareté', common: 'Commun', uncommon: 'Peu Commun', rare: 'Rare', epic: 'Épique', legendary: 'Légendaire' },
  daily: { title: 'Défi Quotidien', todayChallenge: 'Défi du Jour', playChallenge: 'Jouer le Défi', alreadyCompleted: 'Déjà complété aujourd\'hui', comeBackTomorrow: 'Revenez demain pour un nouveau défi!', streak: 'Série de Jours', bestStreak: 'Meilleure Série', rewards: 'Récompenses' },
  common: { loading: 'Chargement...', error: 'Erreur', success: 'Succès', cancel: 'Annuler', confirm: 'Confirmer', delete: 'Supprimer', edit: 'Modifier', save: 'Enregistrer', back: 'Retour', next: 'Suivant', previous: 'Précédent', start: 'Démarrer', stop: 'Arrêter', play: 'Jouer', pause: 'Pause', reset: 'Réinitialiser', clear: 'Effacer', all: 'Tout', none: 'Aucun', yes: 'Oui', no: 'Non', ok: 'OK', close: 'Fermer', search: 'Rechercher', filter: 'Filtrer', sort: 'Trier', refresh: 'Actualiser' },
};

// Italian translations
const itTranslations = {
  nav: { library: 'Libreria', import: 'Importa', party: 'Festa', characters: 'Personaggi', queue: 'Coda', highscores: 'Punteggi', jukebox: 'Jukebox', mobile: 'Mobile', achievements: 'Obiettivi', daily: 'Giornaliero', settings: 'Impostazioni' },
  home: { title: 'Karaoke Successor', subtitle: 'L\'esperienza karaoke definitiva. Canta con rilevamento del tono in tempo reale, competi con gli amici e divertiti con i giochi di festa!', startSinging: 'Inizia a Cantare', partyMode: 'Modalità Festa', songsAvailable: 'Canzoni Disponibili', charactersCreated: 'Personaggi Creati', partyGames: 'Giochi di Festa', difficultyLevels: 'Livelli di Difficoltà', selectCharacter: 'Seleziona il tuo Personaggio', createNew: 'Crea Nuovo' },
  library: { title: 'Libreria Musicale', songsAvailable: 'canzoni disponibili', loadingSongs: 'Caricamento canzoni...', searchPlaceholder: 'Cerca canzoni, artisti o generi...', noSongs: 'Nessuna canzone trovata', noSongsDesc: 'Prova ad ajustare la ricerca o i filtri', selectSong: 'Seleziona una canzone per iniziare', selectSongDesc: 'Scegli dalla tua libreria o importa nuove canzoni', sortBy: 'Ordina per', filterGenre: 'Genere', filterLanguage: 'Lingua', allGenres: 'Tutti i Generi', allLanguages: 'Tutte le Lingue', gridView: 'Vista Griglia', folderView: 'Vista Cartella', groupBy: 'Raggruppa per', groupNone: 'Nessuno', groupArtist: 'Artista', groupTitle: 'Titolo', groupGenre: 'Genere', groupLanguage: 'Lingua', groupFolder: 'Cartella' },
  song: { difficulty: 'Difficoltà', easy: 'Facile', medium: 'Medio', hard: 'Difficile', mode: 'Modalità', singlePlayer: 'Giocatore Singolo', duel: 'Duello', addToQueue: 'Aggiungi alla Coda', startGame: 'Inizia Gioco', highscores: 'Punteggi', duration: 'Durata', bpm: 'BPM', preview: 'Anteprima' },
  game: { back: 'Indietro', sync: 'Sync', pts: 'ptt', combo: 'combo', practiceMode: 'Modalità Pratica', enablePractice: 'Attiva Modalità Pratica', playbackSpeed: 'Velocità Riproduzione', pitchGuide: 'Guida Tono', audioEffects: 'Effetti Audio', reverb: 'Riverbero', echo: 'Eco', pause: 'Pausa', resume: 'Riprendi', restart: 'Riavvia', endSong: 'Termina Canzone', lyrics: 'Testo', notes: 'Note', score: 'Punteggio' },
  results: { perfect: 'Perfetto!', excellent: 'Eccellente!', good: 'Bene!', okay: 'Okay!', poor: 'Scarso', totalScore: 'Punteggio Totale', notesHit: 'Note Prese', notesMissed: 'Note Mancate', bestCombo: 'Miglior Combo', accuracy: 'Precisione', playAgain: 'Gioca Ancora', backToHome: 'Torna alla Home', shareScore: 'Condividi Punteggio', scoreCard: 'Scheda Punteggio', videoShort: 'Video Breve', downloadCard: 'Scarica Scheda', uploadingToLeaderboard: 'Caricamento nella classifica globale...', newHighscore: 'Nuovo Record!', rating: 'Valutazione' },
  settings: { title: 'Impostazioni', subtitle: 'Configura la tua esperienza karaoke', tabLibrary: 'Libreria', tabGeneral: 'Generale', tabAbout: 'Informazioni', library: 'Libreria', general: 'Generale', about: 'Informazioni', songsFolder: 'Cartella Canzoni', songsFolderDesc: 'Inserisci il percorso della tua cartella canzoni', browse: 'Sfoglia', save: 'Salva', libraryStats: 'Statistiche Libreria', songsInLibrary: 'Canzoni nella Libreria', highscoreEntries: 'Voci Punteggio', dangerZone: 'Zona Pericolosa', resetLibrary: 'Reimposta Libreria', resetLibraryDesc: 'Rimuovi tutte le canzoni dalla libreria. I punteggi saranno preservati.', clearAll: 'Cancella Tutti i Dati', clearAllDesc: 'Elimina tutto inclusi punteggi, profili e impostazioni.', language: 'Lingua', languageDesc: 'Scegli la tua lingua preferita', languageNote: 'Le modifiche si applicano immediatamente. Alcuni contenuti potrebbero necessitare aggiornamento.', themeSettings: 'Impostazioni Tema', themeSettingsDesc: 'Personalizza l\'aspetto visivo', colorTheme: 'Tema Colore', lyricsStyle: 'Stile Testo', backgroundVideo: 'Video di Sfondo', backgroundVideoDesc: 'Mostra video di sfondo mentre canti', audioSettings: 'Impostazioni Audio', audioSettingsDesc: 'Configura input e output audio', previewVolume: 'Volume Anteprima Audio', previewVolumeDesc: 'Volume per le anteprime delle canzoni nella libreria', micSensitivity: 'Sensibilità Microfono', micSensitivityDesc: 'Regola la sensibilità di input del microfono', selectInputDevice: 'Seleziona Dispositivo di Input', defaultMicrophone: 'Microfono Predefinito', microphoneGain: 'Guadagno Microfono', noiseSuppression: 'Soppressione Rumore', noiseSuppressionDesc: 'Riduci il rumore di fondo', echoCancellation: 'Cancellazione Eco', echoCancellationDesc: 'Riduci il feedback degli altoparlanti', testMicrophone: 'Testa Microfono', gameSettings: 'Impostazioni Gioco', gameSettingsDesc: 'Configura opzioni di gioco', defaultDifficulty: 'Difficoltà Predefinita', defaultDifficultyDesc: 'Difficoltà iniziale per le nuove canzoni', showPitchGuide: 'Mostra Guida Tono', showPitchGuideDesc: 'Mostra guida note mentre canti', keyboardShortcuts: 'Scorciatoie Tastiera', keyboardShortcutsDesc: 'Scorciatoie di navigazione rapida', searchShortcut: 'Cerca', fullscreenShortcut: 'Schermo Intero', libraryShortcut: 'Libreria', settingsShortcut: 'Impostazioni', closeShortcut: 'Chiudi/Indietro', searchAltShortcut: 'Cerca (Alt)', technologyStack: 'Stack Tecnologico', framework: 'Framework', uiLibrary: 'Libreria UI', stateManagement: 'Gestione Stato', styling: 'Stile', onlineLeaderboard: 'Classifica Online', onlineLeaderboardDesc: 'Connetti ai punteggi globali', testConnection: 'Testa Connessione', installApp: 'Installa App', installAppDesc: 'Installa per accesso offline', appInstalled: 'L\'app è installata', version: 'Versione', aboutDesc: 'Karaoke Successor è un\'applicazione karaoke moderna con rilevamento del tono in tempo reale, modalità festa e altro.', feature1: 'Rilevamento del tono in tempo reale con algoritmo YIN', feature2: 'Diverse modalità di giochi di festa', feature3: 'Integrazione app mobile per controllo remoto', feature4: 'Importa le tue canzoni in formato UltraStar' },
  mic: { title: 'Impostazioni Microfono', multiMic: 'Modalità Multi-Microfono', multiMicDesc: 'Usa più microfoni contemporaneamente per duetti o canto di gruppo', selectDevice: 'Seleziona Microfono', defaultMic: 'Microfono Predefinito', addMic: 'Aggiungi Microfono', removeMic: 'Rimuovi', assignToPlayer: 'Assegna a Giocatore', level: 'Livello', gain: 'Guadagno', noiseSuppression: 'Soppressione Rumore', noiseSuppressionDesc: 'Riduci il rumore di fondo', echoCancellation: 'Cancellazione Eco', echoCancellationDesc: 'Riduci il feedback degli altoparlanti', test: 'Testa Microfono', testing: 'Test in corso...', noMicsFound: 'Nessun microfono trovato. Connetti un microfono e aggiorna.', connected: 'Connesso', disconnected: 'Disconnesso' },
  party: { title: 'Giochi di Festa', subtitle: 'Scegli una modalità di gioco per la tua festa!', passTheMic: 'Passa il Microfono', passTheMicDesc: 'Canta a turno parti di una canzone. Quando la musica si ferma, il prossimo prende il microfono!', companionSingalong: 'Cantare Insieme', companionSingalongDesc: 'Il tuo telefono si illumina casualmente - è il tuo momento di cantare! Nessuno sa chi è il prossimo finché non lampeggia!', medleyContest: 'Concorso Medley', medleyContestDesc: 'Canta brevi frammenti di più canzoni di fila. Quante ne puoi fare?', missingWords: 'Parole Mancanti', missingWordsDesc: 'Alcuni testi scompaiono! Riesci a cantare le parole giuste al momento giusto?', duelMode: 'Modalità Duello', duelModeDesc: 'Due giocatori cantano la stessa canzone fianco a fianco. Chi otterrà più punti?', blindKaraoke: 'Karaoke Cieco', blindKaraokeDesc: 'I testi scompaiono in certe sezioni. Ricordi le parole?', players: 'giocatori', selectPlayers: 'Seleziona Giocatori', startGame: 'Inizia Gioco', endGame: 'Termina Gioco', nextRound: 'Turno Successivo' },
  character: { title: 'Personaggi', createCharacter: 'Crea Personaggio', name: 'Nome', country: 'Paese', avatar: 'Avatar', uploadPhoto: 'Carica Foto', create: 'Crea', edit: 'Modifica', delete: 'Elimina', active: 'Attivo', selectAsActive: 'Seleziona come Attivo', noCharacters: 'Nessun personaggio ancora', noCharactersDesc: 'Crea un personaggio per tracciare i tuoi punteggi e progressi!' },
  queue: { title: 'Coda Canzoni', empty: 'La coda è vuota', emptyDesc: 'Aggiungi canzoni dalla libreria per iniziare una coda', removeFromQueue: 'Rimuovi dalla Coda', clearQueue: 'Svuota Coda', upNext: 'Prossimo', nowPlaying: 'In Riproduzione', startQueue: 'Avvia Coda' },
  highscore: { title: 'Punteggi', local: 'Locale', global: 'Globale', noScores: 'Nessun punteggio ancora', noScoresDesc: 'Gioca alcune canzoni per stabilire il tuo primo record!', rank: 'Posizione', player: 'Giocatore', song: 'Canzone', score: 'Punteggio', date: 'Data', clearAll: 'Cancella Tutti i Punteggi' },
  jukebox: { title: 'Modalità Jukebox', subtitle: 'Siediti e goditi la musica!', songsInPlaylist: 'canzoni nella playlist', searchPlaceholder: 'Cerca canzoni, artisti, album...', allGenres: 'Tutti i Generi', allArtists: 'Tutti gli Artisti', songsFound: 'canzoni trovate', startJukebox: 'Avvia Jukebox', stopJukebox: 'Ferma Jukebox', nowPlaying: 'IN RIPRODUZIONE', upNext: 'Prossimo', exitFullscreen: 'Esci da Schermo Intero', hidePlaylist: 'Nascondi Playlist', showPlaylist: 'Mostra Playlist', playlistSettings: 'Impostazioni Playlist', customizeExperience: 'Personalizza la tua esperienza musicale', filterByGenre: 'Filtra per Genere', filterByArtist: 'Filtra per Artista', shuffle: 'Casuale', repeat: 'Ripeti', repeatNone: 'Non Ripetere', repeatAll: 'Ripeti Tutto', repeatOne: 'Ripeti Uno' },
  mobile: { title: 'Integrazione Mobile', subtitle: 'Usa il tuo smartphone come microfono o telecomando', yourLanIp: 'Il tuo Indirizzo IP LAN', port: 'Porta', detecting: 'Rilevamento...', sameWifi: 'Assicurati che il tuo telefono sia connesso alla stessa rete WiFi di questo computer', scanToConnect: 'Scansiona per Connettere', scanQrCode: 'Scansiona questo codice QR con il tuo telefono', detectingNetwork: 'Rilevamento indirizzo di rete...', retryDetection: 'Riprova Rilevamento', connectedDevices: 'Dispositivi Connessi', noDevices: 'Nessun dispositivo connesso', scanQrToConnect: 'Scansiona il codice QR per connettere il tuo telefono', useAsMicrophone: 'Usa come Microfono', useAsMicrophoneDesc: 'Il tuo telefono diventa un microfono wireless di alta qualità', browseLibrary: 'Sfoglia Libreria', browseLibraryDesc: 'Sfoglia canzoni e aggiungi alla coda dal tuo telefono', manageQueue: 'Gestisci Coda', manageQueueDesc: 'Visualizza e gestisci la coda delle canzoni da remoto', howToConnect: 'Come Connettere', howToConnect1: 'Assicurati che il tuo telefono sia connesso allo stesso WiFi', howToConnect2: 'Apri l\'app fotocamera del tuo telefono e puntala verso il codice QR', howToConnect3: 'Tocca la notifica per aprire il link', howToConnect4: 'Concedi il permesso del microfono quando richiesto', howToConnect5: 'Tocca il pulsante microfono per iniziare a cantare!' },
  achievements: { title: 'Obiettivi', unlocked: 'Sbloccato', locked: 'Bloccato', progress: 'Progresso', noAchievements: 'Nessun obiettivo ancora', playToUnlock: 'Gioca canzoni per sbloccare obiettivi!', rarity: 'Rarità', common: 'Comune', uncommon: 'Non Comune', rare: 'Raro', epic: 'Epico', legendary: 'Leggendario' },
  daily: { title: 'Sfida Giornaliera', todayChallenge: 'Sfida di Oggi', playChallenge: 'Gioca Sfida', alreadyCompleted: 'Già completato oggi', comeBackTomorrow: 'Torna domani per una nuova sfida!', streak: 'Serie di Giorni', bestStreak: 'Miglior Serie', rewards: 'Ricompense' },
  common: { loading: 'Caricamento...', error: 'Errore', success: 'Successo', cancel: 'Annulla', confirm: 'Conferma', delete: 'Elimina', edit: 'Modifica', save: 'Salva', back: 'Indietro', next: 'Avanti', previous: 'Indietro', start: 'Inizia', stop: 'Ferma', play: 'Riproduci', pause: 'Pausa', reset: 'Reimposta', clear: 'Cancella', all: 'Tutto', none: 'Nessuno', yes: 'Sì', no: 'No', ok: 'OK', close: 'Chiudi', search: 'Cerca', filter: 'Filtra', sort: 'Ordina', refresh: 'Aggiorna' },
};

// Portuguese translations
const ptTranslations = {
  nav: { library: 'Biblioteca', import: 'Importar', party: 'Festa', characters: 'Personagens', queue: 'Fila', highscores: 'Pontuações', jukebox: 'Jukebox', mobile: 'Mobile', achievements: 'Conquistas', daily: 'Diário', settings: 'Configurações' },
  home: { title: 'Karaoke Successor', subtitle: 'A experiência de karaokê definitiva. Cante com detecção de tom em tempo real, compita com amigos e aproveite os jogos de festa!', startSinging: 'Começar a Cantar', partyMode: 'Modo Festa', songsAvailable: 'Músicas Disponíveis', charactersCreated: 'Personagens Criados', partyGames: 'Jogos de Festa', difficultyLevels: 'Níveis de Dificuldade', selectCharacter: 'Selecione seu Personagem', createNew: 'Criar Novo' },
  library: { title: 'Biblioteca Musical', songsAvailable: 'músicas disponíveis', loadingSongs: 'Carregando músicas...', searchPlaceholder: 'Buscar músicas, artistas ou gêneros...', noSongs: 'Nenhuma música encontrada', noSongsDesc: 'Tente ajustar sua busca ou filtros', selectSong: 'Selecione uma música para começar', selectSongDesc: 'Escolha da sua biblioteca ou importe novas músicas', sortBy: 'Ordenar por', filterGenre: 'Gênero', filterLanguage: 'Idioma', allGenres: 'Todos os Gêneros', allLanguages: 'Todos os Idiomas', gridView: 'Visualização em Grade', folderView: 'Visualização de Pasta', groupBy: 'Agrupar por', groupNone: 'Nenhum', groupArtist: 'Artista', groupTitle: 'Título', groupGenre: 'Gênero', groupLanguage: 'Idioma', groupFolder: 'Pasta' },
  song: { difficulty: 'Dificuldade', easy: 'Fácil', medium: 'Médio', hard: 'Difícil', mode: 'Modo', singlePlayer: 'Um Jogador', duel: 'Duelo', addToQueue: 'Adicionar à Fila', startGame: 'Iniciar Jogo', highscores: 'Pontuações', duration: 'Duração', bpm: 'BPM', preview: 'Prévia' },
  game: { back: 'Voltar', sync: 'Sinc', pts: 'pts', combo: 'combo', practiceMode: 'Modo Prática', enablePractice: 'Ativar Modo Prática', playbackSpeed: 'Velocidade de Reprodução', pitchGuide: 'Guia de Tom', audioEffects: 'Efeitos de Áudio', reverb: 'Reverberação', echo: 'Eco', pause: 'Pausar', resume: 'Retomar', restart: 'Reiniciar', endSong: 'Terminar Música', lyrics: 'Letras', notes: 'Notas', score: 'Pontuação' },
  results: { perfect: 'Perfeito!', excellent: 'Excelente!', good: 'Bom!', okay: 'Ok!', poor: 'Ruim', totalScore: 'Pontuação Total', notesHit: 'Notas Acertadas', notesMissed: 'Notas Erradas', bestCombo: 'Melhor Combo', accuracy: 'Precisão', playAgain: 'Jogar Novamente', backToHome: 'Voltar ao Início', shareScore: 'Compartilhar Pontuação', scoreCard: 'Cartão de Pontuação', videoShort: 'Vídeo Curto', downloadCard: 'Baixar Cartão', uploadingToLeaderboard: 'Enviando para o ranking global...', newHighscore: 'Novo Recorde!', rating: 'Avaliação' },
  settings: { title: 'Configurações', subtitle: 'Configure sua experiência de karaokê', tabLibrary: 'Biblioteca', tabGeneral: 'Geral', tabAbout: 'Sobre', library: 'Biblioteca', general: 'Geral', about: 'Sobre', songsFolder: 'Pasta de Músicas', songsFolderDesc: 'Digite o caminho para sua pasta de músicas', browse: 'Procurar', save: 'Salvar', libraryStats: 'Estatísticas da Biblioteca', songsInLibrary: 'Músicas na Biblioteca', highscoreEntries: 'Entradas de Pontuação', dangerZone: 'Zona de Perigo', resetLibrary: 'Reiniciar Biblioteca', resetLibraryDesc: 'Remover todas as músicas da biblioteca. As pontuações serão preservadas.', clearAll: 'Limpar Todos os Dados', clearAllDesc: 'Excluir tudo incluindo pontuações, perfis e configurações.', language: 'Idioma', languageDesc: 'Escolha seu idioma preferido', languageNote: 'As alterações se aplicam imediatamente. Alguns conteúdos podem precisar de atualização.', themeSettings: 'Configurações de Tema', themeSettingsDesc: 'Personalize a aparência visual', colorTheme: 'Tema de Cores', lyricsStyle: 'Estilo de Letras', backgroundVideo: 'Vídeo de Fundo', backgroundVideoDesc: 'Mostrar vídeo de fundo enquanto canta', audioSettings: 'Configurações de Áudio', audioSettingsDesc: 'Configurar entrada e saída de áudio', previewVolume: 'Volume de Prévia de Áudio', previewVolumeDesc: 'Volume para prévias de músicas na biblioteca', micSensitivity: 'Sensibilidade do Microfone', micSensitivityDesc: 'Ajustar sensibilidade de entrada do microfone', selectInputDevice: 'Selecionar Dispositivo de Entrada', defaultMicrophone: 'Microfone Padrão', microphoneGain: 'Ganho do Microfone', noiseSuppression: 'Supressão de Ruído', noiseSuppressionDesc: 'Reduzir ruído de fundo', echoCancellation: 'Cancelamento de Eco', echoCancellationDesc: 'Reduzir feedback dos alto-falantes', testMicrophone: 'Testar Microfone', gameSettings: 'Configurações de Jogo', gameSettingsDesc: 'Configurar opções de jogo', defaultDifficulty: 'Dificuldade Padrão', defaultDifficultyDesc: 'Dificuldade inicial para novas músicas', showPitchGuide: 'Mostrar Guia de Tom', showPitchGuideDesc: 'Mostrar guia de notas enquanto canta', keyboardShortcuts: 'Atalhos de Teclado', keyboardShortcutsDesc: 'Atalhos de navegação rápida', searchShortcut: 'Buscar', fullscreenShortcut: 'Tela Cheia', libraryShortcut: 'Biblioteca', settingsShortcut: 'Configurações', closeShortcut: 'Fechar/Voltar', searchAltShortcut: 'Buscar (Alt)', technologyStack: 'Stack Tecnológico', framework: 'Framework', uiLibrary: 'Biblioteca UI', stateManagement: 'Gerenciamento de Estado', styling: 'Estilo', onlineLeaderboard: 'Ranking Online', onlineLeaderboardDesc: 'Conectar com pontuações globais', testConnection: 'Testar Conexão', installApp: 'Instalar App', installAppDesc: 'Instalar para acesso offline', appInstalled: 'App está instalado', version: 'Versão', aboutDesc: 'Karaoke Successor é um aplicativo de karaokê moderno com detecção de tom em tempo real, modos de festa e mais.', feature1: 'Detecção de tom em tempo real com algoritmo YIN', feature2: 'Vários modos de jogos de festa', feature3: 'Integração de app mobile para controle remoto', feature4: 'Importe suas próprias músicas no formato UltraStar' },
  mic: { title: 'Configurações de Microfone', multiMic: 'Modo Multi-Microfone', multiMicDesc: 'Usar múltiplos microfones simultaneamente para duetos ou canto em grupo', selectDevice: 'Selecionar Microfone', defaultMic: 'Microfone Padrão', addMic: 'Adicionar Microfone', removeMic: 'Remover', assignToPlayer: 'Atribuir ao Jogador', level: 'Nível', gain: 'Ganho', noiseSuppression: 'Supressão de Ruído', noiseSuppressionDesc: 'Reduzir ruído de fundo', echoCancellation: 'Cancelamento de Eco', echoCancellationDesc: 'Reduzir feedback dos alto-falantes', test: 'Testar Microfone', testing: 'Testando...', noMicsFound: 'Nenhum microfone encontrado. Conecte um microfone e atualize.', connected: 'Conectado', disconnected: 'Desconectado' },
  party: { title: 'Jogos de Festa', subtitle: 'Escolha um modo de jogo para sua festa!', passTheMic: 'Passe o Microfone', passTheMicDesc: 'Cante partes de uma música por vez. Quando a música para, o próximo pega o microfone!', companionSingalong: 'Cantar Juntos', companionSingalongDesc: 'Seu telefone acende aleatoriamente - é sua vez de cantar! Ninguém sabe quem é o próximo até piscar!', medleyContest: 'Concurso de Medley', medleyContestDesc: 'Cante trechos curtos de várias músicas seguidas. Quantas consegue acertar?', missingWords: 'Palavras Faltando', missingWordsDesc: 'Algumas letras desaparecem! Consegue cantar as palavras certas no momento certo?', duelMode: 'Modo Duelo', duelModeDesc: 'Dois jogadores cantam a mesma música lado a lado. Quem vai pontuar mais?', blindKaraoke: 'Karaokê Cego', blindKaraokeDesc: 'As letras desaparecem em certas seções. Lembra das palavras?', players: 'jogadores', selectPlayers: 'Selecionar Jogadores', startGame: 'Iniciar Jogo', endGame: 'Terminar Jogo', nextRound: 'Próxima Rodada' },
  character: { title: 'Personagens', createCharacter: 'Criar Personagem', name: 'Nome', country: 'País', avatar: 'Avatar', uploadPhoto: 'Enviar Foto', create: 'Criar', edit: 'Editar', delete: 'Excluir', active: 'Ativo', selectAsActive: 'Selecionar como Ativo', noCharacters: 'Nenhum personagem ainda', noCharactersDesc: 'Crie um personagem para acompanhar suas pontuações e progresso!' },
  queue: { title: 'Fila de Músicas', empty: 'A fila está vazia', emptyDesc: 'Adicione músicas da biblioteca para iniciar uma fila', removeFromQueue: 'Remover da Fila', clearQueue: 'Limpar Fila', upNext: 'Próximo', nowPlaying: 'Tocando Agora', startQueue: 'Iniciar Fila' },
  highscore: { title: 'Pontuações', local: 'Local', global: 'Global', noScores: 'Nenhuma pontuação ainda', noScoresDesc: 'Jogue algumas músicas para estabelecer seu primeiro recorde!', rank: 'Posição', player: 'Jogador', song: 'Música', score: 'Pontuação', date: 'Data', clearAll: 'Limpar Todas as Pontuações' },
  jukebox: { title: 'Modo Jukebox', subtitle: 'Sente-se e aproveite a música!', songsInPlaylist: 'músicas na playlist', searchPlaceholder: 'Buscar músicas, artistas, álbuns...', allGenres: 'Todos os Gêneros', allArtists: 'Todos os Artistas', songsFound: 'músicas encontradas', startJukebox: 'Iniciar Jukebox', stopJukebox: 'Parar Jukebox', nowPlaying: 'TOCANDO AGORA', upNext: 'Próximo', exitFullscreen: 'Sair da Tela Cheia', hidePlaylist: 'Ocultar Playlist', showPlaylist: 'Mostrar Playlist', playlistSettings: 'Configurações da Playlist', customizeExperience: 'Personalize sua experiência musical', filterByGenre: 'Filtrar por Gênero', filterByArtist: 'Filtrar por Artista', shuffle: 'Aleatório', repeat: 'Repetir', repeatNone: 'Não Repetir', repeatAll: 'Repetir Tudo', repeatOne: 'Repetir Uma' },
  mobile: { title: 'Integração Mobile', subtitle: 'Use seu smartphone como microfone ou controle remoto', yourLanIp: 'Seu Endereço IP LAN', port: 'Porta', detecting: 'Detectando...', sameWifi: 'Certifique-se de que seu telefone esteja conectado à mesma rede WiFi que este computador', scanToConnect: 'Escanear para Conectar', scanQrCode: 'Escaneie este código QR com seu telefone', detectingNetwork: 'Detectando endereço de rede...', retryDetection: 'Tentar Detecção Novamente', connectedDevices: 'Dispositivos Conectados', noDevices: 'Nenhum dispositivo conectado', scanQrToConnect: 'Escaneie o código QR para conectar seu telefone', useAsMicrophone: 'Usar como Microfone', useAsMicrophoneDesc: 'Seu telefone se torna um microfone sem fio de alta qualidade', browseLibrary: 'Navegar na Biblioteca', browseLibraryDesc: 'Navegue músicas e adicione à fila do seu telefone', manageQueue: 'Gerenciar Fila', manageQueueDesc: 'Veja e gerencie a fila de músicas remotamente', howToConnect: 'Como Conectar', howToConnect1: 'Certifique-se de que seu telefone está conectado ao mesmo WiFi', howToConnect2: 'Abra o app de câmera do seu telefone e aponte para o código QR', howToConnect3: 'Toque na notificação para abrir o link', howToConnect4: 'Permita o acesso ao microfone quando solicitado', howToConnect5: 'Toque no botão de microfone para começar a cantar!' },
  achievements: { title: 'Conquistas', unlocked: 'Desbloqueado', locked: 'Bloqueado', progress: 'Progresso', noAchievements: 'Nenhuma conquista ainda', playToUnlock: 'Jogue músicas para desbloquear conquistas!', rarity: 'Raridade', common: 'Comum', uncommon: 'Incomum', rare: 'Raro', epic: 'Épico', legendary: 'Lendário' },
  daily: { title: 'Desafio Diário', todayChallenge: 'Desafio de Hoje', playChallenge: 'Jogar Desafio', alreadyCompleted: 'Já completado hoje', comeBackTomorrow: 'Volte amanhã para um novo desafio!', streak: 'Sequência de Dias', bestStreak: 'Melhor Sequência', rewards: 'Recompensas' },
  common: { loading: 'Carregando...', error: 'Erro', success: 'Sucesso', cancel: 'Cancelar', confirm: 'Confirmar', delete: 'Excluir', edit: 'Editar', save: 'Salvar', back: 'Voltar', next: 'Próximo', previous: 'Anterior', start: 'Iniciar', stop: 'Parar', play: 'Reproduzir', pause: 'Pausar', reset: 'Reiniciar', clear: 'Limpar', all: 'Tudo', none: 'Nenhum', yes: 'Sim', no: 'Não', ok: 'OK', close: 'Fechar', search: 'Buscar', filter: 'Filtrar', sort: 'Ordenar', refresh: 'Atualizar' },
};

// Japanese, Korean, Chinese, Russian and other translations (abbreviated for space)
// These will use English fallback for missing keys
const jaTranslations = { nav: { library: 'ライブラリ', import: 'インポート', party: 'パーティー', characters: 'キャラクター', queue: 'キュー', highscores: 'ハイスコア', jukebox: 'ジュークボックス', mobile: 'モバイル', achievements: '実績', daily: 'デイリー', settings: '設定' }, home: { title: 'Karaoke Successor', subtitle: '究極のカラオケ体験。リアルタイム音程検出で歌い、友人と競い、パーティーゲームを楽しもう！', startSinging: '歌い始める', partyMode: 'パーティーモード', songsAvailable: '曲数', charactersCreated: 'キャラクター作成数', partyGames: 'パーティーゲーム', difficultyLevels: '難易度レベル', selectCharacter: 'キャラクターを選択', createNew: '新規作成' }, common: { loading: '読み込み中...', error: 'エラー', success: '成功', cancel: 'キャンセル', confirm: '確認', delete: '削除', edit: '編集', save: '保存', back: '戻る', next: '次へ', previous: '前へ', start: '開始', stop: '停止', play: '再生', pause: '一時停止', reset: 'リセット', clear: 'クリア', all: 'すべて', none: 'なし', yes: 'はい', no: 'いいえ', ok: 'OK', close: '閉じる', search: '検索', filter: 'フィルター', sort: '並べ替え', refresh: '更新' } };

const koTranslations = { nav: { library: '라이브러리', import: '가져오기', party: '파티', characters: '캐릭터', queue: '대기열', highscores: '최고 점수', jukebox: '주크박스', mobile: '모바일', achievements: '업적', daily: '일일', settings: '설정' }, home: { title: 'Karaoke Successor', subtitle: '최고의 노래방 경험. 실시간 음정 감지로 노래하고 친구들과 경쟁하며 파티 게임을 즐기세요!', startSinging: '노래 시작', partyMode: '파티 모드', songsAvailable: '사용 가능한 노래', charactersCreated: '생성된 캐릭터', partyGames: '파티 게임', difficultyLevels: '난이도 레벨', selectCharacter: '캐릭터 선택', createNew: '새로 만들기' }, common: { loading: '로딩 중...', error: '오류', success: '성공', cancel: '취소', confirm: '확인', delete: '삭제', edit: '편집', save: '저장', back: '뒤로', next: '다음', previous: '이전', start: '시작', stop: '중지', play: '재생', pause: '일시정지', reset: '초기화', clear: '지우기', all: '모두', none: '없음', yes: '예', no: '아니오', ok: '확인', close: '닫기', search: '검색', filter: '필터', sort: '정렬', refresh: '새로고침' } };

const zhTranslations = { nav: { library: '音乐库', import: '导入', party: '派对', characters: '角色', queue: '播放队列', highscores: '高分榜', jukebox: '点唱机', mobile: '移动端', achievements: '成就', daily: '每日', settings: '设置' }, home: { title: 'Karaoke Successor', subtitle: '终极卡拉OK体验。实时音高检测，与朋友竞技，享受派对游戏！', startSinging: '开始唱歌', partyMode: '派对模式', songsAvailable: '可用歌曲', charactersCreated: '已创建角色', partyGames: '派对游戏', difficultyLevels: '难度等级', selectCharacter: '选择角色', createNew: '新建' }, common: { loading: '加载中...', error: '错误', success: '成功', cancel: '取消', confirm: '确认', delete: '删除', edit: '编辑', save: '保存', back: '返回', next: '下一步', previous: '上一步', start: '开始', stop: '停止', play: '播放', pause: '暂停', reset: '重置', clear: '清除', all: '全部', none: '无', yes: '是', no: '否', ok: '确定', close: '关闭', search: '搜索', filter: '筛选', sort: '排序', refresh: '刷新' } };

const ruTranslations = { nav: { library: 'Библиотека', import: 'Импорт', party: 'Вечеринка', characters: 'Персонажи', queue: 'Очередь', highscores: 'Рекорды', jukebox: 'Джукбокс', mobile: 'Мобильный', achievements: 'Достижения', daily: 'Ежедневное', settings: 'Настройки' }, home: { title: 'Karaoke Successor', subtitle: 'Непревзойдённый караоке-опыт. Пойте с определением тона в реальном времени, соревнуйтесь с друзьями!', startSinging: 'Начать петь', partyMode: 'Режим вечеринки', songsAvailable: 'Доступных песен', charactersCreated: 'Персонажей создано', partyGames: 'Игры для вечеринки', difficultyLevels: 'Уровни сложности', selectCharacter: 'Выберите персонажа', createNew: 'Создать новый' }, common: { loading: 'Загрузка...', error: 'Ошибка', success: 'Успех', cancel: 'Отмена', confirm: 'Подтвердить', delete: 'Удалить', edit: 'Редактировать', save: 'Сохранить', back: 'Назад', next: 'Далее', previous: 'Назад', start: 'Начать', stop: 'Стоп', play: 'Играть', pause: 'Пауза', reset: 'Сброс', clear: 'Очистить', all: 'Все', none: 'Нет', yes: 'Да', no: 'Нет', ok: 'ОК', close: 'Закрыть', search: 'Поиск', filter: 'Фильтр', sort: 'Сортировать', refresh: 'Обновить' } };

// Dutch, Polish, Swedish, Norwegian, Danish, Finnish translations
const nlTranslations = { nav: { library: 'Bibliotheek', import: 'Importeren', party: 'Feest', characters: 'Personages', queue: 'Wachtrij', highscores: 'Highscores', jukebox: 'Jukebox', mobile: 'Mobiel', achievements: 'Prestaties', daily: 'Dagelijks', settings: 'Instellingen' }, common: { loading: 'Laden...', error: 'Fout', success: 'Succes', cancel: 'Annuleren', confirm: 'Bevestigen', delete: 'Verwijderen', edit: 'Bewerken', save: 'Opslaan', back: 'Terug', next: 'Volgende', previous: 'Vorige', start: 'Start', stop: 'Stop', play: 'Afspelen', pause: 'Pauzeren', reset: 'Resetten', clear: 'Wissen', all: 'Alles', none: 'Geen', yes: 'Ja', no: 'Nee', ok: 'OK', close: 'Sluiten', search: 'Zoeken', filter: 'Filter', sort: 'Sorteren', refresh: 'Vernieuwen' } };

const plTranslations = { nav: { library: 'Biblioteka', import: 'Import', party: 'Impreza', characters: 'Postacie', queue: 'Kolejka', highscores: 'Wyniki', jukebox: 'Jukebox', mobile: 'Mobilne', achievements: 'Osiągnięcia', daily: 'Codzienne', settings: 'Ustawienia' }, common: { loading: 'Ładowanie...', error: 'Błąd', success: 'Sukces', cancel: 'Anuluj', confirm: 'Potwierdź', delete: 'Usuń', edit: 'Edytuj', save: 'Zapisz', back: 'Wróć', next: 'Dalej', previous: 'Wstecz', start: 'Start', stop: 'Stop', play: 'Odtwórz', pause: 'Pauza', reset: 'Reset', clear: 'Wyczyść', all: 'Wszystko', none: 'Brak', yes: 'Tak', no: 'Nie', ok: 'OK', close: 'Zamknij', search: 'Szukaj', filter: 'Filtr', sort: 'Sortuj', refresh: 'Odśwież' } };

const svTranslations = { nav: { library: 'Bibliotek', import: 'Importera', party: 'Fest', characters: 'Karaktärer', queue: 'Kö', highscores: 'Poäng', jukebox: 'Jukebox', mobile: 'Mobil', achievements: 'Prestationer', daily: 'Daglig', settings: 'Inställningar' }, common: { loading: 'Laddar...', error: 'Fel', success: 'Klart', cancel: 'Avbryt', confirm: 'Bekräfta', delete: 'Radera', edit: 'Redigera', save: 'Spara', back: 'Tillbaka', next: 'Nästa', previous: 'Föregående', start: 'Starta', stop: 'Stopp', play: 'Spela', pause: 'Pausa', reset: 'Återställ', clear: 'Rensa', all: 'Alla', none: 'Inga', yes: 'Ja', no: 'Nej', ok: 'OK', close: 'Stäng', search: 'Sök', filter: 'Filtrera', sort: 'Sortera', refresh: 'Uppdatera' } };

const noTranslations = { nav: { library: 'Bibliotek', import: 'Importer', party: 'Fest', characters: 'Karakterer', queue: 'Kø', highscores: 'Poeng', jukebox: 'Jukebox', mobile: 'Mobil', achievements: 'Prestasjoner', daily: 'Daglig', settings: 'Innstillinger' }, common: { loading: 'Laster...', error: 'Feil', success: 'Suksess', cancel: 'Avbryt', confirm: 'Bekreft', delete: 'Slett', edit: 'Rediger', save: 'Lagre', back: 'Tilbake', next: 'Neste', previous: 'Forrige', start: 'Start', stop: 'Stopp', play: 'Spill', pause: 'Pause', reset: 'Tilbakestill', clear: 'Tøm', all: 'Alle', none: 'Ingen', yes: 'Ja', no: 'Nei', ok: 'OK', close: 'Lukk', search: 'Søk', filter: 'Filter', sort: 'Sorter', refresh: 'Oppdater' } };

const daTranslations = { nav: { library: 'Bibliotek', import: 'Importér', party: 'Fest', characters: 'Karakterer', queue: 'Kø', highscores: 'Point', jukebox: 'Jukebox', mobile: 'Mobil', achievements: 'Præstationer', daily: 'Daglig', settings: 'Indstillinger' }, common: { loading: 'Indlæser...', error: 'Fejl', success: 'Succes', cancel: 'Annuller', confirm: 'Bekræft', delete: 'Slet', edit: 'Rediger', save: 'Gem', back: 'Tilbage', next: 'Næste', previous: 'Forrige', start: 'Start', stop: 'Stop', play: 'Afspil', pause: 'Pause', reset: 'Nulstil', clear: 'Ryd', all: 'Alle', none: 'Ingen', yes: 'Ja', no: 'Nej', ok: 'OK', close: 'Luk', search: 'Søg', filter: 'Filter', sort: 'Sorter', refresh: 'Opdater' } };

const fiTranslations = { nav: { library: 'Kirjasto', import: 'Tuo', party: 'Juhlat', characters: 'Hahmot', queue: 'Jono', highscores: 'Pisteet', jukebox: 'Jukebox', mobile: 'Mobiili', achievements: 'Saavutukset', daily: 'Päivittäinen', settings: 'Asetukset' }, common: { loading: 'Ladataan...', error: 'Virhe', success: 'Onnistui', cancel: 'Peruuta', confirm: 'Vahvista', delete: 'Poista', edit: 'Muokkaa', save: 'Tallenna', back: 'Takaisin', next: 'Seuraava', previous: 'Edellinen', start: 'Aloita', stop: 'Pysäytä', play: 'Toista', pause: 'Keskeytä', reset: 'Nollaa', clear: 'Tyhjennä', all: 'Kaikki', none: 'Ei mitään', yes: 'Kyllä', no: 'Ei', ok: 'OK', close: 'Sulje', search: 'Hae', filter: 'Suodata', sort: 'Järjestä', refresh: 'Päivitä' } };

// All translations combined
export const translations: Record<Language, Record<string, string>> = {
  en: flattenObject(enTranslations),
  de: flattenObject(deTranslations),
  es: flattenObject(esTranslations),
  fr: flattenObject(frTranslations),
  it: flattenObject(itTranslations),
  pt: flattenObject(ptTranslations),
  ja: flattenObject(jaTranslations),
  ko: flattenObject(koTranslations),
  zh: flattenObject(zhTranslations),
  ru: flattenObject(ruTranslations),
  nl: flattenObject(nlTranslations),
  pl: flattenObject(plTranslations),
  sv: flattenObject(svTranslations),
  no: flattenObject(noTranslations),
  da: flattenObject(daTranslations),
  fi: flattenObject(fiTranslations),
};

// Helper to flatten nested object to dot-notation keys
function flattenObject(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, newKey));
    } else if (typeof value === 'string') {
      result[newKey] = value;
    }
  }
  
  return result;
}

// Helper to create nested object from flat keys (for t.settings.title access)
function createNestedObject(flatObj: Record<string, string>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(flatObj)) {
    const parts = key.split('.');
    let current: Record<string, unknown> = result;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[parts[i]] as Record<string, unknown>;
    }
    
    current[parts[parts.length - 1]] = value;
  }
  
  return result;
}

// Get translation for a key (function style)
export function t(key: string, language: Language = 'en'): string {
  const langTranslations = translations[language];
  if (langTranslations && langTranslations[key]) {
    return langTranslations[key];
  }
  // Fallback to English
  if (translations.en[key]) {
    return translations.en[key];
  }
  // Return the key if no translation found
  return key;
}

// Create a translation function bound to a language
export function createTranslator(language: Language) {
  return (key: string): string => t(key, language);
}

// Create a nested translation object for object-style access (t.settings.title)
export function createTranslationObject(language: Language): Record<string, unknown> {
  const langTranslations = translations[language];
  const enTranslationsFlat = translations.en;
  
  // Merge with English as fallback
  const merged = { ...enTranslationsFlat, ...langTranslations };
  
  return createNestedObject(merged);
}

// Get stored language from storage
export function getStoredLanguage(): Language {
  if (typeof window === 'undefined') return 'en';
  const stored = storage.get(STORAGE_KEYS.LANGUAGE);
  if (stored && (translations as Record<string, unknown>)[stored]) {
    return stored as Language;
  }
  return 'en';
}

// Store language in storage
export function setStoredLanguage(language: Language): void {
  storage.set(STORAGE_KEYS.LANGUAGE, language);
}

// React hook for translations (for client components)
export function useTranslation() {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window === 'undefined') return 'en';
    return getStoredLanguage();
  });
  
  const setLanguage = useCallback((newLang: Language) => {
    setLanguageState(newLang);
    setStoredLanguage(newLang);
  }, []);
  
  const t = useCallback((key: string): string => {
    return translate(key, language);
  }, [language]);
  
  const translations = createTranslationObject(language);
  
  return { t, language, setLanguage, translations };
}

// Alias for t function
function translate(key: string, language: Language): string {
  const langTranslations = translations[language];
  if (langTranslations && langTranslations[key]) {
    return langTranslations[key];
  }
  // Fallback to English
  if (translations.en[key]) {
    return translations.en[key];
  }
  // Return the key if no translation found
  return key;
}
