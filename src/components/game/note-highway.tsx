'use client';

import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { Note, LyricLine } from '@/types/game';
import { getNoteShapeClasses, getNoteDisplayStyleClasses, NoteShapeStyle, NoteDisplayStyle, PitchStats } from '@/lib/game/note-utils';
import { MicIcon } from '@/components/icons';
import { useTranslation } from '@/lib/i18n/translations';

// ===================== HELPERS =====================

/** Convert a hex color to an rgba string with the given alpha (0-1). */
function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ===================== TYPES =====================

export interface NoteWithLine extends Note {
  lineIndex: number;
  line: LyricLine;
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
  /** Blind mode: hide notes when in a blind section */
  isBlindSection?: boolean;
}

// ===================== SUB-COMPONENTS =====================

/**
 * Pitch grid background lines
 */
const PitchGrid = React.memo(function PitchGrid({ count = 7, playerColor = '#22d3d3ee' }: { count?: number; playerColor?: string }) {
  const borderColor = withAlpha(playerColor, 0.1);
  return (
    <div className="absolute inset-0 pointer-events-none">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="absolute w-full border-t"
          style={{ top: count <= 1 ? '50%' : `${(i / (count - 1)) * 100}%`, borderColor }}
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
  playerColor = '#22d3d3ee'
}: {
  position: number;
  playerColor?: string;
}) {
  return (
    <div
      className="absolute top-0 bottom-0 z-20 w-1 shadow-lg"
      style={{
        left: `${position}%`,
        background: `linear-gradient(to bottom, transparent, ${playerColor}, transparent)`,
        boxShadow: `0 0 8px ${withAlpha(playerColor, 0.5)}`,
      }}
    >
      <div
        className="absolute -left-1 top-0 bottom-0 w-0.5"
        style={{ backgroundColor: withAlpha(playerColor, 0.3) }}
      />
    </div>
  );
});

/**
 * Single note block with all styling.
 * Wrapped in React.memo because this is rendered in a .map() at ~60fps
 * during gameplay — without memoization every game frame re-renders all
 * visible notes even when their props haven't changed.
 *
 * PERFORMANCE NOTE: Positioning uses transform: translate() instead of
 * left/top to avoid layout recalculation per frame. The container's pixel
 * dimensions are passed down so percentage-based positions can be
 * converted to pixel values for the GPU-only compositing path.
 */
