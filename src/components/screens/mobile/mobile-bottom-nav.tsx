'use client';

import { useTranslation } from '@/lib/i18n/translations';
import type { MobileView } from './mobile-types';

interface BottomNavProps {
  currentView: MobileView;
  onNavigate: (_view: MobileView) => void;
}

export function MobileBottomNav({ currentView, onNavigate }: BottomNavProps) {
  const { t } = useTranslation();

  const handleTabSwitch = (view: MobileView) => {
    if (view === currentView) return;
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10);
    }
    onNavigate(view);
  };

  // Mirror tab is active for 'mirror' view
  const isMirrorActive = currentView === 'mirror';

  return (
    <nav
      role="tablist"
      className={
        'fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t ' +
        (isMirrorActive ? 'border-cyan-400/60 shadow-[0_-2px_12px_rgba(34,211,238,0.15)]' : 'border-white/10')
      }
      style={{ paddingBottom: 'max(0px, env(safe-area-inset-bottom))' }}
    >
      <div className="flex justify-around py-2">
        {/* ===== MIRROR TAB — auto-follows desktop ===== */}
        <button 
          onClick={() => handleTabSwitch('mirror')}
          role="tab"
          aria-selected={isMirrorActive}
          aria-label={t('mobileNav.mirror') || 'Mirror'}
          className={`flex flex-col items-center p-2 ${isMirrorActive ? 'text-cyan-400' : 'text-white/40'}`}
        >
          <span className="text-xl">📱</span>
          <span className="text-xs mt-1">{t('mobileNav.mirror') || 'Mirror'}</span>
        </button>

        {/* ===== SING TAB — mic / pitch detection ===== */}
        <button 
          onClick={() => handleTabSwitch('mic')}
          role="tab"
          aria-selected={currentView === 'mic'}
          aria-label={t('mobileNav.sing')}
          className={`flex flex-col items-center p-2 ${currentView === 'mic' ? 'text-cyan-400' : 'text-white/40'}`}
        >
          <span className="text-xl">🎤</span>
          <span className="text-xs mt-1">{t('mobileNav.sing')}</span>
        </button>

        {/* ===== SONGS TAB — always accessible, no lock needed ===== */}
        <button 
          onClick={() => handleTabSwitch('songs')}
          role="tab"
          aria-selected={currentView === 'songs'}
          aria-label={t('mobileNav.songs')}
          className={`flex flex-col items-center p-2 ${currentView === 'songs' ? 'text-cyan-400' : 'text-white/40'}`}
        >
          <span className="text-xl">🎵</span>
          <span className="text-xs mt-1">{t('mobileNav.songs')}</span>
        </button>

        {/* ===== PROFILE TAB ===== */}
        <button 
          onClick={() => handleTabSwitch('profile')}
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