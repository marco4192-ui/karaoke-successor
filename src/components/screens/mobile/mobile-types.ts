// ===================== MOBILE CLIENT TYPES =====================

// Re-export shared types from canonical API definitions
export type { MobileProfile, GameResults } from '@/app/api/mobile/mobile-types';

export type MobileView =
  // Mirror view — auto-switch based on desktop screen
  | 'mirror'
  // Companion-own views (no desktop equivalent)
  | 'songs'
  | 'mic'
  | 'profile';

/**
 * Maps a desktop Screen name to the mobile mirror behaviour.
 * Returns the mobile view identifier (used within the mirror view)
 * or null if the mirror should show a fallback (home). */
export type MirrorScreenId =
  | 'home'
  | 'library'
  | 'queue'
  | 'game'
  | 'settings'
  | 'highscores'
  | 'achievements'
  | 'dailyChallenge'
  | 'party'
  | 'jukebox'
  | 'results'
  | 'party-setup'
  | 'song-voting'
  | 'ptm-intro'
  | 'medley-intro'
  | 'battle-intro'
  | 'br-game'       // Battle Royale active game (live scores + own singing)
  | 'medley-game'   // Medley Contest active game (live scores + own singing)
  | 'tournament-intro'
  | 'tournament-bracket'  // Tournament bracket on screen — open duels list with start buttons
  | 'competitive-intro'
  | 'rate-my-song-intro'
  | 'cptm-game'      // Companion Sing-A-Long active game (turn signals)
  | 'profile';  // character/profile management

/** Maps desktop Screen → MirrorScreenId */
export function screenToMirrorId(desktopScreen: string | undefined): MirrorScreenId {
  if (!desktopScreen) return 'home';

  // Direct 1:1 mappings
  const directMap: Record<string, MirrorScreenId> = {
    home: 'home',
    library: 'library',
    queue: 'queue',
    settings: 'settings',
    highscores: 'highscores',
    achievements: 'achievements',
    dailyChallenge: 'dailyChallenge',
    jukebox: 'jukebox',
    results: 'results',
    party: 'party',
    'party-setup': 'party-setup',
    profile: 'profile',
    import: 'library',
    mobile: 'home',
    editor: 'home',
    online: 'home',
    'song-voting': 'song-voting',
    'companion-singalong-game': 'cptm-game',
    // Battle Royale in-game: dedicated mirror with live player scores and
    // the companion's own singing visualization (Item 8.1). Without this
    // mapping the generic game mirror would show "no song" because BR
    // never sets the standard game-store song.
    'battle-royale-game': 'br-game',
    // Medley Contest in-game (R36): dedicated mirror with snippet progress,
    // turn/matchup signals (team mode), live roster scores and the
    // companion's own singing visualization — same reason as BR: the medley
    // hook never sets the standard game-store song.
    'medley-game': 'medley-game',
  };

  if (desktopScreen in directMap) return directMap[desktopScreen];

  // Generic game screens
  if (desktopScreen.endsWith('-game')) return 'game';
  if (desktopScreen === 'game') return 'game';

  // All other screens → home
  return 'home';
}

export interface MobileSong {
  id: string;
  title: string;
  artist: string;
  duration: number;
  genre?: string;
  language?: string;
  /** Release year (#YEAR: tag) — used for the era/decade filter */
  year?: number;
  coverImage?: string;
  isDuet?: boolean;
}

type QueueItemStatus = 'pending' | 'playing' | 'completed';

export interface QueueItem {
  id: string;
  songId: string;
  songTitle: string;
  songArtist: string;
  addedBy: string;
  status: QueueItemStatus;
  companionCode?: string;
  playerId?: string;
  playerName?: string;
  partnerId?: string;
  partnerName?: string;
  gameMode?: 'single' | 'duel' | 'duet';
  difficulty?: 'easy' | 'medium' | 'hard';
  playerMicSource?: 'companion' | 'microphone';
  partnerMicSource?: 'companion' | 'microphone';
  playerMicName?: string;
  partnerMicName?: string;
  duetPartsSwapped?: boolean;
  /** R39/P7: Eintrag spiegelt die lokale Desktop-Queue (syncdesktopqueue) —
   *  Play/Remove/Reorder laufen für diese Items über Desktop-Remote-Commands. */
  isDesktop?: boolean;
}

