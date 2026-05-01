'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/lib/i18n/translations';
import { MusicIcon, LibraryIcon, PartyIcon, UserIcon, QueueIcon, StarIcon, TrophyIcon, SettingsIcon } from '@/components/icons';
import type { Screen } from '@/types/screens';

interface NavBarProps {
  screen: Screen;
  setScreen: (s: Screen) => void;
  queueLength: number;
  isMounted: boolean;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
}

// ===================== NAVIGATION BAR =====================
export function NavBar({ screen, setScreen, queueLength, isMounted, isFullscreen, toggleFullscreen }: NavBarProps) {
  const { t } = useTranslation();
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/30 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <button onClick={() => setScreen('home')} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center">
            <MusicIcon className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Karaoke Successor
          </span>
        </button>

        <div className="flex items-center gap-2">
          <NavButton active={screen === 'library'} onClick={() => setScreen('library')}>
            <LibraryIcon className="w-5 h-5" /> {t('nav.library')}
          </NavButton>
          <NavButton active={screen === 'party'} onClick={() => setScreen('party')}>
            <PartyIcon className="w-5 h-5" /> {t('nav.party')}
          </NavButton>
          <NavButton active={screen === 'dailyChallenge'} onClick={() => setScreen('dailyChallenge')}>
            <StarIcon className="w-5 h-5" /> Challenges
          </NavButton>
          <NavButton active={screen === 'queue'} onClick={() => setScreen('queue')}>
            <QueueIcon className="w-5 h-5" /> {t('nav.queue')}
            {isMounted && queueLength > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">{queueLength}</Badge>
            )}
          </NavButton>
          <NavButton active={screen === 'character'} onClick={() => setScreen('character')}>
            <UserIcon className="w-5 h-5" /> {t('nav.characters')}
          </NavButton>
          <NavButton active={screen === 'highscores'} onClick={() => setScreen('highscores')}>
            <TrophyIcon className="w-5 h-5" /> {t('nav.highscores')}
          </NavButton>
          <NavButton active={screen === 'achievements'} onClick={() => setScreen('achievements')}>
            <TrophyIcon className="w-5 h-5" /> {t('nav.achievements')}
          </NavButton>
          <NavButton active={screen === 'jukebox'} onClick={() => setScreen('jukebox')}>
            <MusicIcon className="w-5 h-5" /> {t('nav.jukebox')}
          </NavButton>
          <NavButton active={screen === 'settings'} onClick={() => setScreen('settings')}>
            <SettingsIcon className="w-5 h-5" /> {t('nav.settings')}
          </NavButton>
          {/* Fullscreen Toggle Button */}
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all text-white/70 hover:text-white hover:bg-white/10"
            title={isFullscreen ? "Exit Fullscreen (F11)" : "Toggle Fullscreen (F11)"}
          >
            {isFullscreen ? (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
              </svg>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}

// ===================== FULLSCREEN EXIT BUTTON =====================
export function FullscreenExitButton() {
  return (
    <button
      onClick={() => document.exitFullscreen().catch(() => {})}
      className="fixed top-4 right-4 z-50 p-3 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 hover:bg-black/70 hover:border-white/40 transition-all group"
      title="Exit Fullscreen (ESC)"
    >
      <svg className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
      </svg>
    </button>
  );
}

// ===================== NAV BUTTON =====================
function NavButton({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
        active
          ? 'bg-white/20 text-white'
          : 'text-white/70 hover:text-white hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  );
}
