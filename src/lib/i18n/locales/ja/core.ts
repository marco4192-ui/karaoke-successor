// JA translations — core
// Auto-split from monolithic locale file

export const coreTranslations = {
  nav: {
    library: 'ライブラリ',
    import: 'インポート',
    party: 'パーティー',
    profiles: 'キャラクター',
    queue: 'キュー',
    highscores: 'ハイスコア',
    jukebox: 'ジュークボックス',
    mobile: 'モバイル',
    achievements: '実績',
    daily: 'デイリー',
    settings: '設定'
  },

  home: {
    title: 'Karaoke ZERO',
    subtitle: '究極のカラオケ体験。リアルタイム音程検出で歌い、友人と競い、パーティーゲームを楽しもう！',
    startSinging: '歌い始める',
    partyMode: 'パーティーモード',
    songsAvailable: '曲数',
    profilesCreated: 'キャラクター作成数',
    partyGames: 'パーティーゲーム',
    difficultyLevels: '難易度レベル',
    selectProfile: 'キャラクターを選択',
    createNew: '新規作成'
  },

  homeScreen: {
    subtitle: '究極のカラオケ体験。リアルタイムピッチ検出、友達との競争、パーティーゲームを楽しんで、心ゆくまで歌いましょう！',
    loadingStats: '統計情報を読み込み中...',
    realTimePitch: 'リアルタイムピッチ検出',
    realTimePitchDesc: '高度なYINアルゴリズムで高精度に歌唱ピッチをリアルタイム検出。歌っている姿が可視化されます！',
    partyGamesFeature: 'パーティーゲーム',
    partyGamesFeatureDesc: 'パス・ザ・マイク、メドレーコンテスト、ミッシング・ワード、デュエルモード、ブラインドカラオケ - パーティーのための無限のエンターテイメント！',
    mobileCompanion: 'モバイルコンパニオン',
    mobileCompanionDesc: 'スマートフォンをマイクやリモコンとして使用！QRコードをスキャンして接続してください。',
    wifiStep1: '1. 同じWi-Fiネットワーク',
    wifiStep2: '2. カメラでQRコードをスキャン',
    wifiStep3: '3. ブラウザでリンクを開く',
    detectingNetwork: 'ネットワークアドレスを検出中...',
    selectCharacter: 'キャラクターを選択',
    inactiveProfiles: '非アクティブなプロファイル({n}件)が非表示です。プロファイル設定で有効にしてください。'
  },

  common: {
    loading: '読み込み中...',
    error: 'エラー',
    success: '成功',
    cancel: 'キャンセル',
    confirm: '確認',
    delete: '削除',
    edit: '編集',
    save: '保存',
    back: '戻る',
    next: '次へ',
    previous: '前へ',
    start: '開始',
    stop: '停止',
    play: '再生',
    pause: '一時停止',
    reset: 'リセット',
    clear: 'クリア',
    all: 'すべて',
    none: 'なし',
    yes: 'はい',
    no: 'いいえ',
    ok: 'OK',
    close: '閉じる',
    search: '検索',
    filter: 'フィルター',
    sort: '並べ替え',
    refresh: '更新'
  },

  dialogs: {
    partyExitTitle: 'パーティーモードを終了しますか？',
    partyExitDesc: '現在パーティーモードが実行中です。終了すると、現在のゲーム進行は失われます。',
    stay: '残る',
    leave: '退出',
    partyLeaveTitle: 'パーティーモードを終了しますか？',
    partyLeaveDesc: 'パーティーモードを終了しようとしています。現在のゲーム進行は失われます。',
    back: '戻る',
    endParty: 'パーティーモードを終了',
    pauseTitle: 'ゲーム一時停止',
    pauseDesc: '続行しますか、または中止しますか？',
    resume: '再開',
    rematch: '🔄 再戦',
    setWinner: '🏆 勝者を自動設定',
    abort: '中止'
  },

  connectionStatus: {
    micPlayer: 'マイクプレイヤー',
    connected: '{n} に接続済み',
    disconnected: '{n} に接続されていません'
  },

  offlineBanner: {
    songsPlaylists: '{songs}曲、{playlists}プレイリストがローカルに保存されています',
    localData: 'ローカルデータが利用可能',
    offline: 'オフライン — ',
    serverUnreachable: 'サーバーに接続できません — リーダーボードとオンライン機能は利用できません'
  },

  uploadStatus: {
    uploading: 'グローバルリーダーボードにアップロード中...'
  },

  shareSection: {
    title: '📤 あなたのスコアをシェア',
    scoreCard: '📸 スコアカード',
    videoShort: '🎬 短い動画',
    textCopied: 'スコアテキストをコピーしました！',
    textCopyFailed: 'コピーに失敗しました',
    imageCopied: 'スコア画像をコピーしました！',
    imageCopyFailed: '画像のコピーに失敗しました',
    sharingNotSupported: 'シェアはサポートされていません。代わりにカードをダウンロードしました。',
    copyText: '📋 テキストをコピー',
    copyImage: '🖼️ 画像をコピー',
    downloadCard: '📥 カードをダウンロード',
    shareScore: '📤 スコアをシェア'
  },

  replayModal: {
    copyrightNotice: '注意：著作権の理由により、エクスポートされたリプレイには元の音声やボーカルを含めることはできません。マイクの録音のみが使用されます。',
    exportFailed: 'エクスポートに失敗しました。再試行してください。',
    deleteFailed: '削除に失敗しました。再試行してください。',
    close: '閉じる',
    audioOnly: '音声のみリプレイ',
    originalSong: '🎵 オリジナル楽曲',
    export: 'エクスポート…',
    exportShort: '⬇ エクスポート',
    delete: '🗑 削除',
    volume: '🎵 音量',
    replay: 'リプレイ'
  },

  scoreCardSocial: {
    branding: 'Karaoke ZERO',
    accuracyLabel: '正確さ:',
    maxComboLabel: '最大コンボ:',
    difficultyLabel: '難易度:',
    playerLabel: '🎤 {name}',
    hashtags: '#KaraokeZERO #Karaoke #Singing',
    shareTitle: '私のカラオケスコア！',
    shareText: '私は{artist}の"{title}"で{n}ポイントを獲得しました！',
    points: 'ポイント',
    download: '📥 ダウンロード',
    share: '📤 シェア'
  },

  queue: {
    title: '曲キュー',
    empty: 'キューが空です',
    emptyDesc: 'ライブラリから曲を追加してキューを作成',
    removeFromQueue: 'キューから削除',
    clearQueue: 'キューをクリア',
    upNext: '次の曲',
    nowPlaying: '再生中',
    startQueue: 'キューを開始'
  },

  queueScreen: {
    title: '曲キュー',
    songsInQueue: 'キュー内の曲 • プレイヤーあたり最大3曲',
    noSongs: 'キューに曲がありません',
    noSongsDesc: 'ライブラリまたはコンパニオンアプリから曲を追加',
    duel: '⚔️ デュエル',
    duet: '🎭 デュエット',
    single: '🎤 シングル',
    playerDeactivated: 'プレイヤーが非アクティブ化されました',
    play: '▶ プレイ',
    clearAll: 'すべてクリア',
    playNextSong: '▶ 次の曲をプレイ',
    playerReselectNeeded: '⚠ プレイヤーの再選択が必要',
    playerReselectDesc: '<strong>{song}</strong> ({mode}) のプレイヤーが非アクティブ化されました。新しいプレイヤーを選択するか、曲を削除してください。',
    assignPlayers: '✓ プレイヤーを割り当て',
    deleteSong: '✕ 曲を削除',
    later: '後で',
    notEnoughPlayers: '利用可能なアクティブなプレイヤーが不足しています（最低2人必要）。',
    deleteFromQueue: '✕ キューから曲を削除',
    rules: 'キューのルール',
    rule1: '• プレイヤーあたり最大3曲まで',
    rule2: '• 曲は追加された順に再生',
    rule3: '• 自分の曲はキューから削除可能',
    rule4: '• キューに追加する前にキャラクターを選択',
    rule5: '• コンパニオンアプリのリクエストはシアン色の枠で表示',
    rule6: '• 曲をクリックして即座に再生'
  },

  queueNextSong: {
    label: '次の曲',
    duel: '⚔️ デュエル',
    duet: '🎭 デュエット',
    playNext: '▶ 次を再生'
  },

  jukebox: {
    title: 'ジュークボックスモード',
    subtitle: 'リラックスして音楽を楽しもう！',
    songsInPlaylist: '曲がプレイリストにあります',
    searchPlaceholder: '曲、アーティスト、アルバムを検索...',
    allGenres: 'すべてのジャンル',
    allArtists: 'すべてのアーティスト',
    songsFound: '曲が見つかりました',
    startJukebox: 'ジュークボックスを開始',
    stopJukebox: 'ジュークボックスを停止',
    nowPlaying: '再生中',
    upNext: '次の曲',
    exitFullscreen: '全画面を終了',
    hidePlaylist: 'プレイリストを非表示',
    showPlaylist: 'プレイリストを表示',
    playlistSettings: 'プレイリスト設定',
    customizeExperience: '音楽体験をカスタマイズ',
    filterByGenre: 'ジャンルで絞り込み',
    filterByArtist: 'アーティストで絞り込み',
    shuffle: 'シャッフル',
    repeat: 'リピート',
    repeatNone: 'リピートなし',
    repeatAll: '全曲リピート',
    repeatOne: '1曲リピート'
  },

  jukeboxPlayer: {
    nowPlaying: '現在再生中',
    lyrics: '🎤 歌詞',
    showPlaylist: '📖 プレイリストを表示',
    hidePlaylist: '📖 プレイリストを非表示',
    exitFullscreen: '⤓ フルスクリーンを終了',
    stopJukebox: 'ジュークボックスを停止',
    upNext: '次に再生',
    jukeboxMode: '🎵 ジュークボックスモード',
    sitBack: 'リラックスして音楽をお楽しみください！',
    removeYoutubeVideo: 'YouTube動画を削除',
    youtube: 'YouTube',
    fullscreen: '⤢ フルスクリーン',
    singAlong: '歌唱モード: 歌詞を表示',
    invalidYoutubeUrl: '無効なYouTube URL',
    youtubeBackground: 'オプションのYouTube動画を背景として使用',
    activate: '設定',
    active: 'アクティブ:',
    remove: '削除',
    noMatchingSongs: 'フィルターに一致する曲がありません。別の設定を試すか、曲をインポートしてください。'
  },
};
