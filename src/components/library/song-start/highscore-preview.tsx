'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Song, HighscoreEntry } from '@/types/game';
import { TrophyIcon } from '@/components/icons';

interface HighscorePreviewProps {
  song: Song;
  highscores: HighscoreEntry[];
  onViewAll: (song: Song) => void;
}

export function HighscorePreview({ song, highscores, onViewAll }: HighscorePreviewProps) {
  const songScores = highscores
    .filter(h => h.songId === song.id)
    .sort((a, b) => b.score - a.score);

  const topScore = songScores[0];

  if (!topScore) {
    return null;
  }

  return (
    <div className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <TrophyIcon className="w-4 h-4 text-yellow-400" />
        <span className="text-sm text-white/60">Your Best:</span>
        <span className="text-sm font-bold text-cyan-400">{topScore.score.toLocaleString()}</span>
        <span className="text-xs text-white/40">({topScore.accuracy.toFixed(1)}%)</span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="text-xs text-purple-400 hover:text-purple-300"
        onClick={() => onViewAll(song)}
      >
        View All →
      </Button>
    </div>
  );
}
