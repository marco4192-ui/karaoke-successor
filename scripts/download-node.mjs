/**
 * download-node.mjs
 * Downloads a portable Node.js binary for bundling with Tauri
 * Supports Windows (x64 + arm64), macOS (x64 + arm64), Linux (x64)
 *
 * Usage: node scripts/download-node.mjs
 *   or:  node scripts/download-node.mjs --version 20.18.2
 *   or:  node scripts/download-node.mjs --version 22.14.0 --platform win --arch x64
 */

import { createWriteStream, existsSync, mkdirSync, chmodSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { platform, arch } from 'os';
import { get } from 'https';
import { createUnzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { createReadStream, createWriteStream as createWS } from 'fs';
import { tmpdir } from 'os';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const PORTABLE_NODE_DIR = join(ROOT, 'portable-node');

// Parse CLI args
const args = process.argv.slice(2);
let nodeVersion = '22.14.0'; // LTS
let targetPlatform = platform() === 'win32' ? 'win' : platform() === 'darwin' ? 'darwin' : 'linux';
let targetArch = arch() === 'x64' ? 'x64' : arch() === 'arm64' ? 'arm64' : 'x64';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--version' && args[i + 1]) nodeVersion = args[++i];
  if (args[i] === '--platform' && args[i + 1]) targetPlatform = args[++i];
  if (args[i] === '--arch' && args[i + 1]) targetArch = args[++i];
}

// Node.js download URLs
const PLATFORM_MAP = {
  win: {
    x64: `https://nodejs.org/dist/v${nodeVersion}/win-x64/node.exe`,
    arm64: `https://nodejs.org/dist/v${nodeVersion}/win-arm64/node.exe`,
  },
  darwin: {
    x64: `https://nodejs.org/dist/v${nodeVersion}/node-v${nodeVersion}-darwin-x64.tar.gz`,
    arm64: `https://nodejs.org/dist/v${nodeVersion}/node-v${nodeVersion}-darwin-arm64.tar.gz`,
  },
  linux: {
    x64: `https://nodejs.org/dist/v${nodeVersion}/node-v${nodeVersion}-linux-x64.tar.gz`,
    arm64: `https://nodejs.org/dist/v${nodeVersion}/node-v${nodeVersion}-linux-arm64.tar.gz`,
  },
};

function log(msg) { console.log(msg); }
function ok(msg) { console.log(`  [OK] ${msg}`); }
function warn(msg) { console.log(`  [WARN] ${msg}`); }
function fail(msg) { console.log(`  [FAIL] ${msg}`); }

function download(url, dest) {
  return new Promise((resolve, reject) => {
    log(`  Downloading: ${url}`);
    const file = createWriteStream(dest);
    get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        // Follow redirect
        download(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function main() {
  log(`\n=== Downloading Node.js v${nodeVersion} for ${targetPlatform}-${targetArch} ===\n`);

  const urlConfig = PLATFORM_MAP[targetPlatform]?.[targetArch];
  if (!urlConfig) {
    fail(`Unsupported platform/arch: ${targetPlatform}-${targetArch}`);
    process.exit(1);
  }

  mkdirSync(PORTABLE_NODE_DIR, { recursive: true });

  if (targetPlatform === 'win') {
    // Windows: just download node.exe directly
    const nodeExe = join(PORTABLE_NODE_DIR, 'node.exe');
    if (existsSync(nodeExe)) {
      warn(`node.exe already exists at ${nodeExe}`);
      warn('Delete it first to re-download');
      return;
    }

    await download(urlConfig, nodeExe);
    ok(`Downloaded node.exe → ${nodeExe}`);
    ok(`Size: ${(require('fs').statSync(nodeExe).size / 1024 / 1024).toFixed(1)} MB`);
  } else {
    // macOS/Linux: download tar.gz and extract bin/node
    const tarPath = join(tmpdir(), `node-v${nodeVersion}.tar.gz`);

    log(`  Downloading tarball...`);
    await download(urlConfig, tarPath);
    ok(`Downloaded to ${tarPath}`);

    log(`  Extracting...`);
    const extractDir = join(tmpdir(), `node-extract-${Date.now()}`);
    mkdirSync(extractDir, { recursive: true });

    try {
      execSync(`tar -xzf "${tarPath}" -C "${extractDir}"`, { stdio: 'inherit' });

      // Find the bin/node in extracted dir
      const entries = execSync(`ls "${extractDir}"`).toString().trim().split('\n');
      const nodeDir = entries[0]; // e.g. "node-v22.14.0-darwin-arm64"
      const srcNode = join(extractDir, nodeDir, 'bin', 'node');
      const dstNode = join(PORTABLE_NODE_DIR, 'bin', 'node');

      if (!existsSync(srcNode)) {
        fail(`Could not find bin/node in extracted archive`);
        process.exit(1);
      }

      mkdirSync(join(PORTABLE_NODE_DIR, 'bin'), { recursive: true });
      execSync(`cp "${srcNode}" "${dstNode}"`);
      chmodSync(dstNode, 0o755);
      ok(`Extracted node → ${dstNode}`);
    } finally {
      // Cleanup
      try { require('fs').unlinkSync(tarPath); } catch {}
      try { execSync(`rm -rf "${extractDir}"`); } catch {}
    }
  }

  log(`\n=== Done! ===`);
  log(`  Portable Node.js saved to: ${PORTABLE_NODE_DIR}`);
  log(`  Run "node scripts/prepare-bundle.mjs" to include it in the Tauri build.\n`);
}

main().catch((err) => {
  fail(`Download failed: ${err.message}`);
  process.exit(1);
});
