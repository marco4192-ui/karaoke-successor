// NO translations — profile

export const profileTranslations = {
profile: {
  title: 'Profiler',
  createCharacter: 'Opprett profil',
  name: 'Navn',
  namePlaceholder: 'Profilnavn...',
  country: 'Land',
  countryOptional: 'Velg land (valgfritt)',
  avatar: 'Avatar',
  uploadPhoto: 'Last opp bilde',
  create: 'Opprett',
  edit: 'Rediger',
  delete: 'Slett',
  active: 'Aktiv',
  selectAsActive: 'Velg som aktiv',
  noCharacters: 'Ingen profiler ennå',
  noCharactersDesc: 'Opprett en profil for å spore poengene og fremgangen din!',
  showOnLeaderboard: 'Vis på ledertavle',
  showPhoto: 'Vis bilde',
  photoUploaded: 'Bilde lastet opp',
  noPhoto: 'Ingen bilde',
  privacyHint: 'Your scores will be uploaded to the global leaderboard.',
  privacyHintDesc: 'You can opt out at any time in Profile Settings.',
  storageMode: {
    title: 'Profillagring',
    local: 'Kun lokalt',
    localDesc: 'Alle data forblir på denne enheten — ingen online ledertavle, ingen synkronisering.',
    online: 'Online-profil',
    onlineDesc: 'Bli med på online-ledertavlen, synkroniser på tvers av enheter og del daglige resultater.',
    localShort: 'Lokal',
    onlineShort: 'Online',
    settingsDesc: 'Bestem om denne profilen skal delta i online-ledertavlen eller kun være lokal. Kan endres når som helst.',
  },
  countrySearch: 'Søk etter land…',
  noCountryFound: 'Ingen land funnet',
  popularCountries: 'Populære',
  allCountries: 'Alle land',
},
profileAuth: {
  accountTitle: 'Online-konto (valgfritt)',
  accountDesc: 'Lagre en e-post og et passord, slik at du kan laste inn denne profilen på en annen enhet. Innlogging er kun mulig inne i karaokeappen — det finnes ingen webinnlogging.',
  email: 'E-post',
  emailPlaceholder: 'din@email.com',
  emailInvalid: 'Vennligst oppgi en gyldig e-postadresse',
  emailTaken: 'Denne e-posten er allerede registrert',
  password: 'Passord',
  passwordPlaceholder: 'Minst 8 tegn',
  passwordRepeat: 'Gjenta passordet',
  passwordsDontMatch: 'Passordene samsvarer ikke',
  passwordTooShort: 'Passordet må være minst 8 tegn langt',
  registerFailed: 'Kunne ikke opprette online-kontoen',
  loginTitle: 'Last inn online-profil',
  loginDesc: 'Skriv inn e-post og passord for online-profilen din for å laste den inn på denne enheten.',
  loginButton: 'Logg inn og last inn profil',
  loginFailed: 'Innlogging mislyktes — vennligst kontroller e-post og passord',
  loginSuccess: 'Profilen «{n}» ble lastet inn!',
  noSnapshot: 'Fant ennå ingen synkroniserte profildata på serveren',
  emailNote: 'Brukes kun til innlogging — vises aldri offentlig',
  changePassword: 'Endre passord',
  currentPassword: 'Nåværende passord',
  newPassword: 'Nytt passord',
  passwordChanged: 'Passordet ble endret',
  passwordChangeFailed: 'Kunne ikke endre passordet',
  hasAccount: 'Online-konto ✓',
  registrationPending: 'Oppretter online-kontoen…',
  registrationSuccess: 'Online-konto opprettet — du kan nå logge inn på hvilken som helst enhet',
  registrationSuccessTitle: '🔐 Online-konto',
  loginSuccessTitle: '✅ {n}',
},
characterScreen: {
  title: 'Profil',
  description: 'Opprett og håndter sangerprofilene dine',
  onlineLeaderboard: 'Online ledertavle',
  createProfile: 'Opprett ny profil',
  yourProfiles: 'Dine profiler ({n})',
  noProfiles: 'Ingen profiler ennå. Klikk «Opprett ny profil» for å komme i gang!',
  settingsTitle: 'Profilinnstillinger',
  nameAndAvatar: 'Navn og avatar',
  rankDisplay: 'Rangeringsvisning',
  showRankInName: 'Vis rangering i navn',
  rankPrefix: 'Prefiks',
  rankSuffix: 'Suffiks',
  rankFull: 'Full',
  countryAndPrivacy: 'Land og personvern',
  selectCountry: 'Velg land',
  visible: 'Synlig',
  hidden: 'Skjult',
  shown: 'Vist',
  companionAppLink: 'Companion App-lenke',
  companionAppLinkDesc: 'Skann denne QR-koden for å koble direkte med denne profilen i companion-appen.',
  hideQrCode: 'Skjul QR Code',
  showQrCode: 'Vis QR Code',
  leaderboardParticipation: 'Leaderboard Participation',
  leaderboardParticipationDesc: 'Participate in the online leaderboard and share your scores with other players',
  loadProfile: 'Last inn online-profil',
},
characterCard: {
  connected: 'Tilkoblet',
  connectedWith: 'Tilkoblet: {n}',
},
profileSync: {
  title: 'Profil-synkronisering',
  uploadSuccess: 'Profil lastet opp! Synkkode: {n}',
  uploadFailed: 'Opplasting mislyktes',
  downloadFailed: 'Kunne ikke laste opp profil',
  invalidCode: 'Skriv inn en gyldig 8-tegns synkkode',
  syncSuccess: 'Profil synkronisert!',
  notFound: 'Profil ikke funnet',
  profileNotFound: 'Profil ikke funnet',
  downloadFailedMsg: 'Kunne ikke laste ned profil. Sjekk synkkoden.',
  syncCode: 'Synkkode:',
  upload: 'Last opp',
  syncCodePlaceholder: 'Synkkode',
},
playerProgression: {
  active: 'Aktiv',
  inactive: 'Inaktiv',
  progressToNext: 'Fremgang til neste nivå',
  xpNeeded: 'XP nødvendig',
  songsPlayed: 'Sanger spilt',
  goldenNotes: 'Gylne noter',
  bestCombo: 'Beste Combo',
  totalScore: 'Total poengsum',
  achievementsTitle: 'Prestasjoner',
  more: '+{n} flere',
  beginner: 'Nybegynner',
  xp: 'XP',
  lv: 'Nivå {n}',
},
achievements: {
  title: 'Prestasjoner',
  unlocked: 'Låst opp',
  locked: 'Låst',
  progress: 'Fremgang',
  noAchievements: 'Ingen prestasjoner ennå',
  playToUnlock: 'Spill sanger for å låse opp prestasjoner!',
  rarity: 'Sjeldenhet',
  common: 'Vanlig',
  uncommon: 'Uvanlig',
  rare: 'Sjelden',
  epic: 'Episk',
  legendary: 'Legendarisk',
  first_note: {
    name: 'Første note',
    description: 'Treff din første note',
  },
  perfect_ten: {
    name: 'Perfekte ti',
    description: 'Få 10 Perfekt-treff i én sang',
  },
  combo_master: {
    name: 'Kombo-mester',
    description: 'Få en 50 notes kombinasjon',
  },
  combo_king: {
    name: 'Kombo-konge',
    description: 'Få en 100 notes kombinasjon',
  },
  combo_legend: {
    name: 'Kombo-legende',
    description: 'Få en 200 notes kombinasjon',
  },
  perfect_song: {
    name: 'Perfekt sang',
    description: 'Få 99.5%+ presisjon på en sang',
  },
  accuracy_90: {
    name: 'Pitch Perfect',
    description: 'Få over 90% presisjon',
  },
  score_8k: {
    name: 'Rising Star',
    description: 'Få over 8 000 poeng',
  },
  score_9k: {
    name: 'Poengmester',
    description: 'Få over 9 000 poeng',
  },
  score_9500: {
    name: 'Feilfritt',
    description: 'Få over 9 500 poeng',
  },
  golden_collector: {
    name: 'Gullsamler',
    description: 'Treff 10 gullnoter',
  },
  golden_master: {
    name: 'Gullmester',
    description: 'Treff 50 gullnoter',
  },
  first_song: {
    name: 'Første skritt',
    description: 'Fullfør din første sang',
  },
  ten_songs: {
    name: 'Karaoke-entusiast',
    description: 'Fullfør 10 sanger',
  },
  fifty_songs: {
    name: 'Karaoke-stamgjest',
    description: 'Fullfør 50 sanger',
  },
  hundred_songs: {
    name: 'Karaoke-legende',
    description: 'Fullfør 100 sanger',
  },
  five_games: {
    name: 'I gang',
    description: 'Spill 5 spill',
  },
  twenty_games: {
    name: 'Dedikert sanger',
    description: 'Spill 20 spill',
  },
  party_time: {
    name: 'Party-tid!',
    description: 'Spill en partymodus',
  },
  duel_winner: {
    name: 'Duel-mester',
    description: 'Vinn en duelkamp',
  },
  pass_the_mic: {
    name: 'Gi videre mikken!',
    description: 'Spill Gi videre mikken-modus',
  },
  shower_singer: {
    name: 'Dusjsanger',
    description: 'Få under 20% poeng på en sang',
  },
  comeback_king: {
    name: 'Comeback-kongen',
    description: 'Få en kombo på 50+ etter å ha bommet på 10 noter',
  },
  speed_demon: {
    name: 'Fartsdjevel',
    description: 'Fullfør en sang i 1.5x hastighet',
  },
  blind_master: {
    name: 'Blind-mester',
    description: 'Fullfør en sang i Blind karaoke-modus',
  },
  daily_starter: {
    name: 'Daglig nybegynner',
    description: 'Fullfør din første daglige utfordring',
  },
  daily_regular: {
    name: 'Daglig stamgjest',
    description: 'Fullfør 10 daglige utfordringer',
  },
  daily_devoted: {
    name: 'Daglig dedikert',
    description: 'Fullfør 50 daglige utfordringer',
  },
  streak_week: {
    name: 'I fyr og flamme',
    description: 'Hold en 7-dagers daglig streak',
  },
  streak_month: {
    name: 'Ustoppelig',
    description: 'Hold en 30-dagers daglig streak',
  },
  weekly_warrior: {
    name: 'Ukekriger',
    description: 'Fullfør 5 ukentlige utfordringer',
  },
  accuracy_95: {
    name: 'Presisjonssanger',
    description: 'Få over 95% presisjon',
  },
  golden_rush: {
    name: 'Gullrush',
    description: 'Treff 20 gylne toner i én enkelt sang',
  },
  golden_hundred: {
    name: 'Gyllen centurion',
    description: 'Treff totalt 100 gylne toner',
  },
  perfect_fifty: {
    name: 'Perfekte femti',
    description: 'Treff 50 perfekte toner i én enkelt sang',
  },
  lightning_lips: {
    name: 'Lynlepper',
    description: 'Fullfør en sang med 2x hastighet',
  },
  duet_harmony: {
    name: 'Perfekt harmoni',
    description: 'Syng 10 duetter',
  },
  genre_explorer: {
    name: 'Sjangerutforsker',
    description: 'Syng sanger fra 5 forskjellige sjangere',
  },
  disney_fan: {
    name: 'Disney-fan',
    description: 'Syng 10 Disney-sanger',
  },
  night_owl: {
    name: 'Nattugle',
    description: 'Fullfør en sang mellom midnatt og klokken 04',
  },
  early_bird: {
    name: 'Morgenfugl',
    description: 'Fullfør en sang før klokken 08',
  },
  marathon_singer: {
    name: 'Maratonsanger',
    description: 'Spill 5 spill på én enkelt dag',
  },

  // ── Utvidelse til 100 prestasjoner ──
  score_9800: {
    name: 'Ultrastjerne',
    description: 'Få over 9 800 poeng',
  },
  score_9900: {
    name: 'Forbi det perfekte',
    description: 'Få over 9 900 poeng',
  },
  combo_300: {
    name: 'Kombotitan',
    description: 'Få en 300 notes kombinasjon',
  },
  combo_500: {
    name: 'Udødelig kombo',
    description: 'Få en 500 notes kombinasjon',
  },
  accuracy_92: {
    name: 'Finstilling',
    description: 'Få over 92% presisjon',
  },
  accuracy_94: {
    name: 'Studiokvalitet',
    description: 'Få over 94% presisjon',
  },
  accuracy_96: {
    name: 'Skarpskytter',
    description: 'Få over 96% presisjon',
  },
  accuracy_97: {
    name: 'Laserpresisjon',
    description: 'Få over 97% presisjon',
  },
  accuracy_98: {
    name: 'Virtuos',
    description: 'Få over 98% presisjon',
  },
  perfect_75: {
    name: 'Perfekte syttifem',
    description: 'Treff 75 perfekte toner i én enkelt sang',
  },
  perfect_100: {
    name: 'Perfekte hundre',
    description: 'Treff 100 perfekte toner i én enkelt sang',
  },
  perfect_150: {
    name: 'Perfekt storm',
    description: 'Treff 150 perfekte toner i én enkelt sang',
  },
  golden_30: {
    name: 'Gullflod',
    description: 'Treff 30 gullnoter i én enkelt sang',
  },
  golden_40: {
    name: 'Gullsymfoni',
    description: 'Treff 40 gullnoter i én enkelt sang',
  },
  perfect_500: {
    name: 'Perfekt maskin',
    description: 'Treff totalt 500 perfekte toner',
  },
  perfect_1000: {
    name: 'Presisjonskraftsentrum',
    description: 'Treff totalt 1 000 perfekte toner',
  },
  perfect_5000: {
    name: 'Perfekt snøras',
    description: 'Treff totalt 5 000 perfekte toner',
  },
  perfect_10000: {
    name: 'Perfekte titusen',
    description: 'Treff totalt 10 000 perfekte toner',
  },
  golden_250: {
    name: 'Gullhøst',
    description: 'Treff totalt 250 gullnoter',
  },
  golden_1000: {
    name: 'Gullregn',
    description: 'Treff totalt 1 000 gullnoter',
  },
  golden_5000: {
    name: 'Midas-stemme',
    description: 'Treff totalt 5 000 gullnoter',
  },
  songs_250: {
    name: 'Sangbok-veteran',
    description: 'Fullfør 250 sanger',
  },
  songs_500: {
    name: 'Halvtusen-klubben',
    description: 'Fullfør 500 sanger',
  },
  songs_1000: {
    name: 'Tusen-sang-legende',
    description: 'Fullfør 1 000 sanger',
  },
  games_50: {
    name: 'Hyppig sanger',
    description: 'Spill 50 spill',
  },
  games_100: {
    name: 'Hundre-klubben',
    description: 'Spill 100 spill',
  },
  games_250: {
    name: 'Arcade-stamgjest',
    description: 'Spill 250 spill',
  },
  games_500: {
    name: 'Maratonmaniac',
    description: 'Spill 500 spill',
  },
  level_25: {
    name: 'Erfaren sanger',
    description: 'Nå nivå 25',
  },
  level_50: {
    name: 'Elitesanger',
    description: 'Nå nivå 50',
  },
  level_100: {
    name: 'Nivå 100-legende',
    description: 'Nå nivå 100',
  },
  daily_100: {
    name: 'Daglig centurion',
    description: 'Fullfør 100 daglige utfordringer',
  },
  daily_250: {
    name: 'Daglig diehard',
    description: 'Fullfør 250 daglige utfordringer',
  },
  daily_500: {
    name: 'Daglig udødelig',
    description: 'Fullfør 500 daglige utfordringer',
  },
  streak_60: {
    name: 'Jernvilje',
    description: 'Hold en 60-dagers daglig streak',
  },
  streak_100: {
    name: 'Hundre dagers helt',
    description: 'Hold en 100-dagers daglig streak',
  },
  streak_180: {
    name: 'Et halvt års hengivenhet',
    description: 'Hold en 180-dagers daglig streak',
  },
  streak_365: {
    name: 'Årlig legende',
    description: 'Hold en 365-dagers daglig streak',
  },
  weekly_15: {
    name: 'Ukentlig støttespiller',
    description: 'Fullfør 15 ukentlige utfordringer',
  },
  weekly_30: {
    name: 'Ukentlig bærebjelke',
    description: 'Fullfør 30 ukentlige utfordringer',
  },
  weekly_52: {
    name: 'Et år med uker',
    description: 'Fullfør 52 ukentlige utfordringer',
  },
  encore_10: {
    name: 'Om igjen!',
    description: 'Spill 10 spill på én enkelt dag',
  },
  duets_25: {
    name: 'Duett-entusiast',
    description: 'Syng 25 duetter',
  },
  duets_50: {
    name: 'Dynamisk duo',
    description: 'Syng 50 duetter',
  },
  duets_100: {
    name: 'Duett-hundre',
    description: 'Syng 100 duetter',
  },
  duels_5: {
    name: 'Duelant',
    description: 'Vinn 5 dueler',
  },
  duels_10: {
    name: 'Duel-mester',
    description: 'Vinn 10 dueler',
  },
  duels_25: {
    name: 'Duel-overherre',
    description: 'Vinn 25 dueler',
  },
  party_10: {
    name: 'Festdyr',
    description: 'Spill 10 partyspill',
  },
  party_25: {
    name: 'Sjelen i selskapet',
    description: 'Spill 25 partyspill',
  },
  party_50: {
    name: 'Fest-legende',
    description: 'Spill 50 partyspill',
  },
  disney_25: {
    name: 'Disney-entusiast',
    description: 'Syng 25 Disney-sanger',
  },
  disney_50: {
    name: 'Det var en gang en sang',
    description: 'Syng 50 Disney-sanger',
  },
  genres_8: {
    name: 'Sjangervandrer',
    description: 'Syng sanger fra 8 forskjellige sjangere',
  },
  genres_10: {
    name: 'Sjangerkjenner',
    description: 'Syng sanger fra 10 forskjellige sjangere',
  },
  clean_sheet: {
    name: 'Ren bols',
    description: 'Fullfør en sang med 50+ noter og null bommer',
  },
  weekend_singer: {
    name: 'Helgesanger',
    description: 'Fullfør en sang på lørdag eller søndag',
  },
  lunch_break: {
    name: 'Lunsjpause',
    description: 'Fullfør en sang mellom klokken 12 og 14',
  },
},
achievementsScreen: {
  title: '🏆 Prestasjoner',
  description: 'Lås opp prestasjoner ved å spille!',
  unlocked: 'Låst opp',
  xpEarned: 'XP tjent',
  completion: 'Fullføring',
  all: 'Alle',
  categories: {
    performance: 'prestasjon',
    progression: 'fremgang',
    social: 'sosialt',
    special: 'spesielt',
  },
  plusXp: '+{n} XP',
  locked: 'Låst',
  viewPlayer: 'Prestasjoner for',
  viewingOther: 'Du ser prestasjonene til {n}. Hver spiller låser opp sine egne prestasjoner.',
  noMatches: 'Ingen prestasjoner samsvarer med disse filtrene',
},
badgeNames: {
  'first-challenge': 'Første Skritt',
  'week-warrior': 'Ukekriger',
  'fortnight-fighter': 'Fjortendagerskriger',
  'monthly-master': 'Månedsmester',
  'top-3': 'Plass på pallen',
  champion: 'Daglig Mester',
  dedicated: 'Dedikert Sanger',
  legendary: 'Legendarisk Status',
  'century-champion': 'Århundremester',
  'yearly-legend': 'Årlig Legende',
  explorer: 'Utfordringsutforsker',
  songbird: 'Sangfugl',
  'weekly-warrior-q': 'Ukekriger',
},
badgeDescriptions: {
  'first-challenge': 'Fullfør din første daglige utfordring',
  'week-warrior': 'Oppretthold en 7-dagers rekke',
  'fortnight-fighter': 'Oppretthold en 14-dagers rekke',
  'monthly-master': 'Oppretthold en 30-dagers rekke',
  'top-3': 'Nå topp 3 i en daglig utfordring',
  champion: 'Vinn en daglig utfordring',
  dedicated: 'Fullfør 30 daglige utfordringer',
  legendary: 'Nå 10 000 total XP',
  'century-champion': 'Oppretthold en 100-dagers rekke',
  'yearly-legend': 'Oppretthold en 365-dagers rekke',
  explorer: 'Spill 5 forskjellige utfordringsmoduser',
  songbird: 'Fullfør 10 sanger totalt',
  'weekly-warrior-q': 'Fullfør 3 ukentlige utfordringer',
},
mobileAchievements: {
  first_song: {
    title: 'Første skritt',
    description: 'Syng din første sang',
  },
  ten_songs: {
    title: 'Rising Star',
    description: 'Syng 10 sanger',
  },
  fifty_songs: {
    title: 'Veteran',
    description: 'Syng 50 sanger',
  },
  perfect_score: {
    title: 'Perfeksjonist',
    description: 'Få et perfekt resultat (95%+)',
  },
  five_perfect: {
    title: 'Feilfritt',
    description: 'Få 5 perfekte resultater',
  },
  high_score: {
    title: 'Poengmester',
    description: 'Nå 10 000 totale poeng',
  },
  queue_5: {
    title: 'Spillelistebygger',
    description: 'Legg 5 sanger i kø',
  },
  genre_3: {
    title: 'Sjangerutforsker',
    description: 'Syng sanger fra 3 sjangere',
  },
},
challenges: {
  requirements: {
    minLevel: 'Krever nivå {required} (du er nivå {current})',
    minSongs: 'Krever {required} fullførte sanger (du har {current})',
    achievement: 'Krever prestasjon: {name}',
    rankNoXP: 'Rangkravet kan ikke verifiseres (ingen XP-data tilgjengelig)',
    unknownRank: 'Ukjent rang "{name}"',
    rankRequired: 'Krever rang "{required}" (du er "{current}")',
  },
},
};
