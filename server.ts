/**
 * Custom Next.js server with Socket.IO integration.
 *
 * This server wraps the standard Next.js HTTP handler and attaches
 * a Socket.IO server to the same HTTP server instance. This allows
 * real-time WebSocket communication between Desktop and Companion
 * clients on the same port (3000) as the web app.
 *
 * Usage:
 *   Dev:  tsx server.ts
 *   Prod: node server.js  (compiled via build step)
 *
 * The Socket.IO server uses the path /socket.io/ for WebSocket upgrades.
 * All existing Next.js routes continue to work unchanged.
 *
 * R53: Zusätzlich zum HTTP-Listener wird ein HTTPS-Listener (Default-Port
 * 3443, Self-Signed-Cert) geöffnet — identisch zum Produktions-
 * Standalone-Server. Grund: getUserMedia („Companion als Mikrofon") ist in
 * Browsern auf unsicheren Ursprüngen BLOCKIERT — http://<LAN-IP>:3000 vom
 * Handy aus ist immer insecure (nur localhost gilt ohne TLS als sicher).
 * Der HTTPS-Port wird über globalThis.__karaokeHttpsPort an die App
 * veröffentlicht (/api/mobile status → httpsPort → QR-/Companion-URLs bauen
 * automatisch https://<ip>:<port>/mobile). Ohne diesen Listener bekam das
 * Handy die Meldung „Mikrofon kann wegen unsicherer HTTP-Verbindung nicht
 * aktiviert werden".
 */
import { createServer } from 'http';
import { createServer as createHttpsServer, type Server as HttpsServer } from 'https';
import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { networkInterfaces } from 'os';
import { join } from 'path';
import { parse } from 'url';
import next from 'next';
import { initSocketIO, attachSocketIO } from './src/lib/socketio-server';
// R55 — Echtes Let's-Encrypt-Zertifikat via DuckDNS (siehe Modul-Kopf).
// Bevorzugt, sobald konfiguriert (Settings → Mobilgerät); lokale Root-CA
// bleibt Rückfallebene (R54). Import aus src/lib — tsx löst das direkt auf.
import {
  readDomainState,
  getLeBundle,
  issueCertificate,
  startMaintenance,
  registerCertSwapHandler,
  type LeCertBundle,
} from './src/lib/server/https-domain';

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

// Create Next.js app
// Next 16's custom-server path (NextCustomServer) reuses the full `next dev`
// router-server machinery — including the Turbopack dev bundler, hot reloader,
// and HMR upgrade handling. Turbopack is the right bundler here: it compiles
// faster and with far less memory than webpack on this huge module graph
// (webpack peaked >2 GB RSS and its react-refresh entry silently stalled).
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// ═══════════════════════════════════════════════════════════════════
//  R53/R54: HTTPS mit lokaler Root-CA (Dev-Server + tsx-Produktion)
//  ─ Self-Signed-Leaf → Browser-Warnung bei JEDEM Besuch
//  ─ Lokale CA + Leaf: Handy installiert EINMAL die CA (Download über
//    /api/mobile?action=ca-cert) → danach KEINE Warnung mehr, und weil
//    IP-Wechsel (WLAN etc.) nur den Leaf neu ausstellen (gleiche CA),
//    bleibt die Installation dauerhaft gültig.
// ═══════════════════════════════════════════════════════════════════

/** Alle nicht-internen IPv4-Adressen dieser Maschine (für das Zertifikats-SAN). */
function getLanIpv4s(): string[] {
  const ips: string[] = [];
  try {
    const nets = networkInterfaces();
    for (const list of Object.values(nets)) {
      for (const net of list ?? []) {
        if (net.family === 'IPv4' && !net.internal) ips.push(net.address);
      }
    }
  } catch { /* networkInterfaces nicht verfügbar — SAN ohne LAN-IPs */ }
  return ips;
}

/** HTTPS-Zertifikats-Bundle: Leaf (CA-signiert) + Root-CA (für Chain & Download). */
interface HttpsCertBundle {
  cert: string;
  key: string;
  caCert: string;
}

/** node-forge laden (CJS/ESM-Interop — cjs-module-lexer erkennt die named
 *  exports nicht, deshalb der .default-Fallback; ohne ihn war forge.pki
 *  undefined und die Zertifikats-Generierung schlug immer still fehl). */
async function importForge(): Promise<typeof import('node-forge') | null> {
  try {
    const imported = (await import('node-forge')) as unknown as Partial<typeof import('node-forge')> & { default?: unknown };
    const candidate = (imported.pki ? imported : (imported.default ?? imported)) as typeof import('node-forge');
    return candidate.pki ? candidate : null;
  } catch {
    return null;
  }
}

