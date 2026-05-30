'use client';

import { useTranslation } from '@/lib/i18n/translations';

interface PartyExitConfirmDialogProps {
  onStay: () => void;
  onLeave: () => void;
}

/**
 * Full-screen confirmation dialog shown when the user tries to navigate
 * away from the app while a party mode is active.
 * This is the "pending navigation" guard.
 * Styled with Karaoke Eleven synthwave dark purple glass theme.
 */
export function PartyExitConfirmDialog({ onStay, onLeave }: PartyExitConfirmDialogProps) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div
        className="rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl"
        style={{
          background: 'rgba(10, 0, 20, 0.9)',
          border: '2px solid transparent',
          backgroundImage: 'linear-gradient(rgba(10, 0, 20, 0.9), rgba(10, 0, 20, 0.9)), linear-gradient(135deg, #00e5ff, #bf5af2, #ff2d95)',
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box',
        }}
      >
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">⚠️</div>
          <h2 className="text-xl font-bold text-white drop-shadow-[0_0_12px_rgba(0,229,255,0.5)]">{t('dialogs.partyExitTitle')}</h2>
          <p className="text-sm text-white/50 mt-2">
            {t('dialogs.partyExitDesc')}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onStay}
            className="flex-1 py-3 rounded-lg font-medium bg-[#00e5ff]/20 border border-[#00e5ff]/40 text-[#00e5ff] hover:bg-[#00e5ff]/30 hover:shadow-[0_0_15px_rgba(0,229,255,0.2)] transition-all"
          >
            {t('dialogs.stay')}
          </button>
          <button
            onClick={onLeave}
            className="flex-1 py-3 rounded-lg font-medium bg-[#ff2d95]/15 border border-[#ff2d95]/30 text-[#ff2d95]/80 hover:bg-[#ff2d95]/25 hover:shadow-[0_0_15px_rgba(255,45,149,0.15)] transition-all"
          >
            {t('dialogs.leave')}
          </button>
        </div>
      </div>
    </div>
  );
}
