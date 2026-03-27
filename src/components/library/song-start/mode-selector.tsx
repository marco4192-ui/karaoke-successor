'use client';

import React from 'react';
import { GameMode } from '@/types/game';
import { MicIcon } from '@/components/icons';

interface ModeSelectorProps {
  mode: 'single' | 'duel' | 'duet' | GameMode;
  partyMode?: GameMode;
  isDuetSong: boolean;
  onChange: (mode: 'single' | 'duel' | 'duet' | GameMode) => void;
  onPartyModeReset: () => void;
}

export function ModeSelector({
  mode,
  partyMode,
  isDuetSong,
  onChange,
  onPartyModeReset,
}: ModeSelectorProps) {
  if (partyMode) {
    // Show party mode info
    return (
      <div>
        <label className="text-sm text-white/60 mb-2 block">Mode</label>
        <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">
                {partyMode === 'pass-the-mic' ? '🎤' :
                 partyMode === 'companion-singalong' ? '📱' :
                 partyMode === 'medley' ? '🎵' :
                 partyMode === 'missing-words' ? '📝' :
                 partyMode === 'blind' ? '🙈' : '🎮'}
              </span>
              <div>
                <div className="font-bold text-white">
                  {partyMode === 'pass-the-mic' ? 'Pass the Mic' :
                   partyMode === 'companion-singalong' ? 'Companion Sing-A-Long' :
                   partyMode === 'medley' ? 'Medley Contest' :
                   partyMode === 'missing-words' ? 'Missing Words' :
                   partyMode === 'blind' ? 'Blind Karaoke' : partyMode}
                </div>
                <div className="text-xs text-white/60">Party Mode Active</div>
              </div>
            </div>
            {/* Reset button to exit party mode */}
            <button
              onClick={onPartyModeReset}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-all"
              title="Reset to Single Mode"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <label className="text-sm text-white/60 mb-2 block">Mode</label>
      <div className={`grid ${isDuetSong ? 'grid-cols-1' : 'grid-cols-2'} gap-2`}>
        {/* Duet Mode - Only show for duet songs */}
        {isDuetSong ? (
          <button
            onClick={() => onChange('duet')}
            className={`py-3 rounded-lg font-medium transition-all ${
              mode === 'duet'
                ? 'bg-pink-500 text-white'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <span className="text-lg">🎭</span>
            <div className="text-sm">Duet Mode</div>
          </button>
        ) : (
          <>
            <button
              onClick={() => onChange('single')}
              className={`py-3 rounded-lg font-medium transition-all ${
                mode === 'single'
                  ? 'bg-cyan-500 text-white'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <MicIcon className="w-5 h-5 mx-auto mb-1" />
              <div className="text-sm">Single</div>
            </button>
            <button
              onClick={() => onChange('duel')}
              className={`py-3 rounded-lg font-medium transition-all ${
                mode === 'duel'
                  ? 'bg-purple-500 text-white'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <span className="text-lg">⚔️</span>
              <div className="text-sm">Duel</div>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
