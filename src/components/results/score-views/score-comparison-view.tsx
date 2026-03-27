'use client';

import React from 'react';

interface ScoreComparisonViewProps {
  score: number;
  accuracy: number;
  notesHit: number;
  maxCombo: number;
  player2Score?: number;
  player2Accuracy?: number;
  player2NotesHit?: number;
  player2MaxCombo?: number;
  isDuel?: boolean;
}

export function ScoreComparisonView({
  score,
  accuracy,
  notesHit,
  maxCombo,
  player2Score,
  player2Accuracy,
  player2NotesHit,
  player2MaxCombo,
  isDuel,
}: ScoreComparisonViewProps) {
  return (
    <div className="space-y-4">
      {/* Score comparison bar */}
      <div>
        <div className="flex justify-between text-xs text-white/40 mb-1">
          <span>Player 1</span>
          <span>Score Battle</span>
          <span>Player 2</span>
        </div>
        <div className="relative h-8 bg-white/5 rounded-full overflow-hidden flex">
          <div
            className="bg-gradient-to-r from-cyan-500 to-cyan-400 flex items-center justify-end pr-2"
            style={{ width: `${score + (player2Score || 0) > 0 ? (score / (score + (player2Score || 1))) * 100 : 50}%` }}
          >
            <span className="text-xs font-bold text-white">{score.toLocaleString()}</span>
          </div>
          <div
            className="bg-gradient-to-l from-pink-500 to-pink-400 flex items-center justify-start pl-2"
            style={{ width: `${score + (player2Score || 0) > 0 ? ((player2Score || 0) / (score + (player2Score || 1))) * 100 : 50}%` }}
          >
            <span className="text-xs font-bold text-white">{player2Score?.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Stat comparison */}
      {isDuel && (
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="space-y-2">
            <div className="text-cyan-400 font-semibold">P1</div>
            <div className={`py-1 rounded ${accuracy > (player2Accuracy || 0) ? 'bg-cyan-500/20 text-cyan-300' : 'bg-white/5 text-white/40'}`}>
              {accuracy.toFixed(1)}%
            </div>
            <div className={`py-1 rounded ${maxCombo > (player2MaxCombo || 0) ? 'bg-cyan-500/20 text-cyan-300' : 'bg-white/5 text-white/40'}`}>
              {maxCombo}x
            </div>
            <div className={`py-1 rounded ${notesHit > (player2NotesHit || 0) ? 'bg-cyan-500/20 text-cyan-300' : 'bg-white/5 text-white/40'}`}>
              {notesHit}
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-white/40 font-semibold">Stat</div>
            <div className="py-1 text-white/60">Accuracy</div>
            <div className="py-1 text-white/60">Combo</div>
            <div className="py-1 text-white/60">Notes</div>
          </div>
          <div className="space-y-2">
            <div className="text-pink-400 font-semibold">P2</div>
            <div className={`py-1 rounded ${(player2Accuracy || 0) > accuracy ? 'bg-pink-500/20 text-pink-300' : 'bg-white/5 text-white/40'}`}>
              {player2Accuracy?.toFixed(1)}%
            </div>
            <div className={`py-1 rounded ${(player2MaxCombo || 0) > maxCombo ? 'bg-pink-500/20 text-pink-300' : 'bg-white/5 text-white/40'}`}>
              {player2MaxCombo}x
            </div>
            <div className={`py-1 rounded ${(player2NotesHit || 0) > notesHit ? 'bg-pink-500/20 text-pink-300' : 'bg-white/5 text-white/40'}`}>
              {player2NotesHit}
            </div>
          </div>
        </div>
      )}

      {/* Winner announcement */}
      <div className="text-center py-4">
        <div className={`inline-block px-6 py-3 rounded-xl ${
          score > (player2Score || 0) ? 'bg-gradient-to-r from-cyan-500/20 to-cyan-400/20 border border-cyan-500/50' :
          score < (player2Score || 0) ? 'bg-gradient-to-r from-pink-500/20 to-pink-400/20 border border-pink-500/50' :
          'bg-gradient-to-r from-purple-500/20 to-purple-400/20 border border-purple-500/50'
        }`}>
          <span className="text-2xl">
            {score > (player2Score || 0) ? '🏆' : score < (player2Score || 0) ? '🏆' : '🤝'}
          </span>
          <span className="ml-2 font-bold">
            {score > (player2Score || 0) ? 'Player 1 Wins!' : score < (player2Score || 0) ? 'Player 2 Wins!' : 'Draw!'}
          </span>
        </div>
      </div>
    </div>
  );
}
