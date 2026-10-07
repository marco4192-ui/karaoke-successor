/**
 * ReplayGain-style loudness normalization (browser path).
 *
 * Songs in a karaoke library come from wildly different sources: some are
 * mastered hot (RMS close to 0 dBFS), others are ripped quietly. Without
 * normalization the user constantly rides the volume slider between songs.
 *
 * This module measures each song's loudness once (ReplayGain-style: per-window
 * RMS, 95th percentile) and derives a per-song gain toward the 89 dB
 * ReplayGain reference (≈ -18 dBFS RMS target). Loud songs are attenuated,
 * quiet songs boosted.
 *
 * R58 user directive ("Keine Limitierung, keine Ausnahmen"): the former ±12 dB
 * clamp is GONE — every song is driven EXACTLY to the 89 dB reference, no
 * matter how hot or quiet it was mastered. The only technical guard left is
 * digital silence (below -50 dBFS there is no signal to normalize). The
 * former settings toggle is gone too: normalization is ALWAYS active on
 * every playback path (game, jukebox, battle royale, all previews).
 *
 * Robustness rules (DO NOT break):
 * - NEVER throws: every entry point swallows errors and returns a safe value.
 * - NEVER blocks playback: analysis is async and purely additive; a failure
 *   simply yields gain 0 (unchanged volume).
 * - Analysis runs at most once per songId (localStorage cache + in-flight
 *   promise dedup). Cache is versioned (v2) — formula changes re-analyze.
 * - If the primary media URL cannot be fetched (dead blob: URL, exotic
 *   protocol), an optional fallback resolver provides a fresh fetchable URL
 *   (media-db refresh / Tauri file re-read) before giving up.
 * - The decoded AudioBuffer is dropped right after analysis (no retention).
 * - YouTube / missing media URLs are skipped (cannot fetch/decode).
 */

import { StorageKeys, getJsonOptional, setJson, getNumber } from '@/lib/storage';
import { getSharedMediaSource, resetSharedGainNode } from './shared-media-source';

/** ReplayGain 89 dB reference ≈ -18 dBFS RMS target. */
export const LOUDNESS_TARGET_DB = -18;
/** R58: measured loudness below this floor is digital silence — there is no
 *  signal to normalize, so the gain stays 0 (NOT a "Limitierung" of real
 *  songs: even very quiet recordings sit far above -50 dBFS RMS). */
const LOUDNESS_SILENCE_FLOOR_DB = -50;

/** Length of one RMS analysis window (ms) — ReplayGain uses ~50ms. */
const WINDOW_MS = 50;
/** Percentile of window RMS values used as the track's loudness estimate. */
const PERCENTILE = 0.95;

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Convert a dB value to a linear amplitude factor. */
export function dbToLinearFactor(db: number): number {
  return Math.pow(10, db / 20);
}

function clamp01(value: number): number {
  return clampNumber(value, 0, 1);
}

// ---------------------------------------------------------------------------
// Loudness analysis
// ---------------------------------------------------------------------------

/**
 * Analyze a decoded AudioBuffer and return its loudness in dBFS.
 *
 * Method (ReplayGain-style, simplified):
 * - Mono downmix (average of all channels).
 * - Split into 50ms windows; compute per-window RMS → 20*log10(rms)
 *   (silence windows are guarded to -100 dBFS).
 * - Sort window values ascending and take the 95th percentile — this
 *   represents the loud parts of the track and ignores long silent
 *   intros/outros/breaks.
 *
 * Returns LOUDNESS_TARGET_DB for degenerate buffers (empty/invalid) so the
 * resulting gain is 0 (playback unchanged) instead of a wild boost.
 */
export function analyzeTrackLoudnessDb(buffer: AudioBuffer): number {
  const sampleRate = buffer.sampleRate;
  const channels = Math.max(1, buffer.numberOfChannels);
  const length = buffer.length;
  if (!Number.isFinite(sampleRate) || sampleRate <= 0 || length <= 0) {
    return LOUDNESS_TARGET_DB;
  }

  // Mono downmix (average channels) — computed once, reused by every window.
  const channelData: Float32Array[] = [];
  for (let c = 0; c < channels; c++) {
    channelData.push(buffer.getChannelData(c));
  }

  const windowSize = Math.max(1, Math.floor((WINDOW_MS * sampleRate) / 1000));
  const windowCount = Math.max(1, Math.floor(length / windowSize));
  const windowDbs: number[] = [];

  for (let w = 0; w < windowCount; w++) {
    const start = w * windowSize;
    const size = Math.min(windowSize, length - start);
    if (size <= 0) break;
    let sumSquares = 0;
    for (let i = 0; i < size; i++) {
      let mono = 0;
      for (let c = 0; c < channels; c++) {
        mono += channelData[c][start + i];
      }
      mono /= channels;
      sumSquares += mono * mono;
    }
    const rms = Math.sqrt(sumSquares / size);
    windowDbs.push(rms > 0 ? 20 * Math.log10(rms) : -100);
  }

  if (windowDbs.length === 0) return LOUDNESS_TARGET_DB;
  windowDbs.sort((a, b) => a - b);
  const idx = Math.min(windowDbs.length - 1, Math.floor(windowDbs.length * PERCENTILE));
  return windowDbs[idx];
}

