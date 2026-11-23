// Translation data for AfterTen Karaoke
// Each language has its own directory with domain-based sub-files:
//   locales/en/index.ts   (barrel file — imports and merges sub-files)
//   locales/en/core.ts    (nav, home, common, queue, jukebox, ...)
//   locales/en/library.ts (library, song, imports, editor)
//   locales/en/game.ts    (game, results, highscore, mic, webcam)
//   locales/en/settings.ts(settings, settingsTabs, settingsGameplay, ...)
//   locales/en/party.ts   (party, battleRoyale, cptm, passTheMic, ...)
//   locales/en/medleyTournament.ts (medley, tournament, rateMySong)
//   locales/en/profile.ts (profile, achievements, character, badges)
//   locales/en/mobile.ts  (mobile, companion, multiplayer, daily, ...)
//   locales/en/tutorial.ts (tutorials)
//
// R97b: DYNAMIC LANGUAGE LOADING. Only EN (the fallback) is imported
// statically — every other language is a separate async chunk loaded via
// ensureLanguageLoaded(). This keeps the initial client bundle small
// (~1/16th of the former i18n payload). The app boot gate in page.tsx
// preloads the stored UI language before mounting, so users never see an
// English flash.

export type Language = 'en' | 'de' | 'es' | 'fr' | 'it' | 'pt' | 'ja' | 'ko' | 'zh' | 'ru' | 'nl' | 'pl' | 'sv' | 'no' | 'da' | 'fi';

export const ALL_LANGUAGES: readonly Language[] = [
  'en','de','es','fr','it','pt','ja','ko','zh','ru','nl','pl','sv','no','da','fi',
];

// EN is the always-available fallback — imported statically.
import { enTranslations } from './en';

// Helper to flatten nested object to dot-notation keys
export function flattenObject(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, newKey));
    } else if (Array.isArray(value)) {
      // Flatten arrays with index-based keys (e.g. extendedDesc.passTheMic.0, .1, ...)
      value.forEach((item, idx) => {
        if (typeof item === 'string') {
          result[`${newKey}.${idx}`] = item;
        }
      });
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

// ── R97b: dynamic per-language chunks ─────────────────────────────────────
// Explicit import() per language (no template literal) so the bundler
// creates exactly one async chunk per locale and nothing else.

/** Async loaders — resolve to the merged (already deepMerge'd) barrel export. */
const LOADERS: Record<Language, () => Promise<Record<string, unknown>>> = {
  en: async () => enTranslations as unknown as Record<string, unknown>,
  de: () => import('./de').then(m => m.deTranslations as unknown as Record<string, unknown>),
  es: () => import('./es').then(m => m.esTranslations as unknown as Record<string, unknown>),
  fr: () => import('./fr').then(m => m.frTranslations as unknown as Record<string, unknown>),
  it: () => import('./it').then(m => m.itTranslations as unknown as Record<string, unknown>),
  pt: () => import('./pt').then(m => m.ptTranslations as unknown as Record<string, unknown>),
  ja: () => import('./ja').then(m => m.jaTranslations as unknown as Record<string, unknown>),
  ko: () => import('./ko').then(m => m.koTranslations as unknown as Record<string, unknown>),
  zh: () => import('./zh').then(m => m.zhTranslations as unknown as Record<string, unknown>),
  ru: () => import('./ru').then(m => m.ruTranslations as unknown as Record<string, unknown>),
  nl: () => import('./nl').then(m => m.nlTranslations as unknown as Record<string, unknown>),
  pl: () => import('./pl').then(m => m.plTranslations as unknown as Record<string, unknown>),
  sv: () => import('./sv').then(m => m.svTranslations as unknown as Record<string, unknown>),
  no: () => import('./no').then(m => m.noTranslations as unknown as Record<string, unknown>),
  da: () => import('./da').then(m => m.daTranslations as unknown as Record<string, unknown>),
  fi: () => import('./fi').then(m => m.fiTranslations as unknown as Record<string, unknown>),
};

/** Flattened translations of already-loaded languages. EN is always present. */
const _loaded: Partial<Record<Language, Record<string, string>>> = {};
const _loading = new Map<Language, Promise<void>>();
let _enFlat: Record<string, string> | null = null;

function enFlat(): Record<string, string> {
  if (!_enFlat) {
    _enFlat = flattenObject(enTranslations as unknown as Record<string, unknown>);
  }
  return _enFlat;
}

/**
 * Loads a language's translation chunk (once). Safe to call repeatedly and
 * concurrently — parallel callers share the same in-flight promise.
 * 'en' resolves immediately (always loaded).
 */
export async function ensureLanguageLoaded(lang: Language): Promise<void> {
  if (lang === 'en' || _loaded[lang]) return;
  let p = _loading.get(lang);
  if (!p) {
    p = LOADERS[lang]()
      .then(merged => {
        _loaded[lang] = flattenObject(merged);
      })
      .finally(() => {
        _loading.delete(lang);
      });
    _loading.set(lang, p);
  }
  await p;
}

/** Loads ALL languages (used by the test suite). */
export async function loadAllLanguages(): Promise<void> {
  await Promise.all(ALL_LANGUAGES.map(l => ensureLanguageLoaded(l)));
}

/**
 * Flat translation maps of all CURRENTLY loaded languages.
 * EN is guaranteed; other languages are present after ensureLanguageLoaded().
 * (The declared type keeps consumer code simple — index access must still be
 * truthiness-checked, which all existing consumers already do.)
 */
export function getTranslations(): Record<Language, Record<string, string>> {
  return { en: enFlat(), ..._loaded } as Record<Language, Record<string, string>>;
}

// Standalone translate function (safe for server-side / non-React usage).
// Languages other than EN require ensureLanguageLoaded() first — otherwise
// this falls back to English (never crashes).
export function t(key: string, language: Language = 'en'): string {
  const translations = getTranslations();
  const langTranslations = translations[language];
  if (langTranslations && langTranslations[key]) {
    return langTranslations[key];
  }
  if (translations.en[key]) {
    return translations.en[key];
  }
  return key;
}
