'use client';

import { MusicIcon } from '@/components/icons';

// ==================== EQUALIZER BARS ====================

const EQ_BAR_DELAYS = ['-0.1s', '-0.45s', '-0.25s', '-0.6s', '-0.35s', '-0.15s', '-0.5s'];

/** Animated audio-visualizer bars. `active=false` freezes them at rest height. */
export function EqualizerBars({
  active,
  bars = 5,
  className = '',
  label,
}: {
  active: boolean;
  bars?: number;
  className?: string;
  label: string;
}) {
  const count = Math.max(1, Math.min(EQ_BAR_DELAYS.length, bars));
  return (
    <span
      className={`flex items-end gap-[3px] h-6 shrink-0 ${className}`}
      role="img"
      aria-label={label}
    >
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className={`eq-bar ${active ? '' : 'eq-bar-paused'}`}
          style={{ animationDelay: EQ_BAR_DELAYS[i] }}
        />
      ))}
    </span>
  );
}

// ==================== VINYL DISC ====================

/**
 * Spinning vinyl record with an optional cover image as the center label.
 * Purely decorative; the spin pauses when `spinning` is false.
 */
export function VinylDisc({
  cover,
  spinning = true,
  size = 176,
  label,
}: {
  cover?: string | null;
  spinning?: boolean;
  size?: number;
  label: string;
}) {
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={label}
    >
      {/* Ambient glow behind the disc */}
      <div
        aria-hidden
        className="absolute -inset-4 rounded-full bg-gradient-to-tr from-cyan-500/20 via-purple-500/10 to-fuchsia-500/20 blur-2xl"
      />
      {/* Disc body */}
      <div
        className={`jukebox-vinyl-disc relative w-full h-full rounded-full ${
          spinning ? 'jukebox-vinyl' : 'jukebox-vinyl-paused'
        }`}
      >
        {/* Light sheen across the grooves */}
        <div
          aria-hidden
          className="absolute inset-0 rounded-full"
          style={{
            background:
              'conic-gradient(from 200deg, transparent 0deg, rgba(255,255,255,0.08) 20deg, transparent 60deg, transparent 180deg, rgba(255,255,255,0.05) 210deg, transparent 250deg)',
          }}
        />
        {/* Center label: cover art or gradient fallback */}
        <div className="absolute inset-0 m-auto w-[37%] h-[37%] rounded-full overflow-hidden ring-2 ring-black/60 shadow-inner">
          {cover ? (
            <img
              src={cover}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-cyan-500 via-purple-500 to-fuchsia-600 flex items-center justify-center">
              <MusicIcon className="w-[38%] h-[38%] text-white/90" />
            </div>
          )}
        </div>
        {/* Spindle hole */}
        <div
          aria-hidden
          className="absolute inset-0 m-auto w-[6%] h-[6%] min-w-2 min-h-2 rounded-full bg-black border border-white/25"
        />
      </div>
    </div>
  );
}

// ==================== STAT CHIP ====================

/** Small glass chip showing a number + label (hero stats). */
export function StatChip({
  icon,
  value,
  label,
  accent = 'text-cyan-400',
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  accent?: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-3.5 py-1.5 backdrop-blur-sm">
      <span className={accent}>{icon}</span>
      <span className="font-bold text-white tabular-nums">{value}</span>
      <span className="text-white/50 text-sm">{label}</span>
    </div>
  );
}
