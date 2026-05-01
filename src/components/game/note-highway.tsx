'use client';

import React, { useMemo } from 'react';
import { Note, LyricLine, PLAYER_COLORS } from '@/types/game';
import { getNoteShapeClasses, getNoteDisplayStyleClasses, NoteShapeStyle, NoteDisplayStyle } from '@/lib/game/note-utils';
import { MicIcon } from '@/components/icons';

// ===================== TYPES =====================

export interface NoteWithLine extends Note {
  lineIndex: number;
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
  /** Note display style from settings */
  noteDisplayStyle?: NoteDisplayStyle;
  /** Note performance for display style feedback */
  notePerformance?: Map<string, Array<{ time: number; accuracy: number; hit: boolean }>>;
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
 */
const PitchGrid = React.memo(function PitchGrid({ count = 7, color = 'cyan' }: { count?: number; color?: string }) {
  const borderColor = color === 'pink' ? 'rgba(236, 72, 153, 0.1)' : 'rgba(6, 182, 212, 0.1)';
  return (
    <div className="absolute inset-0 pointer-events-none">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="absolute w-full border-t"
          style={{ top: `${(i / (count - 1)) * 100}%`, borderColor }}
        />
      ))}
    </div>
  );
});

/**
 * Vertical sing line indicator
 */
const SingLine = React.memo(function SingLine({
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
      <div
        className="absolute -left-1 top-0 bottom-0 w-0.5"
        style={{ backgroundColor: color === 'pink' ? 'rgba(236, 72, 153, 0.3)' : 'rgba(6, 182, 212, 0.3)' }}
      />
    </div>
  );
});

/**
 * Single note block with all styling
 */
function NoteBlock({
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
  noteDisplayStyle = 'classic',
  notePerformance,
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
  noteDisplayStyle?: NoteDisplayStyle;
  notePerformance?: Map<string, Array<{ time: number; accuracy: number; hit: boolean }>>;
}) {
  const timeUntilNote = note.startTime - currentTime;
  const noteEnd = note.startTime + note.duration;
  const isActive = currentTime >= note.startTime && currentTime <= noteEnd;
  const isPast = currentTime > noteEnd;

  // Calculate horizontal position (distance from sing line)
  const distanceFromSingLine = (timeUntilNote / noteWindow) * (100 - singLinePosition + noteWidthExtra);
  const x = singLinePosition + distanceFromSingLine;

  // Calculate vertical position based on pitch
  const pr = pitchStats.pitchRange || 1;
  const pitchY = visibleTop + visibleRange - ((note.pitch - pitchStats.minPitch) / pr) * visibleRange;

  // Calculate note dimensions
  const noteWidthPercent = (note.duration / noteWindow) * (100 - singLinePosition + noteWidthExtra);
  const noteHeight = 24;

  // Skip notes that are too far off-screen
  if (x > 120 || x < -30) return null;

  // Determine note styling based on type and player color
  const getBackgroundClasses = () => {
    // In fill-level mode, skip Tailwind gradient classes — the display style
    // manages its own background via inline styles (empty shell + fill overlay).
    if (noteDisplayStyle === 'fill-level') return '';
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
        boxShadow: isActive ? `0 0 15px ${glowColor}` : 'none',
        opacity: x > 120 || x < -30 ? 0 : isPast ? 0.6 : 1,
        ...noteShape.style,
        ...displayStyle.inlineStyle,
      }}
    >
      {displayStyle.overlayElement}
    </div>
  );
}

/**
 * Pitch indicator showing singer's current pitch
 */
function PitchIndicator({
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
  if (detectedPitch === null) return null;

  const pr = pitchStats.pitchRange || 1;
  const pitchY = visibleTop + visibleRange - ((detectedPitch - pitchStats.minPitch) / pr) * visibleRange;

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
        transition: 'top 80ms ease-out',
      }}
    >
      <MicIcon className="w-4 h-4 text-white" />
    </div>
  );
}

/**
 * Player label badge
 */
const PlayerLabel = React.memo(function PlayerLabel({
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
    <div className={`absolute top-20 left-4 z-20 bg-black/50 backdrop-blur-sm rounded-lg px-2 py-1 border ${borderColor}`}>
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

export function NoteHighway({
  visibleNotes,
  currentTime,
  pitchStats,
  detectedPitch,
  noteShapeStyle,
  noteDisplayStyle = 'classic',
  notePerformance,
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

  // Determine color scheme based on player number (P1=cyan, P2=pink for duet contrast)
  const colorScheme = playerNumber === 2 ? 'pink' : 'cyan';
  const bgGradientClass = playerNumber === 1
    ? 'absolute inset-0 bg-gradient-to-b from-cyan-900/20 to-transparent pointer-events-none'
    : 'absolute inset-0 bg-gradient-to-t from-pink-900/20 to-transparent pointer-events-none';

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      {/* Background gradient */}
      <div className={bgGradientClass} />

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
          noteDisplayStyle={noteDisplayStyle}
          notePerformance={notePerformance}
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

export default NoteHighway;
