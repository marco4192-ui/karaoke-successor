'use client';

import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/lib/i18n/translations';
import { getAllSongs } from '@/lib/game/song-library';
import {
  getWeeklySlots,
  getWeeklyChallengeForSlot,
  getPlayerWeeklySlotProgress,
  isWeeklySlotUnlocked,
  isWeeklyChallengeCompletedToday,
  getTimeUntilWeeklyReset,
  getWeeklyBadgeTierThisWeek,
  getDailyDifficultyMultiplier,
  interpolateChallengeText,
  WEEKLY_SLOTS_PER_WEEK,
  WEEKLY_SLOT_XP,
  type DailyDifficulty,
} from '@/lib/game/daily-challenge';
import { matchesDailyCategory } from '@/lib/game/challenge-pools';
import { FlagAwareEmoji } from '@/components/screens/character/country-picker';
import type { PlayerProfile, Song, GameMode } from '@/types/game';
import { shuffleArray } from '@/lib/utils';
import { songToContext, typeName } from './daily-helpers';
import { usePersistentDifficulty } from './use-persistent-difficulty';
import { useScrollHighlight } from './use-scroll-highlight';
import { StepHeader } from './step-header';
import { DifficultySelectorCard } from './difficulty-selector-card';
import { ChallengeSlotCard } from './challenge-slot-card';
import { SongChoiceCard } from './song-choice-card';

/** TAB: Weekly Challenges (5 slots, own difficulty) — same 3-step structure
 *  as the daily tab: player (step 1, top of the screen) → pick a weekly slot
 *  → pick a song. Weekly slots count every sung song automatically, so
 *  playing from here is pure convenience (no daily flag needed — the
 *  post-game processor submits each result to the weekly engine). */
