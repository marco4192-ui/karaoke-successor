'use client';

// Video Sync Overlay for the Karaoke Editor
//
// Purpose: show the song's video (#VIDEO) in a floating, draggable and
// resizable overlay while editing, so notes/lyrics can be synchronized with
// the video. Includes a full timecode control section:
//   - Direct song timecode input (m:ss.mmm) + nudge buttons (±100ms / ±1s)
//   - Live VIDEOGAP adjustment (±100ms / ±1s / reset) — the classic sync tool:
//     positive gap delays the video relative to the audio (UltraStar formula:
//     videoTime = songTime − videoGap, matching the game runtime exactly).
//
// Clock architecture (who is the master?):
//   - HTML5 video songs: the editor's audio clock is the master. The muted
//     overlay video is a slave — drift-corrected every frame (>120ms → reseek)
//     and follows the editor playbackRate (slow-motion editing works).
//   - YouTube songs: the YouTube player is the master (it provides the only
//     audio in the editor). While playing, its clock re-bases the editor
//     playhead when drift exceeds 250ms. Scrubbing while paused seeks the
//     YouTube player through an imperative handle.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Song } from '@/types/game';
import { useTranslation } from '@/lib/i18n/translations';
import { YouTubePlayer, extractYouTubeId, type YouTubePlayerHandle } from '@/components/game/youtube-player';
import { MonitorPlay, X, Rewind, RotateCcw } from 'lucide-react';

interface VideoSyncOverlayProps {
  song: Song;
  /** Editor playhead in milliseconds (song time). */
  currentTime: number;
  isPlaying: boolean;
  playbackRate: number;
  /** Seek the editor playhead (rebases playback while playing). */
  onTimeChange: (_ms: number) => void;
  /** Update song.videoGap (marks the song unsaved). */
  onVideoGapChange: (_gapMs: number) => void;
  onClose: () => void;
}

const MIN_WIDTH = 260;
const MAX_WIDTH = 720;
const DRIFT_HTML5_MS = 120;
const DRIFT_YT_MS = 250;

/** Format milliseconds as m:ss.mmm */
function formatTimecode(ms: number): string {
  const clamped = Math.max(0, Math.round(ms));
  const totalSec = Math.floor(clamped / 1000);
  const mm = Math.floor(totalSec / 60);
  const ss = totalSec % 60;
  const mmm = clamped % 1000;
  return `${mm}:${String(ss).padStart(2, '0')}.${String(mmm).padStart(3, '0')}`;
}

/** Parse "m:ss.mmm", "h:mm:ss.mmm", "ss.mmm" or plain seconds → ms. */
function parseTimecode(input: string): number | null {
  const t = input.trim().replace(',', '.');
  if (!t) return null;

  const hms = t.match(/^(\d+):([0-5]?\d):([0-5]?\d(?:\.\d+)?)$/);
  if (hms) return (+hms[1]) * 3600000 + (+hms[2]) * 60000 + (+hms[3]) * 1000;

  const ms = t.match(/^(\d+):([0-5]?\d(?:\.\d+)?)$/);
  if (ms) return (+ms[1]) * 60000 + (+ms[2]) * 1000;

  const secs = parseFloat(t);
  if (!isNaN(secs) && secs >= 0) return Math.round(secs * 1000);
  return null;
}

