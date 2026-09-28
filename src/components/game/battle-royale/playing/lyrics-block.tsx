'use client';

/**
 * Lyrics block (layout section 4) — extracted 1:1 from
 * battle-royale/playing-view.tsx (task R12): BR-style lyric card with fixed
 * height reservation (6.3), next-line preview and the R15 fade-out during
 * long instrumental pauses.
 */
import { LyricLineDisplay } from '@/components/game/lyric-line-display';
import type { Song, LyricLine } from '@/types/game';
import { useTranslation } from '@/lib/i18n/translations';

export interface LyricsBlockProps {
  currentSong: Song | null;
  currentLyricLine: LyricLine | null;
  nextLyricLine: LyricLine | null;
  currentTime: number;
}

export function LyricsBlock({
  currentSong,
  currentLyricLine,
  nextLyricLine,
  currentTime,
}: LyricsBlockProps) {
  const { t } = useTranslation();

  return (
    <>
      {/* ─────────── 4. LYRICS (bottom) — BR-style background, lifted above the bottom-corner time displays (B3.6) ─────────── */}
      {/* Item 8: pb-7 (was pb-3) — lifts the lyrics bar slightly UP, clear of
          the bottom-corner time displays; badges + lyrics now sit closer
          together around the note highway. */}
      {/* 6.3: FIXED height reservation — the note highway is a flex-1 sibling,
          so a lyrics band that grows/shrinks (1 line vs. current+next preview,
          fallbacks during instrumental pauses) resized the Tonleiter on every
          change and made it visibly jump up/down. The card now always occupies
          the same height (fits current line + next-line preview) with the
          content vertically centered — the highway geometry stays constant. */}
      {/* R15 (user request 1.2): during LONG instrumental pauses the block now
          FADES OUT completely (opacity-0) instead of showing stale text —
          it fades back in ~3s before the next vocal phrase. The fixed height
          is kept so the note highway geometry never jumps. */}
      {currentSong ? (
        <div
          data-testid="br-lyrics-block"
          className={`flex-shrink-0 px-4 pb-7 transition-opacity duration-300 ${
            currentLyricLine || !(currentSong.lyrics && currentSong.lyrics.length > 0)
              ? 'opacity-100'
              : 'opacity-0'
          }`}
          aria-hidden={!currentLyricLine && !!(currentSong.lyrics && currentSong.lyrics.length > 0)}
        >
          <div className="w-full h-[72px] bg-black/40 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/10 flex flex-col items-center justify-center">
            {currentLyricLine ? (
              <div className="text-center">
                <LyricLineDisplay
                  line={currentLyricLine}
                  currentTime={currentTime}
                  playerColor="#22d3ee"
                  lyricsSize="small"
                />
                {nextLyricLine && (
                  <p className="text-white/30 text-xs mt-1 text-center">
                    {nextLyricLine.notes.map(n => n.lyric).join('')}
                  </p>
                )}
              </div>
            ) : currentSong.lyrics && currentSong.lyrics.length > 0 ? (
              /* Long pause — block is faded out via opacity-0 (nothing to show). */
              <span className="sr-only">&nbsp;</span>
            ) : (
              <p className="text-white/30 text-center text-sm">{t('battleRoyale.loadingLyrics')}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-shrink-0 px-4 pb-7">
          <div className="w-full h-[72px] bg-black/30 rounded-xl px-4 py-2 border border-white/10 text-center flex items-center justify-center">
            <p className="text-white/30 text-sm">{t('battleRoyale.loadingSong')}</p>
          </div>
        </div>
      )}
    </>
  );
}
