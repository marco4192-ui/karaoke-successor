// QA-Skript: Reverse-Check — welche t()-Keys werden benutzt, aber sind NICHT definiert?
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { enTranslations } from '@/lib/i18n/locales/en';
import { flattenObject } from '@/lib/i18n/locales';

const enFlat = flattenObject(enTranslations as Record<string, unknown>);

const srcRoot = '/home/z/my-project/src';
const usedKeys = new Map<string, string[]>(); // key -> files

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (/\.(tsx?|ts)$/.test(e)) out.push(p);
  }
  return out;
}

const files = walk(srcRoot);
// Patterns: t('key'), t("key"), tOr(t,'key', ...), t(`key`), .t('key')
const keyRe = /(?:\btOr\s*\(\s*t\s*,|\bt\s*\()\s*['"]([a-zA-Z0-9_.\-]+)['"]/g;

for (const f of files) {
  const content = readFileSync(f, 'utf8');
  let m: RegExpExecArray | null;
  keyRe.lastIndex = 0;
  while ((m = keyRe.exec(content)) !== null) {
    const key = m[1];
    // Filter: echte i18n-Keys haben einen Punkt + bekannte Domain-Prefixe
    if (!key.includes('.')) continue;
    if (!usedKeys.has(key)) usedKeys.set(key, []);
    usedKeys.get(key)!.push(f.replace(srcRoot + '/', ''));
  }
}

const missing = [...usedKeys.entries()].filter(([k]) => !(k in enFlat));
console.log(`Benutzte Keys mit Punkt: ${usedKeys.size}`);
console.log(`Davon NICHT in EN definiert: ${missing.length}\n`);
for (const [key, files_] of missing.sort((a, b) => a[0].localeCompare(b[0]))) {
  console.log(`✗ ${key}`);
  console.log(`   → ${[...new Set(files_)].slice(0, 3).join(', ')}`);
}

// Zusätzlich: definierte EN-Keys, die nirgends benutzt werden (tote Keys) — nur Statistik
const used = new Set(usedKeys.keys());
const dead = Object.keys(enFlat).filter((k) => !used.has(k));
console.log(`\nDefinierte, aber nie via t() benutzte EN-Keys: ${dead.length} (Info, manche via t-Objekt-Zugriff)`);
