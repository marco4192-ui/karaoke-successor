/**
 * prepare-bundle.mjs
 * Cross-platform build preparation for Tauri
 * Runs: next build → copy standalone output → copy static files → copy portable node
 *
 * Usage: node scripts/prepare-bundle.mjs
 *   or:  bun scripts/prepare-bundle.mjs
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, cpSync, readdirSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { build as esbuild } from 'esbuild';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

function log(msg, color = CYAN) { console.log(`${color}${msg}${RESET}`); }
function ok(msg) { log(`  [OK] ${msg}`, GREEN); }
function warn(msg) { log(`  [WARN] ${msg}`, YELLOW); }
function fail(msg) { log(`  [FAIL] ${msg}`, RED); }

function sh(cmd) {
  log(`  > ${cmd}`);
  execSync(cmd, { cwd: ROOT, stdio: 'inherit' });
}

function listDir(dir) {
  try { return readdirSync(dir); } catch { return []; }
}

// ═══════════════════════════════════════════════════════════
//  Step 0: Clean .next cache to prevent stale Turbopack artifacts
// ═══════════════════════════════════════════════════════════
log('\n=== Step 0/5: Cleaning .next cache ===\n');

const nextDir = join(ROOT, '.next');
if (existsSync(nextDir)) {
  rmSync(nextDir, { recursive: true, force: true });
  ok('Removed .next/ directory');
} else {
  ok('.next/ does not exist, nothing to clean');
}

// ═══════════════════════════════════════════════════════════
//  Step 1: Build Next.js (standalone)
// ═══════════════════════════════════════════════════════════
log('\n=== Step 1/5: Building Next.js (standalone) ===\n');

const standaloneDir = join(ROOT, '.next', 'standalone');

try {
  // Use webpack instead of Turbopack — Turbopack has a module initialization
  // ordering bug that causes TDZ errors ("Cannot access 'n' before initialization")
  // in React's useState/useSyncExternalStore when many modules are eagerly loaded.
  sh('npx next build --webpack');
  ok('Next.js build completed');
} catch {
  fail('Next.js build failed!');
  process.exit(1);
}

if (!existsSync(standaloneDir)) {
  fail('.next/standalone not found after build!');
  fail('Make sure next.config.ts has output: "standalone"');
  process.exit(1);
}
ok('Standalone output found');

// ═══════════════════════════════════════════════════════════
//  Step 2: Copy static files into standalone
// ═══════════════════════════════════════════════════════════
log('\n=== Step 2/5: Copying static & public files ===\n');

// .next/static → .next/standalone/.next/static
const srcStatic = join(ROOT, '.next', 'static');
const dstStatic = join(standaloneDir, '.next', 'static');
if (existsSync(srcStatic)) {
  mkdirSync(dstStatic, { recursive: true });
  cpSync(srcStatic, dstStatic, { recursive: true });
  ok('.next/static → .next/standalone/.next/static');
} else {
  warn('No .next/static directory');
}

// public → .next/standalone/public
const srcPublic = join(ROOT, 'public');
const dstPublic = join(standaloneDir, 'public');
if (existsSync(srcPublic)) {
  mkdirSync(dstPublic, { recursive: true });
  cpSync(srcPublic, dstPublic, { recursive: true });
  ok('public/ → .next/standalone/public/');
} else {
  warn('No public/ directory');
}

// ═══════════════════════════════════════════════════════════
//  Step 2.5: Bundle Socket.IO server for the standalone runtime
// ═══════════════════════════════════════════════════════════
// The generated standalone server.js boots Next.js ONLY — our custom
// server.ts (dev/prod: `tsx server.ts`) is not part of the standalone
// output, so the packaged desktop app had NO Socket.IO: companions spammed
// "WebSocket connection failed" console errors and fell back to HTTP
// polling. We inline src/lib/socketio-server.ts + its whole dependency
// graph (socket.io, engine.io, ws, mobile-state, ...) into one CJS file.
// Shared state is safe: mobile-state/socketio-events anchor everything
// on globalThis, so both module graphs use the same instances.
log('\n=== Step 2.5/5: Bundling Socket.IO server (standalone) ===\n');

const socketioCjs = join(standaloneDir, 'socketio-server.cjs');
try {
  await esbuild({
    entryPoints: [join(ROOT, 'scripts', 'socketio-standalone-entry.ts')],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: ['node18'],
    outfile: socketioCjs,
    // next/* resolve at runtime from the standalone output's node_modules;
    // bufferutil/utf-8-validate are optional native deps of ws (not installed)
    external: ['next', 'next/*', 'bufferutil', 'utf-8-validate'],
    tsconfig: join(ROOT, 'tsconfig.json'),
    sourcemap: false,
    minify: false,
    logLevel: 'warning',
  });
  ok('Bundled socketio-server.cjs into standalone output');
} catch (err) {
  fail('esbuild failed to bundle the Socket.IO server!');
  console.error(err);
  fail('The desktop app would start WITHOUT Socket.IO (HTTP polling fallback) — aborting so the regression is caught at build time.');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════
//  Step 3: Copy standalone → src-tauri/bundled/server (+ custom server.js)
// ═══════════════════════════════════════════════════════════
log('\n=== Step 3/5: Copying to src-tauri/bundled/server ===\n');

const bundledServer = join(ROOT, 'src-tauri', 'bundled', 'server');
mkdirSync(bundledServer, { recursive: true });
cpSync(standaloneDir, bundledServer, { recursive: true, force: true });
ok('Copied standalone → src-tauri/bundled/server/');

// ═══════════════════════════════════════════════════════════
//  Step 3.5: Strip musl native modules (sharp & Co.)
// ═══════════════════════════════════════════════════════════
// sharp installs native binaries for EVERY libc/platform as optional
// dependencies, and the Next.js standalone trace copies them all into
// the bundle. On glibc systems the musl files are dead weight — and
// worse: linuxdeploy (AppImage bundling on Linux) resolves the deps of
// EVERY ELF file in the AppDir and aborts with
//   "ERROR: Could not find dependency: libc.musl-x86_64.so.1"
// (real CI failure, GitHub run 35478769960). Windows/macOS builds are
// not affected by the extra files, but stripping shrinks every bundle.
// musl/Alpine targets are intentionally unsupported (glibc baseline).
{
  const nm = join(bundledServer, 'node_modules');
  let stripped = 0;
  const stripMuslDirs = (parent) => {
    for (const entry of listDir(parent)) {
      if (!entry.includes('musl')) continue;
      try {
        rmSync(join(parent, entry), { recursive: true, force: true });
        stripped++;
        ok(`Musl-Modul entfernt: ${entry}`);
      } catch { /* best effort */ }
    }
  };
  if (existsSync(nm)) {
    stripMuslDirs(nm); // top-level packages (z. B. *-linux-musl-*)
    for (const entry of listDir(nm)) { // scoped packages (z. B. @img/sharp-linuxmusl-*)
      if (entry.startsWith('@')) stripMuslDirs(join(nm, entry));
    }
  }
  if (stripped > 0) ok(`${stripped} musl-Pakete aus dem Server-Bundle entfernt (linuxdeploy/AppImage-Kompatibilität + kleinere Bundles)`);
}

