'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n/translations';

// ===================== R54: Turn-Overlays (Singalong / CPTM) =====================
// Aus mobile-client-view.tsx ausgelagert (Refactoring). Vollflächige
// Countdown- und Du-bist-dran-Signale der Turn-Modi.

// ───────────────────── SINGALONG OVERLAY ─────────────────────
export interface SingalongOverlayProps { isMyTurn: boolean; countdown: number | null; }

export function SingalongOverlay({ isMyTurn, countdown }: SingalongOverlayProps) {
  const { t } = useTranslation();
  const [flashVisible, setFlashVisible] = useState(false);

  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      queueMicrotask(() => setFlashVisible(true));
      const flashTimer = setTimeout(() => setFlashVisible(false), 300);
      return () => clearTimeout(flashTimer);
    } else if (countdown === null && isMyTurn) {
      queueMicrotask(() => setFlashVisible(true));
      const flashTimer = setTimeout(() => setFlashVisible(false), 500);
      return () => clearTimeout(flashTimer);
    }
  }, [countdown, isMyTurn]);

  if (countdown !== null && countdown > 0) {
    return (
      <div className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-100 ${flashVisible ? 'bg-emerald-500' : 'bg-emerald-900/95'}`}>
        <div className="text-center">
          <div className="text-[12rem] font-bold text-white leading-none animate-pulse">{countdown}</div>
          <div className="text-2xl font-bold text-emerald-200 mt-4 animate-pulse">{t('mobileClient.getReady')}</div>
        </div>
      </div>
    );
  }

  if (isMyTurn) {
    return (
      <div className={`fixed inset-0 z-50 flex items-center justify-center pointer-events-none transition-all duration-300 ${flashVisible ? 'bg-emerald-500/40' : 'bg-transparent'}`}>
        <div className="absolute top-4 left-0 right-0 text-center">
          <div className="inline-block bg-emerald-500/90 text-white px-6 py-2 rounded-full text-lg font-bold animate-pulse">
            🎤 {t('mobileClient.youreSinging')}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// ───────────────────── CPTM BLINK OVERLAY ─────────────────────
export interface CptmBlinkOverlayProps { countdown: number | null; playerColor: string; }

export function CptmBlinkOverlay({ countdown, playerColor }: CptmBlinkOverlayProps) {
  const { t } = useTranslation();
  const intensity = countdown === 3 ? 0.15 : countdown === 2 ? 0.3 : 0.5;
  if (countdown === null || countdown <= 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none" style={{ backgroundColor: playerColor, opacity: intensity }}>
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: playerColor, animation: `cptm-blink ${countdown === 3 ? 2 : countdown === 2 ? 1 : 0.5}s ease-in-out infinite alternate` }} />
      <div className="relative z-10 text-center">
        <div className="text-8xl font-bold text-white/90 animate-pulse">{countdown}</div>
        <div className="text-lg font-medium text-white/70 mt-2">{t('mobileCompanion.getReady')}</div>
      </div>
      <style>{`@keyframes cptm-blink { 0% { opacity: 0; } 100% { opacity: ${Math.min(intensity * 2.5, 0.8)}; } }`}</style>
    </div>
  );
}

// ───────────────────── CPTM YOUR TURN OVERLAY ─────────────────────
export interface CptmYourTurnOverlayProps { playerName: string; playerColor: string; }

export function CptmYourTurnOverlay({ playerName, playerColor }: CptmYourTurnOverlayProps) {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  useEffect(() => { queueMicrotask(() => setShow(true)); }, []);
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle at center, ${playerColor}40, transparent 70%)` }} />
      <div className="relative z-10 text-center animate-[scale-in_0.3s_ease-out]">
        <div className="text-sm font-bold text-white/60 uppercase tracking-[0.3em] mb-2">{t('mobileCompanion.yourTurn')}</div>
        <div className="text-5xl font-bold text-white" style={{ textShadow: `0 0 30px ${playerColor}` }}>{playerName}</div>
        <div className="mt-4 mx-auto h-1.5 rounded-full" style={{ width: '120px', backgroundColor: playerColor }} />
      </div>
    </div>
  );
}
