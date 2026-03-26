/**
 * use-visible-notes.ts
 * 
 * Hook for computing visible notes in the game highway
 * Extracted from game-screen.tsx for better maintainability
 */

import { useMemo } from 'react';
import { Note, LyricLine } from '@/types/game';

// Types for timing data structure (matches game-screen.tsx timingData)
export interface TimingData {
  allNotes: Array<Note & { lineIndex: number; line: LyricLine }>;
  sortedLines: LyricLine[];
  noteCount: number;
  lineCount: number;
  p1Notes: Array<Note & { lineIndex: number; line: LyricLine }>;
  p2Notes: Array<Note & { lineIndex: number; line: LyricLine }>;
  p1Lines: LyricLine[];
  p2Lines: LyricLine[];
  p1NoteCount: number;
  p2NoteCount: number;
  beatDuration: number;
}

export interface VisibleNotesResult {
  /** All visible notes for single player mode */
  visibleNotes: Array<Note & { line: LyricLine }>;
  /** Visible notes for Player 1 in duet mode */
  p1VisibleNotes: Array<Note & { line: LyricLine }>;
  /** Visible notes for Player 2 in duet mode */
  p2VisibleNotes: Array<Note & { line: LyricLine }>;
}

/**
 * Hook for computing which notes are currently visible in the note highway
 * Uses binary search for efficient filtering of large note arrays
 * 
 * @param currentTime - Current playback time in milliseconds
 * @param timingData - Pre-computed timing data containing sorted note arrays
 * @param noteWindow - Time window in milliseconds for visible notes (default: 4000ms)
 * @returns Object containing visible notes for single player and duet modes
 */
export function useVisibleNotes(
  currentTime: number,
  timingData: TimingData | null,
  noteWindow: number = 4000
): VisibleNotesResult {
  
  // Get upcoming notes - OPTIMIZED with pre-computed data
  const visibleNotes = useMemo(() => {
    if (!timingData) return [];
    const windowStart = currentTime - 1000;
    const windowEnd = currentTime + noteWindow;
    
    // Use the pre-sorted notes array for efficient filtering
    const notes = timingData.allNotes;
    const result: Array<Note & { line: LyricLine }> = [];
    
    // Binary search to find starting point
    let startIdx = 0;
    let endIdx = notes.length - 1;
    let midIdx: number;
    
    // Find first note that could be visible
    while (startIdx <= endIdx) {
      midIdx = Math.floor((startIdx + endIdx) / 2);
      if (notes[midIdx].startTime < windowStart) {
        startIdx = midIdx + 1;
      } else {
        endIdx = midIdx - 1;
      }
    }
    
    // Collect visible notes from starting point
    for (let i = startIdx; i < notes.length; i++) {
      const note = notes[i];
      const noteEnd = note.startTime + note.duration;
      
      if (note.startTime > windowEnd) break; // No more visible notes
      if (noteEnd >= windowStart) {
        result.push({ ...note, line: note.line });
      }
    }
    
    return result;
  }, [currentTime, timingData, noteWindow]);
  
  // Get upcoming notes for P1 (duet mode)
  const p1VisibleNotes = useMemo(() => {
    if (!timingData || !timingData.p1Notes) return [];
    const windowStart = currentTime - 1000;
    const windowEnd = currentTime + noteWindow;
    
    const notes = timingData.p1Notes;
    const result: Array<Note & { line: LyricLine }> = [];
    
    let startIdx = 0;
    let endIdx = notes.length - 1;
    let midIdx: number;
    
    while (startIdx <= endIdx) {
      midIdx = Math.floor((startIdx + endIdx) / 2);
      if (notes[midIdx].startTime < windowStart) {
        startIdx = midIdx + 1;
      } else {
        endIdx = midIdx - 1;
      }
    }
    
    for (let i = startIdx; i < notes.length; i++) {
      const note = notes[i];
      const noteEnd = note.startTime + note.duration;
      
      if (note.startTime > windowEnd) break;
      if (noteEnd >= windowStart) {
        result.push({ ...note, line: note.line });
      }
    }
    
    return result;
  }, [currentTime, timingData, noteWindow]);
  
  // Get upcoming notes for P2 (duet mode)
  const p2VisibleNotes = useMemo(() => {
    if (!timingData || !timingData.p2Notes) return [];
    const windowStart = currentTime - 1000;
    const windowEnd = currentTime + noteWindow;
    
    const notes = timingData.p2Notes;
    const result: Array<Note & { line: LyricLine }> = [];
    
    let startIdx = 0;
    let endIdx = notes.length - 1;
    let midIdx: number;
    
    while (startIdx <= endIdx) {
      midIdx = Math.floor((startIdx + endIdx) / 2);
      if (notes[midIdx].startTime < windowStart) {
        startIdx = midIdx + 1;
      } else {
        endIdx = midIdx - 1;
      }
    }
    
    for (let i = startIdx; i < notes.length; i++) {
      const note = notes[i];
      const noteEnd = note.startTime + note.duration;
      
      if (note.startTime > windowEnd) break;
      if (noteEnd >= windowStart) {
        result.push({ ...note, line: note.line });
      }
    }
    
    return result;
  }, [currentTime, timingData, noteWindow]);

  return {
    visibleNotes,
    p1VisibleNotes,
    p2VisibleNotes,
  };
}
