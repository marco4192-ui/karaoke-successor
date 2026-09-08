/**
 * Beat snapping for the karaoke editor (YASS-style magnet).
 *
 * MUST use the same beat formula as the UltraStar export/parser:
 * beatDuration = 15000 / BPM (ms per beat), beat n occurs at GAP + n * beatDuration.
 */
export function snapTimeToBeat(
  timeMs: number,
  bpm: number,
  gap: number,
  enabled: boolean
): number {
  if (!enabled || !bpm || bpm <= 0) return timeMs;
  const beatDuration = 15000 / bpm;
  const beats = Math.round((timeMs - gap) / beatDuration);
  return Math.max(0, gap + beats * beatDuration);
}