// ---------------------------------------------------------------------------
// Per-song gain with localStorage cache
// ---------------------------------------------------------------------------

type LoudnessGainCache = Record<string, number>;

/** Parse the localStorage gain cache safely (bad entries are dropped). */
function readGainCache(): LoudnessGainCache {
  const parsed = getJsonOptional<Record<string, unknown>>(StorageKeys.LOUDNESS_GAINS);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
  const out: LoudnessGainCache = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value === 'number' && Number.isFinite(value)) out[key] = value;
  }
  return out;
}

function writeGainCache(cache: LoudnessGainCache): void {
  setJson(StorageKeys.LOUDNESS_GAINS, cache);
}

/** In-flight analyses — guarantees "at most once per songId" even under races. */
const inFlightAnalyses = new Map<string, Promise<number>>();

/** Shared AudioContext used ONLY for decodeAudioData (created lazily, reused). */
let decodeContext: AudioContext | null = null;

function getDecodeContext(): AudioContext | null {
  try {
    if (typeof window === 'undefined') return null;
    const Ctor = window.AudioContext;
    if (!Ctor) return null;
    if (!decodeContext) decodeContext = new Ctor();
    return decodeContext;
  } catch {
    return null;
  }
}

async function decodeAudioDataSafe(data: ArrayBuffer): Promise<AudioBuffer | null> {
  // Primary: shared AudioContext (works while suspended; created once).
  const ctx = getDecodeContext();
  if (ctx) {
    try {
      return await ctx.decodeAudioData(data);
    } catch {
      // Fall through to the OfflineAudioContext fallback.
    }
  }
  try {
    // decodeAudioData detaches its input ArrayBuffer — work on a copy so the
    // fallback still has data if the primary attempt threw before detaching.
    const copy = data.byteLength > 0 ? data.slice(0) : data;
    const offline = new OfflineAudioContext(1, 128, 44100);
    return await offline.decodeAudioData(copy);
  } catch {
    return null;
  }
}

function isYouTubeUrl(url: string): boolean {
  return /(?:^|\.)youtube\.com\/|youtu\.be\//i.test(url);
}

/** Streaming-platform media cannot be fetched/decoded for loudness analysis. */
function isStreamingPlatformUrl(url: string): boolean {
  return /(?:^|\.)youtube\.com\/|youtu\.be\//i.test(url)
    || /(?:^|\.)dailymotion\.com\//i.test(url)
    || /(?:^|\.)dai\.ly\//i.test(url)
    || /(?:^|\.)vimeo\.com\//i.test(url)
    || /(?:^|\.)player\.vimeo\.com\//i.test(url);
}

/** Fetch + decode an audio URL into an AudioBuffer (null on ANY failure). */
async function fetchAudioBuffer(url: string): Promise<AudioBuffer | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.arrayBuffer();
    return await decodeAudioDataSafe(data);
  } catch {
    return null;
  }
}

/**
 * Return the per-song loudness normalization gain in dB for the given song.
 *
 * - Cached results come from localStorage (`StorageKeys.LOUDNESS_GAINS`, v2 —
 *   the pre-R58 cache with the ±12 dB clamp is not reused).
 * - On a cache miss the media file is fetched + decoded + analyzed; the
 *   derived gain (target − loudness, R58: UNCLAMPED) is persisted.
 * - If the primary fetch fails (dead blob: URL, CORS-blocked or exotic
 *   protocol), `fallbackUrl` may resolve a fresh fetchable URL (media-db
 *   refresh / Tauri file re-read) which is tried before giving up.
 * - ANY failure (no URL, streaming-platform URL [YouTube/Dailymotion/Vimeo],
 *   fetch/decode error, …) returns 0 — this function never throws and never
 *   blocks playback.
 */
