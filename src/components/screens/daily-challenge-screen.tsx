'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { StorageKeys, setJson } from '@/lib/storage';
import { useGameStore } from '@/lib/game/store';
import { useTranslation } from '@/lib/i18n/translations';
import { getAllSongs } from '@/lib/game/song-library';
import {
  getDailySlots,
  getPlayerDailySlotProgress,
  getDailyChallengeForSlot,
  getTimeUntilReset,
  isChallengeCompletedToday,
  getCompletedDifficultiesToday,
  getSlotMetDifficulties,
  XP_REWARDS,
  getPlayerBestResult,
  getBestResultMetric,
  getDailyType,
  getDailyTargetFor,
  getDailyDifficultyMultiplier,
  DAILY_DIFFICULTIES,
  DAILY_SLOTS_PER_DAY,
  DAILY_SLOT_XP_BONUS,
  interpolateChallengeText,
  isDailySlotUnlocked,
  getActiveDailySlot,
  getDailyBadgeTierToday,
  getPlayerDailyStats,
  type DailyDifficulty,
} from '@/lib/game/daily-challenge';
import { matchesDailyCategory } from '@/lib/game/challenge-pools';
import { FlagAwareEmoji } from '@/components/screens/character/country-picker';
import { Song, GameMode } from '@/types/game';
import { shuffleArray } from '@/lib/utils';
import { songToContext, typeName, formatDailyValue, TIER_ICONS, TIER_LABEL_KEYS } from './daily/daily-helpers';
import { usePersistentDifficulty } from './daily/use-persistent-difficulty';
import { useScrollHighlight } from './daily/use-scroll-highlight';
import { useOnlineTop3 } from './daily/use-online-top3';
import { StepHeader } from './daily/step-header';
import { DifficultySelectorCard } from './daily/difficulty-selector-card';
import { ChallengeSlotCard } from './daily/challenge-slot-card';
import { Top3Box } from './daily/top3-box';
import { SongChoiceCard } from './daily/song-choice-card';
import { WeeklyTab } from './daily/weekly-tab';
import { ModesTab } from './daily/modes-tab';
import { BadgesTab } from './daily/badges-tab';
import { PlayerProgressSection } from './daily/player-progress-section';

