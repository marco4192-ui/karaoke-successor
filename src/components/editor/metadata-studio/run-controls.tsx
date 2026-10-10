'use client';

/**
 * Run controls for the Metadata Studio.
 *
 * Split out of metadata-studio.tsx (R3 refactor):
 *  - RunControls: the Select-Songs / Deselect / Rule-Start / Run button row
 *    plus the selection hints and the measured batch-size recommendation.
 *  - BigBatchConfirmDialog: explicit time-estimate confirmation shown before
 *    an AI run with more songs than the recommended batch size.
 */

import { Button } from '@/components/ui/button';
import { SECONDS_PER_SONG_WORST_CASE, STUDIO_RECOMMENDED_BATCH } from './constants';
import type { StudioMode, StudioProgress, StudioScope, StudioTranslate } from './types';

interface RunControlsProps {
  mode: StudioMode;
  scope: StudioScope;
  /** Current multi-selection size. */
  selectionCount: number;
  /** Select mode is live (song cards show checkboxes). */
  selectMode: boolean;
  onToggleSelectMode: () => void;
  onClearSelection: () => void;
  /** The background rule job is currently running. */
  ruleRunning: boolean;
  /** Number of planned rule changes (genre + language). */
  rulePlanCount: number;
  /** Rule job progress (start-button label while running). */
  ruleJobDone: number;
  ruleJobTotal: number;
  /** Sequential apply progress (rule-local mode / apply-all). */
  applyProgress: StudioProgress | null;
  /** AI analysis job is running. */
  isLoading: boolean;
  /** No genre/language/year field selected at all. */
  noFieldsSelected: boolean;
  /** Songs the current run would analyze. */
  runSubsetCount: number;
  onRuleStart: () => void;
  onRunClick: () => void;
  t: StudioTranslate;
}

export function RunControls({
  mode,
  scope,
  selectionCount,
  selectMode,
  onToggleSelectMode,
  onClearSelection,
  ruleRunning,
  rulePlanCount,
  ruleJobDone,
  ruleJobTotal,
  applyProgress,
  isLoading,
  noFieldsSelected,
  runSubsetCount,
  onRuleStart,
  onRunClick,
  t,
}: RunControlsProps) {
  return (
    <>
      {/* ── Run / progress ── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Select-Songs button — moved INTO the studio (user request:
            it only serves the studio, so it lives next to Run). */}
        <Button
          size="sm"
          variant="outline"
          onClick={onToggleSelectMode}
          className={selectMode
            ? 'bg-violet-500 hover:bg-violet-400 border-violet-500 text-white font-semibold text-xs'
            : 'border-violet-400/40 text-violet-300 hover:bg-violet-500/15 hover:border-violet-300 text-xs'}
          data-testid="studio-select-songs"
        >
          {selectMode
            ? `✕ ${t('editor.exitSelectMode')}`
            : `☑️ ${t('editor.enterSelectMode')}${selectionCount > 0 ? ` (${selectionCount})` : ''}`}
        </Button>

        {/* Deselect — clears the whole multi-selection (user request:
            same prominence as Select, only enabled with a selection). */}
        <Button
          size="sm"
          variant="outline"
          onClick={onClearSelection}
          disabled={selectionCount === 0}
          title={selectionCount === 0 ? undefined : `${t('editor.studioDeselect')} (${selectionCount})`}
          className="border-violet-400/40 text-violet-300 hover:bg-violet-500/15 hover:border-violet-300 text-xs disabled:opacity-40"
          data-testid="studio-deselect-songs"
        >
          {t('editor.studioDeselect')}{selectionCount > 0 ? ` (${selectionCount})` : ''}
        </Button>

        {/* Manual mode (R5-1): no Run button — the Apply button inside
            the manual edit list replaces it (direct editing, no AI job). */}
        {mode !== 'manual' && (mode === 'rule' ? (
          <Button
            size="sm"
            onClick={onRuleStart}
            disabled={ruleRunning || rulePlanCount === 0 || !!applyProgress || (scope === 'selection' && selectionCount === 0)}
            className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs"
            data-testid="studio-rule-start"
          >
            🧹 {applyProgress
              ? `${applyProgress.done}/${applyProgress.total}`
              : ruleRunning
                ? `${ruleJobDone}/${ruleJobTotal}`
                : t('editor.ruleHarmonizeStart')}
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={onRunClick}
            disabled={isLoading || noFieldsSelected || selectionCount === 0}
            title={selectionCount === 0 ? t('editor.studioRunNeedsSelection') : undefined}
            className="bg-violet-500 hover:bg-violet-400 text-white font-semibold text-xs"
            data-testid="studio-run"
          >
            {isLoading ? (
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
            ) : null}
            {t('editor.studioStart')}
            {!isLoading && mode === 'fill' && runSubsetCount > 0 && selectionCount > 0 && (
              <span className="opacity-70">({runSubsetCount})</span>
            )}
          </Button>
        ))}

        {/* No selection yet → explicit hint next to the greyed Run.
            Rule mode with scope 'all' needs NO selection (the plan covers
            every song) — showing the hint there made the disabled Run
            feel like "nothing happens" (user item 7). */}
        {mode !== 'manual' && selectionCount === 0 && (mode !== 'rule' || scope === 'selection') && (
          <p className="text-[11px] text-amber-300/80">☑️ {t('editor.studioRunNeedsSelection')}</p>
        )}
        {noFieldsSelected && (
          <p className="text-[11px] text-amber-300/80">{t('editor.studioNoFields')}</p>
        )}
      </div>

      {/* ── Measured batch-size recommendation (real timings, see
          STUDIO_RECOMMENDED_BATCH in ./constants) ── */}
      {mode !== 'rule' && mode !== 'manual' && (
        <p className="text-[10px] text-white/40 leading-relaxed" data-testid="studio-batch-hint">
          💡 {t('editor.studioBatchHint').replace('{n}', String(STUDIO_RECOMMENDED_BATCH))}
        </p>
      )}
    </>
  );
}

