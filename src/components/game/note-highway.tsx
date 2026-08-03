'use client';

import React, { useMemo } from 'react';
import { Note, LyricLine } from '@/types/game';
import { getNoteDisplayStyleClasses, PitchStats } from '@/lib/game/note-utils';
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
  visibleNotes: NoteWithLine[];
  currentTime: number;
  pitchStats: PitchStats;
  notePerformance?: Map<string, Array<{ time: number; accuracy: number; hit: boolean }>>;
  singLinePosition?: number;
  noteWindow?: number;
  playerColor?: string;
  showPlayerLabel?: boolean;
  playerName?: string;
  playerNumber?: number;
  visibleTop?: number;
  visibleRange?: number;
  className?: string;
  isBlindSection?: boolean;
}

// ===================== SUB-COMPONENTS =====================

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

const SingLine = React.memo(function SingLine({
  position,
  playerColor = '#22d3d3ee',
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

const NoteBlock = React.memo(function NoteBlock({
  note,
  currentTime,
  pitchStats,
  singLinePosition,
  noteWindow,
  visibleTop,
  visibleRange,
  noteWidthExtra = 20,
  playerColor = '#22d3d3ee',
  notePerformance,
}: {
  note: NoteWithLine;
  currentTime: number;
  pitchStats: PitchStats;
  singLinePosition: number;
  noteWindow: number;
  visibleTop: number;
  visibleRange: number;
  noteWidthExtra?: number;
  playerColor?: string;
  notePerformance?: Map<string, Array<{ time: number; accuracy: number; hit: boolean; sungPitch?: number | null }>>;
}) {
  const timeUntilNote = note.startTime - currentTime;
  const noteEnd = note.startTime + note.duration;
  const isActive = currentTime >= note.startTime && currentTime <= noteEnd;
  const isPast = currentTime > noteEnd;

  const distanceFromSingLine = (timeUntilNote / noteWindow) * (100 - singLinePosition + noteWidthExtra);
  const x = Math.round((singLinePosition + distanceFromSingLine) * 100) / 100;

  const pr = pitchStats.pitchRange || 1;
  const pitchY = Math.round((visibleTop + visibleRange - ((note.pitch - pitchStats.minPitch) / pr) * visibleRange) * 100) / 100;

  const noteWidthPercent = Math.round(((note.duration / noteWindow) * (100 - singLinePosition + noteWidthExtra)) * 100) / 100;
  const noteHeight = 24;

  // Cull notes whose right edge has exited the left screen boundary.
  if (x > 120 || x + noteWidthPercent < -30) return null;

  const getNoteAccuracy = (): number => {
    if (!notePerformance) return 0;
    const noteId = note.id || `note-${note.startTime}`;
    const samples = notePerformance.get(noteId) || [];
    if (samples.length === 0) return 0;
    return samples.reduce((sum, s) => sum + s.accuracy, 0) / samples.length;
  };

  const accuracy = getNoteAccuracy();

  const notePerfSamples = notePerformance
    ? (notePerformance.get(note.id || `note-${note.startTime}`) || [])
    : [];

  const displayStyle = getNoteDisplayStyleClasses(
    'tick-fill-singstar',
    accuracy,
    note.isGolden || false,
    note.isBonus || false,
    notePerfSamples,
    note.pitch,
    pitchStats,
    visibleTop,
    visibleRange,
  );

  const glowColor = withAlpha(playerColor, 0.8);

  return (
    <div
      className={`absolute ${displayStyle.additionalClasses}`}
      style={{
        left: `${x}%`,
        top: `${pitchY}%`,
        width: `${noteWidthPercent}%`,
        height: `${noteHeight}px`,
        transform: 'translateY(-50%) translateZ(0)',
        willChange: 'left, top, width, opacity',
        transition: 'opacity 400ms ease-out, box-shadow 200ms ease-out',
        boxShadow: isActive ? `0 0 15px ${glowColor}` : 'none',
        opacity: isPast ? (accuracy > 0.3 ? 0.8 : 0.3) : 1,
        ...displayStyle.inlineStyle,
      }}
    >
      {displayStyle.overlayElement}
    </div>
  );
});

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

// ===================== MAIN COMPONENT =====================

export const NoteHighway = React.memo(function NoteHighway({
  visibleNotes,
  currentTime,
  pitchStats,
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

  const effectiveColor = playerColor ?? (playerNumber === 2 ? '#ec4899' : '#22d3ee');
  const resolvedPlayerName = playerName || t('prominentScore.player1');

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`} style={{ contain: 'content' }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(${playerNumber === 1 ? 'to bottom' : 'to top'}, ${withAlpha(effectiveColor, 0.2)}, transparent)` }} />

      <PitchGrid count={7} playerColor={effectiveColor} />
      <SingLine position={singLinePosition} playerColor={effectiveColor} />

      {!isBlindSection && visibleNotes.map((note) => (
        <NoteBlock
          key={note.id || `note-${note.startTime}`}
          note={note}
          currentTime={currentTime}
          pitchStats={pitchStats}
          singLinePosition={singLinePosition}
          noteWindow={noteWindow}
          visibleTop={visibleTop}
          visibleRange={visibleRange}
          playerColor={effectiveColor}
          notePerformance={notePerformance}
        />
      ))}

      {isBlindSection && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-2 pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center" style={{ animation: 'ptm-cursor-blink 1.5s ease-in-out infinite' }}>
            <span className="text-3xl">🙈</span>
          </div>
          <span className="text-xs text-white/30 font-medium">BLIND</span>
        </div>
      )}

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
