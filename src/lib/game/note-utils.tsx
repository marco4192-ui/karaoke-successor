/**
 * Note utilities for the karaoke game — ORCHESTRATOR (R13).
 *
 * This file is a pure re-export facade; the implementation lives in the
 * focused domain modules under `src/lib/game/note-utils/` (moved
 * byte-identically in R13 — NO behavior change):
 *
 * - `display-style.tsx`      single-note render pipeline (sealed/exact/legacy/flat)
 * - `multi-player-overlay.tsx` N per-player strips inside one note bar (Medley Contest)
 * - `note-styling.ts`        low-perf lane background/glow helpers
 * - `pitch-stats.ts`         pitch math, display constants + pitch statistics
 * - `visible-notes.ts`       visible-notes time-window query + highway constants
 * - `color-utils.ts`         internal shared color helper (hexWithAlpha)
 *
 * The public import path `@/lib/game/note-utils` and its export surface
 * are UNCHANGED — all consumers keep working without modification.
 */

// ── Single-note display style pipeline ──────────────────────────────────
export type { NoteRenderMode } from './note-utils/display-style';
export { FLAT_NOTE_FILL_COLOR, getNoteDisplayStyleClasses } from './note-utils/display-style';

// ── Multi-player strips overlay (Medley Contest) ────────────────────────
export type { NoteStripPlayer } from './note-utils/multi-player-overlay';
export { getMultiPlayerNoteOverlay } from './note-utils/multi-player-overlay';

// ── Low-performance lane styling ────────────────────────────────────────
export { getNoteBackgroundClasses, getNoteBoxShadow } from './note-utils/note-styling';

// ── Pitch math, constants + statistics ──────────────────────────────────
export type { NotePositionData, PitchStats } from './note-utils/pitch-stats';
export {
  NOTE_HEIGHT,
  PITCH_RANGE,
  BASE_PITCH,
  calculatePitchY,
  calculatePitchStats,
} from './note-utils/pitch-stats';

// ── Visible-notes window query + display constants ──────────────────────
export {
  SING_LINE_POSITION,
  NOTE_WINDOW,
  VISIBLE_TOP,
  VISIBLE_RANGE,
  getVisibleNotes,
} from './note-utils/visible-notes';
