'use client';

import { PlayIcon, PauseIcon } from '@/components/icons';
import { useTranslation } from '@/lib/i18n/translations';
import type { UseJukeboxReturn } from '../jukebox-types';
import { isVideoBreak } from '../video-break';
import { EqualizerBars } from '../jukebox-visuals';
import { ProgressBar } from './progress-bar';

// ==================== VIDEO OVERLAY ====================

export function VideoOverlay({ j }: { j: UseJukeboxReturn }) {
  const { t } = useTranslation();
  const videoBreak = isVideoBreak(j.currentSong);
  return (
    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-16 p-6">
      {/* N8: Requester attribution as chip */}
      {j.currentSongRequestedBy && (
        <div className="inline-flex items-center gap-1.5 text-cyan-300/80 text-xs mb-2 bg-cyan-500/10 border border-cyan-500/25 rounded-full px-3 py-1 backdrop-blur-sm">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
          </svg>
          {t('jukeboxPlayer.requestedBy').replace('{name}', j.currentSongRequestedBy)}
        </div>
      )}
      {/* Video break chip — marks a queued plain video link */}
      {videoBreak && (
        <div className="inline-flex items-center gap-1.5 text-fuchsia-300/90 text-xs mb-2 ml-2 bg-fuchsia-500/10 border border-fuchsia-400/30 rounded-full px-3 py-1 backdrop-blur-sm">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <polygon points="5 3 19 12 5 21 5 3" strokeLinejoin="round" />
          </svg>
          {t('jukeboxPlayer.videoChip')}
        </div>
      )}
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 mb-0.5">
            <EqualizerBars
              active={j.isMediaPlaying && !j.isAdPlaying}
              bars={4}
              className="h-4"
              label={t('jukeboxPlayer.equalizerLabel')}
            />
            <p className="text-cyan-400 text-sm font-semibold tracking-widest">{t('jukeboxPlayer.nowPlaying')}</p>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-white truncate drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">{j.currentSong?.title ?? ''}</h2>
          <p className="text-white/70 text-lg truncate">{j.currentSong?.artist ?? ''}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {/* #19: Transition animation via opacity */}
          <button onClick={j.playPrevious} aria-label="Previous song" className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
            </svg>
          </button>
          <button onClick={j.togglePlayPause} aria-label={j.isMediaPlaying ? 'Pause' : 'Play'} className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 shadow-[0_0_25px_rgba(34,211,238,0.45)]">
            {j.isLoading ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : j.isMediaPlaying ? (
              <PauseIcon className="w-8 h-8 text-white" />
            ) : (
              <PlayIcon className="w-8 h-8 text-white ml-1" />
            )}
          </button>
          <button onClick={j.playNext} aria-label="Next song" className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
            </svg>
          </button>
        </div>
      </div>
      {/* F1+F2: Progress bar in overlay */}
      <div className="mt-4">
        <ProgressBar j={j} />
      </div>
    </div>
  );
}
