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