export interface JukeboxWishlistItem {
  id: string;
  songId: string;
  songTitle: string;
  songArtist: string;
  addedBy: string;
  addedAt?: number;
  companionCode?: string;
  coverImage?: string;
  duration?: number;
}

export interface CompanionScoreEntry {
  profileId: string;
  name: string;
  avatar?: string;
  color: string;
  score: number;
}

interface SingalongTurn {
  profileId: string | null;
  nextProfileId: string | null;
  countdown: number | null; // 3, 2, 1 when switching, null when actively singing
  isActive: boolean;
  // ── CPTM companion mirror context (optional — sent by the desktop) ──
  currentPlayerName?: string;
  currentPlayerColor?: string;
  // R60: Profil-ID des AKTUELL singenden Spielers. Während der Blink-Warnung
  // (3-2-1 vor dem Segmentwechsel) ist profileId null — ohne currentPlayerId
  // wusste das Handy des aktuellen Sängers nicht, dass es weiter singt
  // (Mikro/Display-Logik flackerte in jedem Blink-Fenster).
  currentPlayerId?: string | null;
  nextPlayerName?: string;
  players?: CptmMirrorPlayerInfo[];
}

/** Player roster entry for the CPTM companion game mirror. */
export interface CptmMirrorPlayerInfo {
  profileId: string;
  name: string;
  color: string;
  score: number;
  segmentsSung: number;
}

/** Player roster entry for the Medley Contest companion game mirror (R36). */
export interface MedleyMirrorPlayer {
  /** Profile id — matches the companion's own profile id */
  id: string;
  name: string;
  color: string;
  score: number;
  inputType: 'local' | 'mobile';
  eliminated: boolean;
  snippetsSung: number;
  /** Team index (0 = Team A, 1 = Team B) — team mode only */
  team: number;
}

/** Team-mode matchup: the two players singing the current/next snippet. */
export interface MedleyMirrorMatchup {
  aId: string;
  aName: string;
  aColor: string;
  bId: string;
  bName: string;
  bColor: string;
}

/** Live Medley Contest game data pushed by the desktop (R36) — analogous
 *  to BrGameData, but with snippet/matchup/phase semantics of the medley
 *  contest. Built in karaoke-app's 2s master sync from the medley hook's
 *  sync snapshot (src/lib/game/medley-sync.ts). */
export interface MedleyGameData {
  phase: 'intro' | 'playing' | 'transition' | 'round-results' | 'final-results';
  playMode: 'ffa' | 'team' | 'elimination';
  /** Current snippet (0-based) and total snippet count of this round */
  snippetIndex: number;
  snippetCount: number;
  songTitle?: string | null;
  songArtist?: string | null;
  /** Countdown seconds while phase === 'transition' */
  transitionCount?: number;
  /** Whether the snippet media is actually playing (false during pause) */
  isPlaying: boolean;
  /** Profile ids singing the CURRENT snippet — phones in this list start
   *  their mic automatically (auto-sing, like BR's player list). */
  activeProfileIds: string[];
  players?: MedleyMirrorPlayer[];
  /** Team mode: the matchup of the current snippet */
  matchup?: MedleyMirrorMatchup | null;
  /** Team mode: the matchup of the NEXT snippet (shown during transition) */
  nextMatchup?: MedleyMirrorMatchup | null;
  /** Elimination mode: profile ids in order of elimination */
  eliminationOrder?: string[];
  /** Feature #16: Mystery mode — song titles stay hidden while singing */
  mysteryMode?: boolean;
}

