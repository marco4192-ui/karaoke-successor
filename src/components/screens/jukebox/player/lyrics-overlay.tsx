'use client';

import type { UseJukeboxReturn } from '../jukebox-types';

// ==================== LYRICS OVERLAY ====================

export function LyricsOverlay({ j }: { j: UseJukeboxReturn }) {
  if (!j.showLyrics) return null;
  if (!j.currentSong?.lyrics?.length) return null;
  const lyrics = j.currentSong.lyrics;
  const currentText = lyrics[j.currentLyricIndex]?.text;
  const prevText = j.currentLyricIndex > 0 ? lyrics[j.currentLyricIndex - 1]?.text : null;
  const nextText = j.currentLyricIndex < lyrics.length - 1 ? lyrics[j.currentLyricIndex + 1]?.text : null;

  if (!currentText && !prevText && !nextText) return null;

  return (
    <div className="absolute inset-0 flex items-end justify-center pb-24 pointer-events-none z-10">
      <div className="text-center max-w-4xl px-8">
        {prevText && (
          <p className="text-white/40 text-lg md:text-xl mb-2 transition-opacity">
            {prevText}
          </p>
        )}
        <p className="text-white text-2xl md:text-4xl font-bold drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
          {currentText}
        </p>
        {nextText && (
          <p className="text-white/40 text-lg md:text-xl mt-2 transition-opacity">
            {nextText}
          </p>
        )}
      </div>
    </div>
  );
}
