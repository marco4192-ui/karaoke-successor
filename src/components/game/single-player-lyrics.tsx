'use client';

import { useMemo, useRef, useState, useCallback, useLayoutEffect } from 'react';
import { LyricLine } from '@/types/game';
import { LyricLineDisplay } from './lyric-line-display';

// ===================== TYPES =====================

export interface SinglePlayerLyricsProps {
  /** Sorted lyric lines */
  sortedLines: LyricLine[];
  /** Current game time in milliseconds */
  currentTime: number;
  /** Player color for styling */
  playerColor?: string;
  /** Note display style from settings */
  noteDisplayStyle?: 'classic' | 'fill-level' | 'color-feedback' | 'glow-intensity';
  /** Note performance for visual feedback */
  notePerformance?: Map<string, Array<{ time: number; accuracy: number; hit: boolean }>>;
  /** Game mode */
  gameMode?: string;
  /** Missing words indices for missing-words mode */
  missingWordsIndices?: number[];
  /** Is blind section for blind mode */
  isBlindSection?: boolean;
  /** Preview time in milliseconds (how early to show next line) */
  previewTime?: number;
}

// ===================== MAIN COMPONENT =====================

// Shared empty Map to avoid creating a new one on every render (defeats React.memo)
const EMPTY_NOTE_PERFORMANCE = new Map<string, Array<{ time: number; hit: boolean; accuracy: number }>>();

