'use client';

// Daily Challenge Screen — TAB: Weekly Challenges (5 slots, own difficulty)
//
// Same 3-step structure as the daily tab: player (step 1, top) → pick a
// weekly slot → pick a song. Weekly slots count every sung song
// automatically, so playing from here is pure convenience.

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/lib/i18n/translations';
import {
  isWeeklySlotUnlocked,
  getWeeklyChallengeForSlot,
  interpolateChallengeText,
  WEEKLY_SLOT_XP,
  getDailyDifficultyMultiplier,
  DAILY_DIFFICULTIES,
  WEEKLY_SLOTS_PER_WEEK,
  type DailyDifficulty,
} from '@/lib/game/daily-challenge';
import {
  typeName,
  formatDailyValue,
  difficultyChipClass,
  tierChipClass,
  TIER_LABEL_KEYS,
} from './helpers';
import type { DailyChallengeScreenData } from './use-daily-challenge-data';

interface WeeklyTabProps {
  data: DailyChallengeScreenData;
}

export function WeeklyTab({ data }: WeeklyTabProps) {
  const { t } = useTranslation();
  const {
    weeklyProgress,
    weeklyDifficulty,
    changeWeeklyDifficulty,
    weeklySlots,
    challengePlayerId,
    viewProfileLevel,
    weeklyReset,
    selectedWeeklySlot,
    activateWeeklySlot,
    weeklyPlayAreaRef,
    weeklyHighlighted,
    weeklySongChoices,
    setWeeklySongRefreshKey,
    handlePlayWeeklySong,
    weeklyBadgeTier,
    weeklyCompletedToday,
  } = data;

  return (
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
  );
}
