'use client';

import { useSyncExternalStore } from 'react';
import {
  subscribeCompanionHttpsInfo,
  getCompanionHttpsInfoSnapshot,
  type CompanionHttpsInfoSnapshot,
} from '@/lib/qr-code';

/**
 * R60-D — Reaktiver Zugang zum HTTPS-Info-Cache (Port + DuckDNS-Domain +
 * Zertifikats-Quelle) aus `src/lib/qr-code.ts`.
 *
 * Baut auf useSyncExternalStore über den Mini-Observer-Store im qr-code-Modul:
 * Jede Cache-Änderung — Boot-Hydration (`initCompanionHttpsInfo` in
 * use-app-effects), DuckDNS-Aktivierung/Entfernung in den Settings
 * (`updateCompanionHttpsInfo`), Selbst-Erkennung im Companion
 * (buildCompanionUrl) — bumpt die Version und triggert genau EINEN
 * Re-Render in jeder Komponente, die diesen Hook konsumiert.
 *
 * Anwendungsmuster in QR-Komponenten (alle Call-Sites R60-D):
 * ```tsx
 * const httpsInfo = useCompanionHttpsInfo();
 * void httpsInfo; // bewusste Re-Render-Abhängigkeit: Version ändert sich →
 *                 // buildCompanionUrl liest unten den frischen Cache.
 * const qrCodeSrc = useQRCode(localIP ? buildCompanionUrl(localIP) : '', 160);
 * ```
 *
 * Der Snapshot ist ein referenz-stabiles Objekt (wird nur bei effektiven
 * Änderungen neu gebaut) — useSyncExternalStore gerät dadurch nicht in eine
 * Endlos-Re-Render-Schleife. Der initiale Server-Snapshot ist leer
 * (port/domain/source null) — QR-Komponenten rendern initial das IP-Format
 * und springen nach der Boot-Hydration innerhalb eines Render-Zyklus um.
 */
export function useCompanionHttpsInfo(): CompanionHttpsInfoSnapshot {
  return useSyncExternalStore(
    subscribeCompanionHttpsInfo,
    getCompanionHttpsInfoSnapshot,
    getCompanionHttpsInfoSnapshot, // SSR: leerer Initial-Snapshot (stabil)
  );
}
