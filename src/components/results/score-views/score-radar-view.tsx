'use client';

import React from 'react';

interface ScoreRadarViewProps {
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

export function ScoreRadarView({
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
}: ScoreRadarViewProps) {
  const percentage = (score / maxScore) * 100;
  const player2Percentage = player2Score ? (player2Score / maxScore) * 100 : 0;

  return (
    <div className="flex flex-col items-center py-4">
      <svg viewBox="0 0 200 200" className="w-64 h-64">
        {/* Background circles */}
        {[0.2, 0.4, 0.6, 0.8, 1].map((r, i) => (
          <polygon
            key={i}
            points={Array.from({ length: 5 }, (_, j) => {
              const angle = (j * 72 - 90) * (Math.PI / 180);
              return `${100 + r * 70 * Math.cos(angle)},${100 + r * 70 * Math.sin(angle)}`;
            }).join(' ')}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="1"
          />
        ))}

        {/* Axis lines */}
        {Array.from({ length: 5 }, (_, i) => {
          const angle = (i * 72 - 90) * (Math.PI / 180);
          return (
            <line
              key={i}
              x1="100"
              y1="100"
              x2={100 + 70 * Math.cos(angle)}
              y2={100 + 70 * Math.sin(angle)}
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="1"
            />
          );
        })}

        {/* Data polygon - Player 1 */}
        <polygon
          points={[
            { label: 'Score', value: percentage / 100 },
            { label: 'Accuracy', value: accuracy / 100 },
            { label: 'Combo', value: Math.min(1, maxCombo / Math.max(notesHit, 1)) },
            { label: 'Consistency', value: notesHit + notesMissed > 0 ? notesHit / (notesHit + notesMissed) : 0 },
            { label: 'Rating', value: rating === 'perfect' ? 1 : rating === 'excellent' ? 0.8 : rating === 'good' ? 0.6 : rating === 'okay' ? 0.4 : 0.2 },
          ].map((d, i) => {
            const angle = (i * 72 - 90) * (Math.PI / 180);
            return `${100 + d.value * 70 * Math.cos(angle)},${100 + d.value * 70 * Math.sin(angle)}`;
          }).join(' ')}
          fill="rgba(6, 182, 212, 0.3)"
          stroke="rgba(6, 182, 212, 0.8)"
          strokeWidth="2"
        />

        {/* Player 2 polygon (if duel) */}
        {isDuel && player2Score !== undefined && (
          <polygon
            points={[
              { value: player2Percentage / 100 },
              { value: (player2Accuracy || 0) / 100 },
              { value: Math.min(1, (player2MaxCombo || 0) / Math.max(player2NotesHit || 1, 1)) },
              { value: (player2NotesHit || 0) + (player2NotesMissed || 0) > 0 ? (player2NotesHit || 0) / ((player2NotesHit || 0) + (player2NotesMissed || 0)) : 0 },
              { value: player2Rating === 'perfect' ? 1 : player2Rating === 'excellent' ? 0.8 : player2Rating === 'good' ? 0.6 : player2Rating === 'okay' ? 0.4 : 0.2 },
            ].map((d, i) => {
              const angle = (i * 72 - 90) * (Math.PI / 180);
              return `${100 + d.value * 70 * Math.cos(angle)},${100 + d.value * 70 * Math.sin(angle)}`;
            }).join(' ')}
            fill="rgba(236, 72, 153, 0.2)"
            stroke="rgba(236, 72, 153, 0.6)"
            strokeWidth="2"
          />
        )}

        {/* Labels */}
        {['Score', 'Accuracy', 'Combo', 'Consistency', 'Rating'].map((label, i) => {
          const angle = (i * 72 - 90) * (Math.PI / 180);
          return (
            <text
              key={label}
              x={100 + 85 * Math.cos(angle)}
              y={100 + 85 * Math.sin(angle)}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-white/60 text-xs"
            >
              {label}
            </text>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex gap-4 mt-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-cyan-500" />
          <span className="text-xs text-white/60">Player 1</span>
        </div>
        {isDuel && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-pink-500" />
            <span className="text-xs text-white/60">Player 2</span>
          </div>
        )}
      </div>
    </div>
  );
}