const NoteBlock = React.memo(function NoteBlock({
  note,
  currentTime,
  pitchStats,
  singLinePosition,
  noteWindow,
  noteShape,
  visibleTop,
  visibleRange,
  noteWidthExtra = 20,
  playerColor = '#22d3d3ee',
  noteDisplayStyle = 'classic',
  notePerformance,
  highwayW,
  highwayH,
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
  playerColor?: string;
  noteDisplayStyle?: NoteDisplayStyle;
  notePerformance?: Map<string, Array<{ time: number; accuracy: number; hit: boolean }>>;
  highwayW: number;
  highwayH: number;
}) {
  const timeUntilNote = note.startTime - currentTime;
  const noteEnd = note.startTime + note.duration;
  const isActive = currentTime >= note.startTime && currentTime <= noteEnd;
  const isPast = currentTime > noteEnd;

  // Calculate horizontal position as percentage
  const distanceFromSingLine = (timeUntilNote / noteWindow) * (100 - singLinePosition + noteWidthExtra);
  const xPercent = Math.round((singLinePosition + distanceFromSingLine) * 100) / 100;

  // Calculate vertical position as percentage
  const pr = pitchStats.pitchRange || 1;
  const pitchYPercent = Math.round((visibleTop + visibleRange - ((note.pitch - pitchStats.minPitch) / pr) * visibleRange) * 100) / 100;

  // Calculate note dimensions
  const noteWidthPercent = Math.round(((note.duration / noteWindow) * (100 - singLinePosition + noteWidthExtra)) * 100) / 100;
  const noteHeight = 24;

  // Skip notes that are too far off-screen
  if (xPercent > 120 || xPercent < -30) return null;

  // Convert percentage positions to pixel values for transform-based positioning.
  // This avoids layout recalculation that left/top would trigger every frame.
  const xPx = (xPercent / 100) * highwayW;
  const yPx = (pitchYPercent / 100) * highwayH - noteHeight / 2;

  // Determine note styling based on type and player color
  const getBackgroundStyle = (): React.CSSProperties => {
    // In fill-level and hit-fill modes, skip gradient —
    // the display style manages its own background via inline styles.
    if (noteDisplayStyle === 'fill-level' || noteDisplayStyle === 'hit-fill' || noteDisplayStyle === 'trail-effect' || noteDisplayStyle === 'retro-bars' || noteDisplayStyle === 'particle-fade') return {};
    if (note.isGolden) {
      return { background: 'linear-gradient(to right, #facc15, #f97316)' };
    }
    if (note.isBonus) {
      return { background: `linear-gradient(to right, ${playerColor}, ${withAlpha(playerColor, 0.7)})` };
    }
    return { background: `linear-gradient(to right, ${playerColor}, ${withAlpha(playerColor, 0.6)})` };
  };

  const glowColor = withAlpha(playerColor, 0.8);

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

  // Extract raw performance samples for hit-fill display style
  const notePerfSamples = notePerformance
    ? (notePerformance.get(note.id || `note-${note.startTime}`) || [])
    : [];

  // Apply note display style
  const displayStyle = getNoteDisplayStyleClasses(
    noteDisplayStyle,
    accuracy,
    note.isGolden || false,
    note.isBonus || false,
    notePerfSamples
  );

  return (
    <div
      className={`absolute ${noteShape.baseClass} ${displayStyle.additionalClasses} ${isActive ? noteShape.activeClass : ''}`}
      style={{
        left: 0,
        top: 0,
        width: `${noteWidthPercent}%`,
        height: `${noteHeight}px`,
        transform: `translate(${xPx}px, ${yPx}px)`,
        willChange: 'transform, opacity',
        boxShadow: isActive ? `0 0 15px ${glowColor}` : 'none',
        opacity: isPast ? (accuracy > 0.3 ? 0.8 : 0.3) : 1,
        ...noteShape.style,
        ...displayStyle.inlineStyle,
        ...getBackgroundStyle(),
      }}
    >
      {displayStyle.overlayElement}
    </div>
  );
});

/**
 * Pitch indicator showing singer's current pitch.
 * Uses transform-based positioning for GPU compositing (same path as NoteBlock).
 */
const PitchIndicator = React.memo(function PitchIndicator({
  detectedPitch,
  pitchStats,
  singLinePosition,
  visibleTop,
  visibleRange,
  playerColor = '#22d3d3ee',
  highwayW,
  highwayH,
}: {
  detectedPitch: number | null;
  pitchStats: PitchStats;
  singLinePosition: number;
  visibleTop: number;
  visibleRange: number;
  playerColor?: string;
  highwayW: number;
  highwayH: number;
}) {
  if (detectedPitch === null) return null;

  const pr = pitchStats.pitchRange || 1;
  const pitchYPercent = Math.round((visibleTop + visibleRange - ((detectedPitch - pitchStats.minPitch) / pr) * visibleRange) * 100) / 100;
  const xPx = ((singLinePosition - 1.5) / 100) * highwayW;
  const yPx = (pitchYPercent / 100) * highwayH - 16; // 16 = half of 32px (w-8 h-8)

  return (
    <div
      className="absolute z-30 w-8 h-8 rounded-full shadow-lg flex items-center justify-center"
      style={{
        left: 0,
        top: 0,
        transform: `translate(${xPx}px, ${yPx}px)`,
        willChange: 'transform',
        background: `linear-gradient(to right, ${playerColor}, ${withAlpha(playerColor, 0.7)})`,
        boxShadow: `0 0 10px ${withAlpha(playerColor, 0.7)}`,
        outline: '2px solid',
        outlineColor: withAlpha(playerColor, 0.5),
      }}
    >
      <MicIcon className="w-4 h-4 text-white" />
    </div>
  );
});

/**
 * Player label badge
 */
const PlayerLabel = React.memo(function PlayerLabel({
  playerName,
  playerNumber,
  playerColor = '#22d3d3ee',
}: {
  playerName: string;
  playerNumber: number;
  playerColor?: string;
}) {
  return (
    <div className="absolute top-20 left-4 z-20 bg-black/50 backdrop-blur-sm rounded-lg px-2 py-1 border" style={{ borderColor: withAlpha(playerColor, 0.3) }}>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: playerColor }}>
          P{playerNumber}
        </div>
        <span className="text-xs" style={{ color: withAlpha(playerColor, 0.7) }}>{playerName}</span>
      </div>
    </div>
  );
});

