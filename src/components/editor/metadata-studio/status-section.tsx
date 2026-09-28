'use client';

/**
 * Status / progress banners for the Metadata Studio.
 *
 * Split out of metadata-studio.tsx (R3 refactor):
 *  - LoadingBanner: the obvious loading screen while a pipeline runs
 *    (phase, progress bar, elapsed time, cancel).
 *  - RuleDoneBanner: persistent green/red feedback after the background
 *    rule job finished (user item 7) — dismissed manually.
 *  - StatusFeedback: the small inline banners — AI error, not-analyzed
 *    stats, local-applied info, txt persistence progress, file errors and
 *    the lyrics warm-up indicator.
 */

import type { HarmonizeProgress, HarmonizeStats } from '@/lib/ai/harmonize-client';
import type { RuleHarmonizeJobState } from '@/lib/editor/rule-harmonizer';
import type { StudioProgress, StudioTranslate } from './types';

interface LoadingBannerProps {
  /** AI analysis job is running. */
  isLoading: boolean;
  /** The background rule job is running. */
  ruleRunning: boolean;
  /** AI pipeline progress (phase + chunk counters), null before the first event. */
  progress: HarmonizeProgress | null;
  ruleJobDone: number;
  ruleJobTotal: number;
  /** Wall-clock start of the AI run (drives the elapsed seconds). */
  runStartedAt: number | null;
  /** Elapsed seconds of the AI run (1 Hz ticker in the orchestrator). */
  elapsedSec: number;
  /** Cancel the running analysis job (orderly abort after the current chunk). */
  onAbortRun: () => void;
  /** Abort the background rule job. */
  onAbortRuleJob: () => void;
  t: StudioTranslate;
}

export function LoadingBanner({
  isLoading,
  ruleRunning,
  progress,
  ruleJobDone,
  ruleJobTotal,
  runStartedAt,
  elapsedSec,
  onAbortRun,
  onAbortRuleJob,
  t,
}: LoadingBannerProps) {
  return (
    <div className="rounded-xl border border-violet-500/30 bg-violet-500/[0.07] p-3 space-y-2.5" data-testid="studio-loading-banner">
      <div className="flex items-center gap-2.5 flex-wrap">
        <span className="inline-block w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
        <span className="text-xs font-semibold text-violet-200">
          {ruleRunning
            ? t('editor.ruleHarmonizeStart')
            : progress
              ? t(progress.phase === 'lookup' ? 'editor.studioPhaseLookup' : 'editor.studioPhaseAi')
              : t('editor.studioPhaseCache')}
        </span>
        <span className="ml-auto font-mono text-[11px] text-white/50 tabular-nums">
          {ruleRunning
            ? `${ruleJobDone}/${ruleJobTotal}`
            : progress
              ? `${progress.done}/${progress.total}`
              : '…'}
          {isLoading && runStartedAt !== null && ` · ${elapsedSec}s`}
        </span>
        {isLoading && (
          <button
            onClick={onAbortRun}
            className="text-[10px] px-2 py-1 rounded-lg border border-red-400/40 text-red-300 hover:bg-red-500/10 transition-colors whitespace-nowrap"
            data-testid="studio-cancel-job"
          >
            {t('editor.studioCancelJob')}
          </button>
        )}
        {ruleRunning && (
          <button
            onClick={onAbortRuleJob}
            className="text-[10px] px-2 py-1 rounded-lg border border-red-400/40 text-red-300 hover:bg-red-500/10 transition-colors whitespace-nowrap"
          >
            {t('editor.ruleHarmonizeAbort')}
          </button>
        )}
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-400 transition-all duration-300"
          style={{
            width: ruleRunning
              ? `${ruleJobTotal > 0 ? Math.round((ruleJobDone / ruleJobTotal) * 100) : 0}%`
              : progress && progress.total > 0
                ? `${Math.round((progress.done / progress.total) * 100)}%`
                : '8%',
          }}
        />
      </div>
      <p className="text-[10px] text-white/40">
        {t('editor.studioLoadingHint')}
      </p>
    </div>
  );
}

interface RuleDoneBannerProps {
  /** Finished rule job state (status done or aborted). */
  ruleJob: RuleHarmonizeJobState;
  onDismiss: () => void;
  t: StudioTranslate;
}

