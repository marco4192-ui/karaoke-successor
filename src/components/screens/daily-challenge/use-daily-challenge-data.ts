'use client';

// Daily Challenge Screen — data hook
//
// All state, derived data and handlers of the DailyChallengeScreen, extracted
// verbatim from the former monolithic component (same hook order, same
// semantics). The screen (./daily-challenge-screen.tsx) consumes this hook and
// delegates rendering to the tab components in this folder.

import { useState, useEffect, useCallback, useMemo, useRef, type RefObject } from 'react';
import { useToast } from '@/hooks/use-toast';
import { StorageKeys, setJson, setItem, getItem } from '@/lib/storage';
import { useGameStore } from '@/lib/game/store';
import { useTranslation } from '@/lib/i18n/translations';
import { getAllSongs } from '@/lib/game/song-library';
import {
  getDailySlots,
  getPlayerDailySlotProgress,
  getDailyChallengeForSlot,
  getXPLevel,
  getTimeUntilReset,
  isChallengeCompletedToday,
  getCompletedDifficultiesToday,
  getActiveDailySlot,
  getPlayerDailyStats,
  XP_REWARDS,
  DAILY_SLOT_XP_BONUS,
  getDailyType,
  getDailyDifficultyMultiplier,
  DAILY_DIFFICULTIES,
  getDailyBadgeTierToday,
  getWeeklySlots,
  getWeeklyChallengeForSlot,
  getPlayerWeeklySlotProgress,
  isWeeklyChallengeCompletedToday,
  getWeeklyBadgeTierThisWeek,
  getTimeUntilWeeklyReset,
  getBestResultMetric,
  interpolateChallengeText,
  type DailyDifficulty,
} from '@/lib/game/daily-challenge';
import { matchesDailyCategory } from '@/lib/game/challenge-pools';
import { CHALLENGE_MODES } from '@/lib/game/player-progression';
import { Song, GameMode } from '@/types/game';
import { shuffleArray } from '@/lib/utils';
import type { OnlineDailyEntry } from '@/lib/leaderboard/types';
import { songToContext } from './helpers';

