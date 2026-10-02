// Blob-URL-Guard — Runtime-Immunität für GETEILTE blob:-URLs (R46)
//
// Historie: Fünf Fix-Runden (R26, R34, R41, R43, R44) haben je einen konkreten
// „Cover-Killer" geschlossen — aber neue Consumer entstehen laufend nach
// (das SongVotingModal schlüpfte z.B. neun Runden lang durch jeden Audit).
// Jeder dieser Bugs hatte dieselbe Form: irgendein Code rief
// URL.revokeObjectURL() auf einer URL, die er nicht selbst erstellt hatte —
// und tötete damit eine geteilte stable URL, die noch in Song-Objekten
// (Library-Snapshot, Party-Pool, Warteschlange, Grids) referenziert war.
//
// Dieser Guard macht die FEHLERKLASSE unmöglich, statt jeden einzelnen
// Consumer zu jagen:
//   - Eigener-Modul (media-db, file-storage-media) registriert jede URL, die
//     es an Song-Objekte / den Cache weitergibt, als SHARED.
//   - URL.revokeObjectURL() auf eine SHARED-URL von AUSSEN wird IGNORIERT
//     (inkl. Console-Warnung mit Stack-Trace — Forensik: falls je wieder ein
//     Consumer versucht, eine geteilte URL zu töten, steht der Täter mit
//     Namen im Log, statt dass Cover still sterben).
//   - Der Besitzer verwaltet seinen Lebenszyklus über revokeObjectURLInternal()
//     (ungepatchter Aufruf) und ist davon unberührt.
//   - Nicht registrierte URLs (Consumer-eigene URLs, z.B. Thumbnails,
//     Replay-Aufnahmen, Export-Blobs) verhalten sich exakt wie vorher.
//
// SSR-sicher: nur im Browser aktiv. Einmalige Installation (Modul-Singleton).

type SharedEntry = { owner: string; registeredAt: number };

const isBrowser =
  typeof window !== 'undefined' && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function';

const sharedUrls = isBrowser ? new Map<string, SharedEntry>() : null;

// Der ungepatchte Original-Aufruf (Escape-Hatch für den Besitzer).
const rawRevokeObjectURL: ((url: string) => void) | null = isBrowser
  ? URL.revokeObjectURL.bind(URL)
  : null;

let installed = false;

/** Installiert den Patch (idempotent). Exportiert für Tests. */
export function installBlobUrlGuard(): boolean {
  if (!isBrowser || installed || !rawRevokeObjectURL) return installed;
  installed = true;

  const original = rawRevokeObjectURL;
  URL.revokeObjectURL = function revokeObjectURLGuarded(url: string | URL): void {
    const u = typeof url === 'string' ? url : url.toString();
    if (sharedUrls?.has(u)) {
      const entry = sharedUrls.get(u)!;
      // eslint-disable-next-line no-console
      console.warn(
        `[BlobUrlGuard] BLOCKIERT: Fremd-Revoke einer geteilten blob:-URL (${entry.owner}) — ` +
          `die URL ist noch in Song-Objekten im Umlauf. Eigentümer verwaltet den Lebenszyklus selbst.\n` +
          `Stack: ${(new Error().stack || '').split('\n').slice(2, 6).join('\n')}`,
      );
      return; // Ignorieren — die URL bleibt am Leben.
    }
    original(u);
  } as typeof URL.revokeObjectURL;
  return true;
}

/** Eine URL als geteilt markieren (Aufruf direkt nach dem Erstellen). */
export function registerSharedBlobUrl(url: string | undefined | null, owner: string): void {
  if (!url || !url.startsWith('blob:') || !sharedUrls) return;
  if (!sharedUrls.has(url)) sharedUrls.set(url, { owner, registeredAt: Date.now() });
}

/** Registrierung aufheben (z.B. bevor der Besitzer die URL kontrolliert ablegt). */
export function unregisterSharedBlobUrl(url: string | undefined | null): void {
  if (!url || !sharedUrls) return;
  sharedUrls.delete(url);
}

/** Escape-Hatch: der Besitzer revokiert kontrolliert (umgeht den Guard). */
export function revokeObjectURLInternal(url: string): void {
  if (rawRevokeObjectURL) {
    try { rawRevokeObjectURL(url); } catch { /* already revoked */ }
  }
}

/** Debug/Forensik: aktuell geschützte URLs (Anzahl + Owner). */
export function getGuardStats(): { protectedCount: number; owners: Record<string, number> } {
  const owners: Record<string, number> = {};
  sharedUrls?.forEach((e) => { owners[e.owner] = (owners[e.owner] ?? 0) + 1; });
  return { protectedCount: sharedUrls?.size ?? 0, owners };
}

// Automatische Installation beim ersten Import (Seiten-Effekt).
installBlobUrlGuard();
