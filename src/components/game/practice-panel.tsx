'use client';

import React from 'react';
import { PracticeModeConfig } from '@/lib/game/practice-mode';

export interface PracticePanelProps {
  practiceMode: PracticeModeConfig;
  showControls: boolean;
  onToggleControls: () => void;
  onPracticeModeChange: (config: Partial<PracticeModeConfig>) => void;
  timingOffset?: number;
  onTimingOffsetChange?: (offset: number) => void;
}

export function PracticePanel({
  practiceMode,
  showControls,
  onToggleControls,
  onPracticeModeChange,
  timingOffset = 0,
  onTimingOffsetChange,
}: PracticePanelProps) {
  return (
    <>
      {/* Practice Mode Button */}
      <button
        onClick={onToggleControls}
        className={`fixed bottom-24 left-4 z-30 w-12 h-12 rounded-full flex items-center justify-center transition-all ${
          practiceMode.enabled
            ? 'bg-purple-500 ring-2 ring-purple-300'
            : 'bg-white/10 hover:bg-white/20'
        }`}
        title="Practice Mode & Settings"
      >
        ⚙️
      </button>

      {/* Practice Controls Panel */}
      {showControls && (
        <div className="fixed bottom-40 left-4 z-30 w-72 bg-gray-800/95 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-xl">
          <h4 className="font-semibold mb-3 text-white">Game Settings</h4>
          <div className="space-y-4">
            {/* Practice Mode */}
            <div className="border-b border-white/10 pb-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={practiceMode.enabled}
                  onChange={(e) =>
                    onPracticeModeChange({ enabled: e.target.checked })
                  }
                  className="w-4 h-4 rounded accent-purple-500"
                />
                <span className="text-sm">Practice Mode</span>
              </label>
            </div>
            
            {/* Playback Speed */}
            {practiceMode.enabled && (
              <div>
                <span className="text-xs text-white/60">
                  Playback Speed: {Math.round(practiceMode.playbackRate * 100)}%
                </span>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.05"
                  value={practiceMode.playbackRate}
                  onChange={(e) =>
                    onPracticeModeChange({ playbackRate: parseFloat(e.target.value) })
                  }
                  className="w-full accent-purple-500 mt-1"
                />
              </div>
            )}
            
            {/* Timing Offset */}
            {onTimingOffsetChange && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-white/60">Timing Offset</span>
                  <span className="text-xs font-mono text-cyan-400">
                    {timingOffset > 0 ? '+' : ''}{timingOffset}ms
                  </span>
                </div>
                <input
                  type="range"
                  min="-500"
                  max="500"
                  step="10"
                  value={timingOffset}
                  onChange={(e) =>
                    onTimingOffsetChange(parseInt(e.target.value, 10))
                  }
                  className="w-full accent-cyan-500"
                />
                <div className="flex justify-between text-xs text-white/40 mt-1">
                  <span>-500ms</span>
                  <span>0</span>
                  <span>+500ms</span>
                </div>
                <p className="text-xs text-white/40 mt-2">
                  Adjust if notes appear too early or late
                </p>
              </div>
            )}
            
            {/* Pitch Guide */}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={practiceMode.pitchGuideEnabled}
                onChange={(e) =>
                  onPracticeModeChange({ pitchGuideEnabled: e.target.checked })
                }
                className="w-4 h-4 rounded accent-purple-500"
              />
              <span className="text-sm">Pitch Guide</span>
            </label>
          </div>
        </div>
      )}
    </>
  );
}
