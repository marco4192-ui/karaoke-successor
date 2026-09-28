'use client';

/**
 * Shared hooks for the Metadata Studio.
 *
 * Split out of metadata-studio.tsx (R3 refactor):
 *  - useRuleHarmonizerState: subscribes to the singleton rule-harmonizer
 *    background job (survives studio unmounts).
 *  - useManualPreview: the listen-before-you-assign 30-second audio preview
 *    shared by the rule-mode review list and the manual edit list.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Song } from '@/types/game';
import { ensureSongUrls } from '@/lib/game/song-url-restore';
import { RuleHarmonizeJobState, ruleHarmonizer } from '@/lib/editor/rule-harmonizer';

/** Subscribe to the singleton rule-harmonizer background job state. */
export function useRuleHarmonizerState(): RuleHarmonizeJobState {
  const [state, setState] = useState<RuleHarmonizeJobState>(() => ruleHarmonizer.getState());
  useEffect(() => {
    const unsubscribe = ruleHarmonizer.subscribe(() => setState(ruleHarmonizer.getState()));
    setState(ruleHarmonizer.getState());
    return unsubscribe;
  }, []);
  return state;
}

/**
 * Manual-review audio preview state + controls.
 *
 * Lets the user LISTEN to a song before picking a main genre (user request:
 * a title alone doesn't reveal the genre of "Comedy"/"AI"/"Oldies" songs,
 * and researching each one externally isn't practical).
 *
 * Audio-URL first (restored via ensureSongUrls in Tauri), video container
 * fallback (mp4/webm audio track plays fine in an <audio> element).
 */
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
      audio.pause();
      audio.removeAttribute('src');
      audio.load(); // release media resources
      previewAudioRef.current = null;
    }
    setManualPreviewId(null);
  }, []);

  /** Play / stop a 30-second preview of a manual-review song. */
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
    audio.volume = 0.5;
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
