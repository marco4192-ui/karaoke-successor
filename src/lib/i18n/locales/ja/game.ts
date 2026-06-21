// JA translations — game
// Auto-split from monolithic locale file

export const gameTranslations = {
  game: {
    back: '戻る',
    sync: '同期',
    pts: '点',
    combo: 'コンボ',
    practiceMode: '練習モード',
    enablePractice: '練習モードを有効にする',
    playbackSpeed: '再生速度',
    pitchGuide: 'ピッチガイド',
    audioEffects: 'オーディオエフェクト',
    reverb: 'リバーブ',
    echo: 'エコー',
    pause: '一時停止',
    resume: '再開',
    restart: 'リスタート',
    endSong: '曲を終了',
    lyrics: '歌詞',
    notes: 'ノーツ',
    score: 'スコア'
  },

  gameScreen: {
    noSongSelected: '曲が選択されていません',
    noSongLoaded: '曲が読み込まれていません',
    backToLibrary: 'ライブラリに戻る',
    pause: '⏸ 一時停止',
    lowPerf: '⚡ 低パフォーマンス',
    youtubeErrorDeleted: 'YouTube動画が見つかりません（削除または非公開）',
    youtubeErrorEmbed: 'この動画は埋め込みできません（埋め込みが無効）',
    youtubeErrorVevo: 'この動画は埋め込みできません（Vevo/埋め込み制限）',
    youtubeErrorInvalid: '無効なYouTubeパラメータ',
    youtubeErrorHtml5: 'YouTubeプレイヤーのHTML5エラー',
    youtubeErrorCode: 'YouTubeエラー（コード: {n}）',
    loadingMedia: 'メディアを読み込み中...'
  },

  gameHud: {
    audioEffects: 'オーディオエフェクト',
    reverb: 'リバーブ: {n}%',
    echo: 'エコー: {n}%',
    presets: 'プリセット',
    adPlaying: '広告再生中',
    gamePaused: 'ゲーム一時停止'
  },

  gameEnhancements: {
    loadingStats: '統計情報を読み込み中...',
    noCharacter: 'パフォーマンス統計を表示するには、キャラクターを選択または作成してください',
    totalScore: '総合スコア',
    gamesPlayed: 'プレイ回数',
    avgAccuracy: '平均正確率',
    bestCombo: '最高コンボ',
    recentAchievements: '最近の実績'
  },

  prominentScore: {
    player1: 'プレイヤー1',
    player2: 'プレイヤー2',
    combo: 'コンボ',
    comboMultiplied: '{n}x コンボ！'
  },

  practicePanel: {
    title: '練習モード',
    enable: '練習モードを有効化',
    pitchGuide: 'ピッチガイド',
    autoPlayNotes: '自動演奏'
  },

  mic: {
    title: 'マイク設定',
    multiMic: 'マルチマイクモード',
    multiMicDesc: 'デュエットやグループ歌唱で複数のマイクを同時に使用',
    selectDevice: 'マイクを選択',
    defaultMic: 'デフォルトマイク',
    addMic: 'マイクを追加',
    removeMic: '削除',
    assignToPlayer: 'プレイヤーに割り当て',
    level: 'レベル',
    gain: 'ゲイン',
    noiseSuppression: 'ノイズ抑制',
    noiseSuppressionDesc: '背景ノイズを軽減',
    echoCancellation: 'エコーキャンセラー',
    echoCancellationDesc: 'スピーカーフィードバックを軽減',
    test: 'マイクテスト',
    testing: 'テスト中...',
    noMicsFound: 'マイクが見つかりません。マイクを接続して更新してください。',
    connected: '接続済み',
    disconnected: '切断済み'
  },

  webcamBackground: {
    enable: 'ウェブカメラを有効化',
    enableDesc: '歌唱中の様子を録画',
    cameraDevice: 'カメラデバイス',
    selectCamera: 'カメラを選択',
    defaultCamera: 'デフォルトカメラ',
    camera: 'カメラ',
    size: 'サイズ',
    position: '位置',
    filter: 'フィルター',
    opacity: '不透明度',
    showBorder: '境界線を表示',
    fullscreen: '全画面',
    top: '上',
    bottom: '下',
    left: '左',
    right: '右',
    active: 'アクティブ',
    errorPermission: 'カメラの使用が拒否されました...',
    errorNoCamera: 'カメラが見つかりません...'
  },

  results: {
    perfect: 'パーフェクト！',
    excellent: 'エクセレント！',
    good: 'グッド！',
    okay: 'OK！',
    poor: ' Poor',
    totalScore: '総合スコア',
    notesHit: 'ヒットしたノーツ',
    notesMissed: 'ミスしたノーツ',
    bestCombo: '最高コンボ',
    accuracy: '正確さ',
    playAgain: 'もう一度プレイ',
    backToHome: 'ホームに戻る',
    shareScore: 'スコアを共有',
    scoreCard: 'スコアカード',
    videoShort: 'ショート動画',
    downloadCard: 'ダウンロードカード',
    uploadingToLeaderboard: 'グローバルリーダーボードにアップロード中...',
    newHighscore: '新ハイスコア！',
    rating: '評価',
    draw: '引き分け'
  },

  resultsScreen: {
    newGlobalHighscore: '🎉 新しいグローバルハイスコア！',
    uploadedRank: 'アップロード完了！順位 #{n}',
    uploadFailed: 'アップロード失敗',
    noResults: '結果がありません',
    accuracyLabel: '{n}% 正確率',
    player: 'プレイヤー',
    scores: 'スコア',
    replay: 'リプレイ'
  },

  scoreVisualization: {
    title: 'スコア分析',
    poor: '悪い',
    okay: '普通',
    good: '良い',
    excellent: '優秀',
    perfect: '完璧',
    duelComparison: '⚔️ デュアル比較',
    accuracy: '{n}% 正確さ',
    maxCombo: '{n}x 最大コンボ',
    p1Wins: '🏆 P1の勝ち！',
    p2Wins: '🏆 P2の勝ち！',
    draw: '🤝 引き分け！',
    notesHit: 'ヒットしたノーツ',
    maxComboLabel: '最大コンボ',
    player1: 'プレイヤー1',
    player2: 'プレイヤー2',
    score: 'スコア',
    combo: 'コンボ',
    consistency: '一貫性',
    rating: '評価',
    notes: 'ノーツ',
    finalScore: '最終スコア',
    maxScore: '最高スコア',
    notesMissed: 'ミスしたノーツ',
    category: 'カテゴリー',
    player1Wins: 'プレイヤー1の勝利！',
    player2Wins: 'プレイヤー2の勝利！',
    drawResult: '引き分け！',
    scoreBattle: 'スコアバトル',
    player1Abbr: 'P1',
    player2Abbr: 'P2',
    stat: '統計'
  },

  highscore: {
    title: 'ハイスコア',
    local: 'ローカル',
    global: 'グローバル',
    noScores: 'ハイスコアはまだありません',
    noScoresDesc: '曲をプレイして最初のハイスコアを記録しよう！',
    rank: '順位',
    player: 'プレイヤー',
    song: '曲',
    score: 'スコア',
    date: '日付',
    clearAll: 'すべてのハイスコアをクリア'
  },

  highscoreScreen: {
    title: 'ハイスコアランキング',
    description: 'トップシンガーと伝説的なパフォーマンス！',
    local: '🏠 ローカル',
    global: '🌍 グローバル',
    allScores: '全スコア',
    myScores: 'マイスコア',
    rankingTitles: 'ランキングタイトル',
    loadingGlobal: 'グローバルランキングを読み込み中...',
    retry: '🔄 再試行',
    switchToLocal: 'ローカルに切り替え',
    noGlobal: 'グローバルスコアはまだありません。最初にアップロードしましょう！',
    noMine: 'まだスコアを設定していません！',
    noAll: 'まだハイスコアがありません。最初に歌いましょう！',
    accuracyLabel: '{n}% 正確さ',
    maxComboLabel: '{n}x 最大コンボ',
    totalPoints: '合計ポイント'
  },

  keyboardShortcuts: {
    esc: '一時停止 / 戻る / 終了',
    enter: 'ゲームを再開（一時停止中）',
    f12: 'フルスクリーン切替',
    f1f10: 'メニュー操作',
    ctrlL: 'ライブラリで検索',
    ctrlR: 'ランダム曲（ソロ）',
    ctrlD: 'ランダム曲（デュエル）',
    ctrlQ: 'キューの曲を開始',
    ctrlJ: 'ジュークボックスを開始',
    arrows: '操作',
  },

  audioAnalysis: {
    confidenceHigh: '緑 — 信頼性高い',
    confidenceMedium: '黄 — ほぼ正確',
    confidenceLow: '橙 — 不確実',
    confidenceVeryLow: '赤 — 手動確認を推奨',
  },

  pitchGraph: {
    pitch: 'ピッチ: {n}',
    noPitch: 'ピッチが検出されません',
  },

  battleRoyaleGame: {
    survived: 'サバイバル成功！',
  },

  remoteControl: {
    skipAdTitle: '⏭️ 広告をスキップ',
    skipAdDesc: '動画をクリックして「広告をスキップ」ボタンを押してください！',
  },

  mobilePage: {
    loadingCompanion: 'コンパニオンアプリを読み込み中…',
    failedToLoad: 'コンパニオンアプリの読み込みに失敗しました',
    retry: '再試行',
  },

  // --- Achievements (i18n keys for src/lib/game/achievements.ts) ---
  achievements: {
    firstNote: { name: 'ファーストノート', description: '最初のノートをヒット' },
    perfectTen: { name: 'パーフェクトテン', description: '1曲でパーフェクト10回ヒット' },
    comboMaster: { name: 'コンボマスター', description: '50ノートコンボを達成' },
    comboKing: { name: 'コンボキング', description: '100ノートコンボを達成', rewardTitle: 'コンボキング' },
    comboLegend: { name: 'コンボレジェンド', description: '200ノートコンボを達成', rewardTitle: 'コンボレジェンド' },
    perfectSong: { name: 'パーフェクトソング', description: '1曲で99.5%以上の精度を達成', rewardTitle: '完璧主義者' },
    pitchPerfect: { name: 'ピッチパーフェクト', description: '90%以上の精度を達成' },
    risingStar: { name: '新星', description: '8,000点以上を獲得' },
    scoreMaster: { name: 'スコアマスター', description: '9,000点以上を獲得' },
    flawless: { name: 'フローレス', description: '9,500点以上を獲得', rewardTitle: 'フローレス' },
    goldenCollector: { name: 'ゴールドコレクター', description: 'ゴールデンノート10個ヒット' },
    goldenMaster: { name: 'ゴールドマスター', description: 'ゴールデンノート50個ヒット', rewardTitle: 'ゴールデンボイス' },
    firstSong: { name: 'ファーストステップ', description: '最初の曲を完了' },
    tenSongs: { name: 'カラオケ愛好家', description: '10曲を完了' },
    fiftySongs: { name: 'カラオケ常連', description: '50曲を完了' },
    hundredSongs: { name: 'カラオケレジェンド', description: '100曲を完了', rewardTitle: 'カラオケレジェンド' },
    fiveGames: { name: 'ファーストステップ', description: '5ゲームプレイ' },
    twentyGames: { name: '熱心な歌手', description: '20ゲームプレイ' },
    partyTime: { name: 'パーティータイム！', description: 'パーティーゲームモードをプレイ' },
    duelChampion: { name: 'デュエルチャンピオン', description: 'デュエルで勝利' },
    passTheMic: { name: 'マイクパス！', description: 'マイクパスモードをプレイ' },
    showerSinger: { name: 'シャワーシンガー', description: '1曲で20%未満の精度', rewardTitle: 'シャワーシンガー' },
    comebackKing: { name: 'カムバックキング', description: '10ノートミスした後に50以上のコンボを達成' },
    speedDemon: { name: 'スピードデーモン', description: '1.5倍速で曲を完了' },
    blindMaster: { name: 'ブラインドマスター', description: 'ブラインドカラオケモードで曲を完了', rewardTitle: 'ブラインドマスター' },
  },

  // --- Ranks ---
  ranks: {
    beginner: { name: 'ビギナー', titles: { newcomer: '新人' } },
    novice: { name: 'ノービス', titles: { risingStar: '新星' } },
    apprentice: { name: '見習い', titles: { melodyMaker: 'メロディーメーカー' } },
    singer: { name: 'シンガー', titles: { voiceInTraining: '修行中の歌声' } },
    performer: { name: 'パフォーマー', titles: { stagePresence: 'ステージプレゼンス' } },
    artist: { name: 'アーティスト', titles: { artisticSoul: '芸術的魂' } },
    star: { name: 'スター', titles: { shiningStar: '輝く星' } },
    superstar: { name: 'スーパースター', titles: { crowdFavorite: '観客のお気に入り' } },
    legend: { name: 'レジェンド', titles: { legendaryVoice: '伝説の歌声' } },
    icon: { name: 'アイコン', titles: { musicalIcon: 'ミュージカルアイコン' } },
    mythic: { name: 'ミシック', titles: { mythicSinger: 'ミシックシンガー' } },
    divine: { name: 'ディヴァイン', titles: { divineVoice: '神の声' } },
  },

  // --- Challenge Modes ---
  challenges: {
    blindAudition: { name: 'ブラインドオーディション', description: '歌詞を見ずに歌う — 記憶力テスト！' },
    freeFlight: { name: 'フリーフライト', description: 'ピッチガイドなし — 耳で歌う！' },
    speedDemon: { name: 'スピードデーモン', description: '1.5倍速 — 素早い思考！' },
    perfectionist: { name: '完璧主義者', description: 'パーフェクトノートのみカウント！' },
    goldenHunter: { name: 'ゴールデンハンター', description: 'ゴールデンノートのみ得点 — 全部ゲット！' },
    memoryLane: { name: 'メモリーレーン', description: '空欄チャレンジ — 穴白を埋めろ！' },
    pitchShift: { name: 'ピッチシフト', description: '曲が転調されている — 声を合わせろ！' },
    halfSpeed: { name: 'スローモーション', description: '0.75倍速 — 練習に最適！' },
    blindMaster: { name: 'ブラインドマスター', description: '歌詞もピッチガイドもなし — 真の盲目カラオケ！' },
    ultimateChallenge: { name: '究極のチャレンジ', description: '全モディファイア結合 — 勇者のみ！' },
  },

  // --- Challenge Modifiers ---
  modifiers: {
    noLyrics: { label: '歌詞なし', description: '歌詞が非表示', shortDescription: '歌詞なし' },
    noPitchGuide: { label: 'ピッチガイドなし', description: 'ピッチガイドが非表示', shortDescription: 'ピッチガイドなし' },
    doubleSpeed: { label: 'スピードブースト', description: '曲が速く再生される', shortDescription: '1.25倍速' },
    halfSpeed: { label: 'スローモーション', description: '曲が遅く再生される' },
    perfectOnly: { label: '完璧主義者', description: 'パーフェクトノートのみカウント' },
    goldenOnly: { label: 'ゴールデンハンター', description: 'ゴールデンノートのみカウント' },
    missingWords: { label: '空欄ワード', description: '一部の単語が非表示' },
    blind: { label: 'ブラインド', description: '歌詞とピッチガイドなし' },
    pitchShift: { description: '3半音ピッチシフト' },
  },

  // --- Ranking Titles ---
  rankingTitles: {
    showerSingingSensation: 'シャワーシンギング・センセーション',
    karaokeRoyalty: 'カラオケ・ロイヤルティ',
    vocalVirtuoso: 'ボーカル・ヴィルトゥオーソ',
    micDropMaster: 'マイクドロップ・マスター',
    diamondVoice: 'ダイヤモンド・ボイス',
    broadwayWannabe: 'ブロードウェイ志望',
    noteNailer: 'ノート・ネイラー',
    pitchyParrot: 'ピッチー・パロット',
    circusSinger: 'サーカス・シンガー',
    humbleHummer: 'ハンブル・ハンマー',
    underConstruction: '建設中',
    bathroomBaritone: 'バスルーム・バリトン',
    phantomPhony: 'ファントム・フォニー',
    duckTapeSinger: 'ダクトテープ・シンガー',
    tunelessTroubadour: 'チューーンレス・トルバドゥール',
    vocalTornado: 'ボーカル・トルネード（災害）',
    toneDeafTitan: 'トーンデフ・タイタン',
    clownCarCrooner: 'クラウンバン・クルーナー',
    toneZombie: 'トーン・ゾンビ',
    whisperingWimp: 'ウィスパリング・ウィンプ',
    silentScream: 'サイレント・スクリーム',
  },

  // --- Battle Royale (new keys) ---
  battleRoyale: {
    bounty: 'バウンティ',
    micError: 'マイク',
  },
};