// ===================== HOOK: Measure container dimensions =====================

function useHighwayDimensions() {
  const ref = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });

  const measure = useCallback(() => {
    const el = ref.current;
    if (el && el.offsetWidth > 0 && el.offsetHeight > 0) {
      setDims({ w: el.offsetWidth, h: el.offsetHeight });
    }
  }, []);

  useEffect(() => {
    measure();
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure]);

  return { ref, w: dims.w, h: dims.h };
}

// ===================== MAIN COMPONENT =====================

export const NoteHighway = React.memo(function NoteHighway({
  visibleNotes,
  currentTime,
  pitchStats,
  detectedPitch,
  noteShapeStyle,
  noteDisplayStyle = 'classic',
  notePerformance,
  singLinePosition = 25,
  noteWindow = 4000,
  playerColor,
  showPlayerLabel = false,
  playerName,
  playerNumber = 1,
  visibleTop = 8,
  visibleRange = 77,
  className = '',
  isBlindSection = false,
}: NoteHighwayProps) {
  const { t } = useTranslation();

  // Get note shape classes from style
  const noteShape = useMemo(() => getNoteShapeClasses(noteShapeStyle), [noteShapeStyle]);

  // Use playerColor if provided; otherwise derive from playerNumber (P1=cyan, P2=pink)
  const effectiveColor = playerColor ?? (playerNumber === 2 ? '#ec4899' : '#22d3ee');

  const resolvedPlayerName = playerName || t('prominentScore.player1');

  // Measure container pixel dimensions for transform-based note positioning
  const { ref: highwayRef, w: highwayW, h: highwayH } = useHighwayDimensions();

  return (
    <div
      ref={highwayRef}
      className={`relative w-full h-full overflow-hidden ${className}`}
      style={{ contain: 'content' }}
    >
      {/* Background gradient */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(${playerNumber === 1 ? 'to bottom' : 'to top'}, ${withAlpha(effectiveColor, 0.2)}, transparent)` }} />

      {/* Pitch grid lines */}
      <PitchGrid count={7} playerColor={effectiveColor} />

      {/* Sing line */}
      <SingLine position={singLinePosition} playerColor={effectiveColor} />

      {/* Notes — hidden in blind sections only */}
      {/* Missing Words mode: notes always visible on highway (only lyrics text is hidden) */}
      {!isBlindSection && visibleNotes.map((note) => {
        return (
        <NoteBlock
          key={note.id || `note-${note.startTime}`}
          note={note}
          currentTime={currentTime}
          pitchStats={pitchStats}
          singLinePosition={singLinePosition}
          noteWindow={noteWindow}
          noteShape={noteShape}
          visibleTop={visibleTop}
          visibleRange={visibleRange}
          playerColor={effectiveColor}
          noteDisplayStyle={noteDisplayStyle}
          notePerformance={notePerformance}
          highwayW={highwayW}
          highwayH={highwayH}
        />
      );
      })}

      {/* Pitch indicator — hidden in blind sections */}
      {!isBlindSection && <PitchIndicator
        detectedPitch={detectedPitch}
        pitchStats={pitchStats}
        singLinePosition={singLinePosition}
        visibleTop={visibleTop}
        visibleRange={visibleRange}
        playerColor={effectiveColor}
        highwayW={highwayW}
        highwayH={highwayH}
      />}
      {/* Blind indicator — subtle pulse when in blind section */}
      {isBlindSection && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-2 pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center" style={{ animation: 'ptm-cursor-blink 1.5s ease-in-out infinite' }}>
            <span className="text-3xl">🙈</span>
          </div>
          <span className="text-xs text-white/30 font-medium">{t('noteHighway.blindLabel')}</span>
        </div>
      )}

      {/* Player label */}
      {showPlayerLabel && (
        <PlayerLabel
          playerName={resolvedPlayerName}
          playerNumber={playerNumber}
          playerColor={effectiveColor}
        />
      )}
    </div>
  );
});

export default NoteHighway;