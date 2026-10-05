/**
 * Custom standalone server for the Tauri desktop build (production).
 *
 * Replaces the auto-generated Next.js standalone server.js, which boots the
 * Next runtime but has NO Socket.IO — companions in the packaged desktop
 * app got endless "WebSocket connection to 'ws://localhost:3000/socket.io/'
 * failed" console errors and could only use the HTTP polling fallback.
 *
 * This server:
 *   1. loads the build-time Next config (same source the generated
 *      server.js inlines: .next/required-server-files.json)
 *   2. boots the standalone Next.js runtime through the public
 *      `getRequestHandlers` API from next/dist/server/lib/start-server
 *   3. attaches the bundled Socket.IO server (socketio-server.cjs, built
 *      by scripts/prepare-bundle.mjs via esbuild) to the SAME HTTP server
 *   4. degrades gracefully: without socketio-server.cjs the app still
 *      boots — companions just fall back to HTTP polling
 *   5. R52: opens an ADDITIONAL HTTPS listener (default port 3443) with a
 *      certificate from certs/ (generated at bundle time by
 *      prepare-bundle.mjs). Phones connect via https:// so getUserMedia
 *      („Companion als Mikrofon") works — browsers block mic access on
 *      insecure origins like http://<LAN-IP>:3000. The HTTPS port is
 *      published to the app via globalThis.__karaokeHttpsPort (read by
 *      the /api/mobile status action → httpsPort → QR/Companion-URLs).
 *      R54: Die Zertifikate sind jetzt eine lokale Root-CA (ca-*.pem, stabil)
 *      + Leaf. Handys installieren die CA EINMAL (Download über
 *      /api/mobile?action=ca-cert) → nie wieder Zertifikats-Warnung. Ist
 *      node-forge im Bundle verfügbar, wird der Leaf bei Bedarf zur
 *      Laufzeit neu ausgestellt (SAN mit den aktuellen LAN-IPs) — ohne
 *      Neu-Installation auf den Handys, weil die CA gleich bleibt.
 *
 * Mirrors the request/upgrade error handling of Next's own startServer()
 * (500 responses for failed requests, socket.destroy for failed upgrades).
 */
const path = require('path');
const http = require('http');
const https = require('https');
const fs = require('fs');

const dir = path.join(__dirname);
process.env.NODE_ENV = 'production';
process.chdir(__dirname);

const currentPort = parseInt(process.env.PORT, 10) || 3000;
const hostname = process.env.HOSTNAME || '0.0.0.0';

let keepAliveTimeout = parseInt(process.env.KEEP_ALIVE_TIMEOUT, 10);
if (
  Number.isNaN(keepAliveTimeout) ||
  !Number.isFinite(keepAliveTimeout) ||
  keepAliveTimeout < 0
) {
  keepAliveTimeout = undefined;
}

// ─── 1. Build-time Next config (the generated server.js inlines this) ───
// required-server-files.json ships with the standalone output and contains
// the fully resolved config. Without __NEXT_PRIVATE_STANDALONE_CONFIG the
// config loader tries to read webpack hook files that are not traced into
// standalone and throws.
try {
  const requiredServerFiles = path.join(dir, '.next', 'required-server-files.json');
  const nextConfig = JSON.parse(fs.readFileSync(requiredServerFiles, 'utf8')).config;
  process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(nextConfig);
} catch (err) {
  console.warn('[standalone] Could not load .next/required-server-files.json:', err && err.message);
  console.warn('[standalone] Continuing without embedded config — this may fail.');
}

require('next');
const { getRequestHandlers } = require('next/dist/server/lib/start-server');

// ─── 2. Socket.IO (best-effort, bundled by scripts/prepare-bundle.mjs) ───
let initSocketIO = null;
let attachSocketIO = null;
try {
  initSocketIO = require('./socketio-server.cjs').initSocketIO;
  attachSocketIO = require('./socketio-server.cjs').attachSocketIO;
} catch (err) {
  console.warn('[standalone] socketio-server.cjs not available — companions will use HTTP polling.');
  console.warn('[standalone] reason:', err && err.message);
}

