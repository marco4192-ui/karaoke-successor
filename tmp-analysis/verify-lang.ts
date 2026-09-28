// Usage: bun run tmp-analysis/verify-lang.ts <lang>
// Read-only check: reports how many keys are still missing for a language
import { getTranslations } from '../src/lib/i18n/locales/index';
const lang = process.argv[2] as any;
if (!lang) { console.error('Usage: bun run tmp-analysis/verify-lang.ts <lang>'); process.exit(1); }
const tr = getTranslations();
if (!tr[lang]) { console.error(`Unknown language: ${lang}`); process.exit(1); }
const missing = Object.keys(tr.en).filter(k => !(k in tr[lang]));
console.log(`${lang}: ${Object.keys(tr[lang]).length} keys, ${missing.length} still missing`);
if (missing.length > 0) {
  const byPrefix: Record<string, number> = {};
  for (const k of missing) {
    const p = k.split('.').slice(0, 2).join('.');
    byPrefix[p] = (byPrefix[p] || 0) + 1;
  }
  for (const [p, c] of Object.entries(byPrefix).sort((a,b) => b[1]-a[1]).slice(0, 30)) console.log(`  ${p}: ${c}`);
  process.exit(2);
}
console.log('OK - complete parity with EN');
