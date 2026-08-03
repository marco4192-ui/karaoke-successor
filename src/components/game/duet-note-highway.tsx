'use client';

import React, { useMemo } from 'react';
import { LyricLine, Player, type GameMode } from '@/types/game';
import { NoteHighway, NoteWithLine } from './note-highway';
import { LyricLineDisplay } from './lyric-line-display';
import { type PitchStats } from '@/lib/game/note-utils';
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
  p1VisibleNotes: NoteWithLine[];
  p2VisibleNotes: NoteWithLine[];
  p1PitchStats: PitchStats;
  p2PitchStats: PitchStats;
  currentTime: number;
  p1State: Player;
  p2State: PlayerScoringState;
  p2Player?: Player;
  p1Lines?: LyricLine[];
  p2Lines?: LyricLine[];
  singLinePosition?: number;
  noteWindow?: number;
  notePerformance?: Map<string, Array<{ time: number; accuracy: number; hit: boolean; sungPitch?: number | null }>>;
  p2NotePerformance?: Map<string, Array<{ time: number; accuracy: number; hit: boolean; sungPitch?: number | null }>>;
  gameMode?: GameMode;
  missingWordsIndices?: number[];
  isBlindSection?: boolean;
  isBlindHardcore?: boolean;
  hardcoreMissingWords?: boolean;
  p1PlayerName?: string;
  p2PlayerName?: string;
}

// ===================== SUB-COMPONENTS =====================

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
  const p1Color = p1State.color || '#22d3ee';
  const p2Color = p2Player?.color || '#ec4899';

  return (
    <div className="relative flex items-center justify-center z-30" style={{ height: '8%' }}>
      <div className="absolute inset-0 bg-black/10 border-y border-white/5" />

      <div className="relative flex items-center gap-2 px-4 py-1">
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

      <div className="relative mx-3 bg-gradient-to-r from-cyan-500 via-white to-pink-500 text-black font-black px-5 py-1.5 rounded-xl text-lg shadow-lg ring-2 ring-white/30">
        VS
      </div>

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

const PlayerLyrics = React.memo(function PlayerLyrics({
  lines,
  currentTime,
  playerColor,
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
  notePerformance?: Map<string, Array<{ time: number; accuracy: number; hit: boolean; sungPitch?: number | null }>>;
  gameMode?: GameMode;
  missingWordsIndices?: number[];
  isBlindSection?: boolean;
  isBlindHardcore?: boolean;
  hardcoreMissingWords?: boolean;
}) {
  const { displayLine, nextLine, shouldHidePreview, previewText } = useMemo(() => {
    if (!lines) return { displayLine: null, nextLine: null, shouldHidePreview: false, previewText: null };

    let currentLine = lines.find(line =>
      currentTime >= line.startTime && currentTime <= line.endTime
    );

    if (!currentLine) {
      for (const line of lines) {
        if (currentTime >= line.startTime - PREVIEW_TIME && currentTime < line.startTime) {
          currentLine = line;
          break;
        }
      }
    }

    if (!currentLine) return { displayLine: null, nextLine: null, shouldHidePreview: false, previewText: null };

    const currentIndex = lines.findIndex(line => line === currentLine);
    const next = currentIndex >= 0 ? lines[currentIndex + 1] : null;

    let hidePreview = false;
    if (gameMode === 'blind') {
      if (isBlindSection) hidePreview = true;
      else if (isBlindHardcore) hidePreview = true;
    }

    let computedPreviewText: string | null = null;
    if (next) {
      if (gameMode === 'missing-words' && missingWordsIndices && missingWordsIndices.length > 0) {
        if (missingWordsIndices.includes(next.startTime)) {
          computedPreviewText = null;
        } else {
          const hasHiddenWords = next.notes.some(n => missingWordsIndices.includes(n.startTime));
          if (!hasHiddenWords) {
            computedPreviewText = next.notes.map(n => n.lyric).join('');
          } else {
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
          notePerformance={notePerformance}
          gameMode={gameMode}
          missingWordsIndices={missingWordsIndices}
          isBlindSection={isBlindSection}
          isBlindHardcore={isBlindHardcore}
          hardcoreMissingWords={hardcoreMissingWords}
        />
      </div>
      {nextLine && !shouldHidePreview && previewText && (
        <p className="text-xs text-center text-white/30 mt-0.5 truncate">
          {previewText}
        </p>
      )}
    </div>
  );
});

const HALF_VISIBLE_TOP = 8;
const HALF_VISIBLE_RANGE = 42;

// ===================== MAIN COMPONENT =====================

export const DuetNoteHighway = React.memo(function DuetNoteHighway({
  p1VisibleNotes,
  p2VisibleNotes,
  p1PitchStats,
  p2PitchStats,
  currentTime,
  p1State,
  p2State,
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
}: DuetNoteHighwayProps) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col">
      <div className="relative overflow-hidden" style={{ height: '46%' }}>
        <NoteHighway
          visibleNotes={p1VisibleNotes}
          currentTime={currentTime}
          pitchStats={p1PitchStats}
          notePerformance={notePerformance}
          singLinePosition={singLinePosition}
          noteWindow={noteWindow}
          playerColor="#22d3ee"
          showPlayerLabel={true}
          playerName={p1PlayerName}
          playerNumber={1}
          visibleTop={HALF_VISIBLE_TOP}
          visibleRange={HALF_VISIBLE_RANGE}
          isBlindSection={isBlindSection}
        />

        <PlayerLyrics
          lines={p1Lines}
          currentTime={currentTime}
          playerColor="#22d3ee"
          notePerformance={notePerformance}
          gameMode={gameMode}
          missingWordsIndices={missingWordsIndices}
          isBlindSection={isBlindSection}
          isBlindHardcore={isBlindHardcore}
          hardcoreMissingWords={hardcoreMissingWords}
        />
      </div>

      <CenterScoreBar p1State={p1State} p2State={p2State} p1Name={p1PlayerName} p2Name={p2PlayerName} p2Player={p2Player} />

      <div className="relative overflow-hidden" style={{ height: '46%' }}>
        <NoteHighway
          visibleNotes={p2VisibleNotes}
          currentTime={currentTime}
          pitchStats={p2PitchStats}
          notePerformance={p2NotePerformance}
          singLinePosition={singLinePosition}
          noteWindow={noteWindow}
          playerColor="#ec4899"
          showPlayerLabel={true}
          playerName={p2PlayerName}
          playerNumber={2}
          visibleTop={HALF_VISIBLE_TOP}
          visibleRange={HALF_VISIBLE_RANGE}
          isBlindSection={isBlindSection}
        />

        <PlayerLyrics
          lines={p2Lines}
          currentTime={currentTime}
          playerColor="#ec4899"
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
