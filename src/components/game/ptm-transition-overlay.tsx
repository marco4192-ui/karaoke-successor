'use client';

import { useState, useEffect, useCallback } from 'react';

// ===================== TYPES =====================

interface PtmTransitionPlayer {
  id: string;
  name: string;
  avatar?: string;
  color: string;
}

export interface PtmTransitionOverlayProps {
  /** Whether the overlay should be visible */
  visible: boolean;
  /** The next player who will sing */
  nextPlayer: PtmTransitionPlayer | null;
  /** Segment number (e.g. "Segment 3/8") */
  segmentLabel?: string;
  /** Called when the transition is complete (3 seconds elapsed) */
  onComplete?: () => void;
  /** Called when user clicks/presses Space to skip */
  onSkip?: () => void;
}

// ===================== TRANSITION OVERLAY =====================
/**
 * Full-screen pulsing transition overlay for Pass-the-Mic mode.
 * Shows the next player's name, avatar, and color in a dramatic 3-second animation.
 * The background fills with the player's color in expanding circles.
 */

const TRANSITION_DURATION = 3000; // 3 seconds

export function PtmTransitionOverlay({
  visible,
  nextPlayer,
  segmentLabel,
  onComplete,
  onSkip,
}: PtmTransitionOverlayProps) {
  const [phase, setPhase] = useState<'idle' | 'expanding' | 'hold' | 'dissolving'>('idle');
  const [opacity, setOpacity] = useState(0);

  // Reset and start animation when visible changes
  useEffect(() => {
    if (!visible || !nextPlayer) {
      setPhase('idle');
      setOpacity(0);
      return;
    }

    setPhase('expanding');
    setOpacity(0);

    // Phase 1: Expand (0-1500ms) — background fills in
    const expandTimer = setTimeout(() => {
      setOpacity(1);
      setPhase('hold');
    }, 100);

    // Phase 2: Hold (1500-2500ms) — full visibility
    const holdTimer = setTimeout(() => {
      setPhase('dissolving');
    }, 1500);

    // Phase 3: Dissolve (2500-3000ms) — fade out
    const dissolveTimer = setTimeout(() => {
      setOpacity(0);
      setPhase('idle');
      onComplete?.();
    }, TRANSITION_DURATION);

    return () => {
      clearTimeout(expandTimer);
      clearTimeout(holdTimer);
      clearTimeout(dissolveTimer);
    };
  }, [visible, nextPlayer, onComplete]);

  // Space to skip
  useEffect(() => {
    if (!visible) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setOpacity(0);
        setPhase('idle');
        onSkip?.();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [visible, onSkip]);

  // Click to skip
  const handleClick = useCallback(() => {
    if (!visible) return;
    setOpacity(0);
    setPhase('idle');
    onSkip?.();
  }, [visible, onSkip]);

  if (!visible || !nextPlayer || phase === 'idle') return null;

  const isExpanding = phase === 'expanding';
  const isDissolving = phase === 'dissolving';

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center cursor-pointer select-none"
      onClick={handleClick}
      style={{
        opacity,
        transition: isDissolving
          ? 'opacity 0.5s ease-out'
          : isExpanding
            ? 'opacity 0.3s ease-in'
            : 'none',
      }}
    >
      {/* Background: player color gradient filling the screen */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${nextPlayer.color}66 0%, ${nextPlayer.color}33 40%, rgba(0,0,0,0.85) 100%)`,
          animation: phase === 'hold' ? 'ptm-pulse 0.8s ease-in-out infinite' : 'none',
        }}
      />

      {/* Dark vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Player Avatar — large with pulsing ring */}
        <div
          className="mb-6"
          style={{
            animation: phase === 'hold' ? 'ptm-avatar-pulse 1s ease-in-out infinite' : 'none',
          }}
        >
          {nextPlayer.avatar ? (
            <img
              src={nextPlayer.avatar}
              alt={nextPlayer.name}
              className="w-28 h-28 rounded-full object-cover border-4 shadow-2xl"
              style={{ borderColor: nextPlayer.color }}
            />
          ) : (
            <div
              className="w-28 h-28 rounded-full flex items-center justify-center text-4xl font-bold border-4 shadow-2xl text-white"
              style={{ backgroundColor: nextPlayer.color, borderColor: nextPlayer.color }}
            >
              {nextPlayer.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* "Passing the Mic" label */}
        <div className="text-white/60 text-sm font-medium uppercase tracking-widest mb-2">
          Passing the Mic
        </div>

        {/* Player name — large, bold */}
        <div
          className="text-5xl font-black text-white mb-3"
          style={{
            textShadow: `0 0 30px ${nextPlayer.color}88, 0 0 60px ${nextPlayer.color}44`,
          }}
        >
          {nextPlayer.name}
        </div>

        {/* Segment label */}
        {segmentLabel && (
          <div className="text-white/40 text-sm font-medium">{segmentLabel}</div>
        )}

        {/* Skip hint */}
        <div className="mt-8 text-white/20 text-xs">
          Leertaste zum Überspringen
        </div>
      </div>
    </div>
  );
}
