'use client';

import React from 'react';
import { Difficulty } from '@/types/game';

interface DifficultySelectorProps {
  difficulty: Difficulty;
  onChange: (difficulty: Difficulty) => void;
}

export function DifficultySelector({ difficulty, onChange }: DifficultySelectorProps) {
  const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];

  return (
    <div>
      <label className="text-sm text-white/60 mb-2 block">Difficulty</label>
      <div className="grid grid-cols-3 gap-2">
        {difficulties.map((diff) => (
          <button
            key={diff}
            onClick={() => onChange(diff)}
            className={`py-3 rounded-lg font-medium transition-all ${
              difficulty === diff
                ? diff === 'easy' ? 'bg-green-500 text-white'
                  : diff === 'medium' ? 'bg-yellow-500 text-black'
                  : 'bg-red-500 text-white'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <div className="text-sm font-bold">{diff.charAt(0).toUpperCase() + diff.slice(1)}</div>
            <div className="text-xs opacity-70">
              {diff === 'easy' ? '±2 Tones' : diff === 'medium' ? '±1 Tone' : 'Exact'}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
