'use client';

import React, { useEffect, useRef, useState } from 'react';

// ===================== Mini-Cover-Kachel (R33/P13+P15, R34 geteilt) =====================

/**
 * Geteilte Cover-Kachel für die Mirror-Views (mirror-library-lite &
 * mirror-queue-lite — vorher in beiden Dateien dupliziert).
 *
 * 3-Stufen-Fallback (R34, Vorbild: WishlistCover in mirror-jukebox-lite):
 *   Stufe 1: API-Thumbnail vom Desktop (GET /api/mobile?action=songcover)
 *            mit verzögertem Retry: 5 s → 15 s → 60 s (max. 3 Retries).
 *            Ein 404 bedeutet „noch nicht hochgeladen“, daher ist Retry
 *            korrekt — der Desktop lädt Covers in 15-s-Ticks nach.
 *   Stufe 2: song.coverImage als Direkt-URL — NUR wenn das Handy sie auch
 *            laden kann (data:/http[s]:). blob:-URLs des Desktops sind von
 *            der Companion-App aus unbrauchbar und werden übersprungen.
 *   Stufe 3: farbige Initialen-Kachel (Hue = Hash der Song-ID) — bleibt
 *            als dauerhafter Fallback erhalten (bestehende Optik).
 *
 * Retry-Timer werden bei Unmount gecleart; ein Bump des attempt-State
 * re-rendert das img (neuer key + Cache-Buster) und startet einen neuen
 * Ladeversuch. React.memo hält List-Re-Renders (Suche/Filter) billig.
 */

/** Stabiler Farb-Hue aus der Song-ID (fuer die Initialen-Fallback-Kachel —
 *  deterministisch, ueberlebt Reloads & Tabs). */
function songCoverHue(songId: string): number {
  let h = 0;
  for (let i = 0; i < songId.length; i++) h = (h * 31 + songId.charCodeAt(i)) | 0;
  return Math.abs(h) % 360;
}

