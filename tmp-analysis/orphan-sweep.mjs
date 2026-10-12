#!/usr/bin/env bun
/**
 * R64 — Systematischer Orphan-Sweep über src/.
 *
 * Build a REAL module graph: seed every legitimate entry point (app-router
 * convention files, ambient .d.ts, vitest tests + setup, root server.ts,
 * next.config.ts, vitest.config.ts, scripts/**, qa-test-song/**, esbuild
 * entry literals), then BFS over all import specifiers (@/ alias, relative,
 * dynamic import(), require, css @import/url()).
 *
 * A src file that is never reached = orphan (nothing in the live code,
 * tooling, tests or build scripts imports it).
 *
 * Output: reachability canaries, orphan buckets by provenance
 * (R62 bulk-add / hash-named auto-commits vs. intentional feature commits).
 * NO deletion here — analysis only; deletion is a separate reviewed step.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = '/home/z/my-project';
const SRC = path.join(ROOT, 'src');

const CODE_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.css']);
const isFile = (p) => { try { return fs.statSync(p).isFile(); } catch { return false; } };

function walk(dir, out = [], skip = new Set(['node_modules', '.next', '.git', 'bundled'])) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (skip.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out, skip);
    else out.push(p);
  }
  return out;
}

const srcFiles = walk(SRC);

// ─── 1. Roots: app-router conventions + assets + ambient + tests ───────────
const roots = new Set();
const CONV = new Set(['page.tsx', 'layout.tsx', 'template.tsx', 'loading.tsx', 'error.tsx',
  'global-error.tsx', 'not-found.tsx', 'route.ts', 'default.tsx', 'sitemap.ts', 'robots.ts',
  'manifest.ts', 'favicon.ico']);
const ASSET_EXT = new Set(['.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.woff', '.woff2', '.ttf', '.otf']);
for (const f of srcFiles) {
  const rel = path.relative(SRC, f);
  if (rel.startsWith(`app${path.sep}`)) {
    const name = path.basename(f);
    if (CONV.has(name) || /^(icon|apple-icon|opengraph-image|twitter-image)/.test(name) || ASSET_EXT.has(path.extname(f))) roots.add(f);
  }
  if (f.endsWith('.d.ts')) roots.add(f);               // ambient declarations
  if (rel.startsWith(`__tests__${path.sep}`)) roots.add(f); // vitest setup + tests
}
for (const s of ['middleware.ts', 'proxy.ts', 'instrumentation.ts', 'instrumentation-client.ts']) {
  const p = path.join(SRC, s);
  if (isFile(p)) roots.add(p);
}

// ─── 2. Roots: external importers (root configs, scripts, QA tools, tauri glue) ───
const extFiles = [
  ...walk(path.join(ROOT, 'scripts')),
  ...walk(path.join(ROOT, 'qa-test-song')),
  ...walk(path.join(ROOT, 'src-tauri')), // excludes bundled/
];
for (const n of ['server.ts', 'next.config.ts', 'vitest.config.ts', 'eslint.config.mjs', 'postcss.config.mjs', 'package.json', 'components.json']) {
  const p = path.join(ROOT, n);
  if (isFile(p)) extFiles.push(p);
}

// ─── 3. Import specifier extraction ────────────────────────────────────────
function extractSpecs(file) {
  const ext = path.extname(file);
  if (!CODE_EXT.has(ext)) return [];
  let content;
  try { content = fs.readFileSync(file, 'utf8'); } catch { return []; }
  const specs = new Set();
  const pats = [
    /from\s+['"]([^'"\n]+)['"]/g,          // import/export … from
    /import\s*\(\s*['"]([^'"\n]+)['"]\s*\)/g, // dynamic import()
    /\bimport\s+['"]([^'"\n]+)['"]/g,      // side-effect import
    /require\s*\(\s*['"]([^'"\n]+)['"]\s*\)/g,
  ];
  if (ext === '.css') pats.push(/@import\s+['"]([^'"\n]+)['"]/g, /url\(\s*['"]?([^'")\n]+)['"]?\s*\)/g);
  for (const re of pats) { let m; while ((m = re.exec(content))) specs.add(m[1]); }
  return [...specs];
}

// ─── 4. Resolution (bundler-style: ext candidates, then index.*) ───────────
const EXTS = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.css', '.json', '.svg', '.png'];
function resolveSpec(spec, importer) {
  spec = spec.split('?')[0].split('#')[0];
  let base = null;
  if (spec.startsWith('@/')) base = path.join(SRC, spec.slice(2));
  else if (spec.startsWith('~/')) base = path.join(SRC, spec.slice(2));
  else if (spec.startsWith('./') || spec.startsWith('../')) base = path.resolve(path.dirname(importer), spec);
  else return null; // bare module / public URL
  for (const e of EXTS) { const c = base + e; if (isFile(c)) return c; }
  for (const e of ['.ts', '.tsx', '.js', '.jsx']) { const c = path.join(base, 'index' + e); if (isFile(c)) return c; }
  return null;
}

// ─── 5. Literal src/ path references in build tooling (esbuild entries …) ──
const literalSeeds = new Set();
for (const f of extFiles) {
  const ext = path.extname(f);
  if (!CODE_EXT.has(ext) && ext !== '.json') continue;
  let content = '';
  try { content = fs.readFileSync(f, 'utf8'); } catch { continue; }
  const re = /(?:^|[^\w.\/])(src\/[A-Za-z0-9_\-./]+(?:\.[A-Za-z0-9]+)?)/g;
  let m;
  while ((m = re.exec(content))) {
    const p = path.join(ROOT, m[1]);
    for (const c of [p, p + '.ts', p + '.tsx', p + '.js']) if (isFile(c)) literalSeeds.add(c);
  }
}

// ─── 6. BFS reachability ────────────────────────────────────────────────────
const queue = [...roots, ...extFiles.filter((f) => CODE_EXT.has(path.extname(f)) || path.extname(f) === '.json'), ...literalSeeds];
const visited = new Set(queue);
while (queue.length) {
  const f = queue.pop();
  for (const spec of extractSpecs(f)) {
    const r = resolveSpec(spec, f);
    if (r && r.startsWith(SRC + path.sep) && !visited.has(r)) { visited.add(r); queue.push(r); }
  }
}

// ─── 7. Orphans ─────────────────────────────────────────────────────────────
const orphans = srcFiles.filter((f) => !visited.has(f));

// ─── 8. Provenance (which commit added each file?) ─────────────────────────
const addSubjects = new Map();
{
  const out = execSync('git log --diff-filter=A --format="COMMIT %s" --name-only -- src/', { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
  let subj = '';
  for (const line of out.split('\n')) {
    if (line.startsWith('COMMIT ')) subj = line.slice(7);
    else if (line.trim()) {
      const f = path.join(ROOT, line.trim());
      if (!addSubjects.has(f)) addSubjects.set(f, []);
      addSubjects.get(f).push(subj);
    }
  }
}
const suspiciousProvenance = (f) => (addSubjects.get(f) ?? []).some((s) => s.startsWith('R62:') || /^[0-9a-f]{8}-/.test(s));

// ─── 9. Report ──────────────────────────────────────────────────────────────
const rel = (f) => path.relative(ROOT, f);
const canaries = [
  'src/components/game/battle-royale/playing-view.tsx',
  'src/hooks/use-battle-royale-game.ts',
  'src/lib/socketio-server.ts',
  'src/lib/server/https-domain.ts',
  'src/lib/db.ts',
  'src/lib/i18n/locales/index.ts',
  'src/lib/i18n/translations.ts',
  'src/lib/game/battle-royale.ts',
  'src/lib/game/party-store.ts',
];
console.log('══ Canaries (must ALL be reachable — otherwise the analysis is broken) ══');
let canaryFail = 0;
for (const c of canaries) {
  const p = path.join(ROOT, c);
  const ok = visited.has(p);
  if (!ok) canaryFail++;
  console.log(`  ${ok ? '✓ LIVE ' : '✗ DEAD '} ${c}`);
}
// jukebox & daily-challenge: at least one implementation each must be live
const jukeboxLive = [...visited].filter((f) => rel(f).includes('jukebox'));
const dcLive = [...visited].filter((f) => rel(f).startsWith('src/lib/game/daily-challenge'));
console.log(`  ✓ live jukebox files: ${jukeboxLive.length}  | live daily-challenge files: ${dcLive.length}`);

console.log(`\n══ Summary ══`);
console.log(`  src files total: ${srcFiles.length}`);
console.log(`  reachable:      ${srcFiles.length - orphans.length}`);
console.log(`  orphans:        ${orphans.length}`);
console.log(`  roots seeded:   ${roots.size}, external importers: ${extFiles.length}, literal seeds: ${literalSeeds.size}`);
console.log(`  CANARY FAILURES: ${canaryFail}`);

// Buckets
const inApp = (f) => rel(f).startsWith('src/app/');
const isCode = (f) => CODE_EXT.has(path.extname(f));
const bucket = { r62: [], auto: [], other: [], keep: [] };
for (const f of orphans) {
  const subj = (addSubjects.get(f) ?? []).join(' | ') || '(pre-git / unknown)';
  const entry = `${rel(f)}\n      added by: ${subj.slice(0, 110)}`;
  if (inApp(f) || !isCode(f) || f.endsWith('.d.ts')) bucket.keep.push(entry);
  else if ((addSubjects.get(f) ?? []).some((s) => s.startsWith('R62:'))) bucket.r62.push(entry);
  else if ((addSubjects.get(f) ?? []).some((s) => /^[0-9a-f]{8}-/.test(s))) bucket.auto.push(entry);
  else bucket.other.push(entry);
}
console.log(`\n══ Bucket R62-BULK (delete candidates, ${bucket.r62.length}) ══`);
bucket.r62.forEach((e) => console.log('  ' + e));
console.log(`\n══ Bucket AUTO-COMMIT (delete candidates, ${bucket.auto.length}) ══`);
bucket.auto.forEach((e) => console.log('  ' + e));
console.log(`\n══ Bucket OLDER COMMITS (review manually — ${bucket.other.length}) ══`);
bucket.other.forEach((e) => console.log('  ' + e));
console.log(`\n══ Protected (non-code / pending-keys — keep, ${bucket.keep.length}) ══`);
bucket.keep.forEach((e) => console.log('  ' + e.split('\n')[0]));

// ─── 10. Final deletable set + belt-and-suspenders import check ────────────
// Deletable = orphan code files (convention files, assets, .d.ts, tests are
// all seeded roots and can never be orphans; pending-keys JSON is non-code).
const deletable = orphans.filter((f) => CODE_EXT.has(path.extname(f)) && !f.endsWith('.d.ts'));

// Fast single pass: collect the last path segment of EVERY quoted string in
// live code (superset of import specifiers — catches patterns the BFS
// extractor might have missed, plus string-path references in configs).
const segments = new Map(); // segment → example strings
for (const [lf, content] of liveCodeEntries()) {
  const re = /['"]([^'"\n]{2,120})['"]/g;
  let m;
  while ((m = re.exec(content))) {
    const s = m[1].split('?')[0].split('#')[0];
    if (!s.includes('/') && !s.startsWith('.')) continue;
    const last = s.split('/').pop() || '';
    const seg = last.replace(/\.(ts|tsx|js|jsx|mjs|cjs|css|json)$/, '');
    if (!seg || seg.length < 3) continue;
    if (!segments.has(seg)) segments.set(seg, []);
    const arr = segments.get(seg);
    if (arr.length < 3 && !arr.includes(m[1])) arr.push(m[1]);
  }
}
function* liveCodeEntries() {
  for (const f of visited) {
    if (!CODE_EXT.has(path.extname(f))) continue;
    let c; try { c = fs.readFileSync(f, 'utf8'); } catch { continue; }
    yield [f, c];
  }
  for (const f of extFiles) {
    if (!CODE_EXT.has(path.extname(f))) continue;
    if (visited.has(f)) continue;
    let c; try { c = fs.readFileSync(f, 'utf8'); } catch { continue; }
    yield [f, c];
  }
}

console.log(`\n══ Quoted-segment hits in LIVE code (expect none / false alarms only) ══`);
let flagged = 0;
for (const f of deletable) {
  const base = path.basename(f).replace(/\.(ts|tsx|js|jsx|mjs|cjs|css)$/, '');
  if (segments.has(base)) {
    flagged++;
    console.log(`  ⚠ ${rel(f)}  ← live code quotes segment "${base}": ${JSON.stringify(segments.get(base))}`);
  }
}
console.log(`  flagged: ${flagged}`);

// Dump the deletion list
fs.writeFileSync(path.join(ROOT, 'tmp-analysis', 'orphans-delete.txt'),
  deletable.map((f) => rel(f)).sort().join('\n') + '\n');
console.log(`\n══ Deletable: ${deletable.length} files → tmp-analysis/orphans-delete.txt ══`);
