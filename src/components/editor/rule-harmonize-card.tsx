'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Song } from '@/types/game';
import {
  planRuleHarmonization,
  ruleHarmonizer,
  RuleHarmonizeJobState,
} from '@/lib/editor/rule-harmonizer';

/** Subscribe to the singleton background job state. */
function useRuleHarmonizerState(): RuleHarmonizeJobState {
  const [state, setState] = useState<RuleHarmonizeJobState>(() => ruleHarmonizer.getState());
  useEffect(() => {
    const unsubscribe = ruleHarmonizer.subscribe(() => setState(ruleHarmonizer.getState()));
    // Sync in case the job advanced while this component was unmounted
    setState(ruleHarmonizer.getState());
    return unsubscribe;
  }, []);
  return state;
}

/**
 * Sidebar card: rule-based (AI-free) genre harmonization.
 * Shows the deterministic plan ("Bubblegum Pop → Pop") and starts the
 * background job — it keeps running when the panel closes (see
 * RuleHarmonizeStatusBar).
 */
export function RuleHarmonizeCard({
  songs,
  onApplied,
  t,
}: {
  songs: Song[];
  onApplied: () => void;
  t: (key: string) => string;
}) {
  const job = useRuleHarmonizerState();
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // Pure + synchronous: canonicalizeGenre over every song (~µs per song)
  const plan = useMemo(() => planRuleHarmonization(songs), [songs]);
  const preview = plan.slice(0, 12);
  const running = job.status === 'running';

  const handleStart = useCallback(async () => {
    // Snapshot the plan NOW — the job runs in the background afterwards
    const items = planRuleHarmonization(songs);
    if (items.length === 0) return;
    await ruleHarmonizer.start(items);
    if (isMountedRef.current) onApplied();
  }, [songs, onApplied]);

  const handleAbort = useCallback(() => {
    ruleHarmonizer.abort();
  }, []);

  const handleReset = useCallback(() => {
    ruleHarmonizer.reset();
  }, []);

  return (
    <Card className="bg-white/5 border-white/10" data-testid="rule-harmonize-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          🧹 {t('editor.ruleHarmonizeTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {running ? (
          <>
            <div className="flex items-center justify-between text-xs text-white/70">
              <span>{t('editor.ruleHarmonizeRunning')}</span>
              <span className="font-mono tabular-nums">{job.done}/{job.total}</span>
            </div>
            {/* Slim progress bar */}
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-400 transition-all duration-200"
                style={{ width: `${job.total > 0 ? Math.round((job.done / job.total) * 100) : 0}%` }}
              />
            </div>
            {job.errors > 0 && (
              <p className="text-[10px] text-amber-300/80">
                {t('editor.ruleHarmonizeErrors').replace('{count}', String(job.errors))}
              </p>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={handleAbort}
              className="w-full border-red-400/40 text-red-300 hover:bg-red-500/10 text-xs"
            >
              {t('editor.ruleHarmonizeAbort')}
            </Button>
          </>
        ) : job.status === 'done' || job.status === 'aborted' ? (
          <>
            <p className="text-xs text-white/70" data-testid="rule-harmonize-result">
              {job.status === 'done'
                ? t('editor.ruleHarmonizeDone')
                    .replace('{done}', String(job.done - job.errors))
                    .replace('{errors}', String(job.errors))
                : t('editor.ruleHarmonizeAborted')
                    .replace('{done}', String(job.done))
                    .replace('{total}', String(job.total))}
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={handleReset}
              className="w-full border-white/20 text-white/70 hover:bg-white/10 text-xs"
            >
              {t('editor.ruleHarmonizeReset')}
            </Button>
          </>
        ) : plan.length === 0 ? (
          <p className="text-xs text-white/40">✅ {t('editor.ruleHarmonizeNothing')}</p>
        ) : (
          <>
            <p className="text-xs text-white/60">
              {t('editor.ruleHarmonizeDesc')}
            </p>
            <p className="text-[11px] text-cyan-300/80 font-medium">
              {t('editor.ruleHarmonizeCount').replace('{count}', String(plan.length))}
            </p>
            {/* Deterministic preview — "Bubblegum Pop → Pop" */}
            <div className="max-h-40 overflow-y-auto space-y-1 pr-1 text-[10px] font-mono">
              {preview.map(item => (
                <div key={item.songId} className="flex items-center gap-1.5 text-white/50">
                  <span className="truncate flex-1" title={`${item.artist} — ${item.title}`}>
                    {item.currentGenre}
                  </span>
                  <span className="text-white/30">→</span>
                  <span className="text-cyan-300 truncate">{item.newGenre}</span>
                </div>
              ))}
              {plan.length > preview.length && (
                <p className="text-white/30 pt-1">+{plan.length - preview.length} …</p>
              )}
            </div>
            <Button
              size="sm"
              onClick={handleStart}
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs"
              data-testid="rule-harmonize-start"
            >
              🧹 {t('editor.ruleHarmonizeStart')}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Floating status pill — visible while the background job runs, even when
 * the sidebar card is closed (the job is a module singleton).
 */
export function RuleHarmonizeStatusBar({ t }: { t: (key: string) => string }) {
  const job = useRuleHarmonizerState();
  if (job.status !== 'running') return null;
  return (
    <div
      className="fixed bottom-4 left-4 z-40 bg-gray-900/95 backdrop-blur-sm border border-cyan-500/40 rounded-xl px-4 py-2.5 shadow-2xl flex items-center gap-3 animate-fade-in"
      data-testid="rule-harmonize-status-bar"
    >
      <div className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      <span className="text-xs text-white/80 whitespace-nowrap">
        {t('editor.ruleHarmonizeBgRunning').replace('{done}', String(job.done)).replace('{total}', String(job.total))}
      </span>
      <button
        onClick={() => ruleHarmonizer.abort()}
        className="text-[10px] px-2 py-0.5 rounded border border-red-400/40 text-red-300 hover:bg-red-500/10 transition-colors whitespace-nowrap"
      >
        {t('editor.ruleHarmonizeAbort')}
      </button>
    </div>
  );
}
