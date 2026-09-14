// ZH translations — profile

export const profileTranslations = {
profile: {
  title: '档案',
  createCharacter: '创建档案',
  name: '名称',
  namePlaceholder: '档案名称...',
  country: '国家',
  countryOptional: '选择国家（可选）',
  avatar: '头像',
  uploadPhoto: '上传照片',
  create: '创建',
  edit: '编辑',
  delete: '删除',
  active: '激活',
  selectAsActive: '设为激活',
  noCharacters: '还没有档案',
  noCharactersDesc: '创建档案来追踪你的分数和进度！',
  showOnLeaderboard: '在排行榜显示',
  showPhoto: '显示照片',
  photoUploaded: '照片已上传',
  noPhoto: '无照片',
  privacyHint: 'Your scores will be uploaded to the global leaderboard.',
  privacyHintDesc: 'You can opt out at any time in Profile Settings.',
  storageMode: {
    title: '档案存储方式',
    local: '仅本地',
    localDesc: '所有数据仅保留在本设备上 — 没有在线排行榜,也没有同步。',
    online: '在线档案',
    onlineDesc: '加入在线排行榜、跨设备同步并分享每日成绩。',
    localShort: '本地',
    onlineShort: '在线',
    settingsDesc: '决定此档案是加入在线排行榜还是仅保存在本地。可随时更改。',
  },
  countrySearch: '搜索国家…',
  noCountryFound: '未找到国家',
  popularCountries: '热门',
  allCountries: '所有国家',
},
profileAuth: {
  accountTitle: '在线账号（可选）',
  accountDesc: '保存电子邮箱和密码，即可在其他设备上加载此档案。登录仅可在卡拉OK应用内进行——没有网页登录。',
  email: '电子邮箱',
  emailPlaceholder: '你的@email.com',
  emailInvalid: '请输入有效的电子邮箱地址',
  emailTaken: '该电子邮箱已被注册',
  password: '密码',
  passwordPlaceholder: '至少 8 个字符',
  passwordRepeat: '再次输入密码',
  passwordsDontMatch: '两次输入的密码不一致',
  passwordTooShort: '密码至少需要 8 个字符',
  registerFailed: '无法创建在线账号',
  loginTitle: '加载在线档案',
  loginDesc: '输入在线档案的电子邮箱和密码，即可在此设备上加载。',
  loginButton: '登录并加载档案',
  loginFailed: '登录失败——请检查电子邮箱和密码',
  loginSuccess: '档案“{n}”加载成功！',
  noSnapshot: '服务器上尚未找到已同步的档案数据',
  emailNote: '仅用于登录——绝不会公开显示',
  changePassword: '修改密码',
  currentPassword: '当前密码',
  newPassword: '新密码',
  passwordChanged: '密码修改成功',
  passwordChangeFailed: '无法修改密码',
  hasAccount: '在线账号 ✓',
  registrationPending: '正在创建在线账号…',
  registrationSuccess: '在线账号创建成功——你现在可以在任何设备上登录',
  registrationSuccessTitle: '🔐 在线账号',
  loginSuccessTitle: '✅ {n}',
},
characterScreen: {
  title: '档案',
  description: '创建和管理你的歌手档案',
  onlineLeaderboard: '在线排行榜',
  createProfile: '创建新档案',
  yourProfiles: '我的档案 ({n})',
  noProfiles: '还没有档案。点击"创建新档案"开始吧！',
  settingsTitle: '档案设置',
  nameAndAvatar: '名称和头像',
  rankDisplay: '排名显示',
  showRankInName: '在名称中显示排名',
  rankPrefix: '前缀',
  rankSuffix: '后缀',
  rankFull: '完整',
  countryAndPrivacy: '国家与隐私',
  selectCountry: '选择国家',
  visible: '可见',
  hidden: '隐藏',
  shown: '显示中',
  companionAppLink: '伴侣应用链接',
  companionAppLinkDesc: '扫描此二维码，在伴侣应用中直接连接此档案。',
  hideQrCode: '隐藏二维码',
  showQrCode: '显示二维码',
  leaderboardParticipation: 'Leaderboard Participation',
  leaderboardParticipationDesc: 'Participate in the online leaderboard and share your scores with other players',
  loadProfile: '加载在线档案',
},
characterCard: {
  connected: '已连接',
  connectedWith: '已连接：{n}',
},
profileSync: {
  title: '资料同步',
  uploadSuccess: '资料已上传！同步码：{n}',
  uploadFailed: '上传失败',
  downloadFailed: '上传资料失败',
  invalidCode: '请输入有效的 8 位同步码',
  syncSuccess: '资料同步成功！',
  notFound: '未找到资料',
  profileNotFound: '未找到个人资料',
  downloadFailedMsg: '下载资料失败。请检查同步码。',
  syncCode: '同步码：',
  upload: '上传',
  syncCodePlaceholder: '同步码',
},
playerProgression: {
  active: '活跃',
  inactive: '不活跃',
  progressToNext: '距离下一级',
  xpNeeded: '所需经验值',
  songsPlayed: '已唱歌曲',
  goldenNotes: '金色音符',
  bestCombo: '最佳连击',
  totalScore: '总分',
  achievementsTitle: '成就',
  more: '+{n} 更多',
  beginner: '新手',
  xp: '经验值',
  lv: 'Lv. {n}',
},
achievements: {
  title: '成就',
  unlocked: '已解锁',
  locked: '未解锁',
  progress: '进度',
  noAchievements: '还没有成就',
  playToUnlock: '演唱歌曲来解锁成就！',
  rarity: '稀有度',
  common: '普通',
  uncommon: '稀有',
  rare: '珍贵',
  epic: '史诗',
  legendary: '传说',
  first_note: {
    name: '初出茅庐',
    description: '击中你的第一个音符',
  },
  perfect_ten: {
    name: '十全十美',
    description: '在一首歌中获得 10 次完美击中',
  },
  combo_master: {
    name: '连击达人',
    description: '达成 50 连击',
  },
  combo_king: {
    name: '连击之王',
    description: '达成 100 连击',
  },
  combo_legend: {
    name: '连击传说',
    description: '达成 200 连击',
  },
  perfect_song: {
    name: '完美演绎',
    description: '在一首歌中获得 99.5% 以上的准确率',
  },
  accuracy_90: {
    name: '音准大师',
    description: '准确率超过 90%',
  },
  score_8k: {
    name: '新星崛起',
    description: '得分超过 8,000 分',
  },
  score_9k: {
    name: '高分高手',
    description: '得分超过 9,000 分',
  },
  score_9500: {
    name: '无可挑剔',
    description: '得分超过 9,500 分',
  },
  golden_collector: {
    name: '金色收藏家',
    description: '击中 10 个金色音符',
  },
  golden_master: {
    name: '金色大师',
    description: '击中 50 个金色音符',
  },
  first_song: {
    name: '迈出第一步',
    description: '完成你的第一首歌',
  },
  ten_songs: {
    name: 'K 歌爱好者',
    description: '完成 10 首歌',
  },
  fifty_songs: {
    name: 'K 歌常客',
    description: '完成 50 首歌',
  },
  hundred_songs: {
    name: 'K 歌传奇',
    description: '完成 100 首歌',
  },
  five_games: {
    name: '初来乍到',
    description: '游玩 5 场游戏',
  },
  twenty_games: {
    name: '铁杆歌手',
    description: '游玩 20 场游戏',
  },
  party_time: {
    name: '派对时间！',
    description: '游玩一种派对模式',
  },
  duel_winner: {
    name: '对决冠军',
    description: '赢得一场对决',
  },
  pass_the_mic: {
    name: '传递话筒！',
    description: '游玩传话筒模式',
  },
  shower_singer: {
    name: '浴室歌手',
    description: '在一首歌中得分低于 20%',
  },
  comeback_king: {
    name: '逆袭之王',
    description: '在失误 10 次后达成 50+ 连击',
  },
  speed_demon: {
    name: '速度恶魔',
    description: '以 1.5 倍速完成一首歌',
  },
  blind_master: {
    name: '盲唱大师',
    description: '在盲唱 K 歌模式下完成一首歌',
  },
  daily_starter: {
    name: '每日新手',
    description: '完成你的第一个每日挑战',
  },
  daily_regular: {
    name: '每日常客',
    description: '完成10个每日挑战',
  },
  daily_devoted: {
    name: '每日狂热',
    description: '完成50个每日挑战',
  },
  streak_week: {
    name: '火力全开',
    description: '保持连续7天的每日挑战记录',
  },
  streak_month: {
    name: '势不可挡',
    description: '保持连续30天的每日挑战记录',
  },
  weekly_warrior: {
    name: '每周战士',
    description: '完成5个每周挑战',
  },
  accuracy_95: {
    name: '精准歌手',
    description: '获得超过95%的准确率',
  },
  golden_rush: {
    name: '黄金热潮',
    description: '在一首歌中命中20个黄金音符',
  },
  golden_hundred: {
    name: '黄金百夫长',
    description: '累计命中100个黄金音符',
  },
  perfect_fifty: {
    name: '完美五十',
    description: '在一首歌中命中50个完美音符',
  },
  lightning_lips: {
    name: '闪电之唇',
    description: '以2倍速完成一首歌',
  },
  duet_harmony: {
    name: '完美和声',
    description: '演唱10首对唱歌曲',
  },
  genre_explorer: {
    name: '流派探索者',
    description: '演唱5种不同流派的歌曲',
  },
  disney_fan: {
    name: '迪士尼粉丝',
    description: '演唱10首迪士尼歌曲',
  },
  night_owl: {
    name: '夜猫子',
    description: '在午夜至凌晨4点之间完成一首歌',
  },
  early_bird: {
    name: '早起的鸟儿',
    description: '在早上8点前完成一首歌',
  },
  marathon_singer: {
    name: '马拉松歌手',
    description: '在一天内游玩5局游戏',
  },

  // ── 100 成就扩展 ──
  score_9800: {
    name: '至尊之星',
    description: '得分超过 9,800 分',
  },
  score_9900: {
    name: '超越完美',
    description: '得分超过 9,900 分',
  },
  combo_300: {
    name: '连击泰坦',
    description: '达成 300 连击',
  },
  combo_500: {
    name: '不朽连击',
    description: '达成 500 连击',
  },
  accuracy_92: {
    name: '精细调校',
    description: '准确率超过 92%',
  },
  accuracy_94: {
    name: '录音室品质',
    description: '准确率超过 94%',
  },
  accuracy_96: {
    name: '神射手',
    description: '准确率超过 96%',
  },
  accuracy_97: {
    name: '激光精度',
    description: '准确率超过 97%',
  },
  accuracy_98: {
    name: '歌艺大师',
    description: '准确率超过 98%',
  },
  perfect_75: {
    name: '完美七十五',
    description: '在一首歌中获得 75 个完美音符',
  },
  perfect_100: {
    name: '完美一百',
    description: '在一首歌中获得 100 个完美音符',
  },
  perfect_150: {
    name: '完美风暴',
    description: '在一首歌中获得 150 个完美音符',
  },
  golden_30: {
    name: '金色浪潮',
    description: '在一首歌中命中 30 个金色音符',
  },
  golden_40: {
    name: '金色交响',
    description: '在一首歌中命中 40 个金色音符',
  },
  perfect_500: {
    name: '完美机器',
    description: '累计命中 500 个完美音符',
  },
  perfect_1000: {
    name: '精准强者',
    description: '累计命中 1,000 个完美音符',
  },
  perfect_5000: {
    name: '完美雪崩',
    description: '累计命中 5,000 个完美音符',
  },
  perfect_10000: {
    name: '完美一万',
    description: '累计命中 10,000 个完美音符',
  },
  golden_250: {
    name: '金色丰收',
    description: '累计命中 250 个金色音符',
  },
  golden_1000: {
    name: '金色骤雨',
    description: '累计命中 1,000 个金色音符',
  },
  golden_5000: {
    name: '点金之嗓',
    description: '累计命中 5,000 个金色音符',
  },
  songs_250: {
    name: '曲库老将',
    description: '完成 250 首歌',
  },
  songs_500: {
    name: '五百俱乐部',
    description: '完成 500 首歌',
  },
  songs_1000: {
    name: '千曲传奇',
    description: '完成 1,000 首歌',
  },
  games_50: {
    name: '常客歌手',
    description: '游玩 50 场游戏',
  },
  games_100: {
    name: '百场俱乐部',
    description: '游玩 100 场游戏',
  },
  games_250: {
    name: '街机常客',
    description: '游玩 250 场游戏',
  },
  games_500: {
    name: '马拉松狂人',
    description: '游玩 500 场游戏',
  },
  level_25: {
    name: '实力唱将',
    description: '达到 25 级',
  },
  level_50: {
    name: '精英歌手',
    description: '达到 50 级',
  },
  level_100: {
    name: '百级传奇',
    description: '达到 100 级',
  },
  daily_100: {
    name: '每日百夫长',
    description: '完成 100 个每日挑战',
  },
  daily_250: {
    name: '每日铁杆',
    description: '完成 250 个每日挑战',
  },
  daily_500: {
    name: '每日不朽',
    description: '完成 500 个每日挑战',
  },
  streak_60: {
    name: '钢铁意志',
    description: '保持连续 60 天的每日挑战记录',
  },
  streak_100: {
    name: '百日英雄',
    description: '保持连续 100 天的每日挑战记录',
  },
  streak_180: {
    name: '半年坚守',
    description: '保持连续 180 天的每日挑战记录',
  },
  streak_365: {
    name: '年度传奇',
    description: '保持连续 365 天的每日挑战记录',
  },
  weekly_15: {
    name: '每周中坚',
    description: '完成 15 个每周挑战',
  },
  weekly_30: {
    name: '每周支柱',
    description: '完成 30 个每周挑战',
  },
  weekly_52: {
    name: '五十二周之年',
    description: '完成 52 个每周挑战',
  },
  encore_10: {
    name: '安可！',
    description: '在一天内游玩 10 场游戏',
  },
  duets_25: {
    name: '对唱爱好者',
    description: '演唱 25 首对唱歌曲',
  },
  duets_50: {
    name: '黄金搭档',
    description: '演唱 50 首对唱歌曲',
  },
  duets_100: {
    name: '对唱百曲',
    description: '演唱 100 首对唱歌曲',
  },
  duels_5: {
    name: '决斗者',
    description: '赢得 5 场对决',
  },
  duels_10: {
    name: '对决大师',
    description: '赢得 10 场对决',
  },
  duels_25: {
    name: '对决霸主',
    description: '赢得 25 场对决',
  },
  party_10: {
    name: '派对动物',
    description: '游玩 10 场派对游戏',
  },
  party_25: {
    name: '派对灵魂',
    description: '游玩 25 场派对游戏',
  },
  party_50: {
    name: '派对传奇',
    description: '游玩 50 场派对游戏',
  },
  disney_25: {
    name: '迪士尼发烧友',
    description: '演唱 25 首迪士尼歌曲',
  },
  disney_50: {
    name: '从前有首歌',
    description: '演唱 50 首迪士尼歌曲',
  },
  genres_8: {
    name: '流派漫游者',
    description: '演唱 8 种不同流派的歌曲',
  },
  genres_10: {
    name: '流派行家',
    description: '演唱 10 种不同流派的歌曲',
  },
  clean_sheet: {
    name: '零失误',
    description: '完成一首超过 50 个音符且零失误的歌曲',
  },
  weekend_singer: {
    name: '周末歌手',
    description: '在周六或周日完成一首歌',
  },
  lunch_break: {
    name: '午休时光',
    description: '在中午 12 点到下午 2 点之间完成一首歌',
  },
},
achievementsScreen: {
  title: '🏆 成就',
  description: '演唱歌曲来解锁成就！',
  unlocked: '已解锁',
  xpEarned: '获得XP',
  completion: '完成度',
  all: '全部',
  categories: {
    performance: '表演',
    progression: '进度',
    social: '社交',
    special: '特殊',
  },
  plusXp: '+{n} 经验值',
  locked: '未解锁',
  viewPlayer: '玩家成就',
  viewingOther: '你正在查看 {n} 的成就。每位玩家都会解锁自己的成就。',
  noMatches: '没有符合这些筛选条件的成就',
},
badgeNames: {
  'first-challenge': '第一步',
  'week-warrior': '周挑战勇士',
  'fortnight-fighter': '双周斗士',
  'monthly-master': '月度大师',
  'top-3': '领奖台',
  champion: '每日冠军',
  dedicated: '专注歌手',
  legendary: '传奇地位',
  'century-champion': '百日冠军',
  'yearly-legend': '年度传说',
  explorer: '挑战探索者',
  songbird: '百灵鸟',
  'weekly-warrior-q': '每周勇士',
},
badgeDescriptions: {
  'first-challenge': '完成你的第一个每日挑战',
  'week-warrior': '保持7天连续挑战记录',
  'fortnight-fighter': '保持14天连续挑战记录',
  'monthly-master': '保持30天连续挑战记录',
  'top-3': '在每日挑战中进入前三名',
  champion: '赢得每日挑战冠军',
  dedicated: '完成30次每日挑战',
  legendary: '累计获得10,000 XP',
  'century-champion': '保持100天连续挑战记录',
  'yearly-legend': '保持365天连续挑战记录',
  explorer: '体验5种不同的挑战模式',
  songbird: '累计完成10首歌曲',
  'weekly-warrior-q': '完成3次每周挑战',
},
mobileAchievements: {
  first_song: {
    title: '迈出第一步',
    description: '唱你的第一首歌',
  },
  ten_songs: {
    title: '新星崛起',
    description: '唱 10 首歌',
  },
  fifty_songs: {
    title: '资深歌手',
    description: '唱 50 首歌',
  },
  perfect_score: {
    title: '完美主义者',
    description: '获得完美分数（95% 以上）',
  },
  five_perfect: {
    title: '无可挑剔',
    description: '获得 5 次完美分数',
  },
  high_score: {
    title: '高分高手',
    description: '累计达到 10,000 分',
  },
  queue_5: {
    title: '播放列表达人',
    description: '添加 5 首歌到队列',
  },
  genre_3: {
    title: '曲风探险家',
    description: '演唱 3 种曲风的歌曲',
  },
},
challenges: {
  requirements: {
    minLevel: '需要等级 {required}（你当前等级 {current}）',
    minSongs: '需要完成 {required} 首歌（你已完成 {current} 首）',
    achievement: '需要成就：{name}',
    rankNoXP: '段位要求无法验证（没有经验值数据）',
    unknownRank: '未知段位 "{name}"',
    rankRequired: '需要段位 "{required}"（你当前段位 "{current}"）',
  },
},
};
