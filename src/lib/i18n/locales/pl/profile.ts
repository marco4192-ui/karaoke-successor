// PL translations — profile

export const profileTranslations = {
  profile: {
    title: 'Profile',
    createCharacter: 'Utwórz profil',
    name: 'Nazwa',
    namePlaceholder: 'Nazwa profilu...',
    country: 'Kraj',
    countryOptional: 'Wybierz kraj (opcjonalnie)',
    avatar: 'Awatar',
    uploadPhoto: 'Prześlij zdjęcie',
    create: 'Utwórz',
    edit: 'Edytuj',
    delete: 'Usuń',
    signOutButton: 'Wyloguj na tym urządzeniu',
    signOutTitle: 'Wylogować na tym urządzeniu?',
    signOutText: 'Twój profil online zostaje — usuwane są tylko dane na tym urządzeniu: profil, awatar, lokalne rekordy, postęp dziennych wyzwań i zadań oraz oczekujące wysyłki.',
    signOutHintAccount: 'Możesz w każdej chwili zalogować się ponownie e-mailem i hasłem.',
    signOutConfirm: 'Wyloguj i usuń',
    signOutSuccess: 'Profil usunięty z tego urządzenia — Twoje dane online pozostają nienaruszone.',
    signOutUploading: 'Przesyłanie oczekujących wyników…',
    signOutUploadsFailed: 'Nie udało się przesłać {n} oczekujących wyników (serwer niedostępny). Jeśli kontynuujesz, zostaną odrzucone.',
    signOutForce: 'Wyloguj mimo to',
    pendingUploadsInfo: 'Przed usunięciem zostanie wysłanych {n} oczekujących wyników na serwer.',
    deleteLocalTitle: 'Usunąć profil trwale?',
    deleteLocalText: 'Profil zostanie usunięty wraz ze wszystkimi lokalnymi danymi: rekordami, postępem dziennych wyzwań i zadań oraz awatarem. Nie ma kopii online — tej operacji nie można cofnąć.',
    deleteLocalConfirm: 'Usuń trwale',
    active: 'Aktywny',
    selectAsActive: 'Ustaw jako aktywny',
    noCharacters: 'Brak profili',
    noCharactersDesc: 'Utwórz profil, aby śledzić swoje wyniki i postępy!',
    showOnLeaderboard: 'Pokaż w tabeli wyników',
    showPhoto: 'Pokaż zdjęcie',
    photoUploaded: 'Zdjęcie przesłane',
    noPhoto: 'Brak zdjęcia',
    privacyHint: 'Twoje wyniki będą przesyłane do globalnej tabeli wyników.',
    privacyHintDesc: 'Możesz zrezygnować w każdej chwili w ustawieniach profilu.',
    storageMode: {
      title: 'Miejsce zapisu profilu',
      local: 'Tylko lokalnie',
      localDesc: 'Wszystkie dane pozostają na tym urządzeniu — bez tabeli wyników online i bez synchronizacji.',
      online: 'Profil online',
      onlineDesc: 'Dołącz do tabeli wyników online, synchronizuj między urządzeniami i dziel się codziennymi wynikami.',
      localShort: 'Lokalnie',
      onlineShort: 'Online',
      settingsDesc: 'Zdecyduj, czy ten profil dołącza do tabeli wyników online, czy pozostaje tylko lokalny. Można zmienić w każdej chwili.',
    },
    countrySearch: 'Szukaj kraju…',
    noCountryFound: 'Nie znaleziono kraju',
    popularCountries: 'Popularne',
    allCountries: 'Wszystkie kraje',
  },
  profileAuth: {
    accountTitle: 'Konto online (opcjonalnie)',
    accountDesc: 'Zapisz adres e-mail i hasło, aby móc wczytać ten profil na innym urządzeniu. Logowanie jest możliwe tylko w aplikacji karaoke — nie ma logowania przez przeglądarkę.',
    email: 'E-mail',
    emailPlaceholder: 'twoj@email.com',
    emailInvalid: 'Podaj prawidłowy adres e-mail',
    emailTaken: 'Ten adres e-mail jest już zarejestrowany',
    password: 'Hasło',
    passwordPlaceholder: 'Co najmniej 8 znaków',
    passwordRepeat: 'Powtórz hasło',
    passwordsDontMatch: 'Hasła nie są identyczne',
    passwordTooShort: 'Hasło musi mieć co najmniej 8 znaków',
    registerFailed: 'Nie udało się utworzyć konta online',
    loginTitle: 'Wczytaj profil online',
    loginDesc: 'Wprowadź e-mail i hasło swojego profilu online, aby wczytać go na tym urządzeniu.',
    loginButton: 'Zaloguj się i wczytaj profil',
    loginFailed: 'Logowanie nieudane — sprawdź e-mail i hasło',
    loginSuccess: 'Profil „{n}” wczytany pomyślnie!',
    noSnapshot: 'Na serwerze nie znaleziono jeszcze zsynchronizowanych danych profilu',
    emailNote: 'Używane tylko do logowania — nigdy nie jest pokazywane publicznie',
    changePassword: 'Zmień hasło',
    currentPassword: 'Obecne hasło',
    newPassword: 'Nowe hasło',
    passwordChanged: 'Hasło zostało zmienione',
    passwordChangeFailed: 'Nie udało się zmienić hasła',
    hasAccount: 'Konto online ✓',
    registrationPending: 'Tworzenie konta online…',
    registrationSuccess: 'Konto online utworzone — możesz się teraz zalogować na dowolnym urządzeniu',
    registrationSuccessTitle: '🔐 Konto online',
    loginSuccessTitle: '✅ {n}',
    forgotPassword: 'Nie pamiętasz hasła?',
    newEmail: 'Nowy adres e-mail',
    recoverButton: 'Zresetuj hasło',
    recoverDesc: 'Podaj swój adres e-mail, jednorazowy kod odzyskiwania i nowe hasło. Po udanej operacji serwer wydaje NOWY kod odzyskiwania — zapisz go w bezpiecznym miejscu, zostanie wyświetlony tylko raz.',
    recoverFailed: 'Nie udało się zresetować — sprawdź adres e-mail i kod odzyskiwania',
    recoverRelinkHint: 'Nie masz kodu odzyskiwania? Na urządzeniu z Twoim profilem możesz zamiast tego ponownie podłączyć konto kodem synchronizacji.',
    recoverTitle: 'Zresetuj hasło',
    recoveryCode: 'Kod odzyskiwania',
    recoveryCodePlaceholder: 'XXXX-XXXX-XXXX-XXXX',
    recoveryCopied: 'Skopiowano!',
    recoveryCopy: 'Kopiuj kod',
    recoveryDesc: 'Zapisz ten kod i przechowuj go w bezpiecznym miejscu (w menedżerze haseł lub na papierze). Nie pojawi się już NIGDY — mając adres e-mail + ten kod, samodzielnie zresetujesz zapomniane hasło.',
    recoverySaveHint: 'Bez tego kodu i bez obecnego hasła hasło można zresetować tylko poprzez ponowne podłączenie konta kodem synchronizacji.',
    recoveryTitle: 'Kod odzyskiwania',
    relinkButton: 'Podłącz konto ponownie',
    relinkFailed: 'Nie udało się ponownie podłączyć konta',
    relinkHint: 'Zastępuje podłączone konto (stary adres e-mail i hasło tracą ważność). Potrzebujesz tylko kodu synchronizacji — później otrzymasz nowy kod odzyskiwania.',
    relinkSuccess: 'Konto online podłączone ponownie — zapamiętaj swój adres e-mail i hasło',
    relinkTitle: 'Ponownie podłącz konto online',
    saveCodeFile: 'Zapisz jako plik tekstowy',
  },
  characterScreen: {
    title: 'Profile',
    description: 'Twórz i zarządzaj profilami śpiewaków',
    onlineLeaderboard: 'Tabela wyników online',
    createProfile: 'Utwórz nowy profil',
    yourProfiles: 'Twoje profile ({n})',
    noProfiles: 'Brak profili. Kliknij "Utwórz nowy profil", aby rozpocząć!',
    settingsTitle: 'Ustawienia profilu',
    nameAndAvatar: 'Nazwa i awatar',
    rankDisplay: 'Wyświetlanie rangi',
    showRankInName: 'Pokaż rangę w nazwie',
    rankPrefix: 'Przedrostek',
    rankSuffix: 'Przyrostek',
    rankFull: 'Pełna',
    countryAndPrivacy: 'Kraj i prywatność',
    selectCountry: 'Wybierz kraj',
    visible: 'Widoczny',
    hidden: 'Ukryty',
    shown: 'Widoczny',
    companionAppLink: 'Link do aplikacji kompana',
    companionAppLinkDesc: 'Zeskanuj ten kod QR, aby połączyć się bezpośrednio z tym profilem w aplikacji kompana.',
    hideQrCode: 'Ukryj QR Code',
    showQrCode: 'Pokaż QR Code',
    leaderboardParticipation: 'Udział w tabeli wyników',
    leaderboardParticipationDesc: 'Bierz udział w internetowej tabeli wyników i dziel się swoimi wynikami z innymi graczami',
    loadProfile: 'Wczytaj profil online',
  },
  characterCard: {
    connected: 'Połączono',
    connectedWith: 'Połączono: {n}',
  },
  profileSync: {
    title: 'Synchronizacja profilu',
    uploadSuccess: 'Profil przesłany! Kod synchronizacji: {n}',
    uploadFailed: 'Przesyłanie nie powiodło się',
    downloadFailed: 'Nie udało się przesłać profilu',
    invalidCode: 'Wprowadź prawidłowy kod synchronizacji (8 lub 12 znaków)',
    syncSuccess: 'Profil zsynchronizowany pomyślnie!',
    notFound: 'Profil nie znaleziony',
    profileNotFound: 'Nie znaleziono profilu',
    downloadFailedMsg: 'Nie udało się pobrać profilu. Sprawdź kod synchronizacji.',
    syncCode: 'Kod synchronizacji:',
    upload: 'Prześlij',
    syncCodePlaceholder: 'Kod synchronizacji',
    deleteOnline: 'Usuń dane online',
    deleteOnlineHint: 'Usuwa Twój profil online, wszystkie wyniki, codzienne rezultaty i kopie zapasowe z serwera. Twój lokalny profil zostaje.',
    deleteOnlineConfirmTitle: 'Trwale usunąć dane online?',
    deleteOnlineConfirmText: 'To usunie Twój profil online z serwera tabeli wyników, łącznie ze wszystkimi wynikami, codziennymi rezultatami, kopiami zapasowymi profilu i podłączonym kontem online. Twój lokalny profil zostaje. Tego kroku nie można cofnąć.',
    deleteOnlineConfirm: 'Usuń trwale',
    deleteOnlineSuccess: 'Dane online usunięte. Twój profil jest teraz wyłącznie lokalny.',
    deleteOnlineFailed: 'Nie udało się usunąć danych online',
    syncCodeWarning: 'Zapisz ten kod! Bez niego (albo bez konta online z hasłem) Twojego profilu online nie da się odzyskać.',
    saveCodeFile: 'Zapisz kod jako plik tekstowy',
  },
  playerProgression: {
    active: 'Aktywny',
    inactive: 'Nieaktywny',
    progressToNext: 'Postęp do następnego poziomu',
    xpNeeded: 'Wymagane XP',
    songsPlayed: 'Rozegrane piosenki',
    goldenNotes: 'Złote nuty',
    bestCombo: 'Najlepsze Combo',
    totalScore: 'Wynik końcowy',
    achievementsTitle: 'Osiągnięcia',
    more: '+{n} więcej',
    beginner: 'Początkujący',
    xp: 'XP',
    lv: 'Poziom {n}',
  },
  achievements: {
    title: 'Osiągnięcia',
    unlocked: 'Odblokowane',
    locked: 'Zablokowane',
    progress: 'Postęp',
    noAchievements: 'Brak osiągnięć',
    playToUnlock: 'Graj, aby odblokować osiągnięcia!',
    rarity: 'Rzadkość',
    common: 'Zwykłe',
    uncommon: 'Niezwykłe',
    rare: 'Rzadkie',
    epic: 'Epickie',
    legendary: 'Legendarne',
    first_note: {
      name: 'Pierwsza nuta',
      description: 'Traf swoją pierwszą nutę',
    },
    perfect_ten: {
      name: 'Idealna dziesiątka',
      description: 'Zdobądź 10 trafień PERFECT w jednym utworze',
    },
    combo_master: {
      name: 'Mistrz kombosów',
      description: 'Zdobądź 50-nutowe kombo',
    },
    combo_king: {
      name: 'Król kombosów',
      description: 'Zdobądź 100-nutowe kombo',
    },
    combo_legend: {
      name: 'Legenda kombosów',
      description: 'Zdobądź 200-nutowe kombo',
    },
    perfect_song: {
      name: 'Idealny utwór',
      description: 'Uzyskaj 99.5%+ celności w utworze',
    },
    accuracy_90: {
      name: 'Idealna intonacja',
      description: 'Uzyskaj ponad 90% celności',
    },
    score_8k: {
      name: 'Gwiazda wschodząca',
      description: 'Zdobądź ponad 8000 punktów',
    },
    score_9k: {
      name: 'Mistrz wyników',
      description: 'Zdobądź ponad 9000 punktów',
    },
    score_9500: {
      name: 'Bezbłędny',
      description: 'Zdobądź ponad 9500 punktów',
    },
    golden_collector: {
      name: 'Złoty kolekcjoner',
      description: 'Traf 10 złotych nut',
    },
    golden_master: {
      name: 'Złoty mistrz',
      description: 'Traf 50 złotych nut',
    },
    first_song: {
      name: 'Pierwsze kroki',
      description: 'Ukończ swój pierwszy utwór',
    },
    ten_songs: {
      name: 'Fan karaoke',
      description: 'Ukończ 10 utworów',
    },
    fifty_songs: {
      name: 'Bywalec karaoke',
      description: 'Ukończ 50 utworów',
    },
    hundred_songs: {
      name: 'Legenda karaoke',
      description: 'Ukończ 100 utworów',
    },
    five_games: {
      name: 'Rozpoczynamy',
      description: 'Zagraj 5 gier',
    },
    twenty_games: {
      name: 'Oddany śpiewak',
      description: 'Zagraj 20 gier',
    },
    party_time: {
      name: 'Czas imprezy!',
      description: 'Zagraj w tryb imprezowy',
    },
    duel_winner: {
      name: 'Mistrz duelu',
      description: 'Wygraj duel',
    },
    pass_the_mic: {
      name: 'Przekaż mikrofon!',
      description: 'Zagraj w tryb Przekaż mikrofon',
    },
    shower_singer: {
      name: 'Śpiewak spod prysznica',
      description: 'Uzyskaj poniżej 20% w utworze',
    },
    comeback_king: {
      name: 'Król powrotów',
      description: 'Zdobądź 50+ kombo po spudłowaniu 10 nut',
    },
    speed_demon: {
      name: 'Demon prędkości',
      description: 'Ukończ utwór na prędkości 1.5x',
    },
    blind_master: {
      name: 'Mistrz ciemności',
      description: 'Ukończ utwór w trybie Ślepego Karaoke',
    },
    daily_starter: {
      name: 'Dzienny Debiutant',
      description: 'Ukończ swoje pierwsze dzienne wyzwanie',
    },
    daily_regular: {
      name: 'Dzienny Bywalec',
      description: 'Ukończ 10 dziennych wyzwań',
    },
    daily_devoted: {
      name: 'Dzienny Zapaleniec',
      description: 'Ukończ 50 dziennych wyzwań',
    },
    streak_week: {
      name: 'W Ogniu',
      description: 'Utrzymaj 7-dniową dzienną serię',
    },
    streak_month: {
      name: 'Niepowstrzymany',
      description: 'Utrzymaj 30-dniową dzienną serię',
    },
    weekly_warrior: {
      name: 'Wojownik Tygodnia',
      description: 'Ukończ 5 tygodniowych wyzwań',
    },
    accuracy_95: {
      name: 'Precyzyjny Wokalista',
      description: 'Osiągnij ponad 95% celności',
    },
    golden_rush: {
      name: 'Gorączka Złota',
      description: 'Traf 20 złotych nut w jednej piosence',
    },
    golden_hundred: {
      name: 'Złoty Centurion',
      description: 'Traf łącznie 100 złotych nut',
    },
    perfect_fifty: {
      name: 'Perfekcyjna Pięćdziesiątka',
      description: 'Traf 50 perfekcyjnych nut w jednej piosence',
    },
    lightning_lips: {
      name: 'Błyskawiczne Usta',
      description: 'Ukończ piosenkę z prędkością 2x',
    },
    duet_harmony: {
      name: 'Idealna Harmonia',
      description: 'Zaśpiewaj 10 duetów',
    },
    genre_explorer: {
      name: 'Odkrywca Gatunków',
      description: 'Zaśpiewaj piosenki z 5 różnych gatunków',
    },
    disney_fan: {
      name: 'Fan Disneya',
      description: 'Zaśpiewaj 10 piosenek Disneya',
    },
    night_owl: {
      name: 'Nocna Sowa',
      description: 'Ukończ piosenkę między północą a 4 rano',
    },
    early_bird: {
      name: 'Ranny Ptak',
      description: 'Ukończ piosenkę przed 8 rano',
    },
    marathon_singer: {
      name: 'Maratończyk Śpiewu',
      description: 'Zagraj 5 gier w ciągu jednego dnia',
    },
    score_9800: {
      name: 'Ultragwiazda',
      description: 'Zdobądź ponad 9800 punktów',
    },
    score_9900: {
      name: 'Poza perfekcją',
      description: 'Zdobądź ponad 9900 punktów',
    },
    combo_300: {
      name: 'Tytan kombosów',
      description: 'Zdobądź 300-nutowe kombo',
    },
    combo_500: {
      name: 'Nieśmiertelne kombo',
      description: 'Zdobądź 500-nutowe kombo',
    },
    accuracy_92: {
      name: 'Dostrojenie',
      description: 'Uzyskaj ponad 92% celności',
    },
    accuracy_94: {
      name: 'Jakość studyjna',
      description: 'Uzyskaj ponad 94% celności',
    },
    accuracy_96: {
      name: 'Snajper',
      description: 'Uzyskaj ponad 96% celności',
    },
    accuracy_97: {
      name: 'Laserowa precyzja',
      description: 'Uzyskaj ponad 97% celności',
    },
    accuracy_98: {
      name: 'Wirtuoz',
      description: 'Uzyskaj ponad 98% celności',
    },
    perfect_75: {
      name: 'Perfekcyjne 75',
      description: 'Traf 75 perfekcyjnych nut w jednym utworze',
    },
    perfect_100: {
      name: 'Perfekcyjna setka',
      description: 'Traf 100 perfekcyjnych nut w jednym utworze',
    },
    perfect_150: {
      name: 'Perfekcyjna burza',
      description: 'Traf 150 perfekcyjnych nut w jednym utworze',
    },
    golden_30: {
      name: 'Złota fala',
      description: 'Traf 30 złotych nut w jednym utworze',
    },
    golden_40: {
      name: 'Złota symfonia',
      description: 'Traf 40 złotych nut w jednym utworze',
    },
    perfect_500: {
      name: 'Perfekcyjna maszyna',
      description: 'Traf łącznie 500 perfekcyjnych nut',
    },
    perfect_1000: {
      name: 'Potęga precyzji',
      description: 'Traf łącznie 1000 perfekcyjnych nut',
    },
    perfect_5000: {
      name: 'Perfekcyjna lawina',
      description: 'Traf łącznie 5000 perfekcyjnych nut',
    },
    perfect_10000: {
      name: 'Perfekcyjne dziesięć tysięcy',
      description: 'Traf łącznie 10 000 perfekcyjnych nut',
    },
    golden_250: {
      name: 'Złote żniwa',
      description: 'Traf łącznie 250 złotych nut',
    },
    golden_1000: {
      name: 'Złota ulewa',
      description: 'Traf łącznie 1000 złotych nut',
    },
    golden_5000: {
      name: 'Głos Midasa',
      description: 'Traf łącznie 5000 złotych nut',
    },
    songs_250: {
      name: 'Weteran śpiewnika',
      description: 'Ukończ 250 utworów',
    },
    songs_500: {
      name: 'Klub pół tysiąca',
      description: 'Ukończ 500 utworów',
    },
    songs_1000: {
      name: 'Legenda tysiąca utworów',
      description: 'Ukończ 1000 utworów',
    },
    games_50: {
      name: 'Częsty śpiewak',
      description: 'Zagraj 50 gier',
    },
    games_100: {
      name: 'Klub setki',
      description: 'Zagraj 100 gier',
    },
    games_250: {
      name: 'Bywalec Arcade',
      description: 'Zagraj 250 gier',
    },
    games_500: {
      name: 'Maniak maratonów',
      description: 'Zagraj 500 gier',
    },
    level_25: {
      name: 'Wprawiony wokalista',
      description: 'Osiągnij poziom 25',
    },
    level_50: {
      name: 'Elitarny wokalista',
      description: 'Osiągnij poziom 50',
    },
    level_100: {
      name: 'Legenda poziomu 100',
      description: 'Osiągnij poziom 100',
    },
    daily_100: {
      name: 'Dzienny centurion',
      description: 'Ukończ 100 dziennych wyzwań',
    },
    daily_250: {
      name: 'Dzienny fanatyk',
      description: 'Ukończ 250 dziennych wyzwań',
    },
    daily_500: {
      name: 'Dzienny nieśmiertelny',
      description: 'Ukończ 500 dziennych wyzwań',
    },
    streak_60: {
      name: 'Żelazna wola',
      description: 'Utrzymaj 60-dniową dzienną serię',
    },
    streak_100: {
      name: 'Bohater stu dni',
      description: 'Utrzymaj 100-dniową dzienną serię',
    },
    streak_180: {
      name: 'Półroczne oddanie',
      description: 'Utrzymaj 180-dniową dzienną serię',
    },
    streak_365: {
      name: 'Legenda roku',
      description: 'Utrzymaj 365-dniową dzienną serię',
    },
    weekly_15: {
      name: 'Tygodniowy twardziel',
      description: 'Ukończ 15 tygodniowych wyzwań',
    },
    weekly_30: {
      name: 'Tygodniowy filar',
      description: 'Ukończ 30 tygodniowych wyzwań',
    },
    weekly_52: {
      name: 'Rok tygodni',
      description: 'Ukończ 52 tygodniowe wyzwania',
    },
    encore_10: {
      name: 'Bis!',
      description: 'Zagraj 10 gier w ciągu jednego dnia',
    },
    duets_25: {
      name: 'Wielbiciel duetów',
      description: 'Zaśpiewaj 25 duetów',
    },
    duets_50: {
      name: 'Dynamiczne duo',
      description: 'Zaśpiewaj 50 duetów',
    },
    duets_100: {
      name: 'Duetowa setka',
      description: 'Zaśpiewaj 100 duetów',
    },
    duels_5: {
      name: 'Duelant',
      description: 'Wygraj 5 duelów',
    },
    duels_10: {
      name: 'Mistrz duelów',
      description: 'Wygraj 10 duelów',
    },
    duels_25: {
      name: 'Władca duelów',
      description: 'Wygraj 25 duelów',
    },
    party_10: {
      name: 'Imprezowicz',
      description: 'Zagraj w 10 gier imprezowych',
    },
    party_25: {
      name: 'Dusza towarzystwa',
      description: 'Zagraj w 25 gier imprezowych',
    },
    party_50: {
      name: 'Legenda imprez',
      description: 'Zagraj w 50 gier imprezowych',
    },
    disney_25: {
      name: 'Entuzjasta Disneya',
      description: 'Zaśpiewaj 25 piosenek Disneya',
    },
    disney_50: {
      name: 'Dawno, dawno temu piosenka',
      description: 'Zaśpiewaj 50 piosenek Disneya',
    },
    genres_8: {
      name: 'Wędrowiec gatunków',
      description: 'Zaśpiewaj piosenki z 8 różnych gatunków',
    },
    genres_10: {
      name: 'Koneser gatunków',
      description: 'Zaśpiewaj piosenki z 10 różnych gatunków',
    },
    clean_sheet: {
      name: 'Czyste konto',
      description: 'Ukończ utwór z ponad 50 nutami i bez ani jednego pudła',
    },
    weekend_singer: {
      name: 'Weekendowy śpiewak',
      description: 'Ukończ utwór w sobotę lub niedzielę',
    },
    lunch_break: {
      name: 'Przerwa na obiad',
      description: 'Ukończ utwór między godziną 12 a 14',
    },
  },
  achievementsScreen: {
    title: '🏆 Osiągnięcia',
    description: 'Odblokowuj osiągnięcia grając!',
    unlocked: 'Odblokowane',
    xpEarned: 'Zdobyte XP',
    completion: 'Ukończenie',
    all: 'Wszystkie',
    categories: {
      performance: 'wydajność',
      progression: 'postęp',
      social: 'społeczne',
      special: 'specjalne',
    },
    plusXp: '+{n} XP',
    locked: 'Zablokowane',
    viewPlayer: 'Osiągnięcia gracza',
    viewingOther: 'Widzisz osiągnięcia gracza {n}. Każdy gracz odblokowuje własne osiągnięcia.',
    noMatches: 'Żadne osiągnięcia nie pasują do tych filtrów',
  },
  badgeNames: {
    'first-challenge': 'Pierwsze kroki',
    'week-warrior': 'Wojownik tygodnia',
    'fortnight-fighter': 'Bohater dwóch tygodni',
    'monthly-master': 'Mistrz miesiąca',
    'top-3': 'Podium',
    champion: 'Dzienny mistrz',
    dedicated: 'Oddany śpiewak',
    legendary: 'Status legendarny',
    'century-champion': 'Mistrz stulecia',
    'yearly-legend': 'Roczna legenda',
    explorer: 'Odkrywca wyzwań',
    songbird: 'Śpiewający ptak',
    'weekly-warrior-q': 'Wojownik tygodnia',
  },
  badgeDescriptions: {
    'first-challenge': 'Ukończ swoje pierwsze codzienne wyzwanie',
    'week-warrior': 'Utrzymaj serię 7 dni',
    'fortnight-fighter': 'Utrzymaj serię 14 dni',
    'monthly-master': 'Utrzymaj serię 30 dni',
    'top-3': 'Zajmij miejsce w pierwszej trójce codziennego wyzwania',
    champion: 'Wygraj codzienne wyzwanie',
    dedicated: 'Ukończ 30 codziennych wyzwań',
    legendary: 'Zdobądź łącznie 10 000 XP',
    'century-champion': 'Utrzymaj serię 100 dni',
    'yearly-legend': 'Utrzymaj serię 365 dni',
    explorer: 'Zagraj w 5 różnych trybach wyzwań',
    songbird: 'Ukończ łącznie 10 piosenek',
    'weekly-warrior-q': 'Ukończ 3 tygodniowe wyzwania',
  },
  mobileAchievements: {
    first_song: {
      title: 'Pierwsze kroki',
      description: 'Zaśpiewaj swój pierwszy utwór',
    },
    ten_songs: {
      title: 'Gwiazda wschodząca',
      description: 'Zaśpiewaj 10 utworów',
    },
    fifty_songs: {
      title: 'Weteran',
      description: 'Zaśpiewaj 50 utworów',
    },
    perfect_score: {
      title: 'Perfekcjonista',
      description: 'Zdobądź idealny wynik (95%+)',
    },
    five_perfect: {
      title: 'Bezbłędny',
      description: 'Zdobądź 5 idealnych wyników',
    },
    high_score: {
      title: 'Mistrz wyników',
      description: 'Zdobądź łącznie 10 000 punktów',
    },
    queue_5: {
      title: 'Twórca playlist',
      description: 'Dodaj do kolejki 5 utworów',
    },
    genre_3: {
      title: 'Odkrywca gatunków',
      description: 'Zaśpiewaj utwory z 3 gatunków',
    },
  },
  challenges: {
    requirements: {
      minLevel: 'Wymaga poziomu {required} (jesteś na poziomie {current})',
      minSongs: 'Wymaga {required} ukończonych utworów (masz {current})',
      achievement: 'Wymaga osiągnięcia: {name}',
      rankNoXP: 'Nie można zweryfikować wymogu rankingu (brak danych XP)',
      unknownRank: 'Nieznany ranking "{name}"',
      rankRequired: 'Wymaga rankingu "{required}" (masz "{current}")',
      challengeCompleted: 'Najpierw ukończ „{name}”',
    },
    balladBarometer: {
      description: 'Ukończ piosenkę z celnością 80%+',
      name: 'Balladowy barometr',
    },
    bandBattle: {
      description: 'Zaśpiewaj piosenkę zespołu lub duetu — celność 72%+',
      name: 'Bitwa zespołów',
    },
    blindfoldBard: {
      description: 'Bez tekstu ORAZ 20% brakujących słów',
      name: 'Ślepy bard',
    },
    cleanCut: {
      description: 'Spudłuj najwyżej 20 nut w jednej piosence',
      name: 'Czyste cięcie',
    },
    comboCadet: {
      description: 'Uzyskaj 30+ combo nut w jednej piosence',
      name: 'Kadet combo',
    },
    comboCaptain: {
      description: 'Uzyskaj 60+ combo nut w jednej piosence',
      name: 'Kapitan combo',
    },
    comboColossus: {
      description: 'Uzyskaj 175+ combo nut w jednej piosence',
      name: 'Kolos combo',
    },
    comboCommander: {
      description: 'Uzyskaj 100+ combo nut w jednej piosence',
      name: 'Dowódca combo',
    },
    countryCrooner: {
      description: 'Zaśpiewaj piosenkę country z celnością 70%+',
      name: 'Country\'owy crooner',
    },
    deutschlandDreams: {
      description: 'Zaśpiewaj piosenkę niemieckojęzyczną z celnością 72%+',
      name: 'Niemieckie marzenia',
    },
    discoDazzler: {
      description: 'Zaśpiewaj piosenkę z lat 70. z celnością 70%+',
      name: 'Disco blask',
    },
    disneyDream: {
      description: 'Zaśpiewaj piosenkę od Disneya z celnością 75%+',
      name: 'Disneyowy sen',
    },
    duoDynamo: {
      description: 'Zaśpiewaj piosenkę z gościnnym artystą — celność 70%+',
      name: 'Dynamo duetu',
    },
    flawlessMirror: {
      description: 'Spudłuj ZERO nut w jednej piosence',
      name: 'Nieskazitelne lustro',
    },
    freshFinders: {
      description: 'Zaśpiewaj piosenkę, której NIGDY wcześniej nie śpiewałeś — celność 68%+',
      name: 'Poszukiwacze nowości',
    },
    goldBaron: {
      description: 'Traf 12+ złotych nut w jednej piosence',
      name: 'Baron złota',
    },
    goldMiner: {
      description: 'Traf 6+ złotych nut w jednej piosence',
      name: 'Górnik złota',
    },
    goldPanner: {
      description: 'Traf 3+ złotych nut w jednej piosence',
      name: 'Płukacz złota',
    },
    goldenGauntlet: {
      description: 'Liczą się tylko złote nuty — a potrzebujesz celności 80%+',
      name: 'Złota rękawica',
    },
    harmonyHunter: {
      description: 'Ukończ piosenkę z celnością 93%+',
      name: 'Łowca harmonii',
    },
    kpopConnoisseur: {
      description: 'Zaśpiewaj piosenkę K-pop z celnością 78%+',
      name: 'Koneser K-popu',
    },
    latinFlare: {
      description: 'Zaśpiewaj piosenkę latynoską z celnością 70%+',
      name: 'Latynoski blask',
    },
    lightningLungs: {
      description: '2x prędkość — zupełnie bez tchu!',
      name: 'Błyskawiczne płuca',
    },
    loveGuru: {
      description: 'Zaśpiewaj piosenkę ze słowem „love” w tytule — celność 72%+',
      name: 'Guru miłości',
    },
    marathoner: {
      description: 'Zaśpiewaj piosenkę o długości 5+ minut z celnością 75%+',
      name: 'Maratończyk',
    },
    metalMarauder: {
      description: 'Zaśpiewaj piosenkę metalową z celnością 75%+',
      name: 'Metalowy marauder',
    },
    mindPalace: {
      description: '50% słów jest ukrytych — czysta pamięć!',
      name: 'Pałac pamięci',
    },
    musicalMaestro: {
      description: 'Zaśpiewaj piosenkę z musicalu z celnością 75%+',
      name: 'Mistrz musicalu',
    },
    noteAdept: {
      description: 'Traf 200+ poprawnych nut w jednej piosence',
      name: 'Nutowy adept',
    },
    noteApprentice: {
      description: 'Traf 100+ poprawnych nut w jednej piosence',
      name: 'Nutowy uczeń',
    },
    noteLegend: {
      description: 'Traf 500+ poprawnych nut w jednej piosence',
      name: 'Nutowa legenda',
    },
    noteNovice: {
      description: 'Traf 50+ poprawnych nut w jednej piosence',
      name: 'Nutowy nowicjusz',
    },
    noteVirtuoso: {
      description: 'Traf 350+ poprawnych nut w jednej piosence',
      name: 'Nutowy wirtuoz',
    },
    octaveOdyssey: {
      description: 'Piosenka transponowana +7 półtonów — cała oktawa bólu!',
      name: 'Oktawowa odyseja',
    },
    oneWordWonder: {
      description: 'Zaśpiewaj piosenkę z tytułem z jednego słowa z celnością 72%+',
      name: 'Cud jednego słowa',
    },
    perfectPath: {
      description: 'Traf 25+ perfekcyjnych nut w jednej piosence',
      name: 'Perfekcyjna ścieżka',
    },
    perfectPilgrim: {
      description: 'Traf 50+ perfekcyjnych nut w jednej piosence',
      name: 'Perfekcyjny pielgrzym',
    },
    perfectProphet: {
      description: 'Traf 100+ perfekcyjnych nut w jednej piosence',
      name: 'Perfekcyjny prorok',
    },
    perfectionistPrime: {
      description: 'Liczą się tylko perfekcyjne nuty — traf ich 100+!',
      name: 'Perfekcjonista absolutny',
    },
    phantomKaraoke: {
      description: 'Całkowicie w ciemno ORAZ 1,25x prędkość — upiór Ci salutuje!',
      name: 'Upiór karaoke',
    },
    pitchClimber: {
      description: 'Piosenka transponowana +5 półtonów — wdrap się na tę melodię!',
      name: 'Wspinacz tonów',
    },
    pitchDiver: {
      description: 'Piosenka transponowana -4 półtony — nurkuj głęboko!',
      name: 'Nurek tonów',
    },
    pitchPerfectParagon: {
      description: 'Ukończ piosenkę z celnością 97%+',
      name: 'Absolutna czystość',
    },
    polyglotPractice: {
      description: 'Zaśpiewaj piosenkę, która NIE jest po angielsku, z celnością 70%+',
      name: 'Poliglotyczna praktyka',
    },
    pulseRacer: {
      description: 'Zaśpiewaj piosenkę z 140+ BPM z celnością 70%+',
      name: 'Ścigacz pulsu',
    },
    questionQuest: {
      description: 'Zaśpiewaj piosenkę ze znakiem zapytania w tytule — celność 70%+',
      name: 'Wyprawa pytajnika',
    },
    rockRenaissance: {
      description: 'Zaśpiewaj piosenkę rockową z celnością 72%+',
      name: 'Rockowy renesans',
    },
    scoreScholar: {
      description: 'Zdobądź 7 500+ punktów w jednej piosence',
      name: 'Punktowy uczony',
    },
    scoreScout: {
      description: 'Zdobądź 5 000+ punktów w jednej piosence',
      name: 'Zwiadowca punktów',
    },
    scoreSensei: {
      description: 'Zdobądź 9 500+ punktów w jednej piosence',
      name: 'Punktowy sensei',
    },
    scoreTitan: {
      description: 'Zdobądź 11 500+ punktów w jednej piosence',
      name: 'Tytan punktów',
    },
    slothSerenade: {
      description: '0,6x prędkość ORAZ bez podpowiedzi wysokości — relaks, ale w ciemno',
      name: 'Serenada leniwca',
    },
    slowGroove: {
      description: 'Zaśpiewaj piosenkę ≤90 BPM z celnością 75%+',
      name: 'Wolny groove',
    },
    speedDemonPlus: {
      description: '1,75x prędkość — dla błyskawicznych płuc!',
      name: 'Demon prędkości+',
    },
    spotless: {
      description: 'Spudłuj najwyżej 8 nut w jednej piosence',
      name: 'Bez skazy',
    },
    sprintSinger: {
      description: 'Zaśpiewaj piosenkę krótszą niż 3 minuty z celnością 80%+',
      name: 'Śpiewak sprinter',
    },
    surgical: {
      description: 'Spudłuj najwyżej 3 nuty w jednej piosence',
      name: 'Chirurgiczna precyzja',
    },
    synthwaveSailor: {
      description: 'Zaśpiewaj piosenkę z lat 80. z celnością 78%+',
      name: 'Synthwave\'owy żeglarz',
    },
    toneTuner: {
      description: 'Ukończ piosenkę z celnością 88%+',
      name: 'Stroiciel tonu',
    },
    turboMemory: {
      description: '1,25x prędkość ORAZ 35% brakujących słów!',
      name: 'Turbopamięć',
    },
    turtleTempo: {
      description: '0,5x prędkość — rozkoszuj się każdą nutą',
      name: 'Tempo żółwia',
    },
  },
  onlineStats: {
    title: 'Statystyki online',
    loading: 'Ładowanie danych online…',
    unavailable: 'Dane online są obecnie niedostępne',
    crowns: 'Korony za piosenki (#1)',
    topPercent: 'Top {p}%',
    rankOf: 'Pozycja #{rank} z {total}',
    notRanked: 'Poza rankingiem',
    points: 'Punkty online',
    crownExample: 'np.',
    recentPlays: 'Ostatnie rundy online',
    noPlays: 'Nie ma jeszcze rund online.',
    unknownSong: 'Nieznana piosenka',
  },
};