export function SinglePlayerLyrics({
  sortedLines,
  currentTime,
  playerColor = '#22d3ee',
  noteDisplayStyle = 'classic',
  notePerformance = EMPTY_NOTE_PERFORMANCE,
  gameMode = 'standard',
  missingWordsIndices = [],
  isBlindSection = false,
  previewTime = 2000,
}: SinglePlayerLyricsProps) {
  // ── Find current and next lines ──
  const { currentLine, nextLine, timeUntilSing, isSinging, isFlying } = useMemo(() => {
    // Find current line
    let currentLine = sortedLines.find(line =>
      currentTime >= line.startTime && currentTime <= line.endTime
    );

    // If no current line, find the next upcoming line within preview window
    if (!currentLine) {
      for (const line of sortedLines) {
        if (currentTime >= line.startTime - previewTime && currentTime < line.startTime) {
          currentLine = line;
          break;
        }
      }
    }

    if (!currentLine) {
      return { currentLine: null, nextLine: null, timeUntilSing: 0, isSinging: false, isFlying: false };
    }

    // Calculate timing
    const timeUntilSing = currentLine.startTime - currentTime;
    const isSinging = currentTime >= currentLine.startTime;
    const isFlying = !isSinging && timeUntilSing > 0 && timeUntilSing < previewTime;

    // Find next line
    const currentLineIndex = sortedLines.findIndex(line => line === currentLine);
    const nextLine = currentLineIndex >= 0 ? sortedLines[currentLineIndex + 1] : null;

    return { currentLine, nextLine, timeUntilSing, isSinging, isFlying };
  }, [sortedLines, currentTime, previewTime]);

  // ── Refs for measuring first note position ──
  const containerRef = useRef<HTMLDivElement>(null);
  const firstNoteNodeRef = useRef<HTMLSpanElement | null>(null);
  const [firstNoteXPercent, setFirstNoteXPercent] = useState<number | null>(null);

  // Callback ref for the first note element in LyricLineDisplay
  const firstNoteRefCallback = useCallback((node: HTMLSpanElement | null) => {
    firstNoteNodeRef.current = node;
  }, []);

  // Measure first note position relative to container when the current line changes.
  // Uses useLayoutEffect to measure BEFORE the browser paints — this prevents the
  // pointer from flashing to the center (50% fallback) for even a single frame.
  useLayoutEffect(() => {
    const measure = () => {
      const container = containerRef.current;
      const noteEl = firstNoteNodeRef.current;
      if (!container || !noteEl) {
        setFirstNoteXPercent(null);
        return;
      }

      const containerRect = container.getBoundingClientRect();
      const noteRect = noteEl.getBoundingClientRect();

      if (containerRect.width === 0) {
        setFirstNoteXPercent(null);
        return;
      }

      // X position of first note's left edge as percentage of container width
      const relativeX = ((noteRect.left - containerRect.left) / containerRect.width) * 100;
      setFirstNoteXPercent(Math.max(0, Math.min(100, relativeX)));
    };

    // Measure immediately (DOM is already committed in useLayoutEffect)
    measure();

    // Also re-measure on resize
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('resize', measure);
    };
  }, [currentLine]);

  if (!currentLine) return null;

  // Calculate flying animation progress (0 = start, 1 = arrived at first note)
  const flyProgress = isFlying ? Math.max(0, Math.min(1, 1 - (timeUntilSing / previewTime))) : 0;

  // Determine pointer target X position
  // If we have a measured position, use it; otherwise fall back to center
  const pointerTargetX = firstNoteXPercent !== null ? firstNoteXPercent : 50;
  // Pointer starts off-screen left (-5%) and flies to the target
  const pointerX = isFlying ? -5 + flyProgress * (pointerTargetX + 5) : 0;

  // Easing function for smooth deceleration (ease-in-out quad)
  const easedProgress = flyProgress < 0.5
    ? 2 * flyProgress * flyProgress
    : 1 - Math.pow(-2 * flyProgress + 2, 2) / 2;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20">
      <div className="bg-gradient-to-t from-black/80 to-transparent p-6">
        <div ref={containerRef} className="text-2xl md:text-3xl font-bold text-center drop-shadow-lg relative w-full">
          {/* Flying Pointer — flies from off-screen left to the first singable note.
              Disappears immediately when singing starts (no lingering indicator). */}
          {isFlying && (
            <div
              className="absolute top-1/2 flex items-center pointer-events-none"
              style={{
                left: `${pointerX}%`,
                transform: 'translateY(-50%)',
                opacity: 0.4 + easedProgress * 0.6,
                zIndex: 100,
              }}
            >
              {/* Glowing orb */}
              <div
                className="rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  width: `${10 + easedProgress * 6}px`,
                  height: `${10 + easedProgress * 6}px`,
                  background: 'radial-gradient(circle, rgba(34, 211, 238, 1) 0%, rgba(34, 211, 238, 0.7) 50%, transparent 100%)',
                  boxShadow: `0 0 ${15 + easedProgress * 25}px rgba(34, 211, 238, ${0.5 + easedProgress * 0.5})`,
                  animation: 'pulse 0.4s ease-in-out infinite',
                }}
              />
              {/* Arrow pointing right toward the text */}
              <svg
                className="text-cyan-400 flex-shrink-0"
                style={{
                  width: `${14 + easedProgress * 6}px`,
                  height: `${14 + easedProgress * 6}px`,
                  marginLeft: '3px',
                  filter: `drop-shadow(0 0 ${8 + easedProgress * 12}px rgba(34, 211, 238, 0.9))`,
                }}
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          )}

          {/* Current lyrics — pass firstNoteRef for pointer targeting */}
          <LyricLineDisplay
            line={currentLine}
            currentTime={currentTime}
            playerColor={playerColor}
            noteDisplayStyle={noteDisplayStyle}
            notePerformance={notePerformance}
            gameMode={gameMode as 'standard' | 'missing-words' | 'duel' | 'blind' | 'duet'}
            missingWordsIndices={missingWordsIndices}
            isBlindSection={isBlindSection}
            firstNoteRef={firstNoteRefCallback}
          />
        </div>

        {/* Next Line Preview */}
        {nextLine && (
          <p className="text-base md:text-lg text-center text-white/40 mt-3" style={{ whiteSpace: 'pre-wrap' }}>
            {nextLine.notes.map(n => n.lyric).join('')}
          </p>
        )}
      </div>
    </div>
  );
}

export default SinglePlayerLyrics;