/** Player roster entry for the Battle Royale companion game mirror. */
export interface BrGameMirrorPlayer {
  /** Profile id — matches the companion's own profile id */
  id: string;
  name: string;
  color: string;
  score: number;
  eliminated: boolean;
  playerType: 'microphone' | 'companion';
}

/** Live Battle Royale game data pushed by the desktop (Item 8.1). */
export interface BrGameData {
  /** BR game status: 'countdown' | 'playing' | 'voting' | 'setup' | ... */
  status?: string;
  roundNumber?: number;
  songTitle?: string;
  songArtist?: string;
  /** Current medley snippet (0-based) and total snippet count */
  snippetIndex?: number;
  snippetCount?: number;
  players?: BrGameMirrorPlayer[];
  /** Present while status === 'voting': the song options + per-option votes
   *  and which players already voted — companions render vote buttons and
   *  submit their pick via the `br_vote` command (round 2+ votes included). */
  voteOptions?: Array<{
    songName: string;
    votes: number;
    votedPlayerIds: string[];
  }>;
}

/**
 * Motto-Party sync config (R25): the FULL desktop config pushed with the
 * 2s gamestate so the companion library can filter its song list with the
 * EXACT same logic as the desktop (filterSongsByMotto is generic and runs
 * on MobileSong[] too). `enabled` mirrors the master switch — null means
 * "no motto configured / disabled" (explicit key, clears stale state).
 */
export interface MottoPartySync {
  enabled: boolean;
  name: string;
  logic: 'and' | 'or';
  searchFields: Array<{ id: string; term: string }>;
  filters: { genre: string; language: string; releaseYear: string; era: string };
}

