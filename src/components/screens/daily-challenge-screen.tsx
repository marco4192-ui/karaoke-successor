'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  getSlotMetDifficulties,
  XP_REWARDS,
  DAILY_BADGES,
  getPlayerBestResult,
  getBestResultMetric,
  getDailyType,
  getWeeklyType,
  getDailyTargetFor,
  getDailyDifficultyMultiplier,
  DAILY_DIFFICULTIES,
  DAILY_SLOTS_PER_DAY,
  WEEKLY_SLOTS_PER_WEEK,
  WEEKLY_SLOT_XP,
  DAILY_SLOT_XP_BONUS,
  interpolateChallengeText,
  isDailySlotUnlocked,
  getActiveDailySlot,
  getDailyBadgeTierToday,
  getWeeklySlots,
  getWeeklyChallengeForSlot,
  getPlayerWeeklySlotProgress,
  isWeeklySlotUnlocked,
  getActiveWeeklySlot,
  getWeeklyBadgeTierThisWeek,
  isWeeklyChallengeCompletedToday,
  getTimeUntilWeeklyReset,
  getActiveQuests,
  claimQuestReward,
  getPlayerDailyStats,
  type DailyDifficulty,
  type DailyTypeDefinition,
  type WeeklyTypeDefinition,
} from '@/lib/game/daily-challenge';
import { matchesDailyCategory, type DailySongContext } from '@/lib/game/challenge-pools';
import {
  CHALLENGE_MODES,
  getChallengeRequirementStatus,
  createCustomChallenge,
  AVAILABLE_MODIFIERS,
} from '@/lib/game/player-progression';
import { getCompletedChallengeModes } from '@/lib/game/challenge-mode-progress';
import { getExtendedStats } from '@/lib/game/player-progression';
import { Song, GameMode } from '@/types/game';
import { shuffleArray } from '@/lib/utils';
import type { OnlineDailyEntry } from '@/lib/leaderboard/types';

/** Map a library Song to the category-evaluation context. */
function songToContext(song: Song, playerCount = 1): DailySongContext {
  return {
    title: song.title,
    artist: song.artist,
    genre: song.genre,
    language: song.language,
    year: song.year,
    durationMs: song.duration,
    bpm: song.bpm,
    rating: song.rating,
    difficulty: song.difficulty,
    lastPlayed: song.lastPlayed,
    dateAdded: song.dateAdded,
    playerCount,
  };
}

/** Localized display name of a daily/weekly type (interpolates nameParams). */
function typeName(def: DailyTypeDefinition | WeeklyTypeDefinition, t: (key: string) => string): string {
  let name = t(def.nameKey);
  if (def.nameParams) {
    for (const [key, value] of Object.entries(def.nameParams)) {
      name = name.replaceAll(`{${key}}`, value);
    }
  }
  return name;
}

