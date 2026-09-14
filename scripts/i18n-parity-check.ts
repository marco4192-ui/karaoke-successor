// Temporary i18n key-parity checker: en (reference) vs all locales
// Usage: bun scripts/i18n-parity-check.ts
import { promises as fs } from 'fs';
import path from 'path';

const LOCALES_DIR = 'src/lib/i18n/locales';
const FILES = ['profile.ts', 'game.ts', 'mobile.ts'] as const;
const REF = 'en';

async function importLocale(locale: string, file: string): Promise<Record<string, unknown>> {
  const mod = await import(path.resolve(LOCALES_DIR, locale, file));
  // default export or named export matching the file name
  const val = mod.default ?? Object.values(mod)[0];
  return val as Record<string, unknown>;
}

function flatten(obj: unknown, prefix = ''): string[] {
  const keys: string[] = [];
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    return keys.push(prefix) ? keys : keys; // leaf (value)
  }
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...flatten(v, key));
    } else {
      keys.push(key);
    }
  }
  return keys;
}

const locales = (await fs.readdir(LOCALES_DIR)).filter(
  (d) => d !== REF && !d.includes('.'),
);

const report: Record<string, Record<string, { missing: string[]; extra: string[] }>> = {};

for (const file of FILES) {
  const refKeys = new Set(flatten(await importLocale(REF, file)));
  for (const locale of locales) {
    let locObj: Record<string, unknown>;
    try {
      locObj = await importLocale(locale, file);
    } catch {
      report[locale] = report[locale] ?? {};
      report[locale][file] = { missing: ['<IMPORT ERROR>'], extra: [] };
      continue;
    }
    const locKeys = new Set(flatten(locObj));
    const missing = [...refKeys].filter((k) => !locKeys.has(k));
    const extra = [...locKeys].filter((k) => !refKeys.has(k));
    report[locale] = report[locale] ?? {};
    report[locale][file] = { missing, extra };
  }
}

let totalMissing = 0;
for (const [locale, files] of Object.entries(report)) {
  for (const [file, { missing, extra }] of Object.entries(files)) {
    if (missing.length === 0 && extra.length === 0) continue;
    totalMissing += missing.length;
    console.log(`\n[${locale}/${file}] missing: ${missing.length}, extra: ${extra.length}`);
    for (const m of missing) console.log(`  - ${m}`);
    for (const e of extra) console.log(`  + (extra) ${e}`);
  }
}
console.log(`\n=== TOTAL MISSING: ${totalMissing} ===`);
