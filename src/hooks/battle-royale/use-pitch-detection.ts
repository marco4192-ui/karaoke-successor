'use client';

/**
 * Multi-pitch detection wiring for Battle Royale (one detector per local mic
 * player + teardown of eliminated players). Extracted from
 * use-battle-royale-game.ts (R4) — logic byte-identical.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useMultiPitchDetector, type PlayerPitchConfig, type UseMultiPitchDetectorReturn } from '@/hooks/use-multi-pitch-detector';
import type { BattleRoyaleGame } from '@/lib/game/battle-royale';
import type { Difficulty } from '@/types/game';

interface UseBattleRoyalePitchDetectionParams {
  game: BattleRoyaleGame;
  difficulty: Difficulty;
}

interface UseBattleRoyalePitchDetectionReturn {
  multiPitch: UseMultiPitchDetectorReturn;
  /** Ref to multiPitch for use in game loop callbacks (avoids stale closure) */
  multiPitchRef: React.RefObject<UseMultiPitchDetectorReturn>;
}

export function useBattleRoyalePitchDetection({ game, difficulty }: UseBattleRoyalePitchDetectionParams): UseBattleRoyalePitchDetectionReturn {
  // ── Multi-Pitch Detection (one detector per local mic player) ─────
  // Build player configs from ACTIVE (non-eliminated) mic players, each with
  // their own microphoneId. Use a stable key so this only recalculates when
  // player IDs/types/devices/elimination change, NOT on every scoring tick
  // (which changes game.players every ~100ms).
  // Fix 18: the key MUST include the elimination flag — otherwise the memo
  // would keep returning the stale array (with eliminated players) forever.
  const playerConfigsKey = game.players.map(p => `${p.id}:${p.playerType}:${p.microphoneId ?? ''}:${p.stereoChannel ?? ''}:${p.eliminated ? 'e' : 'a'}`).join('|');
  const playerConfigs = useMemo<PlayerPitchConfig[]>(() =>
    game.players
      .filter(p => p.playerType === 'microphone' && !p.eliminated)
      .map(p => ({
        playerId: p.id,
        type: 'local' as const,
        deviceId: p.microphoneId,
        stereoChannel: p.stereoChannel,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [playerConfigsKey],
  );

  const multiPitch = useMultiPitchDetector({
    players: playerConfigs,
    difficulty,
    autoStart: false,
  });

  // Ref to multiPitch for use in game loop callbacks (avoids stale closure)
  const multiPitchRef = useRef(multiPitch);
  multiPitchRef.current = multiPitch;

  // ── Fix 18: tear down detectors of newly eliminated mic players ─────
  // Eliminated players' microphones must stop recording immediately: their
  // detector/stream/analyser is torn down via multiPitch.removePlayer →
  // PitchDetectorManager.removePlayer (stream.stop + analyser.disconnect).
  // Diffs the eliminated set against the previous render so each player is
  // removed exactly once.
  const prevEliminatedIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const eliminatedNow = new Set(
      game.players.filter(p => p.eliminated).map(p => p.id),
    );
    const prev = prevEliminatedIdsRef.current;
    prevEliminatedIdsRef.current = eliminatedNow;

    for (const playerId of eliminatedNow) {
      if (prev.has(playerId)) continue;
      // removePlayer is idempotent (manager early-returns unknown ids), so
      // this is safe even before/after manager re-initialization.
      multiPitchRef.current.removePlayer(playerId);
    }
  }, [game.players]);

  return { multiPitch, multiPitchRef };
}
