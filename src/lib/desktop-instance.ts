/**
 * R27: Stable per-page-load ID for the desktop app instance.
 *
 * Why: the 2-second gamestate sync loop runs in EVERY open karaoke-app
 * instance (desktop window, preview tab, leftover browser tab). When two
 * instances POST gamestate concurrently, the server's last-writer-wins
 * merge made the companion mirror view flip-flop every 2 seconds — the
 * whole mirror view remounted cyclically (screen A → screen B → A → …).
 *
 * The server now runs a single-writer election for 'gamestate' POSTs:
 * the first sender owns the feed; other sender IDs get 409 while the
 * owner keeps posting (fresh within 5 s). All desktop-side gamestate
 * senders attach this ID so posts from the SAME instance always pass.
 */

let cachedId: string | null = null;

export function getDesktopInstanceId(): string {
  if (cachedId) return cachedId;
  try {
    cachedId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `desktop-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  } catch {
    cachedId = `desktop-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }
  return cachedId;
}

// ── R43: unified gamestate POST with single-writer backoff ──────────────────
// The server elects ONE gamestate writer (first sender wins, others get 409
// while the owner posts within the 5 s TTL — see api/mobile/post-handlers).
// Before R43 several senders posted WITHOUT a senderId (server mapped them
// to the shared 'legacy' identity) and NONE handled the 409: with two app
// windows open, the loser spammed `POST /api/mobile 409` every 2 s for
// HOURS (user console log: ~240 × 409 + ~1000 React stack lines). This
// helper is now the ONE way desktop code posts gamestate:
//   • always attaches this instance's senderId → same-tab posts never
//     conflict with each other
//   • on 409 it yields with exponential backoff (10 s → 20 s → 40 s → 60 s
//     cap): while yielding, posts are SKIPPED entirely (no request, no
//     console noise, no render churn). A probe after the backoff re-elects
//     automatically once the winning window closed (server TTL is 5 s).

let gamestateYieldUntil = 0;
let gamestateBackoffMs = 10_000;
const GAMESTATE_BACKOFF_CAP_MS = 60_000;

/** True while this instance has lost the writer election and is backing off. */
export function isGamestateWriterYielding(): boolean {
  return Date.now() < gamestateYieldUntil;
}

/** Reset the backoff (e.g. after a successful post or a fresh election win). */
function resetGamestateBackoff(): void {
  gamestateBackoffMs = 10_000;
}

/** POST a gamestate payload with senderId + 409 backoff. Returns the Response
 *  or null when the post was skipped because this instance is yielding. */
export async function postGameState(
  payload: Record<string, unknown>,
  opts?: { signal?: AbortSignal },
): Promise<Response | null> {
  if (isGamestateWriterYielding()) return null;
  try {
    const res = await fetch('/api/mobile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'gamestate',
        senderId: getDesktopInstanceId(),
        payload,
      }),
      signal: opts?.signal,
    });
    if (res.status === 409) {
      // Another window owns the feed — yield and retry later.
      gamestateYieldUntil = Date.now() + gamestateBackoffMs;
      gamestateBackoffMs = Math.min(gamestateBackoffMs * 2, GAMESTATE_BACKOFF_CAP_MS);
      return res;
    }
    if (res.ok) {
      resetGamestateBackoff();
    }
    return res;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return null;
    // Network error — return null so callers treat it as "not sent".
    return null;
  }
}
