'use client';

import type { AudioEffectsEngine, AudioEffectPreset, VoiceFxSettings, VoiceFxMode } from '@/lib/audio/audio-effects';
import { PRESET_LABELS } from '@/lib/audio/audio-effects';
import type { VocalFilterUnsupportedReason } from '@/lib/audio/vocal-filter';
import type { PitchShiftUnsupportedReason } from '@/lib/audio/pitch-shift';
import { useTranslation } from '@/lib/i18n/translations';

// ===================== PITCH SHIFT BUTTON (R105) =====================

interface PitchShiftButtonProps {
  onClick: () => void;
  /** Current transposition — shown on the button badge when ≠ 0. */
  semitones: number;
  /** null = available; otherwise the medium-based reason it is not. */
  unsupportedReason: PitchShiftUnsupportedReason | null;
}

export function PitchShiftButton({ onClick, semitones, unsupportedReason }: PitchShiftButtonProps) {
  const { t } = useTranslation();
  const active = semitones !== 0 && !unsupportedReason;
  const label = unsupportedReason
    ? `${t('gameHud.pitchShift')} — ${t('gameHud.pitchShiftUnavailableShort')}`
    : active
      ? `${t('gameHud.pitchShift')}: ${semitones > 0 ? '+' : ''}${semitones}`
      : t('gameHud.pitchShift');

  return (
    <button
      onClick={onClick}
      className={`fixed bottom-56 right-4 z-30 w-12 h-12 rounded-full flex items-center justify-center transition-all ${
        unsupportedReason
          ? 'bg-white/5 opacity-50 cursor-not-allowed'
          : active
            ? 'bg-purple-500/40 hover:bg-purple-500/60 ring-1 ring-purple-400/60'
            : 'bg-white/10 hover:bg-white/20'
      }`}
      title={label}
      data-testid="game-hud-pitch-shift-button"
      aria-label={label}
    >
      <span className="text-xl leading-none">🎚️</span>
      {active && (
        <span
          className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-purple-500 text-white text-[10px] font-bold flex items-center justify-center"
          data-testid="game-hud-pitch-shift-badge"
        >
          {semitones > 0 ? `+${semitones}` : semitones}
        </span>
      )}
    </button>
  );
}

// ===================== PITCH SHIFT PANEL (R105) =====================

interface PitchShiftPanelProps {
  show: boolean;
  /** Current transposition in semitones. */
  semitones: number;
  /** Absolute limit (±12). */
  max: number;
  /** null = available; otherwise the medium-based reason it is not. */
  unsupportedReason: PitchShiftUnsupportedReason | null;
  /** True when engaging the Web Audio chain failed at runtime. */
  runtimeUnavailable: boolean;
  onSemitonesChange: (_value: number) => void;
  onReset: () => void;
  onClose: () => void;
}