export function WeeklyTab({ challengePlayerId, viewProfile, viewProfileLevel, selectedPlayerIds, setupGamePlayers, onPlayChallenge }: {
  /** First selected player — owns the weekly progress */
  challengePlayerId: string | undefined;
  viewProfile: PlayerProfile | undefined;
  viewProfileLevel: number;
  selectedPlayerIds: string[];
  setupGamePlayers: (secondPlayer: boolean) => boolean;
  onPlayChallenge: (song: Song, options?: { gameMode?: GameMode; playerIds?: string[] }) => void;
}) {
  const { t, language } = useTranslation();
  const { toast } = useToast();

  // Weekly tab: the slot picked for playing (unfolds the song selection)
  const [selectedWeeklySlot, setSelectedWeeklySlot] = useState<number | null>(null);
  // Weekly song choices regeneration key (shuffle button)
  const [weeklySongRefreshKey, setWeeklySongRefreshKey] = useState(0);
  // Weekly difficulty — separate selector, also independent of the global difficulty
  const [weeklyDifficulty, changeWeeklyDifficulty] = usePersistentDifficulty('karaoke_weekly_difficulty');
  // Same scroll+highlight mechanics as the daily play area
  const weeklyPlayArea = useScrollHighlight();
  const { scrollTo: scrollToWeeklyPlayArea } = weeklyPlayArea;

  // ── Weekly slot data ──
  const weeklySlots = useMemo(() => getWeeklySlots(), []);
  const weeklyProgress = challengePlayerId ? getPlayerWeeklySlotProgress(challengePlayerId) : { weekKey: '', completedSlots: [], metBySlot: {} };
  const weeklyBadgeTier = challengePlayerId ? getWeeklyBadgeTierThisWeek(challengePlayerId) : 'none';
  const weeklyCompletedToday = viewProfile ? isWeeklyChallengeCompletedToday(viewProfile.id) : false;
  const weeklyReset = getTimeUntilWeeklyReset();

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
    scrollToWeeklyPlayArea();
  }, [scrollToWeeklyPlayArea, t]);

  // Handler (weekly tab): play a song toward the weekly challenges
  const handlePlayWeeklySong = useCallback((song: Song) => {
    if (!setupGamePlayers(true)) return;
    const gameMode: GameMode = selectedPlayerIds.length >= 2 ? 'duel' : 'standard';
    onPlayChallenge(song, { gameMode, playerIds: selectedPlayerIds });
  }, [setupGamePlayers, selectedPlayerIds, onPlayChallenge]);

  return (
    <div className="space-y-4 mb-6">
      {/* ── STEP 2 · Challenge wählen ── */}
      <StepHeader
        step={2}
        testId="weekly-step-2"
        title={t('dailyChallengeScreen.stepChallenge')}
        hint={t('dailyChallengeScreen.weeklyPickSlot')}
        right={<span className="text-xs text-white/40 shrink-0">{t('dailyChallengeScreen.resetsIn')} {weeklyReset.days}d {weeklyReset.hours}h</span>}
      />

      {/* Weekly difficulty selector — independent from daily + global */}
      <DifficultySelectorCard
        variant="weekly"
        selected={weeklyDifficulty}
        onSelect={changeWeeklyDifficulty}
        completedCount={weeklyProgress.completedSlots.length}
        footer={
          <div className="mt-3 text-xs text-white/50">
            {t('dailyChallengeScreen.weeklyCountsAutomatically')} · {t('dailyChallengeScreen.resetsIn')} {weeklyReset.days}d {weeklyReset.hours}h
          </div>
        }
      />

      {/* The 5 weekly slots — selectable, they unfold the song area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {weeklySlots.slice(0, WEEKLY_SLOTS_PER_WEEK).map((slotData) => {
          const slotInfo = getWeeklyChallengeForSlot(slotData.slot, viewProfileLevel, weeklyDifficulty);
          const unlocked = isWeeklySlotUnlocked(slotData.slot, challengePlayerId);
          const completed = weeklyProgress.completedSlots.includes(slotData.slot);
          const slotMet = (weeklyProgress.metBySlot[String(slotData.slot)] ?? []) as DailyDifficulty[];
          const slotXP = Math.round(WEEKLY_SLOT_XP[Math.min(slotData.slot, WEEKLY_SLOT_XP.length - 1)] * getDailyDifficultyMultiplier(weeklyDifficulty));
          return (
            <ChallengeSlotCard
              key={slotData.slot}
              variant="weekly"
              slot={slotData.slot}
              def={slotInfo.def}
              target={slotInfo.target}
              unlocked={unlocked}
              completed={completed}
              selected={selectedWeeklySlot === slotData.slot}
              slotMet={slotMet}
              slotXP={slotXP}
              aggregationLabel={slotInfo.def.aggregation === 'sum' ? t('dailyChallengeScreen.weeklySumType') : t('dailyChallengeScreen.weeklyBestType')}
              onActivate={() => activateWeeklySlot(slotData.slot, unlocked, completed)}
            />
          );
        })}
      </div>

      {/* ── STEP 3 · Song wählen — folds out when a weekly slot is picked ── */}
      {selectedWeeklySlot !== null && (() => {
        const slotInfo = getWeeklyChallengeForSlot(selectedWeeklySlot, viewProfileLevel, weeklyDifficulty);
        const wDef = slotInfo.def;
        return (
          <div
            ref={weeklyPlayArea.ref}
            className="scroll-mt-28 animate-in fade-in slide-in-from-top-2 duration-300"
            data-testid="weekly-play-area"
          >
            <StepHeader
              step={3}
              testId="weekly-step-3"
              className="mb-3"
              title={
                <>
                  {t('dailyChallengeScreen.stepSong')}
                  <span className="ml-2 text-white/60 font-normal">— {selectedWeeklySlot + 1}. <FlagAwareEmoji text={wDef.icon} flagClassName="h-3.5 w-5" /> {typeName(wDef, t)}</span>
                </>
              }
              hint={
                <>
                  {interpolateChallengeText(t(wDef.descriptionKey), wDef.descriptionParams, slotInfo.target, wDef.metricKey)} · {wDef.aggregation === 'sum' ? t('dailyChallengeScreen.weeklySumType') : t('dailyChallengeScreen.weeklyBestType')}
                </>
              }
              right={
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/20 h-7 px-2 text-xs shrink-0"
                  onClick={() => setWeeklySongRefreshKey(k => k + 1)}
                  title={t('dailyChallengeScreen.shuffleSongs')}
                >
                  🔄 {t('dailyChallengeScreen.shuffleSongs')}
                </Button>
              }
            />
            <Card className={`bg-white/5 border-white/10 transition-all duration-700 ${weeklyPlayArea.highlighted ? 'ring-2 ring-cyan-400 shadow-[0_0_36px_rgba(34,211,238,0.35)]' : ''}`}>
              <CardContent className="pt-4">
                {weeklySongChoices.length === 0 ? (
                  <p className="text-sm text-white/50 py-2">{t('dailyChallengeScreen.noMatchingSongs')}</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                    {weeklySongChoices.map((song, idx) => (
                      <SongChoiceCard key={song.id || idx} song={song} onClick={() => handlePlayWeeklySong(song)} testId={`weekly-song-${idx}`} />
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
  );
}
