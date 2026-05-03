'use client';

/**
 * Low-Performance Note Lane (Code Review #6, 2026-04-17)
 *
 * Lightweight single-player note highway for low-end devices.
 * Used when the user enables "Low-Performance-Modus" in Game Settings.
 *
 * Differences from note-highway.tsx (full version):
 * - DOM-based rendering (no canvas, no performance maps)
 * - Single-player only (no duet/multiplayer split-screen)
 * - Classic note display only (no fill-level, color-feedback, glow-intensity)
 * - Built-in lyrics display at the bottom
 * - Fixed sing-line position (no customization)
 * - Accepts frequency-based pitch input (converts internally to MIDI)
 * - No particle effects, no spectrogram, no webcam
 *
 * Accepts raw frequency (Hz) as detectedPitch and converts to MIDI internally.
 */

import React, { useMemo, useState, useEffect } from 'react';
import { LyricLine, DIFFICULTY_SETTINGS, frequencyToMidi } from '@/types/game';
import { getStoredTheme } from '@/lib/game/themes';
import { parseNoteShape } from '@/hooks/use-game-settings';
import {
  NOTE_HEIGHT,
  PITCH_RANGE,
  NoteShapeStyle,
  getNoteShapeClassesForLane,
  getNoteBackgroundClasses,
  getNoteBoxShadow,
  calculatePitchY,
  NotePositionData,
} from '@/lib/game/note-utils';

interface NoteLaneProps {
  lyrics: LyricLine[];
  currentTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  detectedPitch: number | null;
  scrollSpeed?: number;
  windowHeight?: number;
}

// ===================== SUB-COMPONENTS =====================

/**
 * Pitch grid background lines
 */
