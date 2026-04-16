'use client';

import React, { useCallback } from 'react';
import { PracticeModeConfig, PLAYBACK_RATES } from '@/lib/game/practice-mode';

export interface PracticePanelProps {
  practiceMode: PracticeModeConfig;
  showControls: boolean;
  loopCount: number;
  currentTimeMs: number;
  onToggleControls: () => void;
  onPracticeModeChange: (config: Partial<PracticeModeConfig>) => void;
  onSetLoopStart: () => number;
  onSetLoopEnd: () => number;
  onResetLoopCount: () => void;
}

function formatTime(ms: number): string {
  const sec = Math.floor(ms / 1000);
  const min = Math.floor(sec / 60);
  const s = sec % 60;
  return `${min}:${s.toString().padStart(2, '0')}`;
}

export function PracticePanel({
  practiceMode,
  showControls,
  loopCount,
  currentTimeMs,
  onToggleControls,
  onPracticeModeChange,
  onSetLoopStart,
  onSetLoopEnd,
  onResetLoopCount,
}: PracticePanelProps) {
  const handleSetLoopStart = useCallback(() => {
    const ms = onSetLoopStart();
    onPracticeModeChange({ loopStart: ms, loopEnabled: true });
    onResetLoopCount();
  }, [onSetLoopStart, onPracticeModeChange, onResetLoopCount]);

  const handleSetLoopEnd = useCallback(() => {
    const ms = onSetLoopEnd();
    onPracticeModeChange({ loopEnd: ms, loopEnabled: true });
    onResetLoopCount();
  }, [onSetLoopEnd, onPracticeModeChange, onResetLoopCount]);

  const handleClearLoop = useCallback(() => {
    onPracticeModeChange({ loopStart: null, loopEnd: null, loopEnabled: false });
    onResetLoopCount();
  }, [onPracticeModeChange, onResetLoopCount]);

  const handlePlaybackRateSelect = useCallback(
    (rate: number) => {
      onPracticeModeChange({ playbackRate: rate });
    },
    [onPracticeModeChange]
  );

  return (
    <>
      {/* Practice Mode Toggle Button */}
      <button
        onClick={onToggleControls}
        className={`fixed bottom-24 left-4 z-30 w-12 h-12 rounded-full flex items-center justify-center transition-all ${
          practiceMode.enabled
            ? 'bg-purple-500 ring-2 ring-purple-300'
            : 'bg-white/10 hover:bg-white/20'
        }`}
        title="Practice Mode"
      >
        🎯
      </button>

      {/* Practice Controls Panel */}
      {showControls && (
        <div className="fixed bottom-40 left-4 z-30 w-80 bg-gray-800/95 rounded-xl p-4 border border-white/20 max-h-[70vh] overflow-y-auto">
          <h4 className="font-semibold mb-3">Practice Mode</h4>
          <div className="space-y-4">
            {/* ── Enable ── */}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={practiceMode.enabled}
                onChange={(e) =>
                  onPracticeModeChange({ enabled: e.target.checked })
                }
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">Enable Practice Mode</span>
            </label>

            {/* ── Playback Speed (preset buttons + fine slider) ── */}
            {practiceMode.enabled && (
              <div>
                <span className="text-xs text-white/60 block mb-1">
                  Playback Speed: {Math.round(practiceMode.playbackRate * 100)}%
                </span>
                <div className="flex flex-wrap gap-1 mb-1">
                  {PLAYBACK_RATES.map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => handlePlaybackRateSelect(preset.value)}
                      className={`px-2 py-0.5 text-xs rounded transition-colors ${
                        Math.abs(practiceMode.playbackRate - preset.value) < 0.01
                          ? 'bg-purple-500 text-white'
                          : 'bg-white/10 hover:bg-white/20 text-white/80'
                      }`}
                      title={preset.description}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.05"
                  value={practiceMode.playbackRate}
                  onChange={(e) =>
                    onPracticeModeChange({ playbackRate: parseFloat(e.target.value) })
                  }
                  className="w-full accent-purple-500"
                />
              </div>
            )}

            {/* ── Loop Region ── */}
            {practiceMode.enabled && (
              <div className="border-t border-white/10 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-white/80">Loop Region</span>
                  {practiceMode.loopEnabled && loopCount > 0 && (
                    <span className="text-xs text-purple-300">
                      Loops: {loopCount}
                    </span>
                  )}
                </div>
                <div className="flex gap-1 mb-1">
                  <button
                    onClick={handleSetLoopStart}
                    className="flex-1 px-2 py-1 text-xs bg-white/10 hover:bg-white/20 rounded transition-colors"
                    title="Set loop start at current position"
                  >
                    {practiceMode.loopStart !== null
                      ? `Start: ${formatTime(practiceMode.loopStart)}`
                      : 'Set Start'}
                  </button>
                  <button
                    onClick={handleSetLoopEnd}
                    className="flex-1 px-2 py-1 text-xs bg-white/10 hover:bg-white/20 rounded transition-colors"
                    title="Set loop end at current position"
                  >
                    {practiceMode.loopEnd !== null
                      ? `End: ${formatTime(practiceMode.loopEnd)}`
                      : 'Set End'}
                  </button>
                </div>
                {(practiceMode.loopStart !== null || practiceMode.loopEnd !== null) && (
                  <button
                    onClick={handleClearLoop}
                    className="w-full px-2 py-1 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded transition-colors"
                  >
                    Clear Loop
                  </button>
                )}
              </div>
            )}

            {/* ── Auto-Play Notes ── */}
            {practiceMode.enabled && (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={practiceMode.autoPlayEnabled}
                  onChange={(e) =>
                    onPracticeModeChange({ autoPlayEnabled: e.target.checked })
                  }
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">Auto-Play Notes</span>
              </label>
            )}

            {/* ── Pitch Guide ── */}
            {practiceMode.enabled && (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={practiceMode.pitchGuideEnabled}
                  onChange={(e) =>
                    onPracticeModeChange({ pitchGuideEnabled: e.target.checked })
                  }
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">Pitch Guide</span>
              </label>
            )}

            {/* ── Visual Aids ── */}
            {practiceMode.enabled && (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={practiceMode.visualAidsEnabled}
                  onChange={(e) =>
                    onPracticeModeChange({ visualAidsEnabled: e.target.checked })
                  }
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">Visual Aids</span>
              </label>
            )}
          </div>
        </div>
      )}
    </>
  );
}
