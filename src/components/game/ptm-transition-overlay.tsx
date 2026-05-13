'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from '@/lib/i18n/translations';

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
  /** Called when user clicks/presses Space to dismiss */
  onSkip?: () => void;
}

// ===================== TIMING =====================

const TYPEWRITER_MS_PER_CHAR = 35; // Fast typing — completes ~35 chars in ~1.2s

// ===================== TRANSITION OVERLAY =====================

export function PtmTransitionOverlay({
  visible,
  nextPlayer,
  onSkip,
}: PtmTransitionOverlayProps) {
  const { t } = useTranslation();
  const [visibleChars, setVisibleChars] = useState(0);
  const typingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Build the display text: "Gib das Mikro weiter an: [PlayerName]"
  const displayText = useCallback(() => {
    if (!nextPlayer) return '';
    const base = t('passTheMic.handOverMic');
    // Strip trailing ":)" smiley from translation, add colon + player name
    const clean = base.replace(/\s*:\)\s*$/, '');
    return `${clean}: ${nextPlayer.name}`;
  }, [t, nextPlayer]);

  // Typing animation — starts when visible becomes true
  useEffect(() => {
    if (!visible || !nextPlayer) {
      setVisibleChars(0);
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }
      return;
    }

    const text = displayText();
    let charIdx = 0;
    setVisibleChars(0);

    typingIntervalRef.current = setInterval(() => {
      charIdx++;
      setVisibleChars(charIdx);
      if (charIdx >= text.length) {
        if (typingIntervalRef.current) {
          clearInterval(typingIntervalRef.current);
          typingIntervalRef.current = null;
        }
      }
    }, TYPEWRITER_MS_PER_CHAR);

    return () => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }
    };
  }, [visible, nextPlayer, displayText]);

  // Space to dismiss
  useEffect(() => {
    if (!visible) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        onSkip?.();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [visible, onSkip]);

  if (!visible || !nextPlayer) return null;

  const text = displayText();
  const shown = text.slice(0, visibleChars);
  const isTypingDone = visibleChars >= text.length;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[60] pointer-events-auto cursor-pointer select-none"
      style={{ paddingBottom: 'clamp(180px, 28vh, 260px)' }}
      onClick={onSkip}
    >
      <div className="flex justify-center px-4">
        <div
          className="px-6 py-3 rounded-2xl text-2xl md:text-3xl lg:text-4xl font-bold text-white whitespace-nowrap"
          style={{
            fontFamily: "'Segoe Script', 'Apple Chancery', 'Comic Sans MS', 'Dancing Script', cursive",
            textShadow: `0 0 24px ${nextPlayer.color}88, 0 2px 6px rgba(0,0,0,0.95)`,
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'none',
            border: `1.5px solid ${nextPlayer.color}44`,
          }}
        >
          {shown}
          {!isTypingDone && (
            <span
              className="inline-block w-0.5 h-6 md:h-7 bg-white/90 ml-0.5 align-middle"
              style={{ animation: 'ptm-cursor-blink 0.5s step-end infinite' }}
            />
          )}
        </div>
      </div>
      <style>{`
        @keyframes ptm-cursor-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
