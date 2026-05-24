'use client';

import { useEffect, useRef } from 'react';
import { LyricLine } from '@/types/game';

// ===================== TYPES =====================

export type MissingWordsGranularity = 'word' | 'passage' | 'both';

interface UseGameModesParams {
  gameMode: string;
  status: string;
  /** Whether the game is currently playing (audio/video active). More reliable than status === 'playing' */
  isPlaying?: boolean;
  currentTime: number;
  songId?: string;
  sortedLines?: LyricLine[];
  setBlindSection: (_isBlind: boolean) => void;
  setBlindHardcore?: (_isHardcore: boolean) => void;
  setHardcoreMissingWords?: (_isHardcore: boolean) => void;
  setMissingWordsIndices: (_indices: number[]) => void;
  /** Callback when a blind section starts (for warning signals) */
  onBlindWarning?: (_countdown: number, _isActive: boolean) => void;
  /** Callback when a missing-words passage is about to start */
  onMissingWordsWarning?: (_countdown: number, _isActive: boolean) => void;
  /** Override blind frequency (0.15–0.90). Falls back to 0.30 if not set. */
  blindFrequency?: number;
  /** Override missing words percentage (0.15–0.90). Falls back to 0.30 if not set. */
  missingWordFrequency?: number;
  /** Hardcore blind mode: text hidden when notes visible, and vice versa */
  hardcore?: boolean;
  /** Hardcore Missing Words mode: hidden words stay hidden until song ends */
  hardcoreMissingWords?: boolean;
  /** Missing words granularity: 'word' | 'passage' | 'both' */
  missingWordsGranularity?: MissingWordsGranularity;
  /** Escalating mode: frequency multiplier that increases per round (1.0 = normal) */
  escalatingMultiplier?: number;
}

/** Stores a pre-computed blind passage pattern for the current song. */
interface BlindPassagePattern {
  /** Each entry maps to a passage index (same order as groupIntoPassages output). */
  isBlind: boolean[];
  /** Start/end times per passage for warning look-ahead. */
  passages: Array<{ startTime: number; endTime: number }>;
}

// ===================== HELPERS =====================

/**
 * Group lyric lines into "passages" — consecutive lines separated by a gap >4 seconds.
 * A passage typically represents a verse, chorus, bridge, etc.
 * Returns an array of passages, each containing the lines belonging to it.
 */
