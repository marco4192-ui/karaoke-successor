'use client';

import React, { useState, useEffect, useRef, memo, useMemo, useCallback } from 'react';
import { LyricLine } from '@/types/game';

// Game mode type for the lyric display
export type GameModeType = 'standard' | 'pass-the-mic' | 'companion-singalong' | 'medley' | 'missing-words' | 'duel' | 'blind' | 'tournament' | 'battle-royale' | 'duet' | 'online';

// Note display style type
export type NoteDisplayStyleType = 'classic' | 'fill-level' | 'color-feedback' | 'glow-intensity';

interface LyricLineDisplayProps {
  line: LyricLine;
  currentTime: number;
  playerColor: string;
  noteDisplayStyle?: NoteDisplayStyleType;
  notePerformance?: Map<string, Array<{ time: number; accuracy: number; hit: boolean }>>;
  gameMode?: GameModeType;
  missingWordsIndices?: number[];
  isBlindSection?: boolean;
}

/**
 * Get note fill level based on performance (for fill-level mode)
 * Extracted as pure function for memoization
 */
function getNoteFillLevel(
  noteId: string, 
  notePerformance: Map<string, Array<{ time: number; accuracy: number; hit: boolean }>>,
  isActive: boolean
): number {
  if (!isActive) return 1;
  const samples = notePerformance.get(noteId) || [];
  if (samples.length === 0) return 0;
  const recentSamples = samples.slice(-5);
  const hitRate = recentSamples.filter(s => s.hit).length / recentSamples.length;
  return hitRate;
}

/**
 * Style configurations for different lyrics styles
 * Returns style classes based on sung/active state
 */
function getStyleClasses(
  lyricsStyle: string,
  isSung: boolean,
  isActive: boolean,
  playerColor: string
): { textClass: string; fontClass: string; shadowStyle: React.CSSProperties } {
  switch (lyricsStyle) {
    case 'concert':
      return {
        textClass: isSung ? 'text-yellow-400' : isActive ? 'text-white' : 'text-white/40',
        fontClass: isSung || isActive ? 'font-black text-3xl md:text-4xl' : 'font-bold text-2xl md:text-3xl',
        shadowStyle: isSung
          ? { textShadow: `0 0 30px rgba(255, 200, 0, 0.9), 0 0 60px rgba(255, 200, 0, 0.5)` }
          : isActive
            ? { textShadow: '0 0 20px rgba(255, 255, 255, 0.8)' }
            : {}
      };
    case 'retro':
      return {
        textClass: isSung ? 'text-green-400' : isActive ? 'text-green-300' : 'text-green-700',
        fontClass: 'font-mono text-2xl md:text-3xl',
        shadowStyle: isSung
          ? { textShadow: `0 0 10px rgba(34, 197, 94, 0.9), 0 0 20px rgba(34, 197, 94, 0.5)` }
          : {}
      };
    case 'neon':
      return {
        textClass: isSung ? 'text-pink-400' : isActive ? 'text-cyan-400' : 'text-white/40',
        fontClass: 'font-bold text-2xl md:text-3xl',
        shadowStyle: isSung
          ? { textShadow: `0 0 20px rgba(236, 72, 153, 0.9), 0 0 40px rgba(236, 72, 153, 0.6)` }
          : isActive
            ? { textShadow: '0 0 20px rgba(34, 211, 238, 0.8)' }
            : {}
      };
    case 'minimal':
      return {
        textClass: isSung ? 'text-white' : isActive ? 'text-white/90' : 'text-white/40',
        fontClass: 'font-medium text-2xl md:text-3xl',
        shadowStyle: {}
      };
    case 'classic':
    default:
      return {
        textClass: isSung ? '' : isActive ? 'text-white' : 'text-white/50',
        fontClass: isSung || isActive ? 'font-bold text-2xl md:text-3xl' : 'font-normal text-2xl md:text-3xl',
        shadowStyle: isSung
          ? { color: playerColor, textShadow: `0 0 15px ${playerColor}80` }
          : isActive
            ? { textShadow: '0 0 10px rgba(255,255,255,0.5)' }
            : {}
      };
  }
}

