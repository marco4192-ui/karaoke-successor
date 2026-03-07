'use client';

import React, { useMemo } from 'react';
import { Note, LyricLine, DIFFICULTY_SETTINGS, frequencyToMidi } from '@/types/game';

interface NoteLaneProps {
  lyrics: LyricLine[];
  currentTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  detectedPitch: number | null;
  scrollSpeed?: number;
  windowHeight?: number;
}

const NOTE_HEIGHT = 52; // Doubled from 26
const PITCH_RANGE = 24; // Number of semitones to display
const BASE_PITCH = 48; // C3 - lowest pitch to display

export function NoteLane({
  lyrics,
  currentTime,
  difficulty,
  detectedPitch,
  scrollSpeed = 3,
  windowHeight = 400,
}: NoteLaneProps) {
  const settings = DIFFICULTY_SETTINGS[difficulty];

  // Get all notes and calculate positions (Right to Left movement)
  const notesWithPositions = useMemo(() => {
    const notes: Array<{
      note: Note;
      line: LyricLine;
      x: number;
      width: number;
      pitchY: number;
    }> = [];

    const scrollWindow = (windowHeight / scrollSpeed) * 1000; // Time window in ms
    const futureTime = currentTime + scrollWindow;

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
        const pitchOffset = note.pitch - BASE_PITCH;
        const pitchY = windowHeight - ((pitchOffset / PITCH_RANGE) * windowHeight);

        notes.push({
          note,
          line,
          x,
          width,
          pitchY,
        });
      }
    }

    return notes;
  }, [lyrics, currentTime, scrollSpeed, windowHeight, settings.visualNoteWidth]);

  // Current pitch position
  const currentPitchY = useMemo(() => {
    if (detectedPitch === null) return null;
    const midi = frequencyToMidi(detectedPitch);
    const pitchOffset = midi - BASE_PITCH;
    return windowHeight - ((pitchOffset / PITCH_RANGE) * windowHeight);
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
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: PITCH_RANGE + 1 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-full border-t border-white/5"
            style={{
              top: `${(i / PITCH_RANGE) * 100}%`,
            }}
          />
        ))}
      </div>

      {/* Target line - Vertical on left side */}
      <div
        className="absolute top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-cyan-400 to-transparent z-10"
        style={{ left: '8%' }}
      >
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-xs text-cyan-400 font-bold whitespace-nowrap">
          SING HERE →
        </div>
      </div>

      {/* Notes - Moving Right to Left */}
      {notesWithPositions.map(({ note, x, pitchY, width }) => {
        const isActive = currentTime >= note.startTime && currentTime <= note.startTime + note.duration;
        const isPast = currentTime > note.startTime + note.duration;

        return (
          <div
            key={note.id}
            className={`absolute rounded-xl transition-all duration-75 ${
              isPast
                ? 'opacity-30'
                : isActive
                ? 'ring-4 ring-white ring-offset-2 ring-offset-transparent scale-125'
                : ''
            } ${note.isGolden ? 'bg-gradient-to-r from-yellow-400 to-orange-500' : note.isBonus ? 'bg-gradient-to-r from-pink-500 to-purple-500' : 'bg-gradient-to-r from-cyan-500 to-blue-500'}`}
            style={{
              left: `${Math.max(0, Math.min(90, x))}%`,
              top: `${(pitchY / windowHeight) * 100}%`,
              width: `${width}px`,
              height: `${NOTE_HEIGHT}px`,
              transform: 'translateY(-50%)',
              boxShadow: isActive
                ? note.isGolden
                  ? '0 0 30px rgba(251, 191, 36, 0.7)'
                  : '0 0 25px rgba(34, 211, 238, 0.7)'
                : 'none',
            }}
          >
            <span className="absolute inset-0 flex items-center justify-center text-base font-bold text-white drop-shadow-md truncate px-2">
              {note.lyric}
            </span>
          </div>
        );
      })}

      {/* Current pitch indicator */}
      {currentPitchY !== null && (
        <div
          className="absolute z-20"
          style={{
            left: '4%',
            top: `${(currentPitchY / windowHeight) * 100}%`,
            transform: 'translateY(-50%)',
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
      )}

      {/* Current lyrics display */}
      {currentLine && (
        <div className="absolute bottom-4 left-0 right-0 text-center">
          <div className="inline-block px-6 py-3 bg-black/50 backdrop-blur-sm rounded-xl">
            <p className="text-2xl font-bold text-white drop-shadow-lg">
              {currentLine.text}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
