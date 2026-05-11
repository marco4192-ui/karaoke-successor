'use client';

import React, { useMemo } from 'react';
import { LyricLine, Player, type GameMode } from '@/types/game';
import { NoteHighway, NoteWithLine, PitchStats } from './note-highway';
import { LyricLineDisplay } from './lyric-line-display';
import { NoteShapeStyle, NoteDisplayStyle } from '@/lib/game/note-utils';

// ===================== TYPES =====================

export interface PlayerScoringState {
  score: number;
  combo: number;
  maxCombo: number;
  notesHit: number;
  notesMissed: number;
  name?: string;
  avatar?: string;
  color?: string;
}

export interface DuetNoteHighwayProps {
  /** P1 visible notes */
  p1VisibleNotes: NoteWithLine[];
  /** P2 visible notes */
  p2VisibleNotes: NoteWithLine[];
  /** P1 pitch statistics */
  p1PitchStats: PitchStats;
  /** P2 pitch statistics */
  p2PitchStats: PitchStats;
  /** Current game time in milliseconds */
  currentTime: number;
  /** P1 detected pitch (MIDI note number) */
  p1DetectedPitch: number | null;
  /** P2 detected pitch (MIDI note number) */
  p2DetectedPitch: number | null;
  /** P1 score and stats */
  p1State: Player;
  /** P2 score and stats */
  p2State: PlayerScoringState;
  /** P2 player profile (for avatar + color display in score bar) */
  p2Player?: Player;
  /** Note shape style from settings */
  noteShapeStyle: NoteShapeStyle;
  /** P1 lines for lyrics */
  p1Lines?: LyricLine[];
  /** P2 lines for lyrics */
  p2Lines?: LyricLine[];
  /** Position of the sing line (percentage from left) */
  singLinePosition?: number;
  /** Time window for note display (milliseconds) */
  noteWindow?: number;
  /** Note performance for lyrics display */
  notePerformance?: Map<string, Array<{ time: number; accuracy: number; hit: boolean }>>;
  /** Game mode */
  gameMode?: GameMode;
  /** Missing words indices for missing-words mode */
  missingWordsIndices?: number[];
  /** Is blind section for blind mode */
  isBlindSection?: boolean;
  /** P1 player name */
  p1PlayerName?: string;
  /** P2 player name */
  p2PlayerName?: string;
  /** Note display style */
  noteDisplayStyle?: NoteDisplayStyle;
}

// ===================== SUB-COMPONENTS =====================

/**
 * Center score bar with VS badge for duet mode
 */
