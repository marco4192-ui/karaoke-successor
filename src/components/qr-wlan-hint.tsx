'use client';

import { useTranslation } from '@/lib/i18n/translations';

/**
 * "Connect to the same Wi-Fi first" hint shown under EVERY Companion-App
 * QR code (user request 1.1) — home, settings, character card, party setup
 * sidebar and the mobile mirror settings.
 *
 * Re-export for reuse: import { QrWlanHint } from '@/components/qr-wlan-hint';
 */
export function QrWlanHint({ className = '' }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <p
      className={`text-[11px] leading-relaxed text-amber-300/90 mt-2 flex items-start gap-1.5 ${className}`}
      role="note"
    >
      <span aria-hidden="true">⚠️</span>
      <span>{t('unifiedSetup.qrWlanHint')}</span>
    </p>
  );
}