export async function getSongLoudnessGainDb(
  songId: string | null | undefined,
  mediaUrl: string | null | undefined,
  fallbackUrl?: () => Promise<string | null | undefined>,
): Promise<number> {
  try {
    if (!songId || !mediaUrl) return 0;
    if (isStreamingPlatformUrl(mediaUrl)) return 0;

    const cache = readGainCache();
    const cached = cache[songId];
    if (typeof cached === 'number' && Number.isFinite(cached)) return cached;

    const existing = inFlightAnalyses.get(songId);
    if (existing) return existing;

    const analysis = (async (): Promise<number> => {
      try {
        let audioBuffer = await fetchAudioBuffer(mediaUrl);
        // R58: primary URL unusable (dead blob:, CORS, exotic protocol) →
        // let the caller's resolver produce a fresh fetchable URL before
        // giving up. This is what previously made previews play RAW.
        if (!audioBuffer && fallbackUrl) {
          try {
            const alt = await fallbackUrl();
            if (alt && alt !== mediaUrl) {
              audioBuffer = await fetchAudioBuffer(alt);
            }
          } catch {
            // Fallback itself failed — keep null.
          }
        }
        if (!audioBuffer) return 0;
        const loudnessDb = analyzeTrackLoudnessDb(audioBuffer);
        // No reference to `audioBuffer` is kept after this point (no retention).
        // Digital silence (or a degenerate buffer) — nothing to normalize.
        if (loudnessDb <= LOUDNESS_SILENCE_FLOOR_DB) return 0;
        // R58 ("Keine Limitierung"): UNCLAMPED gain — loud songs are attenuated
        // as far as needed, quiet songs boosted as far as needed, so every
        // song lands exactly on the 89 dB reference.
        const gainDb = LOUDNESS_TARGET_DB - loudnessDb;
        // Merge into the latest cache state (a concurrent analysis may have
        // written another song's entry in the meantime).
        const latest = readGainCache();
        latest[songId] = gainDb;
        writeGainCache(latest);
        return gainDb;
      } catch {
        return 0;
      }
    })();

    inFlightAnalyses.set(songId, analysis);
    try {
      return await analysis;
    } finally {
      inFlightAnalyses.delete(songId);
    }
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Volume application
// ---------------------------------------------------------------------------

/**
 * Last gain requested per element — guards against a stale async boost
 * (getSharedMediaSource resolves later) overwriting a newer request.
 */
const appliedGainDb = new WeakMap<HTMLMediaElement, number>();

/** True when the element's current media is same-origin (safe for Web Audio).
 *  R9: exported so other consumers (Battle Royale) can guard the Web Audio
 *  boost path the same way the game screen does. */
export function isSameOriginMedia(el: HTMLMediaElement): boolean {
  try {
    const src = el.currentSrc || el.src;
    if (!src) return true;
    const url = new URL(src, window.location.href);
    // blob: URLs carry the creating origin in their path.
    if (url.protocol === 'blob:') return true;
    if (url.protocol === 'data:') return true;
    return url.origin === window.location.origin;
  } catch {
    return false;
  }
}

/**
 * Apply master volume (0-100) + per-song loudness gain (dB) to a media element.
 *
 * - Attenuation (gainDb <= 0): pure `element.volume` multiplication — safe
 *   everywhere, no Web Audio graph needed.
 * - Boost (gainDb > 0): `element.volume` cannot exceed 1, so the element stays
 *   at master volume and the boost goes through a Web Audio GainNode on the
 *   shared media source. If the graph can't be created (or the media is
 *   cross-origin, where createMediaElementSource would output silence) the
 *   boost is silently dropped — playback continues at master volume.
 *
 * Never throws.
 */
export function applyLoudnessVolume(
  el: HTMLMediaElement,
  masterVolume: number,
  gainDb: number,
): void {
  try {
    appliedGainDb.set(el, gainDb);
    const master = clamp01(masterVolume / 100);
    if (gainDb > 0) {
      el.volume = master;
      if (isSameOriginMedia(el)) {
        void getSharedMediaSource(el)
          .then(({ gain }) => {
            // Only apply if this is still the latest request for the element
            // (a newer apply/clear may have happened while we were resolving).
            if (appliedGainDb.get(el) === gainDb) {
              gain.gain.value = dbToLinearFactor(gainDb);
            }
          })
          .catch(() => {
            // Graph unavailable — no boost, playback unchanged.
          });
      }
    } else {
      // Attenuation via element.volume only.
      el.volume = clamp01(master * dbToLinearFactor(gainDb));
      // Reset any boost left on the shared gain node (e.g. from the previous
      // song) so it doesn't stack with the element-level attenuation.
      resetSharedGainNode(el);
    }
  } catch {
    // Never break playback.
  }
}

/**
 * Reset the shared gain node of the element to unity (1.0).
 * Called on song change / unmount / toggle-off so a previous song's boost
 * doesn't leak into the next one. Never creates the Web Audio graph and
 * never throws.
 */
export function clearLoudnessGain(el: HTMLMediaElement): void {
  try {
    appliedGainDb.set(el, 0);
    resetSharedGainNode(el);
  } catch {
    // Ignore.
  }
}

// ---------------------------------------------------------------------------
// Preview volume (R49, reworked R58): library hover preview, Metadata Studio
// preview, companion song preview
// ---------------------------------------------------------------------------

/**
 * R49 user request: the 89 dB normalization ran in game/jukebox playback only
 * — previews played RAW (hardcoded 0.3/0.5/0.6 element volume, loud songs
 * blared). These helpers wire every preview path to the same pipeline:
 * preview-volume setting × per-song loudness gain.
 *
 * R58 ("keine Ausnahmen"): the normalization is UNCONDITIONAL — the old
 * settings toggle no longer gates it. `fallbackUrl` lets preview callers
 * supply a fresh fetchable URL when the primary one cannot be analyzed.
 */

/** Read the preview volume setting (0-100, default 30). Never throws. */
export function getPreviewVolumePercent(): number {
  try {
    return clampNumber(getNumber(StorageKeys.PREVIEW_VOLUME, 30), 0, 100);
  } catch {
    return 30;
  }
}

/**
 * Apply the preview-volume setting + the 89 dB loudness normalization
 * (R58: ALWAYS, unconditionally) to a PREVIEW media element.
 *
 * Contract (mirrors game playback — never breaks the preview):
 * - The plain preview volume is applied IMMEDIATELY (fast path: the preview
 *   must never blare at 1.0 while the analysis is still running).
 * - The per-song gain follows asynchronously when the (cached) analysis
 *   resolves; any failure silently keeps the base volume.
 * - `isStillActive` (optional) lets the caller bail out when the preview was
 *   stopped/replaced while the analysis was in flight.
 * - `fallbackUrl` (optional, R58) resolves a fresh fetchable URL when the
 *   primary media URL cannot be fetched for analysis.
 */
export function applyPreviewVolume(
  el: HTMLMediaElement,
  songId: string | null | undefined,
  mediaUrl: string | null | undefined,
  isStillActive?: () => boolean,
  fallbackUrl?: () => Promise<string | null | undefined>,
): void {
  try {
    const previewPercent = getPreviewVolumePercent();
    // Fast path: plain preview volume right away (iOS ignores element.volume —
    // same limitation the previous hardcoded values had, no regression).
    el.volume = clamp01(previewPercent / 100);
    if (!songId || !mediaUrl) return;
    void getSongLoudnessGainDb(songId, mediaUrl, fallbackUrl)
      .then((gainDb) => {
        if (isStillActive && !isStillActive()) return;
        if (gainDb === 0) return; // already at reference — base volume stands
        applyLoudnessVolume(el, previewPercent, gainDb);
      })
      .catch(() => {
        // Analysis failure → keep base volume. Never throw.
      });
  } catch {
    // Never break the preview.
  }
}

// ---------------------------------------------------------------------------
// R58: shared analysis fallback resolver
// ---------------------------------------------------------------------------

/** Minimal song shape needed to re-resolve a fetchable media URL. Works for
 *  the full `Song` type as well as slimmer song variants. */
interface FallbackSongShape {
  id: string;
  storedMedia?: unknown;
  relativeAudioPath?: string | null;
  relativeVideoPath?: string | null;
  baseFolder?: string | null;
}

/**
 * Build a fallback URL resolver for `getSongLoudnessGainDb` (R58):
 * - storedMedia songs → fresh blob: URL from the IndexedDB media store
 * - Tauri folder songs → fresh blob: URL read from disk
 *
 * Returned resolver NEVER throws; returns undefined when the song has neither
 * a media-db record nor a relative path (nothing to fall back to). Used when
 * the primary media URL cannot be fetched for analysis (dead blob: URL,
 * exotic protocol) — previously those songs silently played RAW.
 */
export function createSongMediaFallback(
  song: FallbackSongShape | null | undefined,
  kind: 'audio' | 'video',
): (() => Promise<string | null | undefined>) | undefined {
  if (!song) return undefined;
  const relativePath = kind === 'audio' ? song.relativeAudioPath : song.relativeVideoPath;
  if (!song.storedMedia && !relativePath) return undefined;
  return async () => {
    try {
      if (song.storedMedia) {
        const { refreshSongMediaUrl } = await import('@/lib/db/media-db');
        return await refreshSongMediaUrl(song.id, kind);
      }
      if (relativePath) {
        const { getSongMediaUrl } = await import('@/lib/file-storage-media');
        return await getSongMediaUrl(relativePath, song.baseFolder ?? undefined);
      }
      return null;
    } catch {
      return null;
    }
  };
}
