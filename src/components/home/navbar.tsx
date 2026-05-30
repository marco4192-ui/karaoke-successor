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
    <nav className="sticky top-0 left-0 right-0 z-50 flex-shrink-0 border-b" style={{ background: 'rgba(10, 0, 20, 0.8)', backdropFilter: 'blur(20px)', borderBottom: '1px solid transparent', borderImage: 'linear-gradient(90deg, #00e5ff, #ff2d95, transparent) 1' }}>
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <button onClick={() => setScreen('home')} className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          <img src="/logo-retro.png" alt="Karaoke Eleven Logo" className="h-10 w-auto rounded-lg" />
          <span className="text-xl font-black tracking-wider eleven-glow" style={{ color: '#00e5ff', textShadow: '0 0 7px #00e5ff, 0 0 20px rgba(0,229,255,0.5), 0 0 42px rgba(0,229,255,0.25)', fontFamily: 'var(--theme-font, Inter, sans-serif)' }}>
            Karaoke Eleven
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
              <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs" style={{ borderColor: 'rgba(0,229,255,0.4)', color: '#00e5ff' }}>{queueLength}</Badge>
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
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ color: 'rgba(255,255,255,0.7)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#00e5ff'; e.currentTarget.style.background = 'rgba(0,229,255,0.1)'; e.currentTarget.style.boxShadow = '0 0 12px rgba(0,229,255,0.25)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.boxShadow = 'none'; }}
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
      className="fixed top-4 right-4 z-50 p-3 rounded-full backdrop-blur-sm transition-all group"
      style={{ background: 'rgba(10, 0, 20, 0.7)', border: '1px solid rgba(0,229,255,0.25)', boxShadow: '0 0 15px rgba(0,229,255,0.15)' }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(0,229,255,0.5)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(0,229,255,0.35)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(0,229,255,0.25)'; e.currentTarget.style.boxShadow = '0 0 15px rgba(0,229,255,0.15)'; }}
      title={isFullscreen ? 'Exit Fullscreen (ESC)' : 'Enter Fullscreen'}
    >
      {isFullscreen ? (
        <svg className="w-5 h-5 transition-colors" style={{ color: 'rgba(0,229,255,0.7)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
        </svg>
      ) : (
        <svg className="w-5 h-5 transition-colors" style={{ color: 'rgba(0,229,255,0.7)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all flex-shrink-0 ${
        active
          ? 'eleven-box-glow'
          : ''
      }`}
      style={active ? {
        color: '#00e5ff',
        background: 'rgba(0,229,255,0.15)',
        textShadow: '0 0 7px rgba(0,229,255,0.6)',
      } : {
        color: 'rgba(255,255,255,0.7)',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.color = '#00e5ff';
          e.currentTarget.style.background = 'rgba(0,229,255,0.08)';
          e.currentTarget.style.textShadow = '0 0 7px rgba(0,229,255,0.4)';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.textShadow = 'none';
        }
      }}
    >
      {children}
    </button>
  );
}
