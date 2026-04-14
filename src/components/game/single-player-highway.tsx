'use client';

import React from 'react';
import { Note, LyricLine } from '@/types/game';
import { NoteHighway, NoteWithLine, PitchStats } from './note-highway';
import { SinglePlayerLyrics } from './single-player-lyrics';
import { NoteShapeStyle, NoteDisplayStyle, getNoteShapeClasses, getNoteDisplayStyleClasses } from '@/lib/game/note-utils';
import { MicIcon } from '@/components/icons';

// ===================== TYPES =====================

export interface SinglePlayerNoteHighwayProps {
  /** All visible notes to render */
  visibleNotes: NoteWithLine[];
  /** Sorted lyric lines */
  sortedLines: LyricLine[];
  /** Current game time in milliseconds */
  currentTime: number;
  /** Pitch statistics for vertical positioning */
  pitchStats: PitchStats;
  /** Currently detected pitch result */
  pitchResult: {
    frequency: number | null;
    note: number | null;
    clarity: number;
    volume: number;
  } | null;
  /** Note shape style from settings */
  noteShapeStyle: NoteShapeStyle;
  /** Position of the sing line (percentage from left) */
  singLinePosition?: number;
  /** Time window for note display (milliseconds) */
  noteWindow?: number;
  /** Player color for styling */
  playerColor?: string;
  /** Note display style from settings */
  noteDisplayStyle?: NoteDisplayStyle;
  /** Note performance for visual feedback */
  notePerformance?: Map<string, Array<{ time: number; accuracy: number; hit: boolean }>>;
  /** Game mode */
  gameMode?: string;
  /** Missing words indices for missing-words mode */
  missingWordsIndices?: number[];
  /** Is blind section for blind mode */
  isBlindSection?: boolean;
}

// ===================== MAIN COMPONENT =====================

export function SinglePlayerNoteHighway({
  visibleNotes,
  sortedLines,
  currentTime,
  pitchStats,
  pitchResult,
  noteShapeStyle,
  singLinePosition = 25,
  noteWindow = 4000,
  playerColor = '#22d3ee',
  noteDisplayStyle = 'classic',
  notePerformance = new Map(),
  gameMode = 'standard',
  missingWordsIndices = [],
  isBlindSection = false,
}: SinglePlayerNoteHighwayProps) {
  // Constants for pitch positioning
  const VISIBLE_TOP = 8;
  const VISIBLE_RANGE = 77;

  return (
    <div className="absolute inset-0 z-10">
      {/* Pitch Lines */}
      <div className="absolute inset-0">
        {Array.from({ length: 13 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-full border-t border-white/5"
            style={{ top: `${(i / 12) * 100}%` }}
          />
        ))}
      </div>

      {/* Sing Line - Vertical marker */}
      <div
        className="absolute top-0 bottom-0 z-20 w-1 bg-gradient-to-b from-transparent via-cyan-400 to-transparent shadow-lg shadow-cyan-400/50"
        style={{ left: `${singLinePosition}%` }}
      >
        <div className="absolute -left-1 top-0 bottom-0 w-0.5 bg-white/20" />
        <div className="absolute -left-4 top-1/2 transform -translate-y-1/2 text-cyan-400 text-xs font-bold whitespace-nowrap">
          SING
        </div>
      </div>

      {/* Notes */}
      {visibleNotes.map((note) => {
        const timeUntilNote = note.startTime - currentTime;
        const noteEnd = note.startTime + note.duration;
        const isActive = currentTime >= note.startTime && currentTime <= noteEnd;
        const isPast = currentTime > noteEnd;

        const distanceFromSingLine = (timeUntilNote / noteWindow) * (100 - singLinePosition + 20);
        const x = singLinePosition + distanceFromSingLine;

        const pitchY = VISIBLE_TOP + VISIBLE_RANGE - ((note.pitch - pitchStats.minPitch) / pitchStats.pitchRange) * VISIBLE_RANGE;

        const noteWidthPercent = (note.duration / noteWindow) * (100 - singLinePosition + 20);
        const noteHeight = 32;

        // Determine note styling based on type
        const getBackgroundClasses = () => {
          // In fill-level mode, skip Tailwind gradient classes — the display style
          // manages its own background via inline styles (empty shell + fill overlay).
          if (noteDisplayStyle === 'fill-level') return '';
          if (note.isGolden) {
            return 'bg-gradient-to-r from-yellow-400 to-orange-500 shadow-lg shadow-yellow-500/50';
          }
          if (note.isBonus) {
            return 'bg-gradient-to-r from-pink-500 to-purple-500';
          }
          return 'bg-gradient-to-r from-cyan-500 to-blue-500';
        };

        // Get note shape classes from utility function
        const noteShape = getNoteShapeClasses(noteShapeStyle);
        
        // Calculate accuracy for display style
        // Default is 0 so notes start empty/dim/red and fill/glow/shift-green as the player sings.
        const getNoteAccuracy = (): number => {
          if (!notePerformance) return 0;
          const noteId = note.id || `note-${note.startTime}`;
          const samples = notePerformance.get(noteId) || [];
          if (samples.length === 0) return 0;
          return samples.reduce((sum, s) => sum + s.accuracy, 0) / samples.length;
        };
        const accuracy = getNoteAccuracy();
        
        // Apply note display style
        const displayStyle = getNoteDisplayStyleClasses(
          noteDisplayStyle,
          accuracy,
          note.isGolden || false,
          note.isBonus || false
        );

        // Skip notes that are too far off-screen
        if (x > 120 || x < -30) return null;

        return (
          <div
            key={note.id}
            className={`absolute ${noteShape.baseClass} ${getBackgroundClasses()} ${displayStyle.additionalClasses} ${isActive ? noteShape.activeClass : ''} ${isPast ? 'opacity-60' : ''}`}
            style={{
              left: `${x}%`,
              top: `${pitchY}%`,
              width: `${noteWidthPercent}%`,
              height: `${noteHeight}px`,
              transform: 'translateY(-50%)',
              boxShadow: isActive ? '0 0 20px rgba(34, 211, 238, 0.6)' : 'none',
              ...noteShape.style,
              ...displayStyle.inlineStyle,
            }}
          >
            {displayStyle.overlayElement}
          </div>
        );
      })}

      {/* Detected Pitch Indicator - Ball that moves up/down with voice */}
      {pitchResult?.frequency && pitchResult.note && (
        <div
          className="absolute z-30 w-10 h-10 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 shadow-lg shadow-green-500/50 flex items-center justify-center"
          style={{
            left: `${singLinePosition - 2}%`,
            top: `${VISIBLE_TOP + VISIBLE_RANGE - ((pitchResult.note - pitchStats.minPitch) / pitchStats.pitchRange) * VISIBLE_RANGE}%`,
            transform: 'translateY(-50%)',
            transition: 'top 80ms ease-out',
          }}
        >
          <MicIcon className="w-5 h-5 text-white" />
        </div>
      )}

      {/* Lyrics Display */}
      <SinglePlayerLyrics
        sortedLines={sortedLines}
        currentTime={currentTime}
        playerColor={playerColor}
        noteDisplayStyle={noteDisplayStyle}
        notePerformance={notePerformance}
        gameMode={gameMode}
        missingWordsIndices={missingWordsIndices}
        isBlindSection={isBlindSection}
      />
    </div>
  );
}

export default SinglePlayerNoteHighway;
