'use client';

/**
 * Standard lyrics line selection — extracted 1:1 from
 * battle-royale/playing-view.tsx (task R12): finds the current and next lyric
 * lines (R15 user request 1.2: 3s preview window before the next vocal
 * phrase; long instrumental pauses fade the block out entirely).
 */
import { useMemo } from 'react';
import type { Song } from '@/types/game';

export function useLyricLines(currentSong: Song | null, currentTime: number) {
  // Standard lyrics display: find current and next lyric lines using LyricLineDisplay
  // R15 (user request 1.2): 3s preview window — the lyric block fades back in
  // ~3 seconds before the next vocal phrase starts (was 2s).
  const { currentLyricLine, nextLyricLine } = useMemo(() => {
    if (!currentSong?.lyrics || currentSong.lyrics.length === 0) {
      return { currentLyricLine: null, nextLyricLine: null };
    }
    const lyrics = currentSong.lyrics;
    // Find active line (currently being sung)
    const activeLine = lyrics.find(line =>
      currentTime >= line.startTime && currentTime <= line.endTime
    );
    if (activeLine) {
      const idx = lyrics.indexOf(activeLine);
      return {
        currentLyricLine: activeLine,
        nextLyricLine: idx >= 0 && idx < lyrics.length - 1 ? lyrics[idx + 1] : null,
      };
    }
    // No active line: show next upcoming line within 3s preview window
    for (let i = 0; i < lyrics.length; i++) {
      if (currentTime < lyrics[i].startTime && lyrics[i].startTime - currentTime < 3000) {
        return {
          currentLyricLine: lyrics[i],
          nextLyricLine: i < lyrics.length - 1 ? lyrics[i + 1] : null,
        };
      }
    }
    // Long instrumental pause: NO line — the block fades out entirely
    // (R15, user request 1.2: like the other modes, no stale text during
    // pauses — and no misleading "first line of the song" fallback either).
    return { currentLyricLine: null, nextLyricLine: null };
  }, [currentSong, currentTime]);

  return { currentLyricLine, nextLyricLine };
}
