/**
 * Song Fingerprint Generator — Copyright-safe song identification.
 *
 * Produces a hash like "v1:a1b2c3d4e5f6a7b8" from:
 *   1. Game type (s=single/duel, d=duet-vs)
 *   2. Normalized artist + title (Unicode-safe, regex-stripped)
 *   3. Note watermark from first 30 Ultrastar notes (beat:pitch:duration)
 *
 * Versioned (v1:) for backwards compatibility.
 */

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

// ── Constants ──────────────────────────────────────────────

const FINGERPRINT_VERSION = 'v1';
const MAX_NOTES_FOR_WATERMARK = 30;
const HASH_PREFIX_LENGTH = 16;

// ── Public API ─────────────────────────────────────────────

/**
 * Generate a copyright-safe song fingerprint hash.
 * Returns something like "v1:a1b2c3d4e5f6a7b8"
 */
export function generateSongHash(input: FingerprintInput): string {
  const normalized = normalizeText(input.artist + input.title);
  const watermark = extractNoteWatermark(input.notes);
  const raw = `${input.gameType}:${normalized}:${watermark}`;
  const hex = sha256(raw);
  return `${FINGERPRINT_VERSION}:${hex.substring(0, HASH_PREFIX_LENGTH)}`;
}

/**
 * Batch-generate hashes for all songs in a library.
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

// ── Internal: Unicode Normalization ─────────────────────────

/**
 * Strip everything except Unicode letters (\p{L}) and numbers (\p{N}),
 * then lowercase. This makes the hash resilient to
 * different spellings, punctuation, etc.
 */
function normalizeText(text: string): string {
  // \p{L} = any letter in any script, \p{N} = any number
  // We keep only these, collapse whitespace, lowercase
  return text
    .toLowerCase()
    .replace(/[\p{L}\p{N}]+/gu, '$&')   // keep only letters & numbers
    .replace(/[^\p{L}\p{N}]/gu, '')      // remove everything else
    .replace(/\s+/g, '')                    // remove any remaining whitespace
    .trim();
}

// ── Internal: Note Watermark ───────────────────────────────

/**
 * Extract a compact watermark from the first N notes.
 * Format: "beat:pitch:duration,beat:pitch:duration,..."
 * Values are normalized (rounded) for tolerance against minor file variations.
 */
function extractNoteWatermark(notes: RawNote[]): string {
  const relevant = notes
    .filter(n => n.type === ':' || n.type === '*') // only normal & golden notes
    .slice(0, MAX_NOTES_FOR_WATERMARK);

  if (relevant.length === 0) return 'no_notes';

  return relevant
    .map(n => {
      // Round beat to nearest integer, pitch to integer, duration to 1 decimal
      const beat = Math.round(n.startBeat);
      const pitch = Math.round(n.pitch);
      const dur = Math.round(n.duration * 10) / 10;
      return `${beat}:${pitch}:${dur}`;
    })
    .join(',');
}

// ── Internal: SHA-256 ───────────────────────────────────────

/**
 * Compute SHA-256 hash using Web Crypto API.
 * Falls back to a simple hash in non-browser environments.
 */
async function sha256Async(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Synchronous SHA-256 using a simple implementation.
 * Used because Web Crypto is async and we need sync hash generation.
 * This is a minimal SHA-256 implementation sufficient for fingerprinting.
 */
function sha256(message: string): string {
  // For browser/main thread, we can use the sync approach
  // This is a well-known minimal JS SHA-256
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  function rightRotate(value: number, amount: number): number {
    return (value >>> amount) | (value << (32 - amount));
  }

  function toBytes(str: string): number[] {
    const bytes: number[] = [];
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      if (code < 0x80) {
        bytes.push(code);
      } else if (code < 0x800) {
        bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
      } else if (code < 0xd800 || code >= 0xe000) {
        bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
      } else {
        i++;
        const hi = ((code - 0xd800) << 10) + (str.charCodeAt(i) - 0xdc00) + 0x10000;
        bytes.push(
          0xf0 | (hi >> 18), 0x80 | ((hi >> 12) & 0x3f),
          0x80 | ((hi >> 6) & 0x3f), 0x80 | (hi & 0x3f)
        );
      }
    }
    return bytes;
  }

  const msgBytes = toBytes(message);
  const msgLen = msgBytes.length;

  // Pre-processing: adding padding bits
  const bitLen = msgLen * 8;
  msgBytes.push(0x80);
  while ((msgBytes.length % 64) !== 56) msgBytes.push(0);
  // Append length as 64-bit big-endian
  for (let i = 56; i >= 0; i -= 8) msgBytes.push((bitLen / Math.pow(2, i)) & 0xff);

  // Initialize hash values
  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

  // Process each 64-byte chunk
  for (let offset = 0; offset < msgBytes.length; offset += 64) {
    const w: number[] = [];
    for (let i = 0; i < 16; i++) {
      w[i] = (msgBytes[offset + i * 4] << 24) | (msgBytes[offset + i * 4 + 1] << 16) |
             (msgBytes[offset + i * 4 + 2] << 8) | msgBytes[offset + i * 4 + 3];
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rightRotate(w[i-15], 7) ^ rightRotate(w[i-15], 18) ^ (w[i-15] >>> 3);
      const s1 = rightRotate(w[i-2], 17) ^ rightRotate(w[i-2], 19) ^ (w[i-2] >>> 10);
      w[i] = (w[i-16] + s0 + w[i-7] + s1) | 0;
    }

    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let i = 0; i < 64; i++) {
      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[i] + w[i]) | 0;
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;
      h = g; g = f; f = e; e = (d + temp1) | 0;
      d = c; c = b; b = a; a = (temp1 + temp2) | 0;
    }
    h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0; h5 = (h5 + f) | 0; h6 = (h6 + g) | 0; h7 = (h7 + h) | 0;
  }

  const hash = [h0, h1, h2, h3, h4, h5, h6, h7]
    .map(v => v.toString(16).padStart(8, '0')).join('');
  return hash;
}
