'use client';

// Daily Challenge Screen — player progress section (bottom)
//
// ALWAYS follows the FIRST selected player — no duplicate statistics player
// selection.

import { Card, CardContent } from '@/components/ui/card';
import { useTranslation } from '@/lib/i18n/translations';
import type { DailyChallengeScreenData } from './use-daily-challenge-data';

interface PlayerProgressSectionProps {
  data: DailyChallengeScreenData;
}

export function PlayerProgressSection({ data }: PlayerProgressSectionProps) {
  const { t } = useTranslation();
  const {
    viewProfile,
    viewProfileLevel,
    viewProfileXP,
    levelInfo,
    playerStats,
  } = data;

  if (!viewProfile) return null;

  return (
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
  );
}