async function main() {
  // ─── 3. Boot the standalone Next.js runtime ───
  const { requestHandler, upgradeHandler } = await getRequestHandlers({
    dir,
    port: currentPort,
    isDev: false,
    onDevServerCleanup: undefined,
    server: undefined,
    hostname,
    keepAliveTimeout,
  });

  // Same error handling shape as next's startServer():
  // failed requests → 500, failed upgrades → socket.destroy()
  async function requestListener(req, res) {
    try {
      await requestHandler(req, res);
    } catch (err) {
      res.statusCode = 500;
      res.end('Internal Server Error');
      console.error(`[standalone] Failed to handle request for ${req.url}`);
      console.error(err);
    }
  }

  const server = http.createServer(requestListener);
  if (keepAliveTimeout) {
    server.keepAliveTimeout = keepAliveTimeout;
  }

  server.on('upgrade', async (req, socket, head) => {
    try {
      await upgradeHandler(req, socket, head);
    } catch (err) {
      socket.destroy();
      console.error(`[standalone] Failed to handle upgrade for ${req.url}`);
      console.error(err);
    }
  });

  // ─── 4. Attach Socket.IO AFTER Next's handlers are registered ───
  // engine.io wraps the existing request/upgrade listeners at attach time
  // and passes all non-/socket.io traffic through to them untouched.
  if (initSocketIO) {
    try {
      initSocketIO(server);
      console.log('[standalone] Socket.IO attached on path /socket.io');
    } catch (err) {
      console.warn('[standalone] Socket.IO init failed — HTTP polling fallback active.');
      console.warn('[standalone] reason:', err && err.message);
    }
  }

  server.listen(currentPort, hostname, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║  🎤 Karaoke ZERO Server (standalone + Socket.IO) ║');
    console.log(`║  Next.js:   http://${hostname}:${currentPort}`);
    console.log(`║  Socket.IO: ws://${hostname}:${currentPort}/socket.io`);
    if (httpsServer) {
      console.log(`║  HTTPS:     https://${hostname}:${httpsPort} (Companion-Mikrofon 🎤)`);
    }
    console.log('╚══════════════════════════════════════════════════╝');
  });

  // ─── 5. R52: HTTPS-Listener für die Companion-App (Mikrofon-Freigabe) ───
  // getUserMedia ist auf http://<LAN-IP> blockiert (kein sicherer Kontext) —
  // nur localhost gilt ohne TLS als sicher. Mit dem Zertifikat aus dem
  // Bundle (certs/, R54: lokale Root-CA + Leaf) öffnen wir deshalb einen
  // parallelen HTTPS-Listener. Handys installieren die Root-CA EINMAL
  // (/api/mobile?action=ca-cert) und sehen danach KEINE Zertifikats-Warnung
  // mehr — auch nach IP-Wechseln nicht (Leaf wird nur neu signiert).
  let httpsServer = null;
  let httpsPort = null;
  try {
    const certsDir = process.env.KARAOKE_CERTS_DIR || path.join(dir, 'certs');
    const certPath = path.join(certsDir, 'https-cert.pem');
    const keyPath = path.join(certsDir, 'https-key.pem');
    const caCertPath = path.join(certsDir, 'ca-cert.pem');
    const caKeyPath = path.join(certsDir, 'ca-key.pem');
    const metaPath = path.join(certsDir, 'https-meta.json');

    // R54: node-forge laden (wird von prepare-bundle.mjs ins Bundle kopiert).
    // Fehlt es, funktioniert der HTTPS-Listener trotzdem mit den build-time
    // Zertifikaten — nur die Runtime-Neuausstellung des Leafs entfällt.
    let forge = null;
    try {
      const m = require('node-forge');
      forge = m.pki ? m : (m.default ?? m);
    } catch { /* best effort — siehe oben */ }

    // LAN-IPv4s dieser Maschine (für das SAN des Leafs)
    const lanIps = [];
    try {
      const nets = require('os').networkInterfaces();
      for (const list of Object.values(nets)) {
        for (const net of list || []) {
          if (net.family === 'IPv4' && !net.internal) lanIps.push(net.address);
        }
      }
    } catch { /* ohne LAN-IPs fortfahren */ }

    // Root-CA laden oder (falls fehlend und node-forge da) neu erzeugen.
    let caCertPem = fs.existsSync(caCertPath) ? fs.readFileSync(caCertPath, 'utf8') : null;
    let caKeyPem = fs.existsSync(caKeyPath) ? fs.readFileSync(caKeyPath, 'utf8') : null;
    if ((!caCertPem || !caKeyPem) && forge) {
      try {
        const caKeys = forge.pki.rsa.generateKeyPair(2048);
        const ca = forge.pki.createCertificate();
        ca.publicKey = caKeys.publicKey;
        ca.serialNumber = String(Date.now());
        ca.validity.notBefore = new Date(Date.now() - 24 * 60 * 60 * 1000);
        ca.validity.notAfter = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000);
        const caAttrs = [
          { name: 'commonName', value: 'Karaoke ZERO Local CA' },
          { name: 'organizationName', value: 'Karaoke ZERO' },
        ];
        ca.setSubject(caAttrs);
        ca.setIssuer(caAttrs);
        ca.setExtensions([
          { name: 'basicConstraints', cA: true },
          { name: 'keyUsage', keyCertSign: true, cRLSign: true },
          { name: 'subjectKeyIdentifier' },
        ]);
        ca.sign(caKeys.privateKey, forge.md.sha256.create());
        caCertPem = forge.pki.certificateToPem(ca);
        caKeyPem = forge.pki.privateKeyToPem(caKeys.privateKey);
        try {
          fs.mkdirSync(certsDir, { recursive: true });
          fs.writeFileSync(caCertPath, caCertPem);
          fs.writeFileSync(caKeyPath, caKeyPem);
          console.log('[standalone] Generated local root CA (certs/ca-cert.pem) — install once per phone via /api/mobile?action=ca-cert');
        } catch (persistErr) {
          console.warn('[standalone] Could not persist root CA (read-only install dir?) — CA changes on every start:', persistErr && persistErr.message);
        }
      } catch (genErr) {
        console.warn('[standalone] Root-CA generation failed:', genErr && genErr.message);
      }
    }

    // Leaf: wiederverwenden, solange CA + LAN-IP-Set passen; sonst neu
    // ausstellen (gleiche CA!) — keine Neu-Installation auf den Handys.
    const caHash = caCertPem
      ? require('crypto').createHash('sha256').update(caCertPem).digest('hex')
      : null;
    let certPem = fs.existsSync(certPath) ? fs.readFileSync(certPath, 'utf8') : null;
    let keyPem = fs.existsSync(keyPath) ? fs.readFileSync(keyPath, 'utf8') : null;
    let metaOk = false;
    try {
      if (certPem && keyPem && caHash) {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        metaOk = meta && meta.caHash === caHash && Array.isArray(meta.ips)
          && meta.ips.length === lanIps.length
          && lanIps.every((ip) => meta.ips.includes(ip));
      }
    } catch { metaOk = false; }

    if ((!certPem || !keyPem || !metaOk) && forge && caCertPem && caKeyPem) {
      try {
        const caCert = forge.pki.certificateFromPem(caCertPem);
        const caKey = forge.pki.privateKeyFromPem(caKeyPem);
        const leafKeys = forge.pki.rsa.generateKeyPair(2048);
        const leaf = forge.pki.createCertificate();
        leaf.publicKey = leafKeys.publicKey;
        leaf.serialNumber = String(Date.now());
        leaf.validity.notBefore = new Date(Date.now() - 24 * 60 * 60 * 1000);
        leaf.validity.notAfter = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000);
        leaf.setSubject([
          { name: 'commonName', value: 'Karaoke ZERO Companion' },
          { name: 'organizationName', value: 'Karaoke ZERO' },
        ]);
        leaf.setIssuer(caCert.subject.attributes);
        leaf.setExtensions([
          { name: 'basicConstraints', cA: false },
          { name: 'keyUsage', digitalSignature: true, keyEncipherment: true },
          { name: 'extKeyUsage', serverAuth: true },
          {
            name: 'subjectAltName',
            altNames: [
              { type: 2, value: 'localhost' },
              { type: 7, ip: '127.0.0.1' },
              ...lanIps.map((ip) => ({ type: 7, ip })),
            ],
          },
        ]);
        leaf.sign(caKey, forge.md.sha256.create());
        certPem = forge.pki.certificateToPem(leaf);
        keyPem = forge.pki.privateKeyToPem(leafKeys.privateKey);
        try {
          fs.mkdirSync(certsDir, { recursive: true });
          fs.writeFileSync(certPath, certPem);
          fs.writeFileSync(keyPath, keyPem);
          fs.writeFileSync(metaPath, JSON.stringify({ ips: lanIps, caHash, generatedAt: new Date().toISOString() }));
        } catch { /* best effort — ephemeral Leaf ist bei installierter CA folgenlos */ }
        console.log(`[standalone] Issued HTTPS leaf signed by local CA (SAN: localhost, 127.0.0.1${lanIps.length ? ', ' + lanIps.join(', ') : ''})`);
      } catch (issueErr) {
        console.warn('[standalone] Leaf re-issue failed:', issueErr && issueErr.message);
      }
    }

    if (certPem && keyPem) {
      // Root-CA für den Download-Endpunkt veröffentlichen (BEFORE listen,
      // damit der erste Request sie schon sieht).
      if (caCertPem) globalThis.__karaokeCaCertPem = caCertPem;
      httpsPort = parseInt(process.env.HTTPS_PORT, 10) || 3443;
      httpsServer = https.createServer(
        {
          // Leaf + CA-Kette (Root-CA installiert → keine Browser-Warnung)
          cert: caCertPem ? certPem + '\n' + caCertPem : certPem,
          key: keyPem,
        },
        requestListener,
      );
      if (keepAliveTimeout) {
        httpsServer.keepAliveTimeout = keepAliveTimeout;
      }
      httpsServer.on('upgrade', async (req, socket, head) => {
        try {
          await upgradeHandler(req, socket, head);
        } catch (err) {
          socket.destroy();
          console.error(`[standalone] Failed to handle HTTPS upgrade for ${req.url}`);
          console.error(err);
        }
      });
      // Socket.IO auch an den HTTPS-Server hängen (gleiche io-Instanz,
      // gleiche connection handlers — engine.io wrapped nur die Listener).
      if (initSocketIO && attachSocketIO) {
        try {
          attachSocketIO(httpsServer);
        } catch (err) {
          console.warn('[standalone] Socket.IO attach to HTTPS server failed:', err && err.message);
        }
      }
      httpsServer.listen(httpsPort, hostname, () => {
        // Port für die App veröffentlichen (status-API → QR-URLs). Muss VOR
        // dem ersten status-Request passieren — globalThis ist prozessweit
        // mit den Next-API-Routes geteilt (gleiches Muster wie mobile-state).
        globalThis.__karaokeHttpsPort = httpsPort;
        console.log(`[standalone] HTTPS listener active on https://${hostname}:${httpsPort}${caCertPem ? ' (local CA)' : ' (self-signed)'} — install the CA once per phone via /api/mobile?action=ca-cert`);
      });
    } else {
      console.warn('[standalone] No HTTPS certificate found (certs/https-*.pem) — companion microphone disabled (plain HTTP only).');
    }
  } catch (err) {
    console.warn('[standalone] HTTPS listener failed to start:', err && err.message);
    httpsServer = null;
    httpsPort = null;
  }

  // Graceful shutdown (Tauri sends SIGTERM when the window closes)
  let shuttingDown = false;
  const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[standalone] ${signal} received, shutting down...`);
    if (httpsServer) httpsServer.close();
    server.close(() => process.exit(0));
    // Force exit after 5s if graceful shutdown hangs
    setTimeout(() => process.exit(1), 5000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('[standalone] Failed to start server:', err);
  process.exit(1);
});
