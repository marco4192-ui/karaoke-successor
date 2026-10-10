'use client';

import { useTranslation } from '@/lib/i18n/translations';
import type { UseJukeboxReturn } from '../jukebox-types';
import { getSongPlatformVideo } from '../video-break';

// ==================== VOLUME CONTROL (F3 Mute) ====================

export function VolumeControl({ j }: { j: UseJukeboxReturn }) {
  const { t } = useTranslation();
  // Bilibili embeds expose no playback API at all — the slider cannot reach
  // them. Show the amber hint icon so users know to use the in-player control.
  const currentPlatform = getSongPlatformVideo(j.currentSong)?.platform ?? null;
  const volumeRemoteUnsupported = currentPlatform === 'bilibili';
  return (
    <div className="flex items-center gap-2">
      {/* F3: Mute toggle button */}
      <button
        onClick={j.toggleMute}
        className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        aria-label={j.isMuted ? 'Unmute' : 'Mute'}
        title={j.isMuted ? 'Unmute' : 'Mute'}
      >
        {j.isMuted || j.volume === 0 ? (
          /* Muted icon */
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </svg>
        ) : j.volume < 0.5 ? (
          /* Low volume icon */
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          </svg>
        ) : (
          /* Full volume icon */
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
          </svg>
        )}
      </button>
      <input
        type="range" min="0" max="1" step="0.05"
        value={j.volume}
        onChange={(e) => j.setVolume(parseFloat(e.target.value))}
        className="w-24 accent-cyan-500"
        aria-label="Volume"
      />
      {volumeRemoteUnsupported && (
        <span
          className="text-amber-300/90 shrink-0"
          title={t('jukeboxPlayer.volumeInPlayerHint')}
          role="status"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span className="sr-only">{t('jukeboxPlayer.volumeInPlayerHint')}</span>
        </span>
      )}
    </div>
  );
}
