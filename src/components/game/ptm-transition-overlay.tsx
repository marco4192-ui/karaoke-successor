'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

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
  /** Called when the transition is complete */
  onComplete?: () => void;
  /** Called when user clicks/presses Space to skip */
  onSkip?: () => void;
}

// ===================== TRANSITION OVERLAY =====================
// Border-only blinking + brief name display.
// The blinking starts ~2s before the previous player's segment ends,
// so the overlay does NOT block gameplay during the blink phase.
// When the segment actually ends, a brief name flash is shown.

const BLINK_PHASE_MS = 2000; // Blinking duration (matches TRANSITION_LEAD_TIME in hook)
const NAME_DISPLAY_MS = 800; // Brief name display
const NAME_FADE_MS = 300; // Fade out

export function PtmTransitionOverlay({
  visible,
  nextPlayer,
  segmentLabel,
  onComplete,
  onSkip,
}: PtmTransitionOverlayProps) {
  const [phase, setPhase] = useState<'idle' | 'blinking' | 'showing' | 'fading'>('idle');
  const [blinkCount, setBlinkCount] = useState(0);
  const [nameOpacity, setNameOpacity] = useState(0);
  const startTimeRef = useMemo(() => Date.now(), []); // stable ref for animation loop

  // Reset and start animation when visible changes
  useEffect(() => {
    if (!visible || !nextPlayer) {
      setPhase('idle');
      setBlinkCount(0);
      setNameOpacity(0);
      return;
    }

    // Phase 1: Border blinking (does NOT block gameplay — pointer-events-none)
    setPhase('blinking');
    setBlinkCount(0);
    setNameOpacity(0);

    // Create blinks: each blink is flash-on (200ms) → flash-off (200ms)
    // ~5 blinks over 2 seconds
    const blinkTimers: ReturnType<typeof setTimeout>[] = [];
    const blinkInterval = 400;
    const totalBlinks = Math.floor(BLINK_PHASE_MS / blinkInterval);
    for (let i = 0; i < totalBlinks; i++) {
      const baseTime = i * blinkInterval;
      blinkTimers.push(setTimeout(() => setBlinkCount(prev => prev + 1), baseTime));
      blinkTimers.push(setTimeout(() => setBlinkCount(prev => prev + 1), baseTime + 200));
    }

    // Phase 2: Show player name briefly
    const showTimer = setTimeout(() => {
      setPhase('showing');
      setNameOpacity(1);
    }, BLINK_PHASE_MS);

    // Phase 3: Fade out name
    const fadeTimer = setTimeout(() => {
      setPhase('fading');
      setNameOpacity(0);
    }, BLINK_PHASE_MS + NAME_DISPLAY_MS);

    // Complete
    const completeTimer = setTimeout(() => {
      setPhase('idle');
      setNameOpacity(0);
      onComplete?.();
    }, BLINK_PHASE_MS + NAME_DISPLAY_MS + NAME_FADE_MS);

    return () => {
      blinkTimers.forEach(clearTimeout);
      clearTimeout(showTimer);
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [visible, nextPlayer, onComplete]);

  // Space to skip
  useEffect(() => {
    if (!visible) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setPhase('idle');
        setNameOpacity(0);
        onSkip?.();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [visible, onSkip]);

  // Click to skip
  const handleClick = useCallback(() => {
    if (!visible) return;
    setPhase('idle');
    setNameOpacity(0);
    onSkip?.();
  }, [visible, onSkip]);

  if (!visible || !nextPlayer || phase === 'idle') return null;

  const isFlashOn = blinkCount % 2 === 1;
  const isBlinking = phase === 'blinking';
  const isShowing = phase === 'showing';
  const isFading = phase === 'fading';

  // Border glow intensity
  const borderGlowOpacity = isBlinking && isFlashOn ? 0.8 : 0;
  const borderGlowWidth = isBlinking ? 12 : 0;

  return (
    <div
      className="fixed inset-0 z-[60] pointer-events-none select-none"
      style={{ cursor: 'default' }}
    >
      {/* Border glow — only at edges, no full-screen blackout */}
      <div
        className="absolute inset-0 pointer-events-auto cursor-pointer"
        style={{
          boxShadow: borderGlowOpacity > 0
            ? `inset 0 0 ${borderGlowWidth}px ${borderGlowWidth}px ${nextPlayer.color}`
            : 'none',
          opacity: borderGlowOpacity,
          transition: 'opacity 0.15s ease-in-out',
        }}
        onClick={handleClick}
      />

      {/* Player name — centered, brief display during showing/fading phase */}
      {(isShowing || isFading) && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-auto cursor-pointer"
          onClick={handleClick}
          style={{ opacity: nameOpacity, transition: isFading ? `opacity ${NAME_FADE_MS}ms ease-out` : 'none' }}
        >
          <div className="flex flex-col items-center bg-black/60 rounded-2xl px-8 py-4 backdrop-blur-sm">
            {nextPlayer.avatar ? (
              <img
                src={nextPlayer.avatar}
                alt={nextPlayer.name}
                className="w-16 h-16 rounded-full object-cover border-2 mb-2"
                style={{ borderColor: nextPlayer.color }}
              />
            ) : (
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold border-2 mb-2 text-white"
                style={{ backgroundColor: nextPlayer.color, borderColor: nextPlayer.color }}
              >
                {nextPlayer.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div
              className="text-2xl font-bold text-white"
              style={{ textShadow: `0 0 20px ${nextPlayer.color}88` }}
            >
              {nextPlayer.name}
            </div>
            {segmentLabel && (
              <div className="text-xs text-white/40 mt-1">{segmentLabel}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
