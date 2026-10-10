import { getTranslations } from '../src/lib/i18n/locales/index';

const translations = getTranslations();
const langs = Object.keys(translations) as (keyof typeof translations)[];
const enKeys = new Set(Object.keys(translations.en));

console.log('=== Missing keys per language (vs EN base) ===');
for (const lang of langs) {
  if (lang === 'en') continue;
  const langKeys = new Set(Object.keys(translations[lang]));
  const missing = [...enKeys].filter(k => !langKeys.has(k));
  const identical = [...enKeys].filter(k => langKeys.has(k) && translations[lang][k] === translations.en[k]);
  console.log(`\n${lang.toUpperCase()}: ${langKeys.size} keys | MISSING: ${missing.length} | IDENTICAL-TO-EN: ${identical.length}`);
  if (missing.length > 0) {
    const byPrefix: Record<string, number> = {};
    for (const k of missing) {
      const prefix = k.split('.').slice(0, 2).join('.');
      byPrefix[prefix] = (byPrefix[prefix] || 0) + 1;
    }
    const sorted = Object.entries(byPrefix).sort((a,b) => b[1]-a[1]).slice(0, 25);
    for (const [prefix, count] of sorted) console.log(`   MISSING ${prefix}: ${count}`);
  }
}
console.log('\nEN total keys:', enKeys.size);
