'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { BattleRoyalePlayer } from '@/lib/game/battle-royale';
import { useTranslation } from '@/lib/i18n/translations';

interface GrandFinaleIntroProps {
  player1: BattleRoyalePlayer;
  player2: BattleRoyalePlayer;
  bestOf: number;
  finalWins: Record<string, number>;
  onComplete: () => void;
}

/**
 * Grand Finale intro animation (#4).
 * Dramatic "THE FINAL TWO" display before the best-of-N final begins.
 */
export function GrandFinaleIntro({
  player1,
  player2,
  bestOf,
  finalWins,
  onComplete,
}: GrandFinaleIntroProps) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<'intro' | 'showdown'>('intro');
  const winsNeeded = Math.ceil(bestOf / 2);

  useEffect(() => {
    const timer1 = setTimeout(() => setPhase('showdown'), 1500);
    const timer2 = setTimeout(onComplete, 5000);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [onComplete]);

  return (
    <div className="h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 bg-gradient-to-b from-amber-500/10 via-black to-red-500/10" />
      <div className="fixed inset-0 bg-black/50" />

      {/* Particle-like dots */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-amber-400/30 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${1 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 text-center">
        {/* Title */}
        <div className={`transition-all duration-1000 ${phase === 'intro' ? 'scale-110 opacity-100' : 'scale-90 opacity-50'}`}>
          <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 mb-4">
            {t('battleRoyale.grandFinale')}
          </h1>
          <p className="text-2xl text-white/60 mb-8">
            {t('battleRoyale.bestOf').replace('{n}', String(bestOf))} — {t('battleRoyale.firstTo').replace('{n}', String(winsNeeded))}
          </p>
        </div>

        {/* VS Showdown */}
        {phase === 'showdown' && (
          <div className="flex items-center justify-center gap-8 md:gap-16 animate-fade-in">
            {/* Player 1 */}
            <div className="flex flex-col items-center">
              {player1.avatar ? (
                <img
                  src={player1.avatar}
                  alt={player1.name}
                  className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-amber-500 animate-pulse"
                />
              ) : (
                <div
                  className="w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center text-white text-4xl font-bold border-4 border-amber-500"
                  style={{ backgroundColor: player1.color }}
                >
                  {player1.name.charAt(0)}
                </div>
              )}
              <p className="mt-3 text-xl font-bold">{player1.name}</p>
              <div className="flex gap-1 mt-1">
                {Array.from({ length: winsNeeded }).map((_, i) => (
                  <span key={i} className={`text-xl ${i < (finalWins[player1.id] || 0) ? 'text-amber-400' : 'text-white/20'}`}>
                    ★
                  </span>
                ))}
              </div>
              <span className="text-sm text-white/40 mt-1">
                {player1.playerType === 'microphone' ? '🎤' : '📱'}
              </span>
            </div>

            {/* VS */}
            <div className="text-5xl md:text-7xl font-black text-red-500 animate-pulse">
              VS
            </div>

            {/* Player 2 */}
            <div className="flex flex-col items-center">
              {player2.avatar ? (
                <img
                  src={player2.avatar}
                  alt={player2.name}
                  className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-red-500 animate-pulse"
                />
              ) : (
                <div
                  className="w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center text-white text-4xl font-bold border-4 border-red-500"
                  style={{ backgroundColor: player2.color }}
                >
                  {player2.name.charAt(0)}
                </div>
              )}
              <p className="mt-3 text-xl font-bold">{player2.name}</p>
              <div className="flex gap-1 mt-1">
                {Array.from({ length: winsNeeded }).map((_, i) => (
                  <span key={i} className={`text-xl ${i < (finalWins[player2.id] || 0) ? 'text-red-400' : 'text-white/20'}`}>
                    ★
                  </span>
                ))}
              </div>
              <span className="text-sm text-white/40 mt-1">
                {player2.playerType === 'microphone' ? '🎤' : '📱'}
              </span>
            </div>
          </div>
        )}

        {/* Skip button */}
        <div className="mt-8">
          <Button
            onClick={onComplete}
            variant="ghost"
            className="text-white/30"
          >
            {t('battleRoyale.skip')}
          </Button>
        </div>
      </div>
    </div>
  );
}
