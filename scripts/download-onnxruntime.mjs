/**
 * download-onnxruntime.mjs
 * Downloads the ONNX Runtime library for the `ort` crate (load-dynamic)
 * into src-tauri/bundled/native/ so CREPE pitch detection works in the
 * packaged desktop app on Windows, macOS and Linux.
 *
 * Library names expected by ort (load-dynamic) per platform:
 *   Windows → onnxruntime.dll
 *   Linux   → libonnxruntime.so
 *   macOS   → libonnxruntime.dylib
 *
 * Usage: node scripts/download-onnxruntime.mjs
 *   or:  node scripts/download-onnxruntime.mjs --version 1.20.0
 *   or:  node scripts/download-onnxruntime.mjs --platform linux --arch arm64
 *   or:  node scripts/download-onnxruntime.mjs --arch universal2   (macOS fat binary)
 *
 * Cross-platform: run this ON the target OS right before
 * `node scripts/download-node.mjs` + `bun run tauri:build`.
 *
 * NOTE: The ONNX Runtime version should match the version the `ort` crate
 * expects (ort 2.0.0-rc.x ↔ ONNX Runtime 1.20.x). The C ABI is backward
 * compatible, so slightly newer 1.x releases also work.
 */

import { existsSync, mkdirSync, chmodSync, statSync, rmSync, readdirSync, createWriteStream, realpathSync, copyFileSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { platform, arch, tmpdir } from 'os';
import { get } from 'https';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const NATIVE_DIR = join(ROOT, 'src-tauri', 'bundled', 'native');

// Parse CLI args
const args = process.argv.slice(2);
let ortVersion = '1.20.0';
let targetPlatform = platform() === 'win32' ? 'win' : platform() === 'darwin' ? 'osx' : 'linux';
let targetArch = arch() === 'x64' ? 'x64' : arch() === 'arm64' ? 'arm64' : 'x64';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--version' && args[i + 1]) ortVersion = args[++i];
  if (args[i] === '--platform' && args[i + 1]) targetPlatform = args[++i];
  if (args[i] === '--arch' && args[i + 1]) targetArch = args[++i];
}

// ONNX Runtime release asset naming
// (Linux arm64 assets are called "aarch64", macOS assets "osx-<arch>" with
//  x86_64 spelled with underscore! "universal2" = fat binary x86_64+arm64)
const assetArch = targetPlatform === 'linux' && targetArch === 'arm64' ? 'aarch64' : targetArch;
const assetPlatform = targetPlatform === 'win' ? 'win' : targetPlatform === 'osx' ? 'osx' : 'linux';

const URLS = {
  win: {
    x64: `https://github.com/microsoft/onnxruntime/releases/download/v${ortVersion}/onnxruntime-win-x64-${ortVersion}.zip`,
    arm64: `https://github.com/microsoft/onnxruntime/releases/download/v${ortVersion}/onnxruntime-win-arm64-${ortVersion}.zip`,
  },
  osx: {
    // WICHTIG: macOS-Assets heißen "osx-x86_64" (mit Unterstrich), NICHT
    // "osx-x64" — falscher Name = HTTP 404 (reale CI-Falle, v1.20.0).
    x64: `https://github.com/microsoft/onnxruntime/releases/download/v${ortVersion}/onnxruntime-osx-x86_64-${ortVersion}.tgz`,
    arm64: `https://github.com/microsoft/onnxruntime/releases/download/v${ortVersion}/onnxruntime-osx-arm64-${ortVersion}.tgz`,
    // Microsoft liefert ein Universal2-Fat-Binary (x86_64 + arm64 in einer
    // Datei) — ideal für `tauri build --target universal-apple-darwin`,
    // kein lipo-Merge nötig.
    universal2: `https://github.com/microsoft/onnxruntime/releases/download/v${ortVersion}/onnxruntime-osx-universal2-${ortVersion}.tgz`,
  },
  linux: {
    x64: `https://github.com/microsoft/onnxruntime/releases/download/v${ortVersion}/onnxruntime-linux-x64-${ortVersion}.tgz`,
    arm64: `https://github.com/microsoft/onnxruntime/releases/download/v${ortVersion}/onnxruntime-linux-aarch64-${ortVersion}.tgz`,
  },
};

// Final library file name per platform (as expected by ort load-dynamic)
const LIB_NAME = {
  win: 'onnxruntime.dll',
  osx: 'libonnxruntime.dylib',
  linux: 'libonnxruntime.so',
};

function log(msg) { console.log(msg); }
function ok(msg) { console.log(`  [OK] ${msg}`); }
function warn(msg) { console.log(`  [WARN] ${msg}`); }
function fail(msg) { console.log(`  [FAIL] ${msg}`); }

