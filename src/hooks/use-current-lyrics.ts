'use client';

import { useMemo } from 'react';
import { LyricLine } from '@/types/game';

// Timing data structure (subset used by lyrics)
export interface TimingDataForLyrics {
  sortedLines: LyricLine[];
  p1Lines?: LyricLine[];
  p2Lines?: LyricLine[];
}

// Lyrics display state
export interface LyricsDisplayState {
  currentLine: LyricLine | null;
  nextLine: LyricLine | null;
  isSinging: boolean;
  timeUntilSing: number;
  flyProgress: number;
  isFlying: boolean;
  firstWord: string;
}

// Hook options
export interface UseCurrentLyricsOptions {
  currentTime: number;
  timingData: TimingDataForLyrics | null;
  previewTime?: number; // Default: 2000ms
  playerMode?: 'all' | 'P1' | 'P2'; // For duet mode
}

/**
 * Custom hook for finding current and next lyrics lines
 * Handles the timing logic for lyrics display and animations
 */
export function useCurrentLyrics(options: UseCurrentLyricsOptions): LyricsDisplayState {
  const { currentTime, timingData, previewTime = 2000, playerMode = 'all' } = options;

  return useMemo(() => {
    // Default empty state
    const emptyState: LyricsDisplayState = {
      currentLine: null,
      nextLine: null,
      isSinging: false,
      timeUntilSing: 0,
      flyProgress: 0,
      isFlying: false,
      firstWord: '',
    };

    if (!timingData) return emptyState;

    // Select the appropriate lines based on player mode
    let lines: LyricLine[];
    if (playerMode === 'P1' && timingData.p1Lines) {
      lines = timingData.p1Lines;
    } else if (playerMode === 'P2' && timingData.p2Lines) {
      lines = timingData.p2Lines;
    } else {
      lines = timingData.sortedLines;
    }

    if (!lines || lines.length === 0) return emptyState;

    // Find current or upcoming line
    let currentLine: LyricLine | null = null;
    let currentLineIndex = -1;

    // First try to find the currently singing line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (currentTime >= line.startTime && currentTime <= line.endTime) {
        currentLine = line;
        currentLineIndex = i;
        break;
      }
    }

    // If no active line, find the next upcoming line within preview window
    if (!currentLine) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (currentTime >= line.startTime - previewTime && currentTime < line.startTime) {
          currentLine = line;
          currentLineIndex = i;
          break;
        }
      }
    }

    if (!currentLine) return emptyState;

    // Calculate time until singing starts
    const timeUntilSing = currentLine.startTime - currentTime;
    const isSinging = currentTime >= currentLine.startTime;

    // Flying animation progress
    const flyProgress = Math.max(0, Math.min(1, 1 - timeUntilSing / previewTime));
    const isFlying = !isSinging && timeUntilSing > 0 && timeUntilSing < previewTime;

    // Get the first word of the line
    const firstNote = currentLine.notes[0];
    const firstWord = firstNote?.lyric?.trim() || '';

    // Find next line
    const nextLine = currentLineIndex >= 0 && currentLineIndex < lines.length - 1
      ? lines[currentLineIndex + 1]
      : null;

    return {
      currentLine,
      nextLine,
      isSinging,
      timeUntilSing,
      flyProgress,
      isFlying,
      firstWord,
    };
  }, [currentTime, timingData, previewTime, playerMode]);
}

/**
 * Get the text of a lyric line
 */
export function getLineText(line: LyricLine | null): string {
  if (!line) return '';
  return line.notes.map((n) => n.lyric).join('');
}