const CenterScoreBar = React.memo(function CenterScoreBar({
  p1State,
  p2State,
  p1Name = 'Player 1',
  p2Name = 'Player 2',
  p2Player,
}: {
  p1State: Player;
  p2State: PlayerScoringState;
  p1Name?: string;
  p2Name?: string;
  p2Player?: Player;
}) {
  const p1Avatar = (p1State as Player)?.avatar;
  const p2Avatar = p2Player?.avatar;
  const p1Color = (p1State as Player)?.color || '#22d3ee';
  const p2Color = p2Player?.color || '#ec4899';

  return (
    <div className="relative flex items-center justify-center z-30" style={{ height: '8%' }}>
      {/* Background gradient for the score bar - very transparent to show game behind */}
      <div className="absolute inset-0 bg-black/10 border-y border-white/5" />

      {/* P1 Score - Left */}
      <div className="relative flex items-center gap-2 px-4 py-1">
        {/* Avatar */}
        {p1Avatar ? (
          <img src={p1Avatar} alt={p1Name} className="w-8 h-8 rounded-full object-cover border-2" style={{ borderColor: p1Color }} />
        ) : (
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white border-2" style={{ backgroundColor: p1Color, borderColor: p1Color }}>
            {p1Name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex flex-col">
          <span className="text-xs font-medium text-cyan-300/80 leading-tight truncate max-w-[80px]">
            {p1Name}
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-cyan-400 leading-tight" suppressHydrationWarning>
              {p1State?.score?.toLocaleString?.() ?? 0}
            </span>
            <span className="text-xs text-cyan-300/60" suppressHydrationWarning>
              {p1State?.combo ?? 0}x
            </span>
          </div>
        </div>
      </div>

      {/* VS Badge */}
      <div className="relative mx-3 bg-gradient-to-r from-cyan-500 via-white to-pink-500 text-black font-black px-5 py-1.5 rounded-xl text-lg shadow-lg ring-2 ring-white/30">
        VS
      </div>

      {/* P2 Score - Right */}
      <div className="relative flex items-center gap-2 px-4 py-1">
        <div className="flex flex-col items-end">
          <span className="text-xs font-medium text-pink-300/80 leading-tight truncate max-w-[80px]">
            {p2Name}
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xs text-pink-300/60" suppressHydrationWarning>
              {p2State?.combo ?? 0}x
            </span>
            <span className="text-xl font-bold text-pink-400 leading-tight" suppressHydrationWarning>
              {p2State?.score?.toLocaleString?.() ?? 0}
            </span>
          </div>
        </div>
        {/* Avatar */}
        {p2Avatar ? (
          <img src={p2Avatar} alt={p2Name} className="w-8 h-8 rounded-full object-cover border-2" style={{ borderColor: p2Color }} />
        ) : (
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white border-2" style={{ backgroundColor: p2Color, borderColor: p2Color }}>
            {p2Name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
    </div>
  );
});

/**
 * Lyrics display for a player's section
 */
function PlayerLyrics({
  lines,
  currentTime,
  playerColor,
  noteDisplayStyle,
  notePerformance,
  gameMode,
  missingWordsIndices,
  isBlindSection,
}: {
  lines?: LyricLine[];
  currentTime: number;
  playerColor: string;
  noteDisplayStyle?: NoteDisplayStyle;
  notePerformance?: Map<string, Array<{ time: number; accuracy: number; hit: boolean }>>;
  gameMode?: GameMode;
  missingWordsIndices?: number[];
  isBlindSection?: boolean;
}) {
  const PREVIEW_TIME = 2000;

  const { displayLine, nextLine } = useMemo(() => {
    if (!lines) return { displayLine: null, nextLine: null };

    // Find current line
    let currentLine = lines.find(line =>
      currentTime >= line.startTime && currentTime <= line.endTime
    );

    // If no current line, look for upcoming line
    if (!currentLine) {
      for (const line of lines) {
        if (currentTime >= line.startTime - PREVIEW_TIME && currentTime < line.startTime) {
          currentLine = line;
          break;
        }
      }
    }

    if (!currentLine) return { displayLine: null, nextLine: null };

    // Find next line for preview
    const currentIndex = lines.findIndex(line => line === currentLine);
    const next = currentIndex >= 0 ? lines[currentIndex + 1] : null;

    return { displayLine: currentLine, nextLine: next };
  }, [lines, currentTime]);

  if (!displayLine) return null;

  return (
    <div className="absolute bottom-2 left-0 right-0 z-20 bg-gradient-to-t from-black/60 to-transparent py-1.5 px-4">
      <div className="text-lg md:text-xl font-bold text-center">
        <LyricLineDisplay
          line={displayLine}
          currentTime={currentTime}
          playerColor={playerColor}
          noteDisplayStyle={noteDisplayStyle}
          notePerformance={notePerformance}
          gameMode={gameMode}
          missingWordsIndices={missingWordsIndices}
          isBlindSection={isBlindSection}
        />
      </div>
      {/* Next Line Preview — smaller, faded text for orientation */}
      {nextLine && (
        <p className="text-xs text-center text-white/30 mt-0.5 truncate">
          {nextLine.notes.map(n => n.lyric).join('')}
        </p>
      )}
    </div>
  );
}

// ===================== CONSTANTS FOR HALF-SCREEN =====================

// Half-screen constants for duet mode
const HALF_VISIBLE_TOP = 8;
const HALF_VISIBLE_RANGE = 42;

// ===================== MAIN COMPONENT =====================

export function DuetNoteHighway({
  p1VisibleNotes,
  p2VisibleNotes,
  p1PitchStats,
  p2PitchStats,
  currentTime,
  p1DetectedPitch,
  p2DetectedPitch,
  p1State,
  p2State,
  noteShapeStyle,
  p1Lines,
  p2Lines,
  singLinePosition = 25,
  noteWindow = 4000,
  notePerformance,
  gameMode,
  missingWordsIndices,
  isBlindSection,
  p1PlayerName = 'Player 1',
  p2PlayerName = 'Player 2',
  p2Player,
  noteDisplayStyle = 'classic',
}: DuetNoteHighwayProps) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col">
      {/* ===== PLAYER 1 (TOP HALF - CYAN) - 46% ===== */}
      <div className="relative overflow-hidden" style={{ height: '46%' }}>
        <NoteHighway
          visibleNotes={p1VisibleNotes}
          currentTime={currentTime}
          pitchStats={p1PitchStats}
          detectedPitch={p1DetectedPitch}
          noteShapeStyle={noteShapeStyle}
          noteDisplayStyle={noteDisplayStyle}
          notePerformance={notePerformance}
          singLinePosition={singLinePosition}
          noteWindow={noteWindow}
          playerColor="#22d3ee"
          showPlayerLabel={true}
          playerName={p1PlayerName}
          playerNumber={1}
          visibleTop={HALF_VISIBLE_TOP}
          visibleRange={HALF_VISIBLE_RANGE}
        />

        {/* P1 Lyrics Display */}
        <PlayerLyrics
          lines={p1Lines}
          currentTime={currentTime}
          playerColor="#22d3ee"
          noteDisplayStyle={noteDisplayStyle}
          notePerformance={notePerformance}
          gameMode={gameMode}
          missingWordsIndices={missingWordsIndices}
          isBlindSection={isBlindSection}
        />
      </div>

      {/* ===== CENTER SCORE BAR with VS Badge - 8% ===== */}
      <CenterScoreBar p1State={p1State} p2State={p2State} p1Name={p1PlayerName} p2Name={p2PlayerName} p2Player={p2Player} />

      {/* ===== PLAYER 2 (BOTTOM HALF - PINK) - 46% ===== */}
      <div className="relative overflow-hidden" style={{ height: '46%' }}>
        <NoteHighway
          visibleNotes={p2VisibleNotes}
          currentTime={currentTime}
          pitchStats={p2PitchStats}
          detectedPitch={p2DetectedPitch}
          noteShapeStyle={noteShapeStyle}
          noteDisplayStyle={noteDisplayStyle}
          notePerformance={notePerformance}
          singLinePosition={singLinePosition}
          noteWindow={noteWindow}
          playerColor="#ec4899"
          showPlayerLabel={true}
          playerName={p2PlayerName}
          playerNumber={2}
          visibleTop={HALF_VISIBLE_TOP}
          visibleRange={HALF_VISIBLE_RANGE}
        />

        {/* P2 Lyrics Display */}
        <PlayerLyrics
          lines={p2Lines}
          currentTime={currentTime}
          playerColor="#ec4899"
          noteDisplayStyle={noteDisplayStyle}
          notePerformance={notePerformance}
          gameMode={gameMode}
          missingWordsIndices={missingWordsIndices}
          isBlindSection={isBlindSection}
        />
      </div>
    </div>
  );
}

export default DuetNoteHighway;
