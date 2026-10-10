// QA-Skript: i18n-Deckungsanalyse — welche EN-Keys fehlen in welcher Sprache?
import { enTranslations } from '@/lib/i18n/locales/en';
import { deTranslations } from '@/lib/i18n/locales/de';
import { esTranslations } from '@/lib/i18n/locales/es';
import { frTranslations } from '@/lib/i18n/locales/fr';
import { itTranslations } from '@/lib/i18n/locales/it';
import { ptTranslations } from '@/lib/i18n/locales/pt';
import { jaTranslations } from '@/lib/i18n/locales/ja';
import { koTranslations } from '@/lib/i18n/locales/ko';
import { zhTranslations } from '@/lib/i18n/locales/zh';
import { ruTranslations } from '@/lib/i18n/locales/ru';
import { nlTranslations } from '@/lib/i18n/locales/nl';
import { plTranslations } from '@/lib/i18n/locales/pl';
import { svTranslations } from '@/lib/i18n/locales/sv';
import { noTranslations } from '@/lib/i18n/locales/no';
import { daTranslations } from '@/lib/i18n/locales/da';
import { fiTranslations } from '@/lib/i18n/locales/fi';
import { flattenObject } from '@/lib/i18n/locales';

const locales: Record<string, Record<string, unknown>> = {
  de: deTranslations, es: esTranslations, fr: frTranslations, it: itTranslations,
  pt: ptTranslations, ja: jaTranslations, ko: koTranslations, zh: zhTranslations,
  ru: ruTranslations, nl: nlTranslations, pl: plTranslations, sv: svTranslations,
  no: noTranslations, da: daTranslations, fi: fiTranslations,
};

const enFlat = flattenObject(enTranslations as Record<string, unknown>);
const enKeys = Object.keys(enFlat);
console.log(`EN total keys: ${enKeys.length}\n`);

const results: Array<{ lang: string; missing: number; pct: string; missingKeys: string[] }> = [];
for (const [lang, data] of Object.entries(locales)) {
  const flat = flattenObject(data as Record<string, unknown>);
  const missing = enKeys.filter((k) => !flat[k]);
  results.push({
    lang,
    missing: missing.length,
    pct: ((1 - missing.length / enKeys.length) * 100).toFixed(1),
    missingKeys: missing,
  });
}
results.sort((a, b) => b.missing - a.missing);
for (const r of results) {
  console.log(`${r.lang}: ${r.missing} fehlend (${r.pct}% abgedeckt)`);
}

// Domain-Breakdown für die schlechteste Sprache + welche Domains betroffen sind
console.log('\n=== Domain-Breakdown der fehlenden Keys (aggregiert über alle Sprachen) ===');
const domainCount: Record<string, number> = {};
for (const r of results) {
  for (const k of r.missingKeys) {
    const dom = k.split('.')[0];
    domainCount[dom] = (domainCount[dom] || 0) + 1;
  }
}
const sorted = Object.entries(domainCount).sort((a, b) => b[1] - a[1]);
for (const [dom, cnt] of sorted) {
  console.log(`${dom}: ${cnt} (across 14 locales → Ø ${(cnt / 14).toFixed(1)}/Locale)`);
}

// Beispiel: die 30 fehlenden Keys für fr (eine repräsentative Sprache)
const fr = results.find((r) => r.lang === 'fr')!;
console.log(`\n=== fr: ${fr.missing} fehlende Keys (alle) ===`);
console.log(fr.missingKeys.join('\n'));
