/**
 * prepare-bundle.mjs
 * Cross-platform build preparation for Tauri
 * Runs: next build → copy standalone output → copy static files → copy portable node
 *
 * Usage: node scripts/prepare-bundle.mjs
 *   or:  bun scripts/prepare-bundle.mjs
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, cpSync, readdirSync, rmSync, writeFileSync } from 'fs';
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
