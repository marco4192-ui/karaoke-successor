// NL translations — profile

export const profileTranslations = {
profile: {
  title: 'Profielen',
  createCharacter: 'Profiel aanmaken',
  name: 'Naam',
  namePlaceholder: 'Profielnaam...',
  country: 'Land',
  countryOptional: 'Selecteer land (optioneel)',
  avatar: 'Avatar',
  uploadPhoto: 'Foto uploaden',
  create: 'Aanmaken',
  edit: 'Bewerken',
  delete: 'Verwijderen',
  active: 'Actief',
  selectAsActive: 'Als actief selecteren',
  noCharacters: 'Nog geen profielen',
  noCharactersDesc: 'Maak een profiel aan om je scores en voortgang bij te houden!',
  showOnLeaderboard: 'Tonen op leaderboard',
  showPhoto: 'Foto tonen',
  photoUploaded: 'Foto geüpload',
  noPhoto: 'Geen foto',
  privacyHint: 'Your scores will be uploaded to the global leaderboard.',
  privacyHintDesc: 'You can opt out at any time in Profile Settings.',
  storageMode: {
    title: 'Profielopslag',
    local: 'Alleen lokaal',
    localDesc: 'Alle gegevens blijven op dit apparaat — geen online ranglijst, geen synchronisatie.',
    online: 'Onlineprofiel',
    onlineDesc: 'Doe mee aan de online ranglijst, synchroniseer tussen apparaten en deel dagelijkse resultaten.',
    localShort: 'Lokaal',
    onlineShort: 'Online',
    settingsDesc: 'Bepaal of dit profiel meedoet aan de online ranglijst of alleen lokaal blijft. Altijd aan te passen.',
  },
  countrySearch: 'Land zoeken…',
  noCountryFound: 'Geen land gevonden',
  popularCountries: 'Populair',
  allCountries: 'Alle landen',
},
profileAuth: {
  accountTitle: 'Online account (optioneel)',
  accountDesc: 'Sla een e-mailadres en wachtwoord op, zodat je dit profiel op een ander apparaat kunt laden. Inloggen kan alleen binnen de karaoke-app — er is geen weblogin.',
  email: 'E-mail',
  emailPlaceholder: 'jouw@email.com',
  emailInvalid: 'Voer een geldig e-mailadres in',
  emailTaken: 'Dit e-mailadres is al geregistreerd',
  password: 'Wachtwoord',
  passwordPlaceholder: 'Minimaal 8 tekens',
  passwordRepeat: 'Herhaal wachtwoord',
  passwordsDontMatch: 'De wachtwoorden komen niet overeen',
  passwordTooShort: 'Het wachtwoord moet minimaal 8 tekens lang zijn',
  registerFailed: 'Het online account kon niet worden aangemaakt',
  loginTitle: 'Onlineprofiel laden',
  loginDesc: 'Voer het e-mailadres en wachtwoord van je onlineprofiel in om het op dit apparaat te laden.',
  loginButton: 'Inloggen & profiel laden',
  loginFailed: 'Inloggen mislukt — controleer je e-mailadres en wachtwoord',
  loginSuccess: 'Profiel "{n}" succesvol geladen!',
  noSnapshot: 'Er zijn nog geen gesynchroniseerde profielgegevens op de server gevonden',
  emailNote: 'Wordt alleen gebruikt om in te loggen — nooit openbaar getoond',
  changePassword: 'Wachtwoord wijzigen',
  currentPassword: 'Huidig wachtwoord',
  newPassword: 'Nieuw wachtwoord',
  passwordChanged: 'Wachtwoord succesvol gewijzigd',
  passwordChangeFailed: 'Het wachtwoord kon niet worden gewijzigd',
  hasAccount: 'Online account ✓',
  registrationPending: 'Online account wordt aangemaakt…',
  registrationSuccess: 'Online account aangemaakt — je kunt nu op elk apparaat inloggen',
  registrationSuccessTitle: '🔐 Online account',
  loginSuccessTitle: '✅ {n}',
},
characterScreen: {
  title: 'Profiel',
  description: 'Maak en beheer je zangersprofielen',
  onlineLeaderboard: 'Online Leaderboard',
  createProfile: 'Nieuw profiel aanmaken',
  yourProfiles: 'Je profielen ({n})',
  noProfiles: 'Nog geen profielen. Klik op "Nieuw profiel aanmaken" om te beginnen!',
  settingsTitle: 'Profielinstellingen',
  nameAndAvatar: 'Naam & Avatar',
  rankDisplay: 'Rangweergave',
  showRankInName: 'Rang in naam tonen',
  rankPrefix: 'Voorvoegsel',
  rankSuffix: 'Achtervoegsel',
  rankFull: 'Volledig',
  countryAndPrivacy: 'Land & Privacy',
  selectCountry: 'Selecteer land',
  visible: 'Zichtbaar',
  hidden: 'Verborgen',
  shown: 'Getoond',
  companionAppLink: 'Companion App-link',
  companionAppLinkDesc: 'Scan deze QR-code om direct verbinding te maken met dit profiel in de companion-app.',
  hideQrCode: 'QR Code verbergen',
  showQrCode: 'QR Code tonen',
  leaderboardParticipation: 'Leaderboard Participation',
  leaderboardParticipationDesc: 'Participate in the online leaderboard and share your scores with other players',
  loadProfile: 'Onlineprofiel laden',
},
characterCard: {
  connected: 'Verbonden',
  connectedWith: 'Verbonden: {n}',
},
profileSync: {
  title: 'Profielsynchronisatie',
  uploadSuccess: 'Profiel geüpload! Sync-code: {n}',
  uploadFailed: 'Uploaden mislukt',
  downloadFailed: 'Profiel uploaden mislukt',
  invalidCode: 'Voer een geldige 8-teken sync-code in',
  syncSuccess: 'Profiel succesvol gesynchroniseerd!',
  notFound: 'Profiel niet gevonden',
  profileNotFound: 'Profiel niet gevonden',
  downloadFailedMsg: 'Profiel downloaden mislukt. Controleer de sync-code.',
  syncCode: 'Sync-code:',
  upload: 'Uploaden',
  syncCodePlaceholder: 'Sync-code',
},
playerProgression: {
  active: 'Actief',
  inactive: 'Inactief',
  progressToNext: 'Voortgang naar volgend niveau',
  xpNeeded: 'XP nodig',
  songsPlayed: 'Nummers gespeeld',
  goldenNotes: 'Gouden noten',
  bestCombo: 'Beste Combo',
  totalScore: 'Totale score',
  achievementsTitle: 'Prestaties',
  more: '+{n} meer',
  beginner: 'Beginner',
  xp: 'XP',
  lv: 'Lv. {n}',
},
achievements: {
  title: 'Prestaties',
  unlocked: 'Ontgrendeld',
  locked: 'Vergrendeld',
  progress: 'Voortgang',
  noAchievements: 'Nog geen prestaties',
  playToUnlock: 'Speel nummers om prestaties te ontgrendelen!',
  rarity: 'Zeldzaamheid',
  common: 'Gewoon',
  uncommon: 'Ongebruikelijk',
  rare: 'Zeldzaam',
  epic: 'Episch',
  legendary: 'Legendair',
  first_note: {
    name: 'Eerste noot',
    description: 'Raak je eerste noot',
  },
  perfect_ten: {
    name: 'Perfecte Tien',
    description: 'Krijg 10 Perfecte hits in één nummer',
  },
  combo_master: {
    name: 'Combo Master',
    description: 'Behaal een combo van 50 noten',
  },
  combo_king: {
    name: 'Combo King',
    description: 'Behaal een combo van 100 noten',
  },
  combo_legend: {
    name: 'Combo Legende',
    description: 'Behaal een combo van 200 noten',
  },
  perfect_song: {
    name: 'Perfect Nummer',
    description: 'Behaal 99,5%+ nauwkeurigheid op een nummer',
  },
  accuracy_90: {
    name: 'Pitch Perfect',
    description: 'Behaal meer dan 90% nauwkeurigheid',
  },
  score_8k: {
    name: 'Rising Star',
    description: 'Score meer dan 8.000 punten',
  },
  score_9k: {
    name: 'Score Master',
    description: 'Score meer dan 9.000 punten',
  },
  score_9500: {
    name: 'Flawless',
    description: 'Score meer dan 9.500 punten',
  },
  golden_collector: {
    name: 'Gouden Verzamelaar',
    description: 'Raak 10 gouden noten',
  },
  golden_master: {
    name: 'Gouden Master',
    description: 'Raak 50 gouden noten',
  },
  first_song: {
    name: 'Eerste Stappen',
    description: 'Voltooi je eerste nummer',
  },
  ten_songs: {
    name: 'Karaoke-fanaat',
    description: 'Voltooi 10 nummers',
  },
  fifty_songs: {
    name: 'Karaoke-reguliere',
    description: 'Voltooi 50 nummers',
  },
  hundred_songs: {
    name: 'Karaoke-legende',
    description: 'Voltooi 100 nummers',
  },
  five_games: {
    name: 'Aan de slag',
    description: 'Speel 5 spellen',
  },
  twenty_games: {
    name: 'Toegewijde Zanger',
    description: 'Speel 20 spellen',
  },
  party_time: {
    name: 'Party Time!',
    description: 'Speel een partymodus',
  },
  duel_winner: {
    name: 'Duel Kampioen',
    description: 'Win een duel',
  },
  pass_the_mic: {
    name: 'Geef de Mic!',
    description: 'Speel de modus Geef de Mic',
  },
  shower_singer: {
    name: 'Douchezanger',
    description: 'Score minder dan 20% op een nummer',
  },
  comeback_king: {
    name: 'Comeback King',
    description: 'Bereik een combo van 50+ na 10 missers',
  },
  speed_demon: {
    name: 'Speed Demon',
    description: 'Voltooi een nummer op 1,5x snelheid',
  },
  blind_master: {
    name: 'Blind Master',
    description: 'Voltooi een nummer in Blind Karaoke-modus',
  },
  daily_starter: {
    name: 'Dagelijkse Starter',
    description: 'Voltooi je eerste dagelijkse uitdaging',
  },
  daily_regular: {
    name: 'Dagelijkse Stamgast',
    description: 'Voltooi 10 dagelijkse uitdagingen',
  },
  daily_devoted: {
    name: 'Dagelijkse Toegewijde',
    description: 'Voltooi 50 dagelijkse uitdagingen',
  },
  streak_week: {
    name: 'In Vuur en Vlam',
    description: 'Houd een dagelijkse reeks van 7 dagen aan',
  },
  streak_month: {
    name: 'Onstuitbaar',
    description: 'Houd een dagelijkse reeks van 30 dagen aan',
  },
  weekly_warrior: {
    name: 'Weekkrijger',
    description: 'Voltooi 5 wekelijkse uitdagingen',
  },
  accuracy_95: {
    name: 'Precisiezanger',
    description: 'Behaal meer dan 95% nauwkeurigheid',
  },
  golden_rush: {
    name: 'Goudkoorts',
    description: 'Raak 20 gouden noten in één nummer',
  },
  golden_hundred: {
    name: 'Gouden Centurio',
    description: 'Raak in totaal 100 gouden noten',
  },
  perfect_fifty: {
    name: 'Perfecte Vijftig',
    description: 'Raak 50 perfecte noten in één nummer',
  },
  lightning_lips: {
    name: 'Bliksemlippen',
    description: 'Voltooi een nummer op 2x snelheid',
  },
  duet_harmony: {
    name: 'Perfecte Harmonie',
    description: 'Zing 10 duetten',
  },
  genre_explorer: {
    name: 'Genre-ontdekker',
    description: 'Zing nummers van 5 verschillende genres',
  },
  disney_fan: {
    name: 'Disney-fan',
    description: 'Zing 10 Disney-nummers',
  },
  night_owl: {
    name: 'Nachtuil',
    description: 'Voltooi een nummer tussen middernacht en 4 uur in de nacht',
  },
  early_bird: {
    name: 'Vroege Vogel',
    description: 'Voltooi een nummer vóór 8 uur in de ochtend',
  },
  marathon_singer: {
    name: 'Marathonzanger',
    description: 'Speel 5 spellen op één dag',
  },

  // ── 100-prestaties-uitbreiding ──
  score_9800: {
    name: 'Ultraster',
    description: 'Score meer dan 9.800 punten',
  },
  score_9900: {
    name: 'Voorbij perfectie',
    description: 'Score meer dan 9.900 punten',
  },
  combo_300: {
    name: 'Combo-titan',
    description: 'Behaal een combo van 300 noten',
  },
  combo_500: {
    name: 'Onsterfelijke combo',
    description: 'Behaal een combo van 500 noten',
  },
  accuracy_92: {
    name: 'Fijnafstelling',
    description: 'Behaal meer dan 92% nauwkeurigheid',
  },
  accuracy_94: {
    name: 'Studiokwaliteit',
    description: 'Behaal meer dan 94% nauwkeurigheid',
  },
  accuracy_96: {
    name: 'Scherpschutter',
    description: 'Behaal meer dan 96% nauwkeurigheid',
  },
  accuracy_97: {
    name: 'Laserprecisie',
    description: 'Behaal meer dan 97% nauwkeurigheid',
  },
  accuracy_98: {
    name: 'Virtuoos',
    description: 'Behaal meer dan 98% nauwkeurigheid',
  },
  perfect_75: {
    name: 'Perfecte vijfenzeventig',
    description: 'Raak 75 perfecte noten in één nummer',
  },
  perfect_100: {
    name: 'Perfecte honderd',
    description: 'Raak 100 perfecte noten in één nummer',
  },
  perfect_150: {
    name: 'Perfecte storm',
    description: 'Raak 150 perfecte noten in één nummer',
  },
  golden_30: {
    name: 'Gouden vloed',
    description: 'Raak 30 gouden noten in één nummer',
  },
  golden_40: {
    name: 'Gouden symfonie',
    description: 'Raak 40 gouden noten in één nummer',
  },
  perfect_500: {
    name: 'Perfecte machine',
    description: 'Raak in totaal 500 perfecte noten',
  },
  perfect_1000: {
    name: 'Precisie-krachtpatser',
    description: 'Raak in totaal 1.000 perfecte noten',
  },
  perfect_5000: {
    name: 'Perfecte lawine',
    description: 'Raak in totaal 5.000 perfecte noten',
  },
  perfect_10000: {
    name: 'Perfecte tienduizend',
    description: 'Raak in totaal 10.000 perfecte noten',
  },
  golden_250: {
    name: 'Gouden oogst',
    description: 'Raak in totaal 250 gouden noten',
  },
  golden_1000: {
    name: 'Gouden stortbui',
    description: 'Raak in totaal 1.000 gouden noten',
  },
  golden_5000: {
    name: 'Midas-stem',
    description: 'Raak in totaal 5.000 gouden noten',
  },
  songs_250: {
    name: 'Songboek-veteraan',
    description: 'Voltooi 250 nummers',
  },
  songs_500: {
    name: 'Vijfhonderd-club',
    description: 'Voltooi 500 nummers',
  },
  songs_1000: {
    name: 'Duizend-nummer-legende',
    description: 'Voltooi 1.000 nummers',
  },
  games_50: {
    name: 'Regelmatige zanger',
    description: 'Speel 50 spellen',
  },
  games_100: {
    name: 'Honderd-club',
    description: 'Speel 100 spellen',
  },
  games_250: {
    name: 'Arcade-stamgast',
    description: 'Speel 250 spellen',
  },
  games_500: {
    name: 'Marathonmaniak',
    description: 'Speel 500 spellen',
  },
  level_25: {
    name: 'Ervaren zanger',
    description: 'Bereik niveau 25',
  },
  level_50: {
    name: 'Elite-zanger',
    description: 'Bereik niveau 50',
  },
  level_100: {
    name: 'Niveau-100-legende',
    description: 'Bereik niveau 100',
  },
  daily_100: {
    name: 'Dagelijkse centurio',
    description: 'Voltooi 100 dagelijkse uitdagingen',
  },
  daily_250: {
    name: 'Dagelijkse diehard',
    description: 'Voltooi 250 dagelijkse uitdagingen',
  },
  daily_500: {
    name: 'Dagelijkse onsterfelijke',
    description: 'Voltooi 500 dagelijkse uitdagingen',
  },
  streak_60: {
    name: 'IJzeren wil',
    description: 'Houd een dagelijkse reeks van 60 dagen aan',
  },
  streak_100: {
    name: 'Honderd-dagen-held',
    description: 'Houd een dagelijkse reeks van 100 dagen aan',
  },
  streak_180: {
    name: 'Halfjaar-toewijding',
    description: 'Houd een dagelijkse reeks van 180 dagen aan',
  },
  streak_365: {
    name: 'Jaarlijkse legende',
    description: 'Houd een dagelijkse reeks van 365 dagen aan',
  },
  weekly_15: {
    name: 'Wekelijkse rots',
    description: 'Voltooi 15 wekelijkse uitdagingen',
  },
  weekly_30: {
    name: 'Wekelijkse pijler',
    description: 'Voltooi 30 wekelijkse uitdagingen',
  },
  weekly_52: {
    name: 'Jaar van weken',
    description: 'Voltooi 52 wekelijkse uitdagingen',
  },
  encore_10: {
    name: 'Toegift!',
    description: 'Speel 10 spellen op één dag',
  },
  duets_25: {
    name: 'Duet-liefhebber',
    description: 'Zing 25 duetten',
  },
  duets_50: {
    name: 'Dynamisch duo',
    description: 'Zing 50 duetten',
  },
  duets_100: {
    name: 'Eeuw van duetten',
    description: 'Zing 100 duetten',
  },
  duels_5: {
    name: 'Duellist',
    description: 'Win 5 duels',
  },
  duels_10: {
    name: 'Duel-meester',
    description: 'Win 10 duels',
  },
  duels_25: {
    name: 'Duel-overheerser',
    description: 'Win 25 duels',
  },
  party_10: {
    name: 'Feestbeest',
    description: 'Speel 10 feestspellen',
  },
  party_25: {
    name: 'Ziel van het feest',
    description: 'Speel 25 feestspellen',
  },
  party_50: {
    name: 'Feestlegende',
    description: 'Speel 50 feestspellen',
  },
  disney_25: {
    name: 'Disney-liefhebber',
    description: 'Zing 25 Disney-nummers',
  },
  disney_50: {
    name: 'Er was eens een nummer',
    description: 'Zing 50 Disney-nummers',
  },
  genres_8: {
    name: 'Genre-zwerver',
    description: 'Zing nummers van 8 verschillende genres',
  },
  genres_10: {
    name: 'Genre-kenner',
    description: 'Zing nummers van 10 verschillende genres',
  },
  clean_sheet: {
    name: 'De nul houden',
    description: 'Voltooi een nummer met 50+ noten en nul missers',
  },
  weekend_singer: {
    name: 'Weekendzanger',
    description: 'Voltooi een nummer op zaterdag of zondag',
  },
  lunch_break: {
    name: 'Lunchpauze',
    description: 'Voltooi een nummer tussen 12 en 14 uur',
  },
},
achievementsScreen: {
  title: '🏆 Prestaties',
  description: 'Ontgrendel prestaties door te spelen!',
  unlocked: 'Ontgrendeld',
  xpEarned: 'XP verdiend',
  completion: 'Voltooiing',
  all: 'Alles',
  categories: {
    performance: 'prestaties',
    progression: 'voortgang',
    social: 'sociaal',
    special: 'speciaal',
  },
  plusXp: '+{n} XP',
  locked: 'Vergrendeld',
  viewPlayer: 'Prestaties van',
  viewingOther: 'Je bekijkt de prestaties van {n}. Elke speler ontgrendelt zijn eigen prestaties.',
  noMatches: 'Geen prestaties voldoen aan deze filters',
},
badgeNames: {
  'first-challenge': 'Eerste Stappen',
  'week-warrior': 'Weekkrijger',
  'fortnight-fighter': 'Veertiendagen Strijder',
  'monthly-master': 'Maandelijks Meester',
  'top-3': 'Podiumplaats',
  champion: 'Dagelijks Kampioen',
  dedicated: 'Toegewijde Zanger',
  legendary: 'Legendarische Status',
  'century-champion': 'Eeuwkampioen',
  'yearly-legend': 'Jaarlijkse Legende',
  explorer: 'Uitdaging Verkenner',
  songbird: 'Zangvogel',
  'weekly-warrior-q': 'Weekkrijger',
},
badgeDescriptions: {
  'first-challenge': 'Voltooi je eerste dagelijkse uitdaging',
  'week-warrior': 'Behoud een reeks van 7 dagen',
  'fortnight-fighter': 'Behoud een reeks van 14 dagen',
  'monthly-master': 'Behoud een reeks van 30 dagen',
  'top-3': 'Eindig in de top 3 van een dagelijkse uitdaging',
  champion: 'Win een dagelijkse uitdaging',
  dedicated: 'Voltooi 30 dagelijkse uitdagingen',
  legendary: 'Bereik 10.000 XP in totaal',
  'century-champion': 'Behoud een reeks van 100 dagen',
  'yearly-legend': 'Behoud een reeks van 365 dagen',
  explorer: 'Speel 5 verschillende uitdagingsmodi',
  songbird: 'Voltooi in totaal 10 nummers',
  'weekly-warrior-q': 'Voltooi 3 wekelijkse uitdagingen',
},
mobileAchievements: {
  first_song: {
    title: 'Eerste Stappen',
    description: 'Zing je eerste nummer',
  },
  ten_songs: {
    title: 'Rising Star',
    description: 'Zing 10 nummers',
  },
  fifty_songs: {
    title: 'Veteraan',
    description: 'Zing 50 nummers',
  },
  perfect_score: {
    title: 'Perfectionist',
    description: 'Behaal een perfecte score (95%+)',
  },
  five_perfect: {
    title: 'Flawless',
    description: 'Behaal 5 perfecte scores',
  },
  high_score: {
    title: 'Score Master',
    description: 'Bereik in totaal 10.000 punten',
  },
  queue_5: {
    title: 'Playlistbouwer',
    description: 'Zet 5 nummers in de wachtrij',
  },
  genre_3: {
    title: 'Genre-verkenner',
    description: 'Zing nummers uit 3 genres',
  },
},
challenges: {
  requirements: {
    minLevel: 'Vereist niveau {required} (jij bent niveau {current})',
    minSongs: 'Vereist {required} voltooide nummers (jij hebt {current})',
    achievement: 'Vereist prestatie: {name}',
    rankNoXP: 'Rangvereiste kan niet worden gecontroleerd (geen XP-gegevens beschikbaar)',
    unknownRank: 'Onbekende rang "{name}"',
    rankRequired: 'Vereist rang "{required}" (jij bent "{current}")',
  },
},
};