/**
 * R54: Liefert (und erzeugt bei Bedarf) die Zertifikats-Kette:
 *   certs/ca-cert.pem + certs/ca-key.pem   — lokale Root-CA (10 Jahre, STABIL)
 *   certs/https-cert.pem + https-key.pem   — Leaf, von der CA signiert
 *
 * Die CA bleibt über alle Server-Restarts identisch — Handys installieren sie
 * EINMAL (Download: /api/mobile?action=ca-cert) und sehen danach nie wieder
 * eine Zertifikats-Warnung. Ändern sich die LAN-IPs (WLAN-Wechsel), wird nur
 * der Leaf neu von derselben CA signiert — KEINE Neu-Installation nötig.
 * Überschreibbar über KARAOKE_CERTS_DIR (Produktion: beschreibbares Verzeichnis).
 */
async function ensureCertificates(): Promise<HttpsCertBundle | null> {
  const certsDir = process.env.KARAOKE_CERTS_DIR || join(process.cwd(), 'certs');
  const caCertPath = join(certsDir, 'ca-cert.pem');
  const caKeyPath = join(certsDir, 'ca-key.pem');
  const certPath = join(certsDir, 'https-cert.pem');
  const keyPath = join(certsDir, 'https-key.pem');
  const metaPath = join(certsDir, 'https-meta.json');
  const lanIps = getLanIpv4s();

  const forge = await importForge();
  if (!forge) {
    // eslint-disable-next-line no-console
    console.warn('[Server] node-forge not available — HTTPS certificate generation impossible (companion microphone disabled).');
    return null;
  }

  // ── 1) Root-CA: laden oder einmalig erzeugen ──
  let caCertPem: string;
  let caKeyPem: string;
  try {
    if (existsSync(caCertPath) && existsSync(caKeyPath)) {
      caCertPem = readFileSync(caCertPath, 'utf8');
      caKeyPem = readFileSync(caKeyPath, 'utf8');
    } else {
      throw new Error('CA files missing');
    }
  } catch {
    const caKeys = forge.pki.rsa.generateKeyPair(2048);
    const ca = forge.pki.createCertificate();
    ca.publicKey = caKeys.publicKey;
    ca.serialNumber = String(Date.now());
    ca.validity.notBefore = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 Tag Toleranz gegen Uhrabweichung
    ca.validity.notAfter = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000); // 10 Jahre
    const caAttrs = [
      { name: 'commonName', value: 'Karaoke ZERO Local CA' },
      { name: 'organizationName', value: 'Karaoke ZERO' },
    ];
    ca.setSubject(caAttrs);
    ca.setIssuer(caAttrs); // self-signed Root-CA
    ca.setExtensions([
      { name: 'basicConstraints', cA: true },
      { name: 'keyUsage', keyCertSign: true, cRLSign: true },
      { name: 'subjectKeyIdentifier' },
    ]);
    ca.sign(caKeys.privateKey, forge.md.sha256.create());
    caCertPem = forge.pki.certificateToPem(ca);
    caKeyPem = forge.pki.privateKeyToPem(caKeys.privateKey);
    try {
      mkdirSync(certsDir, { recursive: true });
      writeFileSync(caCertPath, caCertPem);
      writeFileSync(caKeyPath, caKeyPem);
      // eslint-disable-next-line no-console
      console.log('[Server] Generated local root CA (certs/ca-cert.pem, 10 years) — install once on each phone via /api/mobile?action=ca-cert to remove HTTPS warnings');
    } catch (persistErr) {
      // eslint-disable-next-line no-console
      console.warn('[Server] Could NOT persist root CA to disk — it changes on every restart (reinstall needed). Reason:', persistErr instanceof Error ? persistErr.message : persistErr);
    }
  }

  const caCert = forge.pki.certificateFromPem(caCertPem);
  const caKey = forge.pki.privateKeyFromPem(caKeyPem);
  // CA-Identität: ändert sich die CA (neu generiert), muss der Leaf neu signiert werden.
  const caHash = createHash('sha256').update(caCertPem).digest('hex');

  // ── 2) Leaf: wiederverwenden, solange CA + LAN-IP-Set identisch ──
  const leafMatches = (meta: unknown): boolean => {
    if (!meta || typeof meta !== 'object') return false;
    const m = meta as { ips?: unknown; caHash?: unknown };
    if (m.caHash !== caHash) return false;
    if (!Array.isArray(m.ips)) return false;
    const stored = m.ips as string[];
    return stored.length === lanIps.length && lanIps.every(ip => stored.includes(ip));
  };
  try {
    if (existsSync(certPath) && existsSync(keyPath)) {
      const meta = JSON.parse(readFileSync(metaPath, 'utf8')) as unknown;
      if (leafMatches(meta)) {
        return {
          cert: readFileSync(certPath, 'utf8'),
          key: readFileSync(keyPath, 'utf8'),
          caCert: caCertPem,
        };
      }
    }
  } catch {
    // Meta unlesbar / defekt → Leaf neu ausstellen
  }

  // ── 3) Leaf NEU von der bestehenden CA signieren ──
  const leafKeys = forge.pki.rsa.generateKeyPair(2048);
  const leaf = forge.pki.createCertificate();
  leaf.publicKey = leafKeys.publicKey;
  leaf.serialNumber = String(Date.now());
  leaf.validity.notBefore = new Date(Date.now() - 24 * 60 * 60 * 1000);
  leaf.validity.notAfter = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000);
  leaf.setSubject([
    { name: 'commonName', value: 'Karaoke ZERO Companion' },
    { name: 'organizationName', value: 'Karaoke ZERO' },
    { shortName: 'OU', value: 'Companion HTTPS' },
  ]);
  leaf.setIssuer(caCert.subject.attributes); // Von der Root-CA signiert
  leaf.setExtensions([
    { name: 'basicConstraints', cA: false },
    { name: 'keyUsage', digitalSignature: true, keyEncipherment: true },
    { name: 'extKeyUsage', serverAuth: true },
    {
      name: 'subjectAltName',
      altNames: [
        { type: 2, value: 'localhost' }, // DNS
        { type: 7, ip: '127.0.0.1' }, // IP
        // Runtime-LAN-IPs (im Produktions-Bundle unbekannt — hier bekannt!)
        ...lanIps.map(ip => ({ type: 7, ip })),
      ],
    },
  ]);
  leaf.sign(caKey, forge.md.sha256.create());

  const certPem = forge.pki.certificateToPem(leaf);
  const keyPem = forge.pki.privateKeyToPem(leafKeys.privateKey);
  try {
    mkdirSync(certsDir, { recursive: true });
    writeFileSync(certPath, certPem);
    writeFileSync(keyPath, keyPem);
    writeFileSync(metaPath, JSON.stringify({ ips: lanIps, caHash, generatedAt: new Date().toISOString() }));
  } catch {
    // Persistenz best effort (schreibgeschützte Ablage) — der Leaf gilt nur
    // für diese Server-Sitzung, was bei installierter CA folgenlos ist.
  }
  // eslint-disable-next-line no-console
  console.log(`[Server] Issued HTTPS leaf certificate signed by local CA (SAN: localhost, 127.0.0.1${lanIps.length ? ', ' + lanIps.join(', ') : ''})`);
  return { cert: certPem, key: keyPem, caCert: caCertPem };
}

