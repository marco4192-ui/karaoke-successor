'use client';

import React, { useMemo, memo } from 'react';
import { Note, LyricLine } from '@/types/game';
import { getNoteShapeClasses, NoteShapeStyle } from '@/lib/game/note-utils';
import { MicIcon } from '@/components/icons';

// ===================== TYPES =====================

export interface NoteWithLine extends Note {
  line: LyricLine;
}

export interface PitchStats {
  minPitch: number;
  maxPitch: number;
  pitchRange: number;
}

export interface NoteHighwayProps {
  /** All visible notes to render */
  visibleNotes: NoteWithLine[];
  /** Current game time in milliseconds */
  currentTime: number;
  /** Pitch statistics for vertical positioning */
  pitchStats: PitchStats;
  /** Currently detected pitch (MIDI note number) */
  detectedPitch: number | null;
  /** Note shape style from settings */
  noteShapeStyle: NoteShapeStyle;
  /** Position of the sing line (percentage from left) */
  singLinePosition?: number;
  /** Time window for note display (milliseconds) */
  noteWindow?: number;
  /** Player color for styling */
  playerColor?: string;
  /** Show player label */
  showPlayerLabel?: boolean;
  /** Player name for label */
  playerName?: string;
  /** Player number for label */
  playerNumber?: number;
  /** Visible top percentage (for half-screen in duet mode) */
  visibleTop?: number;
  /** Visible range percentage (for half-screen in duet mode) */
  visibleRange?: number;
  /** Additional CSS class names */
  className?: string;
}

// ===================== SUB-COMPONENTS =====================

/**
 * Pitch grid background lines
 * Memoized: static component with no props changes
 */
const PitchGrid = memo(function PitchGrid({ 
  count = 7, 
  color = 'cyan' 
}: { 
  count?: number; 
  color?: string 
}) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`absolute w-full border-t border-${color}-500/10`}
          style={{ top: `${(i / (count - 1)) * 100}%` }}
        />
      ))}
    </div>
  );
});

/**
 * Vertical sing line indicator
 * Memoized: only re-renders when position or color changes
 */
const SingLine = memo(function SingLine({
  position,
  color = 'cyan'
}: {
  position: number;
  color?: 'cyan' | 'pink'
}) {
  const colorClasses = {
    cyan: 'from-transparent via-cyan-400 to-transparent shadow-cyan-400/50',
    pink: 'from-transparent via-pink-400 to-transparent shadow-pink-400/50',
  };

  return (
    <div
      className={`absolute top-0 bottom-0 z-20 w-1 bg-gradient-to-b ${colorClasses[color]} shadow-lg`}
      style={{ left: `${position}%` }}
    >
      <div className={`absolute -left-1 top-0 bottom-0 w-0.5 bg-${color}-500/30`} />
    </div>
  );
});

/**
 * Single note block with all styling
 * Memoized: re-renders only when note or currentTime changes
 */
const NoteBlock = memo(function NoteBlock({
  note,
  currentTime,
  pitchStats,
  singLinePosition,
  noteWindow,
  noteShape,
  visibleTop,
  visibleRange,
  noteWidthExtra = 20,
  color = 'cyan',
}: {
  note: NoteWithLine;
  currentTime: number;
  pitchStats: PitchStats;
  singLinePosition: number;
  noteWindow: number;
  noteShape: ReturnType<typeof getNoteShapeClasses>;
  visibleTop: number;
  visibleRange: number;
  noteWidthExtra?: number;
  color?: 'cyan' | 'pink';
}) {
  const timeUntilNote = note.startTime - currentTime;
  const noteEnd = note.startTime + note.duration;
  const isActive = currentTime >= note.startTime && currentTime <= noteEnd;

  // Calculate horizontal position (distance from sing line)
  const distanceFromSingLine = (timeUntilNote / noteWindow) * (100 - singLinePosition + noteWidthExtra);
  const x = singLinePosition + distanceFromSingLine;

  // Calculate vertical position based on pitch
  const pitchY = visibleTop + visibleRange - ((note.pitch - pitchStats.minPitch) / pitchStats.pitchRange) * visibleRange;

  // Calculate note dimensions
  const noteWidthPercent = (note.duration / noteWindow) * (100 - singLinePosition + noteWidthExtra);
  const noteHeight = 24;

  // Skip notes that are too far off-screen
  if (x > 120 || x < -30) return null;

  // Determine note styling based on type and player color
  const getBackgroundClasses = () => {
    if (note.isGolden) {
      return 'bg-gradient-to-r from-yellow-400 to-orange-500 shadow-lg shadow-yellow-500/50';
    }
    if (note.isBonus) {
      return color === 'cyan'
        ? 'bg-gradient-to-r from-cyan-400 to-teal-500'
        : 'bg-gradient-to-r from-pink-400 to-rose-500';
    }
    return color === 'cyan'
      ? 'bg-gradient-to-r from-cyan-400 to-blue-500'
      : 'bg-gradient-to-r from-pink-500 to-purple-500';
  };

  const glowColor = color === 'cyan' ? 'rgba(34, 211, 238, 0.8)' : 'rgba(236, 72, 153, 0.8)';

  return (
    <div
      className={`absolute ${noteShape.baseClass} ${getBackgroundClasses()} ${isActive ? noteShape.activeClass : ''}`}
      style={{
        left: `${x}%`,
        top: `${pitchY}%`,
        width: `${noteWidthPercent}%`,
        height: `${noteHeight}px`,
        transform: 'translateY(-50%)',
        boxShadow: isActive ? `0 0 15px ${glowColor}` : 'none',
        opacity: x > 120 || x < -30 ? 0 : 1,
        ...noteShape.style,
      }}
    />
  );
}, (prevProps, nextProps) => {
  // Custom comparison for better performance
  // Only re-render if note position or active state changes significantly
  const prevX = (prevProps.note.startTime - prevProps.currentTime) / prevProps.noteWindow;
  const nextX = (nextProps.note.startTime - nextProps.currentTime) / nextProps.noteWindow;
  
  // Re-render if position changed by more than 1% of the window
  if (Math.abs(prevX - nextX) > 0.01) return false;
  
  // Re-render if active state changed
  const prevActive = prevProps.currentTime >= prevProps.note.startTime && 
                     prevProps.currentTime <= prevProps.note.startTime + prevProps.note.duration;
  const nextActive = nextProps.currentTime >= nextProps.note.startTime && 
                     nextProps.currentTime <= nextProps.note.startTime + nextProps.note.duration;
  if (prevActive !== nextActive) return false;
  
  // Otherwise, skip re-render
  return true;
});

