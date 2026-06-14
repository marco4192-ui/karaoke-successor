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
  autoAdvance?: boolean;
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
  autoAdvance,
}: GrandFinaleIntroProps) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<'intro' | 'versus' | 'showdown'>('intro');
  const winsNeeded = Math.ceil(bestOf / 2);

  // Pre-compute deterministic particle configs so SSR/hydration don't mismatch
  const particles = Array.from({ length: 40 }, (_, i) => {
    const seed = i * 2654435761; // Knuth multiplicative hash for deterministic pseudo-random
    const rand = (offset: number) => ((seed + offset) * 2654435761 >>> 0) % 1000 / 1000;
    const sizes = [1, 2, 3] as const;
    const colors = ['bg-amber-400/30', 'bg-yellow-300/25', 'bg-red-500/30'] as const;
    return {
      left: rand(0) * 100,
      top: rand(1) * 100,
      delay: rand(2) * 2.5,
      duration: 1 + rand(3) * 2,
      size: sizes[i % 3],
      color: colors[i % 3],
    };
  });

  useEffect(() => {
    if (!autoAdvance) return;
    const timer = setTimeout(() => {
      onComplete();
    }, 3000);
    return () => clearTimeout(timer);
  }, [autoAdvance, onComplete]);

  useEffect(() => {
    if (autoAdvance) return;
    const timer1 = setTimeout(() => setPhase('versus'), 1500);
    const timer2 = setTimeout(() => setPhase('showdown'), 2500);
    const timer3 = setTimeout(onComplete, 5000);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [onComplete, autoAdvance]);

  return (
    <>
    <div className="h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 bg-gradient-to-b from-amber-500/10 via-black to-red-500/10" />
      <div className="fixed inset-0 bg-black/50" />

      {/* Radial gradient pulse expanding from center */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: phase !== 'showdown'
            ? 'radial-gradient(circle at 50% 50%, rgba(245,158,11,0.25) 0%, rgba(239,68,68,0.1) 40%, transparent 70%)'
            : 'radial-gradient(circle at 50% 50%, rgba(245,158,11,0.05) 0%, transparent 60%)',
          animation: phase === 'versus'
            ? 'radialPulse 1s ease-out forwards'
            : phase === 'intro'
              ? 'radialPulse 1.5s ease-out infinite'
              : 'none',
        }}
      />

      {/* Particle-like dots — 40 particles, varied sizes & colors */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {particles.map((p, i) => (
          <div
            key={i}
            className={`absolute rounded-full animate-pulse ${p.color}`}
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 text-center">
        {/* Phase 1: Intro — Title + "THE FINAL TWO" */}
        {phase === 'intro' && (
          <div className="animate-fade-in">
            <p className="text-lg tracking-[0.5em] text-amber-400/70 uppercase mb-4 animate-pulse">
              {t('battleRoyale.grandFinaleSubtitle')}
            </p>
            <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 mb-4">
              {t('battleRoyale.grandFinale')}
            </h1>
            <p className="text-2xl text-white/60 mb-8">
              {t('battleRoyale.bestOf').replace('{n}', String(bestOf))} — {t('battleRoyale.firstTo').replace('{n}', String(winsNeeded))}
            </p>
          </div>
        )}

        {/* Phase 2: VERSUS — zoom-in VS text */}
        {phase === 'versus' && (
          <div
            className="flex flex-col items-center justify-center"
            style={{ animation: 'vsZoomIn 1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}
          >
            <span className="text-8xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-amber-400 to-red-500 drop-shadow-[0_0_30px_rgba(245,158,11,0.6)]">
              {t('battleRoyale.versus')}
            </span>
          </div>
        )}

        {/* Phase 3: Showdown — player cards with VS between them */}
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

            {/* VS — scale bounce */}
            <div
              className="text-5xl md:text-7xl font-black text-red-500"
              style={{ animation: 'vsBounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}
            >
              {t('battleRoyale.vsText')}
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

    {/* Keyframe styles injected inline to keep component self-contained */}
    <style jsx>{`
      @keyframes radialPulse {
        0%   { opacity: 0; transform: scale(0.3); }
        100% { opacity: 1; transform: scale(1.5); }
      }
      @keyframes vsZoomIn {
        0%   { opacity: 0; transform: scale(0.3); }
        60%  { opacity: 1; transform: scale(1.1); }
        100% { opacity: 1; transform: scale(1); }
      }
      @keyframes vsBounce {
        0%   { transform: scale(0.5); }
        50%  { transform: scale(1.5); }
        100% { transform: scale(1.0); }
      }
    `}</style>
    </>
  );
}
