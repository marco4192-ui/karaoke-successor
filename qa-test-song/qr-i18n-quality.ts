// QA-Skript: Übersetzungsqualität — Platzhalter-Konsistenz + EN-Leak-Check
import { readFileSync } from 'fs';
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

function placeholders(s: string): string[] {
  return (s.match(/\{[a-zA-Z0-9]+\}/g) || []).sort();
}

let totalIssues = 0;
for (const [lang, data] of Object.entries(locales)) {
  const flat = flattenObject(data as Record<string, unknown>);
  const issues: string[] = [];
  for (const [key, enVal] of Object.entries(enFlat)) {
    const locVal = flat[key];
    if (!locVal) continue;
    const phEn = placeholders(enVal);
    const phLoc = placeholders(locVal);
    if (phEn.join(',') !== phLoc.join(',')) {
      issues.push(`  ${key}: EN [${phEn.join(',')}] vs ${lang} [${phLoc.join(',')}] → "${String(locVal).slice(0, 70)}"`);
    }
  }
  if (issues.length) {
    console.log(`\n### ${lang}: ${issues.length} Platzhalter-Probleme`);
    issues.slice(0, 12).forEach((i) => console.log(i));
    totalIssues += issues.length;
  }
}
console.log(`\nGESAMT: ${totalIssues} Platzhalter-Probleme`);

// EN-Leak-Check: deutsche Umlaute in nicht-deutschen Locales (Hinweis auf Copy-Paste)
console.log('\n=== Umlaute/ß in Nicht-DE-Locales (verdächtig) ===');
for (const [lang, data] of Object.entries(locales)) {
  const flat = flattenObject(data as Record<string, unknown>);
  const umlauts = Object.entries(flat).filter(([, v]) => /[äöüßÄÖÜ]/.test(String(v))).slice(0, 3);
  if (umlauts.length) {
    console.log(`${lang}: ${umlauts.length}+ Keys mit Umlauten, z.B. ${umlauts[0][0]} = "${String(umlauts[0][1]).slice(0, 60)}"`);
  }
}
