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

const FOOTER_ITEMS: NavItem[] = [
  { screen: 'home',          icon: '🏠', labelKey: 'nav.home',        fallback: 'Start' },
  { screen: 'library',       icon: '🎵', labelKey: 'nav.library',      fallback: 'Bibliothek' },
  { screen: 'party',         icon: '🎉', labelKey: 'nav.party',       fallback: 'Party' },
  { screen: 'dailyChallenge',icon: '⭐', labelKey: 'nav.daily',       fallback: 'Challenge' },
  { screen: 'queue',         icon: '📋', labelKey: 'nav.queue',       fallback: 'Queue' },
  { screen: 'jukebox',       icon: '📻', labelKey: 'nav.jukebox',     fallback: 'Jukebox' },
  { screen: 'highscores',    icon: '🏆', labelKey: 'nav.highscores',  fallback: 'Highscores' },
  { screen: 'achievements',  icon: '🏅', labelKey: 'nav.achievements', fallback: 'Erfolge' },
  { screen: 'profile',       icon: '👤', labelKey: 'nav.profiles',    fallback: 'Profile' },
  { screen: 'settings',      icon: '⚙️', labelKey: 'nav.settings',    fallback: 'Einstellungen' },
];

// ===================== Props =====================

interface MobileBottomNavProps {
  activeScreen: string;
  onNavigate: (screen: string) => void;
  disabledScreens?: string[];
}

// ===================== Component =====================

export function MobileBottomNav({ activeScreen, onNavigate, disabledScreens }: MobileBottomNavProps) {
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
        className="flex gap-1 overflow-x-auto no-scrollbar px-2 py-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {FOOTER_ITEMS.map((item) => {
          const isDisabled = disabledScreens?.includes(item.screen);
          const isActive = activeScreen === item.screen ||
            (item.screen === 'home' && activeScreen === 'home') ||
            (item.screen === 'party' && activeScreen === 'party') ||
            (item.screen === 'party-setup' && activeScreen === 'party-setup');
          const label = t(item.labelKey) === item.labelKey ? item.fallback : t(item.labelKey);
          return (
            <button
              key={item.screen}
              ref={isActive ? activeRef : undefined}
              onClick={() => !isDisabled && handleTap(item.screen)}
              role="tab"
              aria-selected={isActive}
              aria-label={label}
              aria-disabled={isDisabled}
              className={
                'shrink-0 flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-all ' +
                (isDisabled
                  ? 'text-white/15 opacity-40 pointer-events-none'
                  : isActive
                    ? 'bg-cyan-500/20 text-cyan-400'
                    : 'text-white/40 active:text-white/70')
              }
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span className="text-[10px] font-medium leading-tight whitespace-nowrap">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}