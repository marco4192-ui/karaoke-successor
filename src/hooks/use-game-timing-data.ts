'use client';

import { useMemo, useState, useEffect } from 'react';
import type { Song, Difficulty, LyricLine, Note } from '@/types/game';
import { calculateScoringMetadata } from '@/lib/game/scoring';
import {
  calculatePitchStats,
  PitchStats,
  NOTE_WINDOW,
  getVisibleNotes,
} from '@/lib/game/note-utils';
import type { TimingData } from '@/components/screens/game-screen-types';

interface GameTimingDataParams {
  effectiveSong: Song | null;
  isDuetMode: boolean;
  difficulty: Difficulty;
  currentTime: number;
}

interface GameTimingDataResult {
  timingData: TimingData | null;
  beatDuration: number;
  pitchStats: PitchStats;
  p1PitchStats: PitchStats;
  p2PitchStats: PitchStats;
  visibleNotes: Array<Note & { lineIndex: number; line: LyricLine }>;
  p1VisibleNotes: Array<Note & { lineIndex: number; line: LyricLine }>;
  p2VisibleNotes: Array<Note & { lineIndex: number; line: LyricLine }>;
}

/**
 * Computes all timing-related data: note extraction, scoring metadata,
 * pitch stats, and visible notes. Extracted from useGameScreenLogic.
 */
export function useGameTimingData({
  effectiveSong,
  isDuetMode,
  difficulty,
  currentTime,
}: GameTimingDataParams): GameTimingDataResult {
  // ── Safety: load lyrics on-demand for duel/duet mode when effectiveSong has none ──
  const [duetFallbackLyrics, setDuetFallbackLyrics] = useState<LyricLine[] | null>(null);
  useEffect(() => {
    if (!isDuetMode || !effectiveSong || (effectiveSong.lyrics && effectiveSong.lyrics.length > 0)) {
      setDuetFallbackLyrics(null);
      return;
    }
    // effectiveSong has no lyrics but we need them for the highway — try loading
    let cancelled = false;
    import('@/lib/game/song-lyrics-loader').then(({ loadSongLyrics }) => {
      loadSongLyrics(effectiveSong).then(lyrics => {
        if (cancelled || lyrics.length === 0) return;
        setDuetFallbackLyrics(lyrics);
      }).catch(() => {});
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [isDuetMode, effectiveSong]);

  // ── Song with fallback lyrics for timing computation ──
  const songForTiming = useMemo(() => {
    if (!effectiveSong) return null;
    if (duetFallbackLyrics && duetFallbackLyrics.length > 0) {
      return { ...effectiveSong, lyrics: duetFallbackLyrics };
    }
    return effectiveSong;
  }, [effectiveSong, duetFallbackLyrics]);

  // =====================================================
  // PRE-COMPUTE ALL TIMING DATA ONCE WHEN SONG LOADS
  // =====================================================
  const timingData = useMemo<TimingData | null>(() => {
    const src = songForTiming || effectiveSong;
    if (!src || src.lyrics.length === 0) return null;

    const allNotes: Array<Note & { lineIndex: number; line: LyricLine }> = [];
    const p1Notes: Array<Note & { lineIndex: number; line: LyricLine }> = [];
    const p2Notes: Array<Note & { lineIndex: number; line: LyricLine }> = [];

    // Determine if notes have explicit P1/P2 markers — needed before the forEach below
    const sortedLines = [...src.lyrics].sort((a, b) => a.startTime - b.startTime);
    const hasExplicitPlayerMarkers = sortedLines.some(line => line.player === 'P1' || line.player === 'P2');

    sortedLines.forEach((line, lineIndex) => {
      line.notes.forEach(note => {
        const noteWithLine = { ...note, lineIndex, line };
        allNotes.push(noteWithLine);

        if (isDuetMode) {
          if (hasExplicitPlayerMarkers) {
            // P1 notes only for player 1, P2 notes only for player 2
            // Notes with player 'both' are sung by BOTH players
            if (note.player === 'P1' || note.player === 'both') {
              p1Notes.push(noteWithLine);
            }
            if (note.player === 'P2' || note.player === 'both') {
              p2Notes.push(noteWithLine);
            }
          } else {
            // Duel / no markers — both players sing all notes
            p1Notes.push(noteWithLine);
            p2Notes.push(noteWithLine);
          }
        }
      });
    });

    allNotes.sort((a, b) => a.startTime - b.startTime);
    p1Notes.sort((a, b) => a.startTime - b.startTime);
    p2Notes.sort((a, b) => a.startTime - b.startTime);

    const p1Lines = sortedLines.filter(line => {
      if (hasExplicitPlayerMarkers) return line.player === 'P1' || line.player === 'both';
      return true;
    });

    const p2Lines = sortedLines.filter(line => {
      if (hasExplicitPlayerMarkers) return line.player === 'P2' || line.player === 'both';
      return true;
    });

    const beatDurationMs = src.bpm ? 15000 / src.bpm : 500;
    const scoringMetadata = calculateScoringMetadata(allNotes, beatDurationMs, difficulty);
    const p1ScoringMetadata = calculateScoringMetadata(p1Notes, beatDurationMs, difficulty);
    const p2ScoringMetadata = calculateScoringMetadata(p2Notes, beatDurationMs, difficulty);

    return {
      allNotes, sortedLines, noteCount: allNotes.length, lineCount: sortedLines.length,
      p1Notes, p2Notes, p1Lines, p2Lines,
      p1NoteCount: p1Notes.length, p2NoteCount: p2Notes.length,
      scoringMetadata, p1ScoringMetadata, p2ScoringMetadata,
      beatDuration: beatDurationMs,
    };
  }, [songForTiming, isDuetMode, difficulty]);

  const beatDuration = timingData?.beatDuration || (effectiveSong?.bpm ? 15000 / effectiveSong.bpm : 500);

  // Calculate pitch ranges
  const pitchStats = useMemo<PitchStats>(() => {
    return calculatePitchStats(timingData?.allNotes);
  }, [timingData]);

  const p1PitchStats = useMemo<PitchStats>(() => {
    const notes = timingData?.p1Notes;
    if (!notes || notes.length === 0) return pitchStats;
    return calculatePitchStats(notes);
  }, [timingData, pitchStats]);

  const p2PitchStats = useMemo<PitchStats>(() => {
    const notes = timingData?.p2Notes;
    if (!notes || notes.length === 0) return pitchStats;
    return calculatePitchStats(notes);
  }, [timingData, pitchStats]);

  // Get visible notes using shared utility
  const visibleNotes = useMemo(() =>
    getVisibleNotes(timingData?.allNotes, currentTime, NOTE_WINDOW),
    [currentTime, timingData]
  );

  const p1VisibleNotes = useMemo(() =>
    getVisibleNotes(timingData?.p1Notes, currentTime, NOTE_WINDOW),
    [currentTime, timingData]
  );

  const p2VisibleNotes = useMemo(() =>
    getVisibleNotes(timingData?.p2Notes, currentTime, NOTE_WINDOW),
    [currentTime, timingData]
  );

  return {
    timingData,
    beatDuration,
    pitchStats,
    p1PitchStats,
    p2PitchStats,
    visibleNotes,
    p1VisibleNotes,
    p2VisibleNotes,
  };
}
