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
 * SOURCE (R73): the official NuGet base package «Microsoft.ML.OnnxRuntime».
 * Microsoft REMOVED the OS binaries from the onnxruntime GitHub release
 * assets (the URLs that worked on Oct 15 2026 answer HTTP 404 since Nov 18
 * 2026 — verified from GitHub's own CI runners, for win-x64/osx-* alike).
 * The NuGet package is the official distribution channel and ships ALL
 * platforms as plain ZIP members (runtimes/<rid>/native/*).
 *
 * VERSION 1.23.2 — the LAST version with macOS Intel (x86_64) binaries.
 * ONNX Runtime 1.24+ dropped osx-x64 (consistent across NuGet, PyPI and
 * the pyke CDN). ABI: our `ort` 2.0.0-rc.12 requests C-API version 17
 * (ONNX ≥ 1.14) by default, which 1.23.2 (API 23) satisfies comfortably.
 *
 * Usage: node scripts/download-onnxruntime.mjs
 *   or:  node scripts/download-onnxruntime.mjs --version 1.23.2
 *   or:  node scripts/download-onnxruntime.mjs --platform linux --arch arm64
 *   or:  node scripts/download-onnxruntime.mjs --arch universal2   (macOS fat binary)
 *
 * `--arch universal2` (macOS only): extracts BOTH macOS slices from the
 * SAME NuGet package (osx-x64 + osx-arm64) and merges them with `lipo`
 * into one fat dylib — the same pattern the workflow uses for the Node.js
 * universal binary. Requires macOS (lipo ships with the Xcode Command
 * Line Tools), which is guaranteed on the macOS runner.
 *
 * Cross-platform: run this ON the target OS right before
 * `node scripts/download-node.mjs` + `bun run tauri:build`.
 */

import { existsSync, mkdirSync, chmodSync, statSync, rmSync, readFileSync, writeFileSync, createWriteStream, copyFileSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { platform, arch, tmpdir } from 'os';
import { get } from 'https';
import { execSync } from 'child_process';
import { inflateRawSync } from 'zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const NATIVE_DIR = join(ROOT, 'src-tauri', 'bundled', 'native');

// Parse CLI args
const args = process.argv.slice(2);
let ortVersion = '1.23.2';
let targetPlatform = platform() === 'win32' ? 'win' : platform() === 'darwin' ? 'osx' : 'linux';
let targetArch = arch() === 'x64' ? 'x64' : arch() === 'arm64' ? 'arm64' : 'x64';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--version' && args[i + 1]) ortVersion = args[++i];
  if (args[i] === '--platform' && args[i + 1]) targetPlatform = args[++i];
  if (args[i] === '--arch' && args[i + 1]) targetArch = args[++i];
}

// Official NuGet distribution (exact casing matters — some proxies are
// case-sensitive even though the NuGet spec says IDs are case-insensitive).
const NUGET_URL = `https://www.nuget.org/api/v2/package/Microsoft.ML.OnnxRuntime/${ortVersion}`;

// NuGet package member paths per platform/arch (runtimes/<rid>/native/<lib>)
const RID_DIR = {
  win:   { x64: 'runtimes/win-x64/native/',   arm64: 'runtimes/win-arm64/native/' },
  osx:   { x64: 'runtimes/osx-x64/native/',   arm64: 'runtimes/osx-arm64/native/' },
  linux: { x64: 'runtimes/linux-x64/native/', arm64: 'runtimes/linux-arm64/native/' },
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
function fail(msg) { console.error(`  [FAIL] ${msg}`); }

function download(url, dest, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 8) { reject(new Error('Too many redirects')); return; }
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

/**
 * Minimal SELECTIVE zip extractor — no external tools or dependencies
 * (works identically on Windows/macOS/Linux runners).
 *
 * Reads the central directory, inflates only wanted members with
 * zlib.inflateRawSync (Node builtin). Sizes are taken from the CENTRAL
 * directory (authoritative even when local headers use data descriptors).
 * Supports method 0 (stored) and 8 (deflate); rejects zip64 (>4 GB), which
 * NuGet packages never use for these members.
 *
 * Extracted files are written to outDir under a flattened name
 * ('runtimes/osx-x64/native/libonnxruntime.dylib' →
 *  'runtimes__osx-x64__native__libonnxruntime.dylib') so members with the
 * SAME basename (like the two macOS slices) never collide.
 *
 * @param {string} zipPath path to the .nupkg (zip) file
 * @param {(name: string) => boolean} wanted predicate selecting members
 * @param {string} outDir existing directory to write extracted files into
 * @returns {Array<{member: string, path: string, size: number}>}
 */
function extractZipMembers(zipPath, wanted, outDir) {
  const buf = readFileSync(zipPath);

  // 1. Locate End of Central Directory record (scan back over the comment)
  const scanFrom = Math.max(0, buf.length - 65557);
  let eocd = -1;
  for (let i = buf.length - 22; i >= scanFrom; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('ZIP: End of Central Directory not found (not a zip file?)');

  const entryCount = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);

  // 2. Walk the central directory, collect wanted members
  const found = [];
  for (let e = 0; e < entryCount; e++) {
    if (buf.readUInt32LE(off) !== 0x02014b50) throw new Error('ZIP: bad central directory entry');
    const method = buf.readUInt16LE(off + 10);
    const compSize = buf.readUInt32LE(off + 20);
    const uncompSize = buf.readUInt32LE(off + 24);
    const nameLen = buf.readUInt16LE(off + 28);
    const extraLen = buf.readUInt16LE(off + 30);
    const commentLen = buf.readUInt16LE(off + 32);
    const localOff = buf.readUInt32LE(off + 42);
    const name = buf.toString('utf8', off + 46, off + 46 + nameLen);
    if (wanted(name) && !name.endsWith('/')) {
      found.push({ name, method, compSize, uncompSize, localOff });
    }
    off += 46 + nameLen + extraLen + commentLen;
  }

  // 3. Extract each wanted member
  const extracted = [];
  for (const m of found) {
    if (buf.readUInt32LE(m.localOff) !== 0x04034b50) throw new Error(`ZIP: bad local header for ${m.name}`);
    if (m.method !== 0 && m.method !== 8) throw new Error(`ZIP: unsupported compression method ${m.method} for ${m.name}`);
    const lNameLen = buf.readUInt16LE(m.localOff + 26);
    const lExtraLen = buf.readUInt16LE(m.localOff + 28);
    const dataStart = m.localOff + 30 + lNameLen + lExtraLen;
    const comp = buf.subarray(dataStart, dataStart + m.compSize);
    const data = m.method === 0 ? Buffer.from(comp) : inflateRawSync(comp);
    if (data.length !== m.uncompSize) throw new Error(`ZIP: size mismatch for ${m.name} (got ${data.length}, expected ${m.uncompSize})`);
    const flatName = m.name.split('/').join('__');
    const outPath = join(outDir, flatName);
    writeFileSync(outPath, data);
    extracted.push({ member: m.name, path: outPath, size: data.length });
  }
  return extracted;
}

async function main() {
  const isUniversal = targetArch === 'universal2';

  // universal2 = macOS fat binary: needs both osx slices + lipo.
  if (isUniversal) {
    if (targetPlatform !== 'osx') {
      fail(`--arch universal2 is macOS-only (got --platform ${targetPlatform}) —`);
      fail('it extracts the osx-x64 and osx-arm64 slices and merges them with lipo.');
      process.exit(1);
    }
    if (platform() !== 'darwin') {
      fail(`--arch universal2 merges both macOS archs with lipo and must run ON macOS (current: ${platform()}).`);
      fail('The CI macOS runner satisfies this automatically — see .github/workflows/build-executables.yml');
      process.exit(1);
    }
    try {
      execSync('command -v lipo', { stdio: 'pipe' });
    } catch {
      fail('lipo not found — install the Xcode Command Line Tools (xcode-select --install).');
      process.exit(1);
    }
  }

  const ridDir = RID_DIR[targetPlatform]?.[targetArch];
  if (!ridDir && !isUniversal) {
    fail(`Unsupported platform/arch: ${targetPlatform}-${targetArch}`);
    process.exit(1);
  }

  log(`\n=== Downloading ONNX Runtime v${ortVersion} (NuGet) for ${targetPlatform}-${targetArch}` +
      `${isUniversal ? ' (osx-x64 + osx-arm64 → lipo fat binary)' : ''} ===\n`);

  const libName = LIB_NAME[targetPlatform];
  mkdirSync(NATIVE_DIR, { recursive: true });

  // Already downloaded?
  const destLib = join(NATIVE_DIR, libName);
  if (existsSync(destLib)) {
    warn(`${libName} already exists at ${destLib}`);
    warn('Delete it first to re-download');
    return;
  }

  // Download the NuGet package once (contains ALL platforms)
  const nupkgPath = join(tmpdir(), `microsoft.ml.onnxruntime.${ortVersion}.nupkg`);
  await download(NUGET_URL, nupkgPath);
  ok(`Downloaded nupkg (${(statSync(nupkgPath).size / 1024 / 1024).toFixed(1)} MB)`);

  const extractDir = join(tmpdir(), `onnxruntime-extract-${Date.now()}`);
  mkdirSync(extractDir, { recursive: true });

  try {
    if (isUniversal) {
      // Extract BOTH macOS slices from the same package, then lipo-merge.
      // Flattened names keep the two same-named dylibs apart (see extractor).
      const x64Member = `runtimes/osx-x64/native/${libName}`;
      const arm64Member = `runtimes/osx-arm64/native/${libName}`;
      const slices = extractZipMembers(
        nupkgPath,
        (name) => name === x64Member || name === arm64Member,
        extractDir
      );
      const byMember = new Map(slices.map(s => [s.member, s.path]));
      const x64Path = byMember.get(x64Member);
      const arm64Path = byMember.get(arm64Member);
      if (!x64Path || !arm64Path) {
        throw new Error(`NuGet package does not contain both macOS slices (osx-x64: ${!!x64Path}, osx-arm64: ${!!arm64Path}) — ` +
          `ONNX Runtime ${ortVersion} may have dropped macOS Intel; 1.23.2 is the last version with osx-x64`);
      }
      log('  lipo -create (x86_64 + arm64) …');
      execSync(`lipo -create "${x64Path}" "${arm64Path}" -output "${destLib}"`, { stdio: 'inherit' });
      const info = execSync(`lipo -info "${destLib}"`).toString().trim();
      ok(`lipo: ${info}`);
      if (!/x86_64/.test(info) || !/arm64/.test(info)) {
        throw new Error(`lipo result does not contain both architectures: ${info}`);
      }
    } else {
      // Single arch: extract the main library + provider helpers if present.
      const mainMember = `${ridDir}${libName}`;
      const extracted = extractZipMembers(
        nupkgPath,
        // providers_shared runtime helpers yes — but NOT the .lib import
        // libraries (link-time artifacts, useless for ort load-dynamic).
        (name) => name === mainMember || (name.startsWith(ridDir) && name.includes('providers_shared') && !name.endsWith('.lib')),
        extractDir
      );
      const main = extracted.find(x => x.member === mainMember);
      if (!main) {
        throw new Error(`NuGet package does not contain ${mainMember} — wrong version (${ortVersion}) or platform unsupported`);
      }
      copyFileSync(main.path, destLib);
      for (const extra of extracted) {
        if (extra === main) continue;
        const extraName = extra.member.split('/').pop();
        copyFileSync(extra.path, join(NATIVE_DIR, extraName));
        ok(`Copied ${extraName} → ${NATIVE_DIR}`);
      }
    }
    ok(`Saved ${libName} (${(statSync(destLib).size / 1024 / 1024).toFixed(1)} MB) → ${destLib}`);

    // Ensure executable bit on Unix (loadable library)
    if (targetPlatform !== 'win') {
      try { chmodSync(destLib, 0o755); } catch { /* best effort */ }
    }
  } finally {
    // Cleanup — best effort, never mask the original error
    try { rmSync(extractDir, { recursive: true, force: true }); } catch { /* best effort */ }
    try { rmSync(nupkgPath, { force: true }); } catch { /* best effort */ }
  }

  log('\n=== Done! ===');
  log(`  ONNX Runtime ${ortVersion} saved to: ${NATIVE_DIR}`);
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
