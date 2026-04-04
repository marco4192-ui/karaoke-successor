'use client';

import { useEffect, useRef } from 'react';
import { Note, LyricLine } from '@/types/game';

interface UseGameModesParams {
  gameMode: string;
  status: string;
  currentTime: number;
  songId?: string;
  allNotes?: Array<Note & { lineIndex: number; line: LyricLine }>;
  setBlindSection: (isBlind: boolean) => void;
  setMissingWordsIndices: (indices: number[]) => void;
}

/**
 * Hook for managing special game modes: Blind Mode and Missing Words Mode.
 * - Blind Mode: Deterministic seed-based section hiding (no flickering)
 * - Missing Words Mode: Fisher-Yates shuffle for 25% word hiding (generated once per game)
 */
export function useGameModes({
  gameMode,
  status,
  currentTime,
  songId,
  allNotes,
  setBlindSection,
  setMissingWordsIndices,
}: UseGameModesParams) {
  // BLIND KARAOKE MODE: Set blind sections based on time
  // Uses a deterministic seed generated once per song to avoid flickering
  const blindSeedRef = useRef<number[]>([]);

  // MISSING WORDS MODE: Generate random hidden word indices ONCE when game starts
  const missingWordsGeneratedRef = useRef(false);

  // Generate blind pattern when blind mode game starts
  useEffect(() => {
    if (gameMode === 'blind' && status === 'playing') {
      // Generate a deterministic blind pattern when the song starts
      // This ensures the same sections are blind every time, no flickering
      if (blindSeedRef.current.length === 0) {
        // Pre-generate blind decisions for up to 100 sections (~20 minutes of music)
        const maxSections = 100;
        const seed: number[] = [];
        let rng = Math.random(); // Generate seed once
        for (let i = 0; i < maxSections; i++) {
          rng = (rng * 16807 + 0.5) % 1; // Simple LCG pseudo-random
          seed.push(rng);
        }
        blindSeedRef.current = seed;
      }

      const sectionDuration = 12000; // 12 seconds per section
      const blindChance = 0.4; // 40% chance of being blind

      const sectionIndex = Math.floor(currentTime / sectionDuration);
      const seedValue = blindSeedRef.current[sectionIndex % blindSeedRef.current.length] || 0;
      const isBlind = (sectionIndex % 2 === 1) || (seedValue < blindChance && sectionIndex > 0);

      setBlindSection(isBlind);
    }
  }, [gameMode, status, currentTime, setBlindSection]);

  // Generate missing words indices once when missing-words game starts
  useEffect(() => {
    if (gameMode === 'missing-words' && allNotes && status === 'playing') {
      // Only generate once per game — prevent flickering on re-renders
      if (missingWordsGeneratedRef.current) return;
      missingWordsGeneratedRef.current = true;

      const totalNotes = allNotes.length;
      if (totalNotes === 0) return;

      const hideCount = Math.floor(totalNotes * 0.25); // 25% of words
      const allIndices = Array.from({ length: totalNotes }, (_, i) => i);

      // Fisher-Yates shuffle for proper random distribution
      for (let i = allIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allIndices[i], allIndices[j]] = [allIndices[j], allIndices[i]];
      }

      setMissingWordsIndices(allIndices.slice(0, hideCount));
    }
  }, [gameMode, allNotes, status, setMissingWordsIndices]);

  // Reset both modes when song changes
  useEffect(() => {
    blindSeedRef.current = [];
    missingWordsGeneratedRef.current = false;
  }, [songId]);
}
