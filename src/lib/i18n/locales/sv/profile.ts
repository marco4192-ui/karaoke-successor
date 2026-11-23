// SV translations — profile

export const profileTranslations = {
  profile: {
    title: 'Profiler',
    createCharacter: 'Skapa Profil',
    name: 'Namn',
    namePlaceholder: 'Profilnamn...',
    country: 'Land',
    countryOptional: 'Välj Land (valfritt)',
    avatar: 'Avatar',
    uploadPhoto: 'Ladda upp Foto',
    create: 'Skapa',
    edit: 'Redigera',
    delete: 'Ta bort',
    signOutButton: 'Logga ut på denna enhet',
    signOutTitle: 'Logga ut på denna enhet?',
    signOutText: 'Din onlineprofil finns kvar — bara data på denna enhet tas bort: profil, avatar, lokala highscores, framsteg för dagliga utmaningar och uppdrag samt väntande uppladdningar.',
    signOutHintAccount: 'Du kan logga in igen när som helst med e-post och lösenord.',
    signOutConfirm: 'Logga ut och ta bort',
    signOutSuccess: 'Profilen har tagits bort från denna enhet — din onlinedata finns kvar.',
    signOutUploading: 'Överför väntande uppladdningar…',
    signOutUploadsFailed: '{n} väntande poänguppladdningar kunde inte överföras (servern kan inte nås). De kastas bort om du fortsätter.',
    signOutForce: 'Logga ut ändå',
    pendingUploadsInfo: '{n} väntande poänguppladdningar skickas till servern innan borttagning.',
    deleteLocalTitle: 'Ta bort profilen permanent?',
    deleteLocalText: 'Profilen tas bort med all lokal data: highscores, framsteg för dagliga utmaningar och uppdrag samt avatar. Det finns ingen onlinebackup — detta kan inte ångras.',
    deleteLocalConfirm: 'Ta bort permanent',
    active: 'Aktiv',
    selectAsActive: 'Välj som Aktiv',
    noCharacters: 'Inga profiler ännu',
    noCharactersDesc: 'Skapa en profil för att spåra dina poäng och framsteg!',
    showOnLeaderboard: 'Visa på poänglista',
    showPhoto: 'Visa foto',
    photoUploaded: 'Foto uppladdat',
    noPhoto: 'Inget foto',
    privacyHint: 'Dina poäng laddas upp till den globala topplistan.',
    privacyHintDesc: 'Du kan när som helst välja bort detta i profilinställningarna.',
    storageMode: {
      title: 'Profilens lagring',
      local: 'Endast lokalt',
      localDesc: 'All data finns kvar på den här enheten — ingen online-topplista, ingen synkronisering.',
      online: 'Online-profil',
      onlineDesc: 'Delta i online-topplistan, synkronisera mellan enheter och dela dagliga resultat.',
      localShort: 'Lokal',
      onlineShort: 'Online',
      settingsDesc: 'Bestäm om den här profilen ska delta i online-topplistan eller endast vara lokal. Kan ändras när som helst.',
    },
    countrySearch: 'Sök land…',
    noCountryFound: 'Inget land hittades',
    popularCountries: 'Populära',
    allCountries: 'Alla länder',
  },
  profileAuth: {
    accountTitle: 'Online-konto (valfritt)',
    accountDesc: 'Spara en e-post och ett lösenord så att du kan ladda den här profilen på en annan enhet. Inloggning är bara möjlig i karaokeappen — det finns ingen webbinloggning.',
    email: 'E-post',
    emailPlaceholder: 'din@email.com',
    emailInvalid: 'Ange en giltig e-postadress',
    emailTaken: 'Den här e-posten är redan registrerad',
    password: 'Lösenord',
    passwordPlaceholder: 'Minst 8 tecken',
    passwordRepeat: 'Upprepa lösenordet',
    passwordsDontMatch: 'Lösenorden matchar inte',
    passwordTooShort: 'Lösenordet måste vara minst 8 tecken långt',
    registerFailed: 'Det gick inte att skapa online-kontot',
    loginTitle: 'Ladda online-profil',
    loginDesc: 'Ange e-post och lösenord för din online-profil för att ladda den på den här enheten.',
    loginButton: 'Logga in och ladda profil',
    loginFailed: 'Inloggningen misslyckades — kontrollera e-post och lösenord',
    loginSuccess: 'Profilen "{n}" har laddats!',
    noSnapshot: 'Inga synkroniserade profildata hittades på servern ännu',
    emailNote: 'Används endast för inloggning — visas aldrig offentligt',
    changePassword: 'Byt lösenord',
    currentPassword: 'Nuvarande lösenord',
    newPassword: 'Nytt lösenord',
    passwordChanged: 'Lösenordet har ändrats',
    passwordChangeFailed: 'Det gick inte att ändra lösenordet',
    hasAccount: 'Online-konto ✓',
    registrationPending: 'Skapar online-kontot…',
    registrationSuccess: 'Online-konto skapat — du kan nu logga in på valfri enhet',
    registrationSuccessTitle: '🔐 Online-konto',
    loginSuccessTitle: '✅ {n}',
    forgotPassword: 'Glömt lösenordet?',
    newEmail: 'Ny e-postadress',
    recoverButton: 'Återställ lösenord',
    recoverDesc: 'Ange din e-postadress, den engångiga återställningskoden och ett nytt lösenord. Vid lyckad återställning utfärdar servern en NY återställningskod — förvara den säkert, den visas endast en gång.',
    recoverFailed: 'Återställningen misslyckades — kontrollera din e-post och återställningskoden',
    recoverRelinkHint: 'Ingen återställningskod? På en enhet med din profil kan du istället koppla kontot till din synkkod igen.',
    recoverTitle: 'Återställ lösenord',
    recoveryCode: 'Återställningskod',
    recoveryCodePlaceholder: 'XXXX-XXXX-XXXX-XXXX',
    recoveryCopied: 'Kopierad!',
    recoveryCopy: 'Kopiera kod',
    recoveryDesc: 'Skriv ner den här koden och förvara den säkert (lösenordshanterare eller papper). Den visas ALDRIG igen — med din e-post + den här koden kan du själv återställa ett glömt lösenord.',
    recoverySaveHint: 'Utan den här koden och utan ditt nuvarande lösenord kan lösenordet bara återställas genom att koppla kontot till din synkkod igen.',
    recoveryTitle: 'Återställningskod',
    relinkButton: 'Koppla kontot igen',
    relinkFailed: 'Det gick inte att koppla kontot igen',
    relinkHint: 'Ersätter det kopplade kontot (gamla e-postadressen och det gamla lösenordet blir ogiltiga). Allt du behöver är din synkkod — efteråt får du en ny återställningskod.',
    relinkSuccess: 'Online-kontot har kopplats igen — kom ihåg din e-post och ditt lösenord',
    relinkTitle: 'Koppla online-kontot igen',
    saveCodeFile: 'Spara som textfil',
  },
  characterScreen: {
    title: 'Profiler',
    description: 'Skapa och hantera dina sångarprofiler',
    onlineLeaderboard: 'Online-poänglista',
    createProfile: 'Skapa Ny Profil',
    yourProfiles: 'Dina Profiler ({n})',
    noProfiles: 'Inga profiler ännu. Klicka på "Skapa Ny Profil" för att börja!',
    settingsTitle: 'Profilinställningar',
    nameAndAvatar: 'Namn & Avatar',
    rankDisplay: 'Rankvisning',
    showRankInName: 'Visa rank i namn',
    rankPrefix: 'Prefix',
    rankSuffix: 'Suffix',
    rankFull: 'Fullständig',
    countryAndPrivacy: 'Land & Integritet',
    selectCountry: 'Välj Land',
    visible: 'Synlig',
    hidden: 'Dold',
    shown: 'Visad',
    companionAppLink: 'Companion App-länk',
    companionAppLinkDesc: 'Skanna denna QR-kod för att ansluta direkt med denna profil i Companion-appen.',
    hideQrCode: 'Dölj QR Code',
    showQrCode: 'Visa QR Code',
    leaderboardParticipation: 'Deltagande i topplistan',
    leaderboardParticipationDesc: 'Delta i topplistan online och dela dina poäng med andra spelare',
    loadProfile: 'Ladda online-profil',
  },
  characterCard: {
    connected: 'Ansluten',
    connectedWith: 'Ansluten: {n}',
  },
  profileSync: {
    title: 'Profilsynk',
    uploadSuccess: 'Profil uppladdad! Synkkod: {n}',
    uploadFailed: 'Uppladdning misslyckades',
    downloadFailed: 'Misslyckades att ladda upp profil',
    invalidCode: 'Ange en giltig synkkod (8 eller 12 tecken)',
    syncSuccess: 'Profil synkad framgångsrikt!',
    notFound: 'Profil hittades inte',
    profileNotFound: 'Profilen hittades inte',
    downloadFailedMsg: 'Misslyckades att ladda ner profil. Kontrollera synkkoden.',
    syncCode: 'Synkkod:',
    upload: 'Ladda upp',
    syncCodePlaceholder: 'Synkkod',
    deleteOnline: 'Radera online-data',
    deleteOnlineHint: 'Tar bort din online-profil, alla poäng, dagliga resultat och backuper från servern. Din lokala profil finns kvar.',
    deleteOnlineConfirmTitle: 'Radera online-data permanent?',
    deleteOnlineConfirmText: 'Detta raderar din online-profil på poänglistans server, inklusive alla poäng, dagliga resultat, profilbackuper och ett länkat online-konto. Din lokala profil finns kvar. Detta kan inte ångras.',
    deleteOnlineConfirm: 'Radera permanent',
    deleteOnlineSuccess: 'Online-data raderad. Din profil är nu endast lokal.',
    deleteOnlineFailed: 'Det gick inte att radera online-data',
    syncCodeWarning: 'Skriv ner den här koden! Utan den (eller ett online-konto med lösenord) kan din online-profil inte återställas.',
    saveCodeFile: 'Spara koden som textfil',
  },
  playerProgression: {
    active: 'Aktiv',
    inactive: 'Inaktiv',
    progressToNext: 'Framsteg till Nästa Nivå',
    xpNeeded: 'XP som behövs',
    songsPlayed: 'Spelade Låtar',
    goldenNotes: 'Guldnoter',
    bestCombo: 'Bästa Combo',
    totalScore: 'Totalpoäng',
    achievementsTitle: 'Prestationer',
    more: '+{n} fler',
    beginner: 'Nybörjare',
    xp: 'XP',
    lv: 'Nivå {n}',
  },
  achievements: {
    title: 'Prestationer',
    unlocked: 'Upplåst',
    locked: 'Låst',
    progress: 'Framsteg',
    noAchievements: 'Inga prestationer ännu',
    playToUnlock: 'Spela låtar för att låsa upp prestationer!',
    rarity: 'Sällsynthet',
    common: 'Vanlig',
    uncommon: 'Ovanlig',
    rare: 'Sällsynt',
    epic: 'Episk',
    legendary: 'Legendarisk',
    first_note: {
      name: 'Första noten',
      description: 'Träffa din första not',
    },
    perfect_ten: {
      name: 'Perfekt tia',
      description: 'Få 10 perfekta träffar i en enda låt',
    },
    combo_master: {
      name: 'Kombomästare',
      description: 'Få en 50-noters kombo',
    },
    combo_king: {
      name: 'Kombokung',
      description: 'Få en 100-noters kombo',
    },
    combo_legend: {
      name: 'Kombo-legend',
      description: 'Få en 200-noters kombo',
    },
    perfect_song: {
      name: 'Perfekt låt',
      description: 'Få 99.5%+ noggrannhet på en låt',
    },
    accuracy_90: {
      name: 'Pitch Perfect',
      description: 'Få över 90% noggrannhet',
    },
    score_8k: {
      name: 'Stjärnskott',
      description: 'Få över 8 000 poäng',
    },
    score_9k: {
      name: 'Poängmästare',
      description: 'Få över 9 000 poäng',
    },
    score_9500: {
      name: 'Fläckfri',
      description: 'Få över 9 500 poäng',
    },
    golden_collector: {
      name: 'Guldsamlare',
      description: 'Träffa 10 guldnoter',
    },
    golden_master: {
      name: 'Guld-mästare',
      description: 'Träffa 50 guldnoter',
    },
    first_song: {
      name: 'Första stegen',
      description: 'Gör klart din första låt',
    },
    ten_songs: {
      name: 'Karaoke-entusiast',
      description: 'Gör klart 10 låtar',
    },
    fifty_songs: {
      name: 'Karaoke-van',
      description: 'Gör klart 50 låtar',
    },
    hundred_songs: {
      name: 'Karaoke-legend',
      description: 'Gör klart 100 låtar',
    },
    five_games: {
      name: 'På gång',
      description: 'Spela 5 spel',
    },
    twenty_games: {
      name: 'Dedikerad sångare',
      description: 'Spela 20 spel',
    },
    party_time: {
      name: 'Festtid!',
      description: 'Spela ett partyläge',
    },
    duel_winner: {
      name: 'Duellmästare',
      description: 'Vinn en duell',
    },
    pass_the_mic: {
      name: 'Ge micken!',
      description: 'Spela Ge micken-läget',
    },
    shower_singer: {
      name: 'Duschsångare',
      description: 'Få under 20% på en låt',
    },
    comeback_king: {
      name: 'Comeback-kung',
      description: 'Få en kombo på 50+ efter att ha missat 10 noter',
    },
    speed_demon: {
      name: 'Hastighetsdemon',
      description: 'Gör klart en låt i 1.5x hastighet',
    },
    blind_master: {
      name: 'Blind mästare',
      description: 'Gör klart en låt i Blind Karaoke-läge',
    },
    daily_starter: {
      name: 'Daglig nybörjare',
      description: 'Fullfölj din första dagliga utmaning',
    },
    daily_regular: {
      name: 'Daglig stammis',
      description: 'Fullfölj 10 dagliga utmaningar',
    },
    daily_devoted: {
      name: 'Dagligt hängiven',
      description: 'Fullfölj 50 dagliga utmaningar',
    },
    streak_week: {
      name: 'Eld och lågor',
      description: 'Håll en 7-dagars daglig svit',
    },
    streak_month: {
      name: 'Ohejdbar',
      description: 'Håll en 30-dagars daglig svit',
    },
    weekly_warrior: {
      name: 'Veckokrigare',
      description: 'Fullfölj 5 veckoutmaningar',
    },
    accuracy_95: {
      name: 'Precisionssångare',
      description: 'Få över 95% precision',
    },
    golden_rush: {
      name: 'Guldrush',
      description: 'Träffa 20 gyllene toner i en enda låt',
    },
    golden_hundred: {
      name: 'Gyllene centurio',
      description: 'Träffa totalt 100 gyllene toner',
    },
    perfect_fifty: {
      name: 'Perfekta femtio',
      description: 'Träffa 50 perfekta toner i en enda låt',
    },
    lightning_lips: {
      name: 'Blixtläppar',
      description: 'Fullfölj en låt med 2x hastighet',
    },
    duet_harmony: {
      name: 'Perfekt harmoni',
      description: 'Sjung 10 duetter',
    },
    genre_explorer: {
      name: 'Genreutforskare',
      description: 'Sjung låtar från 5 olika genrer',
    },
    disney_fan: {
      name: 'Disney-fan',
      description: 'Sjung 10 Disney-låtar',
    },
    night_owl: {
      name: 'Nattuggla',
      description: 'Fullfölj en låt mellan midnatt och klockan 04',
    },
    early_bird: {
      name: 'Morgonfågel',
      description: 'Fullfölj en låt före klockan 08',
    },
    marathon_singer: {
      name: 'Marathonsångare',
      description: 'Spela 5 spel på en enda dag',
    },
    score_9800: {
      name: 'Ultrastjärna',
      description: 'Få över 9 800 poäng',
    },
    score_9900: {
      name: 'Bortom perfektion',
      description: 'Få över 9 900 poäng',
    },
    combo_300: {
      name: 'Kombotitan',
      description: 'Få en 300-noters kombo',
    },
    combo_500: {
      name: 'Odödlig kombo',
      description: 'Få en 500-noters kombo',
    },
    accuracy_92: {
      name: 'Finjustering',
      description: 'Få över 92% noggrannhet',
    },
    accuracy_94: {
      name: 'Studiokvalitet',
      description: 'Få över 94% noggrannhet',
    },
    accuracy_96: {
      name: 'Prickskytten',
      description: 'Få över 96% noggrannhet',
    },
    accuracy_97: {
      name: 'Laserprecision',
      description: 'Få över 97% noggrannhet',
    },
    accuracy_98: {
      name: 'Virtuos',
      description: 'Få över 98% noggrannhet',
    },
    perfect_75: {
      name: 'Perfekta sjuttiofem',
      description: 'Träffa 75 perfekta toner i en enda låt',
    },
    perfect_100: {
      name: 'Perfekta hundra',
      description: 'Träffa 100 perfekta toner i en enda låt',
    },
    perfect_150: {
      name: 'Perfekt storm',
      description: 'Träffa 150 perfekta toner i en enda låt',
    },
    golden_30: {
      name: 'Guldflod',
      description: 'Träffa 30 guldnoter i en enda låt',
    },
    golden_40: {
      name: 'Guldsymfoni',
      description: 'Träffa 40 guldnoter i en enda låt',
    },
    perfect_500: {
      name: 'Perfekt maskin',
      description: 'Träffa totalt 500 perfekta toner',
    },
    perfect_1000: {
      name: 'Precisionskraftverk',
      description: 'Träffa totalt 1 000 perfekta toner',
    },
    perfect_5000: {
      name: 'Perfekt lavin',
      description: 'Träffa totalt 5 000 perfekta toner',
    },
    perfect_10000: {
      name: 'Perfekta tiotusen',
      description: 'Träffa totalt 10 000 perfekta toner',
    },
    golden_250: {
      name: 'Guldskörd',
      description: 'Träffa totalt 250 guldnoter',
    },
    golden_1000: {
      name: 'Guldskyfall',
      description: 'Träffa totalt 1 000 guldnoter',
    },
    golden_5000: {
      name: 'Midas-stämma',
      description: 'Träffa totalt 5 000 guldnoter',
    },
    songs_250: {
      name: 'Sångboksveteran',
      description: 'Fullfölj 250 låtar',
    },
    songs_500: {
      name: 'Halvtusenklubben',
      description: 'Fullfölj 500 låtar',
    },
    songs_1000: {
      name: 'Tusenlåtslegend',
      description: 'Fullfölj 1 000 låtar',
    },
    games_50: {
      name: 'Flitig sångare',
      description: 'Spela 50 spel',
    },
    games_100: {
      name: 'Hundraklubben',
      description: 'Spela 100 spel',
    },
    games_250: {
      name: 'Stammis i arkaden',
      description: 'Spela 250 spel',
    },
    games_500: {
      name: 'Marathongalning',
      description: 'Spela 500 spel',
    },
    level_25: {
      name: 'Erfaren sångare',
      description: 'Nå nivå 25',
    },
    level_50: {
      name: 'Elitsångare',
      description: 'Nå nivå 50',
    },
    level_100: {
      name: 'Nivå 100-legend',
      description: 'Nå nivå 100',
    },
    daily_100: {
      name: 'Daglig centurio',
      description: 'Fullfölj 100 dagliga utmaningar',
    },
    daily_250: {
      name: 'Daglig fanatiker',
      description: 'Fullfölj 250 dagliga utmaningar',
    },
    daily_500: {
      name: 'Daglig odödlig',
      description: 'Fullfölj 500 dagliga utmaningar',
    },
    streak_60: {
      name: 'Järnvilja',
      description: 'Håll en 60-dagars daglig svit',
    },
    streak_100: {
      name: 'Hundradagarhjälte',
      description: 'Håll en 100-dagars daglig svit',
    },
    streak_180: {
      name: 'Halvårs hängivenhet',
      description: 'Håll en 180-dagars daglig svit',
    },
    streak_365: {
      name: 'Årlig legend',
      description: 'Håll en 365-dagars daglig svit',
    },
    weekly_15: {
      name: 'Pålitlig veckokämpe',
      description: 'Fullfölj 15 veckoutmaningar',
    },
    weekly_30: {
      name: 'Veckans pelare',
      description: 'Fullfölj 30 veckoutmaningar',
    },
    weekly_52: {
      name: 'Ett år av veckor',
      description: 'Fullfölj 52 veckoutmaningar',
    },
    encore_10: {
      name: 'Om igen!',
      description: 'Spela 10 spel på en enda dag',
    },
    duets_25: {
      name: 'Duettentusiast',
      description: 'Sjung 25 duetter',
    },
    duets_50: {
      name: 'Dynamiskt duo',
      description: 'Sjung 50 duetter',
    },
    duets_100: {
      name: 'Duetthundra',
      description: 'Sjung 100 duetter',
    },
    duels_5: {
      name: 'Duellant',
      description: 'Vinn 5 dueller',
    },
    duels_10: {
      name: 'Duellmästare',
      description: 'Vinn 10 dueller',
    },
    duels_25: {
      name: 'Duellhärskare',
      description: 'Vinn 25 dueller',
    },
    party_10: {
      name: 'Festprisse',
      description: 'Spela 10 partyspel',
    },
    party_25: {
      name: 'Festens mittpunkt',
      description: 'Spela 25 partyspel',
    },
    party_50: {
      name: 'Festlegend',
      description: 'Spela 50 partyspel',
    },
    disney_25: {
      name: 'Disney-entusiast',
      description: 'Sjung 25 Disney-låtar',
    },
    disney_50: {
      name: 'Det var en gång en sång',
      description: 'Sjung 50 Disney-låtar',
    },
    genres_8: {
      name: 'Genrevandrare',
      description: 'Sjung låtar från 8 olika genrer',
    },
    genres_10: {
      name: 'Genrekännare',
      description: 'Sjung låtar från 10 olika genrer',
    },
    clean_sheet: {
      name: 'Håll nollan',
      description: 'Fullfölj en låt med 50+ noter och noll missar',
    },
    weekend_singer: {
      name: 'Helgsångare',
      description: 'Fullfölj en låt på en lördag eller söndag',
    },
    lunch_break: {
      name: 'Lunchrast',
      description: 'Fullfölj en låt mellan klockan 12 och 14',
    },
  },
  achievementsScreen: {
    title: '🏆 Prestationer',
    description: 'Lås upp prestationer genom att spela!',
    unlocked: 'Upplåst',
    xpEarned: 'XP Tjänad',
    completion: 'Fullföljande',
    all: 'Alla',
    categories: {
      performance: 'prestation',
      progression: 'framsteg',
      social: 'socialt',
      special: 'speciell',
    },
    plusXp: '+{n} XP',
    locked: 'Låst',
    viewPlayer: 'Prestationer för',
    viewingOther: 'Du tittar på {n}s prestationer. Varje spelare låser upp sina egna prestationer.',
    noMatches: 'Inga prestationer matchar dessa filter',
  },
  badgeNames: {
    'first-challenge': 'Första Steget',
    'week-warrior': 'Veckokrigare',
    'fortnight-fighter': 'Fjortondagarskrigare',
    'monthly-master': 'Månadsmästare',
    'top-3': 'Podiumplacering',
    champion: 'Daglig Mästare',
    dedicated: 'Dedikerad Sångare',
    legendary: 'Legendär Status',
    'century-champion': 'Århundrademästare',
    'yearly-legend': 'Årlig Legend',
    explorer: 'Utmaningsutforskare',
    songbird: 'Sånglärka',
    'weekly-warrior-q': 'Veckokrigare',
  },
  badgeDescriptions: {
    'first-challenge': 'Slutför din första dagliga utmaning',
    'week-warrior': 'Håll en 7-dagarsrally',
    'fortnight-fighter': 'Håll en 14-dagarsrally',
    'monthly-master': 'Håll en 30-dagarsrally',
    'top-3': 'Nå top 3 i en daglig utmaning',
    champion: 'Vinn en daglig utmaning',
    dedicated: 'Slutför 30 dagliga utmaningar',
    legendary: 'Nå 10 000 total XP',
    'century-champion': 'Håll en 100-dagarsrally',
    'yearly-legend': 'Håll en 365-dagarsrally',
    explorer: 'Spela 5 olika utmaningslägen',
    songbird: 'Slutför 10 låtar totalt',
    'weekly-warrior-q': 'Slutför 3 veckoutmaningar',
  },
  mobileAchievements: {
    first_song: {
      title: 'Första stegen',
      description: 'Sjung din första låt',
    },
    ten_songs: {
      title: 'Stjärnskott',
      description: 'Sjung 10 låtar',
    },
    fifty_songs: {
      title: 'Veteran',
      description: 'Sjung 50 låtar',
    },
    perfect_score: {
      title: 'Perfektionist',
      description: 'Få ett perfekt resultat (95%+)',
    },
    five_perfect: {
      title: 'Fläckfri',
      description: 'Få 5 perfekta poäng',
    },
    high_score: {
      title: 'Poängmästare',
      description: 'Nå 10 000 totalpoäng',
    },
    queue_5: {
      title: 'Spelliste-byggare',
      description: 'Köa 5 låtar',
    },
    genre_3: {
      title: 'Genre-upptäckare',
      description: 'Sjung låtar från 3 genrer',
    },
  },
  challenges: {
    requirements: {
      minLevel: 'Kräver nivå {required} (du är nivå {current})',
      minSongs: 'Kräver {required} slutförda låtar (du har {current})',
      achievement: 'Kräver prestation: {name}',
      rankNoXP: 'Rangkravet kan inte verifieras (ingen XP-data tillgänglig)',
      unknownRank: 'Okänd rang "{name}"',
      rankRequired: 'Kräver rang "{required}" (du är "{current}")',
      challengeCompleted: 'Slutför "{name}" först',
    },
    balladBarometer: {
      description: 'Avsluta en låt med 80%+ träffsäkerhet',
      name: 'Balladbarometer',
    },
    bandBattle: {
      description: 'Sjung en låt av ett band eller duo — 72%+ träffsäkerhet',
      name: 'Bandkamp',
    },
    blindfoldBard: {
      description: 'Ingen text OCH 20% saknade ord',
      name: 'Blind trubadur',
    },
    cleanCut: {
      description: 'Missa som mest 20 noter i en enda låt',
      name: 'Rent snitt',
    },
    comboCadet: {
      description: 'Nå en kombo på 30+ noter i en enda låt',
      name: 'Kombokadett',
    },
    comboCaptain: {
      description: 'Nå en kombo på 60+ noter i en enda låt',
      name: 'Kombokapten',
    },
    comboColossus: {
      description: 'Nå en kombo på 175+ noter i en enda låt',
      name: 'Kombokoloss',
    },
    comboCommander: {
      description: 'Nå en kombo på 100+ noter i en enda låt',
      name: 'Kombokommendör',
    },
    countryCrooner: {
      description: 'Sjung en countrylåt med 70%+ träffsäkerhet',
      name: 'Countrycrooner',
    },
    deutschlandDreams: {
      description: 'Sjung en låt på tyska med 72%+ träffsäkerhet',
      name: 'Deutschlanddrömmar',
    },
    discoDazzler: {
      description: 'Sjung en låt från 1970-talet med 70%+ träffsäkerhet',
      name: 'Diskobländare',
    },
    disneyDream: {
      description: 'Sjung en Disney-låt med 75%+ träffsäkerhet',
      name: 'Disneydröm',
    },
    duoDynamo: {
      description: 'Sjung en låt med gästartist — 70%+ träffsäkerhet',
      name: 'Duodynamo',
    },
    flawlessMirror: {
      description: 'Missa NOLL noter i en enda låt',
      name: 'Fläckfri spegel',
    },
    freshFinders: {
      description: 'Sjung en låt du ALDRIG sjungit förut — 68%+ träffsäkerhet',
      name: 'Färska fynd',
    },
    goldBaron: {
      description: 'Träffa 12+ guldnoter i en enda låt',
      name: 'Guldbaron',
    },
    goldMiner: {
      description: 'Träffa 6+ guldnoter i en enda låt',
      name: 'Guldgrävare',
    },
    goldPanner: {
      description: 'Träffa 3+ guldnoter i en enda låt',
      name: 'Guldvaskare',
    },
    goldenGauntlet: {
      description: 'Bara guldnoter räknas — och du behöver 80%+ träffsäkerhet',
      name: 'Guldhandsken',
    },
    harmonyHunter: {
      description: 'Avsluta en låt med 93%+ träffsäkerhet',
      name: 'Harmonijägare',
    },
    kpopConnoisseur: {
      description: 'Sjung en K-Pop-låt med 78%+ träffsäkerhet',
      name: 'K-Pop-kännare',
    },
    latinFlare: {
      description: 'Sjung en latinsk låt med 70%+ träffsäkerhet',
      name: 'Latinfackla',
    },
    lightningLungs: {
      description: '2x hastighet — helt andfådd!',
      name: 'Blixtlungor',
    },
    loveGuru: {
      description: 'Sjung en låt med "kärlek" i titeln — 72%+ träffsäkerhet',
      name: 'Kärleksguru',
    },
    marathoner: {
      description: 'Sjung en låt på 5+ minuter med 75%+ träffsäkerhet',
      name: 'Maratonlöpare',
    },
    metalMarauder: {
      description: 'Sjung en metal-låt med 75%+ träffsäkerhet',
      name: 'Metallmarodör',
    },
    mindPalace: {
      description: '50% av orden är dolda — rent minne!',
      name: 'Minnespalats',
    },
    musicalMaestro: {
      description: 'Sjung en låt från en musical med 75%+ träffsäkerhet',
      name: 'Musicalmaestro',
    },
    noteAdept: {
      description: 'Träffa 200+ rätt noter i en enda låt',
      name: 'Notadept',
    },
    noteApprentice: {
      description: 'Träffa 100+ rätt noter i en enda låt',
      name: 'Notlärling',
    },
    noteLegend: {
      description: 'Träffa 500+ rätt noter i en enda låt',
      name: 'Notlegend',
    },
    noteNovice: {
      description: 'Träffa 50+ rätt noter i en enda låt',
      name: 'Notnovis',
    },
    noteVirtuoso: {
      description: 'Träffa 350+ rätt noter i en enda låt',
      name: 'Notvirtuos',
    },
    octaveOdyssey: {
      description: 'Låten transponerad +7 halvtoner — en hel oktav av smärta!',
      name: 'Oktavodyssé',
    },
    oneWordWonder: {
      description: 'Sjung en låt med ettordstitel — 72%+ träffsäkerhet',
      name: 'Ettordsmirakel',
    },
    perfectPath: {
      description: 'Träffa 25+ perfekta noter i en enda låt',
      name: 'Perfekt spår',
    },
    perfectPilgrim: {
      description: 'Träffa 50+ perfekta noter i en enda låt',
      name: 'Perfekt pilgrim',
    },
    perfectProphet: {
      description: 'Träffa 100+ perfekta noter i en enda låt',
      name: 'Perfekt profet',
    },
    perfectionistPrime: {
      description: 'Bara perfekta noter räknas — träffa 100+ av dem!',
      name: 'Perfekt perfektionist',
    },
    phantomKaraoke: {
      description: 'Helt blind OCH 1.25x hastighet — fantomet saluterar dig!',
      name: 'Karaokefantom',
    },
    pitchClimber: {
      description: 'Låten transponerad +5 halvtoner — klättra på den melodin!',
      name: 'Tonhöjdsklättrare',
    },
    pitchDiver: {
      description: 'Låten transponerad -4 halvtoner — dyk djupt!',
      name: 'Tonhöjdsdykare',
    },
    pitchPerfectParagon: {
      description: 'Avsluta en låt med 97%+ träffsäkerhet',
      name: 'Tonperfekt föredöme',
    },
    polyglotPractice: {
      description: 'Sjung en låt som INTE är på engelska med 70%+ träffsäkerhet',
      name: 'Polyglott träning',
    },
    pulseRacer: {
      description: 'Sjung en låt på 140+ BPM med 70%+ träffsäkerhet',
      name: 'Pulssprinter',
    },
    questionQuest: {
      description: 'Sjung en låt med "?" i titeln — 70%+ träffsäkerhet',
      name: 'Frågeteckenjakt',
    },
    rockRenaissance: {
      description: 'Sjung en rocklåt med 72%+ träffsäkerhet',
      name: 'Rockrenässans',
    },
    scoreScholar: {
      description: 'Få 7 500+ poäng i en enda låt',
      name: 'Poängprofessor',
    },
    scoreScout: {
      description: 'Få 5 000+ poäng i en enda låt',
      name: 'Poängscout',
    },
    scoreSensei: {
      description: 'Få 9 500+ poäng i en enda låt',
      name: 'Poängsensei',
    },
    scoreTitan: {
      description: 'Få 11 500+ poäng i en enda låt',
      name: 'Poängtitan',
    },
    slothSerenade: {
      description: '0.6x hastighet OCH ingen tonhöjdsguide — avslappnat men blind',
      name: 'Sengångarserenad',
    },
    slowGroove: {
      description: 'Sjung en låt på ≤90 BPM med 75%+ träffsäkerhet',
      name: 'Lugn groove',
    },
    speedDemonPlus: {
      description: '1.75x hastighet — för blixtlungor!',
      name: 'Fartsdemon+',
    },
    spotless: {
      description: 'Missa som mest 8 noter i en enda låt',
      name: 'Fläckfri',
    },
    sprintSinger: {
      description: 'Sjung en låt under 3 minuter med 80%+ träffsäkerhet',
      name: 'Sprintsångare',
    },
    surgical: {
      description: 'Missa som mest 3 noter i en enda låt',
      name: 'Kirurgisk precision',
    },
    synthwaveSailor: {
      description: 'Sjung en låt från 1980-talet med 78%+ träffsäkerhet',
      name: 'Synthwave-sjöman',
    },
    toneTuner: {
      description: 'Avsluta en låt med 88%+ träffsäkerhet',
      name: 'Tonstämmare',
    },
    turboMemory: {
      description: '1.25x hastighet OCH 35% saknade ord!',
      name: 'Turbominne',
    },
    turtleTempo: {
      description: '0.5x hastighet — njut av varje enda not',
      name: 'Sköldpaddstempo',
    },
  },
  onlineStats: {
    title: 'Online-statistik',
    loading: 'Laddar online-data…',
    unavailable: 'Online-data är just nu oåtkomlig',
    crowns: 'Låtkronor (#1)',
    topPercent: 'Topp {p}%',
    rankOf: 'Placering #{rank} av {total}',
    notRanked: 'Inte placerad',
    points: 'Poäng online',
    crownExample: 't.ex.',
    recentPlays: 'Senaste online-omgångar',
    noPlays: 'Inga online-omgångar ännu.',
    unknownSong: 'Okänd låt',
  },
};
