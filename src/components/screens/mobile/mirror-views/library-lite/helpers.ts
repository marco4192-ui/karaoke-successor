// ===================== Library-Lite-Mirror — Hilfsfunktionen =====================
//
// Pure Helfer und Konstanten der Companion-Mirror-Bibliothek
// (R27a-Auslagerung aus mirror-library-lite.tsx — Bodies und
// Modus-Button-Konfiguration byte-identisch übernommen).

import type { GameMode, MobileSong } from '../../mobile-types';

// ===================== Helpers =====================

/** i18n with a hard fallback (mirror views load a lite dictionary — keys
 *  can be missing; then the German fallback keeps the UI usable). */
export function tOr(t: (_key: string) => string, key: string, fallback: string): string {
  return t(key) === key ? fallback : t(key);
}

export function haptic() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(10);
  }
}

export function formatDurationSec(ms: number): string {
  const s = Math.round(ms / 1000);
  const min = Math.floor(s / 60);
  const sec = s % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export function isLikelyDuet(song: MobileSong): boolean {
  // The desktop pre-computes isDuet using the full isDuetSong() logic
  // (metadata flag + [Duet]/(Duet) title check + P1/P2 lyrics scan).
  // Rely on that flag — no lyrics are available on the companion side.
  if (song.isDuet === true) return true;
  // Safety net: bracketed [Duet] / (Duet) in title (catches songs added after last sync)
  if (song.title && /\[\s*duet\s*\]/i.test(song.title)) return true;
  if (song.title && /\(\s*duet\s*\)/i.test(song.title)) return true;
  return false;
}

// Modus-Button-Konfiguration
export const MODE_BUTTONS: { mode: GameMode; icon: string; labelKey: string; fallback: string; activeColor: string }[] = [
  { mode: 'single', icon: '\u{1F3B5}', labelKey: 'gameMode.single', fallback: 'Solo', activeColor: 'bg-cyan-500/25 border-cyan-400/40 text-cyan-400' },
  { mode: 'duel', icon: '\u2694\uFE0F', labelKey: 'gameMode.duel', fallback: 'Duell', activeColor: 'bg-red-500/25 border-red-400/40 text-red-400' },
  { mode: 'duet', icon: '\u{1F3AD}', labelKey: 'gameMode.duet', fallback: 'Duett', activeColor: 'bg-pink-500/25 border-pink-400/40 text-pink-400' },
];

// Dropdown-Pfeil SVG als data-URL
const dropdownArrow = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`;
export const dropdownStyle = {
  backgroundImage: dropdownArrow,
  backgroundRepeat: 'no-repeat' as const,
  backgroundPosition: 'right 10px center',
  backgroundSize: '16px',
};
