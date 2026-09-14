'use client';

import { useState, useEffect } from 'react';
import { ruleHarmonizer, RuleHarmonizeJobState } from '@/lib/editor/rule-harmonizer';

/** Subscribe to the singleton background job state. */
export function useRuleHarmonizerState(): RuleHarmonizeJobState {
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
 * Floating status pill — visible while the background rule-harmonization job
 * runs (started from the Metadata Studio). The job is a module singleton, so
 * it keeps running even when the studio is collapsed or the editor closed.
 *
 * (The former RuleHarmonizeCard sidebar UI was merged into the Metadata
 * Studio — user feedback R4 points 7+8.)
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