const serverJs = join(bundledServer, 'server.js');
if (!existsSync(serverJs)) {
  fail('server.js not found in bundled output!');
  process.exit(1);
}
ok('Verified server.js exists');

// Replace the generated server.js with our custom standalone server that
// boots the same Next runtime AND attaches the bundled Socket.IO server.
// The Tauri shell launches exactly this file (see get_server_path in lib.rs).
const customServerSrc = join(ROOT, 'scripts', 'standalone-server.js');
const customServerDst = join(bundledServer, 'server.js');
writeFileSync(customServerDst, readFileSync(customServerSrc, 'utf8'));
ok('Replaced server.js with custom standalone server (Next + Socket.IO)');

if (!existsSync(join(bundledServer, 'socketio-server.cjs'))) {
  fail('socketio-server.cjs missing from bundled server!');
  process.exit(1);
}
ok('Verified socketio-server.cjs is bundled');

// ═══════════════════════════════════════════════════════════
//  Step 3.7 (R52/R54): HTTPS-Zertifikate — lokale Root-CA + Leaf
// ═══════════════════════════════════════════════════════════
// getUserMedia (Handy-Mikrofon, „Companion als Mic") ist in Browsern auf
// unsicheren Ursprüngen BLOCKIERT — http://<LAN-IP>:3000 vom Handy ist immer
// insecure (nur localhost gilt ohne TLS als sicher). Der standalone-server
// öffnet deshalb parallel zum HTTP-Port 3000 einen HTTPS-Listener (Default
// 3443) mit diesen Zertifikaten.
//
// R54: LOKALE ROOT-CA + Leaf statt purem Self-Signed-Cert. Handys laden die
// CA EINMAL herunter (/api/mobile?action=ca-cert) und installieren sie —
// danach zeigt der Browser KEINE Zertifikats-Warnung mehr, und zwar dauerhaft
// (der Leaf wird bei IP-Wechseln nur von derselben CA neu signiert, siehe
// standalone-server.js). Die LAN-IP ist zur Build-Zeit unbekannt — der
// standalone-server stellt den Leaf zur Laufzeit neu aus, sobald node-forge
// im Bundle liegt (Step 3.75 kopiert es hinein).
log('\n=== Step 3.7/5: Generating HTTPS certificates (CA + leaf, companion mic) ===\n');

