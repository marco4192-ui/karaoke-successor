'use client';

import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { SongCardProps } from './types';
import { MusicIcon, PlayIcon } from '@/components/icons';
import { extractYouTubeId } from '@/components/game/youtube-player';
import { WaveformBar } from './waveform-bar';
import { useTranslation } from '@/lib/i18n/translations';
import { isDuetSong } from './utils';

function hasVideo(song: SongCardProps['song']): boolean {
  return !!(song.videoBackground || song.videoUrl || song.youtubeUrl || song.relativeVideoPath);
}

// ── R41 (P1/P2): module-level cover retry registry ───────────────────────────
// The old per-card 3-strike rule (≈10 s) permanently gave up on a src — a
// cover that was temporarily unloadable (object-URL churn during rescans,
// lazy media restore races) stayed „empty purple" FOREVER even though the
// src usually recovers moments later. The registry outlives card unmounts
// (sorting changes, grid virtualization) and retries over minutes:
// 2.5 s → 7 s → 15 s → 30 s → 60 s → 120 s (7 attempts total, then permanent).
// A CHANGED src (fresh blob URL after a rescan) always starts a fresh budget.
const RETRY_DELAYS_MS = [2500, 7000, 15000, 30000, 60000, 120000];
const MAX_FAILURE_ATTEMPTS = RETRY_DELAYS_MS.length + 1;

interface FailureEntry {
  attempts: number;
  nextRetryAt: number; // 0 = permanent failure (no further retry)
}

const failureRegistry = new Map<string, FailureEntry>();

function registryDelayFor(attempts: number): number | null {
  const idx = attempts - 1; // attempts = number of failures recorded so far
  return idx >= 0 && idx < RETRY_DELAYS_MS.length ? RETRY_DELAYS_MS[idx] : null;
}

function isRegistryFailed(src: string | undefined): boolean {
  if (!src) return false;
  const entry = failureRegistry.get(src);
  if (!entry) return false;
  if (entry.nextRetryAt === 0) return true; // permanent
  return Date.now() < entry.nextRetryAt;
}

// ── R43 (cover self-healing): heal dead media-db URLs ──────────────────────
// When a shared stable URL was revoked externally (see media-db
// refreshSongMediaUrl), the failure ladder alone can never recover — every
// retry re-requests the SAME dead string. On the first load error of a
// storedMedia song we therefore force a FRESH object URL from the media DB
// (once per songId+src). If the fresh URL differs, the card swaps its src
// immediately and the cover heals within one re-render instead of staying
// „empty purple" for the whole session.
const healedCoverUrls = new Map<string, string>(); // songId → fresh cover URL
const healAttempts = new Set<string>(); // `${songId}::${src}` — one try per src

async function healCoverUrl(songId: string, deadSrc: string): Promise<void> {
  const key = `${songId}::${deadSrc}`;
  if (healAttempts.has(key)) return; // already tried for this src
  healAttempts.add(key);
  try {
    const { refreshSongMediaUrl } = await import('@/lib/db/media-db');
    const freshUrl = await refreshSongMediaUrl(songId, 'cover');
    if (freshUrl && freshUrl !== deadSrc) {
      healedCoverUrls.set(songId, freshUrl);
    }
  } catch { /* no media DB entry — keep the ladder/fallback handling */ }
}

