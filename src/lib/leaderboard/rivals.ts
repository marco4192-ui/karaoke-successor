/**
 * R72/C: local rival list — the deliberately friendless comparison system.
 *
 * Design decision (R70/R71 clarification): there is NO server-side friend
 * graph. The user picks rivals manually from leaderboard entries; only
 * profile_uid + display name + color are stored — LOCALLY, in localStorage
 * (profile_uid is public in every board response anyway). The comparison
 * itself runs client-side against the existing GET /scores/batch endpoint
 * (up to 200 song hashes per call) — see the comparison dialog in the
 * highscore screen. The sync_code is NEVER a friend key (ownership token!).
 */

import { getItem, setItem, removeItem, StorageKeys } from '@/lib/storage';

export interface RivalEntry {
  /** Server-side profile_uid (== local id or syncUid of the rival). */
  uid: string;
  name: string;
  color: string;
  addedAt: number;
}

/** Small by design — a comparison against the whole board is the board. */
const MAX_RIVALS = 10;

function readRivals(): RivalEntry[] {
  try {
    const raw = getItem(StorageKeys.LEADERBOARD_RIVALS);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { rivals?: RivalEntry[] } | null;
    if (!parsed || !Array.isArray(parsed.rivals)) return [];
    return parsed.rivals.filter(
      r => r && typeof r.uid === 'string' && typeof r.name === 'string',
    );
  } catch {
    return [];
  }
}

function writeRivals(rivals: RivalEntry[]): void {
  try {
    if (rivals.length === 0) {
      removeItem(StorageKeys.LEADERBOARD_RIVALS);
    } else {
      setItem(StorageKeys.LEADERBOARD_RIVALS, JSON.stringify({ rivals }));
    }
  } catch { /* quota errors are non-critical */ }
}

export function getRivals(): RivalEntry[] {
  return readRivals();
}

export function isRival(uid: string): boolean {
  return readRivals().some(r => r.uid === uid);
}

/** Add a rival. Returns false when the list is full or the uid exists. */
export function addRival(rival: Omit<RivalEntry, 'addedAt'>): boolean {
  const rivals = readRivals();
  if (rivals.length >= MAX_RIVALS) return false;
  if (rivals.some(r => r.uid === rival.uid)) return false;
  rivals.push({ ...rival, addedAt: Date.now() });
  writeRivals(rivals);
  return true;
}

export function removeRival(uid: string): void {
  writeRivals(readRivals().filter(r => r.uid !== uid));
}
