// DA translations — profile

export const profileTranslations = {
profile: {
  title: 'Profiler',
  createCharacter: 'Opret profil',
  name: 'Navn',
  namePlaceholder: 'Profilnavn...',
  country: 'Land',
  countryOptional: 'Vælg land (valgfrit)',
  avatar: 'Avatar',
  uploadPhoto: 'Upload foto',
  create: 'Opret',
  edit: 'Redigér',
  delete: 'Slet',
  active: 'Aktiv',
  selectAsActive: 'Vælg som aktiv',
  noCharacters: 'Ingen profiler endnu',
  noCharactersDesc: 'Opret en profil for at følge dine resultater og fremskridt!',
  showOnLeaderboard: 'Vis på rangliste',
  showPhoto: 'Vis foto',
  photoUploaded: 'Foto uploadet',
  noPhoto: 'Intet foto',
  privacyHint: 'Your scores will be uploaded to the global leaderboard.',
  privacyHintDesc: 'You can opt out at any time in Profile Settings.',
  storageMode: {
    title: 'Profillagring',
    local: 'Kun lokalt',
    localDesc: 'Alle data forbliver på denne enhed — ingen online rangliste, ingen synkronisering.',
    online: 'Online-profil',
    onlineDesc: 'Deltag i online-ranglisten, synkronisér på tværs af enheder og del daglige resultater.',
    localShort: 'Lokal',
    onlineShort: 'Online',
    settingsDesc: 'Beslut, om denne profil skal deltage i online-ranglisten eller kun være lokal. Kan altid ændres.',
  },
  countrySearch: 'Søg land…',
  noCountryFound: 'Intet land fundet',
  popularCountries: 'Populære',
  allCountries: 'Alle lande',
},
profileAuth: {
  accountTitle: 'Onlinekonto (valgfrit)',
  accountDesc: 'Gem en e-mail og en adgangskode, så du kan indlæse denne profil på en anden enhed. Login er kun muligt inde i karaoke-appen — der er ingen web-login.',
  email: 'E-mail',
  emailPlaceholder: 'din@email.com',
  emailInvalid: 'Indtast en gyldig e-mailadresse',
  emailTaken: 'Denne e-mail er allerede registreret',
  password: 'Adgangskode',
  passwordPlaceholder: 'Mindst 8 tegn',
  passwordRepeat: 'Gentag adgangskode',
  passwordsDontMatch: 'Adgangskoderne er ikke ens',
  passwordTooShort: 'Adgangskoden skal være på mindst 8 tegn',
  registerFailed: 'Onlinekontoen kunne ikke oprettes',
  loginTitle: 'Indlæs onlineprofil',
  loginDesc: 'Indtast e-mail og adgangskode til din onlineprofil for at indlæse den på denne enhed.',
  loginButton: 'Log ind og indlæs profil',
  loginFailed: 'Login mislykkedes — tjek e-mail og adgangskode',
  loginSuccess: 'Profilen "{n}" blev indlæst!',
  noSnapshot: 'Ingen synkroniserede profildata er fundet på serveren endnu',
  emailNote: 'Bruges kun til login — vises aldrig offentligt',
  changePassword: 'Skift adgangskode',
  currentPassword: 'Nuværende adgangskode',
  newPassword: 'Ny adgangskode',
  passwordChanged: 'Adgangskoden blev ændret',
  passwordChangeFailed: 'Adgangskoden kunne ikke ændres',
  hasAccount: 'Onlinekonto ✓',
  registrationPending: 'Opretter onlinekontoen…',
  registrationSuccess: 'Onlinekonto oprettet — du kan nu logge ind på enhver enhed',
  registrationSuccessTitle: '🔐 Onlinekonto',
  loginSuccessTitle: '✅ {n}',
},
characterScreen: {
  title: 'Profil',
  description: 'Opret og håndtér dine sangerprofiler',
  onlineLeaderboard: 'Online rangliste',
  createProfile: 'Opret ny profil',
  yourProfiles: 'Dine profiler ({n})',
  noProfiles: 'Ingen profiler endnu. Klik på "Opret ny profil" for at komme i gang!',
  settingsTitle: 'Profilindstillinger',
  nameAndAvatar: 'Navn & avatar',
  rankDisplay: 'Rangvisning',
  showRankInName: 'Vis rang i navn',
  rankPrefix: 'Præfiks',
  rankSuffix: 'Suffiks',
  rankFull: 'Fuld',
  countryAndPrivacy: 'Land & privatliv',
  selectCountry: 'Vælg land',
  visible: 'Synlig',
  hidden: 'Skjult',
  shown: 'Vist',
  companionAppLink: 'Companion-app-link',
  companionAppLinkDesc: 'Scan denne QR-kode for at forbinde direkte med denne profil i companion-appen.',
  hideQrCode: 'Skjul QR-kode',
  showQrCode: 'Vis QR-kode',
  leaderboardParticipation: 'Leaderboard Participation',
  leaderboardParticipationDesc: 'Participate in the online leaderboard and share your scores with other players',
  loadProfile: 'Indlæs onlineprofil',
},
characterCard: {
  connected: 'Forbundet',
  connectedWith: 'Forbundet: {n}',
},
profileSync: {
  title: 'Profil-synkronisering',
  uploadSuccess: 'Profil uploadet! Synkkode: {n}',
  uploadFailed: 'Upload mislykkedes',
  downloadFailed: 'Kunne ikke uploade profil',
  invalidCode: 'Indtast venligst en gyldig 8-tegns synkkode',
  syncSuccess: 'Profil synkroniseret!',
  notFound: 'Profil ikke fundet',
  profileNotFound: 'Profil ikke fundet',
  downloadFailedMsg: 'Kunne ikke downloade profil. Tjek synkkoden.',
  syncCode: 'Synkkode:',
  upload: 'Upload',
  syncCodePlaceholder: 'Synkkode',
},
playerProgression: {
  active: 'Aktiv',
  inactive: 'Inaktiv',
  progressToNext: 'Fremskridt til næste niveau',
  xpNeeded: 'XP nødvendig',
  songsPlayed: 'Sange spillet',
  goldenNotes: 'Gyldne noder',
  bestCombo: 'Bedste combo',
  totalScore: 'Total score',
  achievementsTitle: 'Præstationer',
  more: '+{n} flere',
  beginner: 'Nybegynder',
  xp: 'XP',
  lv: 'Lv. {n}',
},
achievements: {
  title: 'Præstationer',
  unlocked: 'Låst op',
  locked: 'Låst',
  progress: 'Fremskridt',
  noAchievements: 'Ingen præstationer endnu',
  playToUnlock: 'Spil sange for at låse op for præstationer!',
  rarity: 'Sjældenhed',
  common: 'Almindelig',
  uncommon: 'Uncommon',
  rare: 'Sjælden',
  epic: 'Epic',
  legendary: 'Legendarisk',
  first_note: {
    name: 'Første node',
    description: 'Ram din første node',
  },
  perfect_ten: {
    name: 'Perfect Ten',
    description: 'Få 10 Perfect-hit i én sang',
  },
  combo_master: {
    name: 'Kombo-mester',
    description: 'Opnå en 50-nodes kombo',
  },
  combo_king: {
    name: 'Kombo-konge',
    description: 'Opnå en 100-nodes kombo',
  },
  combo_legend: {
    name: 'Kombo-legende',
    description: 'Opnå en 200-nodes kombo',
  },
  perfect_song: {
    name: 'Perfekt sang',
    description: 'Få 99.5%+ præcision på en sang',
  },
  accuracy_90: {
    name: 'Pitch Perfect',
    description: 'Få over 90% præcision',
  },
  score_8k: {
    name: 'Rising Star',
    description: 'Score over 8.000 point',
  },
  score_9k: {
    name: 'Score-mester',
    description: 'Score over 9.000 point',
  },
  score_9500: {
    name: 'Flawless',
    description: 'Score over 9.500 point',
  },
  golden_collector: {
    name: 'Golden Collector',
    description: 'Ram 10 gyldne noder',
  },
  golden_master: {
    name: 'Golden Master',
    description: 'Ram 50 gyldne noder',
  },
  first_song: {
    name: 'Første skridt',
    description: 'Gennemfør din første sang',
  },
  ten_songs: {
    name: 'Karaoke-entusiast',
    description: 'Gennemfør 10 sange',
  },
  fifty_songs: {
    name: 'Karaoke-regular',
    description: 'Gennemfør 50 sange',
  },
  hundred_songs: {
    name: 'Karaoke-legende',
    description: 'Gennemfør 100 sange',
  },
  five_games: {
    name: 'Kom godt i gang',
    description: 'Spil 5 spil',
  },
  twenty_games: {
    name: 'Dedikeret sanger',
    description: 'Spil 20 spil',
  },
  party_time: {
    name: 'Party Time!',
    description: 'Spil en party-tilstand',
  },
  duel_winner: {
    name: 'Duel-mester',
    description: 'Vind en duel',
  },
  pass_the_mic: {
    name: 'Pass the Mic!',
    description: 'Spil Pass the Mic-tilstand',
  },
  shower_singer: {
    name: 'Brusesanger',
    description: 'Score under 20% på en sang',
  },
  comeback_king: {
    name: 'Comeback-konge',
    description: 'Få en kombo på 50+ efter at have misset 10 noder',
  },
  speed_demon: {
    name: 'Speed Demon',
    description: 'Gennemfør en sang i 1.5x hastighed',
  },
  blind_master: {
    name: 'Blind-mester',
    description: 'Gennemfør en sang i Blind Karaoke-tilstand',
  },
  daily_starter: {
    name: 'Daglig begynder',
    description: 'Gennemfør din første daglige udfordring',
  },
  daily_regular: {
    name: 'Daglig stammis',
    description: 'Gennemfør 10 daglige udfordringer',
  },
  daily_devoted: {
    name: 'Daglig hengiven',
    description: 'Gennemfør 50 daglige udfordringer',
  },
  streak_week: {
    name: 'Ild og flamme',
    description: 'Oprethold en 7-dages daglig streak',
  },
  streak_month: {
    name: 'Ustoppelig',
    description: 'Oprethold en 30-dages daglig streak',
  },
  weekly_warrior: {
    name: 'Ugekriger',
    description: 'Gennemfør 5 ugentlige udfordringer',
  },
  accuracy_95: {
    name: 'Præcisionssanger',
    description: 'Få over 95% præcision',
  },
  golden_rush: {
    name: 'Guldrush',
    description: 'Ram 20 gyldne noder i én enkelt sang',
  },
  golden_hundred: {
    name: 'Gylden centurion',
    description: 'Ram i alt 100 gyldne noder',
  },
  perfect_fifty: {
    name: 'Perfekte halvtreds',
    description: 'Ram 50 perfekte noder i én enkelt sang',
  },
  lightning_lips: {
    name: 'Lynlæber',
    description: 'Gennemfør en sang med 2x hastighed',
  },
  duet_harmony: {
    name: 'Perfekt harmoni',
    description: 'Syng 10 duetter',
  },
  genre_explorer: {
    name: 'Genreudforsker',
    description: 'Syng sange fra 5 forskellige genrer',
  },
  disney_fan: {
    name: 'Disney-fan',
    description: 'Syng 10 Disney-sange',
  },
  night_owl: {
    name: 'Natugle',
    description: 'Gennemfør en sang mellem midnat og kl. 4',
  },
  early_bird: {
    name: 'Morgenfugl',
    description: 'Gennemfør en sang før kl. 8',
  },
  marathon_singer: {
    name: 'Marathonsanger',
    description: 'Spil 5 spil på én enkelt dag',
  },

  // ── Udvidelse til 100 præstationer ──
  score_9800: {
    name: 'Ultra-stjerne',
    description: 'Score over 9.800 point',
  },
  score_9900: {
    name: 'Hinsides perfektion',
    description: 'Score over 9.900 point',
  },
  combo_300: {
    name: 'Kombo-titan',
    description: 'Opnå en 300-nodes kombo',
  },
  combo_500: {
    name: 'Kombo-udødelig',
    description: 'Opnå en 500-nodes kombo',
  },
  accuracy_92: {
    name: 'Finjustering',
    description: 'Få over 92% præcision',
  },
  accuracy_94: {
    name: 'Studiokvalitet',
    description: 'Få over 94% præcision',
  },
  accuracy_96: {
    name: 'Skarpskytte',
    description: 'Få over 96% præcision',
  },
  accuracy_97: {
    name: 'Laserpræcision',
    description: 'Få over 97% præcision',
  },
  accuracy_98: {
    name: 'Virtuos',
    description: 'Få over 98% præcision',
  },
  perfect_75: {
    name: 'Perfekte femoghalvfjerds',
    description: 'Ram 75 perfekte noder i én enkelt sang',
  },
  perfect_100: {
    name: 'Perfekt centurion',
    description: 'Ram 100 perfekte noder i én enkelt sang',
  },
  perfect_150: {
    name: 'Perfekt storm',
    description: 'Ram 150 perfekte noder i én enkelt sang',
  },
  golden_30: {
    name: 'Gylden tidevand',
    description: 'Ram 30 gyldne noder i én enkelt sang',
  },
  golden_40: {
    name: 'Gylden symfoni',
    description: 'Ram 40 gyldne noder i én enkelt sang',
  },
  perfect_500: {
    name: 'Perfekt maskine',
    description: 'Ram i alt 500 perfekte noder',
  },
  perfect_1000: {
    name: 'Præcisionskanon',
    description: 'Ram i alt 1.000 perfekte noder',
  },
  perfect_5000: {
    name: 'Perfekt lavine',
    description: 'Ram i alt 5.000 perfekte noder',
  },
  perfect_10000: {
    name: 'Perfekte titusinde',
    description: 'Ram i alt 10.000 perfekte noder',
  },
  golden_250: {
    name: 'Gylden høst',
    description: 'Ram i alt 250 gyldne noder',
  },
  golden_1000: {
    name: 'Gylden skybrud',
    description: 'Ram i alt 1.000 gyldne noder',
  },
  golden_5000: {
    name: 'Midas-stemme',
    description: 'Ram i alt 5.000 gyldne noder',
  },
  songs_250: {
    name: 'Sangbogs-veteran',
    description: 'Gennemfør 250 sange',
  },
  songs_500: {
    name: 'Halvtusind-klubben',
    description: 'Gennemfør 500 sange',
  },
  songs_1000: {
    name: 'Tusindsangs-legende',
    description: 'Gennemfør 1.000 sange',
  },
  games_50: {
    name: 'Hyppig sanger',
    description: 'Spil 50 spil',
  },
  games_100: {
    name: 'Hundrede-klubben',
    description: 'Spil 100 spil',
  },
  games_250: {
    name: 'Arkade-stammis',
    description: 'Spil 250 spil',
  },
  games_500: {
    name: 'Marathon-maniak',
    description: 'Spil 500 spil',
  },
  level_25: {
    name: 'Erfaren sanger',
    description: 'Nå niveau 25',
  },
  level_50: {
    name: 'Elite-vokalist',
    description: 'Nå niveau 50',
  },
  level_100: {
    name: 'Niveau 100-legende',
    description: 'Nå niveau 100',
  },
  daily_100: {
    name: 'Daglig centurion',
    description: 'Gennemfør 100 daglige udfordringer',
  },
  daily_250: {
    name: 'Daglig fanatiker',
    description: 'Gennemfør 250 daglige udfordringer',
  },
  daily_500: {
    name: 'Daglig udødelig',
    description: 'Gennemfør 500 daglige udfordringer',
  },
  streak_60: {
    name: 'Jernvilje',
    description: 'Oprethold en 60-dages daglig streak',
  },
  streak_100: {
    name: 'Hundrede dages helt',
    description: 'Oprethold en 100-dages daglig streak',
  },
  streak_180: {
    name: 'Halvårs-hengivenhed',
    description: 'Oprethold en 180-dages daglig streak',
  },
  streak_365: {
    name: 'Årlig legende',
    description: 'Oprethold en 365-dages daglig streak',
  },
  weekly_15: {
    name: 'Ugentlig trofast',
    description: 'Gennemfør 15 ugentlige udfordringer',
  },
  weekly_30: {
    name: 'Ugentlig søjle',
    description: 'Gennemfør 30 ugentlige udfordringer',
  },
  weekly_52: {
    name: 'Et år af uger',
    description: 'Gennemfør 52 ugentlige udfordringer',
  },
  encore_10: {
    name: 'Ekstranummer!',
    description: 'Spil 10 spil på én enkelt dag',
  },
  duets_25: {
    name: 'Duet-hengiven',
    description: 'Syng 25 duetter',
  },
  duets_50: {
    name: 'Dynamisk duo',
    description: 'Syng 50 duetter',
  },
  duets_100: {
    name: 'Duet-centurion',
    description: 'Syng 100 duetter',
  },
  duels_5: {
    name: 'Duelist',
    description: 'Vind 5 dueller',
  },
  duels_10: {
    name: 'Duel-ekspert',
    description: 'Vind 10 dueller',
  },
  duels_25: {
    name: 'Duel-overherre',
    description: 'Vind 25 dueller',
  },
  party_10: {
    name: 'Festdyr',
    description: 'Spil 10 party-spil',
  },
  party_25: {
    name: 'Festens midtpunkt',
    description: 'Spil 25 party-spil',
  },
  party_50: {
    name: 'Fest-legende',
    description: 'Spil 50 party-spil',
  },
  disney_25: {
    name: 'Disney-entusiast',
    description: 'Syng 25 Disney-sange',
  },
  disney_50: {
    name: 'Der var engang en sang',
    description: 'Syng 50 Disney-sange',
  },
  genres_8: {
    name: 'Genre-vandrer',
    description: 'Syng sange fra 8 forskellige genrer',
  },
  genres_10: {
    name: 'Genre-kender',
    description: 'Syng sange fra 10 forskellige genrer',
  },
  clean_sheet: {
    name: 'Holdt nullet',
    description: 'Gennemfør en sang med 50+ noder og ingen misser',
  },
  weekend_singer: {
    name: 'Weekend-sanger',
    description: 'Gennemfør en sang på en lørdag eller søndag',
  },
  lunch_break: {
    name: 'Frokostpause',
    description: 'Gennemfør en sang mellem kl. 12 og 14',
  },
},
achievementsScreen: {
  title: '🏆 Præstationer',
  description: 'Lås op for præstationer ved at spille!',
  unlocked: 'Låst op',
  xpEarned: 'XP optjent',
  completion: 'Gennemførelse',
  all: 'Alle',
  categories: {
    performance: 'præstation',
    progression: 'fremskridt',
    social: 'social',
    special: 'speciel',
  },
  plusXp: '+{n} XP',
  locked: 'Låst',
  viewPlayer: 'Præstationer for',
  viewingOther: 'Du ser præstationerne for {n}. Hver spiller låser sine egne præstationer op.',
  noMatches: 'Ingen præstationer matcher disse filtre',
},
badgeNames: {
  'first-challenge': 'Første Skridt',
  'week-warrior': 'Ugekriger',
  'fortnight-fighter': 'Fjortendageskriger',
  'monthly-master': 'Månedsmester',
  'top-3': 'Podieplacering',
  champion: 'Daglig Mester',
  dedicated: 'Dedikeret Sanger',
  legendary: 'Legendarisk Status',
  'century-champion': 'Århundremester',
  'yearly-legend': 'Årlig Legende',
  explorer: 'Udfordringsudforsker',
  songbird: 'Sangfugl',
  'weekly-warrior-q': 'Ugekriger',
},
badgeDescriptions: {
  'first-challenge': 'Gennemfør din første daglige udfordring',
  'week-warrior': 'Oprethold en 7-dages streak',
  'fortnight-fighter': 'Oprethold en 14-dages streak',
  'monthly-master': 'Oprethold en 30-dages streak',
  'top-3': 'Nå top 3 i en daglig udfordring',
  champion: 'Vind en daglig udfordring',
  dedicated: 'Gennemfør 30 daglige udfordringer',
  legendary: 'Nå 10.000 total XP',
  'century-champion': 'Oprethold en 100-dages streak',
  'yearly-legend': 'Oprethold en 365-dages streak',
  explorer: 'Spil 5 forskellige udfordringstilstande',
  songbird: 'Gennemfør 10 sange i alt',
  'weekly-warrior-q': 'Gennemfør 3 ugentlige udfordringer',
},
mobileAchievements: {
  first_song: {
    title: 'Første skridt',
    description: 'Syng din første sang',
  },
  ten_songs: {
    title: 'Rising Star',
    description: 'Syng 10 sange',
  },
  fifty_songs: {
    title: 'Veteran',
    description: 'Syng 50 sange',
  },
  perfect_score: {
    title: 'Perfektionist',
    description: 'Få en perfekt score (95%+)',
  },
  five_perfect: {
    title: 'Flawless',
    description: 'Få 5 perfekte scores',
  },
  high_score: {
    title: 'Score-mester',
    description: 'Nå 10.000 point i alt',
  },
  queue_5: {
    title: 'Spilleliste-bygger',
    description: 'Sæt 5 sange i kø',
  },
  genre_3: {
    title: 'Genre-udforsker',
    description: 'Syng sange fra 3 genrer',
  },
},
challenges: {
  requirements: {
    minLevel: 'Kræver level {required} (du er level {current})',
    minSongs: 'Kræver {required} sange gennemført (du har {current})',
    achievement: 'Kræver achievement: {name}',
    rankNoXP: 'Rank-krav kan ikke verificeres (ingen XP-data tilgængelig)',
    unknownRank: 'Ukendt rank "{name}"',
    rankRequired: 'Kræver rank "{required}" (du er "{current}")',
  },
},
};
