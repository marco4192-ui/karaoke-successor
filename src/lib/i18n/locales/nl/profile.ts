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
    signOutButton: 'Afmelden op dit apparaat',
    signOutTitle: 'Afmelden op dit apparaat?',
    signOutText: 'Je onlineprofiel blijft bestaan — alleen de gegevens op dit apparaat worden verwijderd: profiel, avatar, lokale highscores, voortgang van dagelijkse uitdagingen en quests, en wachtende uploads.',
    signOutHintAccount: 'Je kunt je op elk moment opnieuw aanmelden met e-mailadres en wachtwoord.',
    signOutConfirm: 'Afmelden en verwijderen',
    signOutSuccess: 'Profiel verwijderd van dit apparaat — je onlinegegevens blijven bewaard.',
    signOutUploading: 'Wachtende uploads worden verzonden…',
    signOutUploadsFailed: '{n} wachtende score-uploads konden niet worden verzonden (server onbereikbaar). Ze worden weggegooid als je doorgaat.',
    signOutForce: 'Toch afmelden',
    pendingUploadsInfo: '{n} wachtende score-uploads worden vóór het verwijderen naar de server gestuurd.',
    deleteLocalTitle: 'Profiel definitief verwijderen?',
    deleteLocalText: 'Het profiel wordt verwijderd met alle lokale gegevens: highscores, voortgang van dagelijkse uitdagingen en quests, en avatar. Er is geen online back-up — dit kan niet ongedaan worden gemaakt.',
    deleteLocalConfirm: 'Definitief verwijderen',
    active: 'Actief',
    selectAsActive: 'Als actief selecteren',
    noCharacters: 'Nog geen profielen',
    noCharactersDesc: 'Maak een profiel aan om je scores en voortgang bij te houden!',
    showOnLeaderboard: 'Tonen op leaderboard',
    showPhoto: 'Foto tonen',
    photoUploaded: 'Foto geüpload',
    noPhoto: 'Geen foto',
    privacyHint: 'Je scores worden geüpload naar het wereldwijde leaderboard.',
    privacyHintDesc: 'Je kunt dit op elk moment uitschakelen in de profielinstellingen.',
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
    forgotPassword: 'Wachtwoord vergeten?',
    newEmail: 'Nieuw e-mailadres',
    recoverButton: 'Wachtwoord opnieuw instellen',
    recoverDesc: 'Voer je e-mailadres, de eenmalige herstelcode en een nieuw wachtwoord in. Bij succes geeft de server een NIEUWE herstelcode af — bewaar deze veilig, hij wordt maar één keer getoond.',
    recoverFailed: 'Opnieuw instellen mislukt — controleer je e-mailadres en de herstelcode',
    recoverRelinkHint: 'Geen herstelcode? Op een apparaat met je profiel kun je het account in plaats daarvan opnieuw koppelen met je sync-code.',
    recoverTitle: 'Wachtwoord opnieuw instellen',
    recoveryCode: 'Herstelcode',
    recoveryCodePlaceholder: 'XXXX-XXXX-XXXX-XXXX',
    recoveryCopied: 'Gekopieerd!',
    recoveryCopy: 'Code kopiëren',
    recoveryDesc: 'Schrijf deze code op en bewaar hem veilig (in een passwordmanager of op papier). Hij wordt NOOIT meer getoond — met je e-mailadres + deze code kun je zelf een vergeten wachtwoord opnieuw instellen.',
    recoverySaveHint: 'Zonder deze code en zonder je huidige wachtwoord kan het wachtwoord alleen opnieuw worden ingesteld door het account opnieuw te koppelen met je sync-code.',
    recoveryTitle: 'Herstelcode',
    relinkButton: 'Account opnieuw koppelen',
    relinkFailed: 'Het account kon niet opnieuw gekoppeld worden',
    relinkHint: 'Vervangt het gekoppelde account (oude e-mail en wachtwoord vervallen). Je hebt alleen je sync-code nodig — daarna ontvang je een nieuwe herstelcode.',
    relinkSuccess: 'Online account opnieuw gekoppeld — onthoud je e-mailadres en wachtwoord',
    relinkTitle: 'Online account opnieuw koppelen',
    saveCodeFile: 'Opslaan als tekstbestand',
  },
  characterScreen: {
    title: 'Profielen',
    description: 'Maak en beheer je zangersprofielen',
    onlineLeaderboard: 'Online leaderboard',
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
    leaderboardParticipation: 'Leaderboard-deelname',
    leaderboardParticipationDesc: 'Neem deel aan het online leaderboard en deel je scores met andere spelers',
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
    invalidCode: 'Voer een geldige sync-code in (8 of 12 tekens)',
    syncSuccess: 'Profiel succesvol gesynchroniseerd!',
    notFound: 'Profiel niet gevonden',
    profileNotFound: 'Profiel niet gevonden',
    downloadFailedMsg: 'Profiel downloaden mislukt. Controleer de sync-code.',
    syncCode: 'Sync-code:',
    upload: 'Uploaden',
    syncCodePlaceholder: 'Sync-code',
    deleteOnline: 'Online gegevens verwijderen',
    deleteOnlineHint: 'Verwijdert je onlineprofiel, alle scores, dagelijkse resultaten en back-ups van de server. Je lokale profiel blijft staan.',
    deleteOnlineConfirmTitle: 'Online gegevens definitief verwijderen?',
    deleteOnlineConfirmText: 'Dit verwijdert je onlineprofiel op de leaderboardserver, inclusief alle scores, dagelijkse resultaten, profielback-ups en een gekoppeld onlineaccount. Je lokale profiel blijft staan. Dit kan niet ongedaan worden gemaakt.',
    deleteOnlineConfirm: 'Definitief verwijderen',
    deleteOnlineSuccess: 'Online gegevens verwijderd. Je profiel is nu alleen lokaal.',
    deleteOnlineFailed: 'Online gegevens verwijderen mislukt',
    syncCodeWarning: 'Schrijf deze code op! Zonder deze code (of een online account met wachtwoord) kan je onlineprofiel niet worden hersteld.',
    saveCodeFile: 'Code opslaan als tekstbestand',
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
      name: 'Combo-meester',
      description: 'Behaal een combo van 50 noten',
    },
    combo_king: {
      name: 'Combo-koning',
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
      name: 'Rijzende ster',
      description: 'Score meer dan 8.000 punten',
    },
    score_9k: {
      name: 'Scoremeester',
      description: 'Score meer dan 9.000 punten',
    },
    score_9500: {
      name: 'Vlekkeloos',
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
      name: 'Feestje!',
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
      name: 'Comeback-koning',
      description: 'Bereik een combo van 50+ na 10 missers',
    },
    speed_demon: {
      name: 'Snelheidsduivel',
      description: 'Voltooi een nummer op 1,5x snelheid',
    },
    blind_master: {
      name: 'Blindemeester',
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
      title: 'Rijzende ster',
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
      title: 'Vlekkeloos',
      description: 'Behaal 5 perfecte scores',
    },
    high_score: {
      title: 'Scoremeester',
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
      challengeCompleted: 'Voltooi eerst "{name}"',
    },
    balladBarometer: {
      description: 'Rond een nummer af met 80%+ nauwkeurigheid',
      name: 'Balladenbarometer',
    },
    bandBattle: {
      description: 'Zing een nummer van een band of duo — 72%+ nauwkeurigheid',
      name: 'Bandgevecht',
    },
    blindfoldBard: {
      description: 'Geen songtekst ÉN 20% ontbrekende woorden',
      name: 'Blinddoekenbard',
    },
    cleanCut: {
      description: 'Mis maximaal 20 noten in één nummer',
      name: 'Schone snee',
    },
    comboCadet: {
      description: 'Krijg een 30+ notencombo in één nummer',
      name: 'Combo-cadet',
    },
    comboCaptain: {
      description: 'Krijg een 60+ notencombo in één nummer',
      name: 'Combo-kapitein',
    },
    comboColossus: {
      description: 'Krijg een 175+ notencombo in één nummer',
      name: 'Combo-kolos',
    },
    comboCommander: {
      description: 'Krijg een 100+ notencombo in één nummer',
      name: 'Combo-commandant',
    },
    countryCrooner: {
      description: 'Zing een countrynummer met 70%+ nauwkeurigheid',
      name: 'Country-crooner',
    },
    deutschlandDreams: {
      description: 'Zing een Duitstalig nummer met 72%+ nauwkeurigheid',
      name: 'Duitse dromen',
    },
    discoDazzler: {
      description: 'Zing een nummer uit de jaren 70 met 70%+ nauwkeurigheid',
      name: 'Discostral',
    },
    disneyDream: {
      description: 'Zing een Disney-nummer met 75%+ nauwkeurigheid',
      name: 'Disney-droom',
    },
    duoDynamo: {
      description: 'Zing een nummer met een gastartiest — 70%+ nauwkeurigheid',
      name: 'Duo-dynamo',
    },
    flawlessMirror: {
      description: 'Mis NUL noten in één nummer',
      name: 'Vlekkeloze spiegel',
    },
    freshFinders: {
      description: 'Zing een nummer dat je NOOIT eerder hebt gezongen — 68%+ nauwkeurigheid',
      name: 'Nieuwe ontdekkers',
    },
    goldBaron: {
      description: 'Raak 12+ gouden noten in één nummer',
      name: 'Goudbaron',
    },
    goldMiner: {
      description: 'Raak 6+ gouden noten in één nummer',
      name: 'Goudgraver',
    },
    goldPanner: {
      description: 'Raak 3+ gouden noten in één nummer',
      name: 'Goudwasser',
    },
    goldenGauntlet: {
      description: 'Alleen gouden noten tellen — en je hebt 80%+ nauwkeurigheid nodig',
      name: 'Gouden handschoen',
    },
    harmonyHunter: {
      description: 'Rond een nummer af met 93%+ nauwkeurigheid',
      name: 'Harmoniejager',
    },
    kpopConnoisseur: {
      description: 'Zing een K-Pop-nummer met 78%+ nauwkeurigheid',
      name: 'K-Pop-kenner',
    },
    latinFlare: {
      description: 'Zing een latinnummer met 70%+ nauwkeurigheid',
      name: 'Latin-vlam',
    },
    lightningLungs: {
      description: '2x snelheid — helemaal ademloos!',
      name: 'Bliksemlongen',
    },
    loveGuru: {
      description: 'Zing een nummer met "love" in de titel — 72%+ nauwkeurigheid',
      name: 'Liefdesgoeroe',
    },
    marathoner: {
      description: 'Zing een nummer van 5+ minuten met 75%+ nauwkeurigheid',
      name: 'Marathonloper',
    },
    metalMarauder: {
      description: 'Zing een metalnummer met 75%+ nauwkeurigheid',
      name: 'Metal-maniak',
    },
    mindPalace: {
      description: '50% van de woorden is verborgen — puur geheugen!',
      name: 'Geheugenpaleis',
    },
    musicalMaestro: {
      description: 'Zing een musicalnummer met 75%+ nauwkeurigheid',
      name: 'Musical-maestro',
    },
    noteAdept: {
      description: 'Raak 200+ juiste noten in één nummer',
      name: 'Notenadept',
    },
    noteApprentice: {
      description: 'Raak 100+ juiste noten in één nummer',
      name: 'Notenleerling',
    },
    noteLegend: {
      description: 'Raak 500+ juiste noten in één nummer',
      name: 'Notenlegende',
    },
    noteNovice: {
      description: 'Raak 50+ juiste noten in één nummer',
      name: 'Notenbeginner',
    },
    noteVirtuoso: {
      description: 'Raak 350+ juiste noten in één nummer',
      name: 'Notenvirtuoos',
    },
    octaveOdyssey: {
      description: 'Nummer getransponeerd +7 halve tonen — een vol octaaf pijn!',
      name: 'Octaafodyssee',
    },
    oneWordWonder: {
      description: 'Zing een nummer met een titel van één woord met 72%+ nauwkeurigheid',
      name: 'Eénwoordwonder',
    },
    perfectPath: {
      description: 'Raak 25+ perfecte noten in één nummer',
      name: 'Perfecte route',
    },
    perfectPilgrim: {
      description: 'Raak 50+ perfecte noten in één nummer',
      name: 'Perfecte pelgrim',
    },
    perfectProphet: {
      description: 'Raak 100+ perfecte noten in één nummer',
      name: 'Perfecte profeet',
    },
    perfectionistPrime: {
      description: 'Alleen perfecte noten tellen — raak er 100+!',
      name: 'Perfectionist pur sang',
    },
    phantomKaraoke: {
      description: 'Volledig blind ÉN 1,25x snelheid — het spook brengt je een saluut!',
      name: 'Spook van de Karaoke',
    },
    pitchClimber: {
      description: 'Nummer getransponeerd +5 halve tonen — klim die melodie op!',
      name: 'Toonbeklimmer',
    },
    pitchDiver: {
      description: 'Nummer getransponeerd -4 halve tonen — duik diep!',
      name: 'Toonduiker',
    },
    pitchPerfectParagon: {
      description: 'Rond een nummer af met 97%+ nauwkeurigheid',
      name: 'Toonzuiver toppunt',
    },
    polyglotPractice: {
      description: 'Zing een nummer dat NIET in het Engels is met 70%+ nauwkeurigheid',
      name: 'Polyglotte oefening',
    },
    pulseRacer: {
      description: 'Zing een nummer van 140+ BPM met 70%+ nauwkeurigheid',
      name: 'Pulseracer',
    },
    questionQuest: {
      description: 'Zing een nummer met een "?" in de titel — 70%+ nauwkeurigheid',
      name: 'Vraagtekenqueeste',
    },
    rockRenaissance: {
      description: 'Zing een rocknummer met 72%+ nauwkeurigheid',
      name: 'Rock-renaissance',
    },
    scoreScholar: {
      description: 'Score 7.500+ punten in één nummer',
      name: 'Scoregeleerde',
    },
    scoreScout: {
      description: 'Score 5.000+ punten in één nummer',
      name: 'Scoreverkenner',
    },
    scoreSensei: {
      description: 'Score 9.500+ punten in één nummer',
      name: 'Scoresensei',
    },
    scoreTitan: {
      description: 'Score 11.500+ punten in één nummer',
      name: 'Scoretitaan',
    },
    slothSerenade: {
      description: '0,6x snelheid ÉN geen toonhulp — relaxed maar blind',
      name: 'Luiaardserenade',
    },
    slowGroove: {
      description: 'Zing een nummer van ≤90 BPM met 75%+ nauwkeurigheid',
      name: 'Trage groove',
    },
    speedDemonPlus: {
      description: '1,75x snelheid — voor bliksemlongen!',
      name: 'Snelheidsduivel+',
    },
    spotless: {
      description: 'Mis maximaal 8 noten in één nummer',
      name: 'Vlekvrij',
    },
    sprintSinger: {
      description: 'Zing een nummer korter dan 3 minuten met 80%+ nauwkeurigheid',
      name: 'Sprintzanger',
    },
    surgical: {
      description: 'Mis maximaal 3 noten in één nummer',
      name: 'Chirurgische precisie',
    },
    synthwaveSailor: {
      description: 'Zing een nummer uit de jaren 80 met 78%+ nauwkeurigheid',
      name: 'Synthwave-zeiler',
    },
    toneTuner: {
      description: 'Rond een nummer af met 88%+ nauwkeurigheid',
      name: 'Toonstemmer',
    },
    turboMemory: {
      description: '1,25x snelheid ÉN 35% ontbrekende woorden!',
      name: 'Turbogeheugen',
    },
    turtleTempo: {
      description: '0,5x snelheid — proef elke afzonderlijke noot',
      name: 'Schildpadtempo',
    },
  },
  onlineStats: {
    title: 'Online statistieken',
    loading: 'Online gegevens laden…',
    unavailable: 'Online gegevens momenteel onbereikbaar',
    crowns: 'Nummerkronen (#1)',
    topPercent: 'Top {p}%',
    rankOf: 'Positie #{rank} van {total}',
    notRanked: 'Niet gerangschikt',
    points: 'Punten online',
    crownExample: 'bv.',
    recentPlays: 'Recente online rondes',
    noPlays: 'Nog geen online rondes.',
    unknownSong: 'Onbekend nummer',
  },
};
