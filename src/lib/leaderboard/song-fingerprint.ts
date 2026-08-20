/**
 * Song Fingerprint Generator — Copyright-safe song identification.
 *
 * v1: SHA-256(artist+title, first 30 notes watermark) — original, backwards-compatible.
 * v2: Adds full-song structural digest + scoring metadata hash for server-side
 *     score plausibility verification. The v2 hash still includes the v1 hash
 *     so the server can accept both v1 and v2 submissions on the same song_hash.
 *
 * Versioned (v1:/v2:) for backwards compatibility.
 */

import { sha256 } from './song-fingerprint-internal';

// ── Types ──────────────────────────────────────────────────

/** Raw Ultrastar note as parsed from .txt */
export interface RawNote {
  type: string;      // ':', '*', 'F', 'R', 'G'
  startBeat: number;
  duration: number;
  pitch: number;     // relative pitch (0-24 typical)
  lyric: string;
}

/** Input data needed to generate a fingerprint */
export interface FingerprintInput {
  artist: string;
  title: string;
  gameType: 's' | 'd';  // s = single/duel, d = duet (vs-mode)
  notes: RawNote[];
}

/**
 * Extended input for v2 fingerprint with full structural data.
 * All fields optional — falls back to v1 if missing.
 */
export interface FingerprintInputV2 extends FingerprintInput {
  /** Song BPM (for structural normalization) */
  bpm?: number;
  /** Total number of singable notes (normal + golden) */
  totalNotes?: number;
  /** Total golden note count */
  goldenNoteCount?: number;
  /** Total estimated note ticks (duration / beatDuration per note, summed) */
  totalNoteTicks?: number;
  /** Song duration in ms */
  songDurationMs?: number;
}

/**
 * Scoring metadata needed for anti-cheat proof generation.
 * This data allows the server to independently verify score plausibility.
 */
export interface ScoringMetaForProof {
  totalNoteTicks: number;
  goldenNoteTicks: number;
  normalNoteTicks: number;
  pointsPerTick: number;
  comboMultiplier: number;
  totalNotes: number;
}

// ── Constants ──────────────────────────────────────────────

const FINGERPRINT_VERSION_V1 = 'v1';
const FINGERPRINT_VERSION_V2 = 'v2';
const MAX_NOTES_FOR_WATERMARK = 30;
const HASH_PREFIX_LENGTH = 16;

// ── Public API ─────────────────────────────────────────────

/**
 * Generate a copyright-safe song fingerprint hash (v1).
 * Returns something like "v1:a1b2c3d4e5f6a7b8"
 * Kept for backwards compatibility — all existing scores use this.
 */
export function generateSongHash(input: FingerprintInput): string {
  const normalized = normalizeText(input.artist + input.title);
  const watermark = extractNoteWatermark(input.notes);
  const raw = `${input.gameType}:${normalized}:${watermark}`;
  const hex = sha256(raw);
  return `${FINGERPRINT_VERSION_V1}:${hex.substring(0, HASH_PREFIX_LENGTH)}`;
}

/**
 * Generate an enhanced v2 song fingerprint hash.
 *
 * v2 extends v1 by including a full-song structural digest:
 *   - All note pitches quantized and concatenated (the "melody contour")
 *   - Total note count, golden note count, total ticks
 *   - BPM + duration (for timing verification)
 *
 * The v2 hash INPUT includes the v1 hash, so the server can verify
 * that a v2 submission corresponds to the same song as a v1 submission.
 * The OUTPUT is a separate v2 hash — both v1 and v2 hashes are stored
 * so lookups work with either version.
 *
 * Returns { v1Hash, v2Hash }.
 */
export function generateSongHashV2(input: FingerprintInputV2): { v1Hash: string; v2Hash: string } {
  // Always generate v1 first (needed as input for v2)
  const v1Hash = generateSongHash(input);

  // Build structural digest from ALL notes (not just first 30)
  const melodyContour = extractMelodyContour(input.notes);

  // Build metadata block
  const metaBlock = [
    input.bpm ?? 0,
    input.totalNotes ?? 0,
    input.goldenNoteCount ?? 0,
    input.totalNoteTicks ?? 0,
    input.songDurationMs ?? 0,
  ].join(':');

  // v2 raw = v1Hash + melody contour + metadata
  const raw = `${v1Hash}:${melodyContour}:${metaBlock}`;
  const hex = sha256(raw);
  const v2Hash = `${FINGERPRINT_VERSION_V2}:${hex.substring(0, HASH_PREFIX_LENGTH)}`;

  return { v1Hash, v2Hash };
}

