// Usage: bun run tmp-analysis/verify-placeholders.ts
// Read-only check: compares ICU-style placeholder names ({name}, {{count}}, %s)
// between every language and EN for every shared key.
// A placeholder mismatch means the runtime will render a raw {token} or drop a value.
import { getTranslations } from '../src/lib/i18n/locales/index';

const LANGS = ['de','es','fr','it','pt','ja','ko','zh','ru','nl','pl','sv','no','da','fi'] as const;

// Extract placeholder tokens: {{name}} (i18next default), {name} (custom), %s/%d
function extractPlaceholders(value: string): string[] {
  const tokens: string[] = [];
  // double-brace first
  const double = value.match(/\{\{\s*([\w.]+)\s*\}\}/g) || [];
  for (const m of double) tokens.push(m.replace(/\{\{\s*|\s*\}\}/g, ''));
  // single-brace (not part of double)
  const single = value.replace(/\{\{\s*[\w.]+\s*\}\}/g, '').match(/\{\s*([\w.]+)\s*\}/g) || [];
  for (const m of single) tokens.push(m.replace(/\{\s*|\s*\}/g, ''));
  // printf style
  if (/%[sd]/.test(value)) tokens.push('%x');
  return tokens.sort();
}

const tr = getTranslations();
let totalIssues = 0;

for (const lang of LANGS) {
  const issues: string[] = [];
  const langTr = tr[lang];
  for (const [key, enValue] of Object.entries(tr.en)) {
    const langValue = langTr[key];
    if (typeof langValue !== 'string' || typeof enValue !== 'string') continue;
    const enPh = extractPlaceholders(enValue);
    const langPh = extractPlaceholders(langValue);
    if (enPh.length === 0 && langPh.length === 0) continue;
    const same = enPh.length === langPh.length && enPh.every((p, i) => p === langPh[i]);
    if (!same) {
      issues.push(
        `  ${key}\n    EN:   ${JSON.stringify(enValue)} [${enPh.join(', ') || '-'}]\n    ${lang.toUpperCase()}: ${JSON.stringify(langValue)} [${langPh.join(', ') || '-'}]`
      );
    }
  }
  if (issues.length > 0) {
    console.log(`\n=== ${lang.toUpperCase()}: ${issues.length} placeholder mismatches ===`);
    for (const i of issues) console.log(i);
    totalIssues += issues.length;
  } else {
    console.log(`${lang.toUpperCase()}: OK`);
  }
}

console.log(`\nTOTAL: ${totalIssues} mismatches across ${LANGS.length} languages`);
process.exit(totalIssues > 0 ? 2 : 0);
