// DE translations — profile

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
  noPhoto: 'Kein Foto',
  privacyHint: 'Deine Scores werden zum globalen Leaderboard hochgeladen.',
  privacyHintDesc: 'Du kannst jederzeit in den Profileinstellungen opt-out.',
  storageMode: {
    title: 'Profil-Speicherort',
    local: 'Nur lokal',
    localDesc: 'Alle Daten bleiben auf diesem Gerät — kein Online-Leaderboard, kein Sync.',
    online: 'Online-Profil',
    onlineDesc: 'Nimm am Online-Leaderboard teil, synchronisiere Geräte und teile Daily-Ergebnisse.',
    localShort: 'Lokal',
    onlineShort: 'Online',
    settingsDesc: 'Bestimme, ob dieses Profil am Online-Leaderboard teilnimmt oder nur lokal gespeichert wird. Jederzeit änderbar.',
  },
  countrySearch: 'Land suchen…',
  noCountryFound: 'Kein Land gefunden',
  popularCountries: 'Beliebt',
  allCountries: 'Alle Länder',
},
profileAuth: {
  accountTitle: 'Online-Konto (optional)',
  accountDesc: 'Hinterlege E-Mail und Passwort, um das Profil auf einem anderen Gerät wiederzuladen. Die Anmeldung ist ausschließlich in der Karaoke-App möglich — es gibt keinen Web-Login.',
  email: 'E-Mail',
  emailPlaceholder: 'deine@email.com',
  emailInvalid: 'Bitte gib eine gültige E-Mail-Adresse ein',
  emailTaken: 'Diese E-Mail ist bereits registriert',
  password: 'Passwort',
  passwordPlaceholder: 'Mindestens 8 Zeichen',
  passwordRepeat: 'Passwort wiederholen',
  passwordsDontMatch: 'Die Passwörter stimmen nicht überein',
  passwordTooShort: 'Das Passwort muss mindestens 8 Zeichen lang sein',
  registerFailed: 'Online-Konto konnte nicht erstellt werden',
  loginTitle: 'Online-Profil laden',
  loginDesc: 'Gib E-Mail und Passwort deines Online-Profils ein, um es auf diesem Gerät zu laden.',
  loginButton: 'Anmelden & Profil laden',
  loginFailed: 'Anmeldung fehlgeschlagen — bitte prüfe E-Mail und Passwort',
  loginSuccess: 'Profil „{n}“ erfolgreich geladen!',
  noSnapshot: 'Noch keine synchronisierten Profildaten auf dem Server gefunden',
  emailNote: 'Wird nur für die Anmeldung verwendet — niemals öffentlich angezeigt',
  changePassword: 'Passwort ändern',
  currentPassword: 'Aktuelles Passwort',
  newPassword: 'Neues Passwort',
  passwordChanged: 'Passwort erfolgreich geändert',
  passwordChangeFailed: 'Passwort konnte nicht geändert werden',
  hasAccount: 'Online-Konto ✓',
  registrationPending: 'Online-Konto wird erstellt…',
  registrationSuccess: 'Online-Konto erstellt — du kannst dich jetzt auf jedem Gerät anmelden',
  registrationSuccessTitle: '🔐 Online-Konto',
  loginSuccessTitle: '✅ {n}',
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
  showQrCode: 'QR-Code anzeigen',
  leaderboardParticipation: 'Leaderboard-Teilnahme',
  leaderboardParticipationDesc: 'Nimm am Online-Leaderboard teil und teile deine Scores mit anderen Spielern',
  loadProfile: 'Online-Profil laden',
},
characterCard: {
  connected: 'Verbunden',
  connectedWith: 'Verbunden: {n}',
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
  syncCodePlaceholder: 'Sync-Code',
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
  lv: 'Lv. {n}',
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
  first_note: {
    name: 'Erste Note',
    description: 'Triff deine erste Note',
  },
  perfect_ten: {
    name: 'Perfekte Zehn',
    description: 'Erziele 10 Perfect-Treffer in einem einzigen Song',
  },
  combo_master: {
    name: 'Combo-Meister',
    description: 'Erreiche eine 50-Note-Combo',
  },
  combo_king: {
    name: 'Combo-König',
    description: 'Erreiche eine 100-Note-Combo',
  },
  combo_legend: {
    name: 'Combo-Legende',
    description: 'Erreiche eine 200-Note-Combo',
  },
  perfect_song: {
    name: 'Perfekter Song',
    description: 'Erziele 99,5%+ Genauigkeit bei einem Song',
  },
  accuracy_90: {
    name: 'Pitch Perfect',
    description: 'Erziele über 90% Genauigkeit',
  },
  score_8k: {
    name: 'Aufsteigender Stern',
    description: 'Erziele über 8.000 Punkte',
  },
  score_9k: {
    name: 'Score-Meister',
    description: 'Erziele über 9.000 Punkte',
  },
  score_9500: {
    name: 'Makellos',
    description: 'Erziele über 9.500 Punkte',
  },
  golden_collector: {
    name: 'Gold-Sammler',
    description: 'Triff 10 goldene Noten',
  },
  golden_master: {
    name: 'Gold-Meister',
    description: 'Triff 50 goldene Noten',
  },
  first_song: {
    name: 'Erste Schritte',
    description: 'Schließe deinen ersten Song ab',
  },
  ten_songs: {
    name: 'Karaoke-Enthusiast',
    description: 'Schließe 10 Songs ab',
  },
  fifty_songs: {
    name: 'Karaoke-Stammgast',
    description: 'Schließe 50 Songs ab',
  },
  hundred_songs: {
    name: 'Karaoke-Legende',
    description: 'Schließe 100 Songs ab',
  },
  five_games: {
    name: 'Erste Spiele',
    description: 'Spiele 5 Spiele',
  },
  twenty_games: {
    name: 'Engagierter Sänger',
    description: 'Spiele 20 Spiele',
  },
  party_time: {
    name: 'Party-Zeit!',
    description: 'Spiele einen Party-Spielmodus',
  },
  duel_winner: {
    name: 'Duell-Champion',
    description: 'Gewinne ein Duell',
  },
  pass_the_mic: {
    name: 'Mikrofon weitergeben!',
    description: 'Spiele Pass the Mic',
  },
  shower_singer: {
    name: 'Duschen-Sänger',
    description: 'Erziele weniger als 20% bei einem Song',
  },
  comeback_king: {
    name: 'Comeback-König',
    description: 'Erreiche eine Combo von 50+ nach 10 verfehlten Noten',
  },
  speed_demon: {
    name: 'Tempo-Teufel',
    description: 'Schließe einen Song mit 1,5x Geschwindigkeit ab',
  },
  blind_master: {
    name: 'Blind-Meister',
    description: 'Schließe einen Song im Blind-Karaoke-Modus ab',
  },
  daily_starter: {
    name: 'Täglich-Einsteiger',
    description: 'Schließe deine erste tägliche Herausforderung ab',
  },
  daily_regular: {
    name: 'Täglich-Dauerbrenner',
    description: 'Schließe 10 tägliche Herausforderungen ab',
  },
  daily_devoted: {
    name: 'Täglich-Hingabe',
    description: 'Schließe 50 tägliche Herausforderungen ab',
  },
  streak_week: {
    name: 'In Brand',
    description: 'Halte eine 7-tägige Daily-Serie',
  },
  streak_month: {
    name: 'Unaufhaltsam',
    description: 'Halte eine 30-tägige Daily-Serie',
  },
  weekly_warrior: {
    name: 'Wochen-Krieger',
    description: 'Schließe 5 wöchentliche Herausforderungen ab',
  },
  accuracy_95: {
    name: 'Präzisionssänger',
    description: 'Erreiche über 95% Genauigkeit',
  },
  golden_rush: {
    name: 'Goldrausch',
    description: 'Triff 20 goldene Noten in einem einzigen Song',
  },
  golden_hundred: {
    name: 'Goldener Centurio',
    description: 'Triff insgesamt 100 goldene Noten',
  },
  perfect_fifty: {
    name: 'Perfekte Fünfzig',
    description: 'Triff 50 perfekte Noten in einem einzigen Song',
  },
  lightning_lips: {
    name: 'Blitzlippen',
    description: 'Beende einen Song mit 2-facher Geschwindigkeit',
  },
  duet_harmony: {
    name: 'Perfekte Harmonie',
    description: 'Singe 10 Duette',
  },
  genre_explorer: {
    name: 'Genre-Entdecker',
    description: 'Singe Songs aus 5 verschiedenen Genres',
  },
  disney_fan: {
    name: 'Disney-Fan',
    description: 'Singe 10 Disney-Songs',
  },
  night_owl: {
    name: 'Nachteule',
    description: 'Beende einen Song zwischen Mitternacht und 4 Uhr morgens',
  },
  early_bird: {
    name: 'Frühaufsteher',
    description: 'Beende einen Song vor 8 Uhr morgens',
  },
  marathon_singer: {
    name: 'Marathon-Sänger',
    description: 'Spiele 5 Spiele an einem einzigen Tag',
  },

  // ── 100-Erfolge-Erweiterung ──
  score_9800: {
    name: 'Ultra-Star',
    description: 'Erziele über 9.800 Punkte',
  },
  score_9900: {
    name: 'Jenseits der Perfektion',
    description: 'Erziele über 9.900 Punkte',
  },
  combo_300: {
    name: 'Combo-Titan',
    description: 'Erreiche eine 300-Note-Combo',
  },
  combo_500: {
    name: 'Combo-Unsterblicher',
    description: 'Erreiche eine 500-Note-Combo',
  },
  accuracy_92: {
    name: 'Feinjustierung',
    description: 'Erziele über 92% Genauigkeit',
  },
  accuracy_94: {
    name: 'Studioreif',
    description: 'Erziele über 94% Genauigkeit',
  },
  accuracy_96: {
    name: 'Scharfschütze',
    description: 'Erziele über 96% Genauigkeit',
  },
  accuracy_97: {
    name: 'Laserpräzision',
    description: 'Erziele über 97% Genauigkeit',
  },
  accuracy_98: {
    name: 'Virtuose',
    description: 'Erziele über 98% Genauigkeit',
  },
  perfect_75: {
    name: 'Perfekte 75',
    description: 'Triff 75 perfekte Noten in einem einzigen Song',
  },
  perfect_100: {
    name: 'Perfekte Hundert',
    description: 'Triff 100 perfekte Noten in einem einzigen Song',
  },
  perfect_150: {
    name: 'Perfekter Sturm',
    description: 'Triff 150 perfekte Noten in einem einzigen Song',
  },
  golden_30: {
    name: 'Goldene Flut',
    description: 'Triff 30 goldene Noten in einem einzigen Song',
  },
  golden_40: {
    name: 'Goldene Sinfonie',
    description: 'Triff 40 goldene Noten in einem einzigen Song',
  },
  perfect_500: {
    name: 'Perfekte Maschine',
    description: 'Triff insgesamt 500 perfekte Noten',
  },
  perfect_1000: {
    name: 'Präzisions-Powerhouse',
    description: 'Triff insgesamt 1.000 perfekte Noten',
  },
  perfect_5000: {
    name: 'Perfekte Lawine',
    description: 'Triff insgesamt 5.000 perfekte Noten',
  },
  perfect_10000: {
    name: 'Perfekte Zehntausend',
    description: 'Triff insgesamt 10.000 perfekte Noten',
  },
  golden_250: {
    name: 'Goldene Ernte',
    description: 'Triff insgesamt 250 goldene Noten',
  },
  golden_1000: {
    name: 'Goldener Wolkenbruch',
    description: 'Triff insgesamt 1.000 goldene Noten',
  },
  golden_5000: {
    name: 'Midas-Stimme',
    description: 'Triff insgesamt 5.000 goldene Noten',
  },
  songs_250: {
    name: 'Songbuch-Veteran',
    description: 'Schließe 250 Songs ab',
  },
  songs_500: {
    name: 'Halbtausend-Club',
    description: 'Schließe 500 Songs ab',
  },
  songs_1000: {
    name: 'Tausend-Song-Legende',
    description: 'Schließe 1.000 Songs ab',
  },
  games_50: {
    name: 'Vielsänger',
    description: 'Spiele 50 Spiele',
  },
  games_100: {
    name: 'Jahrhundert-Club',
    description: 'Spiele 100 Spiele',
  },
  games_250: {
    name: 'Arcade-Stammgast',
    description: 'Spiele 250 Spiele',
  },
  games_500: {
    name: 'Marathon-Maniac',
    description: 'Spiele 500 Spiele',
  },
  level_25: {
    name: 'Erfahrener Sänger',
    description: 'Erreiche Level 25',
  },
  level_50: {
    name: 'Elite-Sänger',
    description: 'Erreiche Level 50',
  },
  level_100: {
    name: 'Level-100-Legende',
    description: 'Erreiche Level 100',
  },
  daily_100: {
    name: 'Daily-Centurio',
    description: 'Schließe 100 tägliche Herausforderungen ab',
  },
  daily_250: {
    name: 'Daily-Fanatiker',
    description: 'Schließe 250 tägliche Herausforderungen ab',
  },
  daily_500: {
    name: 'Daily-Unsterblicher',
    description: 'Schließe 500 tägliche Herausforderungen ab',
  },
  streak_60: {
    name: 'Eiserner Wille',
    description: 'Halte eine 60-tägige Daily-Serie',
  },
  streak_100: {
    name: 'Hundert-Tage-Held',
    description: 'Halte eine 100-tägige Daily-Serie',
  },
  streak_180: {
    name: 'Halbjahr-Hingabe',
    description: 'Halte eine 180-tägige Daily-Serie',
  },
  streak_365: {
    name: 'Jahres-Legende',
    description: 'Halte eine 365-tägige Daily-Serie',
  },
  weekly_15: {
    name: 'Wochen-Fels',
    description: 'Schließe 15 wöchentliche Herausforderungen ab',
  },
  weekly_30: {
    name: 'Wochen-Pfeiler',
    description: 'Schließe 30 wöchentliche Herausforderungen ab',
  },
  weekly_52: {
    name: 'Jahr der Wochen',
    description: 'Schließe 52 wöchentliche Herausforderungen ab',
  },
  encore_10: {
    name: 'Zugabe!',
    description: 'Spiele 10 Spiele an einem einzigen Tag',
  },
  duets_25: {
    name: 'Duett-Verehrer',
    description: 'Singe 25 Duette',
  },
  duets_50: {
    name: 'Dynamisches Duo',
    description: 'Singe 50 Duette',
  },
  duets_100: {
    name: 'Duett-Jahrhundert',
    description: 'Singe 100 Duette',
  },
  duels_5: {
    name: 'Duellant',
    description: 'Gewinne 5 Duelle',
  },
  duels_10: {
    name: 'Duell-Meister',
    description: 'Gewinne 10 Duelle',
  },
  duels_25: {
    name: 'Duell-Overlord',
    description: 'Gewinne 25 Duelle',
  },
  party_10: {
    name: 'Partytier',
    description: 'Spiele 10 Party-Spiele',
  },
  party_25: {
    name: 'Seele der Party',
    description: 'Spiele 25 Party-Spiele',
  },
  party_50: {
    name: 'Party-Legende',
    description: 'Spiele 50 Party-Spiele',
  },
  disney_25: {
    name: 'Disney-Enthusiast',
    description: 'Singe 25 Disney-Songs',
  },
  disney_50: {
    name: 'Es war einmal ein Song',
    description: 'Singe 50 Disney-Songs',
  },
  genres_8: {
    name: 'Genre-Wanderer',
    description: 'Singe Songs aus 8 verschiedenen Genres',
  },
  genres_10: {
    name: 'Genre-Kenner',
    description: 'Singe Songs aus 10 verschiedenen Genres',
  },
  clean_sheet: {
    name: 'Weiße Weste',
    description: 'Beende einen Song mit 50+ Noten und null Fehlern',
  },
  weekend_singer: {
    name: 'Wochenend-Sänger',
    description: 'Beende einen Song am Samstag oder Sonntag',
  },
  lunch_break: {
    name: 'Mittagspause',
    description: 'Beende einen Song zwischen 12 und 14 Uhr',
  },
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
    special: 'Speziell',
  },
  plusXp: '+{n} XP',
  locked: 'Gesperrt',
  viewPlayer: 'Erfolge von',
  viewingOther: 'Du siehst die Erfolge von {n}. Jeder Spieler schaltet seine eigenen Erfolge frei.',
  noMatches: 'Keine Erfolge für diese Filter',
},
badgeNames: {
  'first-challenge': 'Erste Schritte',
  'week-warrior': 'Wochen-Krieger',
  'fortnight-fighter': 'Vierzehn-Tage-Kämpfer',
  'monthly-master': 'Monats-Meister',
  'top-3': 'Podium-Platz',
  champion: 'Täglicher Champion',
  dedicated: 'Engagierter Sänger',
  legendary: 'Legendärer Status',
  'century-champion': 'Jahrhundert-Champion',
  'yearly-legend': 'Jährliche Legende',
  explorer: 'Challenge-Entdecker',
  songbird: 'Lerche',
  'weekly-warrior-q': 'Wochen-Krieger',
},
badgeDescriptions: {
  'first-challenge': 'Schließe deine erste tägliche Herausforderung ab',
  'week-warrior': 'Halte eine 7-Tage-Serie aufrecht',
  'fortnight-fighter': 'Halte eine 14-Tage-Serie aufrecht',
  'monthly-master': 'Halte eine 30-Tage-Serie aufrecht',
  'top-3': 'Erreiche die Top 3 einer täglichen Herausforderung',
  champion: 'Gewinne eine tägliche Herausforderung',
  dedicated: 'Schließe 30 tägliche Herausforderungen ab',
  legendary: 'Erreiche 10.000 XP insgesamt',
  'century-champion': 'Halte eine 100-Tage-Serie aufrecht',
  'yearly-legend': 'Halte eine 365-Tage-Serie aufrecht',
  explorer: 'Spiele 5 verschiedene Challenge-Modi',
  songbird: 'Schließe 10 Songs insgesamt ab',
  'weekly-warrior-q': 'Schließe 3 wöchentliche Herausforderungen ab',
},
mobileAchievements: {
  first_song: {
    title: 'Erste Schritte',
    description: 'Singe deinen ersten Song',
  },
  ten_songs: {
    title: 'Aufsteigender Stern',
    description: 'Singe 10 Songs',
  },
  fifty_songs: {
    title: 'Veteran',
    description: 'Singe 50 Songs',
  },
  perfect_score: {
    title: 'Perfektionist',
    description: 'Erreiche eine perfekte Bewertung (95%+)',
  },
  five_perfect: {
    title: 'Makellos',
    description: 'Erziele 5 perfekte Bewertungen',
  },
  high_score: {
    title: 'Score-Meister',
    description: 'Erreiche 10.000 Gesamtpunkte',
  },
  queue_5: {
    title: 'Playlist-Builder',
    description: 'Reihe 5 Songs in die Warteschlange',
  },
  genre_3: {
    title: 'Genre-Entdecker',
    description: 'Singe Songs aus 3 Genres',
  },
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
