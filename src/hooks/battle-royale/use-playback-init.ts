'use client';

/**
 * Game initialization & playback for Battle Royale rounds: multi-pitch
 * start, audio/video playback, per-round fade-in (Bug #3: no fade on
 * snippet transitions). Extracted from use-battle-royale-game.ts (R4) —
 * logic byte-identical.
 */
import { useEffect, useRef } from 'react';
import type { BattleRoyaleGame } from '@/lib/game/battle-royale';
import type { UseMultiPitchDetectorReturn } from '@/hooks/use-multi-pitch-detector';
import type { Song } from '@/types/game';

interface UseBattleRoyalePlaybackInitParams {
  game: BattleRoyaleGame;
  mediaLoaded: boolean;
  currentSong: Song | null;
  multiPitch: UseMultiPitchDetectorReturn;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  resolvedAudioUrlRef: React.RefObject<string | null>;
  resolvedVideoUrlRef: React.RefObject<string | null>;
  audioHasPlayedRef: React.RefObject<boolean>;
  pausedRef: React.RefObject<boolean>;
  baseVolumeRef: React.MutableRefObject<number>;
  startGameLoopRef: React.RefObject<() => void>;
  gameLoopRef: React.RefObject<number | null>;
}

export function useBattleRoyalePlaybackInit({
  game,
  mediaLoaded,
  currentSong,
  multiPitch,
  audioRef,
  videoRef,
  resolvedAudioUrlRef,
  resolvedVideoUrlRef,
  audioHasPlayedRef,
  pausedRef,
  baseVolumeRef,
  startGameLoopRef,
  gameLoopRef,
}: UseBattleRoyalePlaybackInitParams): void {
  // ── Game Initialization & Playback ─────────────────────────────────
  // Track which round last triggered a fade-in so we can skip the fade on
  // snippet transitions within the same round (Bug #3: audible volume dips).
  const lastFadeInRoundRef = useRef<number>(-1);

  useEffect(() => {
    if (game.status === 'playing' && mediaLoaded && currentSong) {
      let cancelled = false;
      const currentRoundNum = game.currentRound;
      const isNewRound = currentRoundNum !== lastFadeInRoundRef.current;
      // IMPORTANT: Don't fade in during snippet transitions within the same round.
      // Only fade in when a new round starts — snippet transitions should be seamless.
      // Do NOT remove this check — fading on every snippet causes audible volume dips.

      const initGame = async () => {
        // Initialize multi-pitch detector (one per local mic player)
        const ok = await multiPitch.initialize();
        if (cancelled) return;
        if (ok) {
          multiPitch.start();
        } else {
          // eslint-disable-next-line no-console
          console.warn('[BattleRoyale] Multi-pitch initialization failed – mic detection unavailable. Check microphone permissions and ensure at least one player has playerType="microphone".');
        }

        const audio = audioRef.current;
        const fadeInAudio = () => {
          if (!audio) return;
          audio.volume = 0;
          const fadeStart = performance.now();
          const FADE_DURATION = 800; // 800ms fade-in
          const fadeIn = (now: number) => {
            if (cancelled || !audio) return;
            const elapsed = now - fadeStart;
            const progress = Math.min(elapsed / FADE_DURATION, 1);
            // Fade toward the normalized base volume (master × loudness gain),
            // NOT a literal 1 — re-read the ref every frame so a gain that
            // arrives mid-fade is respected immediately.
            audio.volume = Math.max(0, Math.min(1, baseVolumeRef.current * progress));
            if (progress < 1) requestAnimationFrame(fadeIn);
          };
          requestAnimationFrame(fadeIn);
        };

        const startPlayback = (onReady: () => void) => {
          if (!audio || !resolvedAudioUrlRef.current) return;
          if (audio.readyState >= 3) {
            onReady();
          } else {
            const onCanPlay = () => {
              audio.removeEventListener('canplay', onCanPlay);
              onReady();
            };
            audio.addEventListener('canplay', onCanPlay);
          }
        };

        if (audio && resolvedAudioUrlRef.current) {
          startPlayback(() => {
            if (cancelled || pausedRef.current) return;
            if (isNewRound) {
              // New round: smooth 800ms fade-in from silence
              fadeInAudio();
              lastFadeInRoundRef.current = currentRoundNum;
            } else {
              // Snippet transition within same round: set volume to the
              // normalized base immediately so there's no audible dip
              // between snippets.
              audio.volume = baseVolumeRef.current;
            }
            audio.play()
              .then(() => { audioHasPlayedRef.current = true; })
              // eslint-disable-next-line no-console
              .catch(e => console.error('Audio play error:', e));
          });
        } else {
          // eslint-disable-next-line no-console
          console.warn('[BattleRoyale] No audio URL resolved');
        }
        if (videoRef.current && resolvedVideoUrlRef.current && !pausedRef.current) {
          // eslint-disable-next-line no-console
          videoRef.current.play().catch(e => console.error('Video play error:', e));
        }

        startGameLoopRef.current();
      };
      initGame();

      return () => {
        cancelled = true;
        multiPitch.stop();
        if (gameLoopRef.current) {
          cancelAnimationFrame(gameLoopRef.current);
        }
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.status, mediaLoaded, currentSong]);
}
