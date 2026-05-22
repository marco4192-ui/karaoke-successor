'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  /** Called when the transition animation completes (auto-dismiss) */
  onComplete?: () => void;
  /** Called when user clicks/presses Space to dismiss */
  onSkip?: () => void;
  /** Called when the transition animation completes (alias for onSkip) */
  onComplete?: () => void;
  /** Extra props silently accepted for forward-compat (avoids stale-cache build failures) */
  [key: string]: unknown;
}

// ===================== TIMING =====================

const TYPEWRITER_MS_PER_CHAR = 35; // Fast typing — completes ~35 chars in ~1.2s
const AUTO_DISMISS_MS = 5000; // Auto-hide 5s after typing finishes

// ===================== TRANSITION OVERLAY =====================

export function PtmTransitionOverlay({
  visible,
  nextPlayer,
  onComplete,
  onSkip,
}: PtmTransitionOverlayProps) {
  const { t } = useTranslation();
  const [visibleChars, setVisibleChars] = useState(0);
  const typingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Split text into prefix (white) and player name (colored)
  const { prefixText, playerName } = useMemo(() => {
    if (!nextPlayer) return { prefixText: '', playerName: '' };
    const base = t('passTheMic.handOverMic');
    // Strip trailing ":)" smiley from translation, add colon + player name
    const clean = base.replace(/\s*:\)\s*$/, '');
    const separator = ': ';
    const playerNamePart = nextPlayer.name;
    return {
      prefixText: `${clean}${separator}`,
      playerName: playerNamePart,
    };
  }, [t, nextPlayer]);

  // Full text for typewriter char counting
  const fullText = `${prefixText}${playerName}`;
  const isTypingDone = visibleChars >= fullText.length;

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

    let charIdx = 0;
    setVisibleChars(0);

    typingIntervalRef.current = setInterval(() => {
      charIdx++;
      setVisibleChars(charIdx);
      if (charIdx >= fullText.length) {
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
  }, [visible, nextPlayer, fullText]);

  // Auto-dismiss 5 seconds after typing animation completes
  const autoDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (autoDismissRef.current) {
      clearTimeout(autoDismissRef.current);
      autoDismissRef.current = null;
    }
    if (visible && isTypingDone) {
      autoDismissRef.current = setTimeout(() => {
        onComplete?.();
        onSkip?.();
      }, AUTO_DISMISS_MS);
    }
    return () => {
      if (autoDismissRef.current) {
        clearTimeout(autoDismissRef.current);
        autoDismissRef.current = null;
      }
    };
  }, [visible, isTypingDone, onComplete, onSkip]);

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

  const shown = fullText.slice(0, visibleChars);
  const prefixLen = prefixText.length;

  // Determine what portion of the prefix and name is visible
  const visiblePrefix = shown.slice(0, prefixLen);
  const visibleName = shown.slice(prefixLen);
  const nameStartedTyping = visibleChars > prefixLen;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[60] pointer-events-auto cursor-pointer select-none"
      style={{ paddingBottom: 'clamp(180px, 28vh, 260px)' }}
      onClick={onSkip}
    >
      <div className="flex justify-center px-4 transition-opacity duration-500">
        <div
          className="px-6 py-3 rounded-2xl text-2xl md:text-3xl lg:text-4xl font-bold whitespace-nowrap"
          style={{
            fontFamily: "'Segoe Script', 'Apple Chancery', 'Comic Sans MS', 'Dancing Script', cursive",
            textShadow: `0 0 24px ${nextPlayer.color}88, 0 2px 6px rgba(0,0,0,0.95)`,
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'none',
            border: `1.5px solid ${nextPlayer.color}44`,
          }}
        >
          {/* Prefix text — always white */}
          <span className="text-white">{visiblePrefix}</span>
          {/* Player name — colored in their player color */}
          {nameStartedTyping && (
            <span style={{ color: nextPlayer.color }}>{visibleName}</span>
          )}
          {/* Typing cursor */}
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