// ===================== DAILY CHALLENGE SCREEN =====================
export function DailyChallengeScreen({ onPlayChallenge }: { onPlayChallenge: (_song: Song, _options?: { gameMode?: GameMode; playerIds?: string[] }) => void }) {
  const { t, language } = useTranslation();
  const { toast } = useToast();
  const { profiles, activeProfileId, setActiveProfile, addPlayer, setPlayers } = useGameStore();
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
    requestAnimationFrame(() => {
      playAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setPlayAreaHighlighted(true);
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = setTimeout(() => setPlayAreaHighlighted(false), 2000);
    });
  }, [t]);

  // Clean up the highlight timers on unmount
  useEffect(() => () => {
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    if (weeklyHighlightTimerRef.current) clearTimeout(weeklyHighlightTimerRef.current);
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

  /** Format a metric value for display (percent types get one decimal + %). */
  function formatDailyValue(metricKey: string, value: number): string {
    if (metricKey === 'accuracy' || metricKey === 'tickAccuracy') {
      return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
    }
    return Number.isInteger(value) ? value.toLocaleString() : value.toLocaleString(undefined, { maximumFractionDigits: 1 });
  }

  // Toggle player selection (max 2)
  const togglePlayer = (profileId: string) => {
    setSelectedPlayerIds(prev =>
      prev.includes(profileId)
        ? prev.filter(id => id !== profileId)
        : prev.length < 2
          ? [...prev, profileId]
          : [prev[1], profileId], // replace the second slot when full
    );
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
    requestAnimationFrame(() => {
      weeklyPlayAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setWeeklyHighlighted(true);
      if (weeklyHighlightTimerRef.current) clearTimeout(weeklyHighlightTimerRef.current);
      weeklyHighlightTimerRef.current = setTimeout(() => setWeeklyHighlighted(false), 2000);
    });
  }, [t]);

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

  // Metric label for a daily type (board value captions)
  const metricLabel = (type: string): string => {
    switch (getDailyType(type).metricKey) {
      case 'accuracy': return '%';
      case 'tickAccuracy': return t('dailyChallengeScreen.tickAccuracyLabel');
      case 'maxCombo': return t('dailyChallengeScreen.comboLabel');
      case 'perfectNotesCount': return t('dailyChallengeScreen.perfectNotesLabel');
      case 'goldenNotesCount': return t('dailyChallengeScreen.goldenNotesLabel');
      case 'notesHit': return t('dailyChallengeScreen.notesHitLabel');
      case 'notesMissed': return t('dailyChallengeScreen.missedNotesLabel');
      default: return t('dailyChallengeScreen.points');
    }
  };

  // Difficulty chip styling per level
  const difficultyChipClass = (id: DailyDifficulty, active: boolean): string => {
    const base = 'flex-1 min-w-[92px] sm:min-w-0 px-2.5 py-2 rounded-lg text-xs font-medium transition-all border flex items-center justify-center gap-1.5';
    if (!active) return `${base} bg-white/5 border-white/10 text-white/70 hover:bg-white/10`;
    switch (id) {
      case 'easy': return `${base} bg-green-500/20 border-green-500 text-green-300 ring-1 ring-green-400/50`;
      case 'normal': return `${base} bg-yellow-500/20 border-yellow-500 text-yellow-300 ring-1 ring-yellow-400/50`;
      case 'hard': return `${base} bg-orange-500/20 border-orange-500 text-orange-300 ring-1 ring-orange-400/50`;
      case 'very_hard': return `${base} bg-red-500/20 border-red-500 text-red-300 ring-1 ring-red-400/50`;
      case 'insane': return `${base} bg-fuchsia-500/20 border-fuchsia-500 text-fuchsia-300 ring-1 ring-fuchsia-400/50`;
    }
  };

  // Badge tier chip styling
  const tierChipClass = (tier: 'bronze' | 'silver' | 'gold', reached: boolean): string => {
    const base = 'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all';
    if (!reached) return `${base} bg-white/5 border-white/10 text-white/40`;
    switch (tier) {
      case 'bronze': return `${base} bg-amber-700/30 border-amber-600 text-amber-300 ring-1 ring-amber-500/50`;
      case 'silver': return `${base} bg-gray-400/20 border-gray-300 text-gray-100 ring-1 ring-gray-300/50`;
      case 'gold': return `${base} bg-yellow-500/20 border-yellow-400 text-yellow-200 ring-1 ring-yellow-400/60`;
    }
  };

  const TIER_ICONS: Record<string, string> = { bronze: '🥉', silver: '🥈', gold: '🥇' };
  const TIER_LABEL_KEYS: Record<string, string> = {
    bronze: 'dailyChallengeScreen.tierBronze',
    silver: 'dailyChallengeScreen.tierSilver',
    gold: 'dailyChallengeScreen.tierGold',
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold mb-2">{t('dailyChallengeScreen.title')}</h1>
        <p className="text-white/60">{t('dailyChallengeScreen.description')}</p>
      </div>

      {/* ═══ STEP 1 · Spieler wählen — the guided flow starts here. Without a
          player everything below stays hidden. The FIRST selected player also
          owns the statistics section at the bottom (no duplicate selection). ═══ */}
      <Card
        className={`bg-white/5 mb-6 transition-all ${hasPlayer ? 'border-green-500/25' : 'border-cyan-500/40 shadow-[0_0_36px_rgba(34,211,238,0.07)]'}`}
        data-testid="daily-player-selection"
      >
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2.5 text-base">
            <span
              className={`flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold border shrink-0 ${
                hasPlayer
                  ? 'bg-green-500/20 border-green-500 text-green-300'
                  : 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
              }`}
              aria-hidden
            >
              {hasPlayer ? '✓' : '1'}
            </span>
            {t('dailyChallengeScreen.stepPlayers')}
          </CardTitle>
          <CardDescription>{t('dailyChallengeScreen.stepPlayersDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          {activeProfiles.length === 0 ? (
            <p className="text-sm text-white/50 py-2">{t('dailyChallengeScreen.noActiveProfiles')}</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
              {activeProfiles.map((profile) => {
                const isSelected = selectedPlayerIds.includes(profile.id);
                const slot = selectedPlayerIds.indexOf(profile.id);
                return (
                  <button
                    key={profile.id}
                    onClick={() => togglePlayer(profile.id)}
                    aria-pressed={isSelected}
                    className={`group relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-500/10 ring-2 ring-cyan-400/30 shadow-[0_0_20px_rgba(34,211,238,0.15)]'
                        : 'border-white/10 bg-white/5 hover:border-cyan-400/40 hover:bg-white/10'
                    }`}
                  >
                    <span className="relative">
                      <span
                        className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold overflow-hidden"
                        style={{ backgroundColor: profile.color }}
                      >
                        {profile.avatar ? (
                          <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                        ) : (
                          profile.name?.[0] || '?'
                        )}
                      </span>
                      {isSelected && (
                        <span
                          className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full text-[10px] font-black bg-cyan-400 text-black shadow-[0_0_10px_rgba(34,211,238,0.6)]"
                          aria-label={slot === 0 ? 'P1' : 'P2'}
                        >
                          {slot === 0 ? 'P1' : 'P2'}
                        </span>
                      )}
                    </span>
                    <span className="text-sm font-medium text-white/90 truncate max-w-full">{profile.name}</span>
                    <span className="text-[11px] text-white/45">Lv. {profile.level || 1}</span>
                  </button>
                );
              })}
            </div>
          )}
          {!hasPlayer && (
            <p className="text-xs text-amber-400/90 mt-3 flex items-center gap-1.5" data-testid="daily-player-gate-hint">
              <span aria-hidden>👆</span> {t('dailyChallengeScreen.selectPlayerFirst')}
            </p>
          )}
          {hasPlayer && selectedPlayerIds.length >= 2 && (
            <p className="text-xs text-white/50 mt-3">{t('dailyChallengeScreen.dualPlayerHint')}</p>
          )}
        </CardContent>
      </Card>

      {/* Without a player the challenge selection (and everything below) stays hidden */}
      {!hasPlayer ? (
        <div className="text-center py-14 text-white/40" data-testid="daily-player-gate">
          <div className="text-5xl mb-3" aria-hidden>🎤</div>
          <p className="text-sm max-w-md mx-auto">{t('dailyChallengeScreen.selectPlayerFirst')}</p>
        </div>
      ) : (
        <>
      {/* ── Tab navigation (top) ── */}
      <div className="flex gap-2 mb-6 flex-wrap" role="tablist" aria-label={t('dailyChallengeScreen.title')}>
        {([
          ['challenge', 'dailyChallengeScreen.challenges'],
          ['weekly', 'dailyChallengeScreen.weeklyChallenge'],
          ['modes', 'dailyChallengeScreen.challengeModes'],
          ['leaderboard', 'dailyChallengeScreen.leaderboard'],
          ['badges', 'dailyChallengeScreen.badges'],
        ] as const).map(([tab, key]) => (
          <Button
            key={tab}
            variant={activeTab === tab ? 'default' : 'outline'}
            onClick={() => setActiveTab(tab)}
            className={activeTab === tab ? 'bg-gradient-to-r from-cyan-500 to-purple-500' : 'border-white/20'}
          >
            {t(key)}
          </Button>
        ))}
      </div>

      {/* ══ TAB: Daily Challenges (5 slots) ══ */}
      {activeTab === 'challenge' && (
        <div className="space-y-4 mb-6">
          {/* ── STEP 2 · Challenge wählen ── */}
          <div className="flex items-start gap-3" data-testid="daily-step-2">
            <span className="flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold bg-purple-500/20 border border-purple-500 text-purple-300 shrink-0" aria-hidden>2</span>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-white/90">{t('dailyChallengeScreen.stepChallenge')}</h2>
              <p className="text-xs text-white/50">{t('dailyChallengeScreen.dailyActiveStartHint')}</p>
            </div>
          </div>

          {/* ── Difficulty selector — independent of the global game difficulty.
              Switching updates targets, descriptions and XP of ALL slots instantly. ── */}
          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <label className="text-sm text-white/60">{t('dailyChallengeScreen.difficultyLabel')}</label>
                {/* Badge tier progress today */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/40">{t('dailyChallengeScreen.tierProgressToday')}</span>
                  {(['bronze', 'silver', 'gold'] as const).map((tier) => {
                    const thresholds = { bronze: 1, silver: 3, gold: 5 } as const;
                    const reached = slotProgress.completedSlots.length >= thresholds[tier];
                    return (
                      <span key={tier} className={tierChipClass(tier, reached)} title={`${t(TIER_LABEL_KEYS[tier])} — ${thresholds[tier]}`}>
                        <span aria-hidden>{TIER_ICONS[tier]}</span>
                        <span>{thresholds[tier]}</span>
                        {reached && <span className="text-green-400 font-bold">✓</span>}
                      </span>
                    );
                  })}
                  <Badge variant="outline" className="border-cyan-500 text-cyan-400">
                    {slotProgress.completedSlots.length}/5
                  </Badge>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap" role="group" aria-label={t('dailyChallengeScreen.difficultyLabel')}>
                {DAILY_DIFFICULTIES.map((d) => {
                  const done = metDifficulties.includes(d.id);
                  const active = selectedDifficulty === d.id;
                  return (
                    <button
                      key={d.id}
                      onClick={() => changeDifficulty(d.id)}
                      aria-pressed={active}
                      title={done ? t('dailyChallengeScreen.difficultyDoneHint') : `${t(d.labelKey)} — ×${d.xpMultiplier} XP`}
                      className={difficultyChipClass(d.id, active)}
                    >
                      <span aria-hidden>{d.icon}</span>
                      <span>{t(d.labelKey)}</span>
                      {done && <span className="text-green-400 font-bold" aria-label={t('dailyChallengeScreen.difficultyDoneHint')}>✓</span>}
                    </button>
                  );
                })}
              </div>
              {allDifficultiesDone && (
                <p className="text-xs text-green-400 mt-2">{t('dailyChallengeScreen.allDifficultiesDone')}</p>
              )}
            </CardContent>
          </Card>

          {/* ── The 5 daily slots ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {dailySlots.slice(0, DAILY_SLOTS_PER_DAY).map((slotData) => {
              const def = getDailyType(slotData.type);
              const unlocked = isDailySlotUnlocked(slotData.slot, challengePlayerId);
              const completed = slotProgress.completedSlots.includes(slotData.slot);
              const slotMet = challengePlayerId ? getSlotMetDifficulties(challengePlayerId, slotData.slot) : [];
              const target = getDailyTargetFor(slotData.type, selectedDifficulty, scalingProfile?.level || 1);
              const isPlaySlot = playSlot === slotData.slot;
              const slotXP = Math.round((slotData.slot === 0 ? XP_REWARDS.CHALLENGE_COMPLETE : DAILY_SLOT_XP_BONUS[Math.min(slotData.slot - 1, DAILY_SLOT_XP_BONUS.length - 1)]) * getDailyDifficultyMultiplier(selectedDifficulty));
              return (
                <Card
                  key={slotData.slot}
                  className={`bg-white/5 border-white/10 transition-all ${
                    completed ? 'ring-2 ring-green-500 border-green-500/30 cursor-pointer'
                    : isPlaySlot ? 'ring-2 ring-cyan-500 cursor-pointer'
                    : unlocked ? 'hover:border-cyan-500/50 cursor-pointer hover:bg-white/10'
                    : 'cursor-not-allowed opacity-50'
                  }`}
                  role="button"
                  tabIndex={0}
                  aria-label={`${slotData.slot + 1}. ${typeName(def, t)}`}
                  data-testid={`daily-slot-card-${slotData.slot}`}
                  onClick={() => activateSlot(slotData.slot, unlocked, completed)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      activateSlot(slotData.slot, unlocked, completed);
                    }
                  }}
                >
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-2xl flex-shrink-0" aria-hidden>{def.icon}</span>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{slotData.slot + 1}. {typeName(def, t)}</div>
                          <div className="text-xs text-white/50 truncate">
                            {interpolateChallengeText(t(def.descriptionKey), def.descriptionParams, target, def.metricKey)}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        {completed ? (
                          <Badge className="bg-green-500/20 text-green-300 border border-green-500/40">✓ {t('dailyChallengeScreen.slotDone')}</Badge>
                        ) : !unlocked ? (
                          <Badge variant="outline" className="border-white/20 text-white/40">🔒 {t('dailyChallengeScreen.slotLocked')}</Badge>
                        ) : isPlaySlot ? (
                          <Badge className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">▶ {t('dailyChallengeScreen.slotActive')}</Badge>
                        ) : (
                          <Badge variant="outline" className="border-white/20 text-white/60">{t('dailyChallengeScreen.slotOpen')}</Badge>
                        )}
                        <span className="text-[10px] text-cyan-400/80">+{slotXP} XP</span>
                      </div>
                    </div>
                    {/* Target + difficulty checkmarks for this slot */}
                    <div className="flex items-center justify-between text-xs text-white/50">
                      <span>
                        {t('dailyChallengeScreen.target')}: <span className="text-white/80 font-medium">{formatDailyValue(def.metricKey, target)}</span>
                      </span>
                      {slotMet.length > 0 && (
                        <span className="flex gap-0.5">
                          {DAILY_DIFFICULTIES.map(d => (
                            <span key={d.id} title={t(d.labelKey)} className={slotMet.includes(d.id) ? '' : 'opacity-20'}>{d.icon}</span>
                          ))}
                        </span>
                      )}
                    </div>
                    {/* Explicit start affordance — jumps to the play area below */}
                    {unlocked && !completed && (
                      <Button
                        size="sm"
                        className="mt-3 w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white font-semibold"
                        data-testid={`daily-slot-start-${slotData.slot}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          activateSlot(slotData.slot, unlocked, completed);
                        }}
                      >
                        ▶ {t('dailyChallengeScreen.slotStart')}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* ── STEP 3 · Song wählen — folds out under the slot selection ── */}
          <div ref={playAreaRef} className="scroll-mt-4 animate-in fade-in slide-in-from-top-2 duration-300" data-testid="daily-play-area">
          <div className="flex items-start gap-3 mb-3" data-testid="daily-step-3">
            <span className="flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold bg-fuchsia-500/20 border border-fuchsia-500 text-fuchsia-300 shrink-0" aria-hidden>3</span>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-white/90">
                {t('dailyChallengeScreen.stepSong')}
                <span className="ml-2 text-white/60 font-normal">— {playSlot + 1}. {typeDef.icon} {typeName(typeDef, t)}</span>
              </h2>
              <p className="text-xs text-white/50">{challengeDescription}</p>
            </div>
            <Badge variant="outline" className="border-cyan-500 text-cyan-400 shrink-0">
              +{challengeXP} XP{getDailyDifficultyMultiplier(selectedDifficulty) !== 1 ? ` (×${getDailyDifficultyMultiplier(selectedDifficulty)})` : ''}
            </Badge>
          </div>
          <Card className={`bg-white/5 border-white/10 transition-all duration-700 ${completedToday ? 'ring-1 ring-green-500/40' : ''} ${playAreaHighlighted ? 'ring-2 ring-cyan-400 shadow-[0_0_36px_rgba(34,211,238,0.35)]' : ''}`}>
            <CardContent className="pt-4">
              {slotCategoryEmpty && (
                <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-300">
                  {t('dailyChallengeScreen.noMatchingSongs')}
                </div>
              )}

              <div className="mb-4 p-4 bg-white/5 rounded-lg">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-white/60">{t('dailyChallengeScreen.target')}</span>
                  <span className="font-medium">{formatDailyValue(typeDef.metricKey, challenge.target)}</span>
                </div>
                <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${completedToday ? 'bg-green-500' : 'bg-gradient-to-r from-cyan-500 to-purple-500'}`}
                    style={{ width: completedToday ? '100%' : '0%' }}
                  />
                </div>
              </div>

              {/* Best result of the first selected player (same slot) */}
              {selectedPlayerIds[0] && (() => {
                const best = getPlayerBestResult(selectedPlayerIds[0]);
                if (!best || best.slot !== playSlot) return null;
                const currentMetric = getBestResultMetric(best, challenge.type);
                const target = challenge.target;
                const pct = typeDef.direction === 'min'
                  ? (currentMetric <= target ? 100 : Math.min(99, Math.round((target / Math.max(1, currentMetric)) * 100)))
                  : Math.min(100, Math.round((currentMetric / target) * 100));
                const remaining = typeDef.direction === 'min'
                  ? Math.max(0, currentMetric - target)
                  : Math.max(0, target - currentMetric);

                return (
                  <div className="mb-4 p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-white/60">{t('dailyChallengeScreen.bestResult')}</span>
                      <span className="font-medium text-cyan-400">
                        {formatDailyValue(typeDef.metricKey, currentMetric)} / {formatDailyValue(typeDef.metricKey, target)}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="text-xs text-white/40 mt-1">
                      {pct >= 100
                        ? t('dailyChallengeScreen.challengeComplete')
                        : t(typeDef.direction === 'min' ? 'dailyChallengeScreen.remainingFewer' : 'dailyChallengeScreen.remainingMore').replace('{n}', remaining.toLocaleString())}
                    </div>
                  </div>
                );
              })()}

              {/* Evaluation mode when two players are selected (players
                  themselves are picked in step 1 at the top) */}
              {selectedPlayerIds.length >= 2 && (
                <div className="mb-4">
                  <label className="text-sm text-white/60 mb-2 block">{t('dailyChallengeScreen.evaluationMode')}</label>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={evaluationMode === 'duel' ? 'default' : 'outline'}
                      onClick={() => setEvaluationMode('duel')}
                      className={evaluationMode === 'duel' ? 'bg-purple-500' : 'border-white/20'}
                    >
                      {t('dailyChallengeScreen.evaluationDuel')}
                    </Button>
                    <Button
                      size="sm"
                      variant={evaluationMode === 'coop' ? 'default' : 'outline'}
                      onClick={() => setEvaluationMode('coop')}
                      className={evaluationMode === 'coop' ? 'bg-green-500' : 'border-white/20'}
                    >
                      {t('dailyChallengeScreen.evaluationTeam')}
                    </Button>
                  </div>
                </div>
              )}

              {/* Three song choices for the slot (player is guaranteed here) */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-white/60">{t('dailyChallengeScreen.selectSong')}</label>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/20 h-7 px-2 text-xs"
                    onClick={() => setSongRefreshKey(k => k + 1)}
                    title={t('dailyChallengeScreen.shuffleSongs')}
                  >
                    🔄 {t('dailyChallengeScreen.shuffleSongs')}
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {songChoices.map((song, idx) => (
                    <Card key={song.id || idx} className="bg-white/5 border-white/10 hover:border-cyan-500/50 cursor-pointer transition-all hover:scale-[1.02]" onClick={() => handlePlaySong(song)}>
                      <CardContent className="pt-3 pb-3">
                        <div className="text-sm font-medium text-white truncate">{song.title}</div>
                        <div className="text-xs text-white/50 truncate">{song.artist}</div>
                        <div className="flex items-center gap-2 mt-1">
                          {song.genre && <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/50">{song.genre}</span>}
                          {song.language && <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/50">{song.language}</span>}
                          {song.duration && <span className="text-xs text-white/40">{Math.round(song.duration / 60000)}:{String(Math.round((song.duration % 60000) / 1000)).padStart(2, '0')}</span>}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm text-white/60">
                  {t('dailyChallengeScreen.resetsIn')} {timeLeft.hours}h {timeLeft.minutes}m
                </div>
                {dailyBadgeTier !== 'none' && (
                  <div className="text-sm text-yellow-400">{TIER_ICONS[dailyBadgeTier]} {t(TIER_LABEL_KEYS[dailyBadgeTier])}</div>
                )}
              </div>

              {playerStats.currentStreak > 0 && (
                <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                  <div className="text-sm text-orange-400">
                    {t('dailyChallengeScreen.streakBonus').replace('{n}', (XP_REWARDS.STREAK_BONUS_BASE * playerStats.currentStreak).toString()).replace('{m}', playerStats.currentStreak.toString())}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          </div>
        </div>
      )}

      {/* ══ TAB: Weekly Challenges (5 slots, own difficulty) — same
          3-step structure as the daily tab: player (step 1, top) → pick a
          weekly slot → pick a song. Weekly slots count every sung song
          automatically, so playing from here is pure convenience. ══ */}
      {activeTab === 'weekly' && (
        <div className="space-y-4 mb-6">
          {/* ── STEP 2 · Challenge wählen ── */}
          <div className="flex items-start gap-3" data-testid="weekly-step-2">
            <span className="flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold bg-purple-500/20 border border-purple-500 text-purple-300 shrink-0" aria-hidden>2</span>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-white/90">{t('dailyChallengeScreen.stepChallenge')}</h2>
              <p className="text-xs text-white/50">{t('dailyChallengeScreen.weeklyPickSlot')}</p>
            </div>
            <span className="text-xs text-white/40 shrink-0">{t('dailyChallengeScreen.resetsIn')} {weeklyReset.days}d {weeklyReset.hours}h</span>
          </div>

          {/* Weekly difficulty selector — independent from daily + global */}
          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <label className="text-sm text-white/60">{t('dailyChallengeScreen.weeklyDifficultyLabel')}</label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/40">{t('dailyChallengeScreen.tierProgressWeek')}</span>
                  {(['bronze', 'silver', 'gold'] as const).map((tier) => {
                    const thresholds = { bronze: 1, silver: 3, gold: 5 } as const;
                    const reached = weeklyProgress.completedSlots.length >= thresholds[tier];
                    return (
                      <span key={tier} className={tierChipClass(tier, reached)} title={`${t(TIER_LABEL_KEYS[tier])} — ${thresholds[tier]}`}>
                        <span aria-hidden>{tier === 'bronze' ? '🎗️' : tier === 'silver' ? '🏅' : '🏆'}</span>
                        <span>{thresholds[tier]}</span>
                        {reached && <span className="text-green-400 font-bold">✓</span>}
                      </span>
                    );
                  })}
                  <Badge variant="outline" className="border-cyan-500 text-cyan-400">
                    {weeklyProgress.completedSlots.length}/5
                  </Badge>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap" role="group" aria-label={t('dailyChallengeScreen.weeklyDifficultyLabel')}>
                {DAILY_DIFFICULTIES.map((d) => {
                  const active = weeklyDifficulty === d.id;
                  return (
                    <button
                      key={d.id}
                      onClick={() => changeWeeklyDifficulty(d.id)}
                      aria-pressed={active}
                      title={`${t(d.labelKey)} — ×${d.xpMultiplier} XP`}
                      className={difficultyChipClass(d.id, active)}
                    >
                      <span aria-hidden>{d.icon}</span>
                      <span>{t(d.labelKey)}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 text-xs text-white/50">
                {t('dailyChallengeScreen.weeklyCountsAutomatically')} · {t('dailyChallengeScreen.resetsIn')} {weeklyReset.days}d {weeklyReset.hours}h
              </div>
            </CardContent>
          </Card>

          {/* The 5 weekly slots — selectable, they unfold the song area */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {weeklySlots.slice(0, WEEKLY_SLOTS_PER_WEEK).map((slotData) => {
              const slotInfo = getWeeklyChallengeForSlot(slotData.slot, viewProfileLevel, weeklyDifficulty);
              const def = slotInfo.def;
              const unlocked = isWeeklySlotUnlocked(slotData.slot, challengePlayerId);
              const completed = weeklyProgress.completedSlots.includes(slotData.slot);
              const slotMet = (weeklyProgress.metBySlot[String(slotData.slot)] ?? []) as DailyDifficulty[];
              const slotXP = Math.round(WEEKLY_SLOT_XP[Math.min(slotData.slot, WEEKLY_SLOT_XP.length - 1)] * getDailyDifficultyMultiplier(weeklyDifficulty));
              const isSelSlot = selectedWeeklySlot === slotData.slot;
              return (
                <Card
                  key={slotData.slot}
                  role="button"
                  tabIndex={0}
                  aria-label={`${slotData.slot + 1}. ${typeName(def, t)}`}
                  data-testid={`weekly-slot-card-${slotData.slot}`}
                  onClick={() => activateWeeklySlot(slotData.slot, unlocked, completed)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      activateWeeklySlot(slotData.slot, unlocked, completed);
                    }
                  }}
                  className={`bg-white/5 transition-all ${
                    completed ? 'ring-2 ring-green-500 border-green-500/30 cursor-pointer'
                    : isSelSlot ? 'ring-2 ring-cyan-500 cursor-pointer'
                    : unlocked ? 'border-white/10 hover:border-cyan-500/50 cursor-pointer hover:bg-white/10'
                    : 'border-white/10 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-2xl flex-shrink-0" aria-hidden>{def.icon}</span>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{slotData.slot + 1}. {typeName(def, t)}</div>
                          <div className="text-xs text-white/50">
                            {interpolateChallengeText(t(def.descriptionKey), def.descriptionParams, slotInfo.target, def.metricKey)}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        {completed ? (
                          <Badge className="bg-green-500/20 text-green-300 border border-green-500/40">✓ {t('dailyChallengeScreen.slotDone')}</Badge>
                        ) : !unlocked ? (
                          <Badge variant="outline" className="border-white/20 text-white/40">🔒 {t('dailyChallengeScreen.slotLocked')}</Badge>
                        ) : isSelSlot ? (
                          <Badge className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">▶ {t('dailyChallengeScreen.slotActive')}</Badge>
                        ) : (
                          <Badge variant="outline" className="border-cyan-500/40 text-cyan-300">{t('dailyChallengeScreen.slotOpen')}</Badge>
                        )}
                        <span className="text-[10px] text-cyan-400/80">+{slotXP} XP</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-white/50">
                      <span>
                        {t('dailyChallengeScreen.target')}: <span className="text-white/80 font-medium">{formatDailyValue(def.metricKey, slotInfo.target)}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        {slotMet.length > 0 && (
                          <span className="flex gap-0.5">
                            {DAILY_DIFFICULTIES.map(d => (
                              <span key={d.id} title={t(d.labelKey)} className={slotMet.includes(d.id) ? '' : 'opacity-20'}>{d.icon}</span>
                            ))}
                          </span>
                        )}
                        <span className="text-white/30">{def.aggregation === 'sum' ? t('dailyChallengeScreen.weeklySumType') : t('dailyChallengeScreen.weeklyBestType')}</span>
                      </span>
                    </div>
                    {/* Explicit affordance — unfolds the song selection below */}
                    {unlocked && !completed && (
                      <Button
                        size="sm"
                        className="mt-3 w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white font-semibold"
                        data-testid={`weekly-slot-start-${slotData.slot}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          activateWeeklySlot(slotData.slot, unlocked, completed);
                        }}
                      >
                        ▶ {t('dailyChallengeScreen.slotStart')}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* ── STEP 3 · Song wählen — folds out when a weekly slot is picked ── */}
          {selectedWeeklySlot !== null && (() => {
            const slotInfo = getWeeklyChallengeForSlot(selectedWeeklySlot, viewProfileLevel, weeklyDifficulty);
            const wDef = slotInfo.def;
            return (
              <div
                ref={weeklyPlayAreaRef}
                className="scroll-mt-4 animate-in fade-in slide-in-from-top-2 duration-300"
                data-testid="weekly-play-area"
              >
                <div className="flex items-start gap-3 mb-3" data-testid="weekly-step-3">
                  <span className="flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold bg-fuchsia-500/20 border border-fuchsia-500 text-fuchsia-300 shrink-0" aria-hidden>3</span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-semibold text-white/90">
                      {t('dailyChallengeScreen.stepSong')}
                      <span className="ml-2 text-white/60 font-normal">— {selectedWeeklySlot + 1}. {wDef.icon} {typeName(wDef, t)}</span>
                    </h2>
                    <p className="text-xs text-white/50">
                      {interpolateChallengeText(t(wDef.descriptionKey), wDef.descriptionParams, slotInfo.target, wDef.metricKey)} · {wDef.aggregation === 'sum' ? t('dailyChallengeScreen.weeklySumType') : t('dailyChallengeScreen.weeklyBestType')}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/20 h-7 px-2 text-xs shrink-0"
                    onClick={() => setWeeklySongRefreshKey(k => k + 1)}
                    title={t('dailyChallengeScreen.shuffleSongs')}
                  >
                    🔄 {t('dailyChallengeScreen.shuffleSongs')}
                  </Button>
                </div>
                <Card className={`bg-white/5 border-white/10 transition-all duration-700 ${weeklyHighlighted ? 'ring-2 ring-cyan-400 shadow-[0_0_36px_rgba(34,211,238,0.35)]' : ''}`}>
                  <CardContent className="pt-4">
                    {weeklySongChoices.length === 0 ? (
                      <p className="text-sm text-white/50 py-2">{t('dailyChallengeScreen.noMatchingSongs')}</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                        {weeklySongChoices.map((song, idx) => (
                          <Card key={song.id || idx} className="bg-white/5 border-white/10 hover:border-cyan-500/50 cursor-pointer transition-all hover:scale-[1.02]" onClick={() => handlePlayWeeklySong(song)} data-testid={`weekly-song-${idx}`}>
                            <CardContent className="pt-3 pb-3">
                              <div className="text-sm font-medium text-white truncate">{song.title}</div>
                              <div className="text-xs text-white/50 truncate">{song.artist}</div>
                              <div className="flex items-center gap-2 mt-1">
                                {song.genre && <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/50">{song.genre}</span>}
                                {song.language && <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/50">{song.language}</span>}
                                {song.duration && <span className="text-xs text-white/40">{Math.round(song.duration / 60000)}:{String(Math.round((song.duration % 60000) / 1000)).padStart(2, '0')}</span>}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-white/40">{t('dailyChallengeScreen.weeklyCountsAutomatically')}</p>
                  </CardContent>
                </Card>
              </div>
            );
          })()}

          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">{t('dailyChallengeScreen.weeklyHintTitle')}</span>
                <span className={`text-white/60 ${weeklyBadgeTier !== 'none' ? 'text-yellow-400' : ''}`}>
                  {weeklyBadgeTier !== 'none' && (weeklyBadgeTier === 'gold' ? '🏆 ' : weeklyBadgeTier === 'silver' ? '🏅 ' : '🎗️ ')}
                  {weeklyCompletedToday ? t('dailyChallengeScreen.challengeComplete') : t('dailyChallengeScreen.weeklyPlayHint')}
                </span>
              </div>
              <p className="text-xs text-white/40 mt-2">{t('dailyChallengeScreen.weeklyUnlockHint')}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ══ TAB: Challenge Modes (71 modes, filter + completion) — same
          3-step structure: player (step 1, top) → pick a mode → pick a song ══ */}
      {activeTab === 'modes' && (
        <div className="space-y-4 mb-6">
          {/* ── STEP 2 · Challenge-Modus wählen ── */}
          <div className="flex items-start gap-3" data-testid="modes-step-2">
            <span className="flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold bg-purple-500/20 border border-purple-500 text-purple-300 shrink-0" aria-hidden>2</span>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-white/90">{t('dailyChallengeScreen.stepChallengeMode')}</h2>
              <p className="text-xs text-white/50">{t('dailyChallengeScreen.modesSoloHint')}</p>
            </div>
            {/* Difficulty filter */}
            <div className="flex gap-1 bg-white/5 rounded-lg p-1 border border-white/10 shrink-0">
              {(['all', 'easy', 'medium', 'hard', 'extreme'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setModeFilter(f)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                    modeFilter === f ? 'bg-cyan-500 text-white' : 'text-white/60 hover:text-white'
                  }`}
                >
                  {f === 'all' ? t('dailyChallengeScreen.filterAll') : f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-3">
              <CardTitle>{t('dailyChallengeScreen.challengeModes')} ({CHALLENGE_MODES.length})</CardTitle>
              <CardDescription>{t('dailyChallengeScreen.specialModifiers')}</CardDescription>
            </CardHeader>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {CHALLENGE_MODES
              .filter(mode => modeFilter === 'all' || mode.difficulty === modeFilter)
              .map((mode) => {
              // Check if the player meets the challenge requirements
              const extendedStats = getExtendedStats();
              const completedModes = getCompletedChallengeModes(viewProfile?.id);
              const isCompleted = completedModes.includes(mode.id);
              const requirementStatus = getChallengeRequirementStatus(
                mode.id,
                viewProfileLevel,
                extendedStats.songsCompleted,
                extendedStats.unlockedTitles,
                extendedStats.totalXP,
                t,
                completedModes,
              );
              const locked = requirementStatus !== null;
              const isSelected = selectedMode?.id === mode.id;

              return (
                <Card
                  key={mode.id}
                  className={`bg-white/5 border-white/10 transition-all relative ${
                    locked ? 'opacity-50 cursor-not-allowed' :
                    isSelected ? 'ring-2 ring-cyan-500 cursor-pointer hover:bg-white/10' :
                    'cursor-pointer hover:bg-white/10'
                  } ${
                    isCompleted ? 'border-green-500/40' :
                    mode.difficulty === 'extreme' ? 'border-red-500/30' :
                    mode.difficulty === 'hard' ? 'border-orange-500/30' :
                    mode.difficulty === 'medium' ? 'border-yellow-500/30' : 'border-green-500/30'
                  }`}
                  onClick={() => {
                    if (locked) return;
                    if (isSelected) {
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
                    }
                  }}
                >
                  <CardContent className="pt-4 pb-4">
                    {locked && (
                      <div className="absolute top-2 right-2 text-lg" title={requirementStatus || ''}>🔒</div>
                    )}
                    {isCompleted && !locked && (
                      <div className="absolute top-2 right-2 text-lg" title={t('dailyChallengeScreen.modeCompleted')}>✅</div>
                    )}
                    <div className="text-3xl mb-2">{mode.icon}</div>
                    <h4 className="font-bold text-white mb-1">{t(mode.nameKey)}</h4>
                    <p className="text-xs text-white/60 mb-3 line-clamp-2">{t(mode.descriptionKey)}</p>
                    {locked && requirementStatus && (
                      <p className="text-xs text-red-400 mb-2">{requirementStatus}</p>
                    )}
                    {mode.completionTarget && !locked && (
                      <p className="text-[10px] text-white/40 mb-2">
                        🎯 {t('dailyChallengeScreen.modeTarget')}: {mode.completionTarget.direction === 'min' ? '≥' : '≤'}{
                          mode.completionTarget.metric === 'accuracy' ? `${mode.completionTarget.value}%` : mode.completionTarget.value.toLocaleString()
                        } {mode.completionTarget.metric === 'notesHit' ? t('dailyChallengeScreen.notesHitLabel')
                          : mode.completionTarget.metric === 'perfectNotes' ? t('dailyChallengeScreen.perfectNotesLabel')
                          : mode.completionTarget.metric === 'goldenNotes' ? t('dailyChallengeScreen.goldenNotesLabel')
                          : mode.completionTarget.metric === 'maxCombo' ? t('dailyChallengeScreen.comboLabel')
                          : mode.completionTarget.metric === 'notesMissed' ? t('dailyChallengeScreen.missedNotesLabel')
                          : t('dailyChallengeScreen.points')}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className={`text-xs ${
                        mode.difficulty === 'extreme' ? 'border-red-500 text-red-400' :
                        mode.difficulty === 'hard' ? 'border-orange-500 text-orange-400' :
                        mode.difficulty === 'medium' ? 'border-yellow-500 text-yellow-400' : 'border-green-500 text-green-400'
                      }`}>
                        {mode.difficulty.toUpperCase()}
                      </Badge>
                      <span className="text-cyan-400 font-bold text-sm">+{mode.xpReward} XP</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* ── STEP 3 · Song wählen — folds out when a mode is picked ── */}
          {selectedMode && modeSongChoices.length > 0 && (
            <div className="mb-4 animate-in fade-in slide-in-from-top-2 duration-300" data-testid="modes-step-3">
              <div className="flex items-start gap-3 mb-3">
                <span className="flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold bg-fuchsia-500/20 border border-fuchsia-500 text-fuchsia-300 shrink-0" aria-hidden>3</span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-semibold text-white/90">
                    {t('dailyChallengeScreen.stepSong')}
                    <span className="ml-2 text-white/60 font-normal">— {selectedMode.icon} {t(selectedMode.nameKey)}</span>
                  </h2>
                  <p className="text-xs text-white/50">{t(selectedMode.descriptionKey)}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {modeSongChoices.map((song, idx) => (
                  <Card key={song.id || idx} className="bg-white/5 border-white/10 hover:border-cyan-500/50 cursor-pointer transition-all hover:scale-[1.02]" onClick={() => handlePlayModeSong(song)}>
                    <CardContent className="pt-3 pb-3">
                      <div className="text-sm font-medium text-white truncate">{song.title}</div>
                      <div className="text-xs text-white/50 truncate">{song.artist}</div>
                      {song.duration && <div className="text-xs text-white/40 mt-1">{Math.round(song.duration / 60000)}:{String(Math.round((song.duration % 60000) / 1000)).padStart(2, '0')}</div>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Challenge Mixer */}
          <Card className="bg-white/5 border-white/10 mt-6">
            <CardHeader>
              <CardTitle>{t('dailyChallengeScreen.challengeMixer')}</CardTitle>
              <CardDescription>{t('dailyChallengeScreen.challengeMixerDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                {AVAILABLE_MODIFIERS.map((mod) => (
                  <button
                    key={mod.type}
                    onClick={() => setMixerSelected(prev => prev.includes(mod.type) ? prev.filter(t => t !== mod.type) : [...prev, mod.type])}
                    className={`p-2 rounded-lg text-left text-xs transition-all ${
                      mixerSelected.includes(mod.type) ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-300' : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    <div className="font-medium">{mod.label}</div>
                    <div className="text-white/40">{mod.difficulty}</div>
                  </button>
                ))}
              </div>
              {mixerSelected.length > 0 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-white/60">
                    {mixerSelected.length} modifier{mixerSelected.length > 1 ? 's' : ''} — {mixerSelected.length >= 3 ? 'EXTREME' : mixerSelected.length >= 2 ? 'HARD' : 'MEDIUM'}
                  </div>
                  <Button size="sm" className="bg-gradient-to-r from-cyan-500 to-purple-500" onClick={() => {
                    const customChallenge = createCustomChallenge({
                      name: 'Custom Mix',
                      modifiers: AVAILABLE_MODIFIERS.filter(m => mixerSelected.includes(m.type)).map(m => ({
                        type: m.type,
                        description: m.description,
                        value: m.defaultValue,
                      })),
                      difficulty: mixerSelected.length >= 3 ? 'extreme' : mixerSelected.length >= 2 ? 'hard' : 'medium',
                    });
                    setItem(StorageKeys.CHALLENGE_MODE, customChallenge.id);
                    // Fresh random song (previously this reused the daily tab's
                    // songChoices which could be stale/empty on the modes tab)
                    const mixerSong = shuffleArray(getAllSongs())[0];
                    if (!mixerSong) return;
                    setupGamePlayers(false);
                    onPlayChallenge(mixerSong);
                  }}>
                    {t('dailyChallengeScreen.playNow')} (+{Math.round((150 + mixerSelected.length * 50) * (mixerSelected.length >= 3 ? 3 : mixerSelected.length >= 2 ? 2 : 1.5))} XP)
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ══ TAB: Leaderboard ══ */}
      {activeTab === 'leaderboard' && (
        <Card className="bg-white/5 border-white/10 mb-6">
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center justify-between gap-3">
              <span>{t('dailyChallengeScreen.todayLeaderboard')}</span>
              {/* Local / Online switch */}
              <div className="flex gap-1 bg-white/5 rounded-lg p-1 border border-white/10">
                <button
                  onClick={() => setBoardSource('local')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    boardSource === 'local' ? 'bg-cyan-500 text-white' : 'text-white/60 hover:text-white'
                  }`}
                >
                  {t('dailyChallengeScreen.localBoard')}
                </button>
                <button
                  onClick={() => { setBoardSource('online'); loadOnlineBoard(); }}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    boardSource === 'online' ? 'bg-cyan-500 text-white' : 'text-white/60 hover:text-white'
                  }`}
                >
                  🌐 {t('dailyChallengeScreen.onlineBoard')}
                </button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {boardSource === 'local' ? (
              <>
                {sortedLeaderboard.length === 0 ? (
                  <div className="text-center py-8 text-white/40">
                    <div className="text-4xl mb-2">🎯</div>
                    <p>{t('dailyChallengeScreen.noLeaderboardEntries')}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sortedLeaderboard.slice(0, 10).map((entry, idx) => (
                      <div
                        key={entry.playerId}
                        className={`flex items-center gap-3 p-3 rounded-lg ${
                          idx === 0 ? 'bg-amber-500/20 border border-amber-500/30' :
                          idx === 1 ? 'bg-gray-400/20 border border-gray-400/30' :
                          idx === 2 ? 'bg-orange-700/20 border border-orange-700/30' :
                          'bg-white/5'
                        }`}
                      >
                        <div className="text-xl font-bold w-8">
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                        </div>
                        {entry.playerAvatar ? (
                          <img src={entry.playerAvatar} alt={entry.playerName} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                            style={{ backgroundColor: entry.playerColor }}
                          >
                            {entry.playerName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="font-medium flex items-center gap-2">
                            {entry.playerName}
                            {entry.dailyBadge && (
                              <span title={t(TIER_LABEL_KEYS[entry.dailyBadge])} aria-label={t(TIER_LABEL_KEYS[entry.dailyBadge])}>
                                {entry.dailyBadge === 'gold' ? '🥇' : entry.dailyBadge === 'silver' ? '🥈' : '🥉'}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-white/60">
                            {t('dailyChallengeScreen.slotsCompletedLabel').replace('{n}', String(entry.slotsCompletedToday ?? 0))}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg flex items-center gap-2 justify-end">
                            {formatDailyValue(typeDef.metricKey, sortMetric(entry))}
                            {entry.difficulty && DAILY_DIFFICULTIES.some(d => d.id === entry.difficulty) && (
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded border border-white/15 text-white/60"
                                title={t(DAILY_DIFFICULTIES.find(d => d.id === entry.difficulty)!.labelKey)}
                              >
                                {DAILY_DIFFICULTIES.find(d => d.id === entry.difficulty)!.icon}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-white/40">{metricLabel(challenge.type)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 text-center text-sm text-white/40">
                  {challenge.totalParticipants} {challenge.totalParticipants !== 1 ? t('dailyChallengeScreen.participants') : t('dailyChallengeScreen.participant')} {t('dailyChallengeScreen.dayStreak').toLowerCase()}
                </div>
              </>
            ) : (
              /* ── Online daily leaderboard ── */
              <>
                {onlineLoading && (
                  <div className="text-center py-8 text-white/50">
                    <div className="animate-spin inline-block w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mb-3" />
                    <p className="text-sm">{t('dailyChallengeScreen.onlineBoardLoading')}</p>
                  </div>
                )}
                {!onlineLoading && onlineError && (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2">📡</div>
                    <p className="text-sm text-amber-400/90 mb-3">{t('dailyChallengeScreen.onlineBoardUnavailable')}</p>
                    <p className="text-xs text-white/40 mb-4">{onlineError}</p>
                    <Button size="sm" variant="outline" className="border-white/20" onClick={loadOnlineBoard}>
                      {t('dailyChallengeScreen.onlineBoardRefresh')}
                    </Button>
                  </div>
                )}
                {!onlineLoading && !onlineError && onlineEntries && onlineEntries.length === 0 && (
                  <div className="text-center py-8 text-white/40">
                    <div className="text-4xl mb-2">🌐</div>
                    <p>{t('dailyChallengeScreen.onlineBoardEmpty')}</p>
                  </div>
                )}
                {!onlineLoading && !onlineError && onlineEntries && onlineEntries.length > 0 && (
                  <div className="space-y-2">
                    {onlineEntries.map((entry) => (
                      <div
                        key={entry.profile_uid}
                        className={`flex items-center gap-3 p-3 rounded-lg ${
                          entry.rank === 1 ? 'bg-amber-500/20 border border-amber-500/30' :
                          entry.rank === 2 ? 'bg-gray-400/20 border border-gray-400/30' :
                          entry.rank === 3 ? 'bg-orange-700/20 border border-orange-700/30' :
                          'bg-white/5'
                        }`}
                      >
                        <div className="text-xl font-bold w-8">
                          {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                        </div>
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: entry.color || '#8B5CF6' }}
                        >
                          {entry.display_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{entry.display_name}</div>
                          <div className="text-xs text-white/60">{metricLabel(entry.challenge_type)}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg flex items-center gap-2 justify-end">
                            {formatDailyValue(getDailyType(entry.challenge_type).metricKey, entry.metric_value)}
                            {entry.difficulty && DAILY_DIFFICULTIES.some(d => d.id === entry.difficulty) && (
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded border border-white/15 text-white/60"
                                title={t(DAILY_DIFFICULTIES.find(d => d.id === entry.difficulty)!.labelKey)}
                              >
                                {DAILY_DIFFICULTIES.find(d => d.id === entry.difficulty)!.icon}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ══ TAB: Badges ══ */}
      {activeTab === 'badges' && (
        <Card className="bg-white/5 border-white/10 mb-6">
          <CardHeader>
            <CardTitle>{t('dailyChallengeScreen.yourBadges')} ({playerStats.badges.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Today's + this week's tier progress */}
            <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
                <div className="text-xs text-white/50 mb-2">{t('dailyChallengeScreen.tierProgressToday')}</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-amber-700 to-yellow-400 transition-all" style={{ width: `${(slotProgress.completedSlots.length / 5) * 100}%` }} />
                  </div>
                  <span className="text-xs text-white/60">{slotProgress.completedSlots.length}/5</span>
                </div>
              </div>
              <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
                <div className="text-xs text-white/50 mb-2">{t('dailyChallengeScreen.tierProgressWeek')}</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all" style={{ width: `${(weeklyProgress.completedSlots.length / 5) * 100}%` }} />
                  </div>
                  <span className="text-xs text-white/60">{weeklyProgress.completedSlots.length}/5</span>
                </div>
              </div>
            </div>

            {playerStats.badges.length === 0 ? (
              <div className="text-center py-8 text-white/40">
                <div className="text-4xl mb-2">🎖️</div>
                <p>{t('dailyChallengeScreen.completeForBadges')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {playerStats.badges.map((badge) => (
                  <div
                    key={badge.id}
                    className="p-4 bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border border-amber-500/20 rounded-lg text-center"
                  >
                    <div className="text-3xl mb-2">{badge.icon}</div>
                    <div className="font-medium text-amber-400">{t(`dailyBadges.${badge.id}.name`)}</div>
                    <div className="text-xs text-white/60 mt-1">{t(`dailyBadges.${badge.id}.description`)}</div>
                    <div className="text-xs text-white/40 mt-2">
                      {new Date(badge.unlockedAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6">
              <h4 className="text-sm font-medium text-white/60 mb-3">{t('dailyChallengeScreen.availableBadges')}</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 opacity-50">
                {Object.values(DAILY_BADGES)
                  .filter(b => !playerStats.badges.some(pb => pb.id === b.id))
                  .slice(0, 9)
                  .map((badge) => (
                    <div
                      key={badge.id}
                      className="p-4 bg-white/5 border border-white/10 rounded-lg text-center grayscale"
                    >
                      <div className="text-3xl mb-2">{badge.icon}</div>
                      <div className="font-medium">{t(`dailyBadges.${badge.id}.name`)}</div>
                      <div className="text-xs text-white/60 mt-1">{t(`dailyBadges.${badge.id}.description`)}</div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Quests */}
            <div className="mt-6">
              <h4 className="text-sm font-medium text-white/60 mb-3">{t('dailyChallengeScreen.quests')}</h4>
              <div className="space-y-2">
                {(viewProfile ? getActiveQuests(viewProfile.id) : getActiveQuests()).map((quest) => {
                  const pct = Math.min(100, Math.round((quest.currentProgress / quest.target) * 100));
                  return (
                    <div key={quest.id} className={`p-3 rounded-lg ${quest.completed ? 'bg-green-500/10 border border-green-500/20' : 'bg-white/5 border border-white/10'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span>{quest.icon}</span>
                          <span className="font-medium text-sm">{t(quest.nameKey) || quest.name}</span>
                        </div>
                        <span className="text-xs text-cyan-400">+{quest.reward.xp} XP</span>
                      </div>
                      <div className="text-xs text-white/50 mb-2">{t(quest.descriptionKey) || quest.description}</div>
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className={`h-full ${quest.completed ? 'bg-green-500' : 'bg-gradient-to-r from-cyan-500 to-purple-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <div className="text-xs text-white/40 mt-1">{quest.currentProgress}/{quest.target}</div>
                      {quest.completed && !quest.claimedAt && (
                        <Button size="sm" className="mt-2 bg-green-500 hover:bg-green-600" onClick={() => claimQuestReward(quest.id, viewProfile?.id)}>
                          {t('dailyChallengeScreen.claimReward')}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Player progress section (bottom): ALWAYS follows the FIRST
          selected player — no duplicate statistics player selection. ── */}
      {viewProfile && (
        <section aria-label={t('dailyChallengeScreen.playerProgress')} className="mt-8 pt-6 border-t border-white/10">
          {/* Whose statistics these are — fixed to P1 from step 1 */}
          <div className="flex items-center gap-2.5 mb-4 flex-wrap">
            <span className="text-sm text-white/50">{t('dailyChallengeScreen.playerProgress')}:</span>
            <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-sm">
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden" style={{ backgroundColor: viewProfile.color }}>
                {viewProfile.avatar ? <img src={viewProfile.avatar} alt={viewProfile.name} className="w-full h-full object-cover" /> : viewProfile.name?.[0] || '?'}
              </span>
              <span className="font-medium">{viewProfile.name}</span>
              <span className="text-xs text-cyan-300">Lv. {viewProfileLevel}</span>
            </span>
          </div>

          {/* Level & XP Progress — of the first selected player */}
          <Card className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/30 mb-4">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-bold text-purple-400">Lv.{viewProfileLevel}</div>
                  <div>
                    <div className="text-sm font-medium">{levelInfo.title}</div>
                    <div className="text-xs text-white/60">{viewProfileXP.toLocaleString()} XP</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-white/60">{t('dailyChallengeScreen.nextLevel')}</div>
                  <div className="text-sm font-medium">{levelInfo.nextLevel.toLocaleString()} XP</div>
                </div>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
                  style={{ width: `${levelInfo.progress}%` }}
                />
              </div>

              {/* Weekly Progress Calendar (per viewed player) */}
              {playerStats.weeklyProgress && playerStats.weeklyProgress.length === 7 && (
                <div className="mt-4">
                  <div className="flex justify-between gap-1">
                    {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((day, idx) => (
                      <div key={day} className="text-center">
                        <div className="text-xs text-white/40 mb-1">{day}</div>
                        <div className={`w-6 h-6 mx-auto rounded-full flex items-center justify-center text-xs ${
                          playerStats.weeklyProgress[idx] ? 'bg-green-500 text-white' : 'bg-white/10 text-white/30'
                        }`}>
                          {playerStats.weeklyProgress[idx] ? '✓' : '·'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Streak & Stats Row — of the viewed player */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-orange-500/20 to-yellow-500/20 border-orange-500/30">
              <CardContent className="pt-4 text-center">
                <div className="text-3xl mb-1">🔥</div>
                <div className="text-2xl font-bold text-orange-400">{playerStats.currentStreak}</div>
                <div className="text-xs text-white/60">{t('dailyChallengeScreen.dayStreak')}</div>
              </CardContent>
            </Card>
            <Card className="bg-white/5 border-white/10">
              <CardContent className="pt-4 text-center">
                <div className="text-3xl mb-1">🏆</div>
                <div className="text-2xl font-bold text-amber-400">{playerStats.longestStreak}</div>
                <div className="text-xs text-white/60">{t('dailyChallengeScreen.bestStreak')}</div>
              </CardContent>
            </Card>
            <Card className="bg-white/5 border-white/10">
              <CardContent className="pt-4 text-center">
                <div className="text-3xl mb-1">✅</div>
                <div className="text-2xl font-bold text-green-400">{playerStats.totalCompleted}</div>
                <div className="text-xs text-white/60">{t('dailyChallengeScreen.completed')}</div>
              </CardContent>
            </Card>
          </div>
        </section>
      )}
        </>
      )}
    </div>
  );
}