function download(url, dest, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) { reject(new Error('Too many redirects')); return; }
    log(`  Downloading: ${url}`);
    get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.resume();
        download(response.headers.location, dest, redirects + 1).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`HTTP ${response.statusCode} for ${url}`));
        return;
      }
      const file = createWriteStream(dest);
      response.pipe(file);
      file.on('finish', () => file.close(() => resolve()));
      file.on('error', reject);
    }).on('error', reject);
  });
}

function extract(archivePath, destDir) {
  mkdirSync(destDir, { recursive: true });
  if (archivePath.endsWith('.tgz')) {
    // macOS / Linux
    execSync(`tar -xzf "${archivePath}" -C "${destDir}"`, { stdio: 'inherit' });
  } else {
    // .zip — Windows 10+ ships bsdtar which handles zip
    try {
      execSync(`tar -xf "${archivePath}" -C "${destDir}"`, { stdio: 'inherit' });
    } catch {
      // Fallback: PowerShell Expand-Archive
      execSync(
        `powershell -NoProfile -Command "Expand-Archive -Force -LiteralPath '${archivePath.replace(/'/g, "''")}' -DestinationPath '${destDir.replace(/'/g, "''")}'"`,
        { stdio: 'inherit' }
      );
    }
  }
}

async function main() {
  log(`\n=== Downloading ONNX Runtime v${ortVersion} for ${assetPlatform}-${assetArch} ===\n`);

  const url = URLS[targetPlatform]?.[targetArch];
  if (!url) {
    fail(`Unsupported platform/arch: ${targetPlatform}-${targetArch}`);
    process.exit(1);
  }

  const libName = LIB_NAME[targetPlatform];
  mkdirSync(NATIVE_DIR, { recursive: true });

  // Already downloaded?
  const destLib = join(NATIVE_DIR, libName);
  if (existsSync(destLib)) {
    warn(`${libName} already exists at ${destLib}`);
    warn('Delete it first to re-download');
    return;
  }

  const archiveName = url.split('/').pop();
  const archivePath = join(tmpdir(), archiveName);

  await download(url, archivePath);
  ok(`Downloaded to ${archivePath} (${(statSync(archivePath).size / 1024 / 1024).toFixed(1)} MB)`);

  const extractDir = join(tmpdir(), `onnxruntime-extract-${Date.now()}`);
  log('  Extracting...');
  extract(archivePath, extractDir);

  // Archive contains a single top-level dir like onnxruntime-linux-x64-1.20.0/
  const entries = readdirSync(extractDir).filter(e => e !== '.' && e !== '..');
  const topDir = entries.length === 1 ? join(extractDir, entries[0]) : extractDir;

  const libSrc = join(topDir, 'lib', libName);
  if (!existsSync(libSrc)) {
    fail(`Could not find lib/${libName} in extracted archive`);
    rmSync(extractDir, { recursive: true, force: true });
    process.exit(1);
  }

  // NOTE: lib/libonnxruntime.so is a SYMLINK CHAIN (.so → .so.1 → .so.1.20.0)
  // inside the archive. Node's cpSync mis-handles chained symlinks, so we
  // resolve the chain ourselves and copy the real file with copyFileSync.
  const realSrc = realpathSync(libSrc);
  const realStat = statSync(realSrc);
  if (!realStat.isFile()) {
    fail(`Resolved ${libName} is not a regular file (got ${realSrc})`);
    rmSync(extractDir, { recursive: true, force: true });
    process.exit(1);
  }
  copyFileSync(realSrc, destLib);
  ok(`Copied ${libName} (${(statSync(destLib).size / 1024 / 1024).toFixed(1)} MB) → ${destLib}`);

  // Also copy provider helper libraries when present (harmless if absent)
  const libDir = join(topDir, 'lib');
  for (const extra of readdirSync(libDir)) {
    if (extra.includes('providers_shared')) {
      const extraSrc = join(libDir, extra);
      const extraReal = existsSync(extraSrc) ? realpathSync(extraSrc) : null;
      if (extraReal && statSync(extraReal).isFile()) {
        copyFileSync(extraReal, join(NATIVE_DIR, extra));
        ok(`Copied ${extra} → ${NATIVE_DIR}`);
      }
    }
  }

  // Ensure executable bit on Unix (loadable library)
  if (targetPlatform !== 'win') {
    try { chmodSync(destLib, 0o755); } catch { /* best effort */ }
  }

  // Cleanup
  try { rmSync(extractDir, { recursive: true, force: true }); } catch { /* best effort */ }
  try { rmSync(archivePath, { force: true }); } catch { /* best effort */ }

  log('\n=== Done! ===');
  log(`  ONNX Runtime saved to: ${NATIVE_DIR}`);
  log('  The Tauri build bundles bundled/native/**/* automatically.');
  if (targetPlatform === 'win') {
    log('  Windows note: if a clean install lacks the VC++ Runtime, also place');
    log('  msvcp140.dll / vcruntime140.dll into bundled/native/ (see docs).');
  }
  log('');
}

main().catch((err) => {
  fail(`Download failed: ${err.message}`);
  process.exit(1);
});
