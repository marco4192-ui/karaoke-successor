'use client';

import { useTranslation } from '@/lib/i18n/translations';

interface SongTitleBannerProps {
  /** Song title (empty → banner hidden) */
  title?: string | null;
  /** Song artist (optional — shown after the title, separated by —) */
  artist?: string | null;
}

/**
 * Top-center song banner for the unified in-game HUD: shows
 * "Artist — Title" between the Pause+End-Song panel (top-left) and the
 * score / difficulty / camera / fullscreen panel (top-right).
 *
 * Purely informational — no interaction, pointer-events-none so it never
 * blocks the note highway underneath.
 */
export function SongTitleBanner({ title, artist }: SongTitleBannerProps) {
  const { t } = useTranslation();
  if (!title) return null;

  return (
    <div
      className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none max-w-[40vw]"
      role="contentinfo"
      aria-label={`${t('partyStarting.song')}: ${title}${artist ? `, ${artist}` : ''}`}
      data-testid="hud-song-title-banner"
    >
      <div className="flex items-center gap-2 rounded-full bg-black/35 backdrop-blur-md border border-white/10 px-4 py-1.5 shadow-lg shadow-black/40">
        <span className="text-xs shrink-0" aria-hidden="true">🎵</span>
        <span className="text-sm font-semibold text-white/90 truncate">
          {title}
        </span>
        {artist && (
          <>
            <span className="text-white/30 shrink-0" aria-hidden="true">—</span>
            <span className="text-sm text-white/60 truncate">{artist}</span>
          </>
        )}
      </div>
    </div>
  );
}
