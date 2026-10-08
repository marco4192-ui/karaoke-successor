'use client';

import type { ReactNode } from 'react';

// ===================== R60/12: Geteilter Filter-Chip =====================
// Extrahiert aus mirror-library-lite.tsx (R51/Bug5+6), damit Bibliothek UND
// Party-Setup dieselbe kompakte Filter-Darstellung nutzen.
// Smartphones öffnen native <select>s ohnehin als Fullscreen-Overlay — breite
// Dropdown-Felder sind reine Platzverschwendung. Der Chip zeigt nur das kurze
// Label (inaktiv) bzw. den gewählten Wert (aktiv, cyan markiert); das
// unsichtbare native Select darüber liefert das gewohnte Overlay-Verhalten.

function haptic() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(10);
  }
}

export function FilterChip({
  label, value, onChange, active, displayValue, children, testId,
}: {
  label: string;
  value: string;
  onChange: (_v: string) => void;
  active: boolean;
  /** Sichtbarer Text bei aktivem Filter (z. B. gewähltes Jahr/Dekade) */
  displayValue?: string;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <div className="relative flex-1 min-w-[64px] basis-0" data-testid={testId}>
      <div
        aria-hidden="true"
        className={'w-full flex items-center justify-center rounded-lg px-1 py-2 text-[11px] font-medium text-center border pointer-events-none transition-colors ' +
          (active
            ? 'border-cyan-400/60 bg-cyan-500/15 text-cyan-200'
            : 'bg-white/5 border-white/10 text-white/60')}
      >
        <span className="truncate max-w-full">{active && displayValue ? displayValue : label}</span>
      </div>
      <select
        value={value}
        onChange={(e) => { haptic(); onChange(e.target.value); }}
        aria-label={label}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      >
        {children}
      </select>
    </div>
  );
}
FilterChip.displayName = 'FilterChip';