/** Startet den HTTPS-Listener auf dem ersten freien Port (Base, Base+1 … Base+4). */
async function startHttpsListener(
  requestListener: (req: import('http').IncomingMessage, res: import('http').ServerResponse) => void,
  onShutdown: (fn: () => void) => void,
): Promise<void> {
  // Expliziter Opt-out (HTTPS_PORT=0)
  if (process.env.HTTPS_PORT === '0') return;

  // R55: Zertifikats-Quelle — echtes Let's-Encrypt-Zertifikat (DuckDNS
  // eingerichtet) BEVORZUGT; lokale Root-CA (R54) als Rückfallebene. Die CA
  // wird in jedem Fall geladen/erzeugt: Der Download-Endpunkt (ca-cert)
  // funktioniert weiter, und ohne Domain bleibt alles beim R54-Verhalten.
  const caData = await ensureCertificates();
  const domainState = readDomainState();
  const leBundle = getLeBundle();
  const activeCert = leBundle
    ? { cert: leBundle.cert, key: leBundle.key }
    : (caData ? { cert: caData.cert + '\n' + caData.caCert, key: caData.key } : null);
  if (!activeCert) return;

  // R54: Root-CA für die App veröffentlichen (Download-Endpunkt
  // /api/mobile?action=ca-cert liest genau dieses globalThis).
  if (caData) {
    (globalThis as typeof globalThis & { __karaokeCaCertPem?: string }).__karaokeCaCertPem = caData.caCert;
  }

  // R55: HTTPS-Status-Globals (status-API → QR-URLs + Companion-Banner).
  // Wichtig: Domain IMMER frisch lesen — der Swap-Handler läuft auch dann,
  // wenn DuckDNS erst NACH dem Boot über die Settings-API eingerichtet wurde
  // (Boot-Closure wäre da noch null).
  const g = globalThis as typeof globalThis & {
    __karaokeHttpsDomain?: string | null;
    __karaokeHttpsCertSource?: 'letsencrypt' | 'local-ca' | null;
    __karaokeHttpsCertExpiresAt?: string | null;
  };
  const publishCertGlobals = (source: 'letsencrypt' | 'local-ca', bundle?: LeCertBundle | null) => {
    g.__karaokeHttpsDomain = readDomainState()?.domain ?? null;
    g.__karaokeHttpsCertSource = source;
    g.__karaokeHttpsCertExpiresAt = source === 'letsencrypt' ? (bundle?.expiresAt ?? null) : null;
  };
  publishCertGlobals(leBundle ? 'letsencrypt' : 'local-ca', leBundle);

  // R55: Port-Wahl — mit DuckDNS-Domain bevorzugt 443 (saubere URL ohne
  // Port-Angabe https://mein-karaoke.duckdns.org/mobile; Windows erlaubt
  // 443 ohne Admin-Rechte). Fällt 443 aus (Linux-Dev ohne root / belegt),
  // folgt 3443 wie bisher. Ohne Domain: unverändert 3443+.
  const portCandidates = process.env.HTTPS_PORT
    ? [parseInt(process.env.HTTPS_PORT, 10)]
    : domainState
      ? [443, 3443]
      : [3443];

  const listenOnce = (p: number): Promise<HttpsServer> =>
    new Promise((resolve, reject) => {
      const httpsServer = createHttpsServer(
        {
          // LE: Chain direkt aus der Ausstellung (Leaf + Intermediate).
          // CA-Fallback: Leaf + CA-Kette präsentieren, damit Browser/Clients
          // die Chain vollständig prüfen können (Root-CA installiert → kein
          // Warnhinweis).
          cert: activeCert.cert,
          key: activeCert.key,
        },
        requestListener,
      );
      httpsServer.once('error', reject);
      httpsServer.listen(p, hostname, () => {
        httpsServer.removeListener('error', reject);
        // Spätere Fehler dürfen den Prozess nicht killen
        httpsServer.on('error', (err: Error) => {
          // eslint-disable-next-line no-console
          console.warn('[Server] HTTPS server error:', err.message);
        });
        // Socket.IO auch an den HTTPS-Server hängen (gleiche io-Instanz —
        // engine.io wrapped nur die Listener, Connection-Handling identisch).
        try {
          attachSocketIO(httpsServer);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('[Server] Socket.IO attach to HTTPS server failed:', err instanceof Error ? err.message : err);
        }
        onShutdown(() => httpsServer.close());
        resolve(httpsServer);
      });
    });

  let listeningServer: HttpsServer | null = null;
  for (const candidate of portCandidates) {
    try {
      listeningServer = await listenOnce(candidate);
      // Port für die App veröffentlichen (status-API → QR-URLs). Gleiche
      // Prozess-Garantie wie __karaokeMobileShared: server.ts und die
      // Next-API-Routes teilen sich das globalThis des Serverprozesses.
      (globalThis as typeof globalThis & { __karaokeHttpsPort?: number }).__karaokeHttpsPort = candidate;
      // eslint-disable-next-line no-console
      console.log(`[Server] HTTPS listener active on https://${hostname}:${candidate} (${leBundle ? `Let's Encrypt: ${domainState?.domain}` : 'local CA'}) — companion microphone enabled`);
      break;
    } catch (err) {
      if (err instanceof Error && (err as NodeJS.ErrnoException).code === 'EADDRINUSE') {
        // eslint-disable-next-line no-console
        console.warn(`[Server] HTTPS port ${candidate} busy — trying next`);
        continue;
      }
      // eslint-disable-next-line no-console
      console.warn('[Server] HTTPS listener failed to start — companion microphone disabled (plain HTTP only).', err instanceof Error ? err.message : err);
      return;
    }
  }
  if (!listeningServer) {
    // eslint-disable-next-line no-console
    console.warn(`[Server] No free HTTPS port (${portCandidates.join(', ')}) — companion microphone disabled.`);
    return;
  }

  // ── R55: Live-Zertifikats-Wechsel + Automatik ──
  // a) DuckDNS eingerichtet, aber noch KEIN gültiges LE-Zertifikat (z. B.
  //    gerade in den Settings gespeichert) → im Hintergrund ausstellen;
  //    läuft der Server weiter, übernimmt setSecureContext ohne Restart.
  if (domainState && !leBundle) {
    void issueCertificate({ force: true })
      .then(() => { /* Globals macht der Swap-Handler unten */ })
      .catch((err: unknown) => {
        // eslint-disable-next-line no-console
        console.warn('[Server] Let\'s Encrypt issuance failed:', err instanceof Error ? err.message : err, '— retry in 24 h (see Settings → Mobilgerät)');
      });
  }
  // b) Swap-Handler: Ausstellung (auch getriggert von der Settings-API!)
  //    tauscht das Zertifikt am LAUFENDEN Listener — bestehende
  //    Verbindungen bleiben, neue erhalten das echte Zertifikat.
  const httpsServerRef = listeningServer;
  registerCertSwapHandler((bundle: LeCertBundle) => {
    try {
      httpsServerRef.setSecureContext({ cert: bundle.cert, key: bundle.key });
      publishCertGlobals('letsencrypt', bundle);
      // eslint-disable-next-line no-console
      console.log(`[Server] HTTPS now serving Let's Encrypt certificate for ${bundle.domain} (valid until ${bundle.expiresAt.slice(0, 10)})`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[Server] setSecureContext failed:', err instanceof Error ? err.message : err);
    }
  });
  // c) Maintenance: stündlicher DNS-Sync (IP-Wechsel) + täglicher
  //    Renewal-Check — no-op ohne konfigurierte Domain.
  startMaintenance();
}

app.prepare().then(async () => {
  // Gemeinsamer Request-Handler für HTTP + HTTPS (gleiches Verhalten)
  const requestListener = (req: import('http').IncomingMessage, res: import('http').ServerResponse) => {
    // ─── R36: Trustworthy TCP peer address for host detection ───
    // The desktop app (Tauri webview / local browser) talks to this server
    // via loopback, companion phones connect via LAN IP. The API routes use
    // this header to exempt the HOST from GAME_PIN protection (the PIN gates
    // companions, never the host itself — fixing the R34/R35 risk that all
    // desktop pushes failed when GAME_PIN was set).
    // SECURITY: strip any client-supplied value FIRST, then inject the real
    // socket address — a phone on the network cannot spoof its source IP.
    delete req.headers['x-karaoke-tcp-addr'];
    req.headers['x-karaoke-tcp-addr'] = req.socket.remoteAddress ?? '';

    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  };

  const server = createServer(requestListener);

  // ─── Attach Socket.IO to the same HTTP server ───
  initSocketIO(server);

  // NOTE: no manual 'upgrade' wiring needed here. Next 16's NextCustomServer
  // auto-wires its own upgrade handler onto this HTTP server on the first
  // request (via req.socket.server), which routes /_next/l HMR websocket
  // upgrades to the Turbopack hot reloader. Adding a second listener here
  // would double-handle upgrades and break the HMR connection.

  // ─── Graceful shutdown registry (HTTP + HTTPS + Timers) ───
  const shutdownFns: Array<() => void> = [];
  const registerShutdown = (fn: () => void) => { shutdownFns.push(fn); };

  server.listen(port, hostname, async () => {
    // eslint-disable-next-line no-console
    console.log(`
╔══════════════════════════════════════════════════╗
║  🎤 Karaoke ZERO Server                          ║
║  Next.js:   http://${hostname}:${port}                    ║
║  Socket.IO: ws://${hostname}:${port}/socket.io          ║
║  Mode:      ${dev ? 'DEVELOPMENT' : 'PRODUCTION'}                         ║
╚══════════════════════════════════════════════════╝
    `);

    // R53: HTTPS-Listener NACH dem HTTP-Server starten (paralleler Betrieb;
    // der HTTPS-Port landet in globalThis.__karaokeHttpsPort → status-API).
    await startHttpsListener(requestListener, registerShutdown);
  });

  // Graceful shutdown
  const shutdown = () => {
    // eslint-disable-next-line no-console
    console.log('[Server] Shutting down...');
    for (const fn of shutdownFns) {
      try { fn(); } catch { /* already closed */ }
    }
    server.close(() => {
      // eslint-disable-next-line no-console
      console.log('[Server] HTTP server closed');
      process.exit(0);
    });
    // Force exit after 5s if graceful shutdown fails
    setTimeout(() => {
      // eslint-disable-next-line no-console
      console.error('[Server] Forced shutdown after timeout');
      process.exit(1);
    }, 5000);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
});
