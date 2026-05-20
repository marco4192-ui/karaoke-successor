'use client';

import { useTranslation } from '@/lib/i18n/translations';
import type { MobileView } from './mobile-types';

interface BottomNavProps {
  currentView: MobileView;
  onNavigate: (_view: MobileView) => void;
}

export function MobileBottomNav({ currentView, onNavigate }: BottomNavProps) {
  const { t } = useTranslation();

  return (
    <nav
      role="tablist"
      className={`fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t ${currentView === 'results' || currentView === 'jukebox' ? 'border-t-cyan-400/60 shadow-[0_-2px_12px_rgba(34,211,238,0.15)]' : 'border-white/10'}`}
      style={{ paddingBottom: 'max(0px, env(safe-area-inset-bottom))' }}
    >
      <div className="flex justify-around py-2">
        <button 
          onClick={() => onNavigate('home')}
          role="tab"
          aria-selected={currentView === 'home'}
          aria-label={t('mobileNav.home')}
          className={`flex flex-col items-center p-2 ${currentView === 'home' ? 'text-cyan-400' : 'text-white/40'}`}
        >
          <span className="text-xl">🏠</span>
          <span className="text-xs mt-1">{t('mobileNav.home')}</span>
        </button>
        <button 
          onClick={() => onNavigate('mic')}
          role="tab"
          aria-selected={currentView === 'mic'}
          aria-label={t('mobileNav.sing')}
          className={`flex flex-col items-center p-2 ${currentView === 'mic' ? 'text-cyan-400' : 'text-white/40'}`}
        >
          <span className="text-xl">🎤</span>
          <span className="text-xs mt-1">{t('mobileNav.sing')}</span>
        </button>
        <button 
          onClick={() => onNavigate('songs')}
          role="tab"
          aria-selected={currentView === 'songs'}
          aria-label={t('mobileNav.songs')}
          className={`flex flex-col items-center p-2 ${currentView === 'songs' ? 'text-cyan-400' : 'text-white/40'}`}
        >
          <span className="text-xl">🎵</span>
          <span className="text-xs mt-1">{t('mobileNav.songs')}</span>
        </button>
        <button 
          onClick={() => onNavigate('remote')}
          role="tab"
          aria-selected={currentView === 'remote'}
          aria-label={t('mobileNav.remote')}
          className={`flex flex-col items-center p-2 ${currentView === 'remote' ? 'text-cyan-400' : 'text-white/40'}`}
        >
          <span className="text-xl">🎮</span>
          <span className="text-xs mt-1">{t('mobileNav.remote')}</span>
        </button>
        <button 
          onClick={() => onNavigate('profile')}
          role="tab"
          aria-selected={currentView === 'profile'}
          aria-label={t('mobileNav.profile')}
          className={`flex flex-col items-center p-2 ${currentView === 'profile' ? 'text-cyan-400' : 'text-white/40'}`}
        >
          <span className="text-xl">👤</span>
          <span className="text-xs mt-1">{t('mobileNav.profile')}</span>
        </button>
      </div>
    </nav>
  );
}
