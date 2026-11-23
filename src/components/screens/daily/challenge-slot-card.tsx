'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n/translations';
import { FlagAwareEmoji } from '@/components/screens/character/country-picker';
import {
  DAILY_DIFFICULTIES,
  interpolateChallengeText,
  type DailyDifficulty,
  type DailyTypeDefinition,
  type WeeklyTypeDefinition,
} from '@/lib/game/daily-challenge';
import { typeName, formatDailyValue } from './daily-helpers';

/** One selectable slot card of the daily/weekly challenge grids. Clicking a
 *  card selects it (the parent scrolls its song area into view);
 *  locked/completed slots are rejected by the parent with a toast. Shared by
 *  both tabs with small visual differences (open-badge styling, weekly
 *  aggregation label). */
export function ChallengeSlotCard({ variant, slot, def, target, unlocked, completed, selected, slotMet, slotXP, aggregationLabel, onActivate }: {
  variant: 'daily' | 'weekly';
  /** 0-based slot index (rendered 1-based) */
  slot: number;
  def: DailyTypeDefinition | WeeklyTypeDefinition;
  target: number;
  unlocked: boolean;
  completed: boolean;
  /** This slot is the one currently set up for play */
  selected: boolean;
  /** Difficulties already met for this slot (icon checkmarks) */
  slotMet: DailyDifficulty[];
  slotXP: number;
  /** Weekly only: localized sum/best aggregation label */
  aggregationLabel?: string;
  onActivate: () => void;
}) {
  const { t } = useTranslation();

  const cardClassName = variant === 'daily'
    ? `bg-white/5 border-white/10 transition-all ${
        completed ? 'ring-2 ring-green-500 border-green-500/30 cursor-pointer'
        : selected ? 'ring-2 ring-cyan-500 cursor-pointer'
        : unlocked ? 'hover:border-cyan-500/50 cursor-pointer hover:bg-white/10'
        : 'cursor-not-allowed opacity-50'
      }`
    : `bg-white/5 transition-all ${
        completed ? 'ring-2 ring-green-500 border-green-500/30 cursor-pointer'
        : selected ? 'ring-2 ring-cyan-500 cursor-pointer'
        : unlocked ? 'border-white/10 hover:border-cyan-500/50 cursor-pointer hover:bg-white/10'
        : 'border-white/10 opacity-50 cursor-not-allowed'
      }`;

  return (
    <Card
      role="button"
      tabIndex={0}
      aria-label={`${slot + 1}. ${typeName(def, t)}`}
      data-testid={`${variant}-slot-card-${slot}`}
      onClick={onActivate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onActivate();
        }
      }}
      className={cardClassName}
    >
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-2xl flex-shrink-0" aria-hidden><FlagAwareEmoji text={def.icon} flagClassName="h-5 w-7" /></span>
            <div className="min-w-0">
              <div className="font-medium truncate">{slot + 1}. {typeName(def, t)}</div>
              <div className={variant === 'daily' ? 'text-xs text-white/50 truncate' : 'text-xs text-white/50'}>
                {interpolateChallengeText(t(def.descriptionKey), def.descriptionParams, target, def.metricKey)}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            {completed ? (
              <Badge className="bg-green-500/20 text-green-300 border border-green-500/40">✓ {t('dailyChallengeScreen.slotDone')}</Badge>
            ) : !unlocked ? (
              <Badge variant="outline" className="border-white/20 text-white/40">🔒 {t('dailyChallengeScreen.slotLocked')}</Badge>
            ) : selected ? (
              <Badge className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">▶ {t('dailyChallengeScreen.slotActive')}</Badge>
            ) : (
              <Badge variant="outline" className={variant === 'daily' ? 'border-white/20 text-white/60' : 'border-cyan-500/40 text-cyan-300'}>{t('dailyChallengeScreen.slotOpen')}</Badge>
            )}
            <span className="text-[10px] text-cyan-400/80">+{slotXP} XP</span>
          </div>
        </div>
        {/* Target + difficulty checkmarks for this slot */}
        <div className="flex items-center justify-between text-xs text-white/50">
          <span>
            {t('dailyChallengeScreen.target')}: <span className="text-white/80 font-medium">{formatDailyValue(def.metricKey, target)}</span>
          </span>
          {variant === 'daily' ? (
            slotMet.length > 0 && (
              <span className="flex gap-0.5">
                {DAILY_DIFFICULTIES.map(d => (
                  <span key={d.id} title={t(d.labelKey)} className={slotMet.includes(d.id) ? '' : 'opacity-20'}>{d.icon}</span>
                ))}
              </span>
            )
          ) : (
            <span className="flex items-center gap-2">
              {slotMet.length > 0 && (
                <span className="flex gap-0.5">
                  {DAILY_DIFFICULTIES.map(d => (
                    <span key={d.id} title={t(d.labelKey)} className={slotMet.includes(d.id) ? '' : 'opacity-20'}>{d.icon}</span>
                  ))}
                </span>
              )}
              {aggregationLabel && <span className="text-white/30">{aggregationLabel}</span>}
            </span>
          )}
        </div>
        {/* Explicit start affordance — jumps to the song area below */}
        {unlocked && !completed && (
          <Button
            size="sm"
            className="mt-3 w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white font-semibold"
            data-testid={`${variant}-slot-start-${slot}`}
            onClick={(e) => {
              e.stopPropagation();
              onActivate();
            }}
          >
            ▶ {t('dailyChallengeScreen.slotStart')}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