function PitchGrid({ pitchRange }: { pitchRange: number }) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {Array.from({ length: pitchRange + 1 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-full border-t border-white/5"
          style={{
            top: `${(i / pitchRange) * 100}%`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Target line indicator showing where to sing
 */
function TargetLine() {
  return (
    <div
      className="absolute top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-cyan-400 to-transparent z-10"
      style={{ left: '8%' }}
    >
      <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-xs text-cyan-400 font-bold whitespace-nowrap">
        SING HERE →
      </div>
    </div>
  );
}

/**
 * Single note block component
 */
interface NoteBlockProps {
  data: NotePositionData;
  noteShape: {
    baseClass: string;
    activeClass: string;
    style: React.CSSProperties;
  };
  windowHeight: number;
}

function NoteBlock({ data, noteShape, windowHeight }: NoteBlockProps) {
  const backgroundClass = getNoteBackgroundClasses(data.isGolden, data.isBonus);
  const boxShadow = getNoteBoxShadow(data.isActive, data.isGolden);
  
  return (
    <div
      className={`absolute ${noteShape.baseClass} transition-all duration-75 ${
        data.isPast
          ? 'opacity-30'
          : data.isActive
          ? noteShape.activeClass
          : ''
      } ${backgroundClass}`}
      style={{
        left: `${Math.max(0, Math.min(90, data.x))}%`,
        top: `${(data.pitchY / windowHeight) * 100}%`,
        width: `${data.width}px`,
        height: `${NOTE_HEIGHT}px`,
        transform: 'translateY(-50%)',
        boxShadow,
        ...noteShape.style,
      }}
    >
      <span className="absolute inset-0 flex items-center justify-center text-base font-bold text-white drop-shadow-md px-2" style={{ whiteSpace: 'pre' }}>
        {data.lyric}
      </span>
    </div>
  );
}

/**
 * Current pitch indicator showing the singer's current pitch
 */
interface PitchIndicatorProps {
  pitchY: number | null;
  windowHeight: number;
}

function PitchIndicator({ pitchY, windowHeight }: PitchIndicatorProps) {
  if (pitchY === null) return null;
  
  return (
    <div
      className="absolute z-20"
      style={{
        left: '4%',
        top: `${(pitchY / windowHeight) * 100}%`,
        transform: 'translateY(-50%)',
        transition: 'top 80ms ease-out',
      }}
    >
      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 shadow-lg shadow-green-500/50 animate-pulse flex items-center justify-center">
        <svg
          className="w-6 h-6 text-white"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    </div>
  );
}

/**
 * Current lyrics display at the bottom
 */
interface CurrentLyricsProps {
  currentLine: LyricLine | null;
}

function CurrentLyrics({ currentLine }: CurrentLyricsProps) {
  if (!currentLine) return null;
  
  return (
    <div className="absolute bottom-4 left-0 right-0 text-center">
      <div className="inline-block px-6 py-3 bg-black/50 backdrop-blur-sm rounded-xl">
        <p className="text-2xl font-bold text-white drop-shadow-lg" style={{ whiteSpace: 'pre' }}>
          {currentLine.text}
        </p>
      </div>
    </div>
  );
}

// ===================== MAIN COMPONENT =====================

export function NoteLane({
  lyrics,
  currentTime,
  difficulty,
  detectedPitch,
  scrollSpeed = 3,
  windowHeight = 400,
}: NoteLaneProps) {
  const settings = DIFFICULTY_SETTINGS[difficulty];

  // Load note shape style - PRIORITIZE localStorage setting, fallback to theme
  const [noteShapeStyle, setNoteShapeStyle] = useState<NoteShapeStyle>('rounded');

  useEffect(() => {
    const loadNoteShapeStyle = () => {
      // First check localStorage for explicit setting
      const storedNoteShape = parseNoteShape(localStorage.getItem('karaoke-note-shape'));
      if (storedNoteShape) {
        setNoteShapeStyle(storedNoteShape);
      } else {
        // Fallback to theme only if no explicit localStorage setting
        const theme = getStoredTheme();
        if (theme) {
          setNoteShapeStyle(theme.noteStyle);
        }
      }
    };
    loadNoteShapeStyle();

    // Listen for settings changes
    const handleSettingsChange = () => {
      const storedShape = parseNoteShape(localStorage.getItem('karaoke-note-shape'));
      if (storedShape) {
        setNoteShapeStyle(storedShape);
      }
    };
    
    const handleThemeChange = () => {
      // Only update from theme if no explicit localStorage setting
      const storedShape = parseNoteShape(localStorage.getItem('karaoke-note-shape'));
      if (!storedShape) {
        const theme = getStoredTheme();
        if (theme) {
          setNoteShapeStyle(theme.noteStyle);
        }
      }
    };
    
    window.addEventListener('themeChanged', handleThemeChange);
    window.addEventListener('themeChange', handleThemeChange);
    window.addEventListener('settingsChange', handleSettingsChange);
    window.addEventListener('storage', handleSettingsChange);

    // NOTE: No polling interval — this is a Tauri desktop app, not a browser.
    return () => {
      window.removeEventListener('themeChanged', handleThemeChange);
      window.removeEventListener('themeChange', handleThemeChange);
      window.removeEventListener('settingsChange', handleSettingsChange);
      window.removeEventListener('storage', handleSettingsChange);
    };
  }, []);

  // Get note shape classes
  const noteShape = useMemo(() => getNoteShapeClassesForLane(noteShapeStyle), [noteShapeStyle]);

  // Get all notes and calculate positions (Right to Left movement)
  const notesWithPositions = useMemo(() => {
    const scrollWindow = (windowHeight / scrollSpeed) * 1000; // Time window in ms
    const futureTime = currentTime + scrollWindow;
    const positions: NotePositionData[] = [];

    for (const line of lyrics) {
      for (const note of line.notes) {
        // Only show notes within the visible window
        if (note.startTime + note.duration < currentTime || note.startTime > futureTime) {
          continue;
        }

        // Calculate horizontal position (time-based, right to left)
        const timeOffset = note.startTime - currentTime;
        const x = (1 - timeOffset / scrollWindow) * 100; // Right (100%) to Left (0%)

        // Calculate width based on duration (doubled)
        const width = Math.max(120, (note.duration / 50) * settings.visualNoteWidth);

        // Calculate vertical position based on pitch
        const pitchY = calculatePitchY(note.pitch, windowHeight);

        const isActive = currentTime >= note.startTime && currentTime <= note.startTime + note.duration;
        const isPast = currentTime > note.startTime + note.duration;

        positions.push({
          noteId: note.id,
          x,
          width,
          pitchY,
          isActive,
          isPast,
          lyric: note.lyric,
          isGolden: note.isGolden || false,
          isBonus: note.isBonus || false,
        });
      }
    }

    return positions;
  }, [lyrics, currentTime, scrollSpeed, windowHeight, settings.visualNoteWidth]);

  // Current pitch position
  const currentPitchY = useMemo(() => {
    if (detectedPitch === null) return null;
    const midi = frequencyToMidi(detectedPitch);
    return calculatePitchY(midi, windowHeight);
  }, [detectedPitch, windowHeight]);

  // Current line
  const currentLine = useMemo(() => {
    for (const line of lyrics) {
      if (currentTime >= line.startTime && currentTime <= line.endTime) {
        return line;
      }
    }
    return null;
  }, [lyrics, currentTime]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-gradient-to-r from-purple-900/20 to-indigo-900/20">
      {/* Pitch grid lines */}
      <PitchGrid pitchRange={PITCH_RANGE} />

      {/* Target line - Vertical on left side */}
      <TargetLine />

      {/* Notes - Moving Right to Left */}
      {notesWithPositions.map((noteData) => (
        <NoteBlock
          key={noteData.noteId}
          data={noteData}
          noteShape={noteShape}
          windowHeight={windowHeight}
        />
      ))}

      {/* Current pitch indicator */}
      <PitchIndicator pitchY={currentPitchY} windowHeight={windowHeight} />

      {/* Current lyrics display */}
      <CurrentLyrics currentLine={currentLine} />
    </div>
  );
}

