'use client';

import type { AudioEffectsEngine } from '@/lib/audio/audio-effects';
import { PRESET_LABELS } from '@/lib/audio/audio-effects';
import type { AudioEffectPreset } from '@/lib/audio/audio-effects';
import { useTranslation } from '@/lib/i18n/translations';

// ===================== VOLUME METER =====================

interface VolumeMeterProps {
  volume: number;
}

export function VolumeMeter({ volume }: VolumeMeterProps) {
  const { t } = useTranslation();
  return (
    <div
      className="absolute top-16 right-4 z-20"
      role="meter"
      aria-label={t('gameHud.volumeMeter')}
      aria-valuenow={Math.round(volume * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="w-3 h-24 rounded-full overflow-hidden backdrop-blur-sm" style={{ backgroundColor: 'rgba(10, 0, 20, 0.6)' }}>
        <div
          className="w-full transition-all duration-75"
          style={{ background: 'linear-gradient(to top, #00e5ff, #bf5af2, #ff2d95)', height: `${Math.min(volume, 1) * 100}%`, marginTop: `${(1 - Math.min(volume, 1)) * 100}%` }}
        />
      </div>
    </div>
  );
}

// ===================== AUDIO EFFECTS BUTTON =====================

interface AudioEffectsButtonProps {
  onClick: () => void;
}

export function AudioEffectsButton({ onClick }: AudioEffectsButtonProps) {
  const { t } = useTranslation();

  return (
    <button
      onClick={onClick}
      className="fixed bottom-36 right-4 z-30 w-12 h-12 rounded-full flex items-center justify-center transition-all border border-[#bf5af2]/30 hover:border-[#bf5af2]/60"
      style={{ backgroundColor: 'rgba(10, 0, 20, 0.6)' }}
      title={t('gameHud.audioEffects')}
      data-testid="game-hud-audio-effects-button"
      aria-label={t('gameHud.audioEffects')}
    >
      🎛️
    </button>
  );
}

// ===================== AUDIO EFFECTS PANEL =====================

interface AudioEffectsPanelProps {
  show: boolean;
  audioEffects: AudioEffectsEngine | null;
  reverbAmount: number;
  echoAmount: number;
  onReverbChange: (_val: number) => void;
  onEchoChange: (_val: number) => void;
  onApplyPreset: (_preset: AudioEffectPreset) => void;
}

const PRESET_KEYS = Object.keys(PRESET_LABELS) as AudioEffectPreset[];

export function AudioEffectsPanel({
  show,
  audioEffects,
  reverbAmount,
  echoAmount,
  onReverbChange,
  onEchoChange,
  onApplyPreset,
}: AudioEffectsPanelProps) {
  const { t } = useTranslation();

  if (!show) return null;

  return (
    <div className="fixed bottom-52 right-4 z-30 w-72 rounded-xl p-4 border border-[#bf5af2]/30" style={{ backgroundColor: 'rgba(10, 0, 20, 0.85)' }}>
      <h4 className="font-semibold mb-3" style={{ color: '#00e5ff' }}>{t('gameHud.audioEffects')}</h4>
      <div className="space-y-3">
        <div>
          <span className="text-xs text-white/60">{t('gameHud.reverb').replace('{n}', String(Math.round(reverbAmount * 100)))}</span>
          <input
            type="range"
            min="0"
            max="100"
            value={reverbAmount * 100}
            onChange={(e) => {
              const val = parseInt(e.target.value) / 100;
              onReverbChange(val);
              audioEffects?.setReverb(val);
            }}
            className="w-full" style={{ accentColor: '#bf5af2' }}
            data-testid="game-hud-reverb-slider"
            aria-label="Reverb"
          />
        </div>
        <div>
          <span className="text-xs text-white/60">{t('gameHud.echo').replace('{n}', String(Math.round(echoAmount * 100)))}</span>
          <input
            type="range"
            min="0"
            max="100"
            value={echoAmount * 100}
            onChange={(e) => {
              const val = parseInt(e.target.value) / 100;
              onEchoChange(val);
              audioEffects?.setDelay(val * 0.5, val * 0.5);
            }}
            className="w-full" style={{ accentColor: '#00e5ff' }}
            data-testid="game-hud-echo-slider"
            aria-label="Echo"
          />
        </div>
        <div>
          <span className="text-xs text-white/60 mb-1 block">{t('gameHud.presets')}</span>
          <div className="flex flex-wrap gap-1">
            {PRESET_KEYS.map(key => (
              <button
                key={key}
                onClick={() => onApplyPreset(key)}
                className="px-2 py-1 text-xs rounded-md border transition-all hover:text-white"
                style={{ backgroundColor: 'rgba(0, 229, 255, 0.08)', borderColor: 'rgba(0, 229, 255, 0.15)', color: 'rgba(255, 255, 255, 0.8)' }}
                data-testid={`game-hud-preset-${key}`}
              >
                {PRESET_LABELS[key]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ===================== AD INDICATOR =====================

interface AdIndicatorProps {
  isAdPlaying: boolean;
  adCountdown: number;
}

export function AdIndicator({ isAdPlaying, adCountdown }: AdIndicatorProps) {
  const { t } = useTranslation();

  if (!isAdPlaying) return null;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40" role="alert">
      <div className="backdrop-blur-sm px-6 py-3 rounded-full border flex items-center gap-3" style={{ backgroundColor: 'rgba(10, 0, 20, 0.8)', borderColor: 'rgba(255, 214, 10, 0.5)' }}>
        <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: '#ffd60a' }} />
        <span className="font-medium" style={{ color: '#ffd60a' }}>{t('gameHud.adPlaying')}</span>
        <span className="text-white/60">-</span>
        <span className="text-white/80">{t('gameHud.gamePaused')}</span>
        {adCountdown > 0 && (
          <>
            <span className="text-white/60">-</span>
            <span className="font-bold" style={{ color: '#00e5ff' }}>{adCountdown}s</span>
          </>
        )}
      </div>
    </div>
  );
}

// ===================== PROGRESS BAR =====================

interface GameProgressBarProps {
  currentTime: number;
  duration: number;
}

export function GameProgressBar({ currentTime, duration }: GameProgressBarProps) {
  const safeDuration = duration || 1;
  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-20 h-1" style={{ backgroundColor: 'rgba(10, 0, 20, 0.5)' }}
      role="progressbar"
      aria-valuenow={Math.round(Math.max(0, (currentTime / safeDuration) * 100))}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full"
        style={{ background: 'linear-gradient(to right, #00e5ff, #bf5af2)', width: `${Math.max(0, (currentTime / safeDuration) * 100)}%` }}
      />
    </div>
  );
}

// ===================== TIME DISPLAY =====================

interface TimeDisplayProps {
  currentTime: number;
  duration: number;
}

export function TimeDisplay({ currentTime, duration }: TimeDisplayProps) {
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  };

  return (
    <div className="absolute bottom-2 right-4 z-20 text-white/60 text-sm font-mono">
      {formatTime(currentTime)} / {formatTime(duration || 0)}
    </div>
  );
}
