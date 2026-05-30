'use client';

import React, { useMemo } from 'react';
import { LyricLine, Player, type GameMode } from '@/types/game';
import { NoteHighway, NoteWithLine } from './note-highway';
import { LyricLineDisplay } from './lyric-line-display';
import { NoteShapeStyle, NoteDisplayStyle, type PitchStats } from '@/lib/game/note-utils';
import { useTranslation } from '@/lib/i18n/translations';

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
  /** P1 note performance for visual display (fill-level, color-feedback, etc.) */
  notePerformance?: Map<string, Array<{ time: number; accuracy: number; hit: boolean }>>;
  /** P2 note performance — separate map so P1 hits don't bleed into P2's highway */
  p2NotePerformance?: Map<string, Array<{ time: number; accuracy: number; hit: boolean }>>;
  /** Game mode */
  gameMode?: GameMode;
  /** Missing words indices for missing-words mode */
  missingWordsIndices?: number[];
  /** Is blind section for blind mode */
  isBlindSection?: boolean;
  /** Hardcore blind mode */
  isBlindHardcore?: boolean;
  /** Hardcore missing words mode */
  hardcoreMissingWords?: boolean;
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
  p1Name,
  p2Name,
  p2Player,
}: {
  p1State: Player;
  p2State: PlayerScoringState;
  p1Name?: string;
  p2Name?: string;
  p2Player?: Player;
}) {
  const { t } = useTranslation();
  const resolvedP1Name = p1Name || t('prominentScore.player1');
  const resolvedP2Name = p2Name || t('prominentScore.player2');

  const p1Avatar = p1State.avatar;
  const p2Avatar = p2Player?.avatar;
  const p1Color = p1State.color || '#00F3B2';
  const p2Color = p2Player?.color || '#F939A3';

  return (
    <div className="relative flex items-center justify-center z-30" style={{ height: '8%' }}>
      {/* Background gradient for the score bar - very transparent to show game behind */}
      <div className="absolute inset-0 bg-black/10 border-y border-white/5" />

      {/* P1 Score - Left */}
      <div className="relative flex items-center gap-2 px-4 py-1">
        {/* Avatar */}
        {p1Avatar ? (
          <img src={p1Avatar} alt={resolvedP1Name} className="w-8 h-8 rounded-full object-cover border-2" style={{ borderColor: p1Color }} />
        ) : (
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white border-2" style={{ backgroundColor: p1Color, borderColor: p1Color }}>
            {resolvedP1Name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex flex-col">
          <span className="text-xs font-medium leading-tight truncate max-w-[80px]" style={{ color: p1Color }}>
            {resolvedP1Name}
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold leading-tight" style={{ color: p1Color }} suppressHydrationWarning>
              {p1State?.score?.toLocaleString?.() ?? 0}
            </span>
            <span className="text-xs" style={{ color: `${p1Color}99` }} suppressHydrationWarning>
              {p1State?.combo ?? 0}x
            </span>
          </div>
        </div>
      </div>

      {/* VS Badge */}
      <div className="relative mx-3 bg-yellow-400 text-black font-black px-5 py-1.5 rounded-xl text-lg border-2 border-black" style={{ boxShadow: '4px 4px 0px #000000' }}>
        VS
      </div>

      {/* P2 Score - Right */}
      <div className="relative flex items-center gap-2 px-4 py-1">
        <div className="flex flex-col items-end">
          <span className="text-xs font-medium leading-tight truncate max-w-[80px]" style={{ color: p2Color }}>
            {resolvedP2Name}
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xs" style={{ color: `${p2Color}99` }} suppressHydrationWarning>
              {p2State?.combo ?? 0}x
            </span>
            <span className="text-xl font-bold leading-tight" style={{ color: p2Color }} suppressHydrationWarning>
              {p2State?.score?.toLocaleString?.() ?? 0}
            </span>
          </div>
        </div>
        {/* Avatar */}
        {p2Avatar ? (
          <img src={p2Avatar} alt={resolvedP2Name} className="w-8 h-8 rounded-full object-cover border-2" style={{ borderColor: p2Color }} />
        ) : (
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white border-2" style={{ backgroundColor: p2Color, borderColor: p2Color }}>
            {resolvedP2Name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
    </div>
  );
});

const PREVIEW_TIME = 2000;

/**
 * Lyrics display for a player's section
 */
const PlayerLyrics = React.memo(function PlayerLyrics({
  lines,
  currentTime,
  playerColor,
  noteDisplayStyle,
  notePerformance,
  gameMode,
  missingWordsIndices,
  isBlindSection,
  isBlindHardcore,
  hardcoreMissingWords,
}: {
  lines?: LyricLine[];
  currentTime: number;
  playerColor: string;
  noteDisplayStyle?: NoteDisplayStyle;
  notePerformance?: Map<string, Array<{ time: number; accuracy: number; hit: boolean }>>;
  gameMode?: GameMode;
  missingWordsIndices?: number[];
  isBlindSection?: boolean;
  isBlindHardcore?: boolean;
  hardcoreMissingWords?: boolean;
}) {

  const { displayLine, nextLine, shouldHidePreview, previewText } = useMemo(() => {
    if (!lines) return { displayLine: null, nextLine: null, shouldHidePreview: false, previewText: null };

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

    if (!currentLine) return { displayLine: null, nextLine: null, shouldHidePreview: false, previewText: null };

    // Find next line for preview
    const currentIndex = lines.findIndex(line => line === currentLine);
    const next = currentIndex >= 0 ? lines[currentIndex + 1] : null;

    // Determine if preview should be entirely hidden (blind mode only)
    let hidePreview = false;
    if (gameMode === 'blind') {
      if (isBlindSection) hidePreview = true;
      else if (isBlindHardcore) hidePreview = true;
    }

    // Compute preview text with missing-words replacement applied.
    // Returns null if the entire next line is a hidden passage.
    let computedPreviewText: string | null = null;
    if (next) {
      if (gameMode === 'missing-words' && missingWordsIndices && missingWordsIndices.length > 0) {
        // Entire next line is a hidden passage → don't show preview
        if (missingWordsIndices.includes(next.startTime)) {
          computedPreviewText = null;
        } else {
          const hasHiddenWords = next.notes.some(n => missingWordsIndices.includes(n.startTime));
          if (!hasHiddenWords) {
            computedPreviewText = next.notes.map(n => n.lyric).join('');
          } else {
            // Some words hidden → replace only hidden words with underscores
            computedPreviewText = next.notes.map(n => {
              if (missingWordsIndices.includes(n.startTime)) {
                return n.lyric.replace(/[^-\s]/g, '_');
              }
              return n.lyric;
            }).join('');
          }
        }
      } else {
        computedPreviewText = next.notes.map(n => n.lyric).join('');
      }
    }

    return { displayLine: currentLine, nextLine: next, shouldHidePreview: hidePreview, previewText: computedPreviewText };
  }, [lines, currentTime, gameMode, isBlindSection, isBlindHardcore, missingWordsIndices]);

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
          isBlindHardcore={isBlindHardcore}
          hardcoreMissingWords={hardcoreMissingWords}
        />
      </div>
      {/* Next Line Preview — hidden in blind mode; in missing-words mode, hidden words shown as underscores */}
      {nextLine && !shouldHidePreview && previewText && (
        <p className="text-xs text-center text-white/30 mt-0.5 truncate">
          {previewText}
        </p>
      )}
    </div>
  );
});

// ===================== CONSTANTS FOR HALF-SCREEN =====================

// Half-screen constants for duet mode
const HALF_VISIBLE_TOP = 8;
const HALF_VISIBLE_RANGE = 42;

// ===================== MAIN COMPONENT =====================

export const DuetNoteHighway = React.memo(function DuetNoteHighway({
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
  p2NotePerformance,
  gameMode,
  missingWordsIndices,
  isBlindSection,
  isBlindHardcore,
  hardcoreMissingWords,
  p1PlayerName,
  p2PlayerName,
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
          playerColor="#00F3B2"
          showPlayerLabel={true}
          playerName={p1PlayerName}
          playerNumber={1}
          visibleTop={HALF_VISIBLE_TOP}
          visibleRange={HALF_VISIBLE_RANGE}
          isBlindSection={isBlindSection}
        />

        {/* P1 Lyrics Display */}
        <PlayerLyrics
          lines={p1Lines}
          currentTime={currentTime}
          playerColor="#00F3B2"
          noteDisplayStyle={noteDisplayStyle}
          notePerformance={notePerformance}
          gameMode={gameMode}
          missingWordsIndices={missingWordsIndices}
          isBlindSection={isBlindSection}
          isBlindHardcore={isBlindHardcore}
          hardcoreMissingWords={hardcoreMissingWords}
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
          notePerformance={p2NotePerformance}
          singLinePosition={singLinePosition}
          noteWindow={noteWindow}
          playerColor="#F939A3"
          showPlayerLabel={true}
          playerName={p2PlayerName}
          playerNumber={2}
          visibleTop={HALF_VISIBLE_TOP}
          visibleRange={HALF_VISIBLE_RANGE}
          isBlindSection={isBlindSection}
        />

        {/* P2 Lyrics Display */}
        <PlayerLyrics
          lines={p2Lines}
          currentTime={currentTime}
          playerColor="#F939A3"
          noteDisplayStyle={noteDisplayStyle}
          notePerformance={p2NotePerformance}
          gameMode={gameMode}
          missingWordsIndices={missingWordsIndices}
          isBlindSection={isBlindSection}
          isBlindHardcore={isBlindHardcore}
          hardcoreMissingWords={hardcoreMissingWords}
        />
      </div>
    </div>
  );
});

export default DuetNoteHighway;
