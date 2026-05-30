// i18n hook for Karaoke Eleven
// Translation DATA lives in ./locales/index.ts to keep this module small.
// All translations are accessed via getTranslations() (lazy function call),
// which completely eliminates TDZ risk from webpack code-splitting.

import { useState, useEffect, useCallback, useMemo } from 'react';
import { StorageKeys, setItem, getString } from '@/lib/storage';
import {
  Language,
  ALL_LANGUAGES,
  getTranslations,
  createNestedObject,
} from '@/lib/i18n/locales';

// Re-export types and constants for consumers
export type { Language };
export { ALL_LANGUAGES };

export const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  de: 'Deutsch',
  es: 'Español',
  fr: 'Français',
  it: 'Italiano',
  pt: 'Português',
  ja: '日本語',
  ko: '한국어',
  zh: '中文',
  ru: 'Русский',
  nl: 'Nederlands',
  pl: 'Polski',
  sv: 'Svenska',
  no: 'Norsk',
  da: 'Dansk',
  fi: 'Suomi',
};

export const LANGUAGE_FLAGS: Record<Language, string> = {
  en: '🇬🇧',
  de: '🇩🇪',
  es: '🇪🇸',
  fr: '🇫🇷',
  it: '🇮🇹',
  pt: '🇵🇹',
  ja: '🇯🇵',
  ko: '🇰🇷',
  zh: '🇨🇳',
  ru: '🇷🇺',
  nl: '🇳🇱',
  pl: '🇵🇱',
  sv: '🇸🇪',
  no: '🇳🇴',
  da: '🇩🇰',
  fi: '🇫🇮',
};

// Standalone translate function (for non-hook usage, e.g. tests)
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

// Convenience export: get the flat translations map (for tests)
export { getTranslations as translations };

// Create a nested translation object for object-style access (t.settings.title)
function buildNestedTranslation(language: Language): Record<string, unknown> {
  const translations = getTranslations();
  const langTranslations = translations[language];
  const enTranslationsFlat = translations.en;
  const merged = { ...enTranslationsFlat, ...langTranslations };
  return createNestedObject(merged);
}

// React hook for translations (client components)
// Supports cross-tab synchronization via StorageEvent
export function useTranslation() {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window === 'undefined') return 'en';
    const stored = getString(StorageKeys.LANGUAGE, 'en');
    if (stored && (ALL_LANGUAGES as readonly string[]).includes(stored)) {
      return stored as Language;
    }
    return 'en';
  });

  const setLanguage = useCallback((newLang: Language) => {
    setLanguageState(newLang);
    if (typeof window !== 'undefined') {
      setItem(StorageKeys.LANGUAGE, newLang);
    }
    window.dispatchEvent(new CustomEvent('languageChange', { detail: newLang }));
  }, []);

  // Cross-tab synchronization
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'karaoke-language' && e.newValue) {
        const newLang = e.newValue as Language;
        setLanguageState(newLang);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const translate = useCallback((key: string): string => {
    const translations = getTranslations();
    const langTranslations = translations[language];
    if (langTranslations && langTranslations[key]) {
      return langTranslations[key];
    }
    if (translations.en[key]) {
      return translations.en[key];
    }
    return key;
  }, [language]);

  const nestedTranslations = useMemo(
    () => buildNestedTranslation(language),
    [language],
  );

  return { t: translate, language, setLanguage, translations: nestedTranslations };
}
