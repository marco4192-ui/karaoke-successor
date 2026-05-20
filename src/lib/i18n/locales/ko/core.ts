// KO translations — core
// Auto-split from monolithic locale file

export const coreTranslations = {
  nav: {
    library: '라이브러리',
    import: '가져오기',
    party: '파티',
    profiles: '프로필',
    queue: '대기열',
    highscores: '최고 점수',
    jukebox: '주크박스',
    mobile: '모바일',
    achievements: '업적',
    daily: '일일',
    settings: '설정'
  },

  home: {
    title: 'Karaoke ZERO',
    subtitle: '최고의 노래방 경험. 실시간 음정 감지로 노래하고 친구들과 경쟁하며 파티 게임을 즐기세요!',
    startSinging: '노래 시작',
    partyMode: '파티 모드',
    songsAvailable: '사용 가능한 노래',
    profilesCreated: '생성된 프로필',
    partyGames: '파티 게임',
    difficultyLevels: '난이도 레벨',
    selectProfile: '프로필 선택',
    createNew: '새로 만들기'
  },

  homeScreen: {
    subtitle: '최고의 노래방 경험. 실시간 음정 감지로 노래하고, 친구들과 경쟁하며, 파티 게임을 즐기세요!',
    loadingStats: '통계를 불러오는 중...',
    realTimePitch: '실시간 음정 감지',
    realTimePitchDesc: '고급 YIN 알고리즘이 노래하는 음정을 높은 정확도로 실시간 감지합니다. 노래하는 동안 목소리가 시각화됩니다!',
    partyGamesFeature: '파티 게임',
    partyGamesFeatureDesc: '마이크 넘기기, 메들리 대회, 빈칸 채우기, 듀얼 모드, 블라인드 노래방 — 파티를 위한 무한 엔터테인먼트!',
    mobileCompanion: '모바일 컴패니언',
    mobileCompanionDesc: '스마트폰을 마이크나 리모컨으로 사용하세요! QR 코드를 스캔하여 연결하세요.',
    wifiStep1: '1. 같은 WiFi 네트워크',
    wifiStep2: '2. 카메라로 QR 스캔',
    wifiStep3: '3. 브라우저에서 링크 열기',
    detectingNetwork: '네트워크 주소 감지 중...',
    selectCharacter: '캐릭터 선택',
    inactiveProfiles: '비활성 프로필이 숨겨졌습니다. 프로필 설정에서 활성화하세요.'
  },

  common: {
    loading: '로딩 중...',
    error: '오류',
    success: '성공',
    cancel: '취소',
    confirm: '확인',
    delete: '삭제',
    edit: '편집',
    save: '저장',
    back: '뒤로',
    next: '다음',
    previous: '이전',
    start: '시작',
    stop: '중지',
    play: '재생',
    pause: '일시정지',
    reset: '초기화',
    clear: '지우기',
    all: '모두',
    none: '없음',
    yes: '예',
    no: '아니오',
    ok: '확인',
    close: '닫기',
    search: '검색',
    filter: '필터',
    sort: '정렬',
    refresh: '새로고침'
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
    micPlayer: '마이크 플레이어',
    connected: '{n} 연결됨',
    disconnected: '{n} 연결되지 않음'
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
    title: '곡 대기열',
    empty: '대기열이 비어 있습니다',
    emptyDesc: '라이브러리에서 곡을 추가하여 대기열을 만드세요',
    removeFromQueue: '대기열에서 제거',
    clearQueue: '대기열 비우기',
    upNext: '다음 곡',
    nowPlaying: '재생 중',
    startQueue: '대기열 시작'
  },

  queueScreen: {
    title: '곡 대기열',
    songsInQueue: '대기열의 곡 • 플레이어당 최대 3곡',
    noSongs: '대기열에 곡이 없습니다',
    noSongsDesc: '라이브러리 또는 컴패니언 앱에서 곡을 추가하세요',
    duel: '⚔️ 듀얼',
    duet: '🎭 듀엣',
    single: '🎤 솔로',
    playerDeactivated: '플레이어 비활성화됨',
    play: '▶ 재생',
    clearAll: '전체 삭제',
    playNextSong: '▶ 다음 곡 재생',
    playerReselectNeeded: '⚠ 플레이어 재선택 필요',
    playerReselectDesc: '<strong>{song}</strong> ({mode})의 플레이어가 비활성화되었습니다. 새 플레이어를 선택하거나 곡을 삭제하세요.',
    assignPlayers: '✓ 플레이어 할당',
    deleteSong: '✕ 곡 삭제',
    later: '나중에',
    notEnoughPlayers: '활성 플레이어가 부족합니다 (최소 2명 필요).',
    deleteFromQueue: '✕ 대기열에서 곡 삭제',
    rules: '대기열 규칙',
    rule1: '• 플레이어당 최대 3곡까지',
    rule2: '• 곡은 추가된 순서대로 재생됩니다',
    rule3: '• 대기열에서 자신의 곡을 제거할 수 있습니다',
    rule4: '• 대기열에 추가하기 전에 캐릭터를 선택하세요',
    rule5: '• 컴패니언 앱 요청은 시안색 테두리로 표시됩니다',
    rule6: '• 곡을 클릭하여 즉시 재생'
  },

  queueNextSong: {
    label: 'Next in Queue',
    duel: '⚔️ Duel',
    duet: '🎭 Duet',
    playNext: '▶ Play Next'
  },

  jukebox: {
    title: '주크박스 모드',
    subtitle: '편안하게 음악을 즐기세요!',
    songsInPlaylist: '곡이 플레이리스트에 있습니다',
    searchPlaceholder: '곡, 아티스트, 앨범 검색...',
    allGenres: '모든 장르',
    allArtists: '모든 아티스트',
    songsFound: '곡을 찾았습니다',
    startJukebox: '주크박스 시작',
    stopJukebox: '주크박스 정지',
    nowPlaying: '재생 중',
    upNext: '다음 곡',
    exitFullscreen: '전체 화면 종료',
    hidePlaylist: '플레이리스트 숨기기',
    showPlaylist: '플레이리스트 보기',
    playlistSettings: '플레이리스트 설정',
    customizeExperience: '음악 경험 사용자 지정',
    filterByGenre: '장르로 필터링',
    filterByArtist: '아티스트로 필터링',
    shuffle: '셔플',
    repeat: '반복',
    repeatNone: '반복 없음',
    repeatAll: '전체 반복',
    repeatOne: '한 곡 반복'
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
