'use client';

import { useState, useEffect } from 'react';
import { ruleHarmonizer, type RuleHarmonizeJobState } from '@/lib/editor/rule-harmonizer';

/** Subscribe to the singleton rule-harmonizer background job state. */
export function useRuleHarmonizerState(): RuleHarmonizeJobState {
  const [state, setState] = useState<RuleHarmonizeJobState>(() => ruleHarmonizer.getState());
  useEffect(() => {
    const unsubscribe = ruleHarmonizer.subscribe(() => setState(ruleHarmonizer.getState()));
    setState(ruleHarmonizer.getState());
    return unsubscribe;
  }, []);
  return state;
}
