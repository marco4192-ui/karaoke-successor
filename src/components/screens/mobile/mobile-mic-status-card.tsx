'use client';

import { useTranslation } from '@/lib/i18n/translations';
import { tOr } from '@/lib/i18n/t-or';

// ===================== R52/R54: MIC-STATUS-KARTE =====================
// Aus mobile-client-view.tsx ausgelagert (Refactoring). R54 neu: die Karte
// zeigt jetzt auch den Wake-Lock-Status (Bildschirm bleibt während des
// Gesangs an) bzw. einen Hinweis, wenn das nicht möglich ist.

export interface MicStatusCardProps {
  isListening: boolean;
  audioSuspended: boolean;
  hasSignal: boolean;
  micPermissionDenied: boolean;
  /** R53: true, wenn die Seite über http://<LAN-IP> geladen wurde — dann ist
   *   getUserMedia browserseitig blockiert und nur der HTTPS-Wechsel hilft. */
  insecureContext: boolean;
  /** R53: Server hat einen HTTPS-Listener aktiv (Tap navigiert dorthin). */
  httpsAvailable: boolean;
  volume: number;
  note: number | null;
  /** R54: Screen Wake Lock wird gehalten (Display bleibt an). */
  wakeLockHeld: boolean;
  /** R54: Wake Lock API wird vom Browser unterstützt. */
  wakeLockSupported: boolean;
  /** R60: Der Schutz ist aktuell GEWOLLT (Gesang/Countdown/Mic aktiv) — nur
   *   dann macht der „gewollt aber nicht gehalten"-Hinweis Sinn (z. B.
   *   iOS-Energiesparmodus blockiert request()). */
  wakeLockActive?: boolean;
  /** R61: Die Anfrage wurde WIRKLICH vom Browser abgelehnt (NotAllowedError,
   *   z. B. iOS Low Power Mode / Android Energiesparmodus). Nur dann ist der
   *   „Energiesparmodus"-Hinweis berechtigt — R60 zeigte ihn pauschal bei
   *   jedem „nicht gehalten" (inkl. transienter Fehler), was Nutzer meldeten,
   *   obwohl KEIN Energiesparmodus aktiv war. */
  wakeLockBlocked?: boolean;
  onActivate: () => void;
}

/** Notenname aus MIDI-Nummer (69 = A4) für die Live-Anzeige. */
export function midiNoteName(note: number | null): string | null {
  if (note === null || !Number.isFinite(note)) return null;
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const rounded = Math.round(note);
  return names[((rounded % 12) + 12) % 12] + (Math.floor(rounded / 12) - 1);
}

/**
 * Kompakte, immer tappbare Mikrofon-Status-Karte für ALLE Modi, in denen
 * das Handy selbst die Gesangs-Eingabe ist (Standard P1/P2-Companion, CPTM,
 * Sing-Along, Battle Royale, Medley). Zustände:
 *   grün  — Mikro läuft UND liefert Signal (Volume-Bar + Note live)
 *   amber — Start läuft gerade ODER kein Signal (iOS-suspended): „Tippen
 *           zum Aktivieren" — der Tap resumed/started in echter Geste
 *   rot   — Mikrofon-Zugriff verweigert (Einstellungs-Hinweis)
 *   rot🔒 — HTTP-Kontext: Mikro komplett blockiert → HTTPS-Wechsel
 */
