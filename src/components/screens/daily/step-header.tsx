'use client';

import type { ReactNode } from 'react';

/** Numbered step header of the guided 3-step flow (player → challenge →
 *  song). Step 2 uses the purple, step 3 the fuchsia accent; the optional
 *  `right` slot carries the per-tab extras (reset timer, XP badge, filter,
 *  shuffle button). */
export function StepHeader({ step, testId, className = '', title, hint, right }: {
  step: 2 | 3;
  testId?: string;
  className?: string;
  title: ReactNode;
  hint: ReactNode;
  right?: ReactNode;
}) {
  const color = step === 2
    ? 'bg-purple-500/20 border border-purple-500 text-purple-300'
    : 'bg-fuchsia-500/20 border border-fuchsia-500 text-fuchsia-300';
  return (
    <div className={`flex items-start gap-3 ${className}`} data-testid={testId}>
      <span className={`flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold ${color} shrink-0`} aria-hidden>{step}</span>
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-semibold text-white/90">{title}</h2>
        <p className="text-xs text-white/50">{hint}</p>
      </div>
      {right}
    </div>
  );
}
