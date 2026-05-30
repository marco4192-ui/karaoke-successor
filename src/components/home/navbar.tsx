'use client';

import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/lib/i18n/translations';
import { MusicIcon, LibraryIcon, PartyIcon, UserIcon, QueueIcon, StarIcon, TrophyIcon, SettingsIcon } from '@/components/icons';
import type { Screen } from '@/types/screens';


interface NavBarProps {
  screen: Screen;
  setScreen: (_s: Screen) => void;
  queueLength: number;
  isMounted: boolean;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
}

// ===================== NAVIGATION BAR =====================
export function NavBar({ screen, setScreen, queueLength, isMounted, isFullscreen, toggleFullscreen }: NavBarProps) {
  const { t } = useTranslation();
  return (
    <nav className="sticky top-0 left-0 right-0 z-50 flex-shrink-0 bg-[#1a0a2e]/90 backdrop-blur-xl border-b-2 border-[#F939A3]/30">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <button onClick={() => setScreen('home')} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div
            className="w-10 h-10 rounded-xl bg-[#F939A3] flex items-center justify-center border-[3px] border-black"
            style={{ boxShadow: '4px 4px 0px #FDE601' }}
          >
            <MusicIcon className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-black tracking-tight">
            <span className="text-[#F939A3]" style={{ WebkitTextStroke: '1px black', paintOrder: 'stroke fill' }}>Karaoke</span>{' '}
            <span className="text-[#FDE601]" style={{ WebkitTextStroke: '1px black', paintOrder: 'stroke fill' }}>ELEVEN</span>
          </span>
        </button>

        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          <NavButton active={screen === 'library'} onClick={() => setScreen('library')}>
            <LibraryIcon className="w-5 h-5" /> {t('nav.library')}
          </NavButton>
          <NavButton active={screen === 'party'} onClick={() => setScreen('party')}>
            <PartyIcon className="w-5 h-5" /> {t('nav.party')}
          </NavButton>
          <NavButton active={screen === 'dailyChallenge'} onClick={() => setScreen('dailyChallenge')}>
            <StarIcon className="w-5 h-5" /> {t('nav.daily')}
          </NavButton>
          <NavButton active={screen === 'queue'} onClick={() => setScreen('queue')}>
            <QueueIcon className="w-5 h-5" /> {t('nav.queue')}
            {isMounted && queueLength > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">{queueLength}</Badge>
            )}
          </NavButton>
          <NavButton active={screen === 'profile'} onClick={() => setScreen('profile')}>
            <UserIcon className="w-5 h-5" /> {t('nav.profiles')}
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
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all text-[#c0b8d0] hover:text-[#FDE601] hover:bg-[#FDE601]/10 border-2 border-transparent hover:border-[#FDE601]/50"
            title={isFullscreen ? "Exit Fullscreen (F12)" : "Toggle Fullscreen (F12)"}
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

// ===================== FULLSCREEN TOGGLE BUTTON (for immersive screens) =====================
export function FullscreenToggleButton({ isFullscreen, toggleFullscreen }: { isFullscreen: boolean; toggleFullscreen: () => void }) {
  return (
    <button
      onClick={toggleFullscreen}
      className="fixed top-4 right-4 z-50 p-3 rounded-xl bg-[#F939A3] border-[3px] border-black hover:bg-[#FDE601] transition-all group"
      style={{ boxShadow: '4px 4px 0px #6B2E77' }}
      title={isFullscreen ? 'Exit Fullscreen (ESC)' : 'Enter Fullscreen'}
    >
      {isFullscreen ? (
        <svg className="w-5 h-5 text-white group-hover:text-black transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
        </svg>
      ) : (
        <svg className="w-5 h-5 text-white group-hover:text-black transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
        </svg>
      )}
    </button>
  );
}

// ===================== NAV BUTTON =====================
function NavButton({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold transition-all flex-shrink-0 border-[3px] border-black ${
        active
          ? 'bg-[#F939A3] text-black hover:bg-[#FDE601]'
          : 'text-[#c0b8d0] border-transparent hover:text-[#FDE601] hover:bg-[#FDE601]/10 hover:border-[#FDE601]/50 hover:scale-105'
      }`}
      style={active ? { boxShadow: '4px 4px 0px #6B2E77' } : undefined}
    >
      {children}
    </button>
  );
}
