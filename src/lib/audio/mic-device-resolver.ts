/**
 * Mic-ID → browser deviceId resolver (user report round: "OverconstrainedError").
 *
 * The mic management layer (microphone-manager.ts) stores each configured mic
 * with an INTERNAL id (`mic-<timestamp>-<rand>`) plus the REAL browser
 * deviceId. Several game setup paths (unified party setup, PTM shared-mic)
 * pass the INTERNAL id down to the pitch detector — getUserMedia then gets
 * `{ exact: 'mic-1789…' }`, which is never a valid device id:
 *
 *   1. getUserMedia throws OverconstrainedError (console warning per player)
 *   2. The retry with `{ ideal: … }` silently falls back to the DEFAULT mic
 *      → multiple players can all listen on the same default device
 *
 * This helper resolves internal ids to real deviceIds by looking the mic up
 * in the persisted MULTI_MIC_CONFIG. Real browser deviceIds (long hashes)
 * and `undefined` pass through unchanged. Lookup results are cached; the
 * cache invalidates when the stored config changes (fallback: re-read after
 * 30 s, cheap — it's a synchronous localStorage read).
 */

import { StorageKeys, getJsonOptional } from '@/lib/storage';

interface SavedMicEntry {
  id: string;
  deviceId?: string;
  deviceName?: string;
  customName?: string;
}

interface SavedMicConfig {
  assignedMics?: SavedMicEntry[];
}

/** Cache: internal mic id → real browser deviceId (null when unknown). */
let idCache = new Map<string, string | null>();
let cacheBuiltAt = 0;
/** Invalidate when the underlying storage key changes (same-tab writes). */
let lastConfigRaw: string | null = null;

const CACHE_TTL_MS = 30_000;

function rebuildCache(): void {
  const cfg = getJsonOptional<SavedMicConfig>(StorageKeys.MULTI_MIC_CONFIG);
  const next = new Map<string, string | null>();
  for (const mic of cfg?.assignedMics ?? []) {
    // A mic without a deviceId is unusable for device-targeted getUserMedia
    next.set(mic.id, mic.deviceId ?? null);
  }
  idCache = next;
  cacheBuiltAt = Date.now();
  try {
    lastConfigRaw = typeof localStorage !== 'undefined'
      ? localStorage.getItem(StorageKeys.MULTI_MIC_CONFIG)
      : null;
  } catch {
    lastConfigRaw = null;
  }
}

/** True when the value looks like an internal mic-manager id (`mic-<ts>-<rand>`). */
export function isInternalMicId(value: string | undefined | null): boolean {
  return !!value && /^mic-\d+-[a-z0-9]+$/i.test(value);
}

/**
 * Resolve a mic id from the game-setup layer to a REAL browser deviceId.
 *
 * - `undefined` / empty → `undefined` (system default mic)
 * - internal id with a known mapping → the stored browser deviceId
 * - internal id WITHOUT a mapping (config gone) → `undefined` so getUserMedia
 *   uses the default device directly instead of failing an `exact` constraint
 *   (no OverconstrainedError spam, no pointless retry round-trip)
 * - anything else (already a real deviceId) → passed through unchanged
 */
export function resolveMicDeviceId(
  micId: string | undefined | null,
): string | undefined {
  if (!micId) return undefined;

  // Fast path: real browser deviceIds never match the internal pattern
  if (!isInternalMicId(micId)) return micId;

  let cache = idCache;
  if (Date.now() - cacheBuiltAt > CACHE_TTL_MS) {
    rebuildCache();
    cache = idCache;
  } else {
    // Cheap staleness check: storage content changed → rebuild once
    try {
      const raw = typeof localStorage !== 'undefined'
        ? localStorage.getItem(StorageKeys.MULTI_MIC_CONFIG)
        : null;
      if (raw !== lastConfigRaw) rebuildCache();
    } catch {
      /* ignore — cache stays as-is */
    }
  }

  return cache.get(micId) ?? undefined;
}

/** Test hook: drop the cache (used after mic config edits). */
export function resetMicDeviceResolverCache(): void {
  idCache = new Map();
  cacheBuiltAt = 0;
  lastConfigRaw = null;
}