export function MicStatusCard({
  isListening, audioSuspended, hasSignal, micPermissionDenied,
  insecureContext, httpsAvailable, volume, note,
  wakeLockHeld, wakeLockSupported, wakeLockActive, wakeLockBlocked, onActivate,
}: MicStatusCardProps) {
  const { t } = useTranslation();

  const running = isListening && hasSignal && !audioSuspended;
  const needsTap = !isListening || audioSuspended || (!hasSignal && isListening);
  // R53: insecure schlägt ALLES — ohne HTTPS kann das Mikro nie starten.
  const state: 'ok' | 'wait' | 'denied' | 'insecure' = insecureContext
    ? 'insecure'
    : micPermissionDenied
      ? 'denied'
      : (running ? 'ok' : 'wait');

  const statusText = state === 'insecure'
    ? tOr(t, 'mobile.micStatusInsecure', 'Mikrofon über HTTP blockiert')
    : state === 'denied'
      ? tOr(t, 'mobile.micStatusDenied', 'Mikrofon-Zugriff verweigert')
      : state === 'ok'
        ? tOr(t, 'mobile.micStatusActive', 'Mikrofon aktiv')
        : isListening
          ? tOr(t, 'mobile.micStatusNoSignal', 'Kein Mikrofon-Signal')
          : tOr(t, 'mobile.micStatusStarting', 'Mikrofon wird gestartet…');

  return (
    <button
      type="button"
      onClick={onActivate}
      data-testid="mobile-mic-status-card"
      aria-live="polite"
      className={
        'fixed left-3 right-3 z-[55] flex items-center gap-3 rounded-2xl border px-4 py-3 text-left shadow-2xl backdrop-blur-md transition-all active:scale-[0.98] ' +
        (state === 'ok'
          ? 'border-emerald-500/40 bg-emerald-950/85'
          : state === 'denied' || state === 'insecure'
            ? 'border-red-500/40 bg-red-950/85'
            : 'border-amber-500/40 bg-amber-950/85 animate-pulse')
      }
      style={{ bottom: 'calc(4.75rem + env(safe-area-inset-bottom))' }}
    >
      {/* Status-Icon */}
      <span className="shrink-0 text-xl leading-none" aria-hidden="true">
        {state === 'ok' ? '🎤' : state === 'denied' ? '🚫' : state === 'insecure' ? '🔒' : '🎙️'}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-white">
          {tOr(t, 'mobile.micStatusTitle', 'Du singst über dieses Handy')}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span
            className={
              'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ' +
              (state === 'ok'
                ? 'bg-emerald-500/25 text-emerald-300'
                : state === 'denied' || state === 'insecure'
                  ? 'bg-red-500/25 text-red-300'
                  : 'bg-amber-500/25 text-amber-300')
            }
          >
            {statusText}
          </span>
          {state === 'insecure' ? (
            <span className="shrink-0 text-[10px] font-semibold text-red-200/90">
              {httpsAvailable
                ? '👆 ' + (tOr(t, 'mobile.micStatusInsecureHint', 'Tippen → HTTPS-Verbindung, dann Mikrofon freigeben'))
                : '⚠️ ' + (tOr(t, 'mobile.micStatusInsecureNoHttps', 'Server ohne HTTPS — Desktop-Neustart erforderlich'))}
            </span>
          ) : needsTap && state !== 'denied' ? (
            <span className="shrink-0 text-[10px] font-semibold text-amber-200/80">
              👆 {tOr(t, 'mobile.micStatusTapToActivate', 'Tippen zum Aktivieren')}
            </span>
          ) : null}
          {state === 'ok' && note !== null && (
            <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold tabular-nums text-white/85">
              {midiNoteName(note)}
            </span>
          )}
          {/* R54 — Wake-Lock-Status: Bildschirm bleibt an (das ist der
              Schutz gegen das Standby-Problem der Pitch-Erkennung). */}
          {state === 'ok' && wakeLockHeld && (
            <span
              className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-200"
              title={tOr(t, 'mobile.wakeLockBadge', 'Bildschirm bleibt an')}
            >
              ☀️ {tOr(t, 'mobile.wakeLockBadge', 'Bildschirm bleibt an')}
            </span>
          )}
          {!wakeLockSupported && (
            <span
              className="shrink-0 text-[10px] font-semibold text-white/45"
              title={tOr(t, 'mobile.wakeLockUnsupported', 'Display während des Gesangs anlassen')}
            >
              ⚠️ {tOr(t, 'mobile.wakeLockUnsupported', 'Display während des Gesangs anlassen')}
            </span>
          )}
          {/* R60/R61 — API vorhanden, Schutz gewollt, Lock nicht gehalten UND
              vom Browser WIRKLICH abgelehnt (NotAllowedError = iOS Low Power
              Mode / Android Energiesparmodus): erst dann ist der Hinweis
              berechtigt. R60 zeigte ihn pauschal bei jedem nicht-gehalten —
              darunter dem R61-Bug (Illegal invocation), bei dem der Hinweis
              auf jedem Android ohne aktiven Energiesparmodus dauerhaft
              erschien. Transiente Fehler (z. B. unsichtbares Dokument beim
              request) bleiben bewusst unsichtbar — der 15s-Watchdog holt
              den Lock automatisch nach. */}
          {wakeLockSupported && wakeLockActive && !wakeLockHeld && wakeLockBlocked && (
            <span
              className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-200"
              title={tOr(t, 'mobile.wakeLockLowPower', 'Display-Schutz blockiert — Energiesparmodus deaktivieren')}
            >
              ⚠️ {tOr(t, 'mobile.wakeLockLowPower', 'Display-Schutz blockiert — Energiesparmodus deaktivieren')}
            </span>
          )}
        </div>
        {/* Volume-Bar (nur im OK-Zustand live) */}
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10" aria-hidden="true">
          <div
            className={'h-full rounded-full transition-[width] duration-100 ' + (state === 'ok' ? 'bg-emerald-400' : 'bg-amber-400/60')}
            style={{ width: `${Math.min(100, Math.round((state === 'ok' ? volume : 0.12) * 100))}%` }}
          />
        </div>
      </div>
    </button>
  );
}