/** Max. 2 Initialen aus dem Songtitel ("Dancing Queen" → "DQ"). */
function songInitials(title: string): string {
  const parts = (title || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/** Stufe 2 nur für URLs, die das Handy auch laden kann (data:/http[s]:) —
 *  blob:-URLs des Desktop-Prozesses sind hier unbrauchbar. */
function usableInlineCover(coverImage?: string): boolean {
  if (!coverImage) return false;
  // R53 — Mixed-Content-Schutz: Läuft die Companion-Page selbst unter HTTPS
  // (Server-HTTPS-Listener für die Mikrofon-Freigabe), blockiert der Browser
  // http:-Bilder. Solche Covers gehen direkt an Stufe 1 (API) — der Server
  // proxyt sie same-origin, ohne Mixed-Content-Problem.
  if (/^http:\/\//i.test(coverImage)) {
    return typeof window !== 'undefined' && window.location.protocol !== 'https:';
  }
  return /^(data:|https:)/i.test(coverImage);
}

/** Retry-Delays für Stufe 1 (API) nach einem onError/404.
 *  R52: Leiter verlängert (2 → 5 Versuche, bis 5 Minuten) — der Desktop
 *  lädt große Cover-Mengen in 15s-Ticks (48/Tick); bei einer vollen
 *  Bibliothek kann ein Cover länger als die alten 80s auf seinen Upload
 *  warten. Der 5-Minuten-Retry holt Nachzügler sicher ab. */
const API_RETRY_DELAYS_MS = [5000, 15000, 60000, 120000, 300000];

export const SongCoverTile = React.memo(function SongCoverTile({
  songId,
  title,
  coverImage,
  className = '',
}: {
  songId: string;
  title: string;
  /** Optionale Direkt-URL (Stufe 2). blob:-URLs werden ignoriert. */
  coverImage?: string;
  className?: string;
}) {
  const inlineUsable = usableInlineCover(coverImage);
  // R52 — INLINE-FIRST: Liegt eine direkt ladbare URL vor (data:/http:),
  // rendert die Kachel sie SOFORT — keine 80s-API-Retry-Leiter mit
  // Initialen-Fallback mehr, während das Cover längst auf dem Handy ist
  // (die Song-Liste trägt data:-Cover ohnehin mit; http:-Cover kann das
  // Handy selbst laden, auch wenn der Desktop-Canvas am CORS scheitert).
  // Die API-Stufe bleibt Fallback für Songs OHNE Inline-URL (blob:,
  // storedMedia, relativeCoverPath) und übernimmt, wenn das Inline-Bild
  // fehlschlägt (z. B. offline gewordene http-Quelle).
  const [stage, setStage] = useState<'api' | 'inline' | 'initials'>(inlineUsable ? 'inline' : 'api');
  const [attempt, setAttempt] = useState(0);
  const retriesRef = useRef(0);
  // R53 — Merkt sich, dass das Inline-Bild bereits gescheitert ist. Die
  // API-Stufe bekommt danach die VOLLE Retry-Leiter (vorher nur 1 Versuch —
  // ein einziger transienter Proxy-Fehler begrub das Cover für immer), und
  // nach deren Ende geht es zu den Initialen (nie zurück zum toten Inline).
  const inlineFailedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Timers bei Unmount clearen — Retries nur solange gemountet
  useEffect(() => {
    const timer = timerRef;
    return () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
    };
  }, []);

  // Song-Wechsel (React.memo-Reuse derselben Instanz): Fallback-Stufen
  // und Retry-Budget zurücksetzen.
  useEffect(() => {
    inlineFailedRef.current = false;
    setStage(inlineUsable ? 'inline' : 'api');
    setAttempt(0);
    retriesRef.current = 0;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songId]);

  const handleApiError = () => {
    if (retriesRef.current < API_RETRY_DELAYS_MS.length) {
      const delay = API_RETRY_DELAYS_MS[retriesRef.current];
      retriesRef.current += 1;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        // Bump des attempt-State → img mit neuem key + Cache-Buster →
        // neuer Ladeversuch für Stufe 1.
        setAttempt((a) => a + 1);
      }, delay);
    } else {
      // Stufe 1 endgültig gescheitert → Initialen. R53: Kein Zurück zu
      // Stufe 2, wenn das Inline-Bild dort schon gescheitert ist (vorher
      // Ping-Pong zwischen zwei toten Quellen).
      setStage('initials');
    }
  };

  const hue = songCoverHue(songId);
  // Cache-Buster nur nach fehlgeschlagenen Versuchen (der Erfolgsfall soll
  // vom 1-Tag-Browser-Cache profitieren).
  const apiSrc = '/api/mobile?action=songcover&songId=' + encodeURIComponent(songId)
    + (attempt > 0 ? '&_r=' + attempt : '');

  return (
    <div
      aria-hidden="true"
      className={'relative shrink-0 overflow-hidden ' + className}
      style={{ background: `linear-gradient(135deg, hsl(${hue} 45% 38%), hsl(${(hue + 40) % 360} 50% 22%))` }}
    >
      {/* Initialen-Fallback (liegt UNTER dem Bild — sobald ein JPEG da ist,
          ueberdeckt es die Kachel; ein fehlgeschlagenes img bleibt leer) */}
      <span className="absolute inset-0 flex items-center justify-center text-[13px] font-bold tracking-wider text-white/85 select-none">
        {songInitials(title)}
      </span>
      {stage === 'api' && (
        <img
          key={attempt}
          src={apiSrc}
          alt=""
          loading="lazy"
          decoding="async"
          onError={handleApiError}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      {stage === 'inline' && inlineUsable && (
        <img
          src={coverImage}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => {
            // R53: Inline-Bild failed (offline, Mixed-Content, CORS) → API-
            // Thumbnail mit VOLLER Retry-Leiter, danach Initialen.
            inlineFailedRef.current = true;
            if (retriesRef.current < API_RETRY_DELAYS_MS.length) {
              setStage('api');
            } else {
              setStage('initials');
            }
          }}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </div>
  );
});
