'use client';

/**
 * Loudness-normalized base volume for ALL Battle Royale audio fades.
 * Extracted from use-battle-royale-game.ts (R4) — logic byte-identical.
 */
import { useEffect, useRef } from 'react';
import type { Song } from '@/types/game';
import { getSongLoudnessGainDb, applyLoudnessVolume, isSameOriginMedia } from '@/lib/audio/loudness';
import { resetSharedGainNode } from '@/lib/audio/shared-media-source';
import { StorageKeys, getBool, getNumber } from '@/lib/storage';

interface UseBattleRoyaleBaseVolumeParams {
  currentSong: Song | null;
  mediaLoaded: boolean;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  resolvedAudioUrlRef: React.RefObject<string | null>;
}

interface UseBattleRoyaleBaseVolumeReturn {
  /** Base audio volume (master volume × per-song loudness gain) that ALL BR fades run toward/from. */
  baseVolumeRef: React.MutableRefObject<number>;
}

export function useBattleRoyaleBaseVolume({ currentSong, mediaLoaded, audioRef, resolvedAudioUrlRef }: UseBattleRoyaleBaseVolumeParams): UseBattleRoyaleBaseVolumeReturn {
  // ── Loudness normalization: base volume for ALL BR audio fades ──
  // BR plays short snippets with imperative fades; every fade-in/out now runs
  // toward/from this base instead of a literal 1. The base combines the
  // persisted master volume with the per-song loudness gain toward the 89 dB
  // reference. R9: quiet-song BOOSTS go through the shared Web Audio gain node
  // (applyLoudnessVolume) instead of being clamped away; attenuations fold
  // into the element volume as before. Analysis is cached per songId and
  // never blocks playback: until the gain arrives the base is just the master
  // volume.
  const baseVolumeRef = useRef(1);
  useEffect(() => {
    let cancelled = false;
    const songId = currentSong?.id;
    const audioUrl = resolvedAudioUrlRef.current;
    const masterVolume = getNumber(StorageKeys.MASTER_VOLUME, 100) / 100;
    baseVolumeRef.current = Math.min(1, Math.max(0, masterVolume));
    if (!songId || !audioUrl || !getBool(StorageKeys.LOUDNESS_NORMALIZATION, true)) return;
    getSongLoudnessGainDb(songId, audioUrl)
      .then((gainDb) => {
        if (cancelled) return;
        // R9 (user request 3 — volume normalization "greift nicht"):
        // previously the boost was CLAMPED away here (Math.min(1, master ×
        // 10^(gain/20))) — quiet songs stayed quiet in BR because element.volume
        // cannot exceed 1. Now boosts (> 0 dB) run through the same Web Audio
        // GainNode path the regular game screen uses (applyLoudnessVolume),
        // while the fade base stays at master volume. Attenuation (<= 0 dB)
        // keeps folding into element volume as before.
        if (gainDb > 0) {
          baseVolumeRef.current = Math.min(1, Math.max(0, masterVolume));
          if (audioRef.current && isSameOriginMedia(audioRef.current)) {
            applyLoudnessVolume(audioRef.current, masterVolume * 100, gainDb);
          }
        } else {
          baseVolumeRef.current = Math.min(1, Math.max(0, masterVolume * Math.pow(10, gainDb / 20)));
        }
        // Apply immediately (lowering only — never interrupt an active fade-out
        // or raise the volume mid-fade; PlayingView's per-second reset effect
        // re-asserts the base afterwards).
        if (audioRef.current && audioRef.current.volume > baseVolumeRef.current) {
          audioRef.current.volume = baseVolumeRef.current;
        }
      })
      .catch(() => {
        // Never throw — analysis failure means gain 0 (base = master volume).
      });
    return () => {
      cancelled = true;
      // Song change: reset any boost left on the shared gain node so the
      // previous song's gain cannot leak into the next one.
      if (audioRef.current) resetSharedGainNode(audioRef.current);
    };
  }, [currentSong?.id, mediaLoaded, audioRef, resolvedAudioUrlRef]);

  return { baseVolumeRef };
}
