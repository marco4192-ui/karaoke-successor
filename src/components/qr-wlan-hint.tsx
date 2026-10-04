'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n/translations';
import { initCompanionHttpsPort } from '@/lib/qr-code';

/**
 * "Connect to the same Wi-Fi first" hint shown under EVERY Companion-App
 * QR code (user request 1.1) — home, settings, character card, party setup
 * sidebar and the mobile mirror settings.
 *
 * R52: Läuft der Server mit HTTPS-Listener (Tauri-Produktion), erscheint
 * zusätzlich der Hinweis auf die EINMALIGE Zertifikats-Bestätigung — der
 * Browser warnt bei Self-Signed-Certs, der Nutzer muss „Erweitert → Weiter"
 * klicken, damit die Mikrofon-Freigabe (Companion als Mic) funktioniert.
 *
 * Re-export for reuse: import { QrWlanHint } from '@/components/qr-wlan-hint';
 */
export function QrWlanHint({ className = '' }: { className?: string }) {
  const { t } = useTranslation();
  const [isHttps, setIsHttps] = useState(false);

  // R52: HTTPS-Status einmalig ziehen (initCompanionHttpsPort cached) — der
  // Hinweis erscheint nur im Produktions-Bundle, nicht im Dev-Betrieb.
  useEffect(() => {
    let cancelled = false;
    initCompanionHttpsPort().then((port) => {
      if (!cancelled) setIsHttps(!!port);
    }).catch(() => { /* hint stays hidden */ });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className={className}>
      <p
        className="text-[11px] leading-relaxed text-amber-300/90 mt-2 flex items-start gap-1.5"
        role="note"
      >
        <span aria-hidden="true">⚠️</span>
        <span>{t('unifiedSetup.qrWlanHint')}</span>
      </p>
      {isHttps ? (
        <p
          className="text-[11px] leading-relaxed text-cyan-300/90 mt-1.5 flex items-start gap-1.5"
          role="note"
        >
          <span aria-hidden="true">🔒</span>
          <span>
            {t('unifiedSetup.qrHttpsHint') === 'unifiedSetup.qrHttpsHint'
              ? 'Beim ersten Öffnen zeigt dein Browser eine Sicherheits-Warnung (selbstsigniertes Zertifikat): tippe auf „Erweitert" → „Weiter" — einmalig pro Gerät. Danach ist die Mikrofon-Nutzung (über das Handy singen) freigegeben.'
              : t('unifiedSetup.qrHttpsHint')}
          </span>
        </p>
      ) : null}
    </div>
  );
}
