'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n/translations';

// ===================== MOBILE ONBOARDING OVERLAY =====================
interface MobileOnboardingProps {
  onComplete: () => void;
}

const ONBOARDING_KEY = 'mobile-onboarding-completed';

export function MobileOnboarding({ onComplete }: MobileOnboardingProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('left');
  const [isAnimating, setIsAnimating] = useState(false);

  // Persist completion
  const handleComplete = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    onComplete();
  }, [onComplete]);

  const goNext = useCallback(() => {
    if (isAnimating || step >= 2) return;
    setSlideDirection('left');
    setIsAnimating(true);
    setTimeout(() => {
      setStep((s) => s + 1);
      setIsAnimating(false);
    }, 200);
  }, [isAnimating, step]);

  const goBack = useCallback(() => {
    if (isAnimating || step <= 0) return;
    setSlideDirection('right');
    setIsAnimating(true);
    setTimeout(() => {
      setStep((s) => s - 1);
      setIsAnimating(false);
    }, 200);
  }, [isAnimating, step]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 text-white">
      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 overflow-hidden">
        <div
          className={`w-full max-w-md transition-all duration-200 ${
            isAnimating
              ? slideDirection === 'left'
                ? 'translate-x-[-30px] opacity-0'
                : 'translate-x-[30px] opacity-0'
              : 'translate-x-0 opacity-100'
          }`}
        >
          {step === 0 && <WelcomeStep t={t} />}
          {step === 1 && <FeaturesStep t={t} />}
          {step === 2 && <GetStartedStep t={t} onGo={handleComplete} />}
        </div>
      </div>

      {/* Bottom controls */}
      <div className="px-6 pb-10 pt-4">
        {/* Dots indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i === step
                  ? 'w-8 h-2 bg-cyan-400'
                  : 'w-2 h-2 bg-white/30'
              }`}
            />
          ))}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between max-w-md mx-auto w-full">
          <button
            onClick={goBack}
            disabled={step === 0}
            className={`text-sm px-4 py-2 rounded-lg transition-colors ${
              step === 0
                ? 'opacity-0 pointer-events-none'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            {t('mobileOnboarding.back')}
          </button>

          {step < 2 ? (
            <button
              onClick={goNext}
              className="px-8 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-semibold transition-colors active:scale-95"
            >
              {t('mobileOnboarding.next')}
            </button>
          ) : (
            <button
              onClick={handleComplete}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white font-semibold transition-all active:scale-95 shadow-lg shadow-cyan-500/25"
            >
              {t('mobileOnboarding.letsGo')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ===================== STEP 1: WELCOME =====================
function WelcomeStep({ t }: { t: (key: string) => string }) {
  return (
    <div className="flex flex-col items-center text-center">
      {/* Illustration */}
      <div className="text-7xl mb-8 flex items-center gap-3">
        <span className="animate-bounce" style={{ animationDelay: '0ms' }}>🎤</span>
        <span className="animate-bounce" style={{ animationDelay: '150ms' }}>🎵</span>
        <span className="animate-bounce" style={{ animationDelay: '300ms' }}>📱</span>
      </div>

      {/* Title */}
      <h1 className="text-4xl font-extrabold mb-3 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
        {t('mobileOnboarding.welcome')}
      </h1>

      {/* Subtitle */}
      <p className="text-lg text-white/60 max-w-xs">
        {t('mobileOnboarding.subtitle')}
      </p>
    </div>
  );
}

// ===================== STEP 2: FEATURES =====================
const FEATURES = [
  { emoji: '🎤', titleKey: 'mobileOnboarding.featureSing', descKey: 'mobileOnboarding.featureSingDesc', color: 'from-cyan-500/20 to-blue-500/20', border: 'border-cyan-500/30' },
  { emoji: '📋', titleKey: 'mobileOnboarding.featureQueue', descKey: 'mobileOnboarding.featureQueueDesc', color: 'from-purple-500/20 to-pink-500/20', border: 'border-purple-500/30' },
  { emoji: '🎮', titleKey: 'mobileOnboarding.featureRemote', descKey: 'mobileOnboarding.featureRemoteDesc', color: 'from-orange-500/20 to-red-500/20', border: 'border-orange-500/30' },
  { emoji: '🏆', titleKey: 'mobileOnboarding.featureCompete', descKey: 'mobileOnboarding.featureCompeteDesc', color: 'from-emerald-500/20 to-teal-500/20', border: 'border-emerald-500/30' },
] as const;

function FeaturesStep({ t }: { t: (key: string) => string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <h2 className="text-2xl font-bold mb-6 text-white/90">
        {t('mobileOnboarding.features')}
      </h2>

      <div className="grid grid-cols-2 gap-3 w-full">
        {FEATURES.map((f) => (
          <div
            key={f.titleKey}
            className={`bg-gradient-to-br ${f.color} ${f.border} border rounded-2xl p-4 flex flex-col items-center text-center`}
          >
            <span className="text-3xl mb-2">{f.emoji}</span>
            <h3 className="text-sm font-semibold mb-1">{t(f.titleKey)}</h3>
            <p className="text-xs text-white/50 leading-relaxed">{t(f.descKey)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===================== STEP 3: GET STARTED =====================
function GetStartedStep({ t, onGo }: { t: (key: string) => string; onGo: () => void }) {
  return (
    <div className="flex flex-col items-center text-center">
      {/* Icon */}
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center mb-6">
        <span className="text-4xl">📱</span>
      </div>

      <h2 className="text-2xl font-bold mb-3">
        {t('mobileOnboarding.getStarted')}
      </h2>

      <p className="text-white/60 mb-2 max-w-xs">
        {t('mobileOnboarding.connectHint')}
      </p>

      <p className="text-sm text-white/40 mb-8 max-w-xs">
        {t('mobileOnboarding.scanHint')}
      </p>

      {/* Get Started button (shown both inline and in bottom nav) */}
      <button
        onClick={onGo}
        className="px-10 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white font-bold text-lg transition-all active:scale-95 shadow-lg shadow-cyan-500/25"
      >
        {t('mobileOnboarding.letsGo')}
      </button>
    </div>
  );
}
