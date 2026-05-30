'use client';

import { useTranslation } from '@/lib/i18n/translations';

interface SongPauseDialogProps {
  isTournamentMatch: boolean;
  onResume: () => void;
  onAbort: () => void;
  onTournamentRepeat?: () => void;
  onTournamentManualWinner?: () => void;
}

/**
 * Modal dialog shown when the user pauses during gameplay (Escape key or pause button).
 * Tournament matches get extra options (repeat, manual winner).
 * Styled with Karaoke Eleven synthwave dark purple glass theme.
 */
export function SongPauseDialog({
  isTournamentMatch,
  onResume,
  onAbort,
  onTournamentRepeat,
  onTournamentManualWinner,
}: SongPauseDialogProps) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
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
          <div className="text-4xl mb-2">⏸️</div>
          <h2 className="text-xl font-bold text-white drop-shadow-[0_0_12px_rgba(0,229,255,0.5)]">{t('dialogs.pauseTitle')}</h2>
          <p className="text-sm text-white/50 mt-2">
            {t('dialogs.pauseDesc')}
          </p>
        </div>
        <div className="space-y-3">
          {isTournamentMatch ? (
            <>
              {/* Tournament: 3 options */}
              <button
                onClick={onResume}
                className="w-full py-3 rounded-lg font-medium bg-[#00e5ff]/20 border border-[#00e5ff]/40 text-[#00e5ff] hover:bg-[#00e5ff]/30 hover:shadow-[0_0_15px_rgba(0,229,255,0.2)] transition-all"
              >
                {t('dialogs.resume')} <span className="text-[#00e5ff]/50 text-xs ml-2">(Esc)</span>
              </button>
              <button
                onClick={() => onTournamentRepeat?.()}
                className="w-full py-3 rounded-lg font-medium bg-[#bf5af2]/20 border border-[#bf5af2]/40 text-[#bf5af2] hover:bg-[#bf5af2]/30 hover:shadow-[0_0_15px_rgba(191,90,242,0.2)] transition-all"
              >
                {t('dialogs.rematch')}
              </button>
              <button
                onClick={() => onTournamentManualWinner?.()}
                className="w-full py-3 rounded-lg font-medium bg-[#ffd60a]/20 border border-[#ffd60a]/40 text-[#ffd60a] hover:bg-[#ffd60a]/30 hover:shadow-[0_0_15px_rgba(255,214,10,0.2)] transition-all"
              >
                {t('dialogs.setWinner')}
              </button>
            </>
          ) : (
            <>
              {/* All other modes: Resume + Cancel */}
              <div className="flex gap-3">
                <button
                  onClick={onResume}
                  className="flex-1 py-3 rounded-lg font-medium bg-[#00e5ff]/20 border border-[#00e5ff]/40 text-[#00e5ff] hover:bg-[#00e5ff]/30 hover:shadow-[0_0_15px_rgba(0,229,255,0.2)] transition-all"
                >
                  {t('dialogs.resume')} <span className="text-[#00e5ff]/50 text-xs">(Esc)</span>
                </button>
                <button
                  onClick={onAbort}
                  className="flex-1 py-3 rounded-lg font-medium bg-[#ff2d95]/15 border border-[#ff2d95]/30 text-[#ff2d95]/70 hover:bg-[#ff2d95]/25 hover:shadow-[0_0_15px_rgba(255,45,149,0.15)] transition-all"
                >
                  {t('dialogs.abort')} <span className="text-[#ff2d95]/40 text-xs">(Enter)</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
