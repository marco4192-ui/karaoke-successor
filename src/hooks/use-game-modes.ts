'use client';

import { useEffect, useRef } from 'react';
import { Note, LyricLine } from '@/types/game';

interface UseGameModesParams {
  gameMode: string;
  status: string;
  currentTime: number;
  songId?: string;
  sortedLines?: LyricLine[];
  setBlindSection: (isBlind: boolean) => void;
  setMissingWordsIndices: (indices: number[]) => void;
  /** Override blind frequency (0.10–0.60). Falls back to 0.4 if not set. */
  blindFrequency?: number;
  /** Override missing words percentage (0.15–0.50). Falls back to 0.25 if not set. */
  missingWordFrequency?: number;
}

/**
 * Determine if a note is the end of a "word" (word boundary in UltraStar format).
 * A word ends where a note has trailing space or is the last note with lyrics.
 */
function isWordEnd(notes: Note[], noteIdx: number): boolean {
  const note = notes[noteIdx];
  if (!note) return false;
  const lyric = note.lyric || '';
  if (lyric.endsWith(' ')) return true;

  // Check if it's the last note with actual lyrics
  for (let i = noteIdx + 1; i < notes.length; i++) {
    const nextLyric = (notes[i].lyric || '').trim();
    if (nextLyric && nextLyric !== '-') return false;
  }
  return true;
}

/**
 * Hook for managing special game modes: Blind Mode and Missing Words Mode.
 * - Blind Mode: Deterministic seed-based section hiding (no flickering)
 * - Missing Words Mode: Selects whole words to hide based on frequency.
 *   Stores note startTimes so the display can check by unique note identifier.
 *
 * Frequencies can be overridden via props (e.g. from competitive settings).
 */
export function useGameModes({
  gameMode,
  status,
  currentTime,
  songId,
  sortedLines,
  setBlindSection,
  setMissingWordsIndices,
  blindFrequency,
  missingWordFrequency,
}: UseGameModesParams) {
  // BLIND KARAOKE MODE: Set blind sections based on time
  // Uses a deterministic seed generated once per song to avoid flickering
  const blindSeedRef = useRef<number[]>([]);

  // MISSING WORDS MODE: Generate hidden word note startTimes ONCE when game starts
  const missingWordsGeneratedRef = useRef(false);

  // Track last blind section to avoid redundant state updates every frame
  const lastBlindSectionRef = useRef(-1);

  // Generate blind pattern when blind mode game starts
  useEffect(() => {
    if (gameMode === 'blind' && status === 'playing') {
      // Generate a deterministic blind pattern when the song starts
      // This ensures the same sections are blind every time, no flickering
      if (blindSeedRef.current.length === 0) {
        // Mulberry32 seeded PRNG — produces well-distributed values in [0, 1)
        const maxSections = 100;
        const seedValues: number[] = [];
        let state = Math.floor(Math.random() * 2147483647); // Seed from Math.random()
        for (let i = 0; i < maxSections; i++) {
          state = (state + 0x6D2B79F5) | 0;
          let t = Math.imul(state ^ (state >>> 15), 1 | state);
          t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
          seedValues.push(((t ^ (t >>> 14)) >>> 0) / 4294967296);
        }
        blindSeedRef.current = seedValues;
      }

      const sectionDuration = 12; // 12 seconds per section (in seconds, same unit as currentTime)
      const blindChance = blindFrequency ?? 0.4; // Use override or default 40%

      const sectionIndex = Math.floor(currentTime / sectionDuration);

      // Only update state when section actually changes (avoids ~60 setBlindSection calls/sec)
      if (sectionIndex === lastBlindSectionRef.current) return;
      lastBlindSectionRef.current = sectionIndex;

      const seedValue = blindSeedRef.current[sectionIndex % blindSeedRef.current.length] || 0;
      const isBlind = sectionIndex > 0 && seedValue < blindChance;

      setBlindSection(isBlind);
    }
  }, [gameMode, status, currentTime, setBlindSection, blindFrequency]);

  // Generate missing words note startTimes once when missing-words game starts
  useEffect(() => {
    if (gameMode === 'missing-words' && sortedLines && status === 'playing') {
      // Only generate once per game — prevent flickering on re-renders
      if (missingWordsGeneratedRef.current) return;
      missingWordsGeneratedRef.current = true;

      // Collect words (each word = array of note startTimes for its syllables)
      // A word ends where a note has trailing space or is the last note with lyrics.
      const words: number[][] = []; // Each entry is an array of startTimes for one word's syllables

      for (const line of sortedLines) {
        if (!line.notes) continue;

        let currentWord: number[] = [];
        for (let noteIdx = 0; noteIdx < line.notes.length; noteIdx++) {
          const note = line.notes[noteIdx];
          const lyric = (note.lyric || '').trim();

          if (!lyric || lyric === '-') {
            // Hyphen-only or empty: finalize current word if any
            if (currentWord.length > 0) {
              words.push(currentWord);
              currentWord = [];
            }
            continue;
          }

          currentWord.push(note.startTime);

          if (isWordEnd(line.notes, noteIdx)) {
            words.push(currentWord);
            currentWord = [];
          }
        }
        // Finalize last word in line
        if (currentWord.length > 0) {
          words.push(currentWord);
        }
      }

      if (words.length === 0) return;

      const hidePercentage = missingWordFrequency ?? 0.25; // Use override or default 25%
      const hideCount = Math.max(1, Math.floor(words.length * hidePercentage));

      // Fisher-Yates shuffle word indices
      const wordIndices = Array.from({ length: words.length }, (_, i) => i);
      for (let i = wordIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [wordIndices[i], wordIndices[j]] = [wordIndices[j], wordIndices[i]];
      }

      // Collect all syllable startTimes from the selected hidden words
      const hiddenStartTimes: number[] = [];
      for (let i = 0; i < hideCount; i++) {
        hiddenStartTimes.push(...words[wordIndices[i]]);
      }

      // Store startTimes of hidden words — the display will check by startTime
      setMissingWordsIndices(hiddenStartTimes);
    }
  }, [gameMode, sortedLines, status, setMissingWordsIndices, missingWordFrequency]);

  // Reset both modes when song changes
  useEffect(() => {
    blindSeedRef.current = [];
    missingWordsGeneratedRef.current = false;
    lastBlindSectionRef.current = -1;
  }, [songId]);
}