export function VideoSyncOverlay({
  song,
  currentTime,
  isPlaying,
  playbackRate,
  onTimeChange,
  onVideoGapChange,
  onClose,
}: VideoSyncOverlayProps) {
  const { t } = useTranslation();

  const videoGap = song.videoGap ?? 0;
  const duration = song.duration || 180000;

  // ── Resolve the video source ──
  const ytId = song.youtubeUrl ? extractYouTubeId(song.youtubeUrl) : null;
  const html5Src = !ytId ? (song.videoBackground || song.videoUrl || null) : null;
  const isYouTube = !!ytId;
  // The YouTube player provides audio for YouTube songs (the editor has no
  // separate audio there). Mute it when a separate audio track is the master.
  const ytMuted = !!song.audioUrl;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const ytRef = useRef<YouTubePlayerHandle | null>(null);

  // Live refs for the sync loops (avoid stale closures). Updated in an
  // effect (not during render) to satisfy the React compiler; a one-frame
  // delay is irrelevant for drift correction.
  const currentTimeRef = useRef(currentTime);
  const videoGapRef = useRef(videoGap);
  const isPlayingRef = useRef(isPlaying);
  useEffect(() => {
    currentTimeRef.current = currentTime;
    videoGapRef.current = videoGap;
    isPlayingRef.current = isPlaying;
  }, [currentTime, videoGap, isPlaying]);
  const html5Target = useCallback(
    () => Math.max(0, (currentTimeRef.current - videoGapRef.current) / 1000),
    []
  );

  // ── Panel state: position + width (drag / resize) ──
  const [width, setWidth] = useState(400);
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    if (typeof window === 'undefined') return { x: 40, y: 40 };
    const estHeight = 400 * (9 / 16) + 190;
    return {
      x: Math.max(8, window.innerWidth - 400 - 24),
      y: Math.max(8, window.innerHeight - estHeight - 24),
    };
  });
  const dragStateRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeStateRef = useRef<{ startX: number; origW: number } | null>(null);

  const startDrag = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    dragStateRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
    const onMove = (ev: PointerEvent) => {
      const st = dragStateRef.current;
      if (!st) return;
      setPos({
        x: Math.min(Math.max(0, st.origX + (ev.clientX - st.startX)), window.innerWidth - 80),
        y: Math.min(Math.max(0, st.origY + (ev.clientY - st.startY)), window.innerHeight - 60),
      });
    };
    const onUp = () => {
      dragStateRef.current = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [pos.x, pos.y]);

  const startResize = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizeStateRef.current = { startX: e.clientX, origW: width };
    const onMove = (ev: PointerEvent) => {
      const st = resizeStateRef.current;
      if (!st) return;
      setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, st.origW + (ev.clientX - st.startX))));
    };
    const onUp = () => {
      resizeStateRef.current = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [width]);

  // ── Seek sync: scrubbing while paused + VIDEOGAP changes ──
  // (gap changes re-seek even while playing so the effect is immediately
  // visible — that is the whole point of the sync workflow)
  const seekVideo = useCallback(() => {
    const target = html5Target();
    if (html5Src) {
      const v = videoRef.current;
      if (v && isFinite(target)) {
        try { v.currentTime = target; } catch { /* not loaded yet */ }
      }
    } else {
      ytRef.current?.seekTo(target);
    }
  }, [html5Src, html5Target]);

  useEffect(() => {
    if (!isPlaying) seekVideo();
  }, [currentTime, isPlaying, seekVideo]);

  const lastGapRef = useRef(videoGap);
  useEffect(() => {
    if (lastGapRef.current !== videoGap) {
      lastGapRef.current = videoGap;
      seekVideo();
    }
  }, [videoGap, seekVideo]);

  // ── HTML5 drift correction while playing (editor = master) ──
  useEffect(() => {
    if (!html5Src || !isPlaying) return;
    let raf = 0;
    const loop = () => {
      const v = videoRef.current;
      if (v) {
        const target = html5Target();
        if (Math.abs(v.currentTime - target) * 1000 > DRIFT_HTML5_MS) {
          try { v.currentTime = target; } catch { /* ignore */ }
        }
        if (v.playbackRate !== playbackRate) {
          try { v.playbackRate = playbackRate; } catch { /* rate not supported */ }
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [html5Src, isPlaying, playbackRate, html5Target]);

  // Play/pause + rate for the HTML5 element
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !html5Src) return;
    if (isPlaying) {
      try { v.playbackRate = playbackRate; } catch { /* ignore */ }
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [isPlaying, playbackRate, html5Src]);

  // ── YouTube: the player is the master clock while playing ──
  // Its onTimeUpdate (raw video time; videoGap prop is 0 here) re-bases the
  // editor playhead when drift gets too large.
  const handleYtTimeUpdate = useCallback((rawVideoTimeMs: number) => {
    if (!isPlayingRef.current) return;
    const editorTime = rawVideoTimeMs + videoGapRef.current;
    if (Math.abs(editorTime - currentTimeRef.current) > DRIFT_YT_MS) {
      onTimeChange(Math.min(editorTime, duration));
    }
  }, [onTimeChange, duration]);

  const handleYtReady = useCallback(() => {
    // Player just initialized — align it with the editor playhead
    seekVideo();
  }, [seekVideo]);

  // ── Timecode input ──
  const [timecodeInput, setTimecodeInput] = useState<string | null>(null);
  const commitTimecode = useCallback(() => {
    if (timecodeInput === null) return;
    const parsed = parseTimecode(timecodeInput);
    setTimecodeInput(null);
    if (parsed !== null) {
      onTimeChange(Math.min(Math.max(0, parsed), duration));
    }
  }, [timecodeInput, onTimeChange, duration]);

  const nudgeTime = useCallback((deltaMs: number) => {
    const next = Math.min(Math.max(0, currentTimeRef.current + deltaMs), duration);
    onTimeChange(next);
  }, [onTimeChange, duration]);

  const nudgeGap = useCallback((deltaMs: number) => {
    onVideoGapChange(Math.round((videoGapRef.current + deltaMs)));
  }, [onVideoGapChange]);

  const videoPosMs = Math.max(0, currentTime - videoGap);
  const gapLabel = videoGap > 0 ? `+${videoGap} ms` : `${videoGap} ms`;

  return (
    <div
      className="fixed z-40 select-none"
      style={{ left: pos.x, top: pos.y, width }}
      data-testid="video-sync-overlay"
    >
      <div className="rounded-xl border border-white/10 bg-slate-950/95 backdrop-blur-md shadow-2xl shadow-black/50 overflow-hidden">
        {/* Header — drag handle */}
        <div
          onPointerDown={startDrag}
          className="flex items-center justify-between px-3 h-9 bg-slate-900/90 border-b border-white/10 cursor-move touch-none"
        >
          <div className="flex items-center gap-2 min-w-0">
            <MonitorPlay className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
            <span className="text-xs font-medium text-slate-200 truncate">
              {t('editor.videoOverlay.title')}
            </span>
            <span className="text-[10px] text-slate-500 truncate hidden sm:inline">
              {isYouTube ? 'YouTube' : 'Video'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            title={t('editor.videoOverlay.close')}
            aria-label={t('editor.videoOverlay.close')}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Video area */}
        <div className="relative bg-black" style={{ aspectRatio: '16 / 9' }}>
          {html5Src && (
            <video
              ref={videoRef}
              src={html5Src}
              className="absolute inset-0 w-full h-full object-contain"
              muted
              playsInline
              preload="auto"
              onError={() => console.warn('[VideoSyncOverlay] Video failed to load:', html5Src)}
            />
          )}
          {isYouTube && (
            <YouTubePlayer
              ref={ytRef}
              videoId={ytId!}
              videoGap={0}
              isPlaying={isPlaying}
              startTime={0}
              interactive={false}
              muted={ytMuted}
              onReady={handleYtReady}
              onTimeUpdate={handleYtTimeUpdate}
            />
          )}
          {/* Live timecode badge over the video */}
          <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/70 text-[10px] font-mono text-cyan-300 tabular-nums pointer-events-none">
            {formatTimecode(currentTime)}
          </div>
          {!isPlaying && (
            <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-amber-500/80 text-[10px] font-medium text-black pointer-events-none">
              ⏸
            </div>
          )}
        </div>

        {/* Timecode controls */}
        <div className="p-3 space-y-3 bg-slate-900/60">
          {/* Song timecode — direct input + nudges */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wide text-slate-500 font-medium">
                {t('editor.videoOverlay.songTimecode')}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {t('editor.videoOverlay.videoPosition')}: {formatTimecode(videoPosMs)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {timecodeInput === null ? (
                <button
                  onClick={() => setTimecodeInput(formatTimecode(currentTime))}
                  className="flex-1 h-8 px-2 rounded-md bg-slate-800 border border-slate-700 text-sm font-mono tabular-nums text-cyan-300 hover:border-cyan-500/60 hover:text-cyan-200 transition-colors text-left"
                  title={t('editor.videoOverlay.jumpTo')}
                  data-testid="video-overlay-timecode"
                >
                  {formatTimecode(currentTime)}
                </button>
              ) : (
                <input
                  autoFocus
                  value={timecodeInput}
                  onChange={e => setTimecodeInput(e.target.value)}
                  onBlur={commitTimecode}
                  onKeyDown={e => {
                    if (e.key === 'Enter') commitTimecode();
                    if (e.key === 'Escape') setTimecodeInput(null);
                  }}
                  placeholder="m:ss.mmm"
                  className="flex-1 h-8 px-2 rounded-md bg-slate-950 border border-cyan-500/60 text-sm font-mono tabular-nums text-cyan-200 outline-none"
                  data-testid="video-overlay-timecode-input"
                />
              )}
              <div className="flex items-center rounded-md overflow-hidden border border-slate-700">
                <button onClick={() => nudgeTime(-1000)} className="h-8 px-2 bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-slate-300 transition-colors" title="-1s">−1s</button>
                <button onClick={() => nudgeTime(-100)} className="h-8 px-2 bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-slate-300 border-l border-slate-700 transition-colors" title="-100ms">−.1</button>
                <button onClick={() => nudgeTime(100)} className="h-8 px-2 bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-slate-300 border-l border-slate-700 transition-colors" title="+100ms">+.1</button>
                <button onClick={() => nudgeTime(1000)} className="h-8 px-2 bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-slate-300 border-l border-slate-700 transition-colors" title="+1s">+1s</button>
              </div>
            </div>
          </div>

          {/* VIDEOGAP — the sync tool */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wide text-slate-500 font-medium">
                {t('editor.videoOverlay.videoGap')}
              </span>
              <span className="text-[10px] font-mono tabular-nums text-purple-300">{gapLabel}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="flex items-center rounded-md overflow-hidden border border-slate-700">
                <button onClick={() => nudgeGap(-1000)} className="h-8 px-2 bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-slate-300 transition-colors" title="-1000ms">−1s</button>
                <button onClick={() => nudgeGap(-100)} className="h-8 px-2 bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-slate-300 border-l border-slate-700 transition-colors" title="-100ms">−.1</button>
                <button onClick={() => nudgeGap(0)} className="h-8 px-2 bg-slate-800 hover:bg-purple-600/40 text-purple-200 hover:bg-purple-600/60 border-l border-slate-700 transition-colors flex items-center justify-center" title={t('common.reset')}>
                  <RotateCcw className="w-3 h-3" />
                </button>
                <button onClick={() => nudgeGap(100)} className="h-8 px-2 bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-slate-300 border-l border-slate-700 transition-colors" title="+100ms">+.1</button>
                <button onClick={() => nudgeGap(1000)} className="h-8 px-2 bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-slate-300 border-l border-slate-700 transition-colors" title="+1000ms">+1s</button>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-slate-500">
                <Rewind className="w-3 h-3 text-purple-400" />
                <span className="hidden sm:inline">{t('editor.videoOverlay.gapHint')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Resize handle */}
        <div
          onPointerDown={startResize}
          className="absolute bottom-0 right-0 w-5 h-5 cursor-nwse-resize touch-none flex items-end justify-end p-0.5"
          aria-hidden
        >
          <div className="w-2.5 h-2.5 border-r-2 border-b-2 border-slate-600 rounded-br-[3px] hover:border-cyan-400" />
        </div>
      </div>
    </div>
  );
}
