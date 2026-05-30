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
      <div className="w-3 h-24 bg-[#2a1a3e] rounded-full overflow-hidden border-[3px] border-black">
        <div
          className="w-full bg-[#00F3B2] transition-all duration-75"
          style={{ height: `${Math.min(volume, 1) * 100}%`, marginTop: `${(1 - Math.min(volume, 1)) * 100}%` }}
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
      className="fixed bottom-36 right-4 z-30 w-12 h-12 rounded-full bg-[#FDE601] hover:bg-[#F939A3] flex items-center justify-center transition-all border-[3px] border-black"
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
    <div className="fixed bottom-52 right-4 z-30 w-72 bg-[#2a1a3e] rounded-xl p-4 border-[3px] border-black" style={{ boxShadow: '4px 4px 0px #F939A3' }}>
      <h4 className="font-semibold mb-3 text-[#FDE601]" style={{ WebkitTextStroke: '1px #000', paintOrder: 'stroke fill' }}>{t('gameHud.audioEffects')}</h4>
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
            className="w-full accent-[#BA279D]"
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
            className="w-full accent-[#00F3B2]"
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
                className="px-2 py-1 text-xs rounded-md bg-[#FDE601] hover:bg-[#F939A3] border-[3px] border-black transition-all text-black hover:text-black"
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
      <div className="bg-[#2a1a3e] px-6 py-3 rounded-full border-[3px] border-black flex items-center gap-3" style={{ boxShadow: '4px 4px 0px #FC6B48' }}>
        <div className="w-3 h-3 bg-[#FDE601] rounded-full animate-pulse" />
        <span className="text-[#FDE601] font-medium" style={{ WebkitTextStroke: '1px #000', paintOrder: 'stroke fill' }}>{t('gameHud.adPlaying')}</span>
        <span className="text-white/60">-</span>
        <span className="text-white/80">{t('gameHud.gamePaused')}</span>
        {adCountdown > 0 && (
          <>
            <span className="text-white/60">-</span>
            <span className="text-[#00F3B2] font-bold" style={{ WebkitTextStroke: '1px #000', paintOrder: 'stroke fill' }}>{adCountdown}s</span>
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
      className="absolute bottom-0 left-0 right-0 z-20 h-2 bg-[#2a1a3e] border-t-[3px] border-black"
      role="progressbar"
      aria-valuenow={Math.round(Math.max(0, (currentTime / safeDuration) * 100))}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full bg-[#00F3B2]"
        style={{ width: `${Math.max(0, (currentTime / safeDuration) * 100)}%` }}
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
    <div className="absolute bottom-2 right-4 z-20 text-[#c0b8d0] text-sm font-mono" style={{ WebkitTextStroke: '0.5px #000', paintOrder: 'stroke fill' }}>
      {formatTime(currentTime)} / {formatTime(duration || 0)}
    </div>
  );
}
