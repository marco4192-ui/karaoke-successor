'use client';

import { useEffect, useRef, useState } from 'react';

// ===================== Screen Wake Lock (R54) =====================
// Verhindert, dass das Handy-Display während des Gesangs in den Standby
// geht. Das ist KEIN Komfort-Feature, sondern funktional NOTWENDIG:
// requestAnimationFrame (unser Pitch-Detection-Loop) läuft NUR bei
// sichtbarem Dokument — geht der Bildschirm aus, friert die Erkennung
// ein (die gesendete Pitch-Linie wird „flach"/steht still), genau das
// Standby-Problem aus dem Nutzer-Feedback.
//
// - Chrome/Android: ab Chrome 84 verfügbar
// - Safari/iOS: ab 16.4 verfügbar
// - Der Lock wird automatisch freigegeben, wenn die Seite unsichtbar
//   wird (Tab-Wechsel) — wir holen ihn bei visibilitychange zurück,
//   sobald der Nutzer zurückkommt.
// - Nicht unterstützt (alter Browser) → { supported: false }; die UI
//   zeigt dann den Hinweis „Display anlassen".

// Minimale Sentinel-Typen (bewusst eigenständig — ältere TS-DOM-Libs
// kennen WakeLockSentinel teils noch nicht, neuere liefern es bereits;
// die Struktur ist identisch und strukturkompatibel zugewiesen).
interface WakeLockSentinelLike {
  released: boolean;
  release: () => Promise<void>;
  addEventListener: (type: string, listener: () => void) => void;
}

type WakeLockRequester = (type: 'screen') => Promise<WakeLockSentinelLike>;

/** Liefert die wakeLock.request-Funktion oder null (API fehlt / gesperrt). */
function getWakeLockRequester(): WakeLockRequester | null {
  if (typeof navigator === 'undefined') return null;
  const nav = navigator as Navigator & { wakeLock?: { request?: unknown } };
  const req = nav.wakeLock && typeof nav.wakeLock.request === 'function'
    ? nav.wakeLock.request
    : null;
  return req ? (req as WakeLockRequester) : null;
}

/**
 * Hält den Bildschirm wach, solange `active` true ist.
 *
 * @param active true = Lock halten (z. B. „dieses Handy singt gerade"),
 *              false = Lock freigeben. Wechsel sind jederzeit möglich.
 * @returns supported — Wake Lock API verfügbar?; held — Lock aktuell aktiv?
 */
export function useScreenWakeLock(active: boolean): { supported: boolean; held: boolean } {
  // supported ändert sich im Leben einer Seite nie → einmalig beim ersten
  // Render bestimmen (useState-Initializer, kein Effect nötig).
  const [supported] = useState<boolean>(() => getWakeLockRequester() !== null);
  const [held, setHeld] = useState(false);
  const sentinelRef = useRef<WakeLockSentinelLike | null>(null);
  const activeRef = useRef(active);
  // Re-Entry-Schutz: request() darf nicht doppelt laufen, sonst leaked der
  // alte Sentinel, sobald die zweite Anfrage die Referenz überschreibt.
  const acquiringRef = useRef(false);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    if (!supported) return;
    let cancelled = false;

    const releaseLock = async () => {
      const sentinel = sentinelRef.current;
      sentinelRef.current = null;
      setHeld(false);
      if (sentinel && !sentinel.released) {
        try { await sentinel.release(); } catch { /* schon weg */ }
      }
    };

    const acquireLock = async () => {
      if (acquiringRef.current || sentinelRef.current) return;
      if (!activeRef.current) return;
      const request = getWakeLockRequester();
      if (!request) return;
      acquiringRef.current = true;
      try {
        const sentinel = await request('screen');
        if (cancelled || !activeRef.current) {
          // Inzwischen inaktiv geworden → sofort wieder freigeben
          try { if (!sentinel.released) await sentinel.release(); } catch { /* ignore */ }
          return;
        }
        sentinelRef.current = sentinel;
        setHeld(true);
        // Browser gibt den Lock selbst frei (Tab gewechselt/App in Hintergrund)
        // → Status nachführen; visibilitychange holt ihn zurück.
        sentinel.addEventListener('release', () => {
          if (sentinelRef.current === sentinel) {
            sentinelRef.current = null;
            setHeld(false);
          }
        });
      } catch {
        // z. B. SecurityError (Seite nicht sichtbar beim request) oder
        // NotAllowedError (Energiesparmodus) → ohne Lock weiterlaufen,
        // die UI zeigt ggf. einen Hinweis.
        setHeld(false);
      } finally {
        acquiringRef.current = false;
      }
    };

    if (active) {
      void acquireLock();
    } else {
      void releaseLock();
    }

    // Wake Lock wird beim Unsichtbarwerden automatisch freigegeben —
    // beim Zurückkommen erneut anfordern (nur wenn weiter aktiv).
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && activeRef.current) {
        void acquireLock();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      void releaseLock();
    };
  }, [active, supported]);

  return { supported, held };
}
