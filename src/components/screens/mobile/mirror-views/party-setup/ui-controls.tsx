'use client';

// ===================== Party-Setup-Mirror — Wiederverwendbare UI-Bausteine =====================
//
// SectionHeader / Toggle / SelectDropdown / DragSlider — die gemeinsamen
// Kontroll-Atome des Party-Setup-Mirrors (R6-Auslagerung aus
// mirror-party-setup-lite.tsx — JSX unverändert übernommen).

import type { ReactNode } from 'react';
import { haptic } from './utils';

// ===================== Wiederverwendbare UI-Bausteine =====================

/** Section header with gradient accent bar (unified visual hierarchy) */
export function SectionHeader({ children }: { children: ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/40 mb-2 px-1">
      <span className="w-1 h-3.5 rounded-full bg-gradient-to-b from-cyan-400 to-purple-500 shrink-0" aria-hidden="true" />
      {children}
    </h3>
  );
}

/** Mobile-freundlicher Toggle-Switch */
export function Toggle({ value, onToggle }: { value: boolean; onToggle: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => { haptic(); onToggle(!value); }}
      className={'relative w-11 h-6 rounded-full shrink-0 transition-colors ' + (value ? 'bg-cyan-500' : 'bg-white/20')}
    >
      <span className={'absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all shadow ' + (value ? 'left-[22px]' : 'left-0.5')} />
    </button>
  );
}

/** Dropdown fuer Select-Einstellungen */
export function SelectDropdown({ options, value, onChange }: {
  options: { value: string | number; label: string }[];
  value: string | number;
  onChange: (v: string | number | boolean) => void;
}) {
  return (
    <select
      value={String(value)}
      onChange={(e) => { haptic(); const raw = e.target.value; if (raw === 'true') { onChange(true); } else if (raw === 'false') { onChange(false); } else if (raw === '') { onChange(raw); } else { const n = Number(raw); onChange(isNaN(n) ? raw : n); } }}
      className="w-full appearance-none bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white active:scale-[0.99] transition-transform cursor-pointer"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', backgroundSize: '16px',
      }}
    >
      {options.map((opt) => (
        <option key={String(opt.value)} value={String(opt.value)} className="bg-[#1a1a2e] text-white">
          {opt.label}
        </option>
      ))}
    </select>
  );
}

/** Mobile-freundlicher Drag-Slider (range input) — wie in der Main-App (user request item 12) */
export function DragSlider({ value, min, max, step, unit, onChange }: {
  value: number; min: number; max: number; step: number; unit?: string; onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerUp={() => haptic()}
        className="flex-1 h-2 rounded-full appearance-none cursor-pointer bg-white/10 accent-cyan-500
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:h-7
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400
          [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(34,211,238,0.5)]
          [&::-moz-range-thumb]:w-7 [&::-moz-range-thumb]:h-7 [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-cyan-400 [&::-moz-range-thumb]:border-0"
        aria-label={String(value)}
      />
      <span className="shrink-0 min-w-[52px] text-right text-sm font-mono font-semibold text-cyan-400 tabular-nums">
        {Math.round(value * 10) / 10}{unit || ''}
      </span>
    </div>
  );
}