export function SongCard({ 
  song, 
  previewSong,
  previewAudio,
  onSongClick, 
  onPreviewStart, 
  onPreviewStop, 
  previewVideoRefs,
  isViralHit,
  itemProps,
}: SongCardProps) {
  const { t } = useTranslation();
  const isPreviewing = previewSong?.id === song.id;
  const songHasVideo = hasVideo(song);

  // R26 (cover-bug fix): safety net against un-loadable image srcs (dead
  // blob: URLs, 404 paths, unreachable remotes). A failed <img> must never
  // show the browser's „Bild konnte nicht geladen werden“ icon — the card
  // falls back to the clean MusicIcon placeholder instead. Failed srcs are
  // tracked per URL, so a changed src (e.g. a restored fresh blob URL)
  // simply renders again.
  // R34 (cover-retry): the failed status is no longer permanent. onError
  // plans a background retry after ~2.5 s (Versuch 2) and ~7 s (Versuch 3);
  // only after 3 failed attempts per src does the fallback stay for good.
  // While waiting for a retry the initials/icon fallback shows (as before).
  // Successful loads clear the attempt counters for that src.
  // R41: the counters live in the module-level failureRegistry (see above) —
  // they survive card unmounts and retry over minutes instead of giving up
  // after ~10 s. The per-card state only mirrors the registry so React
  // re-renders when a retry becomes due.
  const [, setRetryTick] = useState(0);
  const retryTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Clear all pending retry timers on unmount
  useEffect(() => {
    const timers = retryTimersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const scheduleCardRetry = (src: string, delayMs: number) => {
    const existing = retryTimersRef.current.get(src);
    if (existing) clearTimeout(existing);
    retryTimersRef.current.set(src, setTimeout(() => {
      retryTimersRef.current.delete(src);
      // State bump → re-render → isRegistryFailed(src) is now false →
      // the conditional <img> remounts and the browser retries the load.
      setRetryTick(t => t + 1);
    }, delayMs));
  };

  const markFailed = (src?: string) => {
    if (!src) return; // no retry for empty/undefined src
    const prev = failureRegistry.get(src);
    const attempts = (prev?.attempts ?? 0) + 1;
    const delayMs = registryDelayFor(attempts);
    if (delayMs === null || attempts >= MAX_FAILURE_ATTEMPTS) {
      // Permanent failure for this src — a changed src still gets a fresh budget.
      failureRegistry.set(src, { attempts, nextRetryAt: 0 });
      return;
    }
    failureRegistry.set(src, { attempts, nextRetryAt: Date.now() + delayMs });
    scheduleCardRetry(src, delayMs);
  };
  const clearAttempts = (src?: string) => {
    if (!src) return;
    failureRegistry.delete(src);
    const timer = retryTimersRef.current.get(src);
    if (timer) { clearTimeout(timer); retryTimersRef.current.delete(src); }
  };
  const isFailed = (src?: string) => isRegistryFailed(src);

  // R43: cover error → request a fresh URL from the media DB (once per src).
  // If one arrives, the healed map wins over the song prop and the image
  // re-mounts with the working src.
  const handleCoverError = (src?: string) => {
    markFailed(src);
    if (src && song.storedMedia) {
      healCoverUrl(song.id, src).then(() => {
        if (healedCoverUrls.get(song.id)) setRetryTick(t => t + 1);
      });
    }
  };

  // Extract itemProps so we can merge onKeyDown with our fallback handler
  const { ref: itemRef, onKeyDown: itemOnKeyDown, ...restItemProps } = itemProps || {};

  const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    // If parent provided onKeyDown (via roving focus), delegate to it
    itemOnKeyDown?.(e);
    // Fallback activation when no parent keyboard handler is wired up
    if (!itemOnKeyDown && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onSongClick(song);
    }
  };

  const effectiveSong = isPreviewing && previewSong ? previewSong : song;
  // R43: a healed (fresh) cover URL beats the possibly-dead prop URL.
  const healedCover = healedCoverUrls.get(song.id);
  const effectiveCoverImage = healedCover ?? effectiveSong.coverImage;
  const effectiveBackgroundImage = effectiveSong.backgroundImage;
  const coverBroken = isFailed(effectiveCoverImage);
  const backgroundBroken = isFailed(effectiveBackgroundImage);
  const showBackground = !!effectiveBackgroundImage && !backgroundBroken;
  const showCover = !!effectiveCoverImage && !coverBroken;
  const showBackgroundDuringPreview = isPreviewing && !songHasVideo && showBackground;

  return (
    <div
      ref={itemRef as React.Ref<HTMLDivElement> | undefined}
      {...restItemProps}
      data-testid={`song-card-${song.id}`}
      className="bg-white/5 rounded-xl overflow-hidden border border-white/10 hover:border-cyan-500/50 transition-all cursor-pointer group focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent focus-visible:outline-none"
      onClick={() => onSongClick(song)}
      onMouseEnter={() => onPreviewStart(song)}
      onMouseLeave={onPreviewStop}
      onKeyDown={handleKeyDown}
    >
      <div className="relative aspect-square bg-gradient-to-br from-purple-600/50 to-blue-600/50 overflow-hidden">
        {showBackground && (
          <img 
            src={effectiveBackgroundImage} 
            alt="" 
            onLoad={() => clearAttempts(effectiveBackgroundImage)}
            onError={() => markFailed(effectiveBackgroundImage)}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
              showBackgroundDuringPreview ? 'opacity-100' : 'opacity-0'
            }`} 
          />
        )}
        
        {showCover && (
          <img 
            src={effectiveCoverImage} 
            alt={effectiveSong.title} 
            onLoad={() => clearAttempts(effectiveCoverImage)}
            onError={() => handleCoverError(effectiveCoverImage)}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
              isPreviewing && songHasVideo ? 'opacity-0' : 'opacity-100'
            }`} 
          />
        )}
        
        {(song.videoBackground || song.videoUrl || song.relativeVideoPath) && (
          <video
            ref={(el) => {
              if (el) {
                previewVideoRefs.current.set(song.id, el);
              } else {
                previewVideoRefs.current.delete(song.id);
              }
            }}
            src={effectiveSong.videoUrl || effectiveSong.videoBackground || undefined}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
              isPreviewing ? 'opacity-100' : 'opacity-0'
            }`}
            muted={!song.hasEmbeddedAudio && !!song.audioUrl}
            playsInline
            preload="metadata"
            onLoadedData={(e) => {
              const video = e.currentTarget;
              if (previewSong?.id === song.id) {
                const previewStartSec = effectiveSong.previewStart
                  ? effectiveSong.previewStart
                  : effectiveSong.preview?.startTime
                    ? effectiveSong.preview.startTime / 1000
                    : 0;
                if (previewStartSec > 0 && video.duration >= previewStartSec) {
                  video.currentTime = previewStartSec;
                }
                video.play().catch(() => {});
              }
            }}
          />
        )}
        
        {song.youtubeUrl && isPreviewing && (() => {
          const ytId = extractYouTubeId(song.youtubeUrl);
          if (!ytId) return null;
          return (
            <div className="absolute inset-0 w-full h-full">
              <iframe
                src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}&controls=0&showinfo=0&rel=0&modestbranding=1&enablejsapi=1&start=${Math.floor(effectiveSong.previewStart || (effectiveSong.preview?.startTime || 0) / 1000)}`}
                className="w-full h-full object-cover pointer-events-none"
                style={{ transform: 'scale(1.5)', transformOrigin: 'center' }}
                allow="autoplay; encrypted-media"
                allowFullScreen
              />
            </div>
          );
        })()}
        
        {!showCover && !showBackground && !songHasVideo && (
          <div className="absolute inset-0 flex items-center justify-center">
            <MusicIcon className="w-16 h-16 text-white/30" />
          </div>
        )}
        
        <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-300 ${
          isPreviewing && songHasVideo ? 'opacity-0' : 
          isPreviewing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}>
          <div className="w-14 h-14 rounded-full bg-cyan-500/80 flex items-center justify-center">
            <PlayIcon className="w-7 h-7 text-white ml-1" />
          </div>
        </div>
        
        <div className="absolute top-2 right-2 flex gap-1">
          {isDuetSong(song) && (
            <div className="bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-lg">
              <span className="text-sm">🎭</span>Duet
            </div>
          )}
          {isViralHit && (
            <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-lg animate-pulse">
              <span className="text-sm">&#128293;</span>{t('songCard.viral')}
            </div>
          )}
          {(song.hasEmbeddedAudio || songHasVideo) && (
            <Badge className="bg-purple-500/80 text-xs">{t('songCard.video')}</Badge>
          )}
        </div>
        
        <WaveformBar audio={previewAudio || null} isActive={isPreviewing && !!previewAudio} />

        <div className="absolute bottom-2 right-2">
          <Badge className="bg-white/90 text-black text-xs font-bold">
            {Math.floor(song.duration / 60000)}:{String(Math.floor((song.duration % 60000) / 1000)).padStart(2, '0')}
          </Badge>
        </div>
      </div>
      
      <div className="p-3">
        <h3 className="font-semibold text-white truncate text-sm">{song.title}</h3>
        <p className="text-xs text-white/60 truncate">{song.artist}</p>
      </div>
    </div>
  );
}