{
  const certsDir = join(bundledServer, 'certs');
  const caCertPath = join(certsDir, 'ca-cert.pem');
  const caKeyPath = join(certsDir, 'ca-key.pem');
  const certPath = join(certsDir, 'https-cert.pem');
  const keyPath = join(certsDir, 'https-key.pem');
  const metaPath = join(certsDir, 'https-meta.json');
  try {
    // R53-Fix — CJS/ESM-Interop: node-forge liefert seine Exports unter
    // .default (cjs-module-lexer erkennt die named exports nicht). Ohne
    // den Fallback war forge.pki undefined → die Zertifikats-Generierung
    // schlug IMMER fehl und der Produktions-HTTPS-Listener startete nie.
    const forgeModule = await import('node-forge');
    const forge = forgeModule.pki ? forgeModule : (forgeModule.default ?? forgeModule);

    // ── Root-CA: bestehende wiederverwenden (stabil über Rebuilds!), sonst neu ──
    let caCertPem = null;
    let caKeyPem = null;
    if (existsSync(caCertPath) && existsSync(caKeyPath)) {
      caCertPem = readFileSync(caCertPath, 'utf8');
      caKeyPem = readFileSync(caKeyPath, 'utf8');
      ok('Reusing existing certs/ca-*.pem (stable root CA — phones keep their installation)');
    } else {
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
      mkdirSync(certsDir, { recursive: true });
      writeFileSync(caCertPath, caCertPem);
      writeFileSync(caKeyPath, caKeyPem);
      ok('Generated certs/ca-cert.pem + ca-key.pem (local root CA, 10 years)');
    }

    // ── Leaf: von der CA signiert, SAN localhost + 127.0.0.1 (LAN-IPs
    //    ergänzt der standalone-server zur Laufzeit neu, wenn nötig) ──
    const caCert = forge.pki.certificateFromPem(caCertPem);
    const caKey = forge.pki.privateKeyFromPem(caKeyPem);
    const { createHash } = await import('crypto');
    const caHash = createHash('sha256').update(caCertPem).digest('hex');

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
      { name: 'subjectAltName', altNames: [
        { type: 2, value: 'localhost' }, // DNS
        { type: 7, ip: '127.0.0.1' }, // IP
      ] },
    ]);
    leaf.sign(caKey, forge.md.sha256.create());

    mkdirSync(certsDir, { recursive: true });
    writeFileSync(certPath, forge.pki.certificateToPem(leaf));
    writeFileSync(keyPath, forge.pki.privateKeyToPem(leafKeys.privateKey));
    writeFileSync(metaPath, JSON.stringify({ ips: [], caHash, generatedAt: new Date().toISOString() }));
    ok('Generated certs/https-cert.pem + https-key.pem (leaf signed by local CA)');
  } catch (err) {
    fail('HTTPS certificate generation failed!');
    console.error(err);
    warn('The standalone server will run WITHOUT the HTTPS listener —');
    warn('the companion microphone (phone as mic) will NOT work!');
    // Nicht abbrechen: Das Bundle bleibt funktionsfähig (HTTP + Companion-
    // Steuerung), nur das Handy-Mikro ist dann deaktiviert.
  }
}

