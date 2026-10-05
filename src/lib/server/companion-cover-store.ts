// ===================== R53: COMPANION COVER DISK STORE =====================
import { createHash } from 'crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Persistenter Cover-Cache für die Companion-App (db/companion-covers/).
 *
 * Problem: Die vom Desktop hochgeladenen Thumbnails (96px JPEG) und die
 * remote-geproxyten Original-Covers lebten bisher NUR im Server-Speicher
 * (mutableState.songCovers / remoteCoverCache). Jeder Dev-Server-Restart
 * (Hot-Reload, Neustart, Absturz) warf ALLES weg — das Handy zeigte danach
 * „sehr viele fehlende Thumbnails", bis das Self-Healing (60s) + die 15s-
 * Upload-Ticks die Covers mühsam neu geliefert hatten.
 *
 * Lösung: Covers werden zusätzlich auf die Festplatte geschrieben (Best-
 * Effort, nie werfend). Nach einem Restart bedient der songcover-GET die
 * Anfrage sofort von der Platte, während das Self-Healing im Hintergrund
 * läuft. Dateien:
 *   <sha1(songId)>.img  — rohe Bild-Bytes
 *   <sha1(songId)>.meta — Content-Type (eine Zeile Text)
 *
 * Alles rein serverseitig (fs/crypto) — darf NIEMALS in Client-Bundles
 * landen (nur von API-Routes/Server-Modulen importieren).
 */

const STORE_DIR = join(process.cwd(), 'db', 'companion-covers');

/** Obergrenze der Cache-Dateien (img+meta zählen je als 1). Bei Überschreitung
 *  werden die ältesten Paare gelöscht (Best-Effort, kein Fehler). */
const MAX_FILES = 6000;
const PRUNE_TO = 5000;

/** Stabiler, pfadsicherer Dateiname aus der songId (SHA-1 — keine Kollisionen
 *  in der Praxis, keine Pfad-Traversal-Risiken). */
function hashKey(songId: string): string {
  return createHash('sha1').update(songId).digest('hex');
}

function ensureDir(): boolean {
  try {
    if (!existsSync(STORE_DIR)) mkdirSync(STORE_DIR, { recursive: true });
    return true;
  } catch {
    return false;
  }
}

/** Cover-Bytes + Content-Type auf die Platte schreiben (Best-Effort). */
export function saveCoverToDisk(songId: string, buf: Buffer, type: string): void {
  try {
    if (!ensureDir()) return;
    const key = hashKey(songId);
    writeFileSync(join(STORE_DIR, key + '.img'), buf);
    writeFileSync(join(STORE_DIR, key + '.meta'), type);
    maybePrune();
  } catch {
    // Platte voll / Berechtigungen — Cover-Cache ist rein optional.
  }
}

/** Cover von der Platte lesen. Liefert null, wenn nicht vorhanden. */
export function readCoverFromDisk(songId: string): { buf: Buffer; type: string } | null {
  try {
    const key = hashKey(songId);
    const imgPath = join(STORE_DIR, key + '.img');
    const metaPath = join(STORE_DIR, key + '.meta');
    if (!existsSync(imgPath)) return null;
    const buf = readFileSync(imgPath);
    let type = 'image/jpeg';
    if (existsSync(metaPath)) {
      const meta = readFileSync(metaPath, 'utf8').trim();
      if (meta.startsWith('image/')) type = meta;
    }
    return { buf, type };
  } catch {
    return null;
  }
}

/** Gelegentliche Bereinigung: Löscht die ältesten Dateien, wenn das Limit
 *  überschritten ist. Läuft synchron (readdir auf ~6k Einträge ist günstig)
 *  und wird nur nach Schreibungen aufgerufen. */
function maybePrune(): void {
  try {
    const files = readdirSync(STORE_DIR);
    if (files.length <= MAX_FILES) return;
    const stats = files
      .map(name => {
        try {
          return { name, mtime: statSync(join(STORE_DIR, name)).mtimeMs };
        } catch {
          return null;
        }
      })
      .filter((x): x is { name: string; mtime: number } => x !== null)
      .sort((a, b) => a.mtime - b.mtime);
    const toDelete = Math.min(stats.length - PRUNE_TO, files.length - MAX_FILES + 500);
    for (let i = 0; i < toDelete; i++) {
      try {
        rmSync(join(STORE_DIR, stats[i].name), { force: true });
      } catch { /* schon weg */ }
    }
  } catch {
    // Bereinigung ist optional
  }
}