// ===================== DAILY CHALLENGE SCREEN =====================
export function DailyChallengeScreen({ onPlayChallenge }: { onPlayChallenge: (_song: Song, _options?: { gameMode?: GameMode; playerIds?: string[] }) => void }) {
  const { t, language } = useTranslation();
  const { toast } = useToast();
  const { profiles, setActiveProfile, addPlayer, setPlayers } = useGameStore();
  const [activeTab, setActiveTab] = useState<'challenge' | 'weekly' | 'modes' | 'badges'>('challenge');

  // ── Slot activation UX: clicking a slot card selects it, scrolls the play
  //    area into view and briefly highlights it so the action is visible. ──
  const playArea = useScrollHighlight();
  const { scrollTo: scrollToPlayArea } = playArea;

  // ── Anchor point (guided flow): after a selection the user gets "pulled"
  //    (smooth-scrolled) to the next step of the flow. Picking the FIRST
  //    player unfolds the tab bar + challenge selection — pull the user down
  //    to the tabs (see togglePlayer). ──
  const tabsAnchor = useScrollHighlight();
  const { scrollTo: scrollToTabs } = tabsAnchor;

  // Which daily slot is targeted for play (defaults to the active slot)
  const [selectedSlot, setSelectedSlot] = useState<number>(0);

  // ── STEP 1: player selection (1–2 players) — deliberately starts EMPTY so
  //    the guided flow (player → challenge → song) always begins at the top.
  //    The FIRST selected player owns the statistics section at the bottom. ──
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  // Evaluation mode when two players are selected: duel (individual) or team (average)
  const [evaluationMode, setEvaluationMode] = useState<'duel' | 'coop'>('duel');

  // Selected daily difficulty — independent of the global game difficulty.
  const [selectedDifficulty, changeDifficulty] = usePersistentDifficulty('karaoke_daily_difficulty');

  // Song choice regeneration key (shuffle button)
  const [songRefreshKey, setSongRefreshKey] = useState(0);

  // ── Per-stage Top-3 box (daily play area): local slot scores vs. today's
  //    online daily board. ──
  const top3 = useOnlineTop3();

  const activeProfiles = useMemo(() => profiles.filter(p => p.isActive !== false), [profiles]);

  // The FIRST selected player owns the bottom progress/statistics section —
  // no separate statistics player switcher (single source of truth).
  const viewProfile = profiles.find(p => p.id === selectedPlayerIds[0]);
  const viewProfileLevel = viewProfile?.level || 1;
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

  // Live-updating challenge description for the played slot
  const challengeDescription = interpolateChallengeText(
    t(typeDef.descriptionKey), typeDef.descriptionParams, challenge.target, typeDef.metricKey,
  );

  // Best result of the first selected player for the played slot (if any) —
  // rendered next to the target box in the play area (grid md:grid-cols-2).
  const bestResult = (() => {
    const first = selectedPlayerIds[0];
    if (!first) return null;
    const best = getPlayerBestResult(first);
    if (!best || best.slot !== playSlot) return null;
    const currentMetric = getBestResultMetric(best, challenge.type);
    const target = challenge.target;
    const pct = typeDef.direction === 'min'
      ? (currentMetric <= target ? 100 : Math.min(99, Math.round((target / Math.max(1, currentMetric)) * 100)))
      : Math.min(100, Math.round((currentMetric / target) * 100));
    const remaining = typeDef.direction === 'min'
      ? Math.max(0, currentMetric - target)
      : Math.max(0, target - currentMetric);
    return { currentMetric, target, pct, remaining };
  })();

  // ── Per-stage Top-3 (play area): follows the played slot + the selected
  //    difficulty — recomputed individually per stage, no shared state. ──
  const top3SlotType = dailySlots[playSlot]?.type ?? 'score';

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
      scrollToTabs();
    }
  };

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
    scrollToPlayArea();
  }, [scrollToPlayArea, t]);

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

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8" data-testid="daily-challenge-screen">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold mb-2" data-testid="daily-challenge-title">{t('dailyChallengeScreen.title')}</h1>
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
                          className="absolute -bottom-1 -right-1 px-1 py-0 rounded-full text-[8px] font-black bg-cyan-400 text-black shadow-[0_0_10px_rgba(34,211,238,0.6)]"
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
      {/* ── Tab navigation (top) — anchor point after the first player pick:
          scrolled into view + highlight pulse (see togglePlayer) ── */}
      <div
        ref={tabsAnchor.ref}
        className={`flex gap-2 mb-6 flex-wrap scroll-mt-28 rounded-xl transition-all duration-700 ${
          tabsAnchor.highlighted ? 'ring-2 ring-cyan-400 shadow-[0_0_36px_rgba(34,211,238,0.35)]' : ''
        }`}
        role="tablist"
        aria-label={t('dailyChallengeScreen.title')}
      >
        {([
          ['challenge', 'dailyChallengeScreen.challenges'],
          ['weekly', 'dailyChallengeScreen.weeklyChallenge'],
          ['modes', 'dailyChallengeScreen.challengeModes'],
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
          <StepHeader
            step={2}
            testId="daily-step-2"
            title={t('dailyChallengeScreen.stepChallenge')}
            hint={t('dailyChallengeScreen.dailyActiveStartHint')}
          />

          {/* ── Difficulty selector — independent of the global game difficulty.
              Switching updates targets, descriptions and XP of ALL slots instantly. ── */}
          <DifficultySelectorCard
            variant="daily"
            selected={selectedDifficulty}
            onSelect={changeDifficulty}
            completedCount={slotProgress.completedSlots.length}
            metDifficulties={metDifficulties}
            footer={allDifficultiesDone && (
              <p className="text-xs text-green-400 mt-2">{t('dailyChallengeScreen.allDifficultiesDone')}</p>
            )}
          />

          {/* ── The 5 daily slots ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {dailySlots.slice(0, DAILY_SLOTS_PER_DAY).map((slotData) => {
              const def = getDailyType(slotData.type);
              const unlocked = isDailySlotUnlocked(slotData.slot, challengePlayerId);
              const completed = slotProgress.completedSlots.includes(slotData.slot);
              const slotMet = challengePlayerId ? getSlotMetDifficulties(challengePlayerId, slotData.slot) : [];
              const target = getDailyTargetFor(slotData.type, selectedDifficulty, scalingProfile?.level || 1);
              const slotXP = Math.round((slotData.slot === 0 ? XP_REWARDS.CHALLENGE_COMPLETE : DAILY_SLOT_XP_BONUS[Math.min(slotData.slot - 1, DAILY_SLOT_XP_BONUS.length - 1)]) * getDailyDifficultyMultiplier(selectedDifficulty));
              return (
                <ChallengeSlotCard
                  key={slotData.slot}
                  variant="daily"
                  slot={slotData.slot}
                  def={def}
                  target={target}
                  unlocked={unlocked}
                  completed={completed}
                  selected={playSlot === slotData.slot}
                  slotMet={slotMet}
                  slotXP={slotXP}
                  onActivate={() => activateSlot(slotData.slot, unlocked, completed)}
                />
              );
            })}
          </div>

          {/* ── STEP 3 · Song wählen — folds out under the slot selection ── */}
          <div ref={playArea.ref} className="scroll-mt-28 animate-in fade-in slide-in-from-top-2 duration-300" data-testid="daily-play-area">
          <StepHeader
            step={3}
            testId="daily-step-3"
            className="mb-3"
            title={
              <>
                {t('dailyChallengeScreen.stepSong')}
                <span className="ml-2 text-white/60 font-normal">— {playSlot + 1}. <FlagAwareEmoji text={typeDef.icon} flagClassName="h-3.5 w-5" /> {typeName(typeDef, t)}</span>
              </>
            }
            hint={challengeDescription}
            right={
              <Badge variant="outline" className="border-cyan-500 text-cyan-400 shrink-0">
                +{challengeXP} XP{getDailyDifficultyMultiplier(selectedDifficulty) !== 1 ? ` (×${getDailyDifficultyMultiplier(selectedDifficulty)})` : ''}
              </Badge>
            }
          />
          <Card className={`bg-white/5 border-white/10 transition-all duration-700 ${completedToday ? 'ring-1 ring-green-500/40' : ''} ${playArea.highlighted ? 'ring-2 ring-cyan-400 shadow-[0_0_36px_rgba(34,211,238,0.35)]' : ''}`}>
            <CardContent className="pt-4">
              {slotCategoryEmpty && (
                <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-300">
                  {t('dailyChallengeScreen.noMatchingSongs')}
                </div>
              )}

              {/* Target + best result of the first selected player — compact,
                  side by side on md+ screens (makes room for the Top-3 box) */}
              <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className={`p-3 bg-white/5 rounded-lg ${bestResult ? '' : 'md:col-span-2'}`}>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-white/60">{t('dailyChallengeScreen.target')}</span>
                    <span className="font-medium">{formatDailyValue(typeDef.metricKey, challenge.target)}</span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${completedToday ? 'bg-green-500' : 'bg-gradient-to-r from-cyan-500 to-purple-500'}`}
                      style={{ width: completedToday ? '100%' : '0%' }}
                    />
                  </div>
                </div>
                {bestResult && (
                  <div className="p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-white/60">{t('dailyChallengeScreen.bestResult')}</span>
                      <span className="font-medium text-cyan-400">
                        {formatDailyValue(typeDef.metricKey, bestResult.currentMetric)} / {formatDailyValue(typeDef.metricKey, bestResult.target)}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all" style={{ width: `${bestResult.pct}%` }} />
                    </div>
                    <div className="text-xs text-white/40 mt-1">
                      {bestResult.pct >= 100
                        ? t('dailyChallengeScreen.challengeComplete')
                        : t(typeDef.direction === 'min' ? 'dailyChallengeScreen.remainingFewer' : 'dailyChallengeScreen.remainingMore').replace('{n}', bestResult.remaining.toLocaleString())}
                    </div>
                  </div>
                )}
              </div>

              {/* ── Top 3 of exactly this stage + difficulty — Local vs. Online ── */}
              <Top3Box
                slotIndex={playSlot}
                slotType={top3SlotType}
                typeDef={typeDef}
                selectedDifficulty={selectedDifficulty}
                top3Source={top3.top3Source}
                setTop3Source={top3.setTop3Source}
                onlineTop3={top3.onlineTop3}
                onlineTop3Loading={top3.onlineTop3Loading}
                onlineTop3Error={top3.onlineTop3Error}
                onRetryOnline={() => void top3.loadOnlineTop3()}
                top3ReloadKey={top3.top3ReloadKey}
              />

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
                    <SongChoiceCard key={song.id || idx} song={song} onClick={() => handlePlaySong(song)} />
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

      {/* ══ TAB: Weekly Challenges — 3-step flow, own difficulty, every sung
          song counts automatically (see weekly-tab.tsx) ══ */}
      {activeTab === 'weekly' && (
        <WeeklyTab
          challengePlayerId={challengePlayerId}
          viewProfile={viewProfile}
          viewProfileLevel={viewProfileLevel}
          selectedPlayerIds={selectedPlayerIds}
          setupGamePlayers={setupGamePlayers}
          onPlayChallenge={onPlayChallenge}
        />
      )}

      {/* ══ TAB: Challenge Modes (71 modes, filter + completion) — played
          SOLO by the first selected player (see modes-tab.tsx) ══ */}
      {activeTab === 'modes' && (
        <ModesTab
          viewProfile={viewProfile}
          viewProfileLevel={viewProfileLevel}
          setupGamePlayers={setupGamePlayers}
          onPlayChallenge={onPlayChallenge}
        />
      )}

      {/* ══ TAB: Badges — tier progress, earned/available badges, quests ══ */}
      {activeTab === 'badges' && (
        <BadgesTab
          challengePlayerId={challengePlayerId}
          viewProfile={viewProfile}
          playerStats={playerStats}
        />
      )}

      {/* ── Player progress section (bottom): ALWAYS follows the FIRST
          selected player — no duplicate statistics player selection. ── */}
      {viewProfile && (
        <PlayerProgressSection viewProfile={viewProfile} playerStats={playerStats} />
      )}
        </>
      )}
    </div>
  );
}
