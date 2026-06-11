'use client';

import { useMemo, useRef, useState, useCallback, useEffect, memo } from 'react';
import { LyricLine, type GameMode } from '@/types/game';
import { LyricLineDisplay } from './lyric-line-display';
import { NoteDisplayStyle } from '@/lib/game/note-utils';

// ===================== TYPES =====================

export interface SinglePlayerLyricsProps {
  /** Sorted lyric lines */
  sortedLines: LyricLine[];
  /** Current game time in milliseconds */
  currentTime: number;
  /** Player color for styling */
  playerColor?: string;
  /** Note display style from settings */
  noteDisplayStyle?: NoteDisplayStyle;
  /** Note performance for visual feedback */
  notePerformance?: Map<string, Array<{ time: number; accuracy: number; hit: boolean }>>;
  /** Game mode */
  gameMode?: GameMode;
  /** Missing words indices for missing-words mode */
  missingWordsIndices?: number[];
  /** Is blind section for blind mode */
  isBlindSection?: boolean;
  /** Hardcore blind mode: text hidden when notes visible */
  isBlindHardcore?: boolean;
  /** Hardcore Missing Words mode: hidden words stay hidden until song ends */
  hardcoreMissingWords?: boolean;
  /** Preview time in milliseconds (how early to show next line) */
  previewTime?: number;
  /** Lyrics size setting: 'small', 'medium', or 'large' */
  lyricsSize?: string;
}

// ===================== MAIN COMPONENT =====================

// Shared empty Map to avoid creating a new one on every render (defeats React.memo)
const EMPTY_NOTE_PERFORMANCE = new Map<string, Array<{ time: number; hit: boolean; accuracy: number }>>();

export const SinglePlayerLyrics = memo(function SinglePlayerLyrics({
  sortedLines,
  currentTime,
  playerColor = '#22d3ee',
  noteDisplayStyle = 'classic',
  notePerformance = EMPTY_NOTE_PERFORMANCE,
  gameMode = 'standard',
  missingWordsIndices = [],
  isBlindSection = false,
  isBlindHardcore = false,
  hardcoreMissingWords = false,
  previewTime = 2000,
  lyricsSize,
}: SinglePlayerLyricsProps) {
  // ── Find current and next lines ──
  const { currentLine, nextLine, timeUntilSing, isFlying } = useMemo(() => {
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
      return { currentLine: null, nextLine: null, timeUntilSing: 0, isFlying: false };
    }

    // Calculate timing
    const timeUntilSing = currentLine.startTime - currentTime;
    const isFlying = currentTime < currentLine.startTime && timeUntilSing > 0 && timeUntilSing < previewTime;

    // Find next line
    const currentLineIndex = sortedLines.findIndex(line => line === currentLine);
    const nextLine = currentLineIndex >= 0 ? sortedLines[currentLineIndex + 1] : null;

    return { currentLine, nextLine, timeUntilSing, isFlying };
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
  // DO-NOT-CHANGE: Deferred measurement via useEffect + requestAnimationFrame.
  // Previous useLayoutEffect blocked the browser paint for 12-15ms per line change
  // (2× getBoundingClientRect forced sync reflow + setState triggered 2nd render).
  // Deferring to rAF lets the browser paint the new lyrics FIRST, then measures
  // in the next frame. The flying pointer uses its fallback position for one frame,
  // which is imperceptible but eliminates the line-change stutter entirely.

  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
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
    });
    return () => cancelAnimationFrame(rafId);
  }, [currentLine]);

  // Stable resize handler — registered once, not on every line change
  useEffect(() => {
    const measure = () => {
      const container = containerRef.current;
      const noteEl = firstNoteNodeRef.current;
      if (!container || !noteEl) return;
      const containerRect = container.getBoundingClientRect();
      const noteRect = noteEl.getBoundingClientRect();
      if (containerRect.width === 0) return;
      const relativeX = ((noteRect.left - containerRect.left) / containerRect.width) * 100;
      setFirstNoteXPercent(Math.max(0, Math.min(100, relativeX)));
    };
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('resize', measure);
    };
  }, []);

  // ── IMPORTANT: All hooks MUST be called before the early return below. ──
  // Moving any hook after `if (!currentLine) return null` violates the
  // Rules of Hooks (React error #310) because the hook count would differ
  // between renders where currentLine is null vs non-null.
  // DO NOT move the useMemo calls below after the early return.

  // Check if preview should be entirely hidden (blind mode only)
  const shouldHidePreview = useMemo(() => {
    if (!nextLine) return false;
    // Blind mode: hide preview entirely — no text cues allowed
    if (gameMode === 'blind') {
      if (isBlindSection) return true;
      if (isBlindHardcore) return true;
    }
    return false;
  }, [nextLine, gameMode, isBlindSection, isBlindHardcore]);

  // Compute preview text with missing-words replacement applied.
  // Returns null if the entire next line is hidden (passage mode),
  // or the text with hidden words replaced by underscores (word/both mode).
  const previewText = useMemo(() => {
    if (!nextLine) return null;

    if (gameMode === 'missing-words' && missingWordsIndices.length > 0) {
      // Entire next line is a hidden passage → don't show preview (all underscores = useless)
      if (missingWordsIndices.includes(nextLine.startTime)) return null;

      // Check if any words in the next line are individually hidden
      const hasHiddenWords = nextLine.notes.some(n => missingWordsIndices.includes(n.startTime));

      if (!hasHiddenWords) {
        // No hidden words in next line → show full preview text
        return nextLine.notes.map(n => n.lyric).join('');
      }

      // Some words hidden → replace only hidden words with underscores
      return nextLine.notes.map(n => {
        if (missingWordsIndices.includes(n.startTime)) {
          return n.lyric.replace(/[^-\s]/g, '_');
        }
        return n.lyric;
      }).join('');
    }

    // Default: show full preview text
    return nextLine.notes.map(n => n.lyric).join('');
  }, [nextLine, gameMode, missingWordsIndices]);

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
        <div ref={containerRef} className="font-bold text-center drop-shadow-lg relative w-full">
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
            gameMode={gameMode}
            missingWordsIndices={missingWordsIndices}
            isBlindSection={isBlindSection}
            isBlindHardcore={isBlindHardcore}
            hardcoreMissingWords={hardcoreMissingWords}
            firstNoteRef={firstNoteRefCallback}
            lyricsSize={lyricsSize}
          />
        </div>

        {/* Next Line Preview — hidden in blind mode; in missing-words mode, hidden words shown as underscores */}
        {nextLine && !shouldHidePreview && previewText && (
          <p className={`${lyricsSize === 'large' ? 'text-xl md:text-2xl' : lyricsSize === 'small' ? 'text-base md:text-lg' : 'text-base md:text-lg'} text-center text-white/40 mt-3`} style={{ whiteSpace: 'pre-wrap' }}>
            {previewText}
          </p>
        )}
      </div>
    </div>
  );
});

export default SinglePlayerLyrics;