export interface GameState {
  currentSong: { title: string; artist: string } | null;
  isPlaying: boolean;
  songEnded: boolean;
  queueLength: number;
  isAdPlaying: boolean;
  gameMode: string | null;
  singalongTurn: SingalongTurn | null;
  cptmTurn: SingalongTurn | null;
  // R51/Bug11 — Standard-Spiele mit Companion-Eingabequelle: Geräte-Zuweisung
  // (P1/P2 singen via Handy) + Spielerliste (Profil-IDs), damit die
  // betroffenen Handys ihr Mikrofon automatisch starten. Beide Felder kommen
  // aus dem Store-GameState-Spread des 2s-Pushes.
  deviceAssignment?: { p1Companion?: boolean; p2Companion?: boolean } | null;
  players?: Array<{ id: string; name: string }> | null;
  // #10 Tournament match ID for spectator voting
  tournamentMatchId: string | null;
  // Live leaderboard: companion player scores during singalong
  companionScores: CompanionScoreEntry[] | null;
  // Current screen name from the desktop app
  currentScreen?: string;
  // Party setup: which game mode is being configured
  partyGameMode?: string | null;
  // Live party-setup state — pushed by the desktop whenever the setup form
  // changes so companions mirror the current selection in real time (push,
  // not poll). Avatars stripped to keep the payload small.
  partySetupState?: {
    selectedPlayers: Array<{ id: string; name: string; color?: string; hasAvatar?: boolean }>;
    /** Per-player device choice (profileId → 'mic' | 'companion') */
    deviceAssignments?: Record<string, 'mic' | 'companion'>;
    /** micId → profileId (exclusive modes / single-mic flexible) */
    micAssignments?: Record<string, string>;
    /** Desktop microphones (id + display name) for the device dropdowns */
    mics?: Array<{ id: string; name: string }>;
    /** Shared mic (PTM): selected mic id + name */
    selectedMicId?: string | null;
    /** Profile ids with a connected companion device (live) */
    connectedProfileIds?: string[];
    difficulty?: 'easy' | 'medium' | 'hard';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic mode settings
    settings?: Record<string, any>;
    songSelection?: string;
    selectedSong?: { id: string; title: string; artist: string } | null;
    filterGenre?: string;
    filterLanguage?: string;
    filterReleaseYear?: string;
    /** Era/decade filter (decade start year, e.g. '1980') */
    filterEra?: string;
    filterCombined?: boolean;
    /** Free-text filter (artist/title, fuzzy-matched — e.g. "ABBA") */
    filterSearch?: string;
    /** Motto-Party (R24): when enabled, the mirror hides its filter UI and
     *  shows a "Motto-Party: <name>" banner instead (like the desktop). */
    mottoParty?: { enabled: boolean; name: string };
    availableGenres?: string[];
    availableLanguages?: string[];
    availableYears?: number[];
    /** Decade options (start years as strings, ascending) */
    availableDecades?: string[];
    /** Shared mic (PTM): display name of the selected mic */
    selectedMicName?: string | null;
  } | null;
  // Party voting: songs available for voting
  votingSongs?: Array<{ id: string; title: string; artist: string; duration: number; coverImage?: string }>;
  // Party setup: library-selected song awaiting confirmation on companion
  partyLibrarySong?: { id: string; title: string; artist: string } | null;
  // Whether party mode is active on the desktop (for showing Leave Party button)
  isPartyModeActive?: boolean;
  // R39/P4: Verfügbare Desktop-Mikrofone (aus MULTI_MIC_CONFIG, 2s-Push) —
  // für die Gesangs-Gerät-Auswahl im Song-Overlay der Bibliothek.
  availableMics?: Array<{ id: string; name: string }>;
  // Desktop leave/pause dialog state (synced 1:1 with desktop)
  desktopDialog?: 'party-leave' | 'song-pause' | 'song-end-early' | null;
  // Who initiated the pause (for overlay display)
  pauseInitiator?: string | null;
  // PTM/CPTM game phase: 'intro' when showing the ready screen, 'playing' when singing
  ptmPhase?: 'intro' | 'countdown' | 'playing' | 'transitioning' | 'song-results' | 'series-results' | null;
  // PTM intro data for companion mirror of the ready screen
  ptmIntroData?: {
    songTitle?: string;
    songArtist?: string;
    startPlayerName?: string;
    startPlayerAvatar?: string;
    startPlayerColor?: string;
    playerCount?: number;
    isMedley?: boolean;
    medleySnippetCount?: number;
    roundNumber?: number;
    totalRounds?: number;
    sharedMicName?: string;
    mediaLoaded?: boolean;
    partyGameMode?: string;
    // Tournament duel: the opponent of the start player (player 2)
    vsPlayerName?: string;
    vsPlayerAvatar?: string;
    vsPlayerColor?: string;
    // Battle Royale: full player badge list for the mirror (name/avatar/color)
    brPlayers?: { name: string; avatar?: string; color?: string }[];
  } | null;
  // Battle Royale live in-game data (scores + current snippet song)
  brGameData?: BrGameData | null;
  // Medley Contest live in-game data (R36): snippet progress, turn/matchup
  // signals, live roster scores + the active singers for auto-sing.
  medleyGameData?: MedleyGameData | null;
  // Tournament bracket mirror: while the bracket is shown on the desktop (no
  // duel pending), companions get the list of OPEN duels incl. start buttons.
  // Avatars are stripped to keep the payload small — colors + initials only.
  tournamentBracketData?: {
    visible: boolean;
    currentRound: number;
    totalRounds: number;
    remainingPlayers: number;
    tournamentType: 'single' | 'double';
    status: 'in_progress' | 'completed';
    championName: string | null;
    /** True while the desktop shows the 3-song voting overlay for a duel */
    votingActive: boolean;
    openMatches: Array<{
      matchId: string;
      round: number;
      position: number;
      bracketType: 'winners' | 'losers' | 'grand_finals';
      player1: { id: string; name: string; color: string } | null;
      player2: { id: string; name: string; color: string } | null;
    }>;
  } | null;
  // Viral-hit song IDs synced from desktop (for library filter)
  viralSongIds?: string[];
  // Motto-Party (R25): full config synced from desktop — when enabled, the
  // companion library hides its search/filters and shows only the
  // motto-matching songs (same logic as the desktop library).
  mottoParty?: MottoPartySync | null;
  // Global difficulty setting from desktop (for companion library)
  difficulty?: 'easy' | 'medium' | 'hard';
  // R51/Bug13 — CPTM Starting-Screen: Profil-IDs der Spieler, die ihren
  // Start bereits bestätigt haben (für die Warte-Anzeige auf den Handys).
  cptmStartConfirmed?: string[];
  // Recent party sessions synced from the desktop party screen (mirror view).
  // Compact form: avatars stripped to keep the 2s-poll payload small.
  recentParties?: Array<{
    id: string;
    mode: string;
    finishedAt: number;
    rounds?: number;
    songTitle?: string;
    winner?: { name: string; color?: string; score: number; scoreKind?: 'points' | 'rating' } | null;
    players: Array<{ name: string; color?: string; score: number; isWinner?: boolean; scoreKind?: 'points' | 'rating' }>;
  }>;
}