/**
 * Batch-generate v1 hashes for all songs in a library.
 * Returns a Map<songId, hash>.
 */
export function generateSongHashes(
  songs: Array<{ id: string; artist: string; title: string; notes?: RawNote[]; parsedNotes?: Array<{ startBeat: number; duration: number; pitch: number }> }>,
  gameType: 's' | 'd' = 's'
): Map<string, string> {
  const map = new Map<string, string>();
  for (const song of songs) {
    const notes = (song.notes ?? song.parsedNotes ?? []).map(n => ({
      type: ':',
      startBeat: n.startBeat,
      duration: n.duration,
      pitch: n.pitch,
      lyric: '',
    }));
    map.set(song.id, generateSongHash({
      artist: song.artist,
      title: song.title,
      gameType,
      notes,
    }));
  }
  return map;
}

/**
 * Batch-generate v2 hashes for all songs in a library.
 * Returns a Map<songId, { v1Hash, v2Hash }>.
 */
export function generateSongHashesV2(
  songs: Array<{
    id: string; artist: string; title: string; bpm?: number; duration?: number;
    notes?: RawNote[]; parsedNotes?: Array<{ startBeat: number; duration: number; pitch: number; isGolden?: boolean }>;
  }>,
  gameType: 's' | 'd' = 's'
): Map<string, { v1Hash: string; v2Hash: string }> {
  const map = new Map<string, { v1Hash: string; v2Hash: string }>();
  for (const song of songs) {
    const rawInput = song.notes ?? song.parsedNotes ?? [];
    const notes = rawInput.map(n => ({
      type: ('type' in n && n.type === '*') || ('isGolden' in n && n.isGolden) ? '*' : ':',
      startBeat: n.startBeat,
      duration: n.duration,
      pitch: n.pitch,
      lyric: '',
    }));
    const goldenCount = rawInput.filter(n => ('type' in n && n.type === '*') || ('isGolden' in n && n.isGolden)).length;
    map.set(song.id, generateSongHashV2({
      artist: song.artist,
      title: song.title,
      gameType,
      notes,
      bpm: song.bpm,
      totalNotes: notes.length,
      goldenNoteCount: goldenCount,
      songDurationMs: song.duration,
    }));
  }
  return map;
}

// ── Internal: Unicode Normalization ─────────────────────────

/**
 * Strip everything except Unicode letters (\p{L}) and numbers (\p{N}),
 * then lowercase. This makes the hash resilient to
 * different spellings, punctuation, etc.
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\p{L}\p{N}]+/gu, '$&')
    .replace(/[^\p{L}\p{N}]/gu, '')
    .replace(/\s+/g, '')
    .trim();
}

// ── Internal: Note Watermark (v1) ───────────────────────────

/**
 * Extract a compact watermark from the first N notes.
 * Format: "beat:pitch:duration,beat:pitch:duration,..."
 */
function extractNoteWatermark(notes: RawNote[]): string {
  const relevant = notes
    .filter(n => n.type === ':' || n.type === '*')
    .slice(0, MAX_NOTES_FOR_WATERMARK);

  if (relevant.length === 0) return 'no_notes';

  return relevant
    .map(n => {
      const beat = Math.round(n.startBeat);
      const pitch = Math.round(n.pitch);
      const dur = Math.round(n.duration * 10) / 10;
      return `${beat}:${pitch}:${dur}`;
    })
    .join(',');
}

// ── Internal: Melody Contour (v2) ───────────────────────────

/**
 * Extract the full-song melody contour for v2 fingerprinting.
 * This captures the ENTIRE song's pitch structure, not just the first 30 notes.
 *
 * Format: quantized pitch deltas between consecutive notes, compacted.
 * Only normal (':') and golden ('*') notes are included.
 *
 * Example: "0,2,-1,3,0,-2,5,..."
 * Where each number is the semitone difference from the previous note.
 * The first note uses its absolute pitch.
 *
 * This is copyright-safe because it's a mathematical transformation of note
 * intervals — it doesn't contain the actual melody in a directly playable form,
 * and different songs can share similar contours.
 */
function extractMelodyContour(notes: RawNote[]): string {
  const relevant = notes
    .filter(n => n.type === ':' || n.type === '*');

  if (relevant.length === 0) return 'no_notes';

  return relevant
    .map((n, i) => {
      const pitch = Math.round(n.pitch);
      if (i === 0) return pitch;
      const prevPitch = Math.round(relevant[i - 1].pitch);
      return pitch - prevPitch;
    })
    .join(',');
}
