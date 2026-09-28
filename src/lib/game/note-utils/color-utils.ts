/**
 * Internal color helper shared by the note render modules.
 *
 * R13: moved byte-identically from src/lib/game/note-utils.tsx
 * (only the `export` keyword was added).
 */

/** Convert a hex color (#rrggbb) to an rgba string with the given alpha. Non-hex colors pass through. */
export function hexWithAlpha(hex: string, alpha: number): string {
  if (!hex.startsWith('#') || hex.length < 7) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
