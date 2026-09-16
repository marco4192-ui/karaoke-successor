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
 *
 * ── Liveness validation (stale deviceId detection) ──
 * The STORED deviceId can go stale: unplugging and re-plugging a mic usually
 * yields a NEW browser deviceId. A stale id resolves "successfully" and then
 * hands getUserMedia `{ exact: <dead id> }` → OverconstrainedError → silent
 * fallback to the default mic. Resolved deviceIds are therefore validated
 * against the set of currently CONNECTED audio-input deviceIds
 * (enumerateDevices provides deviceIds WITHOUT permission — only labels need
 * permission). The hot path stays SYNCHRONOUS: it consults a cached
 * connected-set that is refreshed asynchronously (fire-and-forget) whenever
 * it is older than ~5 s, on devicechange events, or right after a stale
 * candidate was detected. A stale entry is pruned from the in-memory cache
 * AND (best-effort) from the persisted MULTI_MIC_CONFIG, and resolution
 * returns `undefined` (default mic) with ONE console.warn per internal id
 * per session. Until the first refresh lands — or when enumeration cannot
 * provide real deviceIds (Chrome returns empty ids before any capture
 * permission was granted) — liveness is unverifiable and the stored id is
 * returned unchanged (previous behaviour, never breaks the working case).
 */

import { StorageKeys, getItem, setJson, getJsonOptional } from '@/lib/storage';

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

// ── Connected-device cache (liveness validation) ────────────────────────────

/** Currently connected audio-input deviceIds; `null` = not verified yet. */
let connectedDeviceIds: Set<string> | null = null;
/** Timestamp of the last refresh that produced a USABLE set. */
let connectedCheckedAt = 0;
/** Timestamp of the last refresh ATTEMPT (usable or not) — anti-hammering. */
let connectedRefreshAttemptAt = 0;
let connectedRefreshInFlight = false;
let deviceChangeListenerBound = false;
/** Internal ids already reported stale this session (warn once, no spam). */
const warnedStaleMicIds = new Set<string>();

const CONNECTED_TTL_MS = 5_000;

function getMediaDevices(): MediaDevices | undefined {
  return typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined;
}

/**
 * Enumerate audio inputs now and adopt the result into the liveness cache.
 * Returns the usable connected set, or `null` when enumeration is
 * unavailable / failed / returned only empty deviceIds (Chrome before any
 * capture permission — such a result can neither prove nor disprove
 * connection, so the previous set is kept).
 */
async function enumerateAndUpdateConnected(): Promise<Set<string> | null> {
  const md = getMediaDevices();
  if (!md || typeof md.enumerateDevices !== 'function') return null;
  bindDeviceChangeListener(md);
  try {
    const devices = await md.enumerateDevices();
    const next = new Set<string>();
    for (const device of devices) {
      // DeviceIds are available without permission; labels are not — never
      // depend on labels here.
      if (device.kind === 'audioinput' && device.deviceId) next.add(device.deviceId);
    }
    connectedRefreshAttemptAt = Date.now();
    connectedRefreshInFlight = false;
    if (next.size > 0) {
      connectedDeviceIds = next;
      connectedCheckedAt = Date.now();
      return next;
    }
    return null;
  } catch {
    connectedRefreshAttemptAt = Date.now();
    connectedRefreshInFlight = false;
    return null;
  }
}

/** Fire-and-forget refresh of the connected set — never blocks the hot path. */
function refreshConnectedDeviceIds(force = false): void {
  if (connectedRefreshInFlight) return;
  // Don't hammer enumerateDevices when the last attempt was very recent
  // (e.g. pre-permission results stay unusable — retry at TTL cadence).
  if (!force && Date.now() - connectedRefreshAttemptAt < CONNECTED_TTL_MS) return;
  connectedRefreshInFlight = true;
  void enumerateAndUpdateConnected();
}

/**
 * Best-effort prune of one mic entry from the persisted MULTI_MIC_CONFIG.
 * Implemented LOCALLY (same storage key + shape as microphone-manager's
 * saveConfig) — importing the manager here created a circular dependency
 * (microphone-manager → mic-device-resolver → microphone-manager), which
 * Turbopack breaks with "Export … doesn't exist in target module".
 * Pure localStorage surgery; other entries are preserved.
 */
