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
 * einen HTTPS-Listener (Default-Port 3443); der Status-Endpunkt meldet ihn
 * als httpsPort. Der Dev-Server hat keinen HTTPS-Listener (httpsPort null)
 * → URLs bleiben http://…:3000 (Desktop/localhost ist ohnehin sicher).
 *
 * R55 — Echtes Let's-Encrypt-Zertifikat (DuckDNS): Der Status-Endpunkt
 * meldet zusätzlich httpsDomain + httpsCertSource. Ist ein LE-Zertifikat
 * aktiv, bauen ALLE Companion-URLs automatisch die DOMAIN ein
 * (https://name.duckdns.org/mobile) — jedes Handy vertraut ihr nativ, und
 * nach WLAN-/IP-Wechseln bleibt sie stabil (DNS-Sync läuft serverseitig).
 *
 * Der Port wird einmal beim App-Boot gezogen (initCompanionHttpsPort, siehe
 * use-app-effects) und in der Session gecacht — buildCompanionUrl bleibt
 * synchron benutzbar.
 */
const HTTPS_PORT_KEY = 'karaoke-https-port';
const HTTPS_DOMAIN_KEY = 'karaoke-https-domain';
const HTTPS_SOURCE_KEY = 'karaoke-https-cert-source';

export interface CompanionHttpsInfo {
  /** HTTPS-Port des Servers (null = kein HTTPS-Listener). */
  port: number | null;
  /** DuckDNS-Domain mit aktivem Let's-Encrypt-Zertifikat oder null. */
  domain: string | null;
  /** Aktive Zertifikats-Quelle ('letsencrypt' = automatisch vertrauenswürdig). */
  source: 'letsencrypt' | 'local-ca' | null;
}

let httpsPortCache: number | null = null;
let httpsDomainCache: string | null = null;
let httpsSourceCache: CompanionHttpsInfo['source'] = null;

/**
 * R60-D — Reaktivitäts-Layer für den HTTPS-Info-Cache.
 *
 * Problem: Der Cache füllt sich asynchron (Boot-Fetch, DuckDNS-Aktivierung,
 * Selbst-Erkennung). QR-Komponenten berechnen ihre URL aber synchron per
 * buildCompanionUrl während des Renders — ohne Re-Render blieb der QR auf
 * dem IP-Format stehen, bis ein zufälliger anderer State-Change neu zeichnete.
 *
 * Lösung: Mini-Observer-Store. Jede Cache-Mutation bumpt die Version und
 * publisht einen neuen (referenz-stabilen) Snapshot an alle Subscriber —
 * der Hook useCompanionHttpsInfo() (useSyncExternalStore) triggert damit
 * zuverlässig genau EINEN Re-Render in jeder gemounteten QR-Komponente.
 */
export interface CompanionHttpsInfoSnapshot extends CompanionHttpsInfo {
  /** Monoton steigend — ändert sich bei jeder effektiven Cache-Mutation. */
  version: number;
}

let httpsInfoVersion = 0;
let httpsInfoSnapshot: CompanionHttpsInfoSnapshot = {
  port: null,
  domain: null,
  source: null,
  version: 0,
};
const httpsInfoListeners = new Set<() => void>();

/** Snapshot neu bauen + Listener benachrichtigen (no-op ohne Änderung). */
function notifyCompanionHttpsInfoChange(): void {
  if (
    httpsInfoSnapshot.port === httpsPortCache &&
    httpsInfoSnapshot.domain === httpsDomainCache &&
    httpsInfoSnapshot.source === httpsSourceCache
  ) {
    return; // kein effektiver Unterschied zum zuletzt publizierten Stand
  }
  httpsInfoVersion += 1;
  httpsInfoSnapshot = {
    port: httpsPortCache,
    domain: httpsDomainCache,
    source: httpsSourceCache,
    version: httpsInfoVersion,
  };
  for (const listener of httpsInfoListeners) {
    listener();
  }
}

/**
 * Benachrichtigung als Microtask — buildCompanionUrl läuft auch während
 * des React-Renders (Hydration + Selbst-Erkennung mutieren dort den Cache);
 * ein synchroner Notify wäre in der Render-Phase illegal. Der Microtask
 * feuert noch vor dem Paint → die QR-Komponenten zeichnen sofort um.
 */
let httpsInfoNotifyScheduled = false;
function scheduleCompanionHttpsInfoNotify(): void {
  if (httpsInfoNotifyScheduled || typeof window === 'undefined') return;
  httpsInfoNotifyScheduled = true;
  queueMicrotask(() => {
    httpsInfoNotifyScheduled = false;
    notifyCompanionHttpsInfoChange();
  });
}

/** R60-D: Observer-Registrierung für useSyncExternalStore (use-companion-https-info). */
export function subscribeCompanionHttpsInfo(listener: () => void): () => void {
  httpsInfoListeners.add(listener);
  return () => {
    httpsInfoListeners.delete(listener);
  };
}

/** R60-D: Referenz-stabiler Snapshot — wird NUR bei Cache-Änderung neu gebaut. */
export function getCompanionHttpsInfoSnapshot(): CompanionHttpsInfoSnapshot {
  return httpsInfoSnapshot;
}

/** SessionStorage → Memory-Cache hydratisieren (einmalig). true = Änderung. */
function hydrateHttpsCacheFromStorage(): boolean {
  let mutated = false;
  if (httpsPortCache === null) {
    const p = readCachedHttpsPort();
    if (p !== null) {
      httpsPortCache = p;
      mutated = true;
    }
  }
  if (httpsDomainCache === null && httpsSourceCache === null) {
    const cached = readCachedHttpsDomain();
    if (cached.domain !== null || cached.source !== null) {
      httpsDomainCache = cached.domain;
      httpsSourceCache = cached.source;
      mutated = true;
    }
  }
  return mutated;
}

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

function readCachedHttpsDomain(): { domain: string | null; source: CompanionHttpsInfo['source'] } {
  if (typeof window === 'undefined') return { domain: null, source: null };
  try {
    const domain = window.sessionStorage.getItem(HTTPS_DOMAIN_KEY);
    const source = window.sessionStorage.getItem(HTTPS_SOURCE_KEY);
    return {
      domain: domain && domain.includes('.') ? domain : null,
      source: source === 'letsencrypt' || source === 'local-ca' ? source : null,
    };
  } catch {
    return { domain: null, source: null };
  }
}

/** Gecachte HTTPS-Infos synchron lesen (für buildCompanionUrl & Self-Heal).
 * R60-D: Für reaktive Consumer stattdessen useCompanionHttpsInfo() nutzen —
 * dieser Getter hier bleibt bewusst unreaktiv (statischer Einmal-Lookup). */
export function getCompanionHttpsInfo(): CompanionHttpsInfo {
  return { port: httpsPortCache, domain: httpsDomainCache, source: httpsSourceCache };
}

/** HTTPS-Infos OHNE Server-Request setzen (z. B. nach erfolgreicher
 * Aktivierung in den Settings — damit QR-URLs sofort die Domain nutzen,
 * ohne auf den nächsten initCompanionHttpsInfo-Poll zu warten). */
export function updateCompanionHttpsInfo(info: Partial<CompanionHttpsInfo>): void {
  let mutated = false;
  if (typeof info.port === 'number' && info.port > 0) {
    if (httpsPortCache !== info.port) {
      httpsPortCache = info.port;
      mutated = true;
    }
  } else if (info.port === null && httpsPortCache !== null) {
    httpsPortCache = null;
    mutated = true;
  }
  if ('domain' in info && httpsDomainCache !== (info.domain ?? null)) {
    httpsDomainCache = info.domain ?? null;
    mutated = true;
  }
  if ('source' in info && httpsSourceCache !== (info.source ?? null)) {
    httpsSourceCache = info.source ?? null;
    mutated = true;
  }
  if (mutated) {
    // R60-D: Cache-Änderung reaktiv publizieren — wird NIE aus der Render-
    // Phase heraus aufgerufen (nur async Handlers/Effects), daher synchron OK.
    notifyCompanionHttpsInfoChange();
  }
  try {
    if (typeof window !== 'undefined') {
      if (httpsPortCache) window.sessionStorage.setItem(HTTPS_PORT_KEY, String(httpsPortCache));
      else window.sessionStorage.removeItem(HTTPS_PORT_KEY);
      if (httpsDomainCache) window.sessionStorage.setItem(HTTPS_DOMAIN_KEY, httpsDomainCache);
      else window.sessionStorage.removeItem(HTTPS_DOMAIN_KEY);
      if (httpsSourceCache) window.sessionStorage.setItem(HTTPS_SOURCE_KEY, httpsSourceCache);
      else window.sessionStorage.removeItem(HTTPS_SOURCE_KEY);
    }
  } catch { /* storage blocked — memory cache genügt */ }
}

/** Vollständige HTTPS-Infos vom Server abfragen (Port + Domain + Quelle). */
export async function initCompanionHttpsInfo(): Promise<CompanionHttpsInfo | null> {
  if (typeof window === 'undefined') return null;
  // R60-D: SessionStorage-Hydration synchron vorab, damit auch der reaktive
  // Snapshot (useCompanionHttpsInfo) schon vor der Netz-Antwort stimmt.
  if (hydrateHttpsCacheFromStorage()) scheduleCompanionHttpsInfoNotify();
  try {
    const res = await fetch('/api/mobile?action=status', { cache: 'no-store' });
    if (!res.ok) return { port: httpsPortCache, domain: httpsDomainCache, source: httpsSourceCache };
    const data = await res.json() as {
      httpsPort?: number | null;
      httpsDomain?: string | null;
      httpsCertSource?: 'letsencrypt' | 'local-ca' | null;
    };
    updateCompanionHttpsInfo({
      port: typeof data.httpsPort === 'number' && data.httpsPort > 0 ? data.httpsPort : null,
      domain: typeof data.httpsDomain === 'string' && data.httpsDomain.includes('.') ? data.httpsDomain : null,
      source: data.httpsCertSource === 'letsencrypt' || data.httpsCertSource === 'local-ca' ? data.httpsCertSource : null,
    });
    return { port: httpsPortCache, domain: httpsDomainCache, source: httpsSourceCache };
  } catch {
    return { port: httpsPortCache, domain: httpsDomainCache, source: httpsSourceCache };
  }
}

/**
 * HTTPS-Port einmalig vom Server abfragen (Aufruf beim App-Boot).
 * R60-D: Dünner Wrapper auf initCompanionHttpsInfo — holt Port + Domain +
 * Zertifikats-Quelle in EINER Abfrage (statt nur den Port) und publisht
 * Cache-Änderungen reaktiv. Der App-Boot ruft inzwischen direkt
 * initCompanionHttpsInfo (use-app-effects); dieser Export bleibt als
 * Kompatibilitäts-Wrapper erhalten.
 */
export async function initCompanionHttpsPort(): Promise<number | null> {
  const info = await initCompanionHttpsInfo();
  return info ? info.port : null;
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
 *
 * R55: Ist ein echtes Let's-Encrypt-Zertifikat aktiv (DuckDNS eingerichtet),
 * wird die DOMAIN statt der IP verbaut: https://name.duckdns.org/mobile.
 * Vorteile: Jedes Handy vertraut ihr automatisch (keine Installation), sie
 * bleibt nach IP-Wechseln stabil (serverseitiger DNS-Sync) und ist kürzer
 * (besser scanbar). Der übergebene ip-Parameter ist dann nur noch Fallback.
 */
export function buildCompanionUrl(ip: string, port?: number, profileId?: string): string {
  // Cache-Hydration: Erstmaliger synchroner Aufruf (vor jedem init-Poll).
  let mutated = hydrateHttpsCacheFromStorage();
  // Selbst-Erkennung: Läuft diese Seite selbst unter HTTPS (Companion, der
  // z. B. in den gespiegelten Einstellungen einen QR für WEITERE Handys
  // baut), sind eigener Host + Port die des Servers — bei einer DuckDNS-
  // Domain zusätzlich die vertrauenswürdige Quelle.
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    const p = parseInt(window.location.port, 10);
    if (Number.isInteger(p) && p > 0 && httpsPortCache === null) {
      httpsPortCache = p;
      mutated = true;
    }
    const host = window.location.hostname;
    if (host.includes('.') && !/^\d+\.\d+\.\d+\.\d+$/.test(host) && host !== 'localhost' && host !== 'tauri.localhost' && !host.endsWith('.local')) {
      // Host ist ein DNS-Name (z. B. die DuckDNS-Domain) → vertrauenswürdige
      // Quelle, der Server muss ein gültiges Zertifikat dafür haben.
      if (httpsDomainCache !== host) {
        httpsDomainCache = host;
        httpsSourceCache = 'letsencrypt';
        mutated = true;
      }
    }
  }
  // R60-D: Cache-Änderung (Hydration/Selbst-Erkennung) asynchron publizieren
  // — dieser Code läuft auch während des Renders, ein synchroner Notify an
  // die useSyncExternalStore-Subscriber wäre dort illegal. Die eigene URL
  // ist in DIESEM Render bereits korrekt; der Microtask aktualisiert alle
  // anderen gemounteten QR-Komponenten noch vor dem Paint.
  if (mutated) scheduleCompanionHttpsInfoNotify();
  const httpsPort = httpsPortCache;

  // R55: Echte Domain mit LE-Zertifikat hat Vorrang vor der IP.
  if (httpsSourceCache === 'letsencrypt' && httpsDomainCache) {
    // Port 443 ist der HTTPS-Default → weglassen (saubere, kurze URL).
    const portPart = httpsPort && httpsPort !== 443 ? `:${httpsPort}` : '';
    const base = `https://${httpsDomainCache}${portPart}/mobile`;
    return profileId ? `${base}?profile=${encodeURIComponent(profileId)}` : base;
  }

  const scheme = httpsPort ? 'https' : 'http';
  const actualPort = httpsPort ?? port ?? 3000;
  const base = `${scheme}://${ip}:${actualPort}/mobile`;
  if (profileId) {
    return `${base}?profile=${encodeURIComponent(profileId)}`;
  }
  return base;
}
