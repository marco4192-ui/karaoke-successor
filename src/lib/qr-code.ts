// Shared QR code generation utility
import QRCode from 'qrcode';

// Simple in-memory cache to avoid regenerating the same QR code on every render
const qrCache = new Map<string, string>();
const QR_CACHE_MAX = 50;

/**
 * Generates a QR code data URL (base64 PNG) for the given data.
 * Works 100% offline — no external API dependency.
 * Results are cached in memory (up to 50 entries) to avoid redundant canvas work.
 */
export async function generateQRCodeUrl(data: string, size = 200): Promise<string> {
  const cacheKey = `${data}-${size}`;
  const cached = qrCache.get(cacheKey);
  if (cached) return cached;

  const dataUrl = await QRCode.toDataURL(data, {
    width: size,
    margin: 1,
    errorCorrectionLevel: 'M',
  });

  // Evict oldest entry if cache is full
  if (qrCache.size >= QR_CACHE_MAX) {
    const firstKey = qrCache.keys().next().value;
    if (firstKey) qrCache.delete(firstKey);
  }
  qrCache.set(cacheKey, dataUrl);
  return dataUrl;
}

/**
 * Detect the local IP address.
 * In Tauri, uses the native Rust command (UDP socket trick).
 * Falls back to WebRTC for browser environments.
 * Returns null if detection fails.
 */
export async function detectLocalIP(): Promise<string | null> {
  // Check sessionStorage first
  const storedIP = sessionStorage.getItem('karaoke-detected-ip');
  if (storedIP && !storedIP.startsWith('127.') && storedIP !== 'localhost' && !storedIP.endsWith('.local')) {
    return storedIP;
  }

  // Strategy 1: Use Tauri native command (most reliable for Tauri apps)
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const ip = await invoke<string | null>('network_get_local_ip');
    if (ip) {
      sessionStorage.setItem('karaoke-detected-ip', ip);
      return ip;
    }
  } catch {
    // Not running in Tauri or command not available — fall through
  }

  // Strategy 2: window.location.hostname (works when opened via IP in dev)
  const hostname = window.location.hostname;
  if (hostname && hostname !== 'localhost' && !hostname.startsWith('127.') && !hostname.endsWith('.local') && hostname !== 'tauri.localhost') {
    sessionStorage.setItem('karaoke-detected-ip', hostname);
    return hostname;
  }

  // Strategy 3: WebRTC IP detection (fallback for browser)
  try {
    const pc = new RTCPeerConnection({ iceServers: [] });
    pc.createDataChannel('');
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const ip = await new Promise<string | null>((resolve) => {
      const timeout = setTimeout(() => {
        pc.close();
        resolve(null);
      }, 5000);

      pc.onicecandidate = (event) => {
        if (event?.candidate) {
          const candidate = event.candidate.candidate;
          const ipMatch = candidate.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
          if (ipMatch && ipMatch[1]) {
            const detected = ipMatch[1];
            if (!detected.endsWith('.local') && detected !== '0.0.0.0' && !detected.startsWith('127.')) {
              clearTimeout(timeout);
              pc.close();
              sessionStorage.setItem('karaoke-detected-ip', detected);
              resolve(detected);
            }
          }
        }
      };
    });

    return ip;
  } catch {
    return null;
  }
}

/**
 * R52 — HTTPS-Port-Cache für die Companion-URL.
 *
 * Hintergrund: Die Handy-Mikrofon-Eingabe („Companion als Mic") braucht einen
 * SICHEREN Kontext — getUserMedia ist auf http://<LAN-IP> in jedem Browser
 * blockiert (nur localhost gilt ohne HTTPS als sicher). Der Produktions-
 * Standalone-Server (Tauri-Bundle) öffnet deshalb parallel zum HTTP-Port 3000
 * einen HTTPS-Listener mit Self-Signed-Zertifikat (Default-Port 3443); der
 * Status-Endpunkt meldet ihn als httpsPort. Der Dev-Server hat keinen HTTPS-
 * Listener (httpsPort null) → URLs bleiben http://…:3000 (Desktop/localhost
 * ist ohnehin sicher).
 *
 * Der Port wird einmal beim App-Boot gezogen (initCompanionHttpsPort, siehe
 * use-app-effects) und in der Session gecacht — buildCompanionUrl bleibt
 * synchron benutzbar.
 */
const HTTPS_PORT_KEY = 'karaoke-https-port';

let httpsPortCache: number | null = null;

function readCachedHttpsPort(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(HTTPS_PORT_KEY);
    if (!raw) return null;
    const p = parseInt(raw, 10);
    return Number.isInteger(p) && p > 0 ? p : null;
  } catch {
    return null;
  }
}

/** HTTPS-Port einmalig vom Server abfragen (Aufruf beim App-Boot). */
export async function initCompanionHttpsPort(): Promise<number | null> {
  if (typeof window === 'undefined') return null;
  if (httpsPortCache === null) httpsPortCache = readCachedHttpsPort();
  try {
    const res = await fetch('/api/mobile?action=status', { cache: 'no-store' });
    if (!res.ok) return httpsPortCache;
    const data = await res.json() as { httpsPort?: number | null };
    const p = typeof data.httpsPort === 'number' && data.httpsPort > 0 ? data.httpsPort : null;
    httpsPortCache = p;
    try {
      if (p) window.sessionStorage.setItem(HTTPS_PORT_KEY, String(p));
      else window.sessionStorage.removeItem(HTTPS_PORT_KEY);
    } catch { /* storage blocked — cache in memory only */ }
    return p;
  } catch {
    return httpsPortCache;
  }
}

/**
 * Build the companion app connection URL for the given IP and optional profile ID.
 * Always uses the /mobile route so the companion gets the latest implementation.
 *
 * R52: Läuft der Server mit HTTPS-Listener (Tauri-Produktion), baut die URL
 * automatisch https://<ip>:<httpsPort>/mobile — Voraussetzung für die
 * Mikrofon-Freigabe auf dem Handy (getUserMedia ist auf http://<LAN-IP>
 * blockiert). Ein explizit übergebener HTTP-Port (Legacy-Aufrufer) wird im
 * HTTPS-Betrieb bewusst ignoriert — die Mic-Fähigkeit wiegt schwerer als
 * die Port-Angabe. Ohne HTTPS-Listener (Dev) bleibt alles beim alten
 * http://…:3000-Verhalten.
 */
export function buildCompanionUrl(ip: string, port?: number, profileId?: string): string {
  if (httpsPortCache === null) {
    // Selbst-Erkennung: Läuft diese Seite selbst unter HTTPS (Companion, der
    // z. B. in den gespiegelten Einstellungen einen QR für WEITERE Handys
    // baut), ist der eigene Port der HTTPS-Port des Servers.
    if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
      const p = parseInt(window.location.port, 10);
      if (Number.isInteger(p) && p > 0) httpsPortCache = p;
    }
    if (httpsPortCache === null) httpsPortCache = readCachedHttpsPort();
  }
  const httpsPort = httpsPortCache;
  const scheme = httpsPort ? 'https' : 'http';
  const actualPort = httpsPort ?? port ?? 3000;
  const base = `${scheme}://${ip}:${actualPort}/mobile`;
  if (profileId) {
    return `${base}?profile=${encodeURIComponent(profileId)}`;
  }
  return base;
}