export function PitchShiftPanel({
  show,
  semitones,
  max,
  unsupportedReason,
  runtimeUnavailable,
  onSemitonesChange,
  onReset,
  onClose,
}: PitchShiftPanelProps) {
  const { t } = useTranslation();
  if (!show) return null;

  const reasonKey: Record<PitchShiftUnsupportedReason, string> = {
    midi: 'gameHud.pitchShiftReasonMidi',
    platform: 'gameHud.pitchShiftReasonPlatform',
    crossorigin: 'gameHud.pitchShiftReasonCrossOrigin',
    native: 'gameHud.pitchShiftReasonNative',
  };

  const valueLabel = semitones === 0
    ? t('gameHud.pitchShiftOff')
    : t(semitones === 1 || semitones === -1 ? 'gameHud.pitchShiftSemitone' : 'gameHud.pitchShiftSemitones')
        .replace('{n}', `${semitones > 0 ? '+' : ''}${semitones}`);

  return (
    <div
      className="fixed bottom-72 right-4 z-40 w-64 bg-gray-800/95 rounded-xl p-4 border border-white/20"
      data-testid="pitch-shift-panel"
      role="dialog"
      aria-label={t('gameHud.pitchShiftLabel')}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">🎚️ {t('gameHud.pitchShiftLabel')}</h3>
        <button
          onClick={onClose}
          className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-white/70 text-xs"
          aria-label="Close"
          data-testid="pitch-shift-panel-close"
        >
          ✕
        </button>
      </div>

      {unsupportedReason ? (
        <div className="text-xs text-red-300/90 leading-relaxed" data-testid="pitch-shift-unavailable">
          ⚠️ {t('gameHud.pitchShiftUnavailableShort')}
          <p className="mt-1 text-white/50">{t(reasonKey[unsupportedReason])}</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2 mb-3">
            <button
              onClick={() => onSemitonesChange(semitones - 1)}
              disabled={semitones <= -max}
              className="w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white text-lg font-bold"
              aria-label="Minus one semitone"
              data-testid="pitch-shift-minus"
            >
              −
            </button>
            <div className="text-center min-w-0 flex-1" data-testid="pitch-shift-value">
              <div className={`text-2xl font-black ${semitones === 0 ? 'text-white/60' : 'text-purple-300'}`}>
                {semitones > 0 ? `+${semitones}` : semitones}
              </div>
              <div className="text-[11px] text-white/50 truncate">{valueLabel}</div>
            </div>
            <button
              onClick={() => onSemitonesChange(semitones + 1)}
              disabled={semitones >= max}
              className="w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white text-lg font-bold"
              aria-label="Plus one semitone"
              data-testid="pitch-shift-plus"
            >
              +
            </button>
          </div>

          <input
            type="range"
            min={-max}
            max={max}
            step={1}
            value={semitones}
            onChange={(e) => onSemitonesChange(parseInt(e.target.value, 10))}
            className="w-full accent-purple-400 h-1.5 mb-3"
            aria-label={t('gameHud.pitchShiftLabel')}
            data-testid="pitch-shift-slider"
          />

          <button
            onClick={onReset}
            disabled={semitones === 0}
            className="w-full py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white/80 text-xs font-medium mb-2"
            data-testid="pitch-shift-reset"
          >
            ↺ {t('gameHud.pitchShiftReset')}
          </button>

          <p className="text-[11px] text-white/40 leading-snug">{t('gameHud.pitchShiftHint')}</p>

          {runtimeUnavailable && (
            <p className="mt-2 text-[11px] text-amber-300/80 leading-snug" data-testid="pitch-shift-runtime-failed">
              ⚠️ {t('gameHud.pitchShiftRuntimeFailed')}
            </p>
          )}
        </>
      )}
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
  /** Vocal filter (Gesangsfilter) amount 0..1 — 0 = off. */
  vocalFilterAmount: number;
  onVocalFilterChange: (_val: number) => void;
  /** null = vocal filter available; otherwise why it is not (row rendered disabled). */
  vocalFilterUnsupportedReason: VocalFilterUnsupportedReason | null;
  /** Voice FX Studio (feature idea #16). */
  voiceFx: VoiceFxSettings;
  onVoiceFxChange: (_updates: Partial<VoiceFxSettings>) => void;
  /** False when AudioWorklets are unavailable — studio section hides itself. */
  voiceFxAvailable: boolean;
}

const PRESET_KEYS = Object.keys(PRESET_LABELS) as AudioEffectPreset[];

/** Voice FX character modes for the studio section. */
const VOICE_FX_MODES: Array<{ id: Exclude<VoiceFxMode, 'off'>; emoji: string; labelKey: string }> = [
  { id: 'robot', emoji: '🤖', labelKey: 'gameHud.voiceFxRobot' },
  { id: 'phone', emoji: '📞', labelKey: 'gameHud.voiceFxPhone' },
  { id: 'chorus', emoji: '🌊', labelKey: 'gameHud.voiceFxChorus' },
  { id: 'megaphone', emoji: '📣', labelKey: 'gameHud.voiceFxMegaphone' },
];

/** i18n key per unavailability reason (tooltip explaining why). */
const VOCAL_FILTER_REASON_KEYS: Record<VocalFilterUnsupportedReason, string> = {
  midi: 'gameHud.vocalFilterReasonMidi',
  platform: 'gameHud.vocalFilterReasonPlatform',
  crossorigin: 'gameHud.vocalFilterReasonCrossOrigin',
  native: 'gameHud.vocalFilterReasonNative',
};

export function AudioEffectsPanel({
  show,
  audioEffects,
  reverbAmount,
  echoAmount,
  onReverbChange,
  onEchoChange,
  onApplyPreset,
  vocalFilterAmount,
  onVocalFilterChange,
  vocalFilterUnsupportedReason,
  voiceFx,
  onVoiceFxChange,
  voiceFxAvailable,
}: AudioEffectsPanelProps) {
  const { t } = useTranslation();

  if (!show) return null;

  const vocalFilterUnavailable = vocalFilterUnsupportedReason !== null;
  const vocalFilterLabel = vocalFilterUnavailable
    ? t('gameHud.vocalFilterUnavailable')
    : vocalFilterAmount <= 0
      ? t('gameHud.vocalFilterOff')
      : t('gameHud.vocalFilter').replace('{n}', String(Math.round(vocalFilterAmount * 100)));
  const vocalFilterTooltip = vocalFilterUnavailable
    ? t(VOCAL_FILTER_REASON_KEYS[vocalFilterUnsupportedReason])
    : undefined;

  return (
    <div className="fixed bottom-60 right-4 z-30 w-80 max-h-[70vh] overflow-y-auto bg-gray-800/95 rounded-xl p-4 border border-white/20" data-testid="audio-effects-panel">
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
        {/* Vocal filter (Gesangsfilter) — karaoke-style center-channel
            cancellation (L−R) on the song's <audio> element. Disabled with a
            hint when the medium cannot be filtered (platform audio / MIDI
            synth / cross-origin / native audio output). */}
        <div title={vocalFilterTooltip}>
          <span className={`text-xs block ${vocalFilterUnavailable ? 'text-white/40' : 'text-white/60'}`}>
            {vocalFilterLabel}
          </span>
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(vocalFilterAmount * 100)}
            onChange={(e) => {
              const val = parseInt(e.target.value) / 100;
              onVocalFilterChange(val);
            }}
            disabled={vocalFilterUnavailable}
            className={`w-full accent-rose-500 ${vocalFilterUnavailable ? 'opacity-40 cursor-not-allowed' : ''}`}
            data-testid="game-hud-vocal-filter-slider"
            aria-label={t('gameHud.vocalFilterLabel')}
            title={vocalFilterTooltip}
          />
          {vocalFilterUnavailable && (
            <p className="text-[10px] text-white/40 mt-0.5" data-testid="game-hud-vocal-filter-unavailable">
              {t('gameHud.vocalFilterUnavailableShort')}
            </p>
          )}
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
        {/* ── Voice FX Studio (feature idea #16): pitch correction,
            harmonizer, character effects. Hidden when AudioWorklets are
            unavailable in this runtime. ── */}
        {voiceFxAvailable && (
          <div className="pt-2 border-t border-white/10 space-y-3" data-testid="voice-fx-studio">
            <span className="text-xs font-medium text-cyan-300 block">🎛️ {t('gameHud.voiceFxTitle')}</span>

            {/* Character FX modes */}
            <div>
              <span className="text-xs text-white/60 mb-1 block">{t('gameHud.voiceFxMode')}</span>
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => onVoiceFxChange({ mode: 'off' })}
                  className={`px-2 py-1 text-xs rounded-md border transition-all ${voiceFx.mode === 'off' ? 'bg-cyan-500/30 border-cyan-400 text-white' : 'bg-white/10 border-white/10 text-white/70 hover:bg-white/20'}`}
                  data-testid="voice-fx-mode-off"
                >
                  ⬜ {t('gameHud.voiceFxOff')}
                </button>
                {VOICE_FX_MODES.map(({ id, emoji, labelKey }) => (
                  <button
                    key={id}
                    onClick={() => onVoiceFxChange({ mode: id })}
                    className={`px-2 py-1 text-xs rounded-md border transition-all ${voiceFx.mode === id ? 'bg-cyan-500/30 border-cyan-400 text-white' : 'bg-white/10 border-white/10 text-white/70 hover:bg-white/20'}`}
                    data-testid={`voice-fx-mode-${id}`}
                  >
                    {emoji} {t(labelKey)}
                  </button>
                ))}
              </div>
            </div>

            {/* FX intensity */}
            {voiceFx.mode !== 'off' && (
              <div>
                <span className="text-xs text-white/60">{t('gameHud.voiceFxMix').replace('{n}', String(Math.round(voiceFx.fxMix * 100)))}</span>
                <input
                  type="range" min="0" max="100" value={Math.round(voiceFx.fxMix * 100)}
                  onChange={(e) => onVoiceFxChange({ fxMix: parseInt(e.target.value) / 100 })}
                  className="w-full accent-cyan-500"
                  data-testid="voice-fx-mix-slider"
                  aria-label={t('gameHud.voiceFxMix')}
                />
              </div>
            )}

            {/* Harmonizer */}
            <div>
              <span className="text-xs text-white/60">
                {voiceFx.harmonyInterval === 0
                  ? t('gameHud.voiceFxHarmonyOff')
                  : t('gameHud.voiceFxHarmony').replace('{n}', String(voiceFx.harmonyInterval))}
              </span>
              <input
                type="range" min="-12" max="12" value={voiceFx.harmonyInterval}
                onChange={(e) => onVoiceFxChange({ harmonyInterval: parseInt(e.target.value) })}
                className="w-full accent-purple-500"
                data-testid="voice-fx-harmony-slider"
                aria-label={t('gameHud.voiceFxHarmony')}
              />
              {voiceFx.harmonyInterval !== 0 && (
                <div>
                  <span className="text-xs text-white/50">{t('gameHud.voiceFxHarmonyLevel').replace('{n}', String(Math.round(voiceFx.harmonyMix * 100)))}</span>
                  <input
                    type="range" min="0" max="100" value={Math.round(voiceFx.harmonyMix * 100)}
                    onChange={(e) => onVoiceFxChange({ harmonyMix: parseInt(e.target.value) / 100 })}
                    className="w-full accent-purple-400"
                    data-testid="voice-fx-harmony-mix-slider"
                    aria-label={t('gameHud.voiceFxHarmonyLevel')}
                  />
                </div>
              )}
            </div>

            {/* Pitch correction */}
            <div>
              <span className="text-xs text-white/60">{t('gameHud.voiceFxCorrection').replace('{n}', String(Math.round(voiceFx.correctionStrength * 100)))}</span>
              <input
                type="range" min="0" max="100" value={Math.round(voiceFx.correctionStrength * 100)}
                onChange={(e) => onVoiceFxChange({ correctionStrength: parseInt(e.target.value) / 100 })}
                className="w-full accent-rose-400"
                data-testid="voice-fx-correction-slider"
                aria-label={t('gameHud.voiceFxCorrection')}
              />
              <p className="text-[10px] text-white/40 mt-0.5">{t('gameHud.voiceFxHint')}</p>
            </div>
          </div>
        )}
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
