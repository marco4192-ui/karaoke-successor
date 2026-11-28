/**
 * Global rAF game clock — the ONE shared, render-bypassing time source for
 * frame-accurate note motion.
 *
 * WHY: every game loop (Standard/Duet, PTM, CPTM, Medley, Battle Royale)
 * throttles its React time state to 25 ms to keep the render load low.
 * At a 60 Hz display that gate quantizes store writes onto every 2nd rAF
 * frame → the note stream effectively moved at 30 fps in ~33 ms jumps —
 * the visible "Stocken/Stottern der Noten". React re-renders themselves
 * also block rAF (the main thread is busy reconciling), so simply raising
 * the store-write rate would reintroduce the render storm.
 *
 * SOLUTION: all game loops ALSO write their UNTHROTTLED per-frame song
 * position (ms) into this module singleton. NoteHighway runs its own rAF
 * loop that reads it and positions the note elements via direct DOM
 * style writes — notes glide at full display refresh rate, completely
 * decoupled from React's render cadence. The throttled React time state
 * keeps driving everything else (fill, colours, HUD, lyrics).
 *
 * `stamp` = wall-clock (performance.now()) of the last write. Consumers
 * only trust `now` while the stamp is FRESH (< GAME_CLOCK_FRESH_MS): with
 * a stalled writer (paused game, or a consumer without its own game loop)
 * they fall back to their React-supplied time and behave exactly as
 * before.
 */

/** Shared singleton — written by the game loops, read by NoteHighway. */
export const gameClock = { now: 0, stamp: 0 };

/** A stamp older than this (ms) means no live game loop is driving. */
export const GAME_CLOCK_FRESH_MS = 250;

/** Write the current song position (ms). Called once per rAF by game loops. */
export function writeGameClock(nowMs: number): void {
  gameClock.now = nowMs;
  gameClock.stamp = performance.now();
}

/** True while a game loop wrote the clock recently (a live game drives it). */
export function isGameClockFresh(): boolean {
  return performance.now() - gameClock.stamp < GAME_CLOCK_FRESH_MS;
}

/**
 * Best available frame time: the live game clock when fresh, otherwise the
 * caller's fallback (usually the throttled React-supplied currentTime).
 */
export function readGameClockTime(fallbackMs: number): number {
  return isGameClockFresh() ? gameClock.now : fallbackMs;
}