export function groupIntoPassages(lines: LyricLine[]): LyricLine[][] {
  if (!lines || lines.length === 0) return [];

  const passages: LyricLine[][] = [];
  let currentPassage: LyricLine[] = [lines[0]];

  for (let i = 1; i < lines.length; i++) {
    const gap = lines[i].startTime - lines[i - 1].endTime;
    if (gap > 4000) {
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
 * Generate a deterministic seed sequence (xorshift32).
 */
function generateSeedSequence(maxValues: number): number[] {
  const seedValues: number[] = [];
  let state = Math.floor(Math.random() * 2147483647);
  for (let i = 0; i < maxValues; i++) {
    state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    seedValues.push(((t ^ (t >>> 14)) >>> 0) / 4294967296);
  }
  return seedValues;
}

/**
 * Fisher-Yates shuffle (in-place).
 */
function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Collect all note start times (in ms) from lines belonging to given passages.
 * Used for word-level granularity hiding in Missing Words.
 */
function getNoteStartTimesFromPassages(passages: LyricLine[][]): number[] {
  const times: number[] = [];
  for (const passage of passages) {
    for (const line of passage) {
      for (const note of line.notes) {
        times.push(note.startTime);
      }
    }
  }
  return times;
}

/**
 * Hide every N-th note from a list of start times.
 * Returns a subset of noteStartTimes to hide.
 */
function hideEveryNthNote(noteStartTimes: number[], n: number): number[] {
  const hidden: number[] = [];
  for (let i = 0; i < noteStartTimes.length; i++) {
    if (i % n === n - 1) {
      hidden.push(noteStartTimes[i]);
    }
  }
  return hidden;
}

// ===================== HOOK =====================

/**
 * Hook for managing special game modes: Blind Mode and Missing Words Mode.
 *
 * BLIND KARAOKE — Passage-based hiding:
 * - Notes on the highway are hidden for entire musical passages (verse/chorus/bridge)
 * - First passage is ALWAYS fully visible (notes + text)
 * - Hardcore mode: inverts visibility — text hidden when notes visible & vice versa
 * - Frequencies: 15%, 30%, 60%, 90% (Insane)
 * - Warning signal 1s before blind sections (via onBlindWarning callback)
 *
 * MISSING WORDS — Multi-granularity hiding:
 * - 'word': Every N-th note hidden within ALL passages (except first)
 * - 'passage': Entire passages hidden (original behavior)
 * - 'both': Some passages fully hidden + scattered words in visible passages
 * - First passage always visible
 * - Hardcore MW: Hidden words stay hidden until song ends (not revealed after singing)
 * - Frequencies: 15%, 30%, 60%, 90% (Insane)
 * - Warning signal 1s before hidden passages (via onMissingWordsWarning callback)
 */
export function useGameModes({
  gameMode,
  status,
  isPlaying: isActivelyPlaying,
  currentTime,
  songId,
  sortedLines,
  setBlindSection,
  setBlindHardcore,
  setHardcoreMissingWords,
  setMissingWordsIndices,
  onBlindWarning,
  onMissingWordsWarning,
  blindFrequency,
  missingWordFrequency,
  hardcore,
  hardcoreMissingWords,
  missingWordsGranularity,
  escalatingMultiplier,
}: UseGameModesParams) {
  // Use isActivelyPlaying (from game loop) as primary signal,
  // fall back to status === 'playing' for store-based pause/resume.
  const isGameActive = isActivelyPlaying === true || status === 'playing';
  // BLIND KARAOKE: Pre-computed passage-based blind pattern
  const blindPatternRef = useRef<BlindPassagePattern | null>(null);

  // MISSING WORDS: Generate hidden indices ONCE when game starts
  const missingWordsGeneratedRef = useRef(false);
  // Stores the hidden startTimes so the warning effect can check which passages are affected
  const hiddenStartTimesRef = useRef<Set<number>>(new Set());

  // Track last values to avoid redundant state updates every frame
  const lastBlindPassageRef = useRef(-1);
  const lastMWWarningKeyRef = useRef('');

  // ── RESET: Clear all mode state when song or gameMode changes ──
  // CRITICAL: This effect MUST be declared BEFORE the generation effects
  // so that refs are properly reset before the generation effects check them.
  // Without this ordering, React runs effects in declaration order and the
  // reset could run after generation, causing the generation guard refs to
  // be in an inconsistent state.
  useEffect(() => {
    blindPatternRef.current = null;
    missingWordsGeneratedRef.current = false;
    hiddenStartTimesRef.current = new Set();
    lastBlindPassageRef.current = -1;
    lastMWWarningKeyRef.current = '';
    // Reset blind section state so it doesn't carry over to the next song
    setBlindSection(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- songId and gameMode are the intentional triggers
  }, [songId, gameMode, setBlindSection]);

  // Set hardcore mode on store when blind game starts
  useEffect(() => {
    if (gameMode === 'blind' && setBlindHardcore) {
      setBlindHardcore(hardcore ?? false);
    }
  }, [gameMode, hardcore, setBlindHardcore]);

  // Set hardcore Missing Words mode on store when MW game starts
  useEffect(() => {
    if (gameMode === 'missing-words' && setHardcoreMissingWords) {
      setHardcoreMissingWords(hardcoreMissingWords ?? false);
    }
  }, [gameMode, hardcoreMissingWords, setHardcoreMissingWords]);

  // ── BLIND KARAOKE MODE — Generate pattern (once per song) ──
  // Decoupled from isGameActive so the pattern is ready before playback starts.
  // songId is included to guarantee regeneration when a new song loads.
  useEffect(() => {
    if (gameMode === 'blind' && sortedLines && sortedLines.length > 0 && !blindPatternRef.current) {
      const passages = groupIntoPassages(sortedLines);
      const seeds = generateSeedSequence(passages.length);

      // Apply escalating multiplier to frequency
      const baseFreq = blindFrequency ?? 0.30;
      const effectiveFreq = Math.min(0.95, baseFreq * (escalatingMultiplier ?? 1));

      const isBlind: boolean[] = passages.map((_, i) => {
        if (i === 0) return false; // First passage always visible
        return seeds[i] < effectiveFreq;
      });

      blindPatternRef.current = {
        isBlind,
        passages: passages.map(p => ({
          startTime: p[0]?.startTime ?? 0,
          endTime: p[p.length - 1]?.endTime ?? 0,
        })),
      };
    }
  }, [gameMode, songId, sortedLines, blindFrequency, escalatingMultiplier]);

  // ── BLIND KARAOKE MODE — Per-frame passage tracking ──
  useEffect(() => {
    if (gameMode === 'blind' && isGameActive && blindPatternRef.current) {
      const pattern = blindPatternRef.current;

      // Find current passage based on currentTime
      let currentPassageIndex = -1;
      for (let i = 0; i < pattern.passages.length; i++) {
        if (currentTime >= pattern.passages[i].startTime && currentTime < pattern.passages[i].endTime) {
          currentPassageIndex = i;
          break;
        }
      }

      // Look ahead for next blind passage (for warning signal)
      if (onBlindWarning) {
        const WARNING_LEAD_MS = 1000; // 1 second warning
        let nextBlindPassageIndex = -1;
        for (let i = 0; i < pattern.passages.length; i++) {
          if (pattern.isBlind[i] && currentTime < pattern.passages[i].startTime) {
            nextBlindPassageIndex = i;
            break;
          }
        }

        if (nextBlindPassageIndex >= 0) {
          const timeUntilBlind = pattern.passages[nextBlindPassageIndex].startTime - currentTime;
          if (timeUntilBlind <= WARNING_LEAD_MS && timeUntilBlind > 0) {
            const countdown = Math.ceil(timeUntilBlind / 1000);
            if (lastMWWarningKeyRef.current !== String(nextBlindPassageIndex)) {
              lastMWWarningKeyRef.current = String(nextBlindPassageIndex);
              onBlindWarning(countdown, true);
            }
          } else if (currentPassageIndex === nextBlindPassageIndex) {
            // We're now in the blind section
            onBlindWarning(0, true);
            lastMWWarningKeyRef.current = '';
          } else if (timeUntilBlind > WARNING_LEAD_MS || currentPassageIndex >= 0 && !pattern.isBlind[currentPassageIndex]) {
            // Not near a blind section
            onBlindWarning(0, false);
            lastMWWarningKeyRef.current = '';
          }
        } else {
          // No upcoming blind passage
          const isInBlind = currentPassageIndex >= 0 && pattern.isBlind[currentPassageIndex];
          onBlindWarning(0, isInBlind);
        }
      }

      // Only update blind section state when passage actually changes
      if (currentPassageIndex !== lastBlindPassageRef.current) {
        lastBlindPassageRef.current = currentPassageIndex;
        const isBlind = currentPassageIndex >= 0 ? pattern.isBlind[currentPassageIndex] : false;
        setBlindSection(isBlind);
      }
    }
  }, [gameMode, isGameActive, currentTime, sortedLines, setBlindSection, onBlindWarning]);

  // ── MISSING WORDS MODE — Generate hidden pattern (once per song) ──
  // Decoupled from isGameActive so the pattern is ready before playback starts.
  // songId is included to guarantee regeneration when a new song loads.
  useEffect(() => {
    if (gameMode === 'missing-words' && sortedLines && sortedLines.length > 0 && !missingWordsGeneratedRef.current) {
      missingWordsGeneratedRef.current = true;

      const passages = groupIntoPassages(sortedLines);
      if (passages.length <= 1) {
        setMissingWordsIndices([]);
        return;
      }

      const hideablePassages = passages.slice(1); // First passage always visible

      // Apply escalating multiplier to frequency
      const baseFreq = missingWordFrequency ?? 0.30;
      const effectiveFreq = Math.min(0.95, baseFreq * (escalatingMultiplier ?? 1));

      const granularity = missingWordsGranularity ?? 'passage';
      const hiddenStartTimes: number[] = [];

      if (granularity === 'word') {
        // WORD mode: hide every N-th note in all hideable passages
        // Light (15%) → every 7th note, Normal (30%) → every 3rd, Hard (60%) → every 2nd, Insane (90%) → every note
        const skipMap: Record<number, number> = { 0.15: 7, 0.30: 3, 0.45: 2, 0.60: 2, 0.75: 2, 0.90: 1 };
        const n = skipMap[Math.round(effectiveFreq * 20) / 20] ?? Math.max(1, Math.round(1 / effectiveFreq));

        const allNoteTimes = getNoteStartTimesFromPassages(hideablePassages);
        hiddenStartTimes.push(...hideEveryNthNote(allNoteTimes, n));
      } else if (granularity === 'both') {
        // BOTH mode: hide some full passages + scattered words in visible ones
        // Passages: use half the frequency for passage-level hiding
        const passageFreq = effectiveFreq * 0.5;
        const passageHideCount = Math.max(1, Math.round(hideablePassages.length * passageFreq));
        const shuffledIndices = shuffleArray(Array.from({ length: hideablePassages.length }, (_, i) => i));

        const hiddenPassageIndices = new Set<number>();
        for (let i = 0; i < passageHideCount && i < shuffledIndices.length; i++) {
          hiddenPassageIndices.add(shuffledIndices[i]);
        }

        // Add line startTimes from fully hidden passages
        for (const idx of hiddenPassageIndices) {
          for (const line of hideablePassages[idx]) {
            hiddenStartTimes.push(line.startTime);
          }
        }

        // Scatter words in visible passages
        const visiblePassages = hideablePassages.filter((_, i) => !hiddenPassageIndices.has(i));
        const visibleNoteTimes = getNoteStartTimesFromPassages(visiblePassages);
        const wordSkipMap: Record<number, number> = { 0.15: 5, 0.30: 3, 0.45: 2, 0.60: 2, 0.75: 2, 0.90: 1 };
        const wordN = wordSkipMap[Math.round(effectiveFreq * 20) / 20] ?? Math.max(1, Math.round(1 / effectiveFreq));
        hiddenStartTimes.push(...hideEveryNthNote(visibleNoteTimes, wordN));
      } else {
        // PASSAGE mode (original): entire passages hidden
        const hideCount = Math.max(1, Math.round(hideablePassages.length * effectiveFreq));
        const shuffledIndices = shuffleArray(Array.from({ length: hideablePassages.length }, (_, i) => i));

        for (let i = 0; i < hideCount && i < shuffledIndices.length; i++) {
          const passage = hideablePassages[shuffledIndices[i]];
          for (const line of passage) {
            hiddenStartTimes.push(line.startTime);
          }
        }
      }

      hiddenStartTimesRef.current = new Set(hiddenStartTimes);
      setMissingWordsIndices(hiddenStartTimes);
    }
  }, [gameMode, songId, sortedLines, setMissingWordsIndices, missingWordFrequency, missingWordsGranularity, escalatingMultiplier]);

  // ── Missing Words Warning: signal before hidden passages approach ──
  useEffect(() => {
    if (gameMode === 'missing-words' && isGameActive && sortedLines && onMissingWordsWarning) {
      const passages = groupIntoPassages(sortedLines);
      if (passages.length <= 1) return;

      // Check if current time is approaching a hidden passage (first hideable one)
      const WARNING_LEAD_MS = 1500;
      for (let i = 1; i < passages.length; i++) {
        const passage = passages[i];
        const passageStart = passage[0]?.startTime ?? 0;
        const passageEnd = passage[passage.length - 1]?.endTime ?? 0;

        // Only warn if this passage actually contains hidden words
        const passageHasHidden = passage.some(line => hiddenStartTimesRef.current.has(line.startTime));
        if (!passageHasHidden) continue;

        const timeUntilPassage = passageStart - currentTime;
        if (timeUntilPassage > 0 && timeUntilPassage <= WARNING_LEAD_MS) {
          const countdown = Math.ceil(timeUntilPassage / 1000);
          const warnKey = `mw-${i}`;
          if (lastMWWarningKeyRef.current !== warnKey) {
            lastMWWarningKeyRef.current = warnKey;
            onMissingWordsWarning(countdown, true);
          }
          return;
        }
      }

      // Not near any passage transition — clear warning
      onMissingWordsWarning(0, false);
      lastMWWarningKeyRef.current = '';
    }
  }, [gameMode, isGameActive, currentTime, sortedLines, onMissingWordsWarning]);

}
