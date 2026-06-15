// RU translations — game
// Auto-split from monolithic locale file

export const gameTranslations = {
  game: {
    back: 'Назад',
    sync: 'Синхронизация',
    pts: 'очков',
    combo: 'комбо',
    practiceMode: 'Режим практики',
    enablePractice: 'Включить режим практики',
    playbackSpeed: 'Скорость воспроизведения',
    pitchGuide: 'Подсказка тональности',
    audioEffects: 'Аудиоэффекты',
    reverb: 'Реверберация',
    echo: 'Эхо',
    pause: 'Пауза',
    resume: 'Продолжить',
    restart: 'Начать заново',
    endSong: 'Завершить песню',
    lyrics: 'Текст песни',
    notes: 'Ноты',
    score: 'Счёт'
  },

  gameScreen: {
    noSongSelected: 'Песня не выбрана',
    noSongLoaded: 'Песня не загружена',
    backToLibrary: 'В библиотеку',
    pause: '⏸ Пауза',
    lowPerf: '⚡ Низкая производительность',
    youtubeErrorDeleted: 'Видео YouTube не найдено (удалено или скрыто)',
    youtubeErrorEmbed: 'Это видео нельзя встроить (встраивание отключено)',
    youtubeErrorVevo: 'Это видео нельзя встроить (ограничение Vevo/встраивания)',
    youtubeErrorInvalid: 'Неверный параметр YouTube',
    youtubeErrorHtml5: 'Ошибка HTML5 в плеере YouTube',
    youtubeErrorCode: 'Ошибка YouTube (Код: {n})'
  },

  gameHud: {
    audioEffects: 'Аудиоэффекты',
    reverb: 'Реверберация: {n}%',
    echo: 'Эхо: {n}%',
    presets: 'Пресеты',
    adPlaying: 'Реклама',
    gamePaused: 'Игра на паузе'
  },

  gameEnhancements: {
    loadingStats: 'Загрузка статистики...',
    noCharacter: 'Выберите или создайте профиль для просмотра статистики',
    totalScore: 'Итоговый счёт',
    gamesPlayed: 'Игр сыграно',
    avgAccuracy: 'Средняя точность',
    bestCombo: 'Лучшее комбо',
    recentAchievements: 'Последние достижения'
  },

  prominentScore: {
    player1: 'Игрок 1',
    player2: 'Игрок 2',
    combo: 'КОМБО',
    comboMultiplied: '{n}x КОМБО!'
  },

  practicePanel: {
    title: 'Режим практики',
    enable: 'Включить режим практики',
    pitchGuide: 'Подсказка тональности',
    autoPlayNotes: 'Автовоспроизведение нот'
  },

  mic: {
    title: 'Настройки микрофона',
    multiMic: 'Мульти-микрофонный режим',
    multiMicDesc: 'Используйте несколько микрофонов одновременно для дуэтов или группового пения',
    selectDevice: 'Выберите микрофон',
    defaultMic: 'Микрофон по умолчанию',
    addMic: 'Добавить микрофон',
    removeMic: 'Удалить',
    assignToPlayer: 'Назначить игроку',
    level: 'Уровень',
    gain: 'Усиление',
    noiseSuppression: 'Шумоподавление',
    noiseSuppressionDesc: 'Уменьшить фоновый шум',
    echoCancellation: 'Подавление эха',
    echoCancellationDesc: 'Уменьшить обратную связь от колонок',
    test: 'Проверить микрофон',
    testing: 'Проверка...',
    noMicsFound: 'Микрофоны не найдены. Подключите микрофон и обновите.',
    connected: 'Подключён',
    disconnected: 'Отключён'
  },

  webcamBackground: {
    enable: 'Включить веб-камеру',
    enableDesc: 'Снимайте певцов во время выступления',
    cameraDevice: 'Устройство камеры',
    selectCamera: 'Выберите камеру',
    defaultCamera: 'Камера по умолчанию',
    camera: 'Камера',
    size: 'Размер',
    position: 'Позиция',
    filter: 'Фильтр',
    opacity: 'Непрозрачность',
    showBorder: 'Показать рамку',
    fullscreen: 'Полный экран',
    top: 'Сверху',
    bottom: 'Снизу',
    left: 'Слева',
    right: 'Справа',
    active: 'Активна',
    errorPermission: 'Доступ к камере запрещён...',
    errorNoCamera: 'Камера не найдена...'
  },

  results: {
    perfect: 'Идеально!',
    excellent: 'Отлично!',
    good: 'Хорошо!',
    okay: 'Неплохо!',
    poor: 'Плохо',
    totalScore: 'Итоговый счёт',
    notesHit: 'Нот попаданий',
    notesMissed: 'Нот пропущено',
    bestCombo: 'Лучшее комбо',
    accuracy: 'Точность',
    playAgain: 'Играть снова',
    backToHome: 'На главную',
    shareScore: 'Поделиться результатом',
    scoreCard: 'Карточка результата',
    videoShort: 'Короткое видео',
    downloadCard: 'Скачать карточку',
    uploadingToLeaderboard: 'Загрузка в глобальную таблицу лидеров...',
    newHighscore: 'Новый рекорд!',
    rating: 'Оценка',
    draw: 'Ничья'
  },

  resultsScreen: {
    newGlobalHighscore: '🎉 Новый глобальный рекорд!',
    uploadedRank: 'Загружено! Место #{n}',
    uploadFailed: 'Ошибка загрузки',
    noResults: 'Нет результатов',
    accuracyLabel: '{n}% точность',
    player: 'Игрок',
    scores: 'Результаты',
    replay: 'Повтор'
  },

  scoreVisualization: {
    title: 'Анализ результата',
    poor: 'Плохо',
    okay: 'Неплохо',
    good: 'Хорошо',
    excellent: 'Отлично',
    perfect: 'Идеально',
    duelComparison: '⚔️ Сравнение дуэли',
    accuracy: '{n}% точность',
    maxCombo: '{n}x макс. комбо',
    p1Wins: '🏆 ИГРОК 1 ПОБЕДИЛ!',
    p2Wins: '🏆 ИГРОК 2 ПОБЕДИЛ!',
    draw: '🤝 НИЧЬЯ!',
    notesHit: 'Попаданий',
    maxComboLabel: 'Макс. комбо',
    player1: 'Игрок 1',
    player2: 'Игрок 2',
    score: 'Счёт',
    combo: 'Комбо',
    consistency: 'Стабильность',
    rating: 'Оценка',
    notes: 'Ноты',
    finalScore: 'Итоговый счёт',
    maxScore: 'Макс. счёт',
    notesMissed: 'Промахов',
    category: 'Категория',
    player1Wins: 'Игрок 1 победил!',
    player2Wins: 'Игрок 2 победил!',
    drawResult: 'Ничья!',
    scoreBattle: 'Битва счётов',
    player1Abbr: 'И1',
    player2Abbr: 'И2',
    stat: 'Параметр'
  },

  highscore: {
    title: 'Рекорды',
    local: 'Локальные',
    global: 'Глобальные',
    noScores: 'Рекордов пока нет',
    noScoresDesc: 'Спойте несколько песен, чтобы установить свой первый рекорд!',
    rank: 'Место',
    player: 'Игрок',
    song: 'Песня',
    score: 'Счёт',
    date: 'Дата',
    clearAll: 'Очистить все рекорды'
  },

  highscoreScreen: {
    title: 'Таблица лидеров',
    description: 'Лучшие певцы и их легендарные выступления!',
    local: '🏠 Локальные',
    global: '🌍 Глобальные',
    allScores: 'Все результаты',
    myScores: 'Мои результаты',
    rankingTitles: 'Звания',
    loadingGlobal: 'Загрузка глобальной таблицы лидеров...',
    retry: '🔄 Повторить',
    switchToLocal: 'Переключить на локальные',
    noGlobal: 'Глобальных результатов пока нет. Будьте первым!',
    noMine: 'Вы ещё не устанавливали рекордов!',
    noAll: 'Рекордов пока нет. Будьте первым, кто споёт!',
    accuracyLabel: '{n}% точность',
    maxComboLabel: '{n}x макс. комбо',
    totalPoints: 'всего очков'
  },

  keyboardShortcuts: {
    esc: 'Пауза / Назад / Выход',
    enter: 'Продолжить игру (из паузы)',
    f12: 'Полноэкранный режим',
    f1f10: 'Навигация по меню',
    ctrlL: 'Поиск в библиотеке',
    ctrlR: 'Случайная песня (соло)',
    ctrlD: 'Случайная песня (дуэль)',
    ctrlQ: 'Начать песню из очереди',
    ctrlJ: 'Запустить джукбокс',
    arrows: 'Навигация',
  },

  audioAnalysis: {
    confidenceHigh: 'Зелёный — Надёжно',
    confidenceMedium: 'Жёлтый — Вероятно верно',
    confidenceLow: 'Оранжевый — Неопределённо',
    confidenceVeryLow: 'Красный — Рекомендуется ручная проверка',
  },

  pitchGraph: {
    pitch: 'Тональность: {n}',
    noPitch: 'Тональность не обнаружена',
  },

  battleRoyaleGame: {
    survived: 'ВЫЖИЛ!',
  },

  remoteControl: {
    skipAdTitle: '⏭️ Пропустить рекламу',
    skipAdDesc: 'Нажмите на видео, чтобы нажать кнопку "Пропустить рекламу"!',
  },

  mobilePage: {
    loadingCompanion: 'Загрузка Companion-приложения…',
    failedToLoad: 'Не удалось загрузить Companion-приложение',
    retry: 'Повторить',
  },

  // --- Achievements ---
  achievements: {
    firstNote: { name: 'Первая нота', description: 'Попадите в первую ноту' },
    perfectTen: { name: 'Идеальная десятка', description: 'Получите 10 попаданий «Перфект» в одной песне' },
    comboMaster: { name: 'Мастер комбо', description: 'Добейтесь комбо из 50 нот' },
    comboKing: { name: 'Король комбо', description: 'Добейтесь комбо из 100 нот', rewardTitle: 'Король комбо' },
    comboLegend: { name: 'Легенда комбо', description: 'Добейтесь комбо из 200 нот', rewardTitle: 'Легенда комбо' },
    perfectSong: { name: 'Идеальная песня', description: 'Достигните точности 99,5%+', rewardTitle: 'Перфекционист' },
    pitchPerfect: { name: 'Чистый голос', description: 'Достигните точности более 90%' },
    risingStar: { name: 'Восходящая звезда', description: 'Наберите более 8 000 очков' },
    scoreMaster: { name: 'Мастер очков', description: 'Наберите более 9 000 очков' },
    flawless: { name: 'Безупречность', description: 'Наберите более 9 500 очков', rewardTitle: 'Безупречность' },
    goldenCollector: { name: 'Золотой коллекционер', description: 'Попадите в 10 золотых нот' },
    goldenMaster: { name: 'Мастер золотых нот', description: 'Попадите в 50 золотых нот', rewardTitle: 'Золотой голос' },
    firstSong: { name: 'Первые шаги', description: 'Выполните свою первую песню' },
    tenSongs: { name: 'Караоке-энтузиаст', description: 'Выполните 10 песен' },
    fiftySongs: { name: 'Постоянный караокер', description: 'Выполните 50 песен' },
    hundredSongs: { name: 'Легенда караоке', description: 'Выполните 100 песен', rewardTitle: 'Легенда караоке' },
    fiveGames: { name: 'Начало пути', description: 'Сыграйте 5 игр' },
    twentyGames: { name: 'Преданный певец', description: 'Сыграйте 20 игр' },
    partyTime: { name: 'Время вечеринки!', description: 'Сыграйте в режиме вечеринки' },
    duelChampion: { name: 'Чемпион дуэлей', description: 'Выиграйте дуэль' },
    passTheMic: { name: 'Передай микрофон!', description: 'Сыграйте в режиме «Передай микрофон»' },
    showerSinger: { name: 'Певец в душе', description: 'Наберите менее 20% за песню', rewardTitle: 'Певец в душе' },
    comebackKing: { name: 'Король камбэка', description: 'Добейтесь комбо 50+ после 10 промахов' },
    speedDemon: { name: 'Демон скорости', description: 'Выполните песню на скорости 1,5x' },
    blindMaster: { name: 'Мастер вслепую', description: 'Выполните песню в режиме караоке вслепую', rewardTitle: 'Мастер вслепую' },
  },

  // --- Ranks ---
  ranks: {
    beginner: { name: 'Новичок', titles: { newcomer: 'Новоприбывший' } },
    novice: { name: 'Ученик', titles: { risingStar: 'Восходящая звезда' } },
    apprentice: { name: 'Подмастерье', titles: { melodyMaker: 'Создатель мелодий' } },
    singer: { name: 'Певец', titles: { voiceInTraining: 'Голос в обучении' } },
    performer: { name: 'Исполнитель', titles: { stagePresence: 'Сценическое присутствие' } },
    artist: { name: 'Артист', titles: { artisticSoul: 'Артистическая душа' } },
    star: { name: 'Звезда', titles: { shiningStar: 'Сияющая звезда' } },
    superstar: { name: 'Суперзвезда', titles: { crowdFavorite: 'Любимец публики' } },
    legend: { name: 'Легенда', titles: { legendaryVoice: 'Легендарный голос' } },
    icon: { name: 'Икона', titles: { musicalIcon: 'Музыкальная икона' } },
    mythic: { name: 'Мифический', titles: { mythicSinger: 'Мифический певец' } },
    divine: { name: 'Божественный', titles: { divineVoice: 'Божественный голос' } },
  },

  // --- Challenge Modes ---
  challenges: {
    blindAudition: { name: 'Слепое прослушивание', description: 'Пойте без текста — проверка памяти!' },
    freeFlight: { name: 'Свободный полёт', description: 'Без подсказки тональности — пойте на слух!' },
    speedDemon: { name: 'Демон скорости', description: 'Скорость 1,5x — думайте быстрее!' },
    perfectionist: { name: 'Перфекционист', description: 'Считаются только идеальные ноты!' },
    goldenHunter: { name: 'Охотник за золотом', description: 'Очки дают только золотые ноты — поймайте все!' },
    memoryLane: { name: 'Улица воспоминаний', description: 'Испытание с пропущенными словами — заполните пробелы!' },
    pitchShift: { name: 'Сдвиг тональности', description: 'Песня транспонирована — адаптируйте голос!' },
    halfSpeed: { name: 'Замедленная съёмка', description: 'Скорость 0,75x — идеально для практики!' },
    blindMaster: { name: 'Мастер вслепую', description: 'Ни текста, ни подсказки тональности — настоящее слепое пение!' },
    ultimateChallenge: { name: 'Ультимативное испытание', description: 'Все модификаторы вместе — для смелых!' },
  },

  // --- Challenge Modifiers ---
  modifiers: {
    noLyrics: { label: 'Без текста', description: 'Текст песни скрыт', shortDescription: 'Без текста' },
    noPitchGuide: { label: 'Без подсказки тональности', description: 'Подсказка тональности скрыта', shortDescription: 'Без подсказки тональности' },
    doubleSpeed: { label: 'Ускорение', description: 'Песня играет быстрее', shortDescription: 'Скорость 1,25x' },
    halfSpeed: { label: 'Замедление', description: 'Песня играет медленнее' },
    perfectOnly: { label: 'Перфекционист', description: 'Считаются только идеальные ноты' },
    goldenOnly: { label: 'Охотник за золотом', description: 'Считаются только золотые ноты' },
    missingWords: { label: 'Пропущенные слова', description: 'Некоторые слова скрыты' },
    blind: { label: 'Вслепую', description: 'Без текста и без подсказки тональности' },
    pitchShift: { description: 'Тональность сдвинута на 3 полутона' },
  },

  // --- Ranking Titles ---
  rankingTitles: {
    showerSingingSensation: 'Сенсация душевого пения',
    karaokeRoyalty: 'Караоке-королевство',
    vocalVirtuoso: 'Вокальный виртуоз',
    micDropMaster: 'Мастер броска микрофона',
    diamondVoice: 'Алмазный голос',
    broadwayWannabe: 'Бродвейский подражатель',
    noteNailer: 'Покоритель нот',
    pitchyParrot: 'Фальшивый попугай',
    circusSinger: 'Цирковой певец',
    humbleHummer: 'Скромный мычатель',
    underConstruction: 'В процессе стройки',
    bathroomBaritone: 'Ванный баритон',
    phantomPhony: 'Фантомный фальшивец',
    duckTapeSinger: 'Изолентный певец',
    tunelessTroubadour: 'Бестональный трубадур',
    vocalTornado: 'Вокальный торнадо (Катастрофа)',
    toneDeafTitan: 'Титан без слуха',
    clownCarCrooner: 'Клоунский кроунер',
    toneZombie: 'Зомби тональности',
    whisperingWimp: 'Шепчущий трусишка',
    silentScream: 'Безмолвный крик',
  },

  // --- Battle Royale (new keys) ---
  battleRoyale: {
    bounty: 'НАГРАДА',
    micError: 'Микрофон',
  },
};
