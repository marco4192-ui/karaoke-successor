'use client';

/**
 * Companion live-singing feed (ghost/hit monitor on the phones) for Battle
 * Royale. Extracted from use-battle-royale-game.ts (R4) — logic
 * byte-identical.
 */
import { useEffect } from 'react';
import type { BattleRoyaleGame, BattleRoyalePlayer } from '@/lib/game/battle-royale';
import type { UseMultiPitchDetectorReturn } from '@/hooks/use-multi-pitch-detector';
import type { useBattleRoyaleCompanionPolling } from '@/hooks/use-battle-royale-companion-polling';
import { getActiveNotesAtTime } from './note-utils';
import type { BrNotePerformanceSample } from './note-performance';
import type { BattleRoyaleTimingData } from './use-timing-data';

interface UseBattleRoyaleCompanionLiveFeedParams {
  game: BattleRoyaleGame;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  timingDataRef: React.RefObject<BattleRoyaleTimingData | null>;
  activePlayersRef: React.RefObject<BattleRoyalePlayer[]>;
  gameRef: React.RefObject<BattleRoyaleGame>;
  pausedRef: React.RefObject<boolean>;
  multiPitchRef: React.RefObject<UseMultiPitchDetectorReturn>;
  companionPitchCacheRef: ReturnType<typeof useBattleRoyaleCompanionPolling>['companionPitchCacheRef'];
  brNotePerformanceRef: React.RefObject<Map<string, Map<string, BrNotePerformanceSample[]>>>;
}

export function useBattleRoyaleCompanionLiveFeed({
  game,
  audioRef,
  timingDataRef,
  activePlayersRef,
  gameRef,
  pausedRef,
  multiPitchRef,
  companionPitchCacheRef,
  brNotePerformanceRef,
}: UseBattleRoyaleCompanionLiveFeedParams): void {
  // ── Companion live-singing feed (ghost/hit monitor on the phones) ──
  // Pushes a compact per-player singing summary while a round is playing:
  // current note, target note, hit rate of the active note and combo streak
  // → companions render a live monitor (hits + ghost-style pitch offsets).
  // 500 ms cadence: the general /api/mobile POST limit is 300/min and the
  // gamestate push already uses 120/min (2 s) — this fits in the budget.
  useEffect(() => {
    if (game.status !== 'playing') return;
    const interval = setInterval(() => {
      if (gameRef.current.status !== 'playing' || pausedRef.current) return;
      const td = timingDataRef.current;
      if (!td) return;
      const t = audioRef.current ? audioRef.current.currentTime * 1000 : 0;
      const activeNotes = getActiveNotesAtTime(td.allNotes, t);
      if (activeNotes.length === 0) return;

      const players = activePlayersRef.current
        .filter(p => !p.eliminated)
        .map(p => {
          // Live pitch: local mic players via their own detector, companion
          // players via the polling cache (profile ids = player ids).
          const pitch = p.playerType === 'companion'
            ? companionPitchCacheRef.current.get(p.id)
            : multiPitchRef.current.getPlayerPitch(p.id);
          const sungNote = pitch && pitch.note != null ? pitch.note : null;
          const singing = !!pitch && pitch.note != null && pitch.isSinging !== false;

          // Target: the active note closest to the sung pitch (or the first).
          let targetNote: number | null = activeNotes[0].pitch;
          if (sungNote != null) {
            let best = activeNotes[0].pitch;
            let bestDist = Math.abs(sungNote - best);
            for (let i = 1; i < activeNotes.length; i++) {
              const dist = Math.abs(sungNote - activeNotes[i].pitch);
              if (dist < bestDist) { bestDist = dist; best = activeNotes[i].pitch; }
            }
            targetNote = best;
          }

          // Hit rate over the recent samples of the active notes (ghost monitor).
          let hitRate = 0;
          const perfMap = brNotePerformanceRef.current.get(p.id);
          if (perfMap) {
            let hits = 0;
            let total = 0;
            for (const note of activeNotes) {
              const samples = perfMap.get(note.id || `note-${note.startTime}`);
              if (!samples || samples.length === 0) continue;
              for (let i = Math.max(0, samples.length - 12); i < samples.length; i++) {
                if (samples[i].hit) hits++;
                total++;
              }
            }
            if (total > 0) hitRate = hits / total;
          }

          const gamePlayer = gameRef.current.players.find(gp => gp.id === p.id);
          return {
            id: p.id,
            name: p.name,
            color: p.color,
            singing,
            sungNote,
            targetNote,
            hitRate: Math.round(hitRate * 100) / 100,
            streak: gamePlayer?.currentCombo ?? 0,
          };
        });

      if (players.length === 0) return;
      fetch('/api/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'br-singing',
          payload: { players, serverTime: Date.now() },
        }),
      }).catch(() => { /* live monitor is best-effort */ });
    }, 500);
    return () => clearInterval(interval);
  }, [game.status, audioRef, timingDataRef, companionPitchCacheRef]);
}
