'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { Song } from '@/types/game';
import { ensureSongUrls } from '@/lib/game/song-url-restore';
import { applyPreviewVolume, clearLoudnessGain, createSongMediaFallback } from '@/lib/audio/loudness';

/** Manual-review audio preview: lets the user LISTEN to a song before
 *  picking a main genre (user request: a title alone doesn't reveal the
 *  genre of "Comedy"/"AI"/"Oldies" songs, and researching each one
 *  externally isn't practical). Shared by the rule-mode correction list
 *  and the manual edit list. */
export function useManualPreview(songById: Map<string, Song>) {
  const [manualPreviewId, setManualPreviewId] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewStopTimerRef = useRef<number | null>(null);
  /** Generation counter — invalidates in-flight async previews after stop. */
  const previewGenRef = useRef(0);

  const stopManualPreview = useCallback(() => {
    previewGenRef.current++;
    if (previewStopTimerRef.current !== null) {
      window.clearTimeout(previewStopTimerRef.current);
      previewStopTimerRef.current = null;
    }
    const audio = previewAudioRef.current;
    if (audio) {
      clearLoudnessGain(audio); // R49: reset a possible boost gain node
      audio.pause();
      audio.removeAttribute('src');
      audio.load(); // release media resources
      previewAudioRef.current = null;
    }
    setManualPreviewId(null);
  }, []);

  /** Play / stop a 30-second preview of a manual-review song. Audio-URL
   *  first (restored via ensureSongUrls in Tauri), video container fallback
   *  (mp4/webm audio track plays fine in an <audio> element). */
  const toggleManualPreview = useCallback(async (songId: string) => {
    if (manualPreviewId === songId) {
      stopManualPreview();
      return; // toggle off
    }
    stopManualPreview();
    const generation = previewGenRef.current;
    const song = songById.get(songId);
    if (!song) return;

    let target = song;
    if (!target.audioUrl) {
      try { target = await ensureSongUrls(song); } catch { /* keep original */ }
    }
    if (generation !== previewGenRef.current) return; // cancelled meanwhile

    const src = target.audioUrl || target.videoUrl || target.videoBackground;
    if (!src) return;

    const audio = new Audio();
    // R49: preview-volume setting + 89 dB loudness normalization — this
    // preview previously played at a hardcoded 0.5, ignoring both the setting
    // and the normalization that game playback uses.
    // R58: unconditional (no toggle) + fallback resolver for analysis fetches.
    applyPreviewVolume(
      audio,
      target.id,
      src,
      () => generation === previewGenRef.current && previewAudioRef.current === audio,
      createSongMediaFallback(target, target.audioUrl === src ? 'audio' : 'video'),
    );
    audio.src = src;
    previewAudioRef.current = audio;

    const startTime = target.previewStart && target.previewStart > 0
      ? target.previewStart
      : target.preview?.startTime
        ? target.preview.startTime / 1000
        : 0;

    const startPlay = () => {
      if (generation !== previewGenRef.current || previewAudioRef.current !== audio) return;
      try {
        if (startTime > 0 && Number.isFinite(audio.duration) && audio.duration >= startTime) {
          audio.currentTime = startTime;
        }
      } catch { /* seeking unsupported — play from 0 */ }
      audio.play().catch(() => {
        if (previewAudioRef.current === audio) stopManualPreview();
      });
    };
    audio.addEventListener('loadedmetadata', startPlay, { once: true });
    audio.addEventListener('ended', () => {
      if (previewAudioRef.current !== audio) return;
      previewAudioRef.current = null;
      if (previewStopTimerRef.current !== null) {
        window.clearTimeout(previewStopTimerRef.current);
        previewStopTimerRef.current = null;
      }
      setManualPreviewId(null);
    });

    setManualPreviewId(songId);

    // Auto-stop after the preview window (same default as the library preview)
    const durationSec = target.previewDuration && target.previewDuration > 0
      ? target.previewDuration
      : target.preview?.duration
        ? target.preview.duration / 1000
        : 30;
    previewStopTimerRef.current = window.setTimeout(() => stopManualPreview(), durationSec * 1000);
  }, [manualPreviewId, songById, stopManualPreview]);

  // Release audio resources when the studio unmounts
  useEffect(() => () => stopManualPreview(), [stopManualPreview]);

  return { manualPreviewId, toggleManualPreview, stopManualPreview };
}