export function RuleDoneBanner({ ruleJob, onDismiss, t }: RuleDoneBannerProps) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg p-2 border ${
        ruleJob.status === 'done'
          ? 'bg-emerald-500/10 border-emerald-500/30'
          : 'bg-amber-500/10 border-amber-500/30'
      }`}
      data-testid="studio-rule-done"
    >
      <span className="text-sm leading-none">{ruleJob.status === 'done' ? '✅' : '⏹️'}</span>
      <p className={`text-[10px] flex-1 ${ruleJob.status === 'done' ? 'text-emerald-200/90' : 'text-amber-200/90'}`}>
        {ruleJob.status === 'done'
          ? t('editor.ruleHarmonizeDone')
              .replace('{done}', String(ruleJob.done))
              .replace('{errors}', String(ruleJob.errors))
          : t('editor.ruleHarmonizeAborted')
              .replace('{done}', String(ruleJob.done))
              .replace('{total}', String(ruleJob.total))}
      </p>
      <button
        onClick={onDismiss}
        className="text-white/40 hover:text-white/80 text-xs"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}

interface StatusFeedbackProps {
  error: string | null;
  stats: HarmonizeStats | null;
  /** Info line after game-local applies (dismissable, null = hidden). */
  localAppliedInfo: number | null;
  applyProgress: StudioProgress | null;
  fileErrors: number | null;
  warmupProgress: StudioProgress | null;
  onDismissLocalApplied: () => void;
  onDismissFileErrors: () => void;
  t: StudioTranslate;
}

export function StatusFeedback({
  error,
  stats,
  localAppliedInfo,
  applyProgress,
  fileErrors,
  warmupProgress,
  onDismissLocalApplied,
  onDismissFileErrors,
  t,
}: StatusFeedbackProps) {
  return (
    <>
      {/* ── Error / stats / local-applied feedback ── */}
      {error && (
        <p className="text-xs text-red-400" data-testid="studio-error">{error}</p>
      )}
      {stats && stats.notAnalyzed > 0 && (
        <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2" data-testid="studio-not-analyzed">
          <span className="text-sm leading-none">⚠️</span>
          <p className="text-[10px] text-amber-200/90 flex-1">
            {t('editor.aiBatchNotAnalyzed').replace('{count}', String(stats.notAnalyzed))}
          </p>
        </div>
      )}
      {localAppliedInfo !== null && (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2" data-testid="studio-local-applied">
          <span className="text-sm leading-none">💾</span>
          <p className="text-[10px] text-emerald-200/90 flex-1">
            {t('editor.studioLocalApplied').replace('{n}', String(localAppliedInfo))}
          </p>
          <button onClick={onDismissLocalApplied} className="text-white/40 hover:text-white/80 text-xs" aria-label="Dismiss">✕</button>
        </div>
      )}

      {/* ── txt persistence progress + file errors ── */}
      {applyProgress && (
        <div className="flex items-center gap-2 text-[11px] text-white/60">
          <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <span className="font-mono tabular-nums">
            {t('editor.aiBatchSavingFiles')
              .replace('{current}', String(applyProgress.done))
              .replace('{total}', String(applyProgress.total))}
          </span>
        </div>
      )}
      {fileErrors !== null && (
        <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2" data-testid="studio-file-error">
          <span className="text-sm leading-none">⚠️</span>
          <p className="text-[10px] text-amber-200/90 flex-1">
            {t('editor.aiBatchFileErrors').replace('{count}', String(fileErrors))}
          </p>
          <button onClick={onDismissFileErrors} className="text-white/40 hover:text-white/80 text-xs" aria-label="Dismiss">✕</button>
        </div>
      )}

      {/* ── Lyrics warm-up indicator (txt mode) ── */}
      {warmupProgress && (
        <div className="flex items-center gap-2 text-[11px] text-white/50">
          <span>📖</span>
          <span className="font-mono tabular-nums">
            {t('editor.aiBatchWarmup')
              .replace('{current}', String(warmupProgress.done))
              .replace('{total}', String(warmupProgress.total))}
          </span>
        </div>
      )}
    </>
  );
}
