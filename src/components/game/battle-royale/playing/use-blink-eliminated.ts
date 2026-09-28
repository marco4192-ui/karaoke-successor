'use client';

/**
 * "Recently eliminated player" blink marker (user rule 6.4) — extracted 1:1
 * from battle-royale/playing-view.tsx (task R12). A newly eliminated player
 * gets a blinking red X on their card for ~2.7s (CSS brElimBlink), then stays
 * permanently grayed out. Consumed by the player cards strip.
 */
import { useEffect, useRef, useState } from 'react';
import type { BattleRoyaleGame } from '@/lib/game/battle-royale';

export function useBlinkEliminated(game: BattleRoyaleGame) {
  // ── User rule 6.4: recently eliminated player ──
  // A newly eliminated player gets a blinking red X on their card for ~2.7s
  // (CSS brElimBlink), then stays permanently grayed out. No fullscreen
  // overlay, no countdown. Diffs the eliminated set on every players update,
  // so it fires for BOTH round-end eliminations AND mid-round eliminations
  // (user rule 6.1: full-song rounds eliminate at intervals while the song
  // keeps playing).
  // NOTE: the blink timer lives in a ref (NOT effect cleanup) — game.players
  // changes on every scoring tick (~10×/s) and a cleanup-based timer would
  // be cancelled immediately.
  const [blinkEliminatedId, setBlinkEliminatedId] = useState<string | null>(null);
  const prevEliminatedIdsRef = useRef<Set<string>>(
    new Set(game.players.filter(p => p.eliminated).map(p => p.id)),
  );
  const blinkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const eliminatedNow = new Set(
      game.players.filter(p => p.eliminated).map(p => p.id),
    );
    const prev = prevEliminatedIdsRef.current;
    prevEliminatedIdsRef.current = eliminatedNow;

    let newly: string | null = null;
    for (const id of eliminatedNow) {
      if (!prev.has(id)) { newly = id; break; }
    }
    if (!newly) return;
    setBlinkEliminatedId(newly);
    if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
    blinkTimerRef.current = setTimeout(() => setBlinkEliminatedId(null), 2700);
  }, [game.players]);
  useEffect(() => {
    return () => {
      if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
    };
  }, []);

  return { blinkEliminatedId };
}
