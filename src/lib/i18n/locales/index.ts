// Translation data for Karaoke ZERO
// All language translations are defined in separate files (en.ts, de.ts, etc.)
// The getTranslations() function lazily flattens them on first call,
// which avoids TDZ issues when webpack code-splits this module.

export type Language = 'en' | 'de' | 'es' | 'fr' | 'it' | 'pt' | 'ja' | 'ko' | 'zh' | 'ru' | 'nl' | 'pl' | 'sv' | 'no' | 'da' | 'fi';

export const ALL_LANGUAGES: readonly Language[] = [
  'en','de','es','fr','it','pt','ja','ko','zh','ru','nl','pl','sv','no','da','fi',
];

// Import translations from individual language files
import { enTranslations } from './en';
import { deTranslations } from './de';
import { esTranslations } from './es';
import { frTranslations } from './fr';
import { itTranslations } from './it';
import { ptTranslations } from './pt';
import { jaTranslations } from './ja';
import { koTranslations } from './ko';
import { zhTranslations } from './zh';
import { ruTranslations } from './ru';
import { nlTranslations } from './nl';
import { plTranslations } from './pl';
import { svTranslations } from './sv';
import { noTranslations } from './no';
import { daTranslations } from './da';
import { fiTranslations } from './fi';

// Helper to flatten nested object to dot-notation keys
export function flattenObject(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, newKey));
    } else if (typeof value === 'string') {
      result[newKey] = value;
    }
  }
  return result;
}

// Helper to create nested object from flat keys (for t.settings.title access)
export function createNestedObject(flatObj: Record<string, string>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(flatObj)) {
    const parts = key.split('.');
    let current: Record<string, unknown> = result;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[parts[i]] as Record<string, unknown>;
    }
    current[parts[parts.length - 1]] = value;
  }
  return result;
}

/**
 * Lazy-initialised translations map.
 * Uses `let` + null-guard instead of a top-level `const` so that
 * webpack can freely code-split this module without TDZ crashes:
 * the big object is built only on first *call*, not during module evaluation.
 */
let _cached: Record<Language, Record<string, string>> | null = null;

export function getTranslations(): Record<Language, Record<string, string>> {
  if (!_cached) {
    _cached = {
      en: flattenObject(enTranslations as unknown as Record<string, unknown>),
      de: flattenObject(deTranslations as unknown as Record<string, unknown>),
      es: flattenObject(esTranslations as unknown as Record<string, unknown>),
      fr: flattenObject(frTranslations as unknown as Record<string, unknown>),
      it: flattenObject(itTranslations as unknown as Record<string, unknown>),
      pt: flattenObject(ptTranslations as unknown as Record<string, unknown>),
      ja: flattenObject(jaTranslations as unknown as Record<string, unknown>),
      ko: flattenObject(koTranslations as unknown as Record<string, unknown>),
      zh: flattenObject(zhTranslations as unknown as Record<string, unknown>),
      ru: flattenObject(ruTranslations as unknown as Record<string, unknown>),
      nl: flattenObject(nlTranslations as unknown as Record<string, unknown>),
      pl: flattenObject(plTranslations as unknown as Record<string, unknown>),
      sv: flattenObject(svTranslations as unknown as Record<string, unknown>),
      no: flattenObject(noTranslations as unknown as Record<string, unknown>),
      da: flattenObject(daTranslations as unknown as Record<string, unknown>),
      fi: flattenObject(fiTranslations as unknown as Record<string, unknown>),
    };
  }
  return _cached;
}
