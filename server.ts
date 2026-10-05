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
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { networkInterfaces } from 'os';
import { join } from 'path';
import { parse } from 'url';
import next from 'next';
import { initSocketIO, attachSocketIO } from './src/lib/socketio-server';

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
//  R53: Self-Signed-HTTPS-Zertifikat (Dev-Server + tsx-Produktion)
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

/**
 * Liefert das persistente Self-Signed-Cert (certs/https-*.pem im Projekt-
 * Root). Existiert noch keins (oder hat sich der IP-Bestand geändert),
 * wird eines erzeugt (node-forge, 10 Jahre gültig, SAN mit localhost +
 * 127.0.0.1 + allen LAN-IPs). Das Cert bleibt über Server-Restarts stabil,
 * damit die einmalige Browser-Bestätigung pro Handy erhalten bleibt.
 */
async function ensureSelfSignedCert(): Promise<{ cert: string; key: string } | null> {
  const certsDir = join(process.cwd(), 'certs');
  const certPath = join(certsDir, 'https-cert.pem');
  const keyPath = join(certsDir, 'https-key.pem');
  const metaPath = join(certsDir, 'https-meta.json');
  const lanIps = getLanIpv4s();

  const ipsUnchanged = (meta: unknown): boolean => {
    if (!meta || typeof meta !== 'object' || !Array.isArray((meta as { ips?: unknown }).ips)) return false;
    const stored = (meta as { ips: string[] }).ips;
    return stored.length === lanIps.length && lanIps.every(ip => stored.includes(ip));
  };

  // Bestehendes Cert wiederverwenden, solange die LAN-IPs passen
  if (existsSync(certPath) && existsSync(keyPath)) {
    try {
      const meta = JSON.parse(readFileSync(metaPath, 'utf8')) as unknown;
      if (ipsUnchanged(meta)) {
        return { cert: readFileSync(certPath, 'utf8'), key: readFileSync(keyPath, 'utf8') };
      }
      // IP-Set hat sich geändert (WLAN-Wechsel etc.) → SAN aktualisieren.
      // Kostet die Nutzer EINE erneute Zertifikats-Bestätigung pro Gerät.
    } catch {
      // Meta unlesbar → neu generieren
    }
  }

  try {
    // CJS/ESM-Interop: node-forge ist ein CommonJS-Modul — der dynamische
    // import() liefert die Exports unter .default (cjs-module-lexer erkennt
    // die named exports von node-forge nicht). Ohne diesen Fallback war
    // forge.pki undefined → Zertifikats-Generierung schlug immer fehl.
    const imported = await import('node-forge');
    const forge = imported.pki ? imported : ((imported as unknown as { default: typeof imported }).default ?? imported);
    const keys = forge.pki.rsa.generateKeyPair(2048);
    const cert = forge.pki.createCertificate();
    cert.publicKey = keys.publicKey;
    cert.serialNumber = String(Date.now());
    cert.validity.notBefore = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 Tag Toleranz gegen Uhrabweichung
    cert.validity.notAfter = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000); // 10 Jahre
    const attrs = [
      { name: 'commonName', value: 'Karaoke ZERO Companion' },
      { name: 'organizationName', value: 'Karaoke ZERO' },
      { shortName: 'OU', value: 'Companion HTTPS' },
    ];
    cert.setSubject(attrs);
    cert.setIssuer(attrs); // self-signed
    cert.setExtensions([
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
    cert.sign(keys.privateKey, forge.md.sha256.create());

    const certPem = forge.pki.certificateToPem(cert);
    const keyPem = forge.pki.privateKeyToPem(keys.privateKey);
    mkdirSync(certsDir, { recursive: true });
    writeFileSync(certPath, certPem);
    writeFileSync(keyPath, keyPem);
    writeFileSync(metaPath, JSON.stringify({ ips: lanIps, generatedAt: new Date().toISOString() }));
    // eslint-disable-next-line no-console
    console.log(`[Server] Generated self-signed HTTPS certificate (SAN: localhost, 127.0.0.1${lanIps.length ? ', ' + lanIps.join(', ') : ''})`);
    return { cert: certPem, key: keyPem };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[Server] HTTPS certificate generation failed — companion microphone disabled (plain HTTP only).', err);
    return null;
  }
}

/** Startet den HTTPS-Listener auf dem ersten freien Port (Base, Base+1 … Base+4). */
async function startHttpsListener(
  requestListener: (req: import('http').IncomingMessage, res: import('http').ServerResponse) => void,
  onShutdown: (fn: () => void) => void,
): Promise<void> {
  // Expliziter Opt-out (HTTPS_PORT=0)
  if (process.env.HTTPS_PORT === '0') return;

  const certData = await ensureSelfSignedCert();
  if (!certData) return;

  const basePort = parseInt(process.env.HTTPS_PORT || '3443', 10);

  const listenOnce = (p: number): Promise<HttpsServer> =>
    new Promise((resolve, reject) => {
      const httpsServer = createHttpsServer(
        {
          cert: certData.cert,
          key: certData.key,
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

  for (let offset = 0; offset <= 4; offset++) {
    const candidate = basePort + offset;
    try {
      await listenOnce(candidate);
      // Port für die App veröffentlichen (status-API → QR-URLs). Gleiche
      // Prozess-Garantie wie __karaokeMobileShared: server.ts und die
      // Next-API-Routes teilen sich das globalThis des Serverprozesses.
      (globalThis as typeof globalThis & { __karaokeHttpsPort?: number }).__karaokeHttpsPort = candidate;
      // eslint-disable-next-line no-console
      console.log(`[Server] HTTPS listener active on https://${hostname}:${candidate} (self-signed) — companion microphone enabled`);
      return;
    } catch (err) {
      if (err instanceof Error && (err as NodeJS.ErrnoException).code === 'EADDRINUSE' && offset < 4) {
        // eslint-disable-next-line no-console
        console.warn(`[Server] HTTPS port ${candidate} busy — trying ${candidate + 1}`);
        continue;
      }
      // eslint-disable-next-line no-console
      console.warn('[Server] HTTPS listener failed to start — companion microphone disabled (plain HTTP only).', err instanceof Error ? err.message : err);
      return;
    }
  }
  // eslint-disable-next-line no-console
  console.warn(`[Server] No free HTTPS port in ${basePort}..${basePort + 4} — companion microphone disabled.`);
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
