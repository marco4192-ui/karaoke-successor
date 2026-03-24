'use client';

import React from 'react';
import { PracticeModeConfig } from '@/lib/game/practice-mode';

export interface PracticePanelProps {
  practiceMode: PracticeModeConfig;
  showControls: boolean;
  onToggleControls: () => void;
  onPracticeModeChange: (config: Partial<PracticeModeConfig>) => void;
}

export function PracticePanel({
  practiceMode,
  showControls,
  onToggleControls,
  onPracticeModeChange,
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
        title="Practice Mode"
      >
        🎯
      </button>

      {/* Practice Controls Panel */}
      {showControls && (
        <div className="fixed bottom-40 left-4 z-30 w-72 bg-gray-800/95 rounded-xl p-4 border border-white/20">
          <h4 className="font-semibold mb-3">Practice Mode</h4>
          <div className="space-y-3">
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
                className="w-full accent-purple-500"
              />
            </div>
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
          </div>
        </div>
      )}
    </>
  );
}
