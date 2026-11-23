'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n/translations';
import {
  DAILY_DIFFICULTIES,
  getDailySlotTopScores,
  formatDailyMetric,
  type DailyDifficulty,
  type DailyTypeDefinition,
} from '@/lib/game/daily-challenge';
import type { OnlineDailyEntry } from '@/lib/leaderboard/types';
import { typeName, TOP3_MEDALS } from './daily-helpers';

/** Per-stage Top-3 of the daily play area: follows the played slot + the
 *  selected difficulty — Local (today's slot scores from localStorage) vs.
 *  Online (today's daily board, fetched once and cached by useOnlineTop3;
 *  per-stage/difficulty filtering is client-side and direction-aware — 'min'
 *  types sort ascending). */
export function Top3Box({ slotIndex, slotType, typeDef, selectedDifficulty, top3Source, setTop3Source, onlineTop3, onlineTop3Loading, onlineTop3Error, onRetryOnline, top3ReloadKey }: {
  /** 0-based index of the played slot (rendered 1-based) */
  slotIndex: number;
  /** Challenge type of the played slot (e.g. 'score') */
  slotType: string;
  typeDef: DailyTypeDefinition;
  selectedDifficulty: DailyDifficulty;
  top3Source: 'local' | 'online';
  setTop3Source: (source: 'local' | 'online') => void;
  onlineTop3: OnlineDailyEntry[] | null;
  onlineTop3Loading: boolean;
  onlineTop3Error: string | null;
  onRetryOnline: () => void;
  /** Bumped on window focus so freshly recorded local scores appear */
  top3ReloadKey: number;
}) {
  const { t } = useTranslation();

  // Local: today's best attempts for this stage + difficulty (synchronous).
  const localTop3Rows = useMemo(
    () => getDailySlotTopScores(slotIndex, slotType, selectedDifficulty, 3),
    [slotIndex, slotType, selectedDifficulty, top3ReloadKey],
  );
  // Online: today's cached board filtered to this stage + difficulty
  // (direction-aware — 'min' types sort ascending).
  const onlineTop3Rows = useMemo(() => {
    if (!onlineTop3) return [] as OnlineDailyEntry[];
    return onlineTop3
      .filter(e => e.challenge_type === slotType && e.difficulty === selectedDifficulty)
      .sort((a, b) => (typeDef.direction === 'min' ? a.metric_value - b.metric_value : b.metric_value - a.metric_value))
      .slice(0, 3);
  }, [onlineTop3, slotType, selectedDifficulty, typeDef.direction]);

  return (
    <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-3" data-testid="daily-top3-box">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <span className="text-xs font-medium text-white/70 truncate">
          🏆 {t('dailyChallengeScreen.top3Title')} · {slotIndex + 1}. {typeName(typeDef, t)} · {DAILY_DIFFICULTIES.find(d => d.id === selectedDifficulty)?.icon}
        </span>
        <div className="flex gap-1 bg-white/5 rounded-lg p-1 border border-white/10 shrink-0">
          <button
            type="button"
            onClick={() => setTop3Source('local')}
            data-testid="daily-top3-local"
            className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium transition-all ${
              top3Source === 'local' ? 'bg-cyan-500 text-white' : 'text-white/60 hover:text-white'
            }`}
          >
            {t('dailyChallengeScreen.localBoard')}
          </button>
          <button
            type="button"
            onClick={() => setTop3Source('online')}
            data-testid="daily-top3-online"
            className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium transition-all ${
              top3Source === 'online' ? 'bg-cyan-500 text-white' : 'text-white/60 hover:text-white'
            }`}
          >
            🌐 {t('dailyChallengeScreen.onlineBoard')}
          </button>
        </div>
      </div>

      {top3Source === 'local' ? (
        localTop3Rows.length === 0 ? (
          <p className="text-xs text-white/40 py-2 text-center" data-testid="daily-top3-empty">
            {t('dailyChallengeScreen.top3Empty')}
          </p>
        ) : (
          <div className="space-y-1">
            {localTop3Rows.map((row, i) => (
              <div
                key={row.playerId}
                data-testid={`daily-top3-row-${i}`}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border ${
                  i === 0 ? 'bg-amber-500/15 border-amber-500/25'
                  : i === 1 ? 'bg-gray-400/15 border-gray-400/25'
                  : 'bg-orange-700/15 border-orange-700/25'
                }`}
              >
                <span className="w-5 text-sm shrink-0" aria-hidden>{TOP3_MEDALS[i]}</span>
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: row.playerColor }} />
                <span className="text-xs font-medium text-white/85 truncate flex-1 min-w-0">{row.playerName}</span>
                <span className="text-xs font-bold text-white/90 shrink-0">{formatDailyMetric(typeDef.metricKey, row.metric)}</span>
              </div>
            ))}
          </div>
        )
      ) : onlineTop3Loading ? (
        <div className="flex items-center justify-center gap-2 py-2 text-white/50" data-testid="daily-top3-online-loading">
          <span className="animate-spin inline-block w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full" aria-hidden />
          <span className="text-xs">{t('dailyChallengeScreen.top3OnlineLoading')}</span>
        </div>
      ) : onlineTop3Error ? (
        <div className="flex flex-col items-center gap-2 py-2" data-testid="daily-top3-online-error">
          <p className="text-xs text-amber-400/90 text-center">{t('dailyChallengeScreen.top3OnlineError')}</p>
          <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs border-white/20" onClick={onRetryOnline}>
            {t('dailyChallengeScreen.top3Retry')}
          </Button>
        </div>
      ) : onlineTop3Rows.length === 0 ? (
        <p className="text-xs text-white/40 py-2 text-center" data-testid="daily-top3-empty">
          {t('dailyChallengeScreen.top3Empty')}
        </p>
      ) : (
        <div className="space-y-1">
          {onlineTop3Rows.map((entry, i) => (
            <div
              key={entry.profile_uid}
              data-testid={`daily-top3-row-${i}`}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border ${
                i === 0 ? 'bg-amber-500/15 border-amber-500/25'
                : i === 1 ? 'bg-gray-400/15 border-gray-400/25'
                : 'bg-orange-700/15 border-orange-700/25'
              }`}
            >
              <span className="w-5 text-sm shrink-0" aria-hidden>{TOP3_MEDALS[i]}</span>
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color || '#8B5CF6' }} />
              <span className="text-xs font-medium text-white/85 truncate flex-1 min-w-0">{entry.display_name}</span>
              <span className="text-xs font-bold text-white/90 shrink-0">{formatDailyMetric(typeDef.metricKey, entry.metric_value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
