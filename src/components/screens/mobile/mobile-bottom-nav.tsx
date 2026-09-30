'use client';

import React, { useEffect, useRef } from 'react';
import { useTranslation } from '@/lib/i18n/translations';

// ===================== Desktop-Menüpunkte für den Footer =====================

interface NavItem {
  screen: string;
  icon: string;
  labelKey: string;
  fallback: string;
}

// R39/P9: Der Profiles-Tab ist aus der mobilen Tab-Leiste ENTFERNT —
// das eigene Profil bleibt über den Header-Avatar erreichbar (auch ohne
// Steuerung). Der Desktop-Profildialog (alle Profile verwalten) ist bewusst
// nur am Desktop: Auf dem Handy ist er zu unübersichtlich.
const FOOTER_ITEMS: NavItem[] = [
  { screen: 'home',          icon: '🏠', labelKey: 'nav.home',        fallback: 'Start' },
  { screen: 'library',       icon: '🎵', labelKey: 'nav.library',      fallback: 'Bibliothek' },
  { screen: 'party',         icon: '🎉', labelKey: 'nav.party',       fallback: 'Party' },
  { screen: 'dailyChallenge',icon: '⭐', labelKey: 'nav.daily',       fallback: 'Challenge' },
  { screen: 'queue',         icon: '📋', labelKey: 'nav.queue',       fallback: 'Queue' },
  { screen: 'jukebox',       icon: '📻', labelKey: 'nav.jukebox',     fallback: 'Jukebox' },
  { screen: 'highscores',    icon: '🏆', labelKey: 'nav.highscores',  fallback: 'Highscores' },
  { screen: 'achievements',  icon: '🏅', labelKey: 'nav.achievements', fallback: 'Erfolge' },
  { screen: 'settings',      icon: '⚙️', labelKey: 'nav.settings',    fallback: 'Einstellungen' },
];

// ===================== Props =====================

interface MobileBottomNavProps {
  activeScreen: string;
  onNavigate: (screen: string) => void;
  /** Legacy: komplett deaktivierte Items (nicht klickbar, kein Feedback). */
  disabledScreens?: string[];
  /** R33/P2+P14: Gesperrte Items — ausgegraut mit Schloss-Badge; Tap löst
   *  onLockedTap aus (z. B. Toast "Nur mit Fernsteuerung"). */
  lockedScreens?: string[];
  onLockedTap?: (screen: string) => void;
}

// ===================== Component =====================

export function MobileBottomNav({ activeScreen, onNavigate, disabledScreens, lockedScreens, onLockedTap }: MobileBottomNavProps) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Scrolle zum aktiven Tab beim Wechsel
  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const btn = activeRef.current;
      const scrollLeft = btn.offsetLeft - container.offsetWidth / 2 + btn.offsetWidth / 2;
      container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
  }, [activeScreen]);

  const handleTap = (screen: string) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10);
    }
    onNavigate(screen);
  };

  const handleLockedTap = (screen: string) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10);
    }
    onLockedTap?.(screen);
  };

  return (
    <nav
      role="tablist"
      className={
        'fixed bottom-0 left-0 right-0 z-30 ' +
        'bg-black/80 backdrop-blur-xl border-t border-white/10'
      }
      style={{ paddingBottom: 'max(0px, env(safe-area-inset-bottom))' }}
    >
      <div
        ref={scrollRef}
        className="flex gap-1 overflow-x-auto no-scrollbar px-2 py-1.5"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {FOOTER_ITEMS.map((item) => {
          const isDisabled = disabledScreens?.includes(item.screen);
          const isLocked = !isDisabled && lockedScreens?.includes(item.screen);
          const isActive = activeScreen === item.screen ||
            (item.screen === 'home' && activeScreen === 'home') ||
            (item.screen === 'party' && activeScreen === 'party') ||
            (item.screen === 'party' && activeScreen === 'party-setup');
          const label = t(item.labelKey) === item.labelKey ? item.fallback : t(item.labelKey);
          return (
            <button
              key={item.screen}
              ref={isActive ? activeRef : undefined}
              onClick={() => {
                if (isLocked) handleLockedTap(item.screen);
                else if (!isDisabled) handleTap(item.screen);
              }}
              role="tab"
              aria-selected={isActive}
              aria-label={label}
              aria-disabled={isDisabled || isLocked}
              title={isLocked ? `${label} 🔒` : label}
              className={
                // Touch-Target ≥ 44px (P2): min-h/min-w garantieren die
                // Daumenfreundlichkeit auch auf kleinen Smartphones.
                'shrink-0 flex min-h-[44px] min-w-[48px] flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-lg transition-all ' +
                (isDisabled
                  ? 'text-white/15 opacity-40 pointer-events-none'
                  : isLocked
                    ? 'text-white/25 opacity-50 active:opacity-40'
                    : isActive
                      ? 'bg-cyan-500/20 text-cyan-400'
                      : 'text-white/40 active:text-white/70')
              }
            >
              <span className="relative">
                <span className={'text-lg leading-none ' + (isLocked ? 'grayscale' : '')}>{item.icon}</span>
                {isLocked && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-1.5 -right-2 text-[9px] leading-none"
                  >
                    🔒
                  </span>
                )}
              </span>
              <span className="text-[10px] font-medium leading-tight whitespace-nowrap">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}MobileBottomNav.displayName = 'MobileBottomNav';
