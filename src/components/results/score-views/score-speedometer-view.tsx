'use client';

import React from 'react';

interface ScoreSpeedometerViewProps {
  score: number;
  maxScore: number;
  rating: string;
  player2Score?: number;
  isDuel?: boolean;
}

export function ScoreSpeedometerView({
  score,
  maxScore,
  rating,
  player2Score,
  isDuel,
}: ScoreSpeedometerViewProps) {
  const percentage = (score / maxScore) * 100;

  return (
    <div className="flex flex-col items-center py-4">
      <div className="relative w-64 h-32">
        {/* Speedometer background */}
        <svg viewBox="0 0 200 100" className="w-full h-full">
          {/* Background arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="20"
            strokeLinecap="round"
          />
          {/* Colored sections */}
          <path d="M 20 100 A 80 80 0 0 1 60 35" fill="none" stroke="#ef4444" strokeWidth="20" strokeLinecap="round" />
          <path d="M 60 35 A 80 80 0 0 1 100 20" fill="none" stroke="#f97316" strokeWidth="20" strokeLinecap="round" />
          <path d="M 100 20 A 80 80 0 0 1 140 35" fill="none" stroke="#22c55e" strokeWidth="20" strokeLinecap="round" />
          <path d="M 140 35 A 80 80 0 0 1 180 100" fill="none" stroke="#06b6d4" strokeWidth="20" strokeLinecap="round" />

          {/* Needle */}
          <g transform={`rotate(${(percentage / 100) * 180 - 90}, 100, 100)`}>
            <line x1="100" y1="100" x2="100" y2="25" stroke="url(#needleGradient)" strokeWidth="4" strokeLinecap="round" />
            <circle cx="100" cy="100" r="8" fill="white" />
          </g>

          <defs>
            <linearGradient id="needleGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>
        </svg>

        {/* Score display */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
          <div className="text-3xl font-black text-white">{score.toLocaleString()}</div>
          <div className="text-xs text-white/40">/ {maxScore.toLocaleString()}</div>
        </div>
      </div>

      {/* Rating badge */}
      <div className={`mt-4 px-6 py-2 rounded-full font-bold text-lg ${
        rating === 'perfect' ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-black' :
        rating === 'excellent' ? 'bg-gradient-to-r from-green-400 to-cyan-500 text-white' :
        rating === 'good' ? 'bg-gradient-to-r from-blue-400 to-purple-500 text-white' :
        rating === 'okay' ? 'bg-gradient-to-r from-orange-400 to-amber-500 text-white' :
        'bg-gradient-to-r from-red-400 to-red-600 text-white'
      }`}>
        {rating.toUpperCase()}
      </div>

      {/* Duel speedometers */}
      {isDuel && player2Score !== undefined && (
        <div className="mt-6 grid grid-cols-2 gap-8 w-full">
          <div className="text-center">
            <div className="text-sm text-cyan-400 font-semibold">Player 1</div>
            <div className="text-xl font-bold">{score.toLocaleString()}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-pink-400 font-semibold">Player 2</div>
            <div className="text-xl font-bold">{player2Score.toLocaleString()}</div>
          </div>
        </div>
      )}
    </div>
  );
}
