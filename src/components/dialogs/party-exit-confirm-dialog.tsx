'use client';

import React from 'react';

interface PartyExitConfirmDialogProps {
  onStay: () => void;
  onLeave: () => void;
}

/**
 * Full-screen confirmation dialog shown when the user tries to navigate
 * away from the app while a party mode is active.
 * This is the "pending navigation" guard.
 */
export function PartyExitConfirmDialog({ onStay, onLeave }: PartyExitConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-white/15 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">⚠️</div>
          <h2 className="text-xl font-bold text-white">Party-Modus verlassen?</h2>
          <p className="text-sm text-white/50 mt-2">
            Ein Party-Modus läuft gerade. Wenn du die Seite verlässt,
            wird dein aktueller Spielfortschritt verloren gehen.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onStay}
            className="flex-1 py-3 rounded-lg font-medium bg-white/10 text-white hover:bg-white/20 transition-all"
          >
            Zurück bleiben
          </button>
          <button
            onClick={onLeave}
            className="flex-1 py-3 rounded-lg font-medium bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 transition-all"
          >
            Verlassen
          </button>
        </div>
      </div>
    </div>
  );
}