interface BigBatchConfirmDialogProps {
  /** Songs the pending run would analyze. */
  runSubsetCount: number;
  /** Start the run anyway (dismisses the dialog first). */
  onConfirm: () => void;
  onCancel: () => void;
  t: StudioTranslate;
}

/** Big-batch confirmation (run with more songs than the measured
 *  recommendation → explicit time estimate before the job starts). */
export function BigBatchConfirmDialog({
  runSubsetCount,
  onConfirm,
  onCancel,
  t,
}: BigBatchConfirmDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
      <div className="bg-gray-900 border border-white/20 rounded-xl p-5 max-w-md w-full mx-4 space-y-4 shadow-2xl" data-testid="studio-big-batch-dialog">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-xl">⏳</span>
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">{t('editor.studioBigBatchTitle')}</h3>
            <p className="text-white/60 text-xs mt-0.5">
              {t('editor.studioBigBatchDesc')
                .replace('{n}', String(runSubsetCount))
                .replace('{min}', String(Math.max(1, Math.ceil(runSubsetCount * SECONDS_PER_SONG_WORST_CASE / 60))))}
            </p>
          </div>
        </div>

        <div className="bg-violet-500/10 border border-violet-500/20 rounded-lg p-3 text-[11px] text-white/60 space-y-1.5">
          <p>{t('editor.studioBatchHint').replace('{n}', String(STUDIO_RECOMMENDED_BATCH))}</p>
          <p className="text-white/40">{t('editor.studioBigBatchTip')}</p>
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1 border-white/20 text-white/80 hover:bg-white/10 text-xs"
          >
            {t('editor.aiHarmonizeWarnCancel')}
          </Button>
          <Button
            onClick={onConfirm}
            className="flex-1 bg-violet-500 hover:bg-violet-400 text-white font-semibold text-xs"
            data-testid="studio-big-batch-confirm"
          >
            {t('editor.studioBigBatchConfirm')}
          </Button>
        </div>
      </div>
    </div>
  );
}
