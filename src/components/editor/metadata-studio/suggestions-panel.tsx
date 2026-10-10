'use client';

/**
 * Suggestion list + apply-all flow for the Metadata Studio (AI modes).
 *
 * Split out of metadata-studio.tsx (R3 refactor):
 *  - SuggestionsPanel: confidence filter + stats line, the per-song
 *    suggestion rows (SuggestionRow) and the dismiss / apply-all bar.
 *  - ApplyAllWarningDialog: the confirmation modal before apply-all writes
 *    (txt mode modifies source files, local mode wipes on library reset).
 */

import { Button } from '@/components/ui/button';
import { ConfidenceFilter, SuggestionRow } from '@/components/editor/harmonize-shared';
import type { HarmonizeStats, HarmonizeSuggestion } from '@/lib/ai/harmonize-client';
import type { StudioProgress, StudioTranslate, StudioWriteTarget } from './types';

interface SuggestionsPanelProps {
  suggestions: HarmonizeSuggestion[];
  stats: HarmonizeStats | null;
  minConfidence: number;
  onMinConfidenceChange: (value: number) => void;
  /** Songs that would be touched by "apply all" at this threshold. */
  applicableCount: number;
  applyProgress: StudioProgress | null;
  /** Apply a single field row (✓ button in a suggestion row). */
  onApplySingle: (songId: string, field: 'genre' | 'language' | 'year', value: string | number) => void;
  /** Dismiss the suggestion list. */
  onDismiss: () => void;
  /** Open the apply-all confirmation dialog. */
  onRequestApplyAll: () => void;
  t: StudioTranslate;
}

export function SuggestionsPanel({
  suggestions,
  stats,
  minConfidence,
  onMinConfidenceChange,
  applicableCount,
  applyProgress,
  onApplySingle,
  onDismiss,
  onRequestApplyAll,
  t,
}: SuggestionsPanelProps) {
  return (
    <>
      <div className="flex items-center justify-between gap-2 flex-wrap pb-1 border-b border-white/10">
        <ConfidenceFilter value={minConfidence} onChange={onMinConfidenceChange} t={t} />
        {stats && (
          <p className="text-[10px] text-white/40 truncate">
            {t('editor.aiBatchStatsLine')
              .replace('{cache}', String(stats.fromCache))
              .replace('{facts}', String(stats.factualHits))
              .replace('{ai}', String(stats.total - stats.fromCache))}
          </p>
        )}
      </div>
      <div className="space-y-2 max-h-72 overflow-y-auto pr-1" data-testid="studio-suggestions">
        {suggestions.map(s => (
          <SuggestionRow
            key={s.songId}
            suggestion={s}
            minConfidence={minConfidence}
            onApply={onApplySingle}
          />
        ))}
      </div>
      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          variant="outline"
          onClick={onDismiss}
          className="flex-1 border-white/20 text-white/80 hover:bg-white/10 text-xs"
          data-testid="studio-dismiss"
        >
          {t('editor.aiBatchClose')}
        </Button>
        <Button
          size="sm"
          onClick={onRequestApplyAll}
          disabled={applicableCount === 0 || !!applyProgress}
          className="flex-1 bg-green-500 hover:bg-green-400 text-black font-semibold text-xs disabled:opacity-40"
          data-testid="studio-apply-all"
        >
          {t('editor.aiApplyAll')} ({applicableCount}
          {applicableCount !== suggestions.length ? `/${suggestions.length}` : ''})
        </Button>
      </div>
    </>
  );
}

interface ApplyAllWarningDialogProps {
  writeTarget: StudioWriteTarget;
  /** Songs that would be touched by "apply all" at this threshold. */
  applicableCount: number;
  minConfidence: number;
  applyProgress: StudioProgress | null;
  onApplyAll: () => void;
  onCancel: () => void;
  t: StudioTranslate;
}

/** Apply-all warning (txt mode modifies source files). */
export function ApplyAllWarningDialog({
  writeTarget,
  applicableCount,
  minConfidence,
  applyProgress,
  onApplyAll,
  onCancel,
  t,
}: ApplyAllWarningDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
      <div className="bg-gray-900 border border-white/20 rounded-xl p-5 max-w-md w-full mx-4 space-y-4 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-xl">⚠️</span>
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">{t('editor.aiHarmonizeWarnTitle')}</h3>
            <p className="text-white/60 text-xs mt-0.5">{t('editor.aiHarmonizeWarnSubtitle')}</p>
          </div>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-white/70 space-y-2">
          {writeTarget === 'txt' ? (
            <>
              <p>{t('editor.aiHarmonizeWarn1')}</p>
              <ul className="list-disc list-inside space-y-1 text-white/60">
                <li>{t('editor.aiHarmonizeWarn2')}</li>
                <li>{t('editor.aiHarmonizeWarn3')}</li>
                <li>{t('editor.aiHarmonizeWarn4')}</li>
              </ul>
            </>
          ) : (
            <p>{t('editor.studioWriteLocalWarn').replace('{count}', String(applicableCount))}</p>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-white/50">
          <span className="px-2 py-0.5 rounded bg-white/10 font-mono">{applicableCount}</span>
          <span>{t('editor.aiHarmonizeWarnCount')}</span>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-white/50 bg-violet-500/10 border border-violet-500/20 rounded-lg px-3 py-2">
          <span>🛡️</span>
          <span>{t('editor.aiBatchThresholdNote').replace('{value}', String(minConfidence))}</span>
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={!!applyProgress}
            className="flex-1 border-white/20 text-white/80 hover:bg-white/10 text-xs"
          >
            {t('editor.aiHarmonizeWarnCancel')}
          </Button>
          <Button
            onClick={onApplyAll}
            disabled={!!applyProgress}
            className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs"
          >
            {applyProgress
              ? `${applyProgress.done}/${applyProgress.total}`
              : t('editor.aiHarmonizeWarnConfirm')}
          </Button>
        </div>
      </div>
    </div>
  );
}
