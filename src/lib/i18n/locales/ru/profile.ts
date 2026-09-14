// RU translations — profile

export const profileTranslations = {
profile: {
  title: 'Профили',
  createCharacter: 'Создать профиль',
  name: 'Имя',
  namePlaceholder: 'Имя профиля...',
  country: 'Страна',
  countryOptional: 'Выберите страну (необязательно)',
  avatar: 'Аватар',
  uploadPhoto: 'Загрузить фото',
  create: 'Создать',
  edit: 'Редактировать',
  delete: 'Удалить',
  active: 'Активный',
  selectAsActive: 'Выбрать как активный',
  noCharacters: 'Профилей пока нет',
  noCharactersDesc: 'Создайте профиль, чтобы отслеживать свои результаты и прогресс!',
  showOnLeaderboard: 'Показывать в таблице лидеров',
  showPhoto: 'Показать фото',
  photoUploaded: 'Фото загружено',
  noPhoto: 'Нет фото',
  privacyHint: 'Your scores will be uploaded to the global leaderboard.',
  privacyHintDesc: 'You can opt out at any time in Profile Settings.',
  storageMode: {
    title: 'Хранение профиля',
    local: 'Только локально',
    localDesc: 'Все данные остаются на этом устройстве — без онлайн-таблицы лидеров и синхронизации.',
    online: 'Онлайн-профиль',
    onlineDesc: 'Участвуйте в онлайн-таблице лидеров, синхронизируйте устройства и делитесь ежедневными результатами.',
    localShort: 'Локально',
    onlineShort: 'Онлайн',
    settingsDesc: 'Решите, будет ли этот профиль участвовать в онлайн-таблице лидеров или останется только локальным. Можно изменить в любой момент.',
  },
  countrySearch: 'Поиск страны…',
  noCountryFound: 'Страна не найдена',
  popularCountries: 'Популярные',
  allCountries: 'Все страны',
},
profileAuth: {
  accountTitle: 'Онлайн-аккаунт (необязательно)',
  accountDesc: 'Сохраните e-mail и пароль, чтобы загрузить этот профиль на другом устройстве. Вход возможен только внутри приложения для караоке — веб-версии для входа нет.',
  email: 'E-mail',
  emailPlaceholder: 'vash@email.com',
  emailInvalid: 'Пожалуйста, введите корректный адрес e-mail',
  emailTaken: 'Этот e-mail уже зарегистрирован',
  password: 'Пароль',
  passwordPlaceholder: 'Не менее 8 символов',
  passwordRepeat: 'Повторите пароль',
  passwordsDontMatch: 'Пароли не совпадают',
  passwordTooShort: 'Пароль должен содержать не менее 8 символов',
  registerFailed: 'Не удалось создать онлайн-аккаунт',
  loginTitle: 'Загрузить онлайн-профиль',
  loginDesc: 'Введите e-mail и пароль вашего онлайн-профиля, чтобы загрузить его на это устройство.',
  loginButton: 'Войти и загрузить профиль',
  loginFailed: 'Не удалось войти — проверьте e-mail и пароль',
  loginSuccess: 'Профиль «{n}» успешно загружен!',
  noSnapshot: 'Синхронизированные данные профиля на сервере пока не найдены',
  emailNote: 'Используется только для входа — никогда не показывается публично',
  changePassword: 'Сменить пароль',
  currentPassword: 'Текущий пароль',
  newPassword: 'Новый пароль',
  passwordChanged: 'Пароль успешно изменён',
  passwordChangeFailed: 'Не удалось изменить пароль',
  hasAccount: 'Онлайн-аккаунт ✓',
  registrationPending: 'Создание онлайн-аккаунта…',
  registrationSuccess: 'Онлайн-аккаунт создан — теперь вы можете войти на любом устройстве',
  registrationSuccessTitle: '🔐 Онлайн-аккаунт',
  loginSuccessTitle: '✅ {n}',
},
characterScreen: {
  title: 'Профиль',
  description: 'Создавайте и управляйте профилями певцов',
  onlineLeaderboard: 'Онлайн таблица лидеров',
  createProfile: 'Создать новый профиль',
  yourProfiles: 'Ваши профили ({n})',
  noProfiles: 'Профилей пока нет. Нажмите "Создать новый профиль" чтобы начать!',
  settingsTitle: 'Настройки профиля',
  nameAndAvatar: 'Имя и аватар',
  rankDisplay: 'Отображение ранга',
  showRankInName: 'Показывать ранг в имени',
  rankPrefix: 'Префикс',
  rankSuffix: 'Суффикс',
  rankFull: 'Полный',
  countryAndPrivacy: 'Страна и конфиденциальность',
  selectCountry: 'Выберите страну',
  visible: 'Видимый',
  hidden: 'Скрытый',
  shown: 'Показан',
  companionAppLink: 'Ссылка на Companion App',
  companionAppLinkDesc: 'Отсканируйте этот QR-код для прямого подключения к этому профилю в приложении-компаньоне.',
  hideQrCode: 'Скрыть QR-код',
  showQrCode: 'Показать QR-код',
  leaderboardParticipation: 'Leaderboard Participation',
  leaderboardParticipationDesc: 'Participate in the online leaderboard and share your scores with other players',
  loadProfile: 'Загрузить онлайн-профиль',
},
characterCard: {
  connected: 'Подключён',
  connectedWith: 'Подключён: {n}',
},
profileSync: {
  title: 'Синхронизация профиля',
  uploadSuccess: 'Профиль загружен! Код синхронизации: {n}',
  uploadFailed: 'Ошибка загрузки',
  downloadFailed: 'Не удалось загрузить профиль',
  invalidCode: 'Введите правильный 8-значный код синхронизации',
  syncSuccess: 'Профиль успешно синхронизирован!',
  notFound: 'Профиль не найден',
  profileNotFound: 'Профиль не найден',
  downloadFailedMsg: 'Не удалось загрузить профиль. Проверьте код синхронизации.',
  syncCode: 'Код синхронизации:',
  upload: 'Загрузить',
  syncCodePlaceholder: 'Код синхронизации',
},
playerProgression: {
  active: 'Активен',
  inactive: 'Неактивен',
  progressToNext: 'Прогресс до следующего уровня',
  xpNeeded: 'XP необходимо',
  songsPlayed: 'Песен сыграно',
  goldenNotes: 'Золотые ноты',
  bestCombo: 'Лучшее комбо',
  totalScore: 'Итоговый счёт',
  achievementsTitle: 'Достижения',
  more: '+{n} ещё',
  beginner: 'Новичок',
  xp: 'XP',
  lv: 'Ур. {n}',
},
achievements: {
  title: 'Достижения',
  unlocked: 'Разблокировано',
  locked: 'Заблокировано',
  progress: 'Прогресс',
  noAchievements: 'Достижений пока нет',
  playToUnlock: 'Играйте, чтобы разблокировать достижения!',
  rarity: 'Редкость',
  common: 'Обычное',
  uncommon: 'Необычное',
  rare: 'Редкое',
  epic: 'Эпическое',
  legendary: 'Легендарное',
  first_note: {
    name: 'Первая нота',
    description: 'Попади в свою первую ноту',
  },
  perfect_ten: {
    name: 'Десятка идеальных',
    description: 'Получи 10 попаданий «Идеально» за одну песню',
  },
  combo_master: {
    name: 'Мастер комбо',
    description: 'Набери комбо из 50 нот',
  },
  combo_king: {
    name: 'Король комбо',
    description: 'Набери комбо из 100 нот',
  },
  combo_legend: {
    name: 'Легенда комбо',
    description: 'Набери комбо из 200 нот',
  },
  perfect_song: {
    name: 'Идеальная песня',
    description: 'Достигни точности 99.5%+ в песне',
  },
  accuracy_90: {
    name: 'Идеальный слух',
    description: 'Достигни точности более 90%',
  },
  score_8k: {
    name: 'Восходящая звезда',
    description: 'Набери более 8000 очков',
  },
  score_9k: {
    name: 'Мастер очков',
    description: 'Набери более 9000 очков',
  },
  score_9500: {
    name: 'Безупречность',
    description: 'Набери более 9500 очков',
  },
  golden_collector: {
    name: 'Золотой коллекционер',
    description: 'Попади в 10 золотых нот',
  },
  golden_master: {
    name: 'Золотой мастер',
    description: 'Попади в 50 золотых нот',
  },
  first_song: {
    name: 'Первые шаги',
    description: 'Заверши свою первую песню',
  },
  ten_songs: {
    name: 'Караоке-энтузиаст',
    description: 'Заверши 10 песен',
  },
  fifty_songs: {
    name: 'Караоке-завсегдатай',
    description: 'Заверши 50 песен',
  },
  hundred_songs: {
    name: 'Легенда караоке',
    description: 'Заверши 100 песен',
  },
  five_games: {
    name: 'Разогрев',
    description: 'Сыграй 5 партий',
  },
  twenty_games: {
    name: 'Преданный певец',
    description: 'Сыграй 20 партий',
  },
  party_time: {
    name: 'Время вечеринки!',
    description: 'Сыграй в партийном режиме',
  },
  duel_winner: {
    name: 'Чемпион дуэлей',
    description: 'Выиграй дуэль',
  },
  pass_the_mic: {
    name: 'Передай микрофон!',
    description: 'Сыграй в режиме «Передай микрофон»',
  },
  shower_singer: {
    name: 'Певец в душе',
    description: 'Набери менее 20% за песню',
  },
  comeback_king: {
    name: 'Король камбэка',
    description: 'Набери комбо 50+ после 10 промахов',
  },
  speed_demon: {
    name: 'Демон скорости',
    description: 'Заверши песню на скорости 1.5x',
  },
  blind_master: {
    name: 'Мастер слепого режима',
    description: 'Заверши песню в режиме «Слепое караоке»',
  },
  daily_starter: {
    name: 'Дейли-новичок',
    description: 'Заверши свой первый ежедневный вызов',
  },
  daily_regular: {
    name: 'Дейли-завсегдатай',
    description: 'Заверши 10 ежедневных вызовов',
  },
  daily_devoted: {
    name: 'Дейли-фанат',
    description: 'Заверши 50 ежедневных вызовов',
  },
  streak_week: {
    name: 'В огне',
    description: 'Поддерживай ежедневную серию в 7 дней',
  },
  streak_month: {
    name: 'Неудержимый',
    description: 'Поддерживай ежедневную серию в 30 дней',
  },
  weekly_warrior: {
    name: 'Воин недели',
    description: 'Заверши 5 еженедельных вызовов',
  },
  accuracy_95: {
    name: 'Точный вокалист',
    description: 'Набери точность выше 95%',
  },
  golden_rush: {
    name: 'Золотая лихорадка',
    description: 'Попади в 20 золотых нот за одну песню',
  },
  golden_hundred: {
    name: 'Золотой центурион',
    description: 'Попади в 100 золотых нот за всё время',
  },
  perfect_fifty: {
    name: 'Идеальные полсотни',
    description: 'Попади в 50 идеальных нот за одну песню',
  },
  lightning_lips: {
    name: 'Молниеносные губы',
    description: 'Заверши песню на скорости 2x',
  },
  duet_harmony: {
    name: 'Идеальная гармония',
    description: 'Спой 10 дуэтов',
  },
  genre_explorer: {
    name: 'Исследователь жанров',
    description: 'Спой песни из 5 разных жанров',
  },
  disney_fan: {
    name: 'Фанат Disney',
    description: 'Спой 10 песен Disney',
  },
  night_owl: {
    name: 'Ночная сова',
    description: 'Заверши песню между полуночью и 4 часами утра',
  },
  early_bird: {
    name: 'Ранняя пташка',
    description: 'Заверши песню до 8 часов утра',
  },
  marathon_singer: {
    name: 'Марафонский певец',
    description: 'Сыграй 5 игр за один день',
  },

  // ── Расширение до 100 достижений ──
  score_9800: {
    name: 'Сверхзвезда',
    description: 'Наберите более 9800 очков',
  },
  score_9900: {
    name: 'За пределами совершенства',
    description: 'Наберите более 9900 очков',
  },
  combo_300: {
    name: 'Титан комбо',
    description: 'Наберите комбо из 300 нот',
  },
  combo_500: {
    name: 'Бессмертное комбо',
    description: 'Наберите комбо из 500 нот',
  },
  accuracy_92: {
    name: 'Тонкая настройка',
    description: 'Достигните точности более 92%',
  },
  accuracy_94: {
    name: 'Студийное качество',
    description: 'Достигните точности более 94%',
  },
  accuracy_96: {
    name: 'Снайпер',
    description: 'Достигните точности более 96%',
  },
  accuracy_97: {
    name: 'Лазерная точность',
    description: 'Достигните точности более 97%',
  },
  accuracy_98: {
    name: 'Виртуоз',
    description: 'Достигните точности более 98%',
  },
  perfect_75: {
    name: 'Идеальные 75',
    description: 'Попадите в 75 идеальных нот за одну песню',
  },
  perfect_100: {
    name: 'Идеальная сотня',
    description: 'Попадите в 100 идеальных нот за одну песню',
  },
  perfect_150: {
    name: 'Идеальный шторм',
    description: 'Попадите в 150 идеальных нот за одну песню',
  },
  golden_30: {
    name: 'Золотой прилив',
    description: 'Попадите в 30 золотых нот за одну песню',
  },
  golden_40: {
    name: 'Золотая симфония',
    description: 'Попадите в 40 золотых нот за одну песню',
  },
  perfect_500: {
    name: 'Идеальная машина',
    description: 'Попадите в 500 идеальных нот за всё время',
  },
  perfect_1000: {
    name: 'Мощь точности',
    description: 'Попадите в 1000 идеальных нот за всё время',
  },
  perfect_5000: {
    name: 'Идеальная лавина',
    description: 'Попадите в 5000 идеальных нот за всё время',
  },
  perfect_10000: {
    name: 'Идеальные десять тысяч',
    description: 'Попадите в 10 000 идеальных нот за всё время',
  },
  golden_250: {
    name: 'Золотой урожай',
    description: 'Попадите в 250 золотых нот за всё время',
  },
  golden_1000: {
    name: 'Золотой ливень',
    description: 'Попадите в 1000 золотых нот за всё время',
  },
  golden_5000: {
    name: 'Голос Мидаса',
    description: 'Попадите в 5000 золотых нот за всё время',
  },
  songs_250: {
    name: 'Ветеран песенника',
    description: 'Завершите 250 песен',
  },
  songs_500: {
    name: 'Клуб полутысячи',
    description: 'Завершите 500 песен',
  },
  songs_1000: {
    name: 'Легенда тысячи песен',
    description: 'Завершите 1000 песен',
  },
  games_50: {
    name: 'Постоянный певец',
    description: 'Сыграйте 50 партий',
  },
  games_100: {
    name: 'Клуб сотни',
    description: 'Сыграйте 100 партий',
  },
  games_250: {
    name: 'Завсегдатай аркады',
    description: 'Сыграйте 250 партий',
  },
  games_500: {
    name: 'Марафонский маньяк',
    description: 'Сыграйте 500 партий',
  },
  level_25: {
    name: 'Опытный певец',
    description: 'Достигните уровня 25',
  },
  level_50: {
    name: 'Элитный вокалист',
    description: 'Достигните уровня 50',
  },
  level_100: {
    name: 'Легенда уровня 100',
    description: 'Достигните уровня 100',
  },
  daily_100: {
    name: 'Дейли-центурион',
    description: 'Завершите 100 ежедневных вызовов',
  },
  daily_250: {
    name: 'Дейли-фанатик',
    description: 'Завершите 250 ежедневных вызовов',
  },
  daily_500: {
    name: 'Дейли-бессмертный',
    description: 'Завершите 500 ежедневных вызовов',
  },
  streak_60: {
    name: 'Железная воля',
    description: 'Поддерживайте ежедневную серию в 60 дней',
  },
  streak_100: {
    name: 'Герой ста дней',
    description: 'Поддерживайте ежедневную серию в 100 дней',
  },
  streak_180: {
    name: 'Полгода преданности',
    description: 'Поддерживайте ежедневную серию в 180 дней',
  },
  streak_365: {
    name: 'Легенда года',
    description: 'Поддерживайте ежедневную серию в 365 дней',
  },
  weekly_15: {
    name: 'Еженедельная опора',
    description: 'Завершите 15 еженедельных вызовов',
  },
  weekly_30: {
    name: 'Еженедельный столп',
    description: 'Завершите 30 еженедельных вызовов',
  },
  weekly_52: {
    name: 'Год недель',
    description: 'Завершите 52 еженедельных вызова',
  },
  encore_10: {
    name: 'На бис!',
    description: 'Сыграйте 10 партий за один день',
  },
  duets_25: {
    name: 'Поклонник дуэтов',
    description: 'Спойте 25 дуэтов',
  },
  duets_50: {
    name: 'Динамичный дуэт',
    description: 'Спойте 50 дуэтов',
  },
  duets_100: {
    name: 'Сотня дуэтов',
    description: 'Спойте 100 дуэтов',
  },
  duels_5: {
    name: 'Дуэлянт',
    description: 'Выиграйте 5 дуэлей',
  },
  duels_10: {
    name: 'Мастер дуэлей',
    description: 'Выиграйте 10 дуэлей',
  },
  duels_25: {
    name: 'Повелитель дуэлей',
    description: 'Выиграйте 25 дуэлей',
  },
  party_10: {
    name: 'Тусовщик',
    description: 'Сыграйте в 10 партийных игр',
  },
  party_25: {
    name: 'Душа компании',
    description: 'Сыграйте в 25 партийных игр',
  },
  party_50: {
    name: 'Легенда вечеринок',
    description: 'Сыграйте в 50 партийных игр',
  },
  disney_25: {
    name: 'Энтузиаст Disney',
    description: 'Спойте 25 песен Disney',
  },
  disney_50: {
    name: 'Жила-была песня',
    description: 'Спойте 50 песен Disney',
  },
  genres_8: {
    name: 'Странник жанров',
    description: 'Спойте песни из 8 разных жанров',
  },
  genres_10: {
    name: 'Знаток жанров',
    description: 'Спойте песни из 10 разных жанров',
  },
  clean_sheet: {
    name: 'Игра на ноль',
    description: 'Завершите песню с 50+ нотами и нулём промахов',
  },
  weekend_singer: {
    name: 'Певец выходного дня',
    description: 'Завершите песню в субботу или воскресенье',
  },
  lunch_break: {
    name: 'Обеденный перерыв',
    description: 'Завершите песню между 12 и 14 часами',
  },
},
achievementsScreen: {
  title: '🏆 Достижения',
  description: 'Разблокируйте достижения, играя!',
  unlocked: 'Разблокировано',
  xpEarned: 'XP заработано',
  completion: 'Выполнение',
  all: 'Все',
  categories: {
    performance: 'выступление',
    progression: 'прогресс',
    social: 'социальные',
    special: 'особые',
  },
  plusXp: '+{n} XP',
  locked: 'Заблокировано',
  viewPlayer: 'Достижения игрока',
  viewingOther: 'Вы просматриваете достижения игрока {n}. Каждый игрок открывает собственные достижения.',
  noMatches: 'Нет достижений, соответствующих этим фильтрам',
},
badgeNames: {
  'first-challenge': 'Первые шаги',
  'week-warrior': 'Воин недели',
  'fortnight-fighter': 'Боец двух недель',
  'monthly-master': 'Мастер месяца',
  'top-3': 'Пьедестал',
  champion: 'Чемпион дня',
  dedicated: 'Преданный певец',
  legendary: 'Легендарный статус',
  'century-champion': 'Столетний чемпион',
  'yearly-legend': 'Годовая легенда',
  explorer: 'Исследователь вызовов',
  songbird: 'Птичка-певунья',
  'weekly-warrior-q': 'Воин недели',
},
badgeDescriptions: {
  'first-challenge': 'Выполни своё первое ежедневное задание',
  'week-warrior': 'Поддерживай серию 7 дней',
  'fortnight-fighter': 'Поддерживай серию 14 дней',
  'monthly-master': 'Поддерживай серию 30 дней',
  'top-3': 'Займи место в тройке лучших в ежедневном задании',
  champion: 'Выиграй ежедневное задание',
  dedicated: 'Выполни 30 ежедневных заданий',
  legendary: 'Набери 10 000 XP суммарно',
  'century-champion': 'Поддерживай серию 100 дней',
  'yearly-legend': 'Поддерживай серию 365 дней',
  explorer: 'Сыграй в 5 различных режимах заданий',
  songbird: 'Выполни суммарно 10 песен',
  'weekly-warrior-q': 'Выполни 3 еженедельных задания',
},
mobileAchievements: {
  first_song: {
    title: 'Первые шаги',
    description: 'Спой свою первую песню',
  },
  ten_songs: {
    title: 'Восходящая звезда',
    description: 'Спой 10 песен',
  },
  fifty_songs: {
    title: 'Ветеран',
    description: 'Спой 50 песен',
  },
  perfect_score: {
    title: 'Перфекционист',
    description: 'Получи идеальный результат (95%+)',
  },
  five_perfect: {
    title: 'Безупречность',
    description: 'Получи 5 идеальных результатов',
  },
  high_score: {
    title: 'Мастер очков',
    description: 'Набери 10 000 очков за всё время',
  },
  queue_5: {
    title: 'Создатель плейлистов',
    description: 'Добавь 5 песен в очередь',
  },
  genre_3: {
    title: 'Исследователь жанров',
    description: 'Спой песни из 3 жанров',
  },
},
challenges: {
  requirements: {
    minLevel: 'Нужен уровень {required} (твой уровень: {current})',
    minSongs: 'Нужно завершить {required} песен (у тебя {current})',
    achievement: 'Нужно достижение: {name}',
    rankNoXP: 'Требование ранга не проверяется (нет данных об XP)',
    unknownRank: 'Неизвестный ранг «{name}»',
    rankRequired: 'Нужен ранг «{required}» (твой ранг: «{current}»)',
  },
},
};
