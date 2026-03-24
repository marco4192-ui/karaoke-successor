'use client';

import React, { useMemo } from 'react';
import { Note, LyricLine, Player, GameMode } from '@/types/game';
import { getNoteShapeClasses, NoteShapeStyle } from '@/lib/game/note-utils';
import { LyricLineDisplay } from './lyric-line-display';
import { MicIcon } from '@/components/icons';

// Constants
const SING_LINE_POSITION = 25; // percentage from left
const NOTE_WINDOW = 4000; // 4 second window
const HALF_VISIBLE_RANGE = 42;
const HALF_VISIBLE_TOP = 8;

// Pitch stats for a player
export interface PitchStats {
  minPitch: number;
  maxPitch: number;
  pitchRange: number;
}

// Note with line reference
export type NoteWithLine = Note & { lineIndex: number; line: LyricLine };

// Props for a single player's half
export interface DuetPlayerHalfProps {
  playerLabel: string;
  playerName: string;
  playerColor: 'cyan' | 'pink';
  visibleNotes: NoteWithLine[];
  pitchStats: PitchStats;
  currentTime: number;
  noteShapeStyle: NoteShapeStyle;
  detectedPitch: number | null;
  detectedNote: number | null;
  score: number;
  combo: number;
  lines?: LyricLine[];
  noteDisplayStyle: 'classic' | 'fill-level' | 'color-feedback' | 'glow-intensity';
  notePerformance: Map<string, Array<{ time: number; accuracy: number; hit: boolean }>>;
  gameMode: GameMode;
  missingWordsIndices: number[];
  isBlindSection: boolean;
}

// Main component props
export interface DuetModeViewProps {
  // P1 data
  p1VisibleNotes: NoteWithLine[];
  p1PitchStats: PitchStats;
  p1Score: number;
  p1Combo: number;
  p1DetectedPitch: number | null;
  p1DetectedNote: number | null;
  p1PlayerName?: string;
  p1Lines?: LyricLine[];

  // P2 data
  p2VisibleNotes: NoteWithLine[];
  p2PitchStats: PitchStats;
  p2Score: number;
  p2Combo: number;
  p2DetectedPitch: number | null;
  p2DetectedNote: number | null;
  p2PlayerName?: string;
  p2Lines?: LyricLine[];

  // Game state
  currentTime: number;
  noteShapeStyle: NoteShapeStyle;
  noteDisplayStyle: 'classic' | 'fill-level' | 'color-feedback' | 'glow-intensity';
  notePerformance: Map<string, Array<{ time: number; accuracy: number; hit: boolean }>>;
  gameMode: GameMode;
  missingWordsIndices: number[];
  isBlindSection: boolean;

  // Pitch detection result (for P1 indicator)
  pitchResult: { frequency: number | null; note: number | null } | null;
}

