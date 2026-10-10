'use client';

// Daily Challenge Screen — TAB: Badges & Quests

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/lib/i18n/translations';
import { DAILY_BADGES, getActiveQuests, claimQuestReward } from '@/lib/game/daily-challenge';
import type { DailyChallengeScreenData } from './use-daily-challenge-data';

interface BadgesTabProps {
  data: DailyChallengeScreenData;
}

export function BadgesTab({ data }: BadgesTabProps) {
  const { t } = useTranslation();
  const { playerStats, slotProgress, weeklyProgress, viewProfile } = data;

  return (
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
  );
}
