// ZH translations — core
// Auto-split from monolithic locale file

export const coreTranslations = {
  nav: {
    library: '曲库',
    import: '导入',
    party: '派对',
    profiles: '档案',
    queue: '播放队列',
    highscores: '高分榜',
    jukebox: '点唱机',
    mobile: '移动端',
    achievements: '成就',
    daily: '每日',
    settings: '设置'
  },

  home: {
    title: 'Karaoke ZERO',
    subtitle: '终极卡拉OK体验。实时音高检测，与朋友竞技，享受派对游戏！',
    startSinging: '开始唱歌',
    partyMode: '派对模式',
    songsAvailable: '可用歌曲',
    profilesCreated: '已创建档案',
    partyGames: '派对游戏',
    difficultyLevels: '难度等级',
    selectProfile: '选择档案',
    createNew: '新建'
  },

  homeScreen: {
    subtitle: '终极卡拉OK体验。实时音高检测，与朋友竞技，享受派对游戏！',
    loadingStats: '正在加载统计...',
    realTimePitch: '实时音高检测',
    realTimePitchDesc: '先进的YIN算法以高精度实时检测演唱音高。你的声音将被可视化！',
    partyGamesFeature: '派对游戏',
    partyGamesFeatureDesc: '传麦克风、混唱大赛、填词游戏、对决模式、盲唱——派对的无限娱乐！',
    mobileCompanion: '移动端伴侣',
    mobileCompanionDesc: '使用智能手机作为麦克风或遥控器！扫描二维码即可连接。',
    wifiStep1: '1. 相同WiFi网络',
    wifiStep2: '2. 相机扫描二维码',
    wifiStep3: '3. 在浏览器中打开链接',
    detectingNetwork: '正在检测网络地址...',
    selectCharacter: '选择角色',
    inactiveProfiles: '未激活的档案已隐藏。请在档案设置中激活。'
  },

  common: {
    loading: '加载中...',
    error: '错误',
    success: '成功',
    cancel: '取消',
    confirm: '确认',
    delete: '删除',
    edit: '编辑',
    save: '保存',
    back: '返回',
    next: '下一步',
    previous: '上一步',
    start: '开始',
    stop: '停止',
    play: '播放',
    pause: '暂停',
    reset: '重置',
    clear: '清除',
    all: '全部',
    none: '无',
    yes: '是',
    no: '否',
    ok: '确定',
    close: '关闭',
    search: '搜索',
    filter: '筛选',
    sort: '排序',
    refresh: '刷新'
  },

  dialogs: {
    partyExitTitle: 'Leave Party Mode?',
    partyExitDesc: 'A party mode is currently running. If you leave, your current game progress will be lost.',
    stay: 'Stay',
    leave: 'Leave',
    partyLeaveTitle: 'Leave Party Mode?',
    partyLeaveDesc: 'You are about to leave party mode. Your current game progress will be lost.',
    back: 'Back',
    endParty: 'End Party Mode',
    pauseTitle: 'Game Paused',
    pauseDesc: 'Do you want to continue or abort?',
    resume: 'Resume',
    rematch: '🔄 Rematch',
    setWinner: '🏆 Set winner automatically',
    abort: 'Abort'
  },

  connectionStatus: {
    micPlayer: '麦克风玩家',
    connected: '{n} 已连接',
    disconnected: '{n} 未连接'
  },

  offlineBanner: {
    songsPlaylists: '{songs} Songs, {playlists} Playlists saved locally',
    localData: 'Local data available',
    offline: 'Offline — ',
    serverUnreachable: 'Server unreachable — Leaderboard and online features unavailable'
  },

  uploadStatus: {
    uploading: 'Uploading to global leaderboard...'
  },

  shareSection: {
    title: '📤 Share Your Score',
    scoreCard: '📸 Score Card',
    videoShort: '🎬 Video Short',
    textCopied: 'Score text copied!',
    textCopyFailed: 'Failed to copy',
    imageCopied: 'Score image copied!',
    imageCopyFailed: 'Failed to copy image',
    sharingNotSupported: 'Sharing not supported. Card downloaded instead.',
    copyText: '📋 Copy Text',
    copyImage: '🖼️ Copy Image',
    downloadCard: '📥 Download Card',
    shareScore: '📤 Share Score'
  },

  replayModal: {
    copyrightNotice: 'Note: For copyright reasons, no original audio or vocals can be included in exported replays. Only your microphone recording will be used.',
    exportFailed: 'Export failed. Please try again.',
    deleteFailed: 'Delete failed. Please try again.',
    close: 'Close',
    audioOnly: 'Audio-Only Replay',
    originalSong: '🎵 Original Song',
    export: 'Export…',
    exportShort: '⬇ Export',
    delete: '🗑 Delete',
    volume: '🎵 Volume',
    replay: 'Replay'
  },

  scoreCardSocial: {
    branding: 'Karaoke ZERO',
    accuracyLabel: 'Accuracy:',
    maxComboLabel: 'Max Combo:',
    difficultyLabel: 'Difficulty:',
    playerLabel: '🎤 {name}',
    hashtags: '#KaraokeZERO #Karaoke #Singing',
    shareTitle: 'My Karaoke Score!',
    shareText: 'I scored {n} points on "{title}" by {artist}!',
    points: 'points',
    download: '📥 Download',
    share: '📤 Share'
  },

  queue: {
    title: '播放队列',
    empty: '队列为空',
    emptyDesc: '从曲库添加歌曲来创建队列',
    removeFromQueue: '从队列移除',
    clearQueue: '清空队列',
    upNext: '下一首',
    nowPlaying: '正在播放',
    startQueue: '开始队列'
  },

  queueScreen: {
    title: '播放队列',
    songsInQueue: '队列中的歌曲 • 每人最多3首',
    noSongs: '队列中没有歌曲',
    noSongsDesc: '从曲库或伴侣应用添加歌曲',
    duel: '⚔️ 对决',
    duet: '🎭 二重唱',
    single: '🎤 单人',
    playerDeactivated: '玩家已停用',
    play: '▶ 播放',
    clearAll: '清除全部',
    playNextSong: '▶ 播放下一首',
    playerReselectNeeded: '⚠ 需要重新选择玩家',
    playerReselectDesc: '<strong>{song}</strong> ({mode}) 的玩家已停用。请选择新玩家或删除歌曲。',
    assignPlayers: '✓ 分配玩家',
    deleteSong: '✕ 删除歌曲',
    later: '稍后',
    notEnoughPlayers: '可用激活玩家不足（至少需要2人）。',
    deleteFromQueue: '✕ 从队列删除歌曲',
    rules: '队列规则',
    rule1: '• 每人同时最多3首歌',
    rule2: '• 歌曲按添加顺序播放',
    rule3: '• 可以从队列移除自己的歌曲',
    rule4: '• 加入队列前先选择角色',
    rule5: '• 伴侣应用请求显示青色边框',
    rule6: '• 点击歌曲立即播放'
  },

  queueNextSong: {
    label: 'Next in Queue',
    duel: '⚔️ Duel',
    duet: '🎭 Duet',
    playNext: '▶ Play Next'
  },

  jukebox: {
    title: '点唱机模式',
    subtitle: '坐下来享受音乐！',
    songsInPlaylist: '首歌在播放列表中',
    searchPlaceholder: '搜索歌曲、歌手、专辑...',
    allGenres: '所有风格',
    allArtists: '所有歌手',
    songsFound: '首歌曲已找到',
    startJukebox: '开始点唱',
    stopJukebox: '停止点唱',
    nowPlaying: '正在播放',
    upNext: '下一首',
    exitFullscreen: '退出全屏',
    hidePlaylist: '隐藏播放列表',
    showPlaylist: '显示播放列表',
    playlistSettings: '播放列表设置',
    customizeExperience: '自定义音乐体验',
    filterByGenre: '按风格筛选',
    filterByArtist: '按歌手筛选',
    shuffle: '随机播放',
    repeat: '重复',
    repeatNone: '不重复',
    repeatAll: '全部重复',
    repeatOne: '单曲重复'
  },

  jukeboxPlayer: {
    nowPlaying: 'NOW PLAYING',
    lyrics: '🎤 Lyrics',
    showPlaylist: '📖 Show Playlist',
    hidePlaylist: '📖 Hide Playlist',
    exitFullscreen: '⤓ Exit Fullscreen',
    stopJukebox: 'Stop Jukebox',
    upNext: 'Up Next',
    jukeboxMode: '🎵 Jukebox Mode',
    sitBack: 'Sit back and enjoy the music!',
    removeYoutubeVideo: 'Remove YouTube video',
    youtube: 'YouTube',
    fullscreen: '⤢ Fullscreen',
    singAlong: 'Sing-Along Mode: Show Lyrics',
    invalidYoutubeUrl: 'Invalid YouTube URL',
    youtubeBackground: 'Optional YouTube video as background',
    activate: 'Set',
    active: 'Active:',
    remove: 'Remove',
    noMatchingSongs: 'No songs match your filters. Try different settings or import some songs.'
  },
};