function pruneSavedMicConfigEntry(micId: string): boolean {
  try {
    const raw = getItem(StorageKeys.MULTI_MIC_CONFIG);
    if (!raw) return false;
    const config = JSON.parse(raw) as SavedMicConfig;
    if (!Array.isArray(config?.assignedMics)) return false;
    const next = config.assignedMics.filter(mic => mic?.id !== micId);
    if (next.length === config.assignedMics.length) return false;
    config.assignedMics = next;
    setJson(StorageKeys.MULTI_MIC_CONFIG, config);
    return true;
  } catch {
    // Non-critical: the entry stays persisted; we prune again on the next
    // stale detection.
    return false;
  }
}

/** Keep the connected set fresh across hotplug events (bound once). */
function bindDeviceChangeListener(md: MediaDevices): void {
  if (deviceChangeListenerBound) return;
  deviceChangeListenerBound = true;
  try {
    md.addEventListener('devicechange', () => {
      // Device topology changed — force a refresh so the next resolution
      // (and any in-flight setup) decides on current device state.
      connectedCheckedAt = 0;
      refreshConnectedDeviceIds(true);
    });
  } catch {
    /* non-fatal — staleness then relies on the TTL refresh alone */
  }
}

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
 * - internal id with a known mapping → the stored browser deviceId, IF that
 *   device is currently connected (liveness-validated; a stale mapping is
 *   pruned and resolves to `undefined`)
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

  if (Date.now() - cacheBuiltAt > CACHE_TTL_MS) {
    rebuildCache();
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
  const cache = idCache;

  const storedDeviceId = cache.get(micId);
  // Unknown internal id (config gone) or entry without a usable deviceId →
  // default mic directly (same as before)
  if (!storedDeviceId) return undefined;

  // ── Liveness validation (synchronous — consults the cached connected set,
  //    refreshes it asynchronously in the background when stale) ──
  if (connectedCheckedAt === 0 || Date.now() - connectedCheckedAt > CONNECTED_TTL_MS) {
    refreshConnectedDeviceIds();
  }
  // Not verified yet (first call / enumeration unavailable / pre-permission
  // empty ids) → previous behaviour: trust the stored id, don't break the
  // working case.
  if (connectedDeviceIds === null) return storedDeviceId;

  if (connectedDeviceIds.has(storedDeviceId)) return storedDeviceId;

  // MISS → the stored deviceId is stale (mic unplugged / re-plugged with a
  // new id). Prune the entry so it cannot resurrect, fall back to the
  // default mic and warn ONCE per internal id per session.
  cache.delete(micId);
  pruneSavedMicConfigEntry(micId); // best-effort persisted prune
  refreshConnectedDeviceIds(true); // re-verify device list for the next call
  if (!warnedStaleMicIds.has(micId)) {
    warnedStaleMicIds.add(micId);
    // eslint-disable-next-line no-console
    console.warn(`[MicDeviceResolver] '${micId}' → stored deviceId is not connected (stale) — entry pruned, falling back to default mic`);
  }
  return undefined;
}

/**
 * Definitive (async) liveness check for a persisted mic choice — used by
 * setup UIs (e.g. the PTM shared-mic restore), NOT by the sync hot path.
 * Forces a fresh enumerateDevices round-trip first so the verdict reflects
 * the CURRENT device state, then delegates to resolveMicDeviceId():
 *
 * - `false` → the id is an internal id whose stored deviceId is stale (the
 *   entry gets pruned + warned exactly like in the hot path) or whose
 *   config entry is gone entirely → caller should clear the stored choice
 * - `true`  → connected, raw/default id, or liveness unverifiable
 *   (enumeration unavailable / pre-permission empty ids) — never clears a
 *   possibly working choice
 */
export async function isMicIdConnected(
  micId: string | null | undefined,
): Promise<boolean> {
  if (!micId || !isInternalMicId(micId)) return true; // default/raw ids are not managed here
  const fresh = await enumerateAndUpdateConnected();
  if (fresh === null) return true; // cannot verify → assume the choice still works
  return resolveMicDeviceId(micId) !== undefined;
}

/** Test hook: drop the cache (used after mic config edits). */
export function resetMicDeviceResolverCache(): void {
  idCache = new Map();
  cacheBuiltAt = 0;
  lastConfigRaw = null;
  // Also force a fresh device-liveness check on the next resolution.
  connectedCheckedAt = 0;
}
