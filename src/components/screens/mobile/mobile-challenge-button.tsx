'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n/translations';
import type { MobileSong } from './mobile-types';

interface MobileChallengeButtonProps {
  songs: MobileSong[];
  onRandomChallenge: (song: MobileSong) => void;
  disabled?: boolean;
}

export function MobileChallengeButton({ songs, onRandomChallenge, disabled }: MobileChallengeButtonProps) {
  const { t } = useTranslation();
  const [splash, setSplash] = useState<MobileSong | null>(null);
  const splashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up splash timer on unmount
  useEffect(() => {
    return () => {
      if (splashTimerRef.current) clearTimeout(splashTimerRef.current);
    };
  }, []);

  const handleChallenge = useCallback(() => {
    if (disabled || songs.length === 0) return;

    const randomIndex = Math.floor(Math.random() * songs.length);
    const chosen = songs[randomIndex];

    // Show splash briefly
    if (splashTimerRef.current) clearTimeout(splashTimerRef.current);
    setSplash(chosen);
    splashTimerRef.current = setTimeout(() => {
      setSplash(null);
    }, 2500);

    // Immediately add to queue
    onRandomChallenge(chosen);
  }, [disabled, songs, onRandomChallenge]);

  return (
    <>
      {/* FAB — bottom-right, above the bottom nav */}
      <button
        onClick={handleChallenge}
        disabled={disabled || songs.length === 0}
        className="fixed right-4 bottom-20 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/30 flex items-center justify-center text-2xl transition-transform active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed animate-[pulse-glow_2s_ease-in-out_infinite]"
        aria-label={t('mobileChallenge.title')}
        title={t('mobileChallenge.title')}
      >
        🎲

        {/* Pulsing ring animation */}
        <span className="absolute inset-0 rounded-full bg-amber-400/30 animate-ping" />
      </button>

      {/* Splash overlay */}
      {splash && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-black/70 backdrop-blur-md rounded-2xl px-8 py-6 max-w-[85vw] text-center animate-[splash-in_0.3s_ease-out] shadow-2xl">
            <p className="text-4xl mb-2">🎲</p>
            <p className="text-lg font-bold text-white truncate">
              {splash.title}
            </p>
            <p className="text-sm text-white/50 truncate mb-1">
              {splash.artist}
            </p>
            <p className="text-sm font-semibold text-amber-400">
              {t('mobileChallenge.challenged')}
            </p>
          </div>
        </div>
      )}

      {/* Keyframe animations */}
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 12px rgba(245, 158, 11, 0.3); }
          50% { box-shadow: 0 0 24px rgba(245, 158, 11, 0.5); }
        }
        @keyframes splash-in {
          0% { opacity: 0; transform: scale(0.8) translateY(20px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </>
  );
}
