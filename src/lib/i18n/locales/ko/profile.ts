// KO translations — profile

export const profileTranslations = {
profile: {
  title: '프로필',
  createCharacter: '프로필 만들기',
  name: '이름',
  namePlaceholder: '프로필 이름...',
  country: '국가',
  countryOptional: '국가 선택 (선택 사항)',
  avatar: '아바타',
  uploadPhoto: '사진 업로드',
  create: '만들기',
  edit: '편집',
  delete: '삭제',
  active: '활성',
  selectAsActive: '활성으로 선택',
  noCharacters: '프로필이 아직 없습니다',
  noCharactersDesc: '점수와 진행 상황을 추적하려면 프로필을 만드세요!',
  showOnLeaderboard: '리더보드에 표시',
  showPhoto: '사진 표시',
  photoUploaded: '사진이 업로드되었습니다',
  noPhoto: '사진 없음',
  privacyHint: 'Your scores will be uploaded to the global leaderboard.',
  privacyHintDesc: 'You can opt out at any time in Profile Settings.',
  storageMode: {
    title: '프로필 저장 방식',
    local: '로컬만',
    localDesc: '모든 데이터는 이 기기에만 저장됩니다 — 온라인 리더보드나 동기화 없음.',
    online: '온라인 프로필',
    onlineDesc: '온라인 리더보드에 참여하고, 기기 간 동기화와 데일리 결과 공유를 이용하세요.',
    localShort: '로컬',
    onlineShort: '온라인',
    settingsDesc: '이 프로필을 온라인 리더보드에 참여시킬지 로컬에만 저장할지 결정하세요. 언제든 변경할 수 있습니다.',
  },
  countrySearch: '국가 검색…',
  noCountryFound: '국가를 찾을 수 없습니다',
  popularCountries: '인기',
  allCountries: '모든 국가',
},
profileAuth: {
  accountTitle: '온라인 계정 (선택)',
  accountDesc: '이메일과 비밀번호를 저장하면 다른 기기에서 이 프로필을 불러올 수 있습니다. 로그인은 카라오케 앱 내에서만 가능하며 웹 로그인은 없습니다.',
  email: '이메일',
  emailPlaceholder: 'your@email.com',
  emailInvalid: '유효한 이메일 주소를 입력해 주세요',
  emailTaken: '이 이메일은 이미 등록되어 있습니다',
  password: '비밀번호',
  passwordPlaceholder: '8자 이상',
  passwordRepeat: '비밀번호 확인',
  passwordsDontMatch: '비밀번호가 일치하지 않습니다',
  passwordTooShort: '비밀번호는 8자 이상이어야 합니다',
  registerFailed: '온라인 계정을 만들 수 없습니다',
  loginTitle: '온라인 프로필 불러오기',
  loginDesc: '온라인 프로필의 이메일과 비밀번호를 입력하여 이 기기로 불러오세요.',
  loginButton: '로그인 후 프로필 불러오기',
  loginFailed: '로그인 실패 — 이메일과 비밀번호를 확인해 주세요',
  loginSuccess: '프로필 "{n}"을(를) 불러왔습니다!',
  noSnapshot: '서버에 아직 동기화된 프로필 데이터가 없습니다',
  emailNote: '로그인에만 사용되며 공개되지 않습니다',
  changePassword: '비밀번호 변경',
  currentPassword: '현재 비밀번호',
  newPassword: '새 비밀번호',
  passwordChanged: '비밀번호가 변경되었습니다',
  passwordChangeFailed: '비밀번호를 변경할 수 없습니다',
  hasAccount: '온라인 계정 ✓',
  registrationPending: '온라인 계정 생성 중…',
  registrationSuccess: '온라인 계정이 생성되었습니다. 이제 어떤 기기에서든 로그인할 수 있습니다',
  registrationSuccessTitle: '🔐 온라인 계정',
  loginSuccessTitle: '✅ {n}',
},
characterScreen: {
  title: '프로필',
  description: '가수 프로필을 만들고 관리하세요',
  onlineLeaderboard: '온라인 리더보드',
  createProfile: '새 프로필 만들기',
  yourProfiles: '내 프로필 ({n})',
  noProfiles: '아직 프로필이 없습니다. "새 프로필 만들기"를 클릭하여 시작하세요!',
  settingsTitle: '프로필 설정',
  nameAndAvatar: '이름 & 아바타',
  rankDisplay: '랭크 표시',
  showRankInName: '이름에 랭크 표시',
  rankPrefix: '접두사',
  rankSuffix: '접미사',
  rankFull: '전체',
  countryAndPrivacy: '국가 & 개인정보',
  selectCountry: '국가 선택',
  visible: '표시',
  hidden: '숨김',
  shown: '표시됨',
  companionAppLink: '컴패니언 앱 링크',
  companionAppLinkDesc: '이 QR 코드를 스캔하여 컴패니언 앱에서 이 프로필에 직접 연결하세요.',
  hideQrCode: 'QR 코드 숨기기',
  showQrCode: 'QR 코드 보기',
  leaderboardParticipation: 'Leaderboard Participation',
  leaderboardParticipationDesc: 'Participate in the online leaderboard and share your scores with other players',
  loadProfile: '온라인 프로필 불러오기',
},
characterCard: {
  connected: '연결됨',
  connectedWith: '연결: {n}',
},
profileSync: {
  title: '프로필 동기화',
  uploadSuccess: '프로필이 업로드되었어요! 동기화 코드: {n}',
  uploadFailed: '업로드에 실패했어요',
  downloadFailed: '프로필 업로드에 실패했어요',
  invalidCode: '유효한 8자리 동기화 코드를 입력해 주세요',
  syncSuccess: '프로필이 성공적으로 동기화되었어요!',
  notFound: '프로필을 찾을 수 없어요',
  profileNotFound: '프로필을 찾을 수 없어요',
  downloadFailedMsg: '프로필 다운로드에 실패했어요. 동기화 코드를 확인해 주세요.',
  syncCode: '동기화 코드:',
  upload: '업로드',
  syncCodePlaceholder: '동기화 코드',
},
playerProgression: {
  active: '활성',
  inactive: '비활성',
  progressToNext: '다음 레벨까지',
  xpNeeded: '필요 XP',
  songsPlayed: '부른 곡 수',
  goldenNotes: '황금 음정',
  bestCombo: '최고 콤보',
  totalScore: '총 점수',
  achievementsTitle: '도전 과제',
  more: '+{n}개 더',
  beginner: '초보자',
  xp: 'XP',
  lv: 'Lv. {n}',
},
achievements: {
  title: '업적',
  unlocked: '해금됨',
  locked: '잠김',
  progress: '진행',
  noAchievements: '아직 업적이 없습니다',
  playToUnlock: '곡을 플레이하여 업적을 해금하세요!',
  rarity: '희귀도',
  common: '커먼',
  uncommon: '언커먼',
  rare: '레어',
  epic: '에픽',
  legendary: '레전더리',
  first_note: {
    name: '첫 음정',
    description: '첫 음정을 맞춰보세요',
  },
  perfect_ten: {
    name: '퍼펙트 10',
    description: '한 곡에서 퍼펙트 10회 달성',
  },
  combo_master: {
    name: '콤보 마스터',
    description: '50음 콤보 달성',
  },
  combo_king: {
    name: '콤보 킹',
    description: '100음 콤보 달성',
  },
  combo_legend: {
    name: '콤보 레전드',
    description: '200음 콤보 달성',
  },
  perfect_song: {
    name: '퍼펙트 송',
    description: '99.5% 이상의 정확도 달성',
  },
  accuracy_90: {
    name: '피치 퍼펙트',
    description: '정확도 90% 이상 달성',
  },
  score_8k: {
    name: '라이징 스타',
    description: '8,000점 이상 획득',
  },
  score_9k: {
    name: '스코어 마스터',
    description: '9,000점 이상 획득',
  },
  score_9500: {
    name: '플로리스',
    description: '9,500점 이상 획득',
  },
  golden_collector: {
    name: '골든 콜렉터',
    description: '황금 음정 10개 히트',
  },
  golden_master: {
    name: '골든 마스터',
    description: '황금 음정 50개 히트',
  },
  first_song: {
    name: '첫걸음',
    description: '첫 곡을 완주하세요',
  },
  ten_songs: {
    name: '가라오케 매니아',
    description: '10곡 완주',
  },
  fifty_songs: {
    name: '가라오케 단골',
    description: '50곡 완주',
  },
  hundred_songs: {
    name: '가라오케 레전드',
    description: '100곡 완주',
  },
  five_games: {
    name: '시작',
    description: '5게임 플레이',
  },
  twenty_games: {
    name: '열정 가수',
    description: '20게임 플레이',
  },
  party_time: {
    name: '파티 타임!',
    description: '파티 게임 모드 플레이',
  },
  duel_winner: {
    name: '듀얼 챔피언',
    description: '듀얼 매치 승리',
  },
  pass_the_mic: {
    name: '마이크 넘기기!',
    description: '마이크 넘기기 모드 플레이',
  },
  shower_singer: {
    name: '샤워싱어',
    description: '한 곡에서 20% 미만의 점수 획득',
  },
  comeback_king: {
    name: '컴백 킹',
    description: '10음을 놓친 후 50+ 콤보 달성',
  },
  speed_demon: {
    name: '스피드 데몬',
    description: '1.5배속으로 곡 완주',
  },
  blind_master: {
    name: '블라인드 마스터',
    description: '블라인드 가라오케 모드로 곡 완주',
  },
  daily_starter: {
    name: '데일리 입문자',
    description: '첫 데일리 챌린지 완주하기',
  },
  daily_regular: {
    name: '데일리 단골',
    description: '데일리 챌린지 10회 완주하기',
  },
  daily_devoted: {
    name: '데일리 헌신자',
    description: '데일리 챌린지 50회 완주하기',
  },
  streak_week: {
    name: '불타는 열정',
    description: '7일 연속 데일리 기록 유지하기',
  },
  streak_month: {
    name: '멈출 수 없음',
    description: '30일 연속 데일리 기록 유지하기',
  },
  weekly_warrior: {
    name: '위클리 워리어',
    description: '주간 챌린지 5회 완주하기',
  },
  accuracy_95: {
    name: '정밀 가수',
    description: '정확도 95% 초과 달성하기',
  },
  golden_rush: {
    name: '골든 러시',
    description: '한 곡에서 골든 노트 20개 히트하기',
  },
  golden_hundred: {
    name: '골든 센츄리온',
    description: '골든 노트 총 100개 히트하기',
  },
  perfect_fifty: {
    name: '퍼펙트 50',
    description: '한 곡에서 퍼펙트 노트 50개 히트하기',
  },
  lightning_lips: {
    name: '번개 입술',
    description: '2배속으로 곡 완주하기',
  },
  duet_harmony: {
    name: '완벽한 하모니',
    description: '듀엣 10곡 부르기',
  },
  genre_explorer: {
    name: '장르 탐험가',
    description: '5가지 다른 장르의 곡 부르기',
  },
  disney_fan: {
    name: '디즈니 팬',
    description: '디즈니 곡 10곡 부르기',
  },
  night_owl: {
    name: '밤샘의 달인',
    description: '자정부터 새벽 4시 사이에 곡 완주하기',
  },
  early_bird: {
    name: '아침형 인간',
    description: '오전 8시 이전에 곡 완주하기',
  },
  marathon_singer: {
    name: '마라톤 가수',
    description: '하루에 게임 5판 플레이하기',
  },

  // ── 100 업적 확장 ──
  score_9800: {
    name: '울트라 스타',
    description: '9,800점 이상 획득',
  },
  score_9900: {
    name: '완벽을 넘어서',
    description: '9,900점 이상 획득',
  },
  combo_300: {
    name: '콤보 타이탄',
    description: '300음 콤보 달성',
  },
  combo_500: {
    name: '불멸의 콤보',
    description: '500음 콤보 달성',
  },
  accuracy_92: {
    name: '미세 조정',
    description: '정확도 92% 초과 달성',
  },
  accuracy_94: {
    name: '스튜디오 퀄리티',
    description: '정확도 94% 초과 달성',
  },
  accuracy_96: {
    name: '명사수',
    description: '정확도 96% 초과 달성',
  },
  accuracy_97: {
    name: '레이저 정밀도',
    description: '정확도 97% 초과 달성',
  },
  accuracy_98: {
    name: '거장',
    description: '정확도 98% 초과 달성',
  },
  perfect_75: {
    name: '퍼펙트 75',
    description: '한 곡에서 퍼펙트 노트 75개 히트하기',
  },
  perfect_100: {
    name: '퍼펙트 100',
    description: '한 곡에서 퍼펙트 노트 100개 히트하기',
  },
  perfect_150: {
    name: '퍼펙트 스톰',
    description: '한 곡에서 퍼펙트 노트 150개 히트하기',
  },
  golden_30: {
    name: '골든 타이드',
    description: '한 곡에서 골든 노트 30개 히트하기',
  },
  golden_40: {
    name: '골든 심포니',
    description: '한 곡에서 골든 노트 40개 히트하기',
  },
  perfect_500: {
    name: '퍼펙트 머신',
    description: '퍼펙트 노트 총 500개 히트하기',
  },
  perfect_1000: {
    name: '정밀의 화신',
    description: '퍼펙트 노트 총 1,000개 히트하기',
  },
  perfect_5000: {
    name: '퍼펙트 아발란체',
    description: '퍼펙트 노트 총 5,000개 히트하기',
  },
  perfect_10000: {
    name: '퍼펙트 만 개',
    description: '퍼펙트 노트 총 10,000개 히트하기',
  },
  golden_250: {
    name: '황금 수확',
    description: '골든 노트 총 250개 히트하기',
  },
  golden_1000: {
    name: '황금 소나기',
    description: '골든 노트 총 1,000개 히트하기',
  },
  golden_5000: {
    name: '미다스의 목소리',
    description: '골든 노트 총 5,000개 히트하기',
  },
  songs_250: {
    name: '레퍼토리 베테랑',
    description: '250곡 완주',
  },
  songs_500: {
    name: '500곡 클럽',
    description: '500곡 완주',
  },
  songs_1000: {
    name: '천곡 전설',
    description: '1,000곡 완주',
  },
  games_50: {
    name: '단골 가수',
    description: '50게임 플레이',
  },
  games_100: {
    name: '100클럽',
    description: '100게임 플레이',
  },
  games_250: {
    name: '오락실 단골',
    description: '250게임 플레이',
  },
  games_500: {
    name: '마라톤 광신도',
    description: '500게임 플레이',
  },
  level_25: {
    name: '노련한 가수',
    description: '레벨 25 달성',
  },
  level_50: {
    name: '엘리트 보컬리스트',
    description: '레벨 50 달성',
  },
  level_100: {
    name: '레벨 100 전설',
    description: '레벨 100 달성',
  },
  daily_100: {
    name: '데일리 센츄리온',
    description: '데일리 챌린지 100회 완주하기',
  },
  daily_250: {
    name: '데일리 강골',
    description: '데일리 챌린지 250회 완주하기',
  },
  daily_500: {
    name: '불멸의 데일리',
    description: '데일리 챌린지 500회 완주하기',
  },
  streak_60: {
    name: '철의 의지',
    description: '60일 연속 데일리 기록 유지하기',
  },
  streak_100: {
    name: '백일 영웅',
    description: '100일 연속 데일리 기록 유지하기',
  },
  streak_180: {
    name: '반년의 헌신',
    description: '180일 연속 데일리 기록 유지하기',
  },
  streak_365: {
    name: '연간 전설',
    description: '365일 연속 데일리 기록 유지하기',
  },
  weekly_15: {
    name: '위클리 충신',
    description: '주간 챌린지 15회 완주하기',
  },
  weekly_30: {
    name: '위클리의 기둥',
    description: '주간 챌린지 30회 완주하기',
  },
  weekly_52: {
    name: '일 년치 위클리',
    description: '주간 챌린지 52회 완주하기',
  },
  encore_10: {
    name: '앙코르!',
    description: '하루에 게임 10판 플레이하기',
  },
  duets_25: {
    name: '듀엣 애호가',
    description: '듀엣 25곡 부르기',
  },
  duets_50: {
    name: '다이내믹 듀오',
    description: '듀엣 50곡 부르기',
  },
  duets_100: {
    name: '듀엣 100',
    description: '듀엣 100곡 부르기',
  },
  duels_5: {
    name: '결투자',
    description: '듀얼 5회 승리하기',
  },
  duels_10: {
    name: '듀얼 마스터',
    description: '듀얼 10회 승리하기',
  },
  duels_25: {
    name: '듀얼 제왕',
    description: '듀얼 25회 승리하기',
  },
  party_10: {
    name: '파티 동물',
    description: '파티 게임 10회 플레이하기',
  },
  party_25: {
    name: '분위기 메이커',
    description: '파티 게임 25회 플레이하기',
  },
  party_50: {
    name: '파티 레전드',
    description: '파티 게임 50회 플레이하기',
  },
  disney_25: {
    name: '디즈니 애호가',
    description: '디즈니 곡 25곡 부르기',
  },
  disney_50: {
    name: '옛날 옛적에',
    description: '디즈니 곡 50곡 부르기',
  },
  genres_8: {
    name: '장르 방랑자',
    description: '8가지 다른 장르의 곡 부르기',
  },
  genres_10: {
    name: '장르 통',
    description: '10가지 다른 장르의 곡 부르기',
  },
  clean_sheet: {
    name: '무실점',
    description: '50음 이상 놓침 없이 곡 완주하기',
  },
  weekend_singer: {
    name: '주말 가수',
    description: '토요일 또는 일요일에 곡 완주하기',
  },
  lunch_break: {
    name: '점심시간',
    description: '낮 12시부터 오후 2시 사이에 곡 완주하기',
  },
},
achievementsScreen: {
  title: '🏆 업적',
  description: '플레이하여 업적을 해금하세요!',
  unlocked: '해금됨',
  xpEarned: '획득 XP',
  completion: '완료율',
  all: '전체',
  categories: {
    performance: '퍼포먼스',
    progression: '진행',
    social: '소셜',
    special: '스페셜',
  },
  plusXp: '+{n} XP',
  locked: '잠김',
  viewPlayer: '플레이어의 업적',
  viewingOther: '{n}님의 업적을 보고 있습니다. 각 플레이어는 자신만의 업적을 해금합니다.',
  noMatches: '이 필터에 맞는 업적이 없습니다',
},
badgeNames: {
  'first-challenge': '첫 걸음',
  'week-warrior': '위크 워리어',
  'fortnight-fighter': '포트나이트 파이터',
  'monthly-master': '먼슬리 마스터',
  'top-3': '시상대 입상',
  champion: '데일리 챔피언',
  dedicated: '헌신적인 가수',
  legendary: '전설의 지위',
  'century-champion': '센추리 챔피언',
  'yearly-legend': '연간 전설',
  explorer: '챌린지 탐험가',
  songbird: '송버드',
  'weekly-warrior-q': '위클리 워리어',
},
badgeDescriptions: {
  'first-challenge': '첫 번째 데일리 챌린지를 완료하세요',
  'week-warrior': '7일 연속 스트릭을 달성하세요',
  'fortnight-fighter': '14일 연속 스트릭을 달성하세요',
  'monthly-master': '30일 연속 스트릭을 달성하세요',
  'top-3': '데일리 챌린지에서 상위 3위 이내에 들어가세요',
  champion: '데일리 챌린지에서 우승하세요',
  dedicated: '30회의 데일리 챌린지를 완료하세요',
  legendary: '누적 10,000 XP에 도달하세요',
  'century-champion': '100일 연속 스트릭을 달성하세요',
  'yearly-legend': '365일 연속 스트릭을 달성하세요',
  explorer: '5가지 다른 챌린지 모드를 플레이하세요',
  songbird: '총 10곡을 완료하세요',
  'weekly-warrior-q': '3회의 위클리 챌린지를 완료하세요',
},
mobileAchievements: {
  first_song: {
    title: '첫걸음',
    description: '첫 곡을 불러보세요',
  },
  ten_songs: {
    title: '라이징 스타',
    description: '10곡 부르기',
  },
  fifty_songs: {
    title: '베테랑',
    description: '50곡 부르기',
  },
  perfect_score: {
    title: '퍼펙셔니스트',
    description: '퍼펙트 스코어 달성 (95% 이상)',
  },
  five_perfect: {
    title: '플로리스',
    description: '퍼펙트 스코어 5회 달성',
  },
  high_score: {
    title: '스코어 마스터',
    description: '총 10,000점 달성',
  },
  queue_5: {
    title: '플레이리스트 빌더',
    description: '5곡 대기열에 추가',
  },
  genre_3: {
    title: '장르 탐험가',
    description: '3개 장르의 곡 부르기',
  },
},
challenges: {
  requirements: {
    minLevel: '레벨 {required} 필요 (현재 레벨: {current})',
    minSongs: '{required}곡 완주 필요 (현재: {current}곡)',
    achievement: '도전 과제 필요: {name}',
    rankNoXP: '랭크 요구 조건을 확인할 수 없어요 (XP 데이터 없음)',
    unknownRank: '알 수 없는 랭크 "{name}"',
    rankRequired: '"{required}" 랭크 필요 (현재: "{current}")',
  },
},
};
