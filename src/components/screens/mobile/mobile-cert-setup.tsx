'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n/translations';
import { tOr } from '@/lib/i18n/t-or';
import { setItem, getItem } from '@/lib/storage';

// ===================== R54: Zertifikat-Einrichtung (Cert Setup) =====================
// Einmalige Einrichtung auf dem Handy: Root-CA des Karaoke-Servers herunter-
// laden und installieren → der Browser vertraut der HTTPS-Verbindung dauer-
// haft (KEINE Zertifikats-Warnung mehr, auch nach IP-Wechseln nicht, weil
// nur der Leaf neu signiert wird).
//
// Sichtbarkeit:
//  - unsicherer Kontext (http://<LAN-IP>): Banner bleibt (nach Wegklick)
//    pro Session sichtbar — hier ist die Einrichtung am relevantesten.
//  - sicherer Kontext (https://): wird EINMAL angeboten (persistent weg-
//    klickbar) — wer die Warnung schon umgangen hat, kann sie dauerhaft
//    loswerden.

const STORAGE_KEY_DISMISSED_HTTPS = 'kz-cert-setup-dismissed-https';
const STORAGE_KEY_DISMISSED_HTTP = 'kz-cert-setup-dismissed-http';

export interface MobileCertSetupProps {
  /** HTTPS-Port des Servers (null = kein HTTPS-Listener aktiv). */
  httpsPort: number | null;
  /** true, wenn die Seite über http://<LAN-IP> geladen wurde. */
  insecureContext: boolean;
}

export function MobileCertSetup({ httpsPort, insecureContext }: MobileCertSetupProps) {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState<boolean | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  // Dismiss-Status aus dem localStorage (persistent über HTTPS, pro Session
  // über HTTP — je nach Kontext) + Plattform-Erkennung.
  useEffect(() => {
    try {
      setDismissed(insecureContext
        ? sessionStorage.getItem(STORAGE_KEY_DISMISSED_HTTP) === '1'
        : getItem(STORAGE_KEY_DISMISSED_HTTPS) === '1');
    } catch {
      setDismissed(false);
    }
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    setIsIos(/iPad|iPhone|iPod/.test(ua));
    setShowSteps(false);
  }, [insecureContext]);

  // Ohne HTTPS-Listener gibt es nichts einzurichten; nach dem Wegklicken
  // bleibt das Banner weg (HTTPS: dauerhaft; HTTP: bis zur nächsten Session).
  if (httpsPort === null || dismissed === true) return null;

  const dismiss = () => {
    try {
      if (insecureContext) sessionStorage.setItem(STORAGE_KEY_DISMISSED_HTTP, '1');
      else setItem(STORAGE_KEY_DISMISSED_HTTPS, '1');
    } catch { /* localStorage gesperrt — nur State setzen */ }
    setDismissed(true);
  };

  const openHttps = () => {
    if (typeof window === 'undefined') return;
    const port = httpsPort ? ':' + httpsPort : '';
    window.location.href = 'https://' + window.location.hostname + port + window.location.pathname + window.location.search;
  };

  return (
    <div
      data-testid="mobile-cert-setup"
      className="mx-3 mb-3 rounded-2xl border border-cyan-500/30 bg-cyan-950/60 p-3.5 backdrop-blur-md"
    >
      <div className="flex items-start gap-3">
        <span className="shrink-0 text-xl leading-none" aria-hidden="true">🔒</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white">
            {tOr(t, 'mobile.certSetupTitle', 'Einmalige Einrichtung: Zertifikat installieren')}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-white/65">
            {tOr(t, 'mobile.certSetupWhy',
              'Installiere das Karaoke-Zertifikat einmalig auf diesem Handy — danach verbindet sich die App ohne Browser-Warnung (auch nach WLAN-/IP-Wechseln).')}
          </p>

          {/* Plattform-abhängige Schritt-für-Schritt-Anleitung (einklappbar) */}
          {!showSteps ? (
            <button
              type="button"
              onClick={() => setShowSteps(true)}
              className="mt-2 text-xs font-semibold text-cyan-300 underline underline-offset-2 active:opacity-70"
            >
              {tOr(t, 'mobile.certSetupShowSteps', 'Schritt-für-Schritt-Anleitung')}
            </button>
          ) : (
            <ol className="mt-2.5 space-y-1.5 text-xs text-white/75">
              {isIos ? (
                <>
                  <li className="flex gap-2"><span className="shrink-0 font-bold text-cyan-300">1.</span><span>{tOr(t, 'mobile.certSetupIos1', 'Tippe unten auf „Zertifikat herunterladen“ — Safari meldet „Profil geladen“.')}</span></li>
                  <li className="flex gap-2"><span className="shrink-0 font-bold text-cyan-300">2.</span><span>{tOr(t, 'mobile.certSetupIos2', 'Einstellungen → Allgemein → VPN & Geräteverwaltung → „Karaoke ZERO Local CA“ → Installieren (PIN eingeben).')}</span></li>
                  <li className="flex gap-2"><span className="shrink-0 font-bold text-cyan-300">3.</span><span>{tOr(t, 'mobile.certSetupIos3', 'Einstellungen → Allgemein → Info → Zertifikats-Vertrauenseinstellungen → „Karaoke ZERO Local CA“ aktivieren.')}</span></li>
                </>
              ) : (
                <>
                  <li className="flex gap-2"><span className="shrink-0 font-bold text-cyan-300">1.</span><span>{tOr(t, 'mobile.certSetupAndroid1', 'Tippe unten auf „Zertifikat herunterladen“ — die Datei landet in Downloads.')}</span></li>
                  <li className="flex gap-2"><span className="shrink-0 font-bold text-cyan-300">2.</span><span>{tOr(t, 'mobile.certSetupAndroid2', 'Öffne die Datei (Downloads / Benachrichtigung) → „CA-Zertifikat“ → installieren (ggf. PIN) — die Warnung „Netzwerk kann überwacht werden“ ist für dein Heimnetzwerk OK.')}</span></li>
                </>
              )}
            </ol>
          )}

          {/* Aktionen */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <a
              href="/api/mobile?action=ca-cert"
              download="karaoke-zero-ca.crt"
              onClick={() => {
                if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(10);
              }}
              className="flex-1 rounded-xl bg-cyan-500/90 px-3.5 py-2.5 text-center text-sm font-bold text-black active:scale-[0.98] transition-transform"
            >
              ⬇️ {tOr(t, 'mobile.certSetupDownload', 'Zertifikat herunterladen')}
            </a>
            {insecureContext && (
              <button
                type="button"
                onClick={openHttps}
                className="flex-1 rounded-xl bg-white/10 border border-white/20 px-3.5 py-2.5 text-sm font-bold text-white/80 active:scale-[0.98] transition-transform"
              >
                {tOr(t, 'mobile.certSetupContinueHttps', 'Weiter zu HTTPS')} →
              </button>
            )}
          </div>
          {insecureContext && (
            <p className="mt-2 text-[11px] leading-relaxed text-white/50">
              {tOr(t, 'mobile.certSetupDoneHint',
                'Zertifikat installiert? Dann „Weiter zu HTTPS“ — die Warnung bleibt aus und das Mikrofon lässt sich freigeben.')}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label={tOr(t, 'mobile.certSetupLater', 'Später')}
          title={tOr(t, 'mobile.certSetupLater', 'Später')}
          className="shrink-0 rounded-full bg-white/10 p-1.5 text-xs text-white/60 active:scale-90 transition-transform"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
