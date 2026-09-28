// ===================== Party-Setup-Mirror — Hilfsfunktionen =====================
//
// Pure Helfer für den Party-Setup-Mirror (R6-Auslagerung aus
// mirror-party-setup-lite.tsx — Bodies unverändert übernommen).

/** Kurzer Vibrations-Impuls für mobiles Feedback (no-op ohne Vibrate-API) */
export function haptic() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(10);
  }
}

/** t() mit Inline-Fallback: liefert den Fallback, wenn der Key fehlt (t gibt den Key zurück) */
export function tOr(t: (_key: string) => string, key: string, fallback: string): string {
  return t(key) === key ? fallback : t(key);
}
