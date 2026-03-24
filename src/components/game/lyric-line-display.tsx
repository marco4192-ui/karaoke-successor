'use client';

import React, { useState, useEffect, useRef } from 'react';
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
 * LyricLineDisplay Component
 * Shows lyrics with karaoke-style color progression
 * Shows the COMPLETE LINE at once (line ends with "-" in txt file)
 * Supports different lyrics styles from settings and note display modes
 * 
 * UltraStar format notes:
 * - Trailing space in lyric = word boundary
 * - No space = syllable connected to next note
 * - Hyphen in lyric = word break / visual separator
 */
export function LyricLineDisplay({
  line,
  currentTime,
  playerColor,
  noteDisplayStyle = 'classic',
  notePerformance = new Map(),
  gameMode = 'standard',
  missingWordsIndices = [],
  isBlindSection = false
}: LyricLineDisplayProps) {
  // Get lyrics style from localStorage - initialize with default to avoid hydration mismatch
  const [lyricsStyle, setLyricsStyle] = useState<string>('classic');
  const initialLoadDone = useRef(false);

  // Load initial value and listen for style changes
  useEffect(() => {
    const handleStyleChange = () => {
      const style = localStorage.getItem('karaoke-lyrics-style') || 'classic';
      setLyricsStyle(style);
    };

    // Load initial value on first effect run
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      handleStyleChange();
    }

    window.addEventListener('storage', handleStyleChange);
    // Also check periodically for changes (since storage events only fire in other tabs)
    const interval = setInterval(handleStyleChange, 1000);
    return () => {
      window.removeEventListener('storage', handleStyleChange);
      clearInterval(interval);
    };
  }, []);

  // Calculate note fill level based on performance (for fill-level mode)
  const getNoteFillLevel = (noteId: string, isActive: boolean): number => {
    if (!isActive) return 1; // Past notes show full
    const samples = notePerformance.get(noteId) || [];
    if (samples.length === 0) return 0;
    // Calculate fill based on recent hits
    const recentSamples = samples.slice(-5);
    const hitRate = recentSamples.filter(s => s.hit).length / recentSamples.length;
    return hitRate;
  };

  // Style configurations - each word can be: sung, active, or upcoming
  const getStyleClasses = (isSung: boolean, isActive: boolean) => {
    switch (lyricsStyle) {
      case 'concert':
        // Concert style: Big bold with dramatic glow
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
        // Retro style: Green terminal text with scanline effect
        return {
          textClass: isSung ? 'text-green-400' : isActive ? 'text-green-300' : 'text-green-700',
          fontClass: 'font-mono text-2xl md:text-3xl',
          shadowStyle: isSung
            ? { textShadow: `0 0 10px rgba(34, 197, 94, 0.9), 0 0 20px rgba(34, 197, 94, 0.5)` }
            : {}
        };
      case 'neon':
        // Neon style: Pink and cyan alternating glow
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
        // Minimal style: Clean, no shadows
        return {
          textClass: isSung ? 'text-white' : isActive ? 'text-white/90' : 'text-white/40',
          fontClass: 'font-medium text-2xl md:text-3xl',
          shadowStyle: {}
        };
      case 'classic':
      default:
        // Classic style: Original karaoke look
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
  };

  // Show ALL notes of the complete line - no sliding window
  // UltraStar format: trailing space in lyric = word boundary, no space = syllable
  // IMPORTANT: Use inline-block spans to preserve exact spacing from txt file
  // IMPORTANT: Hyphens in lyrics should be rendered with special styling for line breaks
  return (
    <span className="text-2xl md:text-3xl font-bold text-center inline" style={{ whiteSpace: 'pre-wrap' }}>
      {line.notes.map((note, idx) => {
        // Use startTime as noteId to match checkNoteHits (startTime is unique per note)
        const noteId = note.id || `note-${note.startTime}`;
        const noteEnd = note.startTime + note.duration;
        const isSung = currentTime >= noteEnd;
        const isActive = currentTime >= note.startTime && currentTime < noteEnd;

        // Get base style classes from lyricsStyle (concert, retro, neon, etc.)
        const { textClass, fontClass, shadowStyle } = getStyleClasses(isSung, isActive);

        // Apply note display mode styling - these are ADDITIVE to the base styles
        let finalTextClass = textClass;
        let finalShadowStyle = { ...shadowStyle };
        let fillClipStyle: React.CSSProperties = {};

        // Note: noteDisplayStyle only applies to SUNG notes (past notes)
        // This shows performance feedback after the note was sung
        if (noteDisplayStyle === 'fill-level' && isSung) {
          // Fill-level mode: Show how much of the note was hit correctly
          const fillLevel = getNoteFillLevel(noteId, false);
          if (fillLevel < 1) {
            fillClipStyle = {
              background: `linear-gradient(90deg, ${playerColor} ${fillLevel * 100}%, rgba(255,255,255,0.3) ${fillLevel * 100}%)`,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            };
          }
        } else if (noteDisplayStyle === 'color-feedback' && isSung) {
          // Color-feedback mode: Color based on accuracy (green=perfect, cyan=great, blue=good, orange=ok, red=miss)
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
          // Glow-intensity mode: Glow intensity based on accuracy
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

        // Render the lyric text exactly as stored (spaces preserved by whiteSpace: 'pre-wrap')
        // Handle hyphenated syllables: if lyric ends with hyphen, it's a syllable break
        let displayLyric = note.lyric || '';

        // Check if this lyric is ONLY a hyphen - force a line break after it
        const isHyphenOnly = displayLyric.trim() === '-';

        // MISSING WORDS MODE: Hide certain words (replace with underscores or blanks)
        const isMissingWord = gameMode === 'missing-words' && missingWordsIndices.includes(idx);

        // BLIND KARAOKE MODE: Hide all lyrics in blind sections
        const shouldHideLyric = isBlindSection && gameMode === 'blind';

        // Render the lyric - with special handling for game modes
        let renderedLyric = displayLyric;
        if (shouldHideLyric) {
          // In blind mode, show underscores or blanks for the entire line
          renderedLyric = displayLyric.replace(/[^-\s]/g, '_');
        } else if (isMissingWord && !isSung) {
          // In missing-words mode, hide specific words until they're sung
          // Show underscores for hidden words
          renderedLyric = displayLyric.replace(/[^-\s]/g, '_');
        }

        // Preserve trailing spaces - they indicate word boundaries
        // Use display: inline instead of inline-block to preserve whitespace correctly
        return (
          <span key={noteId} style={{ display: 'inline' }}>
            <span
              className={`${fontClass} ${finalTextClass} transition-all duration-100 ${isMissingWord && !isSung ? 'tracking-wider' : ''}`}
              style={{ ...finalShadowStyle, ...fillClipStyle, display: 'inline' }}
            >
              {renderedLyric}
            </span>
            {isHyphenOnly && <br />}
          </span>
        );
      })}
    </span>
  );
}

export default LyricLineDisplay;