/**
 * Memoized single note span component
 * Only re-renders when the note state changes
 */
const NoteSpan = memo(function NoteSpan({
  note,
  noteIndex,
  currentTime,
  lyricsStyle,
  playerColor,
  noteDisplayStyle,
  notePerformance,
  gameMode,
  missingWordsIndices,
  isBlindSection,
}: {
  note: LyricLine['notes'][0];
  noteIndex: number;
  currentTime: number;
  lyricsStyle: string;
  playerColor: string;
  noteDisplayStyle: NoteDisplayStyleType;
  notePerformance: Map<string, Array<{ time: number; accuracy: number; hit: boolean }>>;
  gameMode: GameModeType;
  missingWordsIndices: number[];
  isBlindSection: boolean;
}) {
  const noteId = note.id || `note-${note.startTime}`;
  const noteEnd = note.startTime + note.duration;
  const isSung = currentTime >= noteEnd;
  const isActive = currentTime >= note.startTime && currentTime < noteEnd;

  // Get base style classes
  const { textClass, fontClass, shadowStyle } = useMemo(
    () => getStyleClasses(lyricsStyle, isSung, isActive, playerColor),
    [lyricsStyle, isSung, isActive, playerColor]
  );

  // Calculate note display mode styling
  const { finalTextClass, finalShadowStyle, fillClipStyle } = useMemo(() => {
    let finalTextClass = textClass;
    let finalShadowStyle = { ...shadowStyle };
    let fillClipStyle: React.CSSProperties = {};

    if (noteDisplayStyle === 'fill-level' && isSung) {
      const fillLevel = getNoteFillLevel(noteId, notePerformance, false);
      if (fillLevel < 1) {
        fillClipStyle = {
          background: `linear-gradient(90deg, ${playerColor} ${fillLevel * 100}%, rgba(255,255,255,0.3) ${fillLevel * 100}%)`,
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
        };
      }
    } else if (noteDisplayStyle === 'color-feedback' && isSung) {
      const samples = notePerformance.get(noteId) || [];
      if (samples.length > 0) {
        const avgAccuracy = samples.reduce((sum, s) => sum + s.accuracy, 0) / samples.length;
        if (avgAccuracy > 0.9) finalTextClass = 'text-green-400';
        else if (avgAccuracy > 0.7) finalTextClass = 'text-cyan-400';
        else if (avgAccuracy > 0.5) finalTextClass = 'text-blue-400';
        else if (avgAccuracy > 0.3) finalTextClass = 'text-orange-400';
        else finalTextClass = 'text-red-400';
      }
    } else if (noteDisplayStyle === 'glow-intensity' && isSung) {
      const samples = notePerformance.get(noteId) || [];
      if (samples.length > 0) {
        const avgAccuracy = samples.reduce((sum, s) => sum + s.accuracy, 0) / samples.length;
        const intensity = avgAccuracy * 50;
        const glowColor = avgAccuracy > 0.7 ? '34, 197, 94' : avgAccuracy > 0.4 ? '34, 211, 238' : '239, 68, 68';
        finalShadowStyle = {
          ...shadowStyle,
          textShadow: `0 0 ${intensity}px rgba(${glowColor}, ${avgAccuracy}), 0 0 ${intensity * 2}px rgba(${glowColor}, ${avgAccuracy * 0.5})`,
        };
      }
    }

    return { finalTextClass, finalShadowStyle, fillClipStyle };
  }, [noteDisplayStyle, isSung, noteId, notePerformance, playerColor, shadowStyle, textClass]);

  // Handle lyric text
  const { renderedLyric, isHyphenOnly } = useMemo(() => {
    let displayLyric = note.lyric || '';
    const isHyphenOnly = displayLyric.trim() === '-';
    const isMissingWord = gameMode === 'missing-words' && missingWordsIndices.includes(noteIndex);
    const shouldHideLyric = isBlindSection && gameMode === 'blind';

    let renderedLyric = displayLyric;
    if (shouldHideLyric) {
      renderedLyric = displayLyric.replace(/[^-\s]/g, '_');
    } else if (isMissingWord && !isSung) {
      renderedLyric = displayLyric.replace(/[^-\s]/g, '_');
    }

    return { renderedLyric, isHyphenOnly };
  }, [note.lyric, gameMode, missingWordsIndices, noteIndex, isBlindSection, isSung]);

  const isMissingWord = gameMode === 'missing-words' && missingWordsIndices.includes(noteIndex);

  return (
    <span style={{ display: 'inline' }}>
      <span
        className={`${fontClass} ${finalTextClass} transition-all duration-100 ${isMissingWord && !isSung ? 'tracking-wider' : ''}`}
        style={{ ...finalShadowStyle, ...fillClipStyle, display: 'inline' }}
      >
        {renderedLyric}
      </span>
      {isHyphenOnly && <br />}
    </span>
  );
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if note state changes
  // This is critical for performance during gameplay
  
  // Check if time crossed note boundaries (sung/active state change)
  const prevNoteEnd = prevProps.note.startTime + prevProps.note.duration;
  const nextNoteEnd = nextProps.note.startTime + nextProps.note.duration;
  
  const prevIsSung = prevProps.currentTime >= prevNoteEnd;
  const nextIsSung = nextProps.currentTime >= nextNoteEnd;
  if (prevIsSung !== nextIsSung) return false;
  
  const prevIsActive = prevProps.currentTime >= prevProps.note.startTime && prevProps.currentTime < prevNoteEnd;
  const nextIsActive = nextProps.currentTime >= nextProps.note.startTime && nextProps.currentTime < nextNoteEnd;
  if (prevIsActive !== nextIsActive) return false;
  
  // Check other prop changes
  if (prevProps.lyricsStyle !== nextProps.lyricsStyle) return false;
  if (prevProps.playerColor !== nextProps.playerColor) return false;
  if (prevProps.noteDisplayStyle !== nextProps.noteDisplayStyle) return false;
  if (prevProps.gameMode !== nextProps.gameMode) return false;
  if (prevProps.isBlindSection !== nextProps.isBlindSection) return false;
  
  // Skip re-render if only currentTime changed within the same state
  return true;
});

