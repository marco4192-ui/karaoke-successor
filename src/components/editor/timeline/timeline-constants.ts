/**
 * Constants for the editor timeline.
 *
 * Extracted verbatim from timeline.tsx (R2 refactor) — values and comments
 * are unchanged; only the module boundary is new. The layout constants at
 * the bottom were hoisted 1:1 from the Timeline component body (they are
 * pure literals with no prop dependencies), so their original camelCase
 * names are kept on purpose to keep the component diff minimal.
 */
import type { NoteType } from '@/types/game';

// Visible pitch range per lane (2 octaves = 24 semitones).
// R9 (user request 1.1): was 3 octaves/36 semitones — the per-semitone lane
// rows were so flat that the note bars looked thin. Halving the visible
// range makes each row ~50% taller → note bars ≥50% thicker. The pitch
// ladder auto-centers on the notes' median and Shift+wheel scrolls, so
// notes outside the window stay reachable.
export const VISIBLE_OCTAVES = 2;
export const VISIBLE_PITCH_RANGE = VISIBLE_OCTAVES * 12;
// Split-view lanes (duet) show 16 semitones each — ~50% thicker note bars
// than the old 24-semitave lanes; trio/quartet lanes show 10 semitones.
export const SPLIT_PITCH_RANGE = 16;
export const SPLIT_PITCH_RANGE_MULTI = 10;

// Left gutter width for the pitch labels (must match ml-8 / w-8 usage below)
export const LEFT_GUTTER = 32;
// Max time gap between two tap notes before a new lyric line starts
export const TAP_LINE_GAP_MS = 1400;

// ── Zoom: presets from 5% up to 1000% ──
// R14 (user request 3): 500% is the new 100% — basePixelsPerSecond was
// raised 100 → 500 so the DEFAULT zoom (1 = "100%") shows the detail level
// the old 500% had. MIN_ZOOM went 0.25 → 0.05 so the overview range (whole
// song visible) is preserved: 5% × 500px/s = 25px/s = exactly the old 25%.
export const MIN_ZOOM = 0.05;
export const MAX_ZOOM = 10;
export const ZOOM_PRESETS = [0.05, 0.1, 0.2, 0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8, 9, 10];

// ── R14 note-drag feel (user requests 1 + 2) ──
/** Hysteresis margin (in pitch rows) for stepping between semitone levels
 *  during a vertical note drag. Prevents flicker right at a row boundary. */
export const PITCH_DRAG_HYSTERESIS = 0.25;
/** Half-width (in pitch rows) of the sticky "home" band around the note's
 *  ORIGINAL pitch: leaving it needs a deliberate full-row move, and any
 *  return drag catches it as soon as the mouse is within half a row of the
 *  grab point — so the original position can no longer be "jumped over". */
export const PITCH_DRAG_HOME_ROWS = 1.0;
/** Mouse pixels before the drag axis is decided (dominant direction wins). */
export const DRAG_AXIS_DEADZONE_PX = 4;
/** A drag stays on its locked axis until the mouse moves this many pitch
 *  rows on the OTHER axis — then both axes unlock (legacy 2D behaviour). */
export const DRAG_AXIS_ESCAPE_ROWS = 2.5;

/** All five note types with their TXT chars, for the DropUp menu. */
export const NOTE_TYPE_OPTIONS: Array<{ value: NoteType; char: string; }> = [
  { value: 'normal', char: ':' },
  { value: 'golden', char: '*' },
  { value: 'freestyle', char: 'F' },
  { value: 'rap', char: 'R' },
  { value: 'rapGolden', char: 'G' },
];

// ── Layout constants (hoisted verbatim from the Timeline component body) ──
// R14 (user request 3): 100 → 500. The zoom label still shows zoom*100%,
// so "100%" now displays the old "500%" detail level.
export const basePixelsPerSecond = 500;
export const TOTAL_MIN_PITCH = 24; // C1
export const TOTAL_MAX_PITCH = 96; // C7 (6-octave total range)
export const lyricTrackHeight = 40;
export const minimapHeight = 44;
// Height reserved for the note-details band between lyric track and minimap.
// R8: the useless pitch-graph strip above the lanes was removed — its 60 px
// go 1:1 into this band (108 → 168), so the pitch ladder keeps its size and
// just moves up while the primary input fields get roomier controls.
export const noteInfoHeight = 168;
