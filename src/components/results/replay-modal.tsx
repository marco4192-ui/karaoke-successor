'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { safeAlert } from '@/lib/safe-dialog';
import { deleteReplay, type ReplayRecord } from '@/lib/db/replay-db';

interface ReplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  replay: ReplayRecord;
  originalAudioUrl?: string;   // URL to play original song alongside
  originalVideoUrl?: string;   // URL for background video (muted, visual only during analysis)
}

const COPYRIGHT_NOTICE =
  'Hinweis: Aus Urheberrechtsgründen enthält dieses Replay nur deine eigene Stimme und ggf. deine Webcam-Aufnahme. ' +
  'Tipp: Du kannst den Original-Song ganz einfach über YouTube, Instagram oder TikTok hinzufügen — ' +
  'diese Plattformen bieten oft integrierte Musikbibliotheken, mit denen du dein Replay im Handumdrehen zum perfekten Video machst!';

export function ReplayModal({ isOpen, onClose, replay, originalAudioUrl, originalVideoUrl }: ReplayModalProps) {
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);
  const originalAudioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showOriginal, setShowOriginal] = useState(false);
  const [originalVolume, setOriginalVolume] = useState(0.5);
  const [isExporting, setIsExporting] = useState(false);
  const blobUrlRef = useRef<string | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Create blob URL when modal opens
  useEffect(() => {
    if (isOpen && replay.data) {
      if (!blobUrlRef.current) {
        blobUrlRef.current = URL.createObjectURL(replay.data);
      }
    }

    return () => {
      // Stop playback and cleanup
      if (mediaRef.current) {
        mediaRef.current.pause();
        mediaRef.current.src = '';
      }
      if (originalAudioRef.current) {
        originalAudioRef.current.pause();
        originalAudioRef.current.src = '';
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      setIsPlaying(false);
      setCurrentTime(0);
    };
  }, [isOpen, replay.data]);

  // Update current time while playing
  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      return;
    }

    const updateTime = () => {
      if (mediaRef.current) {
        setCurrentTime(mediaRef.current.currentTime);
      }
      animFrameRef.current = requestAnimationFrame(updateTime);
    };
    animFrameRef.current = requestAnimationFrame(updateTime);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [isPlaying]);

  const togglePlay = useCallback(() => {
    const el = mediaRef.current;
    if (!el) return;

    if (isPlaying) {
      el.pause();
      if (originalAudioRef.current) originalAudioRef.current.pause();
      setIsPlaying(false);
    } else {
      el.play().catch(err => {
        console.error('[ReplayModal] Play failed:', err);
      });
      if (showOriginal && originalAudioRef.current) {
        originalAudioRef.current.play().catch(() => {});
      }
      setIsPlaying(true);
    }
  }, [isPlaying, showOriginal]);

  const handleSeek = useCallback((value: number[]) => {
    const time = value[0];
    if (mediaRef.current) {
      mediaRef.current.currentTime = time;
      setCurrentTime(time);
      if (originalAudioRef.current) {
        originalAudioRef.current.currentTime = time;
      }
    }
  }, []);

  const handleMediaEnded = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (originalAudioRef.current) originalAudioRef.current.pause();
  }, []);

  const handleMediaLoaded = useCallback(() => {
    if (mediaRef.current && isFinite(mediaRef.current.duration)) {
      setDuration(mediaRef.current.duration);
    }
  }, []);

  // Toggle original song audio
  const toggleOriginal = useCallback(() => {
    const next = !showOriginal;
    setShowOriginal(next);

    if (!next) {
      if (originalAudioRef.current) originalAudioRef.current.pause();
    } else if (isPlaying && originalAudioRef.current) {
      originalAudioRef.current.currentTime = mediaRef.current?.currentTime ?? 0;
      originalAudioRef.current.play().catch(() => {});
    }
  }, [showOriginal, isPlaying]);

  // Update original audio volume
  useEffect(() => {
    if (originalAudioRef.current) {
      originalAudioRef.current.volume = originalVolume;
    }
  }, [originalVolume]);

  // Export replay as .webm file
  const handleExport = useCallback(async () => {
    if (!replay.data) return;
    setIsExporting(true);
    try {
      const extension = replay.hasWebcam ? 'video.webm' : 'audio.webm';
      const filename = `${replay.songTitle} - ${replay.playerName} Replay.${extension}`;
      const url = URL.createObjectURL(replay.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[ReplayModal] Export failed:', err);
      safeAlert('Export fehlgeschlagen. Bitte versuche es erneut.');
    } finally {
      setIsExporting(false);
    }
  }, [replay]);

  // Delete replay
  const handleDelete = useCallback(async () => {
    try {
      await deleteReplay(replay.id);
      onClose();
    } catch (err) {
      console.error('[ReplayModal] Delete failed:', err);
      safeAlert('Löschen fehlgeschlagen. Bitte versuche es erneut.');
    }
  }, [replay.id, onClose]);

  // Format time as mm:ss
  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Format date for display
  const formatDate = (timestamp: number): string => {
    const d = new Date(timestamp);
    return d.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isOpen) return null;

  const blobUrl = blobUrlRef.current;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
      {/* Background video (muted, visual only for analysis mode) */}
      {originalVideoUrl && (
        <video
          src={originalVideoUrl}
          className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
          muted
          playsInline
          autoPlay={isPlaying}
          loop
        />
      )}

      <div className="relative z-10 w-full max-w-4xl mx-4 flex flex-col bg-slate-950 rounded-2xl border border-white/10 shadow-2xl overflow-hidden max-h-[95vh]">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-5 py-3 bg-slate-900/80 border-b border-white/10 shrink-0">
          <div className="min-w-0 flex-1">
            <h2 className="text-white font-bold text-lg truncate">{replay.songTitle}</h2>
            <p className="text-white/50 text-sm truncate">{replay.songArtist}</p>
          </div>
          <div className="flex items-center gap-2 ml-4 shrink-0">
            <span className="text-xs text-white/30 hidden sm:block">{formatDate(replay.recordedAt)}</span>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Schließen"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Center: Video or Audio Player */}
        <div className="relative flex-1 min-h-0 bg-black flex items-center justify-center p-4">
          {replay.hasWebcam && blobUrl ? (
            <video
              ref={mediaRef as React.RefObject<HTMLVideoElement>}
              src={blobUrl}
              className="max-w-full max-h-[50vh] rounded-lg object-contain bg-black"
              playsInline
              onEnded={handleMediaEnded}
              onLoadedMetadata={handleMediaLoaded}
              onTimeUpdate={() => {}}
            />
          ) : (
            <div className="w-full flex flex-col items-center gap-4 py-8">
              {/* Audio waveform visualization (static placeholder) */}
              <div className="flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30">
                <svg className="w-10 h-10 text-cyan-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                </svg>
              </div>
              <p className="text-white/40 text-sm">Audio-Only Replay</p>
              <audio
                ref={mediaRef as React.RefObject<HTMLAudioElement>}
                src={blobUrl ?? undefined}
                className="hidden"
                onEnded={handleMediaEnded}
                onLoadedMetadata={handleMediaLoaded}
              />
            </div>
          )}
        </div>

        {/* Hidden original audio element */}
        {originalAudioUrl && (
          <audio
            ref={originalAudioRef}
            src={originalAudioUrl}
            className="hidden"
            onEnded={() => {}}
          />
        )}

        {/* Controls */}
        <div className="px-5 pb-3 shrink-0 space-y-3">
          {/* Seek bar */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/50 w-10 text-right tabular-nums">
              {formatTime(currentTime)}
            </span>
            <Slider
              value={[currentTime]}
              min={0}
              max={isFinite(duration) ? duration : 0}
              step={0.1}
              onValueChange={handleSeek}
              className="flex-1"
            />
            <span className="text-xs text-white/50 w-10 tabular-nums">
              {formatTime(duration)}
            </span>
          </div>

          {/* Playback buttons */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            {/* Left: Play/Pause + Original Song toggle */}
            <div className="flex items-center gap-2">
              <Button
                onClick={togglePlay}
                className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white rounded-xl px-5"
              >
                {isPlaying ? (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                    <rect x="14" y="4" width="4" height="16" rx="1" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </Button>

              {/* Two-way playback: Original Song alongside */}
              {originalAudioUrl && (
                <Button
                  variant={showOriginal ? 'default' : 'outline'}
                  onClick={toggleOriginal}
                  className={`rounded-xl px-3 text-xs ${
                    showOriginal
                      ? 'bg-purple-500/80 hover:bg-purple-500 text-white border-purple-500/50'
                      : 'border-white/20 text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                  title="Original-Song zur Analyse abspielen"
                >
                  🎵 Original-Song
                </Button>
              )}
            </div>

            {/* Right: Export + Delete */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleExport}
                disabled={isExporting}
                className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 rounded-xl px-3 text-xs"
              >
                {isExporting ? (
                  <span className="flex items-center gap-1">
                    <span className="animate-spin w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full" />
                    Export…
                  </span>
                ) : (
                  '⬇ Export'
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleDelete}
                className="border-red-500/50 text-red-400 hover:bg-red-500/10 rounded-xl px-3 text-xs"
              >
                🗑 Löschen
              </Button>
            </div>
          </div>

          {/* Original song volume slider */}
          {showOriginal && originalAudioUrl && (
            <div className="flex items-center gap-3 pt-1">
              <span className="text-xs text-purple-300/70 whitespace-nowrap">🎵 Lautstärke</span>
              <Slider
                value={[originalVolume]}
                min={0}
                max={1}
                step={0.05}
                onValueChange={(v) => setOriginalVolume(v[0])}
                className="flex-1 max-w-xs"
              />
              <span className="text-xs text-purple-300/50 w-8">{Math.round(originalVolume * 100)}%</span>
            </div>
          )}

          {/* Copyright notice */}
          <div className="pt-2 pb-1">
            <p className="text-[11px] text-white/25 leading-relaxed">
              {COPYRIGHT_NOTICE}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
