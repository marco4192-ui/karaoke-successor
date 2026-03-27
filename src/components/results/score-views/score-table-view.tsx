'use client';

import React from 'react';

interface ScoreTableViewProps {
  score: number;
  maxScore: number;
  accuracy: number;
  notesHit: number;
  notesMissed: number;
  maxCombo: number;
  rating: string;
  player2Score?: number;
  player2Accuracy?: number;
  player2NotesHit?: number;
  player2NotesMissed?: number;
  player2MaxCombo?: number;
  player2Rating?: string;
  isDuel?: boolean;
}

export function ScoreTableView({
  score,
  maxScore,
  accuracy,
  notesHit,
  notesMissed,
  maxCombo,
  rating,
  player2Score,
  player2Accuracy,
  player2NotesHit,
  player2NotesMissed,
  player2MaxCombo,
  player2Rating,
  isDuel,
}: ScoreTableViewProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10">
            <th className="text-left py-2 px-3 text-white/40 font-normal">Category</th>
            <th className="text-right py-2 px-3 text-white/40 font-normal">Player 1</th>
            {isDuel && <th className="text-right py-2 px-3 text-white/40 font-normal">Player 2</th>}
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-white/5">
            <td className="py-2 px-3">Final Score</td>
            <td className="py-2 px-3 text-right font-bold text-cyan-400">{score.toLocaleString()}</td>
            {isDuel && <td className="py-2 px-3 text-right font-bold text-pink-400">{player2Score?.toLocaleString()}</td>}
          </tr>
          <tr className="border-b border-white/5">
            <td className="py-2 px-3">Max Score</td>
            <td className="py-2 px-3 text-right text-white/60">{maxScore.toLocaleString()}</td>
            {isDuel && <td className="py-2 px-3 text-right text-white/60">{maxScore.toLocaleString()}</td>}
          </tr>
          <tr className="border-b border-white/5">
            <td className="py-2 px-3">Rating</td>
            <td className="py-2 px-3 text-right">
              <span className={`px-2 py-0.5 rounded text-xs ${
                rating === 'perfect' ? 'bg-yellow-500/30 text-yellow-300' :
                rating === 'excellent' ? 'bg-green-500/30 text-green-300' :
                rating === 'good' ? 'bg-blue-500/30 text-blue-300' :
                'bg-white/10 text-white/60'
              }`}>
                {rating.toUpperCase()}
              </span>
            </td>
            {isDuel && <td className="py-2 px-3 text-right">
              <span className={`px-2 py-0.5 rounded text-xs ${
                player2Rating === 'perfect' ? 'bg-yellow-500/30 text-yellow-300' :
                player2Rating === 'excellent' ? 'bg-green-500/30 text-green-300' :
                player2Rating === 'good' ? 'bg-blue-500/30 text-blue-300' :
                'bg-white/10 text-white/60'
              }`}>
                {player2Rating?.toUpperCase()}
              </span>
            </td>}
          </tr>
          <tr className="border-b border-white/5">
            <td className="py-2 px-3">Notes Hit</td>
            <td className="py-2 px-3 text-right text-green-400">{notesHit}</td>
            {isDuel && <td className="py-2 px-3 text-right text-green-400">{player2NotesHit}</td>}
          </tr>
          <tr className="border-b border-white/5">
            <td className="py-2 px-3">Notes Missed</td>
            <td className="py-2 px-3 text-right text-red-400">{notesMissed}</td>
            {isDuel && <td className="py-2 px-3 text-right text-red-400">{player2NotesMissed}</td>}
          </tr>
          <tr className="border-b border-white/5">
            <td className="py-2 px-3">Accuracy</td>
            <td className="py-2 px-3 text-right text-cyan-400">{accuracy.toFixed(1)}%</td>
            {isDuel && <td className="py-2 px-3 text-right text-pink-400">{player2Accuracy?.toFixed(1)}%</td>}
          </tr>
          <tr>
            <td className="py-2 px-3">Max Combo</td>
            <td className="py-2 px-3 text-right text-purple-400">{maxCombo}x</td>
            {isDuel && <td className="py-2 px-3 text-right text-purple-400">{player2MaxCombo}x</td>}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