// ═══════════════════════════════════════════════════════════
//  Step 3.75 (R54): node-forge in die Bundle-node_modules kopieren
// ═══════════════════════════════════════════════════════════
// Der standalone-server re-issued den HTTPS-Leaf zur LAUFZEIT neu, sobald
// die LAN-IPs des Rechners nicht mehr zum SAN passen (WLAN-Wechsel etc.) —
// ohne Neu-Installation auf den Handys, weil die Root-CA gleich bleibt.
// Dafür braucht er node-forge; das Next-standalone-Output tracet es NICHT
// (kein App-Code importiert es — nur server.ts / prepare-bundle dynamisch).
// Also: explizit ins Bundle kopieren (pure JS, keine nativen Teile).
{
  const forgeSrc = join(ROOT, 'node_modules', 'node-forge');
  const forgeDst = join(bundledServer, 'node_modules', 'node-forge');
  try {
    if (existsSync(forgeSrc)) {
      if (existsSync(forgeDst)) {
        rmSync(forgeDst, { recursive: true, force: true });
      }
      cpSync(forgeSrc, forgeDst, { recursive: true });
      ok('Copied node-forge → bundled node_modules (runtime leaf re-issue)');
    } else {
      warn('node_modules/node-forge not found — runtime leaf re-issue disabled (build-time certs only).');
    }
  } catch (err) {
    warn('Could not copy node-forge into the bundle — runtime leaf re-issue disabled.');
    console.error(err);
  }
}

// ═══════════════════════════════════════════════════════════
//  Step 4: Copy portable Node.js if available
// ═══════════════════════════════════════════════════════════
log('\n=== Step 4/5: Checking portable Node.js ===\n');

const portableNodeDir = join(ROOT, 'portable-node');
const bundledNodeDir = join(ROOT, 'src-tauri', 'bundled', 'node');
const portableFiles = listDir(portableNodeDir).filter(f => f !== '.gitkeep');

if (portableFiles.length > 0) {
  mkdirSync(bundledNodeDir, { recursive: true });
  cpSync(portableNodeDir, bundledNodeDir, { recursive: true, force: true });
  ok('Copied portable Node.js → src-tauri/bundled/node/');
} else {
  warn('portable-node/ is empty');
  warn('Run "node scripts/download-node.mjs" to download Node.js');
  warn('The app will try system Node.js as fallback');
}

// ═══════════════════════════════════════════════════════════
//  Step 5: Verify dist/ splash page
// ═══════════════════════════════════════════════════════════
log('\n=== Step 5/5: Verifying splash page ===\n');

const distIndex = join(ROOT, 'dist', 'index.html');
if (existsSync(distIndex)) {
  ok('dist/index.html exists');
} else {
  warn('dist/index.html not found');
}

// ═══════════════════════════════════════════════════════════
log('\n=== Bundle preparation complete! ===\n');
ok('All steps completed');
log('\n  Next: bun tauri build\n');
