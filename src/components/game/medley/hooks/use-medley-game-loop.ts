/**
 * Medley Contest — Game loop (R7 extraction).
 *
 * Two effects: the audio-stall fallback timer (auto-advances when media
 * fails to play) and the rAF-driven game loop (smooth ~40 fps time sync +
 * 50 ms logic ticks: scoring, snippet-end transitions, event sync).
 */

import { useEffect } from 'react';
import type { PitchDetectionResult } from '@/types/game';
import type {
  MedleyGamePhase, MedleyPlayer, MedleySong, MedleySettings, MedleyScoringEvent,
} from '../medley-types';
import type { MedleyNotePerfSample } from './medley-hook-types';
import type { UseMultiPitchDetectorReturn } from '@/hooks/use-multi-pitch-detector';
import type { UseMedleyAudioReturn } from './use-medley-audio';
import type { UseMedleyFeaturesReturn } from './use-medley-features';
import type { UseMedleyTeamBonusesReturn } from './use-medley-team-bonuses';
import type { UseMedleyEliminationReturn } from './use-medley-elimination';
import type { UseMedleyPhaseReturn } from './use-medley-phase';

// ===================== PARAMS =====================

export interface UseMedleyGameLoopParams {
  phase: MedleyGamePhase;
  isPlaying: boolean;
  currentSnippet: MedleySong | null;
  currentSnippetIdx: number;
  medleySongs: MedleySong[];
  settings: MedleySettings;
  pauseDialogAction: string | null;
  currentTimeMs: number;
  isEliminationMode: boolean;
  playersRef: React.MutableRefObject<MedleyPlayer[]>;
  multiPitchRef: React.MutableRefObject<UseMultiPitchDetectorReturn>;
  audio: UseMedleyAudioReturn;
  features: UseMedleyFeaturesReturn;
  teamBonuses: UseMedleyTeamBonusesReturn;
  elimination: UseMedleyEliminationReturn;
  getActivePlayerIds: () => string[];
  finalizeSnippetScores: (_activeIds: string[]) => void;
  scorePlayer: (playerId: string, pitch: PitchDetectionResult | null, absTime: number) => void;
  setPhase: UseMedleyPhaseReturn['setPhase'];
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  setCurrentTimeMs: React.Dispatch<React.SetStateAction<number>>;
  scoringEventsRef: React.MutableRefObject<MedleyScoringEvent[]>;
  setLastScoringEvents: React.Dispatch<React.SetStateAction<MedleyScoringEvent[]>>;
  lastScoringUiUpdateRef: React.MutableRefObject<number>;
  notePerformanceRef: React.MutableRefObject<Map<string, MedleyNotePerfSample[]>>;
  notePerformanceByPlayerRef: React.MutableRefObject<Map<string, Map<string, MedleyNotePerfSample[]>>>;
  setNotePerformance: React.Dispatch<React.SetStateAction<Map<string, MedleyNotePerfSample[]>>>;
  setNotePerformanceByPlayer: React.Dispatch<React.SetStateAction<Map<string, Map<string, MedleyNotePerfSample[]>>>>;
  forceRender: () => void;
}

// ===================== HOOK =====================

