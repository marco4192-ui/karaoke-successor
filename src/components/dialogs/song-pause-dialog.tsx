'use client';

import React from 'react';

interface SongPauseDialogProps {
  isTournamentMatch: boolean;
  onResume: () => void;
  onAbort: () => void;
  onTournamentRepeat?: () => void;
  onTournamentAutoWinner?: () => void;
}

/**
 * Modal dialog shown when the user pauses during gameplay (Escape key or pause button).
 * Tournament matches get extra options (repeat, auto-winner).
 */
export function SongPauseDialog({
  isTournamentMatch,
  onResume,
  onAbort,
  onTournamentRepeat,
  onTournamentAutoWinner,
}: SongPauseDialogProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-white/15 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">⏸️</div>
          <h2 className="text-xl font-bold text-white">Spiel pausiert</h2>
          <p className="text-sm text-white/50 mt-2">
            Möchtest du das Spiel fortsetzen oder abbrechen?
          </p>
        </div>
        <div className="space-y-3">
          {isTournamentMatch ? (
            <>
              {/* Tournament: 3 options */}
              <button
                onClick={onResume}
                className="w-full py-3 rounded-lg font-medium bg-green-500/20 border border-green-500/40 text-green-300 hover:bg-green-500/30 transition-all"
              >
                Fortsetzen
              </button>
              <button
                onClick={onTournamentRepeat}
                className="w-full py-3 rounded-lg font-medium bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 transition-all"
              >
                🔄 Game wiederholen
              </button>
              <button
                onClick={onTournamentAutoWinner}
                className="w-full py-3 rounded-lg font-medium bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 transition-all"
              >
                🏆 Sieger automatisch festlegen
              </button>
            </>
          ) : (
            <>
              {/* All other modes: Resume + Cancel */}
              <div className="flex gap-3">
                <button
                  onClick={onResume}
                  className="flex-1 py-3 rounded-lg font-medium bg-green-500/20 border border-green-500/40 text-green-300 hover:bg-green-500/30 transition-all"
                >
                  Fortsetzen
                </button>
                <button
                  onClick={onAbort}
                  className="flex-1 py-3 rounded-lg font-medium bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 transition-all"
                >
                  Abbrechen
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