/**
 * Pitch indicator showing singer's current pitch
 * Memoized: re-renders only when detectedPitch changes
 */
const PitchIndicator = memo(function PitchIndicator({
  detectedPitch,
  pitchStats,
  singLinePosition,
  visibleTop,
  visibleRange,
  color = 'cyan',
}: {
  detectedPitch: number | null;
  pitchStats: PitchStats;
  singLinePosition: number;
  visibleTop: number;
  visibleRange: number;
  color?: 'cyan' | 'pink';
}) {
  if (!detectedPitch) return null;

  const pitchY = visibleTop + visibleRange - ((detectedPitch - pitchStats.minPitch) / pitchStats.pitchRange) * visibleRange;

  const colorClasses = {
    cyan: 'from-cyan-400 to-cyan-600 shadow-cyan-500/70 ring-cyan-300',
    pink: 'from-pink-400 to-pink-600 shadow-pink-500/70 ring-pink-300',
  };

  return (
    <div
      className={`absolute z-30 w-8 h-8 rounded-full bg-gradient-to-r ${colorClasses[color]} shadow-lg flex items-center justify-center ring-2`}
      style={{
        left: `${singLinePosition - 1.5}%`,
        top: `${pitchY}%`,
        transform: 'translateY(-50%)',
      }}
    >
      <MicIcon className="w-4 h-4 text-white" />
    </div>
  );
});

/**
 * Player label badge
 * Memoized: static component
 */
const PlayerLabel = memo(function PlayerLabel({
  playerName,
  playerNumber,
  color = 'cyan',
}: {
  playerName: string;
  playerNumber: number;
  color?: 'cyan' | 'pink';
}) {
  const bgColor = color === 'cyan' ? 'bg-cyan-500' : 'bg-pink-500';
  const borderColor = color === 'cyan' ? 'border-cyan-500/30' : 'border-pink-500/30';
  const textColor = color === 'cyan' ? 'text-cyan-300' : 'text-pink-300';

  return (
    <div className={`absolute top-2 left-4 z-20 bg-black/50 backdrop-blur-sm rounded-lg px-2 py-1 border ${borderColor}`}>
      <div className="flex items-center gap-2">
        <div className={`w-6 h-6 rounded-full ${bgColor} flex items-center justify-center text-xs font-bold text-white`}>
          P{playerNumber}
        </div>
        <span className={`text-xs ${textColor}`}>{playerName}</span>
      </div>
    </div>
  );
});

// ===================== MAIN COMPONENT =====================

function NoteHighwayInternal({
  visibleNotes,
  currentTime,
  pitchStats,
  detectedPitch,
  noteShapeStyle,
  singLinePosition = 25,
  noteWindow = 4000,
  playerColor = '#22d3ee',
  showPlayerLabel = false,
  playerName = 'Player 1',
  playerNumber = 1,
  visibleTop = 8,
  visibleRange = 77,
  className = '',
}: NoteHighwayProps) {
  // Get note shape classes from style
  const noteShape = useMemo(() => getNoteShapeClasses(noteShapeStyle), [noteShapeStyle]);

  // Determine color scheme based on player number
  const colorScheme = playerNumber === 1 ? 'cyan' : 'pink';

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-${playerNumber === 1 ? 'b' : 't'} from-${colorScheme}-900/20 to-transparent pointer-events-none`} />

      {/* Pitch grid lines */}
      <PitchGrid count={7} color={colorScheme} />

      {/* Sing line */}
      <SingLine position={singLinePosition} color={colorScheme} />

      {/* Notes */}
      {visibleNotes.map((note) => (
        <NoteBlock
          key={note.id}
          note={note}
          currentTime={currentTime}
          pitchStats={pitchStats}
          singLinePosition={singLinePosition}
          noteWindow={noteWindow}
          noteShape={noteShape}
          visibleTop={visibleTop}
          visibleRange={visibleRange}
          color={colorScheme}
        />
      ))}

      {/* Pitch indicator */}
      <PitchIndicator
        detectedPitch={detectedPitch}
        pitchStats={pitchStats}
        singLinePosition={singLinePosition}
        visibleTop={visibleTop}
        visibleRange={visibleRange}
        color={colorScheme}
      />

      {/* Player label */}
      {showPlayerLabel && (
        <PlayerLabel
          playerName={playerName}
          playerNumber={playerNumber}
          color={colorScheme}
        />
      )}
    </div>
  );
}

// Export with React.memo for optimal performance
export const NoteHighway = memo(NoteHighwayInternal);

export default NoteHighway;
