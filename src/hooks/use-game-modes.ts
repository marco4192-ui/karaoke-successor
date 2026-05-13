'use client';

import { useEffect, useRef } from 'react';
import { LyricLine } from '@/types/game';

interface UseGameModesParams {
  gameMode: string;
  status: string;
  currentTime: number;
  songId?: string;
  sortedLines?: LyricLine[];
  setBlindSection: (_isBlind: boolean) => void;
  setBlindHardcore?: (_isHardcore: boolean) => void;
  setMissingWordsIndices: (_indices: number[]) => void;
  /** Override blind frequency (0.15–0.90). Falls back to 0.30 if not set. */
  blindFrequency?: number;
  /** Override missing words percentage (0.15–0.90). Falls back to 0.30 if not set. */
  missingWordFrequency?: number;
  /** Hardcore blind mode: text hidden when notes visible, and vice versa */
  hardcore?: boolean;
}

// ===================== HELPERS =====================

/**
 * Group lyric lines into "passages" — consecutive lines separated by a gap >4 seconds.
 * A passage typically represents a verse, chorus, bridge, etc.
 * Returns an array of passages, each containing the lines belonging to it.
 */
function groupIntoPassages(lines: LyricLine[]): LyricLine[][] {
  if (!lines || lines.length === 0) return [];

  const passages: LyricLine[][] = [];
  let currentPassage: LyricLine[] = [lines[0]];

  for (let i = 1; i < lines.length; i++) {
    const gap = lines[i].startTime - lines[i - 1].endTime;
    if (gap > 4000) {
      // Gap > 4s — start a new passage
      passages.push(currentPassage);
      currentPassage = [lines[i]];
    } else {
      currentPassage.push(lines[i]);
    }
  }
  passages.push(currentPassage);
  return passages;
}

/**
 * Get the end time of the first passage (used to protect the first verse).
 */
function getFirstPassageEndTime(lines: LyricLine[]): number {
  const passages = groupIntoPassages(lines);
  if (passages.length === 0) return 0;
  const firstPassage = passages[0];
  return firstPassage[firstPassage.length - 1]?.endTime ?? 0;
}

/**
 * Hook for managing special game modes: Blind Mode and Missing Words Mode.
 *
 * MISSING WORDS — Passage-based hiding:
 * - Entire passages (groups of lines separated by >4s gaps) are hidden
 * - First passage (first verse) is ALWAYS visible as a starting reference
 * - Frequencies: 15% (Leicht), 30% (Normal), 60% (Schwer), 90% (Insane)
 * - Hidden lines are revealed once sung (per-note timing preserved)
 *
 * BLIND KARAOKE — Note Highway hiding:
 * - Notes on the highway are hidden in blind sections (text always shown)
 * - First passage is ALWAYS fully visible (notes + text)
 * - Hardcore mode: inverts visibility — text hidden when notes visible & vice versa
 * - Frequencies: 15%, 30%, 60%, 90% (Insane)
 */
export function useGameModes({
  gameMode,
  status,
  currentTime,
  songId,
  sortedLines,
  setBlindSection,
  setBlindHardcore,
  setMissingWordsIndices,
  blindFrequency,
  missingWordFrequency,
  hardcore,
}: UseGameModesParams) {
  // BLIND KARAOKE: Deterministic seed-based section hiding
  const blindSeedRef = useRef<number[]>([]);

  // MISSING WORDS: Generate hidden passage line startTimes ONCE when game starts
  const missingWordsGeneratedRef = useRef(false);

  // Track last blind section to avoid redundant state updates every frame
  const lastBlindSectionRef = useRef(-1);

  // Set hardcore mode on store when blind game starts
  useEffect(() => {
    if (gameMode === 'blind' && setBlindHardcore) {
      setBlindHardcore(hardcore ?? false);
    }
  }, [gameMode, hardcore, setBlindHardcore]);

  // ── BLIND KARAOKE MODE ──
  // Notes on the highway are hidden in blind sections.
  // First passage (first verse) is always fully visible.
  useEffect(() => {
    if (gameMode === 'blind' && status === 'playing') {
      // Generate deterministic blind pattern once
      if (blindSeedRef.current.length === 0) {
        const maxSections = 100;
        const seedValues: number[] = [];
        let state = Math.floor(Math.random() * 2147483647);
        for (let i = 0; i < maxSections; i++) {
          state = (state + 0x6D2B79F5) | 0;
          let t = Math.imul(state ^ (state >>> 15), 1 | state);
          t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
          seedValues.push(((t ^ (t >>> 14)) >>> 0) / 4294967296);
        }
        blindSeedRef.current = seedValues;
      }

      const sectionDuration = 12000; // 12 seconds per section
      const blindChance = blindFrequency ?? 0.30; // Use override or default 30%

      const sectionIndex = Math.floor(currentTime / sectionDuration);

      // Only update state when section actually changes
      if (sectionIndex === lastBlindSectionRef.current) return;
      lastBlindSectionRef.current = sectionIndex;

      // Protect first passage: don't blind until first passage ends
      const firstPassageEnd = sortedLines ? getFirstPassageEndTime(sortedLines) : 0;
      if (currentTime < firstPassageEnd) {
        setBlindSection(false);
        return;
      }

      const seedValue = blindSeedRef.current[sectionIndex % blindSeedRef.current.length] || 0;
      const isBlind = sectionIndex > 0 && seedValue < blindChance;

      setBlindSection(isBlind);
    }
  }, [gameMode, status, currentTime, sortedLines, setBlindSection, blindFrequency]);

  // ── MISSING WORDS MODE ──
  // Entire passages (groups of consecutive lines) are hidden.
  // First passage is always visible as a starting reference.
  // Stores LINE startTimes (not note startTimes) so the display can hide entire lines.
  useEffect(() => {
    if (gameMode === 'missing-words' && sortedLines && status === 'playing') {
      // Only generate once per game — prevent flickering on re-renders
      if (missingWordsGeneratedRef.current) return;
      missingWordsGeneratedRef.current = true;

      // Group lines into passages (separated by >4s gaps)
      const passages = groupIntoPassages(sortedLines);

      if (passages.length <= 1) {
        // Only one passage — nothing to hide
        setMissingWordsIndices([]);
        return;
      }

      // Skip the first passage (always visible as starting reference)
      const hideablePassages = passages.slice(1);

      const hidePercentage = missingWordFrequency ?? 0.30; // Use override or default 30%
      const hideCount = Math.max(1, Math.round(hideablePassages.length * hidePercentage));

      // Fisher-Yates shuffle passage indices
      const passageIndices = Array.from({ length: hideablePassages.length }, (_, i) => i);
      for (let i = passageIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [passageIndices[i], passageIndices[j]] = [passageIndices[j], passageIndices[i]];
      }

      // Collect LINE startTimes from hidden passages
      const hiddenLineStartTimes: number[] = [];
      for (let i = 0; i < hideCount && i < passageIndices.length; i++) {
        const passage = hideablePassages[passageIndices[i]];
        for (const line of passage) {
          hiddenLineStartTimes.push(line.startTime);
        }
      }

      // Store line startTimes — the display checks at line level
      setMissingWordsIndices(hiddenLineStartTimes);
    }
  }, [gameMode, sortedLines, status, setMissingWordsIndices, missingWordFrequency]);

  // Reset both modes when song changes
  useEffect(() => {
    blindSeedRef.current = [];
    missingWordsGeneratedRef.current = false;
    lastBlindSectionRef.current = -1;
  }, [songId]);
}
