'use client';

import React from 'react';
import { LyricLine } from '@/types/game';

export function LyricsDisplay({ lyrics, currentTime }: { lyrics: LyricLine[]; currentTime: number }) {
  // Empty lyrics guard
  if (!lyrics || lyrics.length === 0) {
    return <div className="text-center text-white/30">No lyrics</div>;
  }

  // Find current line — the one that is currently playing
  let currentLineIndex = lyrics.findIndex((line, index) => {
    const nextLine = lyrics[index + 1];
    return currentTime >= line.startTime && (!nextLine || currentTime < nextLine.startTime);
  });

  // Before first line starts: show first line as upcoming
  if (currentLineIndex < 0 && lyrics.length > 0) {
    currentLineIndex = 0;
  }

  const currentLine = lyrics[currentLineIndex] || null;
  const prevLine = currentLineIndex > 0 ? lyrics[currentLineIndex - 1] : null;
  const nextLine = currentLineIndex >= 0 && currentLineIndex < lyrics.length - 1 ? lyrics[currentLineIndex + 1] : null;

  // Check if we are actually in the current line (before song starts = upcoming)
  const isUpcoming = currentTime < (currentLine?.startTime ?? 0);

  return (
    <div className="text-center">
      {prevLine && (
        <div className="text-white/40 text-sm mb-1">{prevLine.text}</div>
      )}
      <div className={`${isUpcoming ? 'text-white/50 text-lg' : 'text-white text-xl font-bold'}`}>{currentLine?.text}</div>
      {nextLine && (
        <div className="text-white/40 text-sm mt-1">{nextLine.text}</div>
      )}
    </div>
  );
}
