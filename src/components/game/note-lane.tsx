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

const NOTE_HEIGHT = 40;
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

  // Get all notes and calculate positions
  const notesWithPositions = useMemo(() => {
    const notes: Array<{
      note: Note;
      line: LyricLine;
      y: number;
      height: number;
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

        // Calculate vertical position (time-based)
        const timeOffset = note.startTime - currentTime;
        const y = windowHeight / 2 - (timeOffset * scrollSpeed) / 1000;

        // Calculate height based on duration
        const height = (note.duration * scrollSpeed) / 1000;

        // Calculate horizontal position based on pitch
        const pitchOffset = note.pitch - BASE_PITCH;
        const pitchY = windowHeight - ((pitchOffset / PITCH_RANGE) * windowHeight);

        // Calculate width based on duration and difficulty
        const width = Math.max(60, (note.duration / 100) * settings.visualNoteWidth);

        notes.push({
          note,
          line,
          y,
          height,
          x: pitchY - width / 2,
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
    <div className="relative w-full h-full overflow-hidden bg-gradient-to-b from-purple-900/20 to-indigo-900/20">
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

      {/* Target line */}
      <div
        className="absolute left-0 right-0 border-t-2 border-cyan-400/50 z-10"
        style={{ top: `${(windowHeight - windowHeight / 2) / windowHeight * 100}%` }}
      >
        <div className="absolute left-2 -top-3 text-xs text-cyan-400 font-bold">
          SING HERE
        </div>
      </div>

      {/* Notes */}
      {notesWithPositions.map(({ note, y, height, pitchY, width }) => {
        const isActive = currentTime >= note.startTime && currentTime <= note.startTime + note.duration;
        const isPast = currentTime > note.startTime + note.duration;

        return (
          <div
            key={note.id}
            className={`absolute rounded-lg transition-all duration-75 ${
              isPast
                ? 'opacity-30'
                : isActive
                ? 'ring-2 ring-white ring-offset-2 ring-offset-transparent'
                : ''
            } ${note.isGolden ? 'bg-gradient-to-r from-yellow-400 to-orange-500' : note.isBonus ? 'bg-gradient-to-r from-pink-500 to-purple-500' : 'bg-gradient-to-r from-cyan-500 to-blue-500'}`}
            style={{
              left: `${(pitchY / windowHeight) * 100}%`,
              top: `${(y / windowHeight) * 100}%`,
              width: `${(width / windowHeight) * 100}%`,
              height: `${Math.max(2, height)}px`,
              transform: 'translateY(-50%)',
              boxShadow: isActive
                ? note.isGolden
                  ? '0 0 20px rgba(251, 191, 36, 0.5)'
                  : '0 0 15px rgba(34, 211, 238, 0.5)'
                : 'none',
            }}
          >
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow-md truncate px-1">
              {note.lyric}
            </span>
          </div>
        );
      })}

      {/* Current pitch indicator */}
      {currentPitchY !== null && (
        <div
          className="absolute left-1/2 transform -translate-x-1/2 z-20"
          style={{
            top: `${(currentPitchY / windowHeight) * 100}%`,
          }}
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 shadow-lg shadow-green-500/50 animate-pulse flex items-center justify-center">
            <svg
              className="w-5 h-5 text-white"
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
