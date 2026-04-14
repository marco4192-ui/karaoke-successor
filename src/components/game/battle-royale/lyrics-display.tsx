'use client';

import React from 'react';
import { LyricLine } from '@/types/game';

export function LyricsDisplay({ lyrics, currentTime }: { lyrics: LyricLine[]; currentTime: number }) {
  // Find current line
  const currentLineIndex = lyrics.findIndex((line, index) => {
    const nextLine = lyrics[index + 1];
    return currentTime >= line.startTime && (!nextLine || currentTime < nextLine.startTime);
  });

  const currentLine = currentLineIndex >= 0 ? lyrics[currentLineIndex] : null;
  const prevLine = currentLineIndex > 0 ? lyrics[currentLineIndex - 1] : null;
  const nextLine = currentLineIndex >= 0 && currentLineIndex < lyrics.length - 1 ? lyrics[currentLineIndex + 1] : null;

  if (!currentLine) return null;

  return (
    <div className="text-center">
      <div className="text-white/40 text-sm mb-1">{prevLine?.text}</div>
      <div className="text-white text-xl font-bold">{currentLine.text}</div>
      <div className="text-white/40 text-sm mt-1">{nextLine?.text}</div>
    </div>
  );
}
