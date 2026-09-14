// JA translations — profile

export const profileTranslations = {
profile: {
  title: 'プロファイル',
  createCharacter: 'プロファイルを作成',
  name: '名前',
  namePlaceholder: 'プロファイル名...',
  country: '国',
  countryOptional: '国を選択（任意）',
  avatar: 'アバター',
  uploadPhoto: '写真をアップロード',
  create: '作成',
  edit: '編集',
  delete: '削除',
  active: 'アクティブ',
  selectAsActive: 'アクティブに設定',
  noCharacters: 'プロファイルがありません',
  noCharactersDesc: 'スコアと進捗を追跡するためにプロファイルを作成しましょう！',
  showOnLeaderboard: 'リーダーボードに表示',
  showPhoto: '写真を表示',
  photoUploaded: '写真がアップロードされました',
  noPhoto: '写真なし',
  privacyHint: 'Your scores will be uploaded to the global leaderboard.',
  privacyHintDesc: 'You can opt out at any time in Profile Settings.',
  storageMode: {
    title: 'プロフィールの保存方法',
    local: 'ローカルのみ',
    localDesc: 'すべてのデータはこの端末にのみ保存されます — オンラインランキングも同期もありません。',
    online: 'オンラインプロフィール',
    onlineDesc: 'オンラインランキングに参加して、端末間で同期し、デイリーの結果を共有できます。',
    localShort: 'ローカル',
    onlineShort: 'オンライン',
    settingsDesc: 'このプロフィールをオンラインランキングに参加させるか、ローカルのみにするかを選択できます。いつでも変更可能です。',
  },
  countrySearch: '国を検索…',
  noCountryFound: '国が見つかりません',
  popularCountries: '人気',
  allCountries: 'すべての国',
},
profileAuth: {
  accountTitle: 'オンラインアカウント（任意）',
  accountDesc: 'メールアドレスとパスワードを保存すると、このプロフィールを別のデバイスで読み込めるようになります。ログインはカラオケアプリ内でのみ可能で、ウェブログインはありません。',
  email: 'メールアドレス',
  emailPlaceholder: 'your@email.com',
  emailInvalid: '有効なメールアドレスを入力してください',
  emailTaken: 'このメールアドレスは既に登録されています',
  password: 'パスワード',
  passwordPlaceholder: '8文字以上',
  passwordRepeat: 'パスワードを再入力',
  passwordsDontMatch: 'パスワードが一致しません',
  passwordTooShort: 'パスワードは8文字以上である必要があります',
  registerFailed: 'オンラインアカウントを作成できませんでした',
  loginTitle: 'オンラインプロフィールを読み込む',
  loginDesc: 'オンラインプロフィールのメールアドレスとパスワードを入力して、このデバイスに読み込みます。',
  loginButton: 'ログインして読み込む',
  loginFailed: 'ログインに失敗しました。メールアドレスとパスワードをご確認ください',
  loginSuccess: 'プロフィール「{n}」を読み込みました！',
  noSnapshot: 'サーバー上に同期されたプロフィールデータはまだありません',
  emailNote: 'ログイン専用です。公開されることはありません',
  changePassword: 'パスワード変更',
  currentPassword: '現在のパスワード',
  newPassword: '新しいパスワード',
  passwordChanged: 'パスワードを変更しました',
  passwordChangeFailed: 'パスワードを変更できませんでした',
  hasAccount: 'オンラインアカウント ✓',
  registrationPending: 'オンラインアカウントを作成中…',
  registrationSuccess: 'オンラインアカウントを作成しました。どのデバイスでもログインできます',
  registrationSuccessTitle: '🔐 オンラインアカウント',
  loginSuccessTitle: '✅ {n}',
},
characterScreen: {
  title: 'プロファイル',
  description: 'シンガープロファイルを作成・管理',
  onlineLeaderboard: 'オンラインリーダーボード',
  createProfile: '新しいプロファイルを作成',
  yourProfiles: 'あなたのプロファイル ({n})',
  noProfiles: 'プロファイルがまだありません。「新しいプロファイルを作成」をクリックして始めましょう！',
  settingsTitle: 'プロファイル設定',
  nameAndAvatar: '名前とアバター',
  rankDisplay: 'ランキング表示',
  showRankInName: '名前にランクを表示',
  rankPrefix: '接頭辞',
  rankSuffix: '接尾辞',
  rankFull: 'フル',
  countryAndPrivacy: '国とプライバシー',
  selectCountry: '国を選択',
  visible: '表示',
  hidden: '非表示',
  shown: '表示中',
  companionAppLink: 'コンパニオンアプリリンク',
  companionAppLinkDesc: 'このQRコードをスキャンして、コンパニオンアプリでこのプロファイルに直接接続してください。',
  hideQrCode: 'QRコードを非表示',
  showQrCode: 'QRコードを表示',
  leaderboardParticipation: 'Leaderboard Participation',
  leaderboardParticipationDesc: 'Participate in the online leaderboard and share your scores with other players',
  loadProfile: 'オンラインプロフィールを読み込む',
},
characterCard: {
  connected: '接続済み',
  connectedWith: '接続中: {n}',
},
profileSync: {
  title: 'プロファイル同期',
  uploadSuccess: 'プロファイルがアップロードされました！同期コード: {n}',
  uploadFailed: 'アップロードに失敗しました',
  downloadFailed: 'プロファイルのアップロードに失敗しました',
  invalidCode: '有効な8文字の同期コードを入力してください',
  syncSuccess: 'プロファイルの同期が成功しました！',
  notFound: 'プロファイルが見つかりません',
  profileNotFound: 'プロフィールが見つかりません',
  downloadFailedMsg: 'プロファイルのダウンロードに失敗しました。同期コードを確認してください。',
  syncCode: '同期コード:',
  upload: 'アップロード',
  syncCodePlaceholder: '同期コード',
},
playerProgression: {
  active: 'アクティブ',
  inactive: '非アクティブ',
  progressToNext: '次のレベルまでの進捗',
  xpNeeded: '必要なXP',
  songsPlayed: '歌唱した曲数',
  goldenNotes: 'ゴールデンノート',
  bestCombo: 'ベストコンボ',
  totalScore: '総スコア',
  achievementsTitle: '実績',
  more: '+{n} 件',
  beginner: 'ビギナー',
  xp: 'XP',
  lv: 'Lv. {n}',
},
achievements: {
  title: '実績',
  unlocked: '解除済み',
  locked: 'ロック中',
  progress: '進捗',
  noAchievements: '実績はまだありません',
  playToUnlock: '曲をプレイして実績を解除しよう！',
  rarity: 'レアリティ',
  common: 'コモン',
  uncommon: 'アンコモン',
  rare: 'レア',
  epic: 'エピック',
  legendary: 'レジェンダリー',
  first_note: {
    name: 'ファーストノート',
    description: '最初のノートをヒット',
  },
  perfect_ten: {
    name: 'パーフェクトテン',
    description: '1曲でパーフェクトを10回出す',
  },
  combo_master: {
    name: 'コンボマスター',
    description: '50ノートコンボを達成',
  },
  combo_king: {
    name: 'コンボキング',
    description: '100ノートコンボを達成',
  },
  combo_legend: {
    name: 'コンボレジェンド',
    description: '200ノートコンボを達成',
  },
  perfect_song: {
    name: 'パーフェクトソング',
    description: '精度99.5%以上を達成',
  },
  accuracy_90: {
    name: 'ピッチパーフェクト',
    description: '精度90%以上を達成',
  },
  score_8k: {
    name: 'ライジングスター',
    description: '8,000ポイント以上を獲得',
  },
  score_9k: {
    name: 'スコアマスター',
    description: '9,000ポイント以上を獲得',
  },
  score_9500: {
    name: 'フローレス',
    description: '9,500ポイント以上を獲得',
  },
  golden_collector: {
    name: 'ゴールデンコレクター',
    description: 'ゴールデンノートを10回ヒット',
  },
  golden_master: {
    name: 'ゴールデンマスター',
    description: 'ゴールデンノートを50回ヒット',
  },
  first_song: {
    name: 'ファーストステップ',
    description: '最初の曲を完了',
  },
  ten_songs: {
    name: 'カラオケ愛好家',
    description: '10曲を完了',
  },
  fifty_songs: {
    name: 'カラオケ常連',
    description: '50曲を完了',
  },
  hundred_songs: {
    name: 'カラオケレジェンド',
    description: '100曲を完了',
  },
  five_games: {
    name: 'スタートダッシュ',
    description: '5ゲームプレイ',
  },
  twenty_games: {
    name: '熱心なシンガー',
    description: '20ゲームプレイ',
  },
  party_time: {
    name: 'パーティータイム！',
    description: 'パーティーゲームモードをプレイ',
  },
  duel_winner: {
    name: 'デュエルチャンピオン',
    description: 'デュエルに勝利',
  },
  pass_the_mic: {
    name: 'マイクパス！',
    description: 'マイクパスモードをプレイ',
  },
  shower_singer: {
    name: 'シャワーシンガー',
    description: '精度20%未満で曲を歌う',
  },
  comeback_king: {
    name: 'カムバックキング',
    description: '10回ミスした後に50以上のコンボを達成',
  },
  speed_demon: {
    name: 'スピードデーモン',
    description: '1.5倍速で曲を完了',
  },
  blind_master: {
    name: 'ブラインドマスター',
    description: 'ブラインドカラオケモードで曲を完了',
  },
  daily_starter: {
    name: 'デイリー入門者',
    description: '初めてのデイリーチャレンジを完了する',
  },
  daily_regular: {
    name: 'デイリー常連',
    description: 'デイリーチャレンジを10回完了する',
  },
  daily_devoted: {
    name: 'デイリーの申し子',
    description: 'デイリーチャレンジを50回完了する',
  },
  streak_week: {
    name: '絶好調',
    description: 'デイリー連続記録を7日維持する',
  },
  streak_month: {
    name: '止まらない',
    description: 'デイリー連続記録を30日維持する',
  },
  weekly_warrior: {
    name: 'ウィークリーウォリアー',
    description: 'ウィークリーチャレンジを5回完了する',
  },
  accuracy_95: {
    name: '精密歌手',
    description: '精度95%以上を達成する',
  },
  golden_rush: {
    name: 'ゴールドラッシュ',
    description: '1曲でゴールデンノートを20個ヒットする',
  },
  golden_hundred: {
    name: 'ゴールデンセンチュリオン',
    description: 'ゴールデンノートを通算100個ヒットする',
  },
  perfect_fifty: {
    name: 'パーフェクト50',
    description: '1曲でパーフェクトノートを50個ヒットする',
  },
  lightning_lips: {
    name: '稲妻の唇',
    description: '2倍速で曲を完了する',
  },
  duet_harmony: {
    name: '完璧なハーモニー',
    description: 'デュエットを10曲歌う',
  },
  genre_explorer: {
    name: 'ジャンル探検家',
    description: '5つの異なるジャンルの曲を歌う',
  },
  disney_fan: {
    name: 'ディズニーファン',
    description: 'ディズニーの曲を10曲歌う',
  },
  night_owl: {
    name: '夜更かしの達人',
    description: '深夜0時から午前4時の間に曲を完了する',
  },
  early_bird: {
    name: '早起きの達人',
    description: '午前8時前に曲を完了する',
  },
  marathon_singer: {
    name: 'マラソンシンガー',
    description: '1日に5回プレイする',
  },

  // ── 100実績拡張 ──
  score_9800: {
    name: 'ウルトラスター',
    description: '9,800ポイント以上を獲得',
  },
  score_9900: {
    name: '完璧を超えて',
    description: '9,900ポイント以上を獲得',
  },
  combo_300: {
    name: 'コンボタイタン',
    description: '300ノートコンボを達成',
  },
  combo_500: {
    name: '不死のコンボ',
    description: '500ノートコンボを達成',
  },
  accuracy_92: {
    name: 'ファインチューニング',
    description: '精度92%以上を達成',
  },
  accuracy_94: {
    name: 'スタジオクオリティ',
    description: '精度94%以上を達成',
  },
  accuracy_96: {
    name: 'シャープシューター',
    description: '精度96%以上を達成',
  },
  accuracy_97: {
    name: '百発百中',
    description: '精度97%以上を達成',
  },
  accuracy_98: {
    name: '名手',
    description: '精度98%以上を達成',
  },
  perfect_75: {
    name: 'パーフェクト75',
    description: '1曲でパーフェクトノートを75個ヒットする',
  },
  perfect_100: {
    name: 'パーフェクト100',
    description: '1曲でパーフェクトノートを100個ヒットする',
  },
  perfect_150: {
    name: 'パーフェクトストーム',
    description: '1曲でパーフェクトノートを150個ヒットする',
  },
  golden_30: {
    name: 'ゴールデンタイド',
    description: '1曲でゴールデンノートを30個ヒットする',
  },
  golden_40: {
    name: 'ゴールデンシンフォニー',
    description: '1曲でゴールデンノートを40個ヒットする',
  },
  perfect_500: {
    name: 'パーフェクトマシン',
    description: 'パーフェクトノートを通算500個ヒットする',
  },
  perfect_1000: {
    name: '精密の化身',
    description: 'パーフェクトノートを通算1,000個ヒットする',
  },
  perfect_5000: {
    name: 'パーフェクトアバランチ',
    description: 'パーフェクトノートを通算5,000個ヒットする',
  },
  perfect_10000: {
    name: 'パーフェクト一万',
    description: 'パーフェクトノートを通算10,000個ヒットする',
  },
  golden_250: {
    name: '黄金の収穫',
    description: 'ゴールデンノートを通算250個ヒットする',
  },
  golden_1000: {
    name: '黄金の豪雨',
    description: 'ゴールデンノートを通算1,000個ヒットする',
  },
  golden_5000: {
    name: 'ミダスの歌声',
    description: 'ゴールデンノートを通算5,000個ヒットする',
  },
  songs_250: {
    name: 'レパートリーのベテラン',
    description: '250曲を完了',
  },
  songs_500: {
    name: '500曲クラブ',
    description: '500曲を完了',
  },
  songs_1000: {
    name: '千曲伝説',
    description: '1,000曲を完了',
  },
  games_50: {
    name: '常連シンガー',
    description: '50ゲームプレイ',
  },
  games_100: {
    name: 'センチュリークラブ',
    description: '100ゲームプレイ',
  },
  games_250: {
    name: 'アーケード常連',
    description: '250ゲームプレイ',
  },
  games_500: {
    name: 'マラソンマニアック',
    description: '500ゲームプレイ',
  },
  level_25: {
    name: '熟練シンガー',
    description: 'レベル25に到達',
  },
  level_50: {
    name: 'エリートボーカリスト',
    description: 'レベル50に到達',
  },
  level_100: {
    name: 'レベル100レジェンド',
    description: 'レベル100に到達',
  },
  daily_100: {
    name: 'デイリーセンチュリオン',
    description: 'デイリーチャレンジを100回完了する',
  },
  daily_250: {
    name: 'デイリーの鉄人',
    description: 'デイリーチャレンジを250回完了する',
  },
  daily_500: {
    name: '不滅のデイリー',
    description: 'デイリーチャレンジを500回完了する',
  },
  streak_60: {
    name: '鉄の意志',
    description: 'デイリー連続記録を60日維持する',
  },
  streak_100: {
    name: '百日ヒーロー',
    description: 'デイリー連続記録を100日維持する',
  },
  streak_180: {
    name: '半年の献身',
    description: 'デイリー連続記録を180日維持する',
  },
  streak_365: {
    name: '年間レジェンド',
    description: 'デイリー連続記録を365日維持する',
  },
  weekly_15: {
    name: 'ウィークリーの重鎮',
    description: 'ウィークリーチャレンジを15回完了する',
  },
  weekly_30: {
    name: 'ウィークリーの柱',
    description: 'ウィークリーチャレンジを30回完了する',
  },
  weekly_52: {
    name: '一年分のウィークリー',
    description: 'ウィークリーチャレンジを52回完了する',
  },
  encore_10: {
    name: 'アンコール！',
    description: '1日に10ゲームプレイする',
  },
  duets_25: {
    name: 'デュエット愛好家',
    description: 'デュエットを25曲歌う',
  },
  duets_50: {
    name: 'ダイナミックデュオ',
    description: 'デュエットを50曲歌う',
  },
  duets_100: {
    name: 'デュエットセンチュリオン',
    description: 'デュエットを100曲歌う',
  },
  duels_5: {
    name: 'デュエリスト',
    description: 'デュエルで5回勝利する',
  },
  duels_10: {
    name: 'デュエルマスター',
    description: 'デュエルで10回勝利する',
  },
  duels_25: {
    name: 'デュエルの覇王',
    description: 'デュエルで25回勝利する',
  },
  party_10: {
    name: 'パーティーアニマル',
    description: 'パーティーゲームを10回プレイする',
  },
  party_25: {
    name: 'パーティーの花形',
    description: 'パーティーゲームを25回プレイする',
  },
  party_50: {
    name: 'パーティーレジェンド',
    description: 'パーティーゲームを50回プレイする',
  },
  disney_25: {
    name: 'ディズニー愛好家',
    description: 'ディズニーの曲を25曲歌う',
  },
  disney_50: {
    name: 'むかしむかしの歌',
    description: 'ディズニーの曲を50曲歌う',
  },
  genres_8: {
    name: 'ジャンル放浪者',
    description: '8つの異なるジャンルの曲を歌う',
  },
  genres_10: {
    name: 'ジャンル通',
    description: '10の異なるジャンルの曲を歌う',
  },
  clean_sheet: {
    name: '無失点',
    description: '50ノート以上でミスゼロのまま曲を完了する',
  },
  weekend_singer: {
    name: 'ウィークエンドシンガー',
    description: '土曜日または日曜日に曲を完了する',
  },
  lunch_break: {
    name: 'ランチブレイク',
    description: '12時から14時の間に曲を完了する',
  },
},
achievementsScreen: {
  title: '🏆 実績',
  description: 'プレイして実績を解除しましょう！',
  unlocked: '解除済み',
  xpEarned: '獲得XP',
  completion: '完了率',
  all: 'すべて',
  categories: {
    performance: 'パフォーマンス',
    progression: '進捗',
    social: 'ソーシャル',
    special: 'スペシャル',
  },
  plusXp: '+{n} XP',
  locked: 'ロック中',
  viewPlayer: 'プレイヤーの実績',
  viewingOther: '{n}さんの実績を表示しています。実績はプレイヤーごとに解放されます。',
  noMatches: 'このフィルターに一致する実績はありません',
},
badgeNames: {
  'first-challenge': 'ファーストステップ',
  'week-warrior': 'ウィークウォーリアー',
  'fortnight-fighter': 'フォートナイトファイター',
  'monthly-master': 'マンスリーマスター',
  'top-3': '表彰台フィニッシュ',
  champion: 'デイリーチャンピオン',
  dedicated: '専念歌手',
  legendary: '伝説のステータス',
  'century-champion': 'センチュリーチャンピオン',
  'yearly-legend': '年間伝説',
  explorer: 'チャレンジ探検家',
  songbird: 'ソングバード',
  'weekly-warrior-q': 'ウィークリーウォーリアー',
},
badgeDescriptions: {
  'first-challenge': '最初のデイリーチャレンジを完了する',
  'week-warrior': '7日間連続記録を達成する',
  'fortnight-fighter': '14日間連続記録を達成する',
  'monthly-master': '30日間連続記録を達成する',
  'top-3': 'デイリーチャレンジで上位3位に入る',
  champion: 'デイリーチャレンジで優勝する',
  dedicated: '30回のデイリーチャレンジを完了する',
  legendary: '累計10,000 XPに到達する',
  'century-champion': '100日間連続記録を達成する',
  'yearly-legend': '365日間連続記録を達成する',
  explorer: '5種類のチャレンジモードをプレイする',
  songbird: '合計10曲を完了する',
  'weekly-warrior-q': '3回のウィークリーチャレンジを完了する',
},
mobileAchievements: {
  first_song: {
    title: 'ファーストステップ',
    description: '最初の曲を歌う',
  },
  ten_songs: {
    title: 'ライジングスター',
    description: '10曲を歌う',
  },
  fifty_songs: {
    title: 'ベテラン',
    description: '50曲を歌う',
  },
  perfect_score: {
    title: '完璧主義者',
    description: 'パーフェクトスコア（95%以上）を達成',
  },
  five_perfect: {
    title: 'フローレス',
    description: 'パーフェクトスコアを5回達成',
  },
  high_score: {
    title: 'スコアマスター',
    description: '合計10,000ポイントに到達',
  },
  queue_5: {
    title: 'プレイリストビルダー',
    description: '5曲をキューに追加',
  },
  genre_3: {
    title: 'ジャンルエクスプローラー',
    description: '3つのジャンルの曲を歌う',
  },
},
challenges: {
  requirements: {
    minLevel: 'レベル{required}が必要（現在はレベル{current}）',
    minSongs: '{required}曲の完了が必要（現在は{current}曲）',
    achievement: '実績が必要: {name}',
    rankNoXP: 'ランク要件を確認できません（XPデータがありません）',
    unknownRank: '不明なランク「{name}」',
    rankRequired: 'ランク「{required}」が必要（現在は「{current}」）',
  },
},
};