/** Everything the DailyChallengeScreen and its tab components need. */
export function useDailyChallengeData(onPlayChallenge: (_song: Song, _options?: { gameMode?: GameMode; playerIds?: string[] }) => void) {
  const { t, language } = useTranslation();
  const { toast } = useToast();
  const { profiles, setActiveProfile, addPlayer, setPlayers } = useGameStore();
  const [activeTab, setActiveTab] = useState<'challenge' | 'weekly' | 'modes' | 'leaderboard' | 'badges'>('challenge');

  // ── Slot activation UX: clicking a slot card selects it, scrolls the play
  //    area into view and briefly highlights it so the action is visible. ──
  const playAreaRef = useRef<HTMLDivElement>(null);
  const [playAreaHighlighted, setPlayAreaHighlighted] = useState(false);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Which daily slot is targeted for play (defaults to the active slot)
  const [selectedSlot, setSelectedSlot] = useState<number>(0);

  // Weekly tab: same scroll+highlight mechanics for the weekly play area
  const weeklyPlayAreaRef = useRef<HTMLDivElement>(null);
  const [weeklyHighlighted, setWeeklyHighlighted] = useState(false);
  const weeklyHighlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Anchor points (guided flow): after a selection the user gets "pulled"
  //    (smooth-scrolled) to the next step of the flow. ──
  // Step 1 → step 2: picking the FIRST player unfolds the tab bar + challenge
  // selection — pull the user down to the tabs (see togglePlayer).
  const tabsRef = useRef<HTMLDivElement>(null);
  const [tabsHighlighted, setTabsHighlighted] = useState(false);
  const tabsHighlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Modes tab, step 2 → step 3: picking a challenge mode unfolds the song
  // selection — pull the user down to it (see the mode card onClick).
  const modeSongsRef = useRef<HTMLDivElement>(null);
  const [modeSongsHighlighted, setModeSongsHighlighted] = useState(false);
  const modeSongsHighlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Anchor-point helper: smooth-scroll a target into view and pulse its
   *  highlight ring for ~2 s — same mechanics as the slot activation. */
  const scrollToRef = useCallback((
    ref: RefObject<HTMLDivElement | null>,
    setHighlighted: (highlighted: boolean) => void,
    timerRef: RefObject<ReturnType<typeof setTimeout> | null>,
  ) => {
    requestAnimationFrame(() => {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setHighlighted(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setHighlighted(false), 2000);
    });
  }, []);

  /** Select a daily slot and guide the user to the play area (players + songs). */
  const activateSlot = useCallback((slot: number, unlocked: boolean, completed: boolean) => {
    if (!unlocked) {
      toast({
        title: `🔒 ${t('dailyChallengeScreen.slotLocked')}`,
        description: t('dailyChallengeScreen.slotLockedHint').replace('{n}', String(slot)),
      });
      return;
    }
    if (completed) {
      toast({
        title: `✅ ${t('dailyChallengeScreen.slotDone')}`,
        description: t('dailyChallengeScreen.slotDoneHint'),
      });
      return;
    }
    setSelectedSlot(slot);
    // Scroll the play area into view + brief highlight pulse so the click has a clear effect
    scrollToRef(playAreaRef, setPlayAreaHighlighted, highlightTimerRef);
  }, [scrollToRef, t]);

  // Clean up the highlight timers on unmount
  useEffect(() => () => {
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    if (weeklyHighlightTimerRef.current) clearTimeout(weeklyHighlightTimerRef.current);
    if (tabsHighlightTimerRef.current) clearTimeout(tabsHighlightTimerRef.current);
    if (modeSongsHighlightTimerRef.current) clearTimeout(modeSongsHighlightTimerRef.current);
  }, []);

  // ── STEP 1: player selection (1–2 players) — deliberately starts EMPTY so
  //    the guided flow (player → challenge → song) always begins at the top.
  //    The FIRST selected player owns the statistics section at the bottom.
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  // Evaluation mode when two players are selected: duel (individual) or team (average)
  const [evaluationMode, setEvaluationMode] = useState<'duel' | 'coop'>('duel');

  // Weekly tab: the slot picked for playing (unfolds the song selection)
  const [selectedWeeklySlot, setSelectedWeeklySlot] = useState<number | null>(null);
  // Weekly song choices regeneration key (shuffle button)
  const [weeklySongRefreshKey, setWeeklySongRefreshKey] = useState(0);

  // Selected daily difficulty — independent of the global game difficulty.
  const [selectedDifficulty, setSelectedDifficulty] = useState<DailyDifficulty>(() => {
    const stored = getItem('karaoke_daily_difficulty');
    return DAILY_DIFFICULTIES.some(d => d.id === stored) ? (stored as DailyDifficulty) : 'normal';
  });
  const changeDifficulty = (difficulty: DailyDifficulty) => {
    setSelectedDifficulty(difficulty);
    setItem('karaoke_daily_difficulty', difficulty);
  };

  // Selected weekly difficulty — separate selector, also independent of the global difficulty.
  const [weeklyDifficulty, setWeeklyDifficulty] = useState<DailyDifficulty>(() => {
    const stored = getItem('karaoke_weekly_difficulty');
    return DAILY_DIFFICULTIES.some(d => d.id === stored) ? (stored as DailyDifficulty) : 'normal';
  });
  const changeWeeklyDifficulty = (difficulty: DailyDifficulty) => {
    setWeeklyDifficulty(difficulty);
    setItem('karaoke_weekly_difficulty', difficulty);
  };

  // Song choice regeneration key (shuffle button)
  const [songRefreshKey, setSongRefreshKey] = useState(0);

  // Challenge Mixer state
  const [mixerSelected, setMixerSelected] = useState<string[]>([]);

  // Selected challenge mode (for song selection after picking a mode)
  const [selectedMode, setSelectedMode] = useState<typeof CHALLENGE_MODES[0] | null>(null);

  // Song choices for selected challenge mode
  const [modeSongChoices, setModeSongChoices] = useState<Song[]>([]);

  // Challenge modes difficulty filter
  const [modeFilter, setModeFilter] = useState<'all' | 'easy' | 'medium' | 'hard' | 'extreme'>('all');

  // Online daily leaderboard state
  const [boardSource, setBoardSource] = useState<'local' | 'online'>('local');
  const [onlineEntries, setOnlineEntries] = useState<OnlineDailyEntry[] | null>(null);
  const [onlineLoading, setOnlineLoading] = useState(false);
  const [onlineError, setOnlineError] = useState<string | null>(null);

  const activeProfiles = useMemo(() => profiles.filter(p => p.isActive !== false), [profiles]);

  // The FIRST selected player owns the bottom progress/statistics section —
  // no separate statistics player switcher (single source of truth).
  const viewProfile = profiles.find(p => p.id === selectedPlayerIds[0]);
  const viewProfileXP = viewProfile?.xp || 0;
  const viewProfileLevel = viewProfile?.level || 1;
  const levelInfo = getXPLevel(viewProfileXP);
  const hasPlayer = selectedPlayerIds.length > 0;

  // ── Daily slot data ──
  const dailySlots = useMemo(() => getDailySlots(), []);
  const challengePlayerId = selectedPlayerIds[0];
  const slotProgress = challengePlayerId ? getPlayerDailySlotProgress(challengePlayerId) : { date: '', completedSlots: [], metBySlot: {} };
  const activeSlot = challengePlayerId ? getActiveDailySlot(challengePlayerId) : 0;
  // The selected play slot defaults to the active (first open) slot
  const playSlot = slotProgress.completedSlots.includes(selectedSlot) ? (activeSlot ?? selectedSlot) : selectedSlot;
  const completedToday = challengePlayerId ? isChallengeCompletedToday(challengePlayerId, selectedDifficulty) : false;
  const metDifficulties = challengePlayerId ? getCompletedDifficultiesToday(challengePlayerId) : [];
  const allDifficultiesDone = metDifficulties.length >= DAILY_DIFFICULTIES.length;
  const dailyBadgeTier = challengePlayerId ? getDailyBadgeTierToday(challengePlayerId) : 'none';

  // ── Weekly slot data ──
  const weeklySlots = useMemo(() => getWeeklySlots(), []);
  const weeklyProgress = challengePlayerId ? getPlayerWeeklySlotProgress(challengePlayerId) : { weekKey: '', completedSlots: [], metBySlot: {} };
  const weeklyBadgeTier = challengePlayerId ? getWeeklyBadgeTierThisWeek(challengePlayerId) : 'none';
  const weeklyCompletedToday = viewProfile ? isWeeklyChallengeCompletedToday(viewProfile.id) : false;
  const weeklyReset = getTimeUntilWeeklyReset();

  // Per-player stats of the view player
  const playerStats = getPlayerDailyStats(viewProfile?.id);

  // The challenge of the currently played slot — regenerated on every render so
  // difficulty/player changes update the target instantly.
  const scalingProfile = viewProfile;
  const challenge = getDailyChallengeForSlot(playSlot, scalingProfile?.level || 1, selectedDifficulty);
  const typeDef = getDailyType(challenge.type);
  const challengeXP = Math.round((playSlot === 0 ? XP_REWARDS.CHALLENGE_COMPLETE : DAILY_SLOT_XP_BONUS[Math.min(playSlot - 1, DAILY_SLOT_XP_BONUS.length - 1)]) * getDailyDifficultyMultiplier(selectedDifficulty));
  const timeLeft = getTimeUntilReset();

  // Keep the selected slot valid (follows the active slot until the user picks another)
  useEffect(() => {
    if (activeSlot !== null && slotProgress.completedSlots.includes(selectedSlot)) {
      setSelectedSlot(activeSlot);
    }
  }, [activeSlot, selectedSlot, slotProgress.completedSlots]);

  // Song choices for the played slot — category slots get MATCHING songs
  const songChoices = useMemo(() => {
    const songs = getAllSongs();
    const slotType = dailySlots[playSlot]?.type ?? 'score';
    const def = getDailyType(slotType);
    if (def.category && songs.length > 0) {
      const matching = songs.filter(s => matchesDailyCategory(def.category!, songToContext(s), language));
      if (matching.length >= 3) return shuffleArray(matching).slice(0, 3);
      if (matching.length > 0) return matching;
      // No matching song in the library — offer random songs (challenge can't complete, but show hint)
      return shuffleArray(songs).slice(0, 3);
    }
    return shuffleArray(songs).slice(0, 3);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- regenerate on slot/difficulty/refresh change
  }, [playSlot, songRefreshKey, language, dailySlots]);

  // Whether the current slot's category has no matching song in the library
  const slotCategoryEmpty = useMemo(() => {
    const songs = getAllSongs();
    const slotType = dailySlots[playSlot]?.type ?? 'score';
    const def = getDailyType(slotType);
    if (!def.category) return false;
    return !songs.some(s => matchesDailyCategory(def.category!, songToContext(s), language));
  }, [playSlot, language, dailySlots]);

  // Weekly tab: song choices for the selected weekly slot — category-based
  // weekly types (genre/decade/language sums) get MATCHING songs.
  const weeklySongChoices = useMemo(() => {
    if (selectedWeeklySlot === null) return [] as Song[];
    const slotInfo = getWeeklyChallengeForSlot(selectedWeeklySlot, viewProfileLevel, weeklyDifficulty);
    const songs = getAllSongs();
    if (songs.length === 0) return [];
    const cat = slotInfo.def.category;
    if (cat) {
      const matching = songs.filter(s => matchesDailyCategory(cat, songToContext(s), language));
      if (matching.length >= 3) return shuffleArray(matching).slice(0, 3);
      if (matching.length > 0) return matching;
      return shuffleArray(songs).slice(0, 3);
    }
    return shuffleArray(songs).slice(0, 3);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- regenerate on slot/difficulty/refresh change
  }, [selectedWeeklySlot, weeklySongRefreshKey, language, weeklyDifficulty, viewProfileLevel]);

  // Load online daily leaderboard when the online tab is opened
  const loadOnlineBoard = useCallback(async () => {
    setOnlineLoading(true);
    setOnlineError(null);
    try {
      const { leaderboardService } = await import('@/lib/api/leaderboard-service');
      const entries = await leaderboardService.fetchDailyLeaderboard();
      setOnlineEntries(entries);
    } catch (err) {
      setOnlineEntries(null);
      setOnlineError(err instanceof Error ? err.message : 'Server nicht erreichbar');
    } finally {
      setOnlineLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'leaderboard' && boardSource === 'online') {
      loadOnlineBoard();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- loadOnlineBoard is stable (useCallback with no deps)
  }, [activeTab, boardSource]);

  // Live-updating challenge description for the played slot
  const challengeDescription = interpolateChallengeText(
    t(typeDef.descriptionKey), typeDef.descriptionParams, challenge.target, typeDef.metricKey,
  );

  // Sort leaderboard by slots completed today, then by slot-0 metric (direction-aware).
  const sortMetric = (entry: typeof challenge.entries[0]): number =>
    getBestResultMetric({
      playerId: entry.playerId,
      score: entry.score,
      accuracy: entry.accuracy,
      combo: entry.combo,
      perfectNotes: entry.perfectNotesCount,
      goldenNotes: entry.goldenNotesCount,
      notesHit: entry.notesHit,
      notesMissed: entry.notesMissed,
      tickAccuracy: entry.tickAccuracy,
      completedAt: entry.completedAt,
      targetMet: false,
    }, challenge.type);
  const sortedLeaderboard = [...challenge.entries].sort((a, b) => {
    const slotDiff = (b.slotsCompletedToday ?? 0) - (a.slotsCompletedToday ?? 0);
    if (slotDiff !== 0) return slotDiff;
    const metricA = sortMetric(a);
    const metricB = sortMetric(b);
    const diff = typeDef.direction === 'min' ? metricA - metricB : metricB - metricA;
    if (diff !== 0) return diff;
    return a.playerId.localeCompare(b.playerId);
  });

  // Toggle player selection (max 2). Anchor point: picking the FIRST player
  // unfolds the challenge area below — smoothly pull the user down to the tab
  // bar (step 2). Only on the "none → first player" transition; adding or
  // replacing a second player and deselecting never scroll.
  const togglePlayer = (profileId: string) => {
    const isFirstPlayerPick = selectedPlayerIds.length === 0;
    setSelectedPlayerIds(prev =>
      prev.includes(profileId)
        ? prev.filter(id => id !== profileId)
        : prev.length < 2
          ? [...prev, profileId]
          : [prev[1], profileId], // replace the second slot when full
    );
    if (isFirstPlayerPick) {
      scrollToRef(tabsRef, setTabsHighlighted, tabsHighlightTimerRef);
    }
  };

  // Handler: play a specific song for the daily challenge with the selected players
  const handlePlaySong = useCallback((song: Song) => {
    if (selectedPlayerIds.length === 0) return;

    // First selected player becomes the active profile (P1)
    setActiveProfile(selectedPlayerIds[0]);

    // Set up the game players: 1 = solo, 2 = duel (both sing the same song)
    const players = selectedPlayerIds
      .map(id => profiles.find(p => p.id === id))
      .filter((p): p is NonNullable<typeof p> => !!p && p.isActive !== false);
    setPlayers([]);
    players.forEach(p => addPlayer(p));

    setJson(StorageKeys.DAILY_CHALLENGE_ACTIVE, {
      active: true,
      startedAt: Date.now(),
      gameMode: selectedPlayerIds.length >= 2 ? evaluationMode : 'single',
      playerIds: selectedPlayerIds,
      difficulty: selectedDifficulty,
      slot: playSlot,
    });

    const gameMode: GameMode = selectedPlayerIds.length >= 2 ? 'duel' : 'standard';
    onPlayChallenge(song, { gameMode, playerIds: selectedPlayerIds });
  }, [selectedPlayerIds, selectedDifficulty, playSlot, evaluationMode, profiles, setActiveProfile, setPlayers, addPlayer, onPlayChallenge]);

  /** Shared bootstrap: make the FIRST selected player the active profile
   *  (and optionally a second player for duel-style games). */
  const setupGamePlayers = useCallback((secondPlayer: boolean) => {
    if (selectedPlayerIds.length === 0) return false;
    setActiveProfile(selectedPlayerIds[0]);
    const ids = secondPlayer ? selectedPlayerIds : selectedPlayerIds.slice(0, 1);
    const players = ids
      .map(id => profiles.find(p => p.id === id))
      .filter((p): p is NonNullable<typeof p> => !!p && p.isActive !== false);
    setPlayers([]);
    players.forEach(p => addPlayer(p));
    return true;
  }, [selectedPlayerIds, profiles, setActiveProfile, setPlayers, addPlayer]);

  // Handler (weekly tab): play a song toward the weekly challenges. Weekly
  // slots count EVERY sung song automatically — no daily flag is needed, the
  // post-game processor submits each result to the weekly engine.
  const handlePlayWeeklySong = useCallback((song: Song) => {
    if (!setupGamePlayers(true)) return;
    const gameMode: GameMode = selectedPlayerIds.length >= 2 ? 'duel' : 'standard';
    onPlayChallenge(song, { gameMode, playerIds: selectedPlayerIds });
  }, [setupGamePlayers, selectedPlayerIds, onPlayChallenge]);

  // Handler (weekly tab): pick a weekly slot — unfolds the song selection
  const activateWeeklySlot = useCallback((slot: number, unlocked: boolean, completed: boolean) => {
    if (!unlocked) {
      toast({
        title: `🔒 ${t('dailyChallengeScreen.slotLocked')}`,
        description: t('dailyChallengeScreen.slotLockedHint').replace('{n}', String(slot)),
      });
      return;
    }
    if (completed) {
      toast({
        title: `✅ ${t('dailyChallengeScreen.slotDone')}`,
        description: t('dailyChallengeScreen.weeklySlotDoneHint'),
      });
      return;
    }
    setSelectedWeeklySlot(slot);
    setWeeklySongRefreshKey(k => k + 1); // fresh song choices for the new slot
    scrollToRef(weeklyPlayAreaRef, setWeeklyHighlighted, weeklyHighlightTimerRef);
  }, [scrollToRef, t]);

  // Handler: play a specific song with a selected challenge mode. Challenge
  // modes are played SOLO by the first selected player (no gameMode override —
  // the mapped challenge mode wins).
  const handlePlayModeSong = useCallback((song: Song) => {
    if (selectedMode) {
      setItem(StorageKeys.CHALLENGE_MODE, selectedMode.id);
    }
    setupGamePlayers(false);
    onPlayChallenge(song);
  }, [selectedMode, setupGamePlayers, onPlayChallenge]);

  // Handler (modes tab): select (or deselect) a challenge mode and generate
  // song choices (category modes get matching songs). Anchor point: the song
  // selection (step 3) unfolds below — pull the user down to it.
  const selectMode = (mode: typeof CHALLENGE_MODES[0]) => {
    if (selectedMode?.id === mode.id) {
      // Deselect
      setSelectedMode(null);
      setModeSongChoices([]);
    } else {
      // Select mode and generate song choices (category modes get matching songs)
      setSelectedMode(mode);
      const songs = getAllSongs();
      if (mode.category) {
        const matching = songs.filter(s => matchesDailyCategory(mode.category as { field: never; value?: string | number }, songToContext(s), language));
        setModeSongChoices((matching.length >= 3 ? shuffleArray(matching).slice(0, 3) : matching.length > 0 ? matching : shuffleArray(songs).slice(0, 3)));
      } else {
        setModeSongChoices(shuffleArray(songs).slice(0, 3));
      }
      scrollToRef(modeSongsRef, setModeSongsHighlighted, modeSongsHighlightTimerRef);
    }
  };

  return {
    // Tabs & anchors
    activeTab,
    setActiveTab,
    tabsRef,
    tabsHighlighted,
    // Daily slot data
    dailySlots,
    challengePlayerId,
    slotProgress,
    playSlot,
    completedToday,
    metDifficulties,
    allDifficultiesDone,
    dailyBadgeTier,
    scalingProfile,
    challenge,
    typeDef,
    challengeDescription,
    challengeXP,
    timeLeft,
    songChoices,
    slotCategoryEmpty,
    setSongRefreshKey,
    // Weekly data
    weeklySlots,
    weeklyProgress,
    weeklyBadgeTier,
    weeklyCompletedToday,
    weeklyReset,
    selectedWeeklySlot,
    weeklySongChoices,
    setWeeklySongRefreshKey,
    weeklyDifficulty,
    changeWeeklyDifficulty,
    // Difficulty
    selectedDifficulty,
    changeDifficulty,
    // Player selection & profiles
    activeProfiles,
    selectedPlayerIds,
    hasPlayer,
    togglePlayer,
    viewProfile,
    viewProfileXP,
    viewProfileLevel,
    levelInfo,
    playerStats,
    // Evaluation mode (2 players)
    evaluationMode,
    setEvaluationMode,
    // Handlers
    activateSlot,
    handlePlaySong,
    setupGamePlayers,
    handlePlayWeeklySong,
    activateWeeklySlot,
    handlePlayModeSong,
    selectMode,
    // Modes tab
    selectedMode,
    modeSongChoices,
    modeFilter,
    setModeFilter,
    mixerSelected,
    setMixerSelected,
    // Refs & highlights
    playAreaRef,
    playAreaHighlighted,
    weeklyPlayAreaRef,
    weeklyHighlighted,
    modeSongsRef,
    modeSongsHighlighted,
    // Leaderboard
    boardSource,
    setBoardSource,
    onlineEntries,
    onlineLoading,
    onlineError,
    loadOnlineBoard,
    sortedLeaderboard,
    sortMetric,
  };
}

/** Data bundle returned by {@link useDailyChallengeData} — consumed by the
 *  screen orchestrator and all tab components. */
export type DailyChallengeScreenData = ReturnType<typeof useDailyChallengeData>;
