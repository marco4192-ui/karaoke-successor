'use client';

// ===================== Party-Setup-Mirror — Leave-Dialog =====================
//
// Leave-Bestätigungs-Popup des Party-Setup-Mirrors (DO-NOT-CHANGE: Zurueck
// mit Leave-Bestaetigungs-Popup wie Desktop-App). R6-Auslagerung aus
// mirror-party-setup-lite.tsx — JSX unverändert; handleLeaveCancel → onCancel,
// handleLeaveConfirm → onConfirm. t wird als Prop durchgereicht, damit die
// renderLeaveDialog-Callback-Deps im Orchestrator unverändert bleiben.

export interface LeaveDialogProps {
  t: (_key: string) => string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function LeaveDialog({ t, onCancel, onConfirm }: LeaveDialogProps) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onCancel}>
      <div className="bg-[#1a1a2e] border border-white/15 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="text-center mb-5">
          <div className="text-4xl mb-2">{'\u26A0\uFE0F'}</div>
          <h2 className="text-lg font-bold text-white">{t('dialogs.partyLeaveTitle') || 'Party-Modus verlassen?'}</h2>
          <p className="text-sm text-white/50 mt-2">
            {t('dialogs.partyLeaveDesc') || 'Du bist dabei, den Party-Modus zu verlassen.'}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl font-medium bg-white/10 text-white active:bg-white/20 transition-all text-sm"
          >
            {t('dialogs.back') || 'Zurueck'}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl font-medium bg-red-500/20 border border-red-500/40 text-red-300 active:bg-red-500/30 transition-all text-sm"
          >
            {t('dialogs.endParty') || 'Verlassen'}
          </button>
        </div>
      </div>
    </div>
  );
}
