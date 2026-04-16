'use client';

/**
 * DEAD CODE (Code Review #5, 2026-04-17)
 *
 * This file is not imported by any other file in the project.
 *
 * Possible function: Standalone audio effects control panel UI — sliders for
 * reverb amount, echo amount, and toggle button for enabling/disabling effects.
 * Wraps the AudioEffectsEngine from audio-effects.ts.
 *
 * Currently, audio effects are controlled through the game-screen.tsx's built-in
 * audio effects panel (rendered inline), which uses useGameAudioEffects hook.
 * That hook provides lazy initialization and proper Tauri audio context handling.
 *
 * This component is a simpler, self-contained version that doesn't integrate
 * with the game loop or Tauri audio management.
 *
 * Consider: Could serve as a template if audio effects are ever exposed as a
 * standalone feature (e.g., in a settings screen or practice mode).
 */

import React from 'react';
import { AudioEffectsEngine } from '@/lib/audio/audio-effects';

export interface AudioEffectsPanelProps {
  showPanel: boolean;
  onTogglePanel: () => void;
  reverbAmount: number;
  echoAmount: number;
  onReverbChange: (amount: number) => void;
  onEchoChange: (amount: number) => void;
  audioEffects: AudioEffectsEngine | null;
}

export function AudioEffectsPanel({
  showPanel,
  onTogglePanel,
  reverbAmount,
  echoAmount,
  onReverbChange,
  onEchoChange,
  audioEffects,
}: AudioEffectsPanelProps) {
  return (
    <>
      {/* Audio Effects Button */}
      <button
        onClick={onTogglePanel}
        className="fixed bottom-24 right-4 z-30 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
        title="Audio Effects"
      >
        🎛️
      </button>

      {/* Audio Effects Panel */}
      {showPanel && (
        <div className="fixed bottom-40 right-4 z-30 w-72 bg-gray-800/95 rounded-xl p-4 border border-white/20">
          <h4 className="font-semibold mb-3">Audio Effects</h4>
          <div className="space-y-3">
            <div>
              <span className="text-xs text-white/60">
                Reverb: {Math.round(reverbAmount * 100)}%
              </span>
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
              <span className="text-xs text-white/60">
                Echo: {Math.round(echoAmount * 100)}%
              </span>
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
      )}
    </>
  );
}