// Player half component
function DuetPlayerHalf({
  playerLabel,
  playerName,
  playerColor,
  visibleNotes,
  pitchStats,
  currentTime,
  noteShapeStyle,
  detectedPitch,
  detectedNote,
  score,
  combo,
  lines,
  noteDisplayStyle,
  notePerformance,
  gameMode,
  missingWordsIndices,
  isBlindSection,
}: DuetPlayerHalfProps) {
  const isTop = playerColor === 'cyan';
  const colorClass = isTop ? 'cyan' : 'pink';
  const borderColor = isTop ? 'border-cyan-500/30' : 'border-pink-500/30';
  const gradientDir = isTop ? 'from-cyan-900/20' : 'from-pink-900/20';
  const pitchLineColor = isTop ? 'border-cyan-500/10' : 'border-pink-500/10';
  const singLineColor = isTop ? 'via-cyan-400' : 'via-pink-400';
  const singLineShadow = isTop ? 'shadow-cyan-400/50' : 'shadow-pink-400/50';
  const noteGradient = isTop
    ? 'from-cyan-400 to-blue-500'
    : 'from-pink-500 to-purple-500';
  const noteBonusGradient = isTop
    ? 'from-cyan-400 to-teal-500'
    : 'from-pink-400 to-rose-500';
  const activeGlow = isTop
    ? '0 0 15px rgba(34, 211, 238, 0.8)'
    : '0 0 15px rgba(236, 72, 153, 0.8)';
  const textColor = isTop ? 'text-cyan-300' : 'text-pink-300';
  const bgColor = isTop ? 'bg-cyan-500' : 'bg-pink-500';

  // Get note shape classes
  const noteShape = getNoteShapeClasses(noteShapeStyle);

  // Find current lyrics line
  const displayLine = useMemo(() => {
    if (!lines || lines.length === 0) return null;
    const PREVIEW_TIME = 2000;

    // Find active line
    let found = lines.find(
      (line) => currentTime >= line.startTime && currentTime <= line.endTime
    );

    // Find preview line
    if (!found) {
      for (const line of lines) {
        if (
          currentTime >= line.startTime - PREVIEW_TIME &&
          currentTime < line.startTime
        ) {
          found = line;
          break;
        }
      }
    }

    return found;
  }, [lines, currentTime]);

  return (
    <div
      className={`relative flex-1 ${isTop ? 'border-b-2' : ''} ${borderColor} overflow-hidden`}
      style={{ height: '50%' }}
    >
      {/* Background Gradient */}
      <div
        className={`absolute inset-0 bg-gradient-to-${isTop ? 'b' : 't'} ${gradientDir} to-transparent pointer-events-none`}
      />

      {/* Pitch Lines */}
      <div className="absolute inset-0">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className={`absolute w-full border-t ${pitchLineColor}`}
            style={{ top: `${(i / 6) * 100}%` }}
          />
        ))}
      </div>

      {/* Sing Line */}
      <div
        className={`absolute top-0 bottom-0 z-20 w-1 bg-gradient-to-b from-transparent ${singLineColor} to-transparent shadow-lg ${singLineShadow}`}
        style={{ left: `${SING_LINE_POSITION}%` }}
      >
        <div
          className={`absolute -left-1 top-0 bottom-0 w-0.5 ${isTop ? 'bg-cyan-500/30' : 'bg-pink-500/30'}`}
        />
      </div>

      {/* Notes */}
      {visibleNotes.map((note) => {
        const timeUntilNote = note.startTime - currentTime;
        const noteEnd = note.startTime + note.duration;
        const isActive = currentTime >= note.startTime && currentTime <= noteEnd;

        const distanceFromSingLine =
          (timeUntilNote / NOTE_WINDOW) * (100 - SING_LINE_POSITION + 20);
        const x = SING_LINE_POSITION + distanceFromSingLine;

        const pitchY =
          HALF_VISIBLE_TOP +
          HALF_VISIBLE_RANGE -
          ((note.pitch - pitchStats.minPitch) / pitchStats.pitchRange) *
            HALF_VISIBLE_RANGE;

        const noteWidthPercent =
          (note.duration / NOTE_WINDOW) * (100 - SING_LINE_POSITION + 20);
        const noteHeight = 24;

        return (
          <div
            key={note.id}
            className={`absolute ${noteShape.baseClass} ${
              note.isGolden
                ? 'bg-gradient-to-r from-yellow-400 to-orange-500 shadow-lg shadow-yellow-500/50'
                : note.isBonus
                  ? `bg-gradient-to-r ${noteBonusGradient}`
                  : `bg-gradient-to-r ${noteGradient}`
            } ${isActive ? noteShape.activeClass : ''}`}
            style={{
              left: `${x}%`,
              top: `${pitchY}%`,
              width: `${noteWidthPercent}%`,
              height: `${noteHeight}px`,
              transform: 'translateY(-50%)',
              boxShadow: isActive ? activeGlow : 'none',
              opacity: x > 120 || x < -30 ? 0 : 1,
              ...noteShape.style,
            }}
          />
        );
      })}

      {/* Pitch Indicator */}
      {(isTop ? detectedNote !== null : detectedPitch !== null) && detectedNote !== null && (
        <div
          className={`absolute z-30 w-8 h-8 rounded-full bg-gradient-to-r ${isTop ? 'from-cyan-400 to-cyan-600 shadow-lg shadow-cyan-500/70' : 'from-pink-400 to-pink-600 shadow-lg shadow-pink-500/70'} flex items-center justify-center ring-2 ${isTop ? 'ring-cyan-300' : 'ring-pink-300'}`}
          style={{
            left: `${SING_LINE_POSITION - 1.5}%`,
            top: `${HALF_VISIBLE_TOP + HALF_VISIBLE_RANGE - ((detectedNote - pitchStats.minPitch) / pitchStats.pitchRange) * HALF_VISIBLE_RANGE}%`,
            transform: 'translateY(-50%)',
          }}
        >
          <MicIcon className="w-4 h-4 text-white" />
        </div>
      )}

      {/* Player Label */}
      <div
        className={`absolute ${isTop ? 'top-2' : 'top-2'} left-4 z-20 bg-black/50 backdrop-blur-sm rounded-lg px-2 py-1 border ${borderColor}`}
      >
        <div className="flex items-center gap-2">
          <div
            className={`w-6 h-6 rounded-full ${bgColor} flex items-center justify-center text-xs font-bold text-white`}
          >
            {playerLabel}
          </div>
          <span className={`text-xs ${textColor}`}>{playerName}</span>
        </div>
      </div>

      {/* Lyrics Display */}
      {displayLine && (
        <div
          className={`absolute ${isTop ? 'bottom-2' : 'bottom-2'} left-0 right-0 z-20 bg-gradient-to-t from-black/60 to-transparent py-1.5 px-4`}
        >
          <div className="text-lg md:text-xl font-bold text-center">
            <LyricLineDisplay
              line={displayLine}
              currentTime={currentTime}
              playerColor={isTop ? '#22d3ee' : '#ec4899'}
              noteDisplayStyle={noteDisplayStyle}
              notePerformance={notePerformance}
              gameMode={gameMode}
              missingWordsIndices={missingWordsIndices}
              isBlindSection={isBlindSection}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// VS Badge with scores
function VSBadge({
  p1Score,
  p1Combo,
  p2Score,
  p2Combo,
}: {
  p1Score: number;
  p1Combo: number;
  p2Score: number;
  p2Combo: number;
}) {
  return (
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 flex items-center gap-3">
      {/* P1 Score */}
      <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1 border border-cyan-500/30">
        <div className="w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center text-[10px] font-bold text-white">
          P1
        </div>
        <span className="text-sm font-bold text-cyan-400">
          {p1Score.toLocaleString()}
        </span>
        <span className="text-[10px] text-cyan-300/60">{p1Combo}x</span>
      </div>

      {/* VS Badge */}
      <div className="bg-gradient-to-r from-cyan-500 to-pink-500 text-white font-bold px-4 py-1.5 rounded-full text-base shadow-lg ring-2 ring-white/20">
        VS
      </div>

      {/* P2 Score */}
      <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1 border border-pink-500/30">
        <div className="w-5 h-5 rounded-full bg-pink-500 flex items-center justify-center text-[10px] font-bold text-white">
          P2
        </div>
        <span className="text-sm font-bold text-pink-400">
          {p2Score.toLocaleString()}
        </span>
        <span className="text-[10px] text-pink-300/60">{p2Combo}x</span>
      </div>
    </div>
  );
}

// Main component
export function DuetModeView({
  p1VisibleNotes,
  p1PitchStats,
  p1Score,
  p1Combo,
  p1DetectedPitch,
  p1DetectedNote,
  p1PlayerName,
  p1Lines,
  p2VisibleNotes,
  p2PitchStats,
  p2Score,
  p2Combo,
  p2DetectedPitch,
  p2DetectedNote,
  p2PlayerName,
  p2Lines,
  currentTime,
  noteShapeStyle,
  noteDisplayStyle,
  notePerformance,
  gameMode,
  missingWordsIndices,
  isBlindSection,
  pitchResult,
}: DuetModeViewProps) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col">
      {/* P1 (Top Half) */}
      <DuetPlayerHalf
        playerLabel="P1"
        playerName={p1PlayerName || 'Player 1'}
        playerColor="cyan"
        visibleNotes={p1VisibleNotes}
        pitchStats={p1PitchStats}
        currentTime={currentTime}
        noteShapeStyle={noteShapeStyle}
        detectedPitch={p1DetectedPitch}
        detectedNote={pitchResult?.note ?? null}
        score={p1Score}
        combo={p1Combo}
        lines={p1Lines}
        noteDisplayStyle={noteDisplayStyle}
        notePerformance={notePerformance}
        gameMode={gameMode}
        missingWordsIndices={missingWordsIndices}
        isBlindSection={isBlindSection}
      />

      {/* VS Badge */}
      <VSBadge p1Score={p1Score} p1Combo={p1Combo} p2Score={p2Score} p2Combo={p2Combo} />

      {/* P2 (Bottom Half) */}
      <DuetPlayerHalf
        playerLabel="P2"
        playerName={p2PlayerName || 'Player 2'}
        playerColor="pink"
        visibleNotes={p2VisibleNotes}
        pitchStats={p2PitchStats}
        currentTime={currentTime}
        noteShapeStyle={noteShapeStyle}
        detectedPitch={p2DetectedPitch}
        detectedNote={p2DetectedPitch ? Math.round(12 * (Math.log2(p2DetectedPitch / 440)) + 69) : null}
        score={p2Score}
        combo={p2Combo}
        lines={p2Lines}
        noteDisplayStyle={noteDisplayStyle}
        notePerformance={notePerformance}
        gameMode={gameMode}
        missingWordsIndices={missingWordsIndices}
        isBlindSection={isBlindSection}
      />
    </div>
  );
}
