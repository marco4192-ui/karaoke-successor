'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n/translations';
import { initCompanionHttpsInfo, type CompanionHttpsInfo } from '@/lib/qr-code';

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
 * R55: Mit aktivem Let's-Encrypt-Zertifikat (DuckDNS eingerichtet) erscheint
 * stattdessen eine GRÜNE Bestätigung — die Verbindung ist per echtem
 * Zertifikat gesichert, Handys vertrauen ihr automatisch, nichts zu tun.
 */
export function QrWlanHint({ className = '' }: { className?: string }) {
  const { t } = useTranslation();
  const [httpsInfo, setHttpsInfo] = useState<CompanionHttpsInfo | null>(null);

  // R52/R55: HTTPS-Status einmalig ziehen (initCompanionHttpsInfo cached) —
  // Port + Domain + Zertifikats-Quelle in einer Abfrage.
  useEffect(() => {
    let cancelled = false;
    initCompanionHttpsInfo().then((info) => {
      if (!cancelled) setHttpsInfo(info);
    }).catch(() => { /* hint stays hidden */ });
    return () => { cancelled = true; };
  }, []);

  const trusted = httpsInfo?.source === 'letsencrypt' && !!httpsInfo.domain;
  const isHttps = !!httpsInfo?.port;

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
        trusted ? (
          <p
            className="text-[11px] leading-relaxed text-emerald-300/90 mt-1.5 flex items-start gap-1.5"
            role="note"
            data-testid="qr-trusted-hint"
          >
            <span aria-hidden="true">✅</span>
            <span>
              {t('unifiedSetup.qrTrustedHint') === 'unifiedSetup.qrTrustedHint'
                ? 'Diese Verbindung nutzt ein echtes Zertifikat (Let\u2019s Encrypt) — Handys vertrauen ihr automatisch, keine Installation nötig.'
                : t('unifiedSetup.qrTrustedHint')}
            </span>
          </p>
        ) : (
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
        )
      ) : null}
    </div>
  );
}
