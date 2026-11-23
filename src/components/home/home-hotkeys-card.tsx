'use client';

/**
 * R33-e (P3) / R106: Tastenkürzel-Karte auf dem Desktop-Home-Screen.
 * Kompakte, einklappbare Karte unter dem Home-Screen mit den wichtigsten
 * globalen Tastenkürzeln. Die Kürzel sind ECHT (single source of truth:
 * src/hooks/use-keyboard-shortcuts.ts — Ctrl+L Suche, Ctrl+R/D Zufalls-Song,
 * Ctrl+Q Queue, Ctrl+J Jukebox, Esc/Enter Pause, F12 Vollbild, F1–F10
 * Screen-Navigation); die Anzeige-Sprache kommt aus mobile.hotkeys.*
 * (i18n; t() fällt bei fehlenden Übersetzungen automatisch auf EN zurück).
 *
 * Bewusst SEPARAT vom HomeScreen-Component gehalten (R33-e-Regel: nur der
 * Render-Bereich, home-screen.tsx bleibt unberührt) und bewusst OHNE jede
 * State-/Sync-Logik: einziger Zustand ist der lokale Collapse-State —
 * persistiert im localStorage-Key 'karaoke-hotkeys-collapsed' (Standard:
 * aufgeklappt). R106: aus karaoke-app.tsx in ein eigenes Modul extrahiert.
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n/translations';

const HOTKEYS_COLLAPSE_STORAGE_KEY = 'karaoke-hotkeys-collapsed';

/** Die wichtigsten globalen Kürzel (key = Anzeige, label = mobile.hotkeys.*). */
const HOME_HOTKEY_ENTRIES: Array<{ keys: string; i18nKey: string; wide?: boolean }> = [
  { keys: 'Ctrl+L', i18nKey: 'mobile.hotkeys.ctrlL' },
  { keys: 'Ctrl+R', i18nKey: 'mobile.hotkeys.ctrlR' },
  { keys: 'Ctrl+D', i18nKey: 'mobile.hotkeys.ctrlD' },
  { keys: 'Ctrl+Q', i18nKey: 'mobile.hotkeys.ctrlQ' },
  { keys: 'Ctrl+J', i18nKey: 'mobile.hotkeys.ctrlJ' },
  { keys: 'Esc', i18nKey: 'mobile.hotkeys.esc' },
  { keys: 'Enter', i18nKey: 'mobile.hotkeys.enter' },
  { keys: 'F12', i18nKey: 'mobile.hotkeys.f12' },
  { keys: 'F1–F10', i18nKey: 'mobile.hotkeys.fkeys', wide: true },
];

export function HomeHotkeysCard() {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);

  // Persistierter Collapse-State — erst NACH dem Mount lesen (vermeidet
  // SSR-/Hydration-Mismatch; Standard ist aufgeklappt, daher flackert die
  // Karte nur für Nutzer, die sie zuvor bewusst eingeklappt haben).
  useEffect(() => {
    try {
      if (window.localStorage.getItem(HOTKEYS_COLLAPSE_STORAGE_KEY) === '1') {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration sync (same pattern as HomeScreen)
        setCollapsed(true);
      }
    } catch { /* localStorage nicht verfügbar (Privat-Modus) — aufgeklappt bleiben */ }
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev;
      try {
        window.localStorage.setItem(HOTKEYS_COLLAPSE_STORAGE_KEY, next ? '1' : '0');
      } catch { /* ignore — Collapse funktioniert trotzdem für diese Session */ }
      return next;
    });
  }, []);

  return (
    <section
      aria-label={t('mobile.hotkeys.cardTitle')}
      className="w-full max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8 mb-8"
      data-testid="home-hotkeys-card"
    >
      <div className="retro-gradient-card retro-border-cyan rounded-xl">
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-expanded={!collapsed}
          aria-controls="home-hotkeys-list"
          data-testid="home-hotkeys-toggle"
          className="w-full flex items-center justify-between gap-3 p-5 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 transition-colors hover:bg-white/[0.03]"
        >
          <span className="flex items-center gap-3 min-w-0">
            <span className="text-2xl leading-none flex-shrink-0" aria-hidden>⌨️</span>
            <span className="min-w-0">
              <span className="block font-bold text-white">{t('mobile.hotkeys.cardTitle')}</span>
              <span className="block text-xs text-[#b8b8d0]/80 leading-snug">{t('mobile.hotkeys.cardHint')}</span>
            </span>
          </span>
          {/* Bildschirmleser: Zustand steckt in aria-expanded, die Aktion
              zusätzlich explizit als sr-only-Text. */}
          <span className="sr-only">{collapsed ? t('mobile.hotkeys.expand') : t('mobile.hotkeys.collapse')}</span>
          <span
            className={`text-white/40 text-sm flex-shrink-0 transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`}
            aria-hidden
          >
            ▾
          </span>
        </button>
        {!collapsed && (
          <div
            id="home-hotkeys-list"
            className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 px-5 pb-5"
          >
            {HOME_HOTKEY_ENTRIES.map(({ keys, i18nKey, wide }) => (
              <div
                key={keys}
                className={`flex items-center gap-3 min-w-0 ${wide ? 'sm:col-span-2' : ''}`}
                data-testid={`home-hotkey-${keys.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
              >
                <kbd className="flex-shrink-0 px-2 py-1 rounded-md border border-white/15 bg-white/10 text-xs font-semibold font-mono text-white/85 whitespace-nowrap shadow-sm min-w-[3.25rem] text-center">
                  {keys}
                </kbd>
                <span className="text-sm text-[#b8b8d0]/90 leading-snug">{t(i18nKey)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
