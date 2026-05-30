'use client';

import { useTranslation } from '@/lib/i18n/translations';

interface PartyLeaveDialogProps {
  onBack: () => void;
  onEndParty: () => void;
}

/**
 * Modal dialog shown when the user tries to leave while a party mode
 * is active but no song is currently playing.
 */
export function PartyLeaveDialog({ onBack, onEndParty }: PartyLeaveDialogProps) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#2a1a3e] border-[3px] border-black rounded-2xl p-6 max-w-md w-full mx-4" style={{ boxShadow: '6px 6px 0px #FDE601' }}>
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">⚠️</div>
          <h2 className="text-xl font-bold text-[#FC6B48]" style={{ WebkitTextStroke: '1px #000', paintOrder: 'stroke fill' }}>{t('dialogs.partyLeaveTitle')}</h2>
          <p className="text-sm text-[#c0b8d0] mt-2">
            {t('dialogs.partyLeaveDesc')}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="flex-1 py-3 rounded-xl font-bold bg-[#c0b8d0] text-black border-[3px] border-black transition-all"
            style={{ boxShadow: '4px 4px 0px #6B2E77' }}
          >
            {t('dialogs.back')}
          </button>
          <button
            onClick={onEndParty}
            className="flex-1 py-3 rounded-xl font-bold bg-[#FC6B48] text-black border-[3px] border-black transition-all"
            style={{ boxShadow: '4px 4px 0px #F939A3' }}
          >
            {t('dialogs.endParty')}
          </button>
        </div>
      </div>
    </div>
  );
}
