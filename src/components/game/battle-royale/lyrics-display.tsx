'use client';

import { useMemo } from 'react';
import { LyricLine } from '@/types/game';
import { useTranslation } from '@/lib/i18n/translations';

export function LyricsDisplay({ lyrics, currentTime }: { lyrics: LyricLine[]; currentTime: number }) {
  const { t } = useTranslation();

  // Empty lyrics guard
  if (!lyrics || lyrics.length === 0) {
    return <div className="text-center text-white/30">{t('battleRoyale.noLyrics')}</div>;
  }

  // Find current line — the one that is currently playing
  let currentLineIndex = lyrics.findIndex((line, index) => {
    const nextLine = lyrics[index + 1];
    return currentTime >= line.startTime && (!nextLine || currentTime < nextLine.startTime);
  });

  // Before first line starts: show first line as upcoming
  if (currentLineIndex < 0 && lyrics.length > 0) {
    currentLineIndex = 0;
  }

  const currentLine = lyrics[currentLineIndex] || null;
  const nextLine = currentLineIndex >= 0 && currentLineIndex < lyrics.length - 1 ? lyrics[currentLineIndex + 1] : null;

  // Check if we are actually in the current line (before song starts = upcoming)
  const isUpcoming = currentTime < (currentLine?.startTime ?? 0);

  // Calculate line progress for the sweeping highlight (0..1)
  const lineProgress = useMemo(() => {
    if (!currentLine || isUpcoming) return 0;
    const lineStart = currentLine.startTime;
    const lineEnd = currentLine.endTime;
    const duration = lineEnd - lineStart;
    if (duration <= 0) return 1;
    return Math.min(1, Math.max(0, (currentTime - lineStart) / duration));
  }, [currentLine, isUpcoming, currentTime]);

  // Split text into words and mark which ones are already past
  const words = useMemo(() => {
    if (!currentLine) return [];
    return currentLine.text.split(/(\s+)/); // split keeping whitespace tokens
  }, [currentLine]);

  // Calculate cumulative character-width ratios for each word boundary
  const wordBoundaries = useMemo(() => {
    const totalChars = currentLine?.text.length ?? 0;
    if (totalChars === 0) return [];
    let running = 0;
    return words.map((w) => {
      const start = running / totalChars;
      running += w.length;
      const end = running / totalChars;
      return { word: w, start, end };
    });
  }, [words, currentLine]);

  // Determine which words are sung vs upcoming
  const renderedWords = useMemo(() => {
    return wordBoundaries.map(({ word, start, end }) => {
      const isWhitespace = /^\s+$/.test(word);
      if (isWhitespace) return { word, state: 'space' as const };

      if (lineProgress >= end) {
        return { word, state: 'sung' as const };
      } else if (lineProgress >= start) {
        return { word, state: 'singing' as const, partial: (lineProgress - start) / (end - start) };
      } else {
        return { word, state: 'upcoming' as const };
      }
    });
  }, [wordBoundaries, lineProgress]);

  return (
    <div className="text-center select-none">
      {/* Current line — karaoke-style sweeping highlight */}
      {currentLine && (
        <div className="relative text-xl font-bold leading-relaxed">
          {/* Glow underline that sweeps across the line */}
          {!isUpcoming && (
            <div
              className="absolute bottom-0 left-0 h-[3px] rounded-full"
              style={{
                width: `${lineProgress * 100}%`,
                background: 'linear-gradient(90deg, #06b6d4, #22d3ee, #67e8f9)',
                boxShadow: '0 0 12px 2px rgba(6, 182, 212, 0.7), 0 0 24px 4px rgba(6, 182, 212, 0.3)',
                transition: 'width 80ms linear',
              }}
            />
          )}

          {/* Word-by-word rendering */}
          <span className={isUpcoming ? 'text-white/40' : ''}>
            {renderedWords.map(({ word, state, partial }, i) => {
              if (state === 'space') {
                return <span key={i}>{word}</span>;
              }

              if (state === 'sung') {
                // Already sung — bright cyan-white with glow
                return (
                  <span
                    key={i}
                    className="text-cyan-300"
                    style={{
                      textShadow: '0 0 8px rgba(6, 182, 212, 0.6), 0 0 16px rgba(34, 211, 238, 0.3)',
                    }}
                  >
                    {word}
                  </span>
                );
              }

              if (state === 'singing') {
                // Currently being sung — split into sung/upcoming halves using clip
                return (
                  <span key={i} className="relative inline">
                    {/* Dim upcoming portion (full word, behind) */}
                    <span className="text-white/40">{word}</span>
                    {/* Bright sung portion (clipped overlay) */}
                    <span
                      className="absolute inset-0 text-cyan-300"
                      aria-hidden
                      style={{
                        clipPath: `inset(0 ${(1 - (partial ?? 0)) * 100}% 0 0)`,
                        textShadow: '0 0 8px rgba(6, 182, 212, 0.6), 0 0 16px rgba(34, 211, 238, 0.3)',
                      }}
                    >
                      {word}
                    </span>
                  </span>
                );
              }

              // Upcoming — dim
              return <span key={i} className="text-white/40">{word}</span>;
            })}
          </span>
        </div>
      )}

      {/* Next line — fully dimmed */}
      {nextLine && (
        <div className="text-white/30 text-sm mt-1 leading-relaxed">{nextLine.text}</div>
      )}
    </div>
  );
}