export function useMedleyGameLoop({
  phase,
  isPlaying,
  currentSnippet,
  currentSnippetIdx,
  medleySongs,
  settings,
  pauseDialogAction,
  currentTimeMs,
  isEliminationMode,
  playersRef,
  multiPitchRef,
  audio,
  features,
  teamBonuses,
  elimination,
  getActivePlayerIds,
  finalizeSnippetScores,
  scorePlayer,
  setPhase,
  setIsPlaying,
  setCurrentTimeMs,
  scoringEventsRef,
  setLastScoringEvents,
  lastScoringUiUpdateRef,
  notePerformanceRef,
  notePerformanceByPlayerRef,
  setNotePerformance,
  setNotePerformanceByPlayer,
  forceRender,
}: UseMedleyGameLoopParams): void {
  // ── Audio stall fallback timer ──
  // If audio fails to play or stalls, auto-advance after a grace period.
  // Uses a long grace period (8s) to avoid false positives during loading.
  // Also freezes during pause (isPausedRef).
  // Suppressed while isPreparingRef is true (audio still loading).
  useEffect(() => {
    if (phase !== 'playing' || !isPlaying || !currentSnippet || audio.isPausedRef.current) return;
    // Don't start stall detection while audio is still being prepared
    if (audio.isPreparingRef.current) return;

    const effective = audio.effectiveSnippetRef.current;
    const effectiveStart = effective?.startTime ?? currentSnippet.startTime;
    const effectiveEnd = effective?.endTime ?? currentSnippet.endTime;
    const snippetDuration = effectiveEnd - effectiveStart;
    let stallDetected = false;
    let stallCheckCount = 0;
    const STALL_CHECK_LIMIT = 16; // 16 × 500ms = 8 seconds grace period

    const checkInterval = setInterval(() => {
      if (audio.isPausedRef.current) return;
      // Don't trigger fallback while still preparing
      if (audio.isPreparingRef.current) { stallCheckCount = 0; return; }
      const audioEl = audio.audioRef.current;
      const fallbackVideo = audio.fallbackVideoRef.current;
      // Audio or video is playing fine — no stall
      const anyMediaPlaying = (audioEl && !audioEl.paused) || (fallbackVideo && !fallbackVideo.paused);
      if (anyMediaPlaying) {
        stallCheckCount = 0;
        return;
      }
      stallCheckCount++;
      if (stallCheckCount >= STALL_CHECK_LIMIT && !stallDetected) {
        stallDetected = true;
        const fallbackStartTime = Date.now();
        const startMs = currentTimeMs;
        // eslint-disable-next-line no-console
        console.warn('[Medley] Running in fallback mode (no audio)');
        clearInterval(checkInterval);
        audio.fallbackTimerRef.current = setInterval(() => {
          if (audio.isPausedRef.current) return;
          const elapsed = Date.now() - fallbackStartTime;
          const time = startMs + elapsed;
          setCurrentTimeMs(time);

          if (time >= snippetDuration) {
            if (audio.fallbackTimerRef.current) clearInterval(audio.fallbackTimerRef.current);
            audio.fallbackTimerRef.current = null;
            setIsPlaying(false);

            const activeIds = getActivePlayerIds();
            // Finalize pending note scores before transitioning
            finalizeSnippetScores(activeIds);

            activeIds.forEach(id => {
              const p = playersRef.current.find(p => p.id === id);
              if (p) p.snippetsSung++;
            });
            features.buildSnippetHighlight(currentSnippetIdx);
            teamBonuses.checkSynergy();
            teamBonuses.finalizeComeback();
            teamBonuses.syncTeamBonusResult();
            if (isEliminationMode) {
              elimination.eliminateLowestScorer();
              const remainingAfterElim = playersRef.current.filter(p => !p.isEliminated);
              if (remainingAfterElim.length <= 1) {
                setPhase('round-results');
                return;
              }
            }
            forceRender();

            if (currentSnippetIdx < medleySongs.length - 1) {
              setPhase('transition');
            } else {
              setPhase('round-results');
            }
          }
        }, 80);
      }
    }, 500);

    return () => {
      clearInterval(checkInterval);
      if (audio.fallbackTimerRef.current) { clearInterval(audio.fallbackTimerRef.current); audio.fallbackTimerRef.current = null; }
    };
  }, [phase, isPlaying, currentSnippet, currentSnippetIdx, medleySongs.length, pauseDialogAction, finalizeSnippetScores]);

  // ── Game loop ──
  // rAF-driven (same pattern as use-ptm-time-tracking.ts): the media clock is
  // read every display frame and currentTimeMs syncs at ~40 fps (25 ms), so
  // the note highway GLIDES instead of stepping at the old 50 ms interval
  // (20 fps — the choppiest mode in the app). Scoring, event sync and
  // forceRender keep their original 50 ms cadence, keeping per-second React
  // work identical to the previous setInterval implementation.
  useEffect(() => {
    if (phase !== 'playing' || !isPlaying || !currentSnippet) return;

    let rafId = 0;
    let lastTimeSync = 0; // 25 ms cadence — smooth currentTimeMs for the highway
    let lastTick = 0;     // 50 ms cadence — scoring / events / transitions

    const loop = () => {
      rafId = requestAnimationFrame(loop);

      // Don't advance while paused
      if (audio.isPausedRef.current) return;

      // Read time from whichever media element is actually playing (like PTM)
      const audioEl = audio.audioRef.current;
      const fallbackVideo = audio.fallbackVideoRef.current;
      let songTimeMs: number | null = null;
      if (audioEl && !audioEl.paused && audioEl.readyState >= 2) {
        songTimeMs = audioEl.currentTime * 1000;
      } else if (fallbackVideo && !fallbackVideo.paused && fallbackVideo.readyState >= 2) {
        songTimeMs = fallbackVideo.currentTime * 1000;
      }
      if (songTimeMs === null) return;

      // Cancel fallback timer now that real media is driving time
      if (audio.fallbackTimerRef.current) {
        clearInterval(audio.fallbackTimerRef.current);
        audio.fallbackTimerRef.current = null;
      }

      const effectiveStart = audio.effectiveSnippetRef.current?.startTime ?? currentSnippet.startTime;
      const effectiveEnd = audio.effectiveSnippetRef.current?.endTime ?? currentSnippet.endTime;
      const snippetTime = songTimeMs - effectiveStart;

      const perfNow = performance.now();

      // ── Smooth time sync (~40 fps) — this is what makes the notes glide ──
      if (perfNow - lastTimeSync >= 25) {
        lastTimeSync = perfNow;
        setCurrentTimeMs(snippetTime);
      }

      // ── Full logic tick (50 ms — original cadence) ──
      if (perfNow - lastTick < 50) return;
      lastTick = perfNow;

      // Check snippet end
      if (songTimeMs >= effectiveEnd) {
        // Finalize pending note scores for active players before transitioning
        const activeIds = getActivePlayerIds();
        finalizeSnippetScores(activeIds);

        // Stop whichever media is playing
        if (audioEl && !audioEl.paused) audioEl.pause();
        if (audio.fallbackVideoRef.current && !audio.fallbackVideoRef.current.paused) audio.fallbackVideoRef.current.pause();
        if (audioEl) audioEl.playbackRate = 1.0; // Reset playback rate
        setIsPlaying(false);

        // Count snippet as sung for active players
        activeIds.forEach(id => {
          const p = playersRef.current.find(p => p.id === id);
          if (p) p.snippetsSung++;
        });

        // Feature #17: Build highlight for this snippet
        features.buildSnippetHighlight(currentSnippetIdx);

        // Feature #18: Check team synergy at snippet end
        teamBonuses.checkSynergy();
        // Feature #18: Finalize comeback bonus (if active on last snippet)
        teamBonuses.finalizeComeback();
        // Sync team bonus result to state for UI
        teamBonuses.syncTeamBonusResult();

        forceRender();

        // Feature #10: Elimination — eliminate lowest scorer after snippet
        if (isEliminationMode) {
          elimination.eliminateLowestScorer();
          // Feature #10: If only 1 player remains, end game immediately
          const remainingAfterElim = playersRef.current.filter(p => !p.isEliminated);
          if (remainingAfterElim.length <= 1) {
            setPhase('round-results');
            return;
          }
        }

        // Feature #16: Mystery mode — show reveal
        if (settings.mysteryMode) {
          features.setMysteryReveal(true);
          features.setMysteryRevealSong(currentSnippet);
          // After 2 seconds, continue to transition/round-results
          setTimeout(() => {
            features.setMysteryReveal(false);
            features.setMysteryRevealSong(null);
            if (currentSnippetIdx < medleySongs.length - 1) {
              setPhase('transition');
            } else {
              setPhase('round-results');
            }
          }, 2000);
          return;
        }

        // Move to next or round-results
        if (currentSnippetIdx < medleySongs.length - 1) {
          setPhase('transition');
        } else {
          setPhase('round-results');
        }
        return;
      }

      // Score ALL active players individually using their own pitch
      const absTime = effectiveStart + snippetTime;
      const activeIds = getActivePlayerIds();
      for (const pid of activeIds) {
        const playerPitch = multiPitchRef.current.getPlayerPitch(pid);
        scorePlayer(pid, playerPitch, absTime);
      }

      // Feature #5: Push scoring events to UI state (throttled to ~100ms)
      const now = Date.now();
      if (now - lastScoringUiUpdateRef.current > 80 && scoringEventsRef.current.length > 0) {
        lastScoringUiUpdateRef.current = now;
        setLastScoringEvents([...scoringEventsRef.current]);
        // Keep events for 1.5 seconds, then discard
        const cutoff = now - 1500;
        scoringEventsRef.current = scoringEventsRef.current.filter(e => e.timestamp > cutoff);
      }

      // Unified HUD: sync note performance samples to state (~100ms) for the NoteHighway
      if (notePerformanceRef.current.size > 0) {
        setNotePerformance(new Map(notePerformanceRef.current));
      }
      // Multi-player strips: sync the per-player buckets in the same tick
      if (notePerformanceByPlayerRef.current.size > 0) {
        setNotePerformanceByPlayer(new Map(
          Array.from(notePerformanceByPlayerRef.current.entries(),
            ([pid, m]) => [pid, new Map(m)] as const),
        ));
      }

      // Keep display state in sync with ref mutations for live score updates
      forceRender();
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, isPlaying, currentSnippet, currentSnippetIdx, scorePlayer, getActivePlayerIds, forceRender, isEliminationMode, elimination.eliminateLowestScorer, features.buildSnippetHighlight, teamBonuses.checkSynergy, teamBonuses.finalizeComeback, settings.mysteryMode, medleySongs.length, teamBonuses.syncTeamBonusResult, finalizeSnippetScores]);
}
