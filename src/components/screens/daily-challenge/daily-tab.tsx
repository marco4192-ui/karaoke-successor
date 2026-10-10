'use client';

// Daily Challenge Screen — TAB: Daily Challenges (5 slots)
//
// Same 3-step structure: player (step 1, top) → pick a daily slot → pick a song.

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/lib/i18n/translations';
import {
  getDailyType,
  getDailyTargetFor,
  isDailySlotUnlocked,
  getSlotMetDifficulties,
  interpolateChallengeText,
  getPlayerBestResult,
  getBestResultMetric,
  XP_REWARDS,
  DAILY_SLOT_XP_BONUS,
  getDailyDifficultyMultiplier,
  DAILY_DIFFICULTIES,
  DAILY_SLOTS_PER_DAY,
} from '@/lib/game/daily-challenge';
import {
  typeName,
  formatDailyValue,
  difficultyChipClass,
  tierChipClass,
  TIER_ICONS,
  TIER_LABEL_KEYS,
} from './helpers';
import type { DailyChallengeScreenData } from './use-daily-challenge-data';

interface DailyTabProps {
  data: DailyChallengeScreenData;
}

export function DailyTab({ data }: DailyTabProps) {
  const { t } = useTranslation();
  const {
    slotProgress,
    metDifficulties,
    selectedDifficulty,
    changeDifficulty,
    allDifficultiesDone,
    dailySlots,
    challengePlayerId,
    scalingProfile,
    playSlot,
    activateSlot,
    playAreaRef,
    playAreaHighlighted,
    completedToday,
    challenge,
    typeDef,
    challengeDescription,
    challengeXP,
    slotCategoryEmpty,
    songChoices,
    setSongRefreshKey,
    handlePlaySong,
    evaluationMode,
    setEvaluationMode,
    selectedPlayerIds,
    timeLeft,
    dailyBadgeTier,
    playerStats,
  } = data;

  return (
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
  );
}
