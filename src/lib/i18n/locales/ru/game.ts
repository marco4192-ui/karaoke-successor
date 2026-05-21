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
};
