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
  /** Segment number (e.g. "Segment 3/8") */
  segmentLabel?: string;
  /** Called when the transition is complete */
  onComplete?: () => void;
  /** Called when user clicks/presses Space to skip */
  onSkip?: () => void;
}

// ===================== TIMING =====================

const LEAD_PHASE_MS = 2000;       // Matches TRANSITION_LEAD_TIME in hook — subtle lead-in
const TYPEWRITER_MS_PER_CHAR = 55; // Speed of letter-by-letter reveal
const PROFILE_DISPLAY_MS = 1200;  // How long the player profile stays visible
const PROFILE_FADE_MS = 400;      // Fade-out duration for profile

// ===================== TRANSITION OVERLAY =====================

export function PtmTransitionOverlay({
  visible,
  nextPlayer,
  segmentLabel: _segmentLabel,
  onComplete,
  onSkip,
}: PtmTransitionOverlayProps) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<'idle' | 'lead' | 'typing' | 'profile' | 'fading'>('idle');
  const [visibleChars, setVisibleChars] = useState(0);
  const [profileOpacity, setProfileOpacity] = useState(0);
  const typingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const instructionText = t('passTheMic.handOverMic');

  // Reset and start animation when visible changes
  useEffect(() => {
    if (!visible || !nextPlayer) {
      setPhase('idle');
      setVisibleChars(0);
      setProfileOpacity(0);
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }
      return;
    }

    // Phase 1: Lead-in (subtle, no heavy blinking — just a gentle glow pulse)
    setPhase('lead');
    setVisibleChars(0);
    setProfileOpacity(0);

    // Phase 2: Typewriter text reveal
    const typingStart = setTimeout(() => {
      setPhase('typing');
      let charIdx = 0;
      typingIntervalRef.current = setInterval(() => {
        charIdx++;
        setVisibleChars(charIdx);
        if (charIdx >= instructionText.length) {
          if (typingIntervalRef.current) {
            clearInterval(typingIntervalRef.current);
            typingIntervalRef.current = null;
          }
        }
      }, TYPEWRITER_MS_PER_CHAR);
    }, LEAD_PHASE_MS);

    // Phase 3: Show player profile
    const typingDuration = instructionText.length * TYPEWRITER_MS_PER_CHAR;
    const profileStart = setTimeout(() => {
      setPhase('profile');
      setProfileOpacity(1);
    }, LEAD_PHASE_MS + typingDuration + 300);

    // Phase 4: Fade out
    const fadeStart = setTimeout(() => {
      setPhase('fading');
      setProfileOpacity(0);
    }, LEAD_PHASE_MS + typingDuration + 300 + PROFILE_DISPLAY_MS);

    // Complete
    const completeStart = setTimeout(() => {
      setPhase('idle');
      setProfileOpacity(0);
      onComplete?.();
    }, LEAD_PHASE_MS + typingDuration + 300 + PROFILE_DISPLAY_MS + PROFILE_FADE_MS);

    return () => {
      clearTimeout(typingStart);
      clearTimeout(profileStart);
      clearTimeout(fadeStart);
      clearTimeout(completeStart);
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }
    };
  }, [visible, nextPlayer, onComplete, instructionText]);

  // Space to skip
  useEffect(() => {
    if (!visible) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        skip();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- skip is stable via ref pattern
  }, [visible]);

  const skip = useCallback(() => {
    setPhase('idle');
    setVisibleChars(0);
    setProfileOpacity(0);
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }
    onSkip?.();
  }, [onSkip]);

  // Click to skip
  const handleClick = useCallback(() => {
    if (!visible) return;
    skip();
  }, [visible, skip]);

  if (!visible || !nextPlayer || phase === 'idle') return null;

  const isLead = phase === 'lead';
  const isTyping = phase === 'typing';
  const isProfile = phase === 'profile';
  const isFading = phase === 'fading';
  const showProfile = isProfile || isFading;
  const displayText = instructionText.slice(0, visibleChars);
  const isTypingDone = visibleChars >= instructionText.length;

  return (
    <div
      className="fixed inset-0 z-[60] pointer-events-auto cursor-pointer select-none"
      onClick={handleClick}
    >
      {/* Dark backdrop — only during typing/profile/fading, not during lead-in */}
      {!isLead && (
        <div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          style={{
            opacity: isTyping ? 1 : profileOpacity,
            transition: isFading ? `opacity ${PROFILE_FADE_MS}ms ease-out` : 'opacity 0.3s ease-in',
          }}
        />
      )}

      {/* Lead-in: subtle border glow (no blinking!) */}
      {isLead && (
        <div
          className="absolute inset-0"
          style={{
            boxShadow: `inset 0 0 16px 4px ${nextPlayer.color}`,
            opacity: 0.6,
            animation: 'ptm-lead-pulse 0.8s ease-in-out infinite alternate',
          }}
        />
      )}

      {/* Content area — positioned above center (upper portion of screen) */}
      <div className="absolute inset-0 flex flex-col items-center justify-start pt-[25%]">
        {/* Typewriter text — centered above the profile */}
        {(isTyping || isLead) && (
          <div className="relative z-10">
            {/* Instruction text */}
            <div
              className="text-2xl md:text-3xl font-bold text-white text-center px-6"
              style={{
                textShadow: `0 0 30px ${nextPlayer.color}66, 0 2px 4px rgba(0,0,0,0.8)`,
                opacity: isLead ? 0 : 1,
                transition: 'opacity 0.2s',
              }}
            >
              {displayText}
              {/* Blinking cursor while typing */}
              {isTyping && !isTypingDone && (
                <span
                  className="inline-block w-0.5 h-6 md:h-7 bg-white ml-1 align-middle"
                  style={{
                    animation: 'ptm-cursor-blink 0.5s step-end infinite',
                  }}
                />
              )}
            </div>
          </div>
        )}

        {/* Player profile — fades in after typing is complete */}
        {showProfile && (
          <div
            className="relative z-10 flex flex-col items-center mt-6"
            style={{
              opacity: profileOpacity,
              transform: profileOpacity < 1 ? 'translateY(10px)' : 'translateY(0)',
              transition: isFading
                ? `opacity ${PROFILE_FADE_MS}ms ease-out, transform ${PROFILE_FADE_MS}ms ease-out`
                : 'opacity 0.4s ease-in, transform 0.4s ease-out',
            }}
          >
            <div className="bg-white/5 border border-white/10 rounded-2xl px-8 py-5 backdrop-blur-md flex flex-col items-center gap-3">
              {/* Avatar */}
              {nextPlayer.avatar ? (
                <img
                  src={nextPlayer.avatar}
                  alt={nextPlayer.name}
                  className="w-20 h-20 rounded-full object-cover border-3"
                  style={{
                    borderColor: nextPlayer.color,
                    boxShadow: `0 0 20px ${nextPlayer.color}44`,
                  }}
                />
              ) : (
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold border-3 text-white"
                  style={{
                    backgroundColor: nextPlayer.color,
                    borderColor: nextPlayer.color,
                    boxShadow: `0 0 20px ${nextPlayer.color}44`,
                  }}
                >
                  {nextPlayer.name.charAt(0).toUpperCase()}
                </div>
              )}
              {/* Name */}
              <div
                className="text-2xl font-bold text-white"
                style={{ textShadow: `0 0 20px ${nextPlayer.color}88` }}
              >
                {nextPlayer.name}
              </div>
              {/* Segment label */}
              {_segmentLabel && (
                <div className="text-xs text-white/40">{_segmentLabel}</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Inline keyframes for animations */}
      <style>{`
        @keyframes ptm-cursor-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes ptm-lead-pulse {
          from { opacity: 0.3; }
          to { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}
