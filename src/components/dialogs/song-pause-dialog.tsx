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
      <div className="bg-[#2a1a3e] border-[3px] border-black rounded-2xl p-6 max-w-md w-full mx-4" style={{ boxShadow: '6px 6px 0px #F939A3' }}>
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">⏸️</div>
          <h2 className="text-xl font-bold text-[#FDE601]" style={{ WebkitTextStroke: '1px #000', paintOrder: 'stroke fill' }}>{t('dialogs.pauseTitle')}</h2>
          <p className="text-sm text-[#c0b8d0] mt-2">
            {t('dialogs.pauseDesc')}
          </p>
        </div>
        <div className="space-y-3">
          {isTournamentMatch ? (
            <>
              {/* Tournament: 3 options */}
              <button
                onClick={onResume}
                className="w-full py-3 rounded-xl font-bold bg-[#00F3B2] text-black border-[3px] border-black transition-all"
                style={{ boxShadow: '4px 4px 0px #6B2E77' }}
              >
                {t('dialogs.resume')} <span className="text-black/40 text-xs ml-2">(Esc)</span>
              </button>
              <button
                onClick={() => onTournamentRepeat?.()}
                className="w-full py-3 rounded-xl font-bold bg-[#F939A3] text-black border-[3px] border-black transition-all"
                style={{ boxShadow: '4px 4px 0px #FDE601' }}
              >
                {t('dialogs.rematch')}
              </button>
              <button
                onClick={() => onTournamentManualWinner?.()}
                className="w-full py-3 rounded-xl font-bold bg-[#FDE601] text-black border-[3px] border-black transition-all"
                style={{ boxShadow: '4px 4px 0px #BA279D' }}
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
                  className="flex-1 py-3 rounded-xl font-bold bg-[#00F3B2] text-black border-[3px] border-black transition-all"
                  style={{ boxShadow: '4px 4px 0px #6B2E77' }}
                >
                  {t('dialogs.resume')} <span className="text-black/40 text-xs">(Esc)</span>
                </button>
                <button
                  onClick={onAbort}
                  className="flex-1 py-3 rounded-xl font-bold bg-[#FC6B48] text-black border-[3px] border-black transition-all"
                  style={{ boxShadow: '4px 4px 0px #BA279D' }}
                >
                  {t('dialogs.abort')} <span className="text-black/40 text-xs">(Enter)</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
