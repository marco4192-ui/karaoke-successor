'use client';

import type { ReactNode } from 'react';

/** Small segmented-control button used by the studio config rows
 *  (scope / mode / write target). `color` matches the mode accent. */
export function SegButton({ active, onClick, label, testId, color = 'violet' }: {
  active: boolean;
  onClick: () => void;
  label: ReactNode;
  testId: string;
  color?: 'violet' | 'cyan' | 'amber' | 'emerald';
}) {
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all border ${
        active
          ? color === 'violet'
            ? 'bg-violet-500/20 border-violet-500/60 text-violet-200'
            : color === 'cyan'
              ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-200'
              : color === 'amber'
                ? 'bg-amber-500/20 border-amber-500/60 text-amber-200'
                : 'bg-emerald-500/20 border-emerald-500/60 text-emerald-200'
          : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white/80'
      }`}
    >
      {label}
    </button>
  );
}

/** Field toggle chip (genre / language / year) with ✓/○ state indicator. */
export function FieldToggle({ active, onToggle, icon, label, testId }: {
  active: boolean;
  onToggle: () => void;
  icon: string;
  label: string;
  testId: string;
}) {
  return (
    <button
      onClick={onToggle}
      aria-pressed={active}
      data-testid={testId}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all border ${
        active
          ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-200'
          : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
      {active
        ? <span className="text-emerald-400">✓</span>
        : <span className="text-white/30">○</span>}
    </button>
  );
}
