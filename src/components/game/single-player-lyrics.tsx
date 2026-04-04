'use client';

import React, { useMemo } from 'react';
import { LyricLine } from '@/types/game';
import { LyricLineDisplay } from './lyric-line-display';

// ===================== TYPES =====================

export interface SinglePlayerLyricsProps {
  /** Sorted lyric lines */
  sortedLines: LyricLine[];
  /** Current game time in milliseconds */
  currentTime: number;
  /** Player color for styling */
  playerColor?: string;
  /** Note display style from settings */
  noteDisplayStyle?: 'classic' | 'fill-level' | 'color-feedback' | 'glow-intensity';
  /** Note performance for visual feedback */
  notePerformance?: Map<string, Array<{ time: number; accuracy: number; hit: boolean }>>;
  /** Game mode */
  gameMode?: string;
  /** Missing words indices for missing-words mode */
  missingWordsIndices?: number[];
  /** Is blind section for blind mode */
  isBlindSection?: boolean;
  /** Preview time in milliseconds (how early to show next line) */
  previewTime?: number;
}

// ===================== MAIN COMPONENT =====================

export function SinglePlayerLyrics({
  sortedLines,
  currentTime,
  playerColor = '#22d3ee',
  noteDisplayStyle = 'classic',
  notePerformance = new Map(),
  gameMode = 'standard',
  missingWordsIndices = [],
  isBlindSection = false,
  previewTime = 2000,
}: SinglePlayerLyricsProps) {
  // Find current and next lines
  const { currentLine, nextLine, timeUntilSing, isSinging, isFlying } = useMemo(() => {
    // Find current line
    let currentLine = sortedLines.find(line =>
      currentTime >= line.startTime && currentTime <= line.endTime
    );

    // If no current line, find the next upcoming line within preview window
    if (!currentLine) {
      for (const line of sortedLines) {
        if (currentTime >= line.startTime - previewTime && currentTime < line.startTime) {
          currentLine = line;
          break;
        }
      }
    }

    if (!currentLine) {
      return { currentLine: null, nextLine: null, timeUntilSing: 0, isSinging: false, isFlying: false };
    }

    // Calculate timing
    const timeUntilSing = currentLine.startTime - currentTime;
    const isSinging = currentTime >= currentLine.startTime;
    const isFlying = !isSinging && timeUntilSing > 0 && timeUntilSing < previewTime;

    // Find next line
    const currentLineIndex = sortedLines.findIndex(line => line === currentLine);
    const nextLine = currentLineIndex >= 0 ? sortedLines[currentLineIndex + 1] : null;

    return { currentLine, nextLine, timeUntilSing, isSinging, isFlying };
  }, [sortedLines, currentTime, previewTime]);

  if (!currentLine) return null;

  // Calculate flying animation progress
  const flyProgress = isFlying ? Math.max(0, Math.min(1, 1 - (timeUntilSing / previewTime))) : 0;

  // Get the first word of the line for the marker target
  const firstNote = currentLine.notes[0];
  const firstWord = firstNote?.lyric?.trim() || '';

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20">
      <div className="bg-gradient-to-t from-black/80 to-transparent p-6">
        <div className="text-2xl md:text-3xl font-bold text-center drop-shadow-lg relative w-full">
          {/* Flying Line Indicator - Moves from left edge to first word */}
          {isFlying && (
            <div
              className="absolute top-1/2 flex items-center pointer-events-none"
              style={{
                left: `${5 + flyProgress * 40}%`,
                transform: 'translateY(-50%)',
                opacity: 0.5 + flyProgress * 0.5,
                zIndex: 100,
              }}
            >
              <div
                className="rounded-full flex items-center justify-center"
                style={{
                  width: `${12 + flyProgress * 8}px`,
                  height: `${12 + flyProgress * 8}px`,
                  background: 'radial-gradient(circle, rgba(34, 211, 238, 1) 0%, rgba(34, 211, 238, 0.7) 50%, transparent 100%)',
                  boxShadow: `0 0 ${20 + flyProgress * 40}px rgba(34, 211, 238, ${0.6 + flyProgress * 0.4})`,
                  animation: 'pulse 0.4s ease-in-out infinite',
                }}
              />
              {/* Arrow pointing to the text */}
              <svg
                className="text-cyan-400"
                style={{
                  width: `${16 + flyProgress * 8}px`,
                  height: `${16 + flyProgress * 8}px`,
                  marginLeft: '4px',
                  filter: `drop-shadow(0 0 ${10 + flyProgress * 15}px rgba(34, 211, 238, 0.9))`,
                }}
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
              {/* Show the first word as a label during flight */}
              <span
                className="ml-2 text-cyan-400 font-bold"
                style={{
                  fontSize: `${14 + flyProgress * 6}px`,
                  textShadow: `0 0 ${10 + flyProgress * 10}px rgba(34, 211, 238, 0.9)`,
                  whiteSpace: 'nowrap',
                }}
              >
                {firstWord}
              </span>
            </div>
          )}

          {/* Pulsing indicator during singing - directly before the text */}
          {isSinging && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2">
              <div
                className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse"
                style={{ boxShadow: '0 0 15px rgba(34, 211, 238, 0.8)' }}
              />
            </div>
          )}

          {/* Current lyrics */}
          <LyricLineDisplay
            line={currentLine}
            currentTime={currentTime}
            playerColor={playerColor}
            noteDisplayStyle={noteDisplayStyle}
            notePerformance={notePerformance}
            gameMode={gameMode as 'standard' | 'missing-words' | 'duel' | 'blind' | 'duet'}
            missingWordsIndices={missingWordsIndices}
            isBlindSection={isBlindSection}
          />
        </div>

        {/* Next Line Preview */}
        {nextLine && (
          <p className="text-base md:text-lg text-center text-white/40 mt-3" style={{ whiteSpace: 'pre-wrap' }}>
            {nextLine.notes.map(n => n.lyric).join('')}
          </p>
        )}
      </div>
    </div>
  );
}

export default SinglePlayerLyrics;
