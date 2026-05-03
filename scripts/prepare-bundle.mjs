/**
 * prepare-bundle.mjs
 * Cross-platform build preparation for Tauri
 * Runs: next build → copy standalone output → copy static files → copy portable node
 *
 * Usage: node scripts/prepare-bundle.mjs
 *   or:  bun scripts/prepare-bundle.mjs
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, cpSync, readdirSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

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
//  Step 1: Build Next.js (standalone)
// ═══════════════════════════════════════════════════════════
log('\n=== Step 1/5: Building Next.js (standalone) ===\n');

const standaloneDir = join(ROOT, '.next', 'standalone');

try {
  sh('npx next build');
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
//  Step 3: Copy standalone → src-tauri/bundled/server
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
