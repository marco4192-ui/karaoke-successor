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
  /** Called when the transition is complete (blinks + name display elapsed) */
  onComplete?: () => void;
  /** Called when user clicks/presses Space to skip */
  onSkip?: () => void;
}

// ===================== TRANSITION OVERLAY =====================

const TOTAL_DURATION = 3500; // 3.5 seconds total
const BLINK_DURATION = 1500; // 1.5 seconds for 3 blinks
const SHOW_DURATION = 1500; // 1.5 seconds for name display
const _DISSOLVE_DURATION = 500; // 0.5 seconds for fade out (available for future use)

export function PtmTransitionOverlay({
  visible,
  nextPlayer,
  segmentLabel: _segmentLabel,
  onComplete,
  onSkip,
}: PtmTransitionOverlayProps) {
  const [phase, setPhase] = useState<'idle' | 'blinking' | 'showing' | 'dissolving'>('idle');
  const [blinkCount, setBlinkCount] = useState(0);
  const [showName, setShowName] = useState(false);
  const [overlayOpacity, setOverlayOpacity] = useState(0);

  // Reset and start animation when visible changes
  useEffect(() => {
    if (!visible || !nextPlayer) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- animation controller: reset state on visibility change
      setPhase('idle');
      setBlinkCount(0);
      setShowName(false);
      setOverlayOpacity(0);
      return;
    }

    // Phase 1: Blinking — 3 blinks over 1.5s
    setPhase('blinking');
    setBlinkCount(0);
    setShowName(false);
    setOverlayOpacity(1);

    // Create 3 blinks: each blink is flash-on (150ms) → flash-off (200ms) → gap (150ms)
    // Total per blink: 500ms × 3 = 1500ms
    const blinkTimers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < 3; i++) {
      const baseTime = i * 500;
      // Flash ON
      blinkTimers.push(setTimeout(() => setBlinkCount(prev => prev + 1), baseTime));
      // Flash OFF
      blinkTimers.push(setTimeout(() => setBlinkCount(prev => prev + 1), baseTime + 150));
    }

    // Phase 2: Show player name (after blinking completes)
    const showTimer = setTimeout(() => {
      setPhase('showing');
      setShowName(true);
    }, BLINK_DURATION);

    // Phase 3: Dissolve
    const dissolveTimer = setTimeout(() => {
      setPhase('dissolving');
      setOverlayOpacity(0);
    }, BLINK_DURATION + SHOW_DURATION);

    // Complete
    const completeTimer = setTimeout(() => {
      setPhase('idle');
      setShowName(false);
      onComplete?.();
    }, TOTAL_DURATION);

    return () => {
      blinkTimers.forEach(clearTimeout);
      clearTimeout(showTimer);
      clearTimeout(dissolveTimer);
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
        setShowName(false);
        setOverlayOpacity(0);
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
    setShowName(false);
    setOverlayOpacity(0);
    onSkip?.();
  }, [visible, onSkip]);

  if (!visible || !nextPlayer || phase === 'idle') return null;

  // Determine blink state: odd count = flash on, even = flash off
  const isFlashOn = blinkCount % 2 === 1;
  const isBlinking = phase === 'blinking';
  const isShowing = phase === 'showing';
  const isDissolving = phase === 'dissolving';

  // During blinking, flash the screen with the player's color
  // During showing, display the player name
  // During dissolving, fade out everything

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center cursor-pointer select-none"
      onClick={handleClick}
      style={{
        opacity: overlayOpacity,
        transition: isDissolving
          ? 'opacity 0.5s ease-out'
          : 'none',
      }}
    >
      {/* Background layer */}
      <div className="absolute inset-0 bg-black/90" />

      {/* Blink flash layer — only visible during blinking phase when flash is ON */}
      {isBlinking && isFlashOn && (
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: `${nextPlayer.color}44`,
          }}
        />
      )}

      {/* Player color glow — visible during showing phase */}
      {isShowing && (
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${nextPlayer.color}66 0%, ${nextPlayer.color}33 40%, rgba(0,0,0,0.85) 100%)`,
            animation: 'ptm-pulse 0.8s ease-in-out infinite',
          }}
        />
      )}

      {/* Content — only visible during showing phase */}
      {showName && (
        <div className="relative z-10 flex flex-col items-center">
          {/* Player Avatar */}
          <div
            className="mb-6"
            style={{
              animation: 'ptm-avatar-pulse 1s ease-in-out infinite',
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

          {/* Player name */}
          <div
            className="text-5xl font-black text-white mb-3"
            style={{
              textShadow: `0 0 30px ${nextPlayer.color}88, 0 0 60px ${nextPlayer.color}44`,
            }}
          >
            {nextPlayer.name}
          </div>
        </div>
      )}

      {/* Skip hint */}
      <div className="absolute bottom-6 text-white/20 text-xs">
        Leertaste zum Überspringen
      </div>
    </div>
  );
}
