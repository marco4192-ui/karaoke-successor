'use client';

import React from 'react';

interface ScoreBarometerViewProps {
  score: number;
  maxScore: number;
  accuracy: number;
  notesHit: number;
  notesMissed: number;
  maxCombo: number;
  rating: string;
  player2Score?: number;
  player2Accuracy?: number;
  player2MaxCombo?: number;
  isDuel?: boolean;
}

export function ScoreBarometerView({
  score,
  maxScore,
  accuracy,
  notesHit,
  notesMissed,
  maxCombo,
  rating,
  player2Score,
  player2Accuracy,
  player2MaxCombo,
  isDuel,
}: ScoreBarometerViewProps) {
  const percentage = (score / maxScore) * 100;

  return (
    <div className="space-y-6">
      {/* Main Score Barometer */}
      <div className="relative">
        <div className="text-center mb-4">
          <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
            {score.toLocaleString()}
          </span>
          <span className="text-white/40 ml-2">/ {maxScore.toLocaleString()}</span>
        </div>

        {/* Thermometer-style barometer */}
        <div className="relative h-12 bg-gradient-to-r from-red-500/30 via-yellow-500/30 via-green-500/30 to-cyan-500/30 rounded-full overflow-hidden border border-white/20">
          {/* Score marker */}
          <div
            className="absolute top-0 bottom-0 bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-1000 flex items-center justify-end pr-2"
            style={{ width: `${Math.min(100, percentage)}%` }}
          >
            {percentage > 20 && (
              <span className="text-white font-bold text-sm">{percentage.toFixed(1)}%</span>
            )}
          </div>

          {/* Grade markers */}
          <div className="absolute inset-0 flex items-center pointer-events-none">
            <div className="w-1/5 border-r border-white/20 h-full" />
            <div className="w-1/5 border-r border-white/20 h-full" />
            <div className="w-1/5 border-r border-white/20 h-full" />
            <div className="w-1/5 border-r border-white/20 h-full" />
          </div>
        </div>

        {/* Grade labels */}
        <div className="flex justify-between text-xs text-white/40 mt-1">
          <span>0</span>
          <span className="text-red-400">Poor</span>
          <span className="text-orange-400">Okay</span>
          <span className="text-blue-400">Good</span>
          <span className="text-green-400">Excellent</span>
          <span className="text-yellow-400">Perfect</span>
        </div>
      </div>

      {/* Duel Comparison */}
      {isDuel && player2Score !== undefined && (
        <div className="mt-6 pt-4 border-t border-white/10">
          <h4 className="text-sm font-semibold mb-3 text-center">⚔️ Duel Comparison</h4>
          <div className="grid grid-cols-2 gap-4">
            {/* Player 1 */}
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-cyan-500 flex items-center justify-center mx-auto mb-2 font-bold">P1</div>
              <div className="text-2xl font-bold text-cyan-400">{score.toLocaleString()}</div>
              <div className="text-xs text-white/40">{accuracy.toFixed(1)}% accuracy</div>
              <div className="text-xs text-white/40">{maxCombo}x max combo</div>
            </div>
            {/* Player 2 */}
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-pink-500 flex items-center justify-center mx-auto mb-2 font-bold">P2</div>
              <div className="text-2xl font-bold text-pink-400">{player2Score.toLocaleString()}</div>
              <div className="text-xs text-white/40">{player2Accuracy?.toFixed(1)}% accuracy</div>
              <div className="text-xs text-white/40">{player2MaxCombo}x max combo</div>
            </div>
          </div>
          {/* Win indicator */}
          <div className="mt-4 text-center">
            <span className={`px-4 py-1 rounded-full text-sm font-bold ${
              score > player2Score ? 'bg-cyan-500/30 text-cyan-300' :
              score < player2Score ? 'bg-pink-500/30 text-pink-300' :
              'bg-purple-500/30 text-purple-300'
            }`}>
              {score > player2Score ? '🏆 P1 WINS!' : score < player2Score ? '🏆 P2 WINS!' : '🤝 DRAW!'}
            </span>
          </div>
        </div>
      )}

      {/* Sub-statistics barometer */}
      <div className="grid grid-cols-3 gap-4 mt-4">
        <div>
          <div className="text-xs text-white/40 mb-1">Notes Hit</div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-green-500" style={{ width: `${notesHit + notesMissed > 0 ? (notesHit / (notesHit + notesMissed)) * 100 : 0}%` }} />
          </div>
          <div className="text-xs text-green-400 mt-1">{notesHit} / {notesHit + notesMissed}</div>
        </div>
        <div>
          <div className="text-xs text-white/40 mb-1">Accuracy</div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-cyan-500" style={{ width: `${accuracy}%` }} />
          </div>
          <div className="text-xs text-cyan-400 mt-1">{accuracy.toFixed(1)}%</div>
        </div>
        <div>
          <div className="text-xs text-white/40 mb-1">Max Combo</div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-purple-500" style={{ width: `${Math.min(100, (maxCombo / Math.max(notesHit, 1)) * 100)}%` }} />
          </div>
          <div className="text-xs text-purple-400 mt-1">{maxCombo}x</div>
        </div>
      </div>
    </div>
  );
}