export interface PitchData {
  frequency: number | null;
  note: number | null;
  volume: number;
}

export type GameMode = 'single' | 'duel' | 'duet';

// ===================== R33: Companion-Datenmodelle =====================

/** R33/P5/P6/P16: Desktop-Settings-Snapshot — vom Desktop per Push-on-Change
 *  (POST type:'settingssnapshot') und Socket.IO 'settings-snapshot' gepusht
 *  sowie von jedem Companion bei (Neu-)Anmeldung via GET action=
 *  settingssnapshot GEZOGEN (kein 2s-Polling mehr). */
export interface DesktopSettingsSnapshot {
  values: Record<string, string>;
  webcam: Record<string, unknown> | null;
  defaultDifficulty?: 'easy' | 'medium' | 'hard';
  updatedAt?: number;
}

/** R33/P10: Eintrag der Top-100-Local-Highscores (Desktop-Push, nur lesend). */
export interface MobileHighscoreEntry {
  playerId: string;
  playerName: string;
  playerColor?: string;
  songTitle: string;
  artist?: string;
  score: number;
  accuracy?: number;
  maxCombo?: number;
  difficulty?: string;
  gameMode?: string;
  date?: string;
}

/** R33/P12: Daily-Challenge-Slot (Client-Kopie des Desktop-Snapshots). */
export interface DailySlotEntry {
  slot: number;
  type: string;
  icon: string;
  target: number;
  xp: number;
  completed: boolean;
  difficultiesMet: string[];
}

/** R33/P12: Daily-Challenge-Snapshot je Profil (Slots/Wochenziel/Streak/Badges). */
export interface DailyProfileState {
  date: string;
  slots: DailySlotEntry[];
  weekly: { weekKey: string; slots: DailySlotEntry[] };
  streak: number;
  totalCompleted: number;
  badges: Array<{ id: string; icon: string; nameKey: string; unlockedAt: number }>;
}

/** R33/P8: Jukebox-Spiegelzustand (Filter/Pool/Shuffle/Repeat), vom Desktop
 *  per POST type:'jukeboxstate' gepusht, Companion zieht ihn bei Bedarf.
 *  repeat ist der echte Desktop-Wert: 'none' | 'one' | 'all'. */
export interface JukeboxMirrorState {
  filters?: Record<string, unknown>;
  poolPlaylistId?: string | null;
  poolPlaylistName?: string | null;
  shuffle?: boolean;
  repeat?: 'none' | 'one' | 'all';
  updatedAt?: number;
}

export const PROFILE_COLORS = [
  '#06B6D4', '#8B5CF6', '#EC4899', '#F59E0B',
  '#10B981', '#EF4444', '#3B82F6', '#F97316',
] as const;
