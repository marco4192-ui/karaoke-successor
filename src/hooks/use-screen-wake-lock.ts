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
// - Nicht unterstützt (alter Browser / HTTP-Kontext) → { supported: false };
//   R60 aktiviert dann einen stillen Audio-Loop-Fallback („NoSleep"):
//   laufende Medien-Wiedergabe hält die Display-Abschaltung auf.
//
// R60 — zwei Härtungen nach Nutzer-Feedback („Always-ON hat nicht
// funktioniert"):
//   1. Re-Acquire-Watchdog: Browser geben Wake Locks still ab
//      (Android-Energiesparmodus, Browser-Politik). Solange `active`
//      gilt, prüfen wir alle 15 s und holen einen verlorenen Lock neu.
//   2. `held` meldet jetzt auch den Audio-Fallback als aktiv, damit die
//      Status-Karte ☀️ zeigt, wenn der Schutz über den Fallback läuft.

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

/** R60: Erzeugt eine Data-URL mit 1 s echter Stille (16-bit mono @ 8 kHz).
 *  Als loopendes <audio> abgespielt hält es Mobil-Browser davon ab, die
 *  Seite in den Standby zu schicken — der klassische NoSleep-Trick für
 *  Kontexte OHNE Wake-Lock-API (http://<LAN-IP>, alte Browser). */
function createSilentAudioUrl(): string | null {
  if (typeof ArrayBuffer === 'undefined' || typeof Blob === 'undefined' || typeof URL === 'undefined') return null;
  try {
    const sampleRate = 8000;
    const numSamples = sampleRate; // 1 s
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);
    const writeStr = (off: number, s: string) => {
      for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
    };
    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, 1, true);  // PCM
    view.setUint16(22, 1, true);  // mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // byte rate
    view.setUint16(32, 2, true);  // block align
    view.setUint16(34, 16, true); // bits per sample
    writeStr(36, 'data');
    view.setUint32(40, numSamples * 2, true);
    // Samples bleiben 0 = Stille
    return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
  } catch {
    return null;
  }
}

/**
 * Hält den Bildschirm wach, solange `active` true ist.
 *
 * @param active true = Lock halten (z. B. „dieses Handy singt gerade"),
 *              false = Lock freigeben. Wechsel sind jederzeit möglich.
 * @returns supported — Wake Lock API verfügbar?; held — Schutz aktiv?
 *          (R60: auch true, wenn der stille Audio-Fallback läuft)
 */
export function useScreenWakeLock(active: boolean): { supported: boolean; held: boolean } {
  // supported ändert sich im Leben einer Seite nie → einmalig beim ersten
  // Render bestimmen (useState-Initializer, kein Effect nötig).
  const [supported] = useState<boolean>(() => getWakeLockRequester() !== null);
  const [apiHeld, setApiHeld] = useState(false);
  const [fallbackHeld, setFallbackHeld] = useState(false);
  const sentinelRef = useRef<WakeLockSentinelLike | null>(null);
  const activeRef = useRef(active);
  // Re-Entry-Schutz: request() darf nicht doppelt laufen, sonst leaked der
  // alte Sentinel, sobald die zweite Anfrage die Referenz überschreibt.
  const acquiringRef = useRef(false);
  // R60: Re-Acquire-Funktion des Haupt-Effekts für den Watchdog.
  const acquireFnRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    if (!supported) return;
    let cancelled = false;

    const releaseLock = async () => {
      const sentinel = sentinelRef.current;
      sentinelRef.current = null;
      setApiHeld(false);
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
        setApiHeld(true);
        // Browser gibt den Lock selbst frei (Tab gewechselt/App in Hintergrund)
        // → Status nachführen; visibilitychange holt ihn zurück.
        sentinel.addEventListener('release', () => {
          if (sentinelRef.current === sentinel) {
            sentinelRef.current = null;
            setApiHeld(false);
          }
        });
      } catch {
        // z. B. SecurityError (Seite nicht sichtbar beim request) oder
        // NotAllowedError (Energiesparmodus) → ohne Lock weiterlaufen,
        // die UI zeigt ggf. einen Hinweis.
        setApiHeld(false);
      } finally {
        acquiringRef.current = false;
      }
    };

    // R60: Watchdog-Zugriff auf die aktuelle acquireLock-Instanz.
    acquireFnRef.current = () => { void acquireLock(); };

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
      acquireFnRef.current = null;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      void releaseLock();
    };
  }, [active, supported]);

  // ── R60: Re-Acquire-Watchdog ──
  // Chrome/Android gibt Wake Locks mitunter still ab (Energiesparmodus,
  // Browser-Interna). Solange `active` gilt, prüfen wir alle 15 s und
  // holen einen verlorenen Lock still neu (nur bei sichtbarem Dokument —
  // im Hintergrund schlägt request() ohnehin mit SecurityError fehl).
  useEffect(() => {
    if (!supported || !active) return;
    const iv = setInterval(() => {
      if (document.visibilityState === 'visible' && !sentinelRef.current) {
        acquireFnRef.current?.();
      }
    }, 15000);
    return () => clearInterval(iv);
  }, [active, supported]);

  // ── R60: Stiller Audio-Fallback ohne Wake-Lock-API ──
  // http://<LAN-IP> (kein Secure Context) und Browser ohne Wake-Lock-API
  // bekommen einen loopenden Silent-Audio-Track — laufende Medien-
  // Wiedergabe verhindert die Display-Abschaltung (NoSleep-Prinzip).
  // Autoplay-Blocken fangen wir ab und retryen bei der nächsten echten
  // Nutzergeste (die Mic-Aktivierung der Status-Karte ist eine solche).
  useEffect(() => {
    if (supported || typeof Audio === 'undefined') return;
    if (!active) return;
    let audio: HTMLAudioElement | null = null;
    let url: string | null = null;

    const start = () => {
      if (!audio || !url) return;
      audio.play().then(() => {
        setFallbackHeld(true);
      }).catch(() => {
        // Autoplay blockiert — Retry bei der nächsten Nutzer-Interaktion.
        setFallbackHeld(false);
      });
    };

    url = createSilentAudioUrl();
    if (url) {
      audio = new Audio();
      audio.loop = true;
      audio.preload = 'auto';
      audio.src = url;
      start();
      document.addEventListener('pointerdown', start);
    }

    return () => {
      if (audio) {
        audio.pause();
        audio.src = '';
      }
      document.removeEventListener('pointerdown', start);
      if (url) URL.revokeObjectURL(url);
      setFallbackHeld(false);
    };
  }, [active, supported]);

  return { supported, held: apiHeld || fallbackHeld };
}
