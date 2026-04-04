'use client';

import React from 'react';
import type { AudioEffectsEngine } from '@/lib/audio/audio-effects';

// ===================== VOLUME METER =====================

interface VolumeMeterProps {
  volume: number;
}

export function VolumeMeter({ volume }: VolumeMeterProps) {
  return (
    <div className="absolute top-16 right-4 z-20">
      <div className="w-3 h-24 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
        <div
          className="w-full bg-gradient-to-t from-green-500 via-yellow-500 to-red-500 transition-all duration-75"
          style={{ height: `${volume * 100}%`, marginTop: `${(1 - volume) * 100}%` }}
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
  return (
    <button
      onClick={onClick}
      className="fixed bottom-24 right-4 z-30 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
      title="Audio Effects"
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
  onReverbChange: (val: number) => void;
  onEchoChange: (val: number) => void;
}

export function AudioEffectsPanel({
  show,
  audioEffects,
  reverbAmount,
  echoAmount,
  onReverbChange,
  onEchoChange,
}: AudioEffectsPanelProps) {
  if (!show) return null;

  return (
    <div className="fixed bottom-40 right-4 z-30 w-72 bg-gray-800/95 rounded-xl p-4 border border-white/20">
      <h4 className="font-semibold mb-3">Audio Effects</h4>
      <div className="space-y-3">
        <div>
          <span className="text-xs text-white/60">Reverb: {Math.round(reverbAmount * 100)}%</span>
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
          />
        </div>
        <div>
          <span className="text-xs text-white/60">Echo: {Math.round(echoAmount * 100)}%</span>
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
          />
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
  if (!isAdPlaying) return null;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40">
      <div className="bg-black/80 backdrop-blur-sm px-6 py-3 rounded-full border border-yellow-500/50 flex items-center gap-3">
        <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse" />
        <span className="text-yellow-400 font-medium">Werbung läuft</span>
        <span className="text-white/60">-</span>
        <span className="text-white/80">Spiel pausiert</span>
        {adCountdown > 0 && (
          <>
            <span className="text-white/60">-</span>
            <span className="text-cyan-400 font-bold">{adCountdown}s</span>
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
    <div className="absolute bottom-0 left-0 right-0 z-20 h-1 bg-white/10">
      <div
        className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
        style={{ width: `${(currentTime / safeDuration) * 100}%` }}
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
