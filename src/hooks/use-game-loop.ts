'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '@/lib/game/store';
import { evaluateNote, updatePlayerStats, drainStarPower } from '@/lib/game/scoring';
import { frequencyToMidi, DIFFICULTY_SETTINGS } from '@/types/game';

export function useGameLoop(
  isPlaying: boolean,
  onNoteHit?: (noteId: string, rating: string) => void
) {
  const gameState = useGameStore((state) => state.gameState);
  const updatePlayer = useGameStore((state) => state.updatePlayer);
  const setCurrentTime = useGameStore((state) => state.setCurrentTime);
  const endGame = useGameStore((state) => state.endGame);

  const lastUpdateRef = useRef<number>(Date.now());
  const processedNotesRef = useRef<Set<string>>(new Set());
  const activeNotesRef = useRef<Map<string, { startTime: number; lastUpdateTime: number }>>(new Map());

  // Process pitch detection
  const processPitch = useCallback(
    (detectedPitch: number | null, currentTime: number) => {
      if (!gameState.currentSong || gameState.players.length === 0) return;

      const settings = DIFFICULTY_SETTINGS[gameState.difficulty];

      // Find all notes that should be active at current time
      const activeNotes: { noteId: string; targetPitch: number; noteStartTime: number; noteDuration: number }[] = [];

      for (const line of gameState.currentSong.lyrics) {
        for (const note of line.notes) {
          const noteEnd = note.startTime + note.duration;

          // Check if this note is currently active (within timing tolerance)
          const timingWindowStart = note.startTime - settings.timingTolerance;
          const timingWindowEnd = noteEnd + settings.timingTolerance;

          if (currentTime >= timingWindowStart && currentTime <= timingWindowEnd) {
            activeNotes.push({
              noteId: note.id,
              targetPitch: note.pitch,
              noteStartTime: note.startTime,
              noteDuration: note.duration,
            });
          }
        }
      }

      // Process each active note
      for (const activeNote of activeNotes) {
        const noteState = activeNotesRef.current.get(activeNote.noteId);

        if (detectedPitch !== null && !processedNotesRef.current.has(activeNote.noteId)) {
          const sungMidi = frequencyToMidi(detectedPitch);
          const pitchDiff = Math.abs(sungMidi - activeNote.targetPitch);

          if (pitchDiff <= settings.pitchTolerance) {
            // Player is singing the correct pitch
            if (!noteState) {
              // Start tracking this note
              activeNotesRef.current.set(activeNote.noteId, {
                startTime: currentTime,
                lastUpdateTime: currentTime,
              });
            } else {
              // Update tracking
              noteState.lastUpdateTime = currentTime;
            }
          }
        }
      }

      // Check for notes that should be evaluated
      for (const [noteId, noteState] of activeNotesRef.current.entries()) {
        const note = gameState.currentSong?.lyrics
          .flatMap((l) => l.notes)
          .find((n) => n.id === noteId);

        if (!note) continue;

        const noteEnd = note.startTime + note.duration;
        const isNoteFinished = currentTime > noteEnd + settings.timingTolerance;

        if (isNoteFinished && !processedNotesRef.current.has(noteId)) {
          // Evaluate the note
          const holdDuration = noteState.lastUpdateTime - noteState.startTime;
          const holdRatio = holdDuration / note.duration;

          let rating: 'perfect' | 'good' | 'okay' | 'miss';
          let points = 0;

          if (holdRatio >= 0.8) {
            rating = 'perfect';
            points = 100;
          } else if (holdRatio >= 0.6) {
            rating = 'good';
            points = 75;
          } else if (holdRatio >= 0.3) {
            rating = 'okay';
            points = 50;
          } else {
            rating = 'miss';
            points = 0;
          }

          // Update player stats
          const player = gameState.players[0]; // For now, single player
          if (player) {
            const evaluation = {
              noteId,
              rating,
              points: Math.round(points * settings.noteScoreMultiplier),
              pitchAccuracy: holdRatio,
              timingAccuracy: holdRatio,
              isComboBreak: rating === 'miss',
            };

            const updatedPlayer = updatePlayerStats(player, evaluation);
            updatePlayer(player.id, {
              score: updatedPlayer.score,
              combo: updatedPlayer.combo,
              maxCombo: updatedPlayer.maxCombo,
              notesHit: updatedPlayer.notesHit,
              notesMissed: updatedPlayer.notesMissed,
              accuracy: updatedPlayer.accuracy,
              starPower: updatedPlayer.starPower,
            });

            onNoteHit?.(noteId, rating);
          }

          processedNotesRef.current.add(noteId);
          activeNotesRef.current.delete(noteId);
        }
      }
    },
    [gameState, updatePlayer, onNoteHit]
  );

  // Game loop
  useEffect(() => {
    if (!isPlaying || !gameState.currentSong) return;

    const gameLoop = () => {
      const now = Date.now();
      const deltaTime = now - lastUpdateRef.current;
      lastUpdateRef.current = now;

      // Update time
      const newTime = gameState.currentTime + deltaTime;
      setCurrentTime(newTime);

      // Process pitch
      if (gameState.detectedPitch !== null) {
        processPitch(gameState.detectedPitch, newTime);
      }

      // Drain star power if active
      if (gameState.players[0]?.isStarPowerActive) {
        const updatedPlayer = drainStarPower(gameState.players[0], deltaTime);
        updatePlayer(gameState.players[0].id, {
          starPower: updatedPlayer.starPower,
          isStarPowerActive: updatedPlayer.isStarPowerActive,
        });
      }

      // Check if song ended
      if (newTime >= gameState.currentSong.duration) {
        endGame();
        return;
      }
    };

    const intervalId = setInterval(gameLoop, 16); // ~60fps

    return () => {
      clearInterval(intervalId);
    };
  }, [isPlaying, gameState, setCurrentTime, processPitch, updatePlayer, endGame]);

  // Reset processed notes when song changes
  useEffect(() => {
    processedNotesRef.current.clear();
    activeNotesRef.current.clear();
  }, [gameState.currentSong?.id]);

  return {
    processedNotes: processedNotesRef.current,
  };
}