/**
 * LyricLineDisplay Component
 * Shows lyrics with karaoke-style color progression
 * Optimized with React.memo for minimal re-renders
 */
function LyricLineDisplayInternal({
  line,
  currentTime,
  playerColor,
  noteDisplayStyle = 'classic',
  notePerformance = new Map(),
  gameMode = 'standard',
  missingWordsIndices = [],
  isBlindSection = false
}: LyricLineDisplayProps) {
  // Get lyrics style from localStorage
  const [lyricsStyle, setLyricsStyle] = useState<string>('classic');
  const initialLoadDone = useRef(false);

  // Load initial value and listen for style changes
  useEffect(() => {
    const handleStyleChange = () => {
      const style = localStorage.getItem('karaoke-lyrics-style') || 'classic';
      setLyricsStyle(style);
    };

    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      handleStyleChange();
    }

    window.addEventListener('storage', handleStyleChange);
    const interval = setInterval(handleStyleChange, 1000);
    return () => {
      window.removeEventListener('storage', handleStyleChange);
      clearInterval(interval);
    };
  }, []);

  // Memoize notePerformance to avoid reference changes
  const notePerformanceRef = useRef(notePerformance);
  if (notePerformance !== notePerformanceRef.current) {
    notePerformanceRef.current = notePerformance;
  }

  return (
    <span className="text-2xl md:text-3xl font-bold text-center inline" style={{ whiteSpace: 'pre-wrap' }}>
      {line.notes.map((note, idx) => (
        <NoteSpan
          key={note.id || `note-${note.startTime}`}
          note={note}
          noteIndex={idx}
          currentTime={currentTime}
          lyricsStyle={lyricsStyle}
          playerColor={playerColor}
          noteDisplayStyle={noteDisplayStyle}
          notePerformance={notePerformanceRef.current}
          gameMode={gameMode}
          missingWordsIndices={missingWordsIndices}
          isBlindSection={isBlindSection}
        />
      ))}
    </span>
  );
}

// Export with React.memo
export const LyricLineDisplay = memo(LyricLineDisplayInternal);

export default LyricLineDisplay;
