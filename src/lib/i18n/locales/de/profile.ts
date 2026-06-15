// DE translations — profile
// Auto-split from monolithic locale file

export const profileTranslations = {
  profile: {
    title: 'Profile',
    createCharacter: 'Profil erstellen',
    name: 'Name',
    namePlaceholder: 'Profilname...',
    country: 'Land',
    countryOptional: 'Land auswählen (optional)',
    avatar: 'Avatar',
    uploadPhoto: 'Foto hochladen',
    create: 'Erstellen',
    edit: 'Bearbeiten',
    delete: 'Löschen',
    active: 'Aktiv',
    selectAsActive: 'Als aktiv auswählen',
    noCharacters: 'Noch keine Profile',
    noCharactersDesc: 'Erstelle ein Profil um deine Punkte und deinen Fortschritt zu verfolgen!',
    showOnLeaderboard: 'Im Leaderboard anzeigen',
    showPhoto: 'Foto anzeigen',
    photoUploaded: 'Foto hochgeladen',
    noPhoto: 'Kein Foto'
  },

  characterScreen: {
    title: 'Profil',
    description: 'Erstelle und verwalte deine Sänger-Profile',
    onlineLeaderboard: 'Online-Leaderboard',
    createProfile: 'Neues Profil erstellen',
    yourProfiles: 'Deine Profile ({n})',
    noProfiles: 'Noch keine Profile. Klicke auf "Neues Profil erstellen" um loszulegen!',
    settingsTitle: 'Profileinstellungen',
    nameAndAvatar: 'Name & Avatar',
    rankDisplay: 'Rang-Anzeige',
    showRankInName: 'Rang im Namen anzeigen',
    rankPrefix: 'Präfix',
    rankSuffix: 'Suffix',
    rankFull: 'Vollständig',
    countryAndPrivacy: 'Land & Privatsphäre',
    selectCountry: 'Land auswählen',
    visible: 'Sichtbar',
    hidden: 'Versteckt',
    shown: 'Angezeigt',
    companionAppLink: 'Companion-App Verknüpfung',
    companionAppLinkDesc: 'Scanne diesen QR-Code, um dich direkt mit diesem Profil in der Companion-App zu verbinden.',
    hideQrCode: 'QR-Code ausblenden',
    showQrCode: 'QR-Code anzeigen'
  },

  characterCard: {
    connected: 'Verbunden',
    connectedWith: 'Verbunden: {n}'
  },

  profileSync: {
    title: 'Profil-Sync',
    uploadSuccess: 'Profil hochgeladen! Sync-Code: {n}',
    uploadFailed: 'Hochladen fehlgeschlagen',
    downloadFailed: 'Profil konnte nicht hochgeladen werden',
    invalidCode: 'Bitte gib einen gültigen 8-stelligen Sync-Code ein',
    syncSuccess: 'Profil erfolgreich synchronisiert!',
    notFound: 'Profil nicht gefunden',
    profileNotFound: 'Profil nicht gefunden',
    downloadFailedMsg: 'Profil konnte nicht heruntergeladen werden. Überprüfe den Sync-Code.',
    syncCode: 'Sync-Code:',
    upload: 'Hochladen',
    syncCodePlaceholder: 'Sync-Code'
  },

  playerProgression: {
    active: 'Aktiv',
    inactive: 'Inaktiv',
    progressToNext: 'Fortschritt zum nächsten Level',
    xpNeeded: 'XP benötigt',
    songsPlayed: 'Gespielte Songs',
    goldenNotes: 'Goldene Noten',
    bestCombo: 'Beste Combo',
    totalScore: 'Gesamtpunktzahl',
    achievementsTitle: 'Erfolge',
    more: '+{n} weitere',
    beginner: 'Anfänger',
    xp: 'EP',
    lv: 'Lv. {n}'
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

    first_note: { name: 'Erste Note', description: 'Triff deine erste Note' },
    perfect_ten: { name: 'Perfekte Zehn', description: 'Erziele 10 Perfect-Treffer in einem einzigen Song' },
    combo_master: { name: 'Combo-Meister', description: 'Erreiche eine 50-Note-Combo' },
    combo_king: { name: 'Combo-König', description: 'Erreiche eine 100-Note-Combo' },
    combo_legend: { name: 'Combo-Legende', description: 'Erreiche eine 200-Note-Combo' },
    perfect_song: { name: 'Perfekter Song', description: 'Erziele 99,5%+ Genauigkeit bei einem Song' },
    accuracy_90: { name: 'Pitch Perfect', description: 'Erziele über 90% Genauigkeit' },
    score_8k: { name: 'Rising Star', description: 'Erziele über 8.000 Punkte' },
    score_9k: { name: 'Score-Meister', description: 'Erziele über 9.000 Punkte' },
    score_9500: { name: 'Makellos', description: 'Erziele über 9.500 Punkte' },
    golden_collector: { name: 'Gold-Sammler', description: 'Triff 10 goldene Noten' },
    golden_master: { name: 'Gold-Meister', description: 'Triff 50 goldene Noten' },
    first_song: { name: 'Erste Schritte', description: 'Schließe deinen ersten Song ab' },
    ten_songs: { name: 'Karaoke-Enthusiast', description: 'Schließe 10 Songs ab' },
    fifty_songs: { name: 'Karaoke-Stammgast', description: 'Schließe 50 Songs ab' },
    hundred_songs: { name: 'Karaoke-Legende', description: 'Schließe 100 Songs ab' },
    five_games: { name: 'Erste Spiele', description: 'Spiele 5 Spiele' },
    twenty_games: { name: 'Engagierter Sänger', description: 'Spiele 20 Spiele' },
    party_time: { name: 'Party-Zeit!', description: 'Spiele einen Party-Spielmodus' },
    duel_winner: { name: 'Duell-Champion', description: 'Gewinne ein Duell' },
    pass_the_mic: { name: 'Mikrofon weitergeben!', description: 'Spiele Pass the Mic' },
    shower_singer: { name: 'Duschen-Sänger', description: 'Erziele weniger als 20% bei einem Song' },
    comeback_king: { name: 'Comeback-König', description: 'Erreiche eine Combo von 50+ nach 10 verfehlten Noten' },
    speed_demon: { name: 'Tempo-Teufel', description: 'Schließe einen Song mit 1,5x Geschwindigkeit ab' },
    blind_master: { name: 'Blind-Meister', description: 'Schließe einen Song im Blind-Karaoke-Modus ab' }
  },

  achievementsScreen: {
    title: '🏆 Erfolge',
    description: 'Schalte Erfolge durch Spielen frei!',
    unlocked: 'Freigeschaltet',
    xpEarned: 'XP verdient',
    completion: 'Abschluss',
    all: 'Alle',
    categories: {
      performance: 'Leistung',
      progression: 'Fortschritt',
      social: 'Sozial',
      special: 'Speziell'
    },
    plusXp: '+{n} XP',
    locked: 'Gesperrt'
  },

  badgeNames: {
    'first-challenge': 'Erste Schritte',
    'week-warrior': 'Wochen-Krieger',
    'fortnight-fighter': 'Vierzehn-Tage-Kämpfer',
    'monthly-master': 'Monats-Meister',
    'top-3': 'Podium-Platz',
    'champion': 'Täglicher Champion',
    'dedicated': 'Engagierter Sänger',
    'legendary': 'Legendärer Status',
    'century-champion': 'Jahrhundert-Champion',
    'yearly-legend': 'Jährliche Legende',
    'explorer': 'Challenge-Entdecker',
    'songbird': 'Lerche',
    'weekly-warrior-q': 'Wochen-Krieger'
  },

  badgeDescriptions: {
    'first-challenge': 'Schließe deine erste tägliche Herausforderung ab',
    'week-warrior': 'Halte eine 7-Tage-Serie aufrecht',
    'fortnight-fighter': 'Halte eine 14-Tage-Serie aufrecht',
    'monthly-master': 'Halte eine 30-Tage-Serie aufrecht',
    'top-3': 'Erreiche die Top 3 einer täglichen Herausforderung',
    'champion': 'Gewinne eine tägliche Herausforderung',
    'dedicated': 'Schließe 30 tägliche Herausforderungen ab',
    'legendary': 'Erreiche 10.000 XP insgesamt',
    'century-champion': 'Halte eine 100-Tage-Serie aufrecht',
    'yearly-legend': 'Halte eine 365-Tage-Serie aufrecht',
    'explorer': 'Spiele 5 verschiedene Challenge-Modi',
    'songbird': 'Schließe 10 Songs insgesamt ab',
    'weekly-warrior-q': 'Schließe 3 wöchentliche Herausforderungen ab'
  },

  mobileAchievements: {
    first_song: { title: 'Erste Schritte', description: 'Singe deinen ersten Song' },
    ten_songs: { title: 'Rising Star', description: 'Singe 10 Songs' },
    fifty_songs: { title: 'Veteran', description: 'Singe 50 Songs' },
    perfect_score: { title: 'Perfektionist', description: 'Erreiche eine perfekte Bewertung (95%+)' },
    five_perfect: { title: 'Makellos', description: 'Erziele 5 perfekte Bewertungen' },
    high_score: { title: 'Score-Meister', description: 'Erreiche 10.000 Gesamtpunkte' },
    queue_5: { title: 'Playlist-Builder', description: 'Reihe 5 Songs in die Warteschlange' },
    genre_3: { title: 'Genre-Entdecker', description: 'Singe Songs aus 3 Genres' },
  },

  challenges: {
    requirements: {
      minLevel: 'Erfordert Level {required} (du bist Level {current})',
      minSongs: 'Erfordert {required} abgeschlossene Songs (du hast {current})',
      achievement: 'Erfordert Erfolg: {name}',
      rankNoXP: 'Rang-Anforderung kann nicht überprüft werden (keine XP-Daten verfügbar)',
      unknownRank: 'Unbekannter Rang "{name}"',
      rankRequired: 'Erfordert Rang "{required}" (du bist "{current}")',
    },
  },
};
