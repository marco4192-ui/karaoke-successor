'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { TournamentMatch } from '@/lib/game/tournament';

interface MatchAbortDialogProps {
  match: TournamentMatch;
  onManualWinner: (matchId: string, winnerId: string) => void;
  onRepeatMatch: () => void;
  onDismiss: () => void;
}

/**
 * Modal dialog shown when a player presses Back/Escape during an
 * in-progress tournament match.  Offers three choices:
 *  - Pick a winner manually
 *  - Repeat the match
 *  - Dismiss (go back to bracket without resolving)
 */
export function MatchAbortDialog({
  match,
  onManualWinner,
  onRepeatMatch,
  onDismiss,
}: MatchAbortDialogProps) {
  const [step, setStep] = useState<'choose' | 'pick-winner'>('choose');

  const p1 = match.player1;
  const p2 = match.player2;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-white/15 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
        {step === 'choose' && (
          <>
            {/* Header */}
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">⚠️</div>
              <h2 className="text-xl font-bold text-white">Match Abgebrochen</h2>
              <p className="text-sm text-white/50 mt-1">
                {p1?.name} vs {p2?.name}
              </p>
            </div>

            {/* Options */}
            <div className="space-y-3">
              <Button
                onClick={() => setStep('pick-winner')}
                className="w-full py-3 text-sm bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300"
              >
                🏆 Sieger manuell festlegen
              </Button>

              <Button
                onClick={onRepeatMatch}
                className="w-full py-3 text-sm bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300"
              >
                🔄 Match wiederholen
              </Button>

              <Button
                onClick={onDismiss}
                variant="ghost"
                className="w-full py-3 text-sm text-white/40 hover:text-white/60"
              >
                Zurück zum Bracket (ohne Ergebnis)
              </Button>
            </div>
          </>
        )}

        {step === 'pick-winner' && (
          <>
            <div className="text-center mb-6">
              <h2 className="text-lg font-bold text-white mb-1">Sieger auswählen</h2>
              <p className="text-sm text-white/50">Wer hat dieses Match gewonnen?</p>
            </div>

            <div className="space-y-3">
              {p1 && (
                <Button
                  onClick={() => {
                    onManualWinner(match.id, p1.id);
                    setStep('choose');
                  }}
                  className="w-full py-4 text-sm bg-white/5 hover:bg-white/10 border border-white/20"
                >
                  <span className="flex items-center gap-3 w-full">
                    {p1.avatar ? (
                      <img src={p1.avatar} alt={p1.name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: p1.color }}
                      >
                        {p1.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="font-medium">{p1.name}</span>
                    <span className="ml-auto text-amber-400">Als Sieger</span>
                  </span>
                </Button>
              )}

              {p2 && (
                <Button
                  onClick={() => {
                    onManualWinner(match.id, p2.id);
                    setStep('choose');
                  }}
                  className="w-full py-4 text-sm bg-white/5 hover:bg-white/10 border border-white/20"
                >
                  <span className="flex items-center gap-3 w-full">
                    {p2.avatar ? (
                      <img src={p2.avatar} alt={p2.name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: p2.color }}
                      >
                        {p2.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="font-medium">{p2.name}</span>
                    <span className="ml-auto text-amber-400">Als Sieger</span>
                  </span>
                </Button>
              )}

              <Button
                onClick={() => setStep('choose')}
                variant="ghost"
                className="w-full py-2 text-sm text-white/40 hover:text-white/60"
              >
                ← Zurück
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
