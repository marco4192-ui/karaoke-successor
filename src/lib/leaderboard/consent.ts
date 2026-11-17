/**
 * Online-Leaderboard — Einwilligung (consent) helpers.
 *
 * R67: Before the FIRST upload of personal data to the leaderboard server
 * (score, daily result, profile sync), the app must show a short notice of
 * WHAT is stored (display name, color, optional country, scores). The opt-in
 * switches (onlineEnabled + per-profile privacy flags) already exist — this
 * module only tracks that the informational notice was shown AND accepted.
 *
 * The flag is device-local (localStorage). Deleting the online data
 * (DELETE /profiles/{uid}) does NOT reset it — the user already knows what
 * is stored; a re-upload after a fresh registration asks no again.
 */

import { getItem, setItem, removeItem, StorageKeys } from '@/lib/storage';

/** True when the user has seen and accepted the leaderboard data notice. */
export function hasLeaderboardConsent(): boolean {
  return getItem(StorageKeys.LEADERBOARD_CONSENT) === '1';
}

/** Persist the consent (called by the "agree & upload" button). */
export function setLeaderboardConsent(): void {
  setItem(StorageKeys.LEADERBOARD_CONSENT, '1');
}

/** Reset the consent so the notice is shown again (e.g. for QA). */
export function resetLeaderboardConsent(): void {
  removeItem(StorageKeys.LEADERBOARD_CONSENT);
}
