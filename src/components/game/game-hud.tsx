'use client';

import type { AudioEffectsEngine } from '@/lib/audio/audio-effects';
import { PRESET_LABELS } from '@/lib/audio/audio-effects';
import type { AudioEffectPreset } from '@/lib/audio/audio-effects';
import { useTranslation } from '@/lib/i18n/translations';

// ===================== AUDIO EFFECTS BUTTON =====================

interface AudioEffectsButtonProps {
  onClick: () => void;
}

export function AudioEffectsButton({ onClick }: AudioEffectsButtonProps) {
  const { t } = useTranslation();

  return (
    <button
      onClick={onClick}
      className="fixed bottom-44 right-4 z-30 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
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
    <div className="fixed bottom-60 right-4 z-30 w-72 bg-gray-800/95 rounded-xl p-4 border border-white/20">
      <h4 className="font-semibold mb-3">{t('gameHud.audioEffects')}</h4>
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
            className="w-full accent-purple-500"
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
            className="w-full accent-cyan-500"
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
                className="px-2 py-1 text-xs rounded-md bg-white/10 hover:bg-white/20 border border-white/10 hover:border-purple-500/50 transition-all text-white/80 hover:text-white"
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
  /** Platform domain label ("youtube.com", "dailymotion.com", …) for the ad overlay. */
  platformLabel?: string;
}

export function AdIndicator({ isAdPlaying, adCountdown, platformLabel }: AdIndicatorProps) {
  const { t } = useTranslation();

  if (!isAdPlaying) return null;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 max-w-[92vw]" role="alert" aria-live="polite">
      <div className="bg-black/80 backdrop-blur-sm px-6 py-3 rounded-full border border-yellow-500/50 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse shrink-0" />
        <span className="text-yellow-400 font-medium">{t('gameHud.adPlaying')}</span>
        {platformLabel && (
          <>
            <span className="text-white/60">·</span>
            <span className="text-white/80">
              {t('gameHud.adPlayingPlatform').replace('{platform}', platformLabel)}
            </span>
          </>
        )}
        <span className="text-white/60">·</span>
        <span className="text-white/60">{t('gameHud.gameStartsAfterAd')}</span>
        {adCountdown > 0 && (
          <>
            <span className="text-white/60">·</span>
            <span className="text-cyan-400 font-bold tabular-nums">{adCountdown}s</span>
          </>
        )}
      </div>
    </div>
  );
}

// ===================== SONG START GATE =====================

interface SongStartGateIndicatorProps {
  /** True while the manual start gate is engaged (game waits for user confirmation). */
  pending: boolean;
  /** Platform domain label ("bilibili.com", "nicovideo.jp", …). */
  platformLabel?: string;
  /** Confirm callback — user says "the music is running, start!". */
  onConfirm: () => void;
}

/**
 * Manual song-start gate overlay for platforms without a playback API
 * (Bilibili always; Niconico when its unofficial API is dead).
 *
 * The platform player fires the ad-wait (game paused); THIS indicator takes
 * over the messaging (the plain AdIndicator is suppressed while pending) and
 * adds the confirmation button that releases the gate and starts the
 * stopwatch-based karaoke clock.
 */
export function SongStartGateIndicator({ pending, platformLabel, onConfirm }: SongStartGateIndicatorProps) {
  const { t } = useTranslation();

  if (!pending) return null;

  return (
    <div
      className="absolute top-4 left-1/2 -translate-x-1/2 z-40 max-w-[92vw]"
      role="alert"
      aria-live="polite"
      data-testid="song-start-gate"
    >
      <div className="bg-black/85 backdrop-blur-md px-5 py-4 rounded-2xl border border-cyan-500/50 shadow-2xl shadow-cyan-500/10 flex flex-col items-center gap-3">
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <div className="w-3 h-3 bg-cyan-400 rounded-full animate-pulse shrink-0" />
          <span className="text-cyan-300 font-semibold">{t('gameHud.songStartGateTitle')}</span>
          {platformLabel && (
            <>
              <span className="text-white/60">·</span>
              <span className="text-white/80">
                {t('gameHud.adPlayingPlatform').replace('{platform}', platformLabel)}
              </span>
            </>
          )}
        </div>

        <p className="text-white/70 text-sm text-center max-w-md leading-relaxed">
          {t('gameHud.songStartGateHint')}
        </p>

        <button
          type="button"
          onClick={onConfirm}
          className="px-6 py-2.5 min-h-[44px] rounded-xl bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-slate-950 font-bold text-base transition-all shadow-lg shadow-cyan-500/25 flex items-center gap-2"
          data-testid="song-start-gate-confirm"
        >
          <span aria-hidden="true">▶</span>
          {t('gameHud.songStartGateConfirm')}
        </button>
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
      className="absolute bottom-0 left-0 right-0 z-20 h-1 bg-white/10"
      role="progressbar"
      aria-valuenow={Math.round(Math.max(0, (currentTime / safeDuration) * 100))}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
        style={{ width: `${Math.max(0, (currentTime / safeDuration) * 100)}%` }}
      />
    </div>
  );
}

// ===================== TIME DISPLAY =====================

interface TimeDisplayProps {
  currentTime: number;
  duration: number;
  /**
   * Inline variant: renders as a normal flow element (single line,
   * right-aligned, no wrapping) instead of an absolute bottom-right
   * overlay. Used by Battle Royale where the wrapper controls placement.
   */
  inline?: boolean;
}

export function TimeDisplay({ currentTime, duration, inline }: TimeDisplayProps) {
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  };

  if (inline) {
    return (
      <div className="text-white/60 text-sm font-mono whitespace-nowrap tabular-nums">
        {formatTime(currentTime)} / {formatTime(duration || 0)}
      </div>
    );
  }

  return (
    <div className="absolute bottom-2 right-4 z-20 text-white/60 text-sm font-mono">
      {formatTime(currentTime)} / {formatTime(duration || 0)}
    </div>
  );
}
