'use client';

// i18n hook for Karaoke ZERO
// Translation DATA lives in ./locales/index.ts to keep this module small.
// All translations are accessed via getTranslations() (lazy function call),
// which completely eliminates TDZ risk from webpack code-splitting.

import { useState, useEffect, useCallback, useMemo } from 'react';
import { StorageKeys, setItem, getString, removeItem } from '@/lib/storage';
import {
  Language,
  ALL_LANGUAGES,
  getTranslations,
  createNestedObject,
  t,
} from '@/lib/i18n/locales';

// Re-export types, constants, and t() for consumers
export type { Language };
export { ALL_LANGUAGES, t };

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

// Convenience export: get the flat translations map (for tests)
export { getTranslations as translations };

// ── R42: Companion-app language scoping ──────────────────────────────────
// The companion app (route /mobile) can run in its OWN language, decoupled
// from the main app. The override lives under a SEPARATE storage key so a
// language change on the phone NEVER writes through to the desktop app
// (and vice versa). While no override is set, the companion follows the
// shared language (default behavior, incl. cross-tab sync).

/** True when this browser tab runs the companion app (route /mobile). */
export function isCompanionApp(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.pathname === '/mobile' || window.location.pathname.startsWith('/mobile/');
}

function isSupportedLanguage(value: string | null | undefined): value is Language {
  return !!value && (ALL_LANGUAGES as readonly string[]).includes(value);
}

/** Reads the companion language override (null when not set/invalid). */
function getCompanionOverride(): Language | null {
  if (typeof window === 'undefined') return null;
  const stored = getString(StorageKeys.COMPANION_LANGUAGE, '');
  return isSupportedLanguage(stored) ? stored : null;
}

/**
 * R42: The app's effective UI language from storage — for NON-React contexts
 * (canvas rendering, share texts) where useTranslation() is unavailable.
 * Mirrors the hook's precedence: companion override → shared language → 'en'.
 */
export function getStoredLanguage(): Language {
  if (typeof window === 'undefined') return 'en';
  if (isCompanionApp()) {
    const override = getCompanionOverride();
    if (override) return override;
  }
  const shared = getString(StorageKeys.LANGUAGE, 'en');
  return isSupportedLanguage(shared) ? shared : 'en';
}

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
    // R42: companion override wins over the shared main-app language
    if (isCompanionApp()) {
      const override = getCompanionOverride();
      if (override) return override;
    }
    const stored = getString(StorageKeys.LANGUAGE, 'en');
    if (stored && (ALL_LANGUAGES as readonly string[]).includes(stored)) {
      return stored as Language;
    }
    return 'en';
  });

  const setLanguage = useCallback((newLang: Language) => {
    setLanguageState(newLang);
    if (typeof window !== 'undefined') {
      // R42: the companion app writes ONLY its own override key — the main
      // app's language (karaoke-language) stays untouched. The main app
      // continues to write the shared key only.
      if (isCompanionApp()) {
        setItem(StorageKeys.COMPANION_LANGUAGE, newLang);
      } else {
        setItem(StorageKeys.LANGUAGE, newLang);
      }
    }
    window.dispatchEvent(new CustomEvent('languageChange', { detail: newLang }));
  }, []);

  // R42: clears the companion language override — the companion then follows
  // the main app's language again. No-op in the main app.
  const resetCompanionLanguage = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (!isCompanionApp()) return;
    removeItem(StorageKeys.COMPANION_LANGUAGE);
    const shared = getString(StorageKeys.LANGUAGE, 'en');
    const next = isSupportedLanguage(shared) ? shared : 'en';
    setLanguageState(next);
    window.dispatchEvent(new CustomEvent('languageChange', { detail: next }));
  }, []);

  // R42: does the companion currently have its own language override?
  const [hasCompanionOverride, setHasCompanionOverride] = useState<boolean>(() =>
    typeof window !== 'undefined' && isCompanionApp() && getCompanionOverride() !== null
  );

  // Cross-tab synchronization + same-tab language change broadcast
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      const companion = isCompanionApp();
      // Shared main-app language changed (e.g. main app in another tab):
      // the companion follows ONLY while it has no own override.
      if (e.key === 'karaoke-language' && e.newValue) {
        if (companion && getCompanionOverride() !== null) return;
        const newLang = e.newValue as Language;
        setLanguageState(newLang);
      }
      // Companion override changed (e.g. another companion tab) → adopt it
      if (companion && e.key === StorageKeys.COMPANION_LANGUAGE) {
        setHasCompanionOverride(getCompanionOverride() !== null);
        const override = getCompanionOverride();
        if (override) {
          setLanguageState(override);
        } else {
          const shared = getString(StorageKeys.LANGUAGE, 'en');
          setLanguageState(isSupportedLanguage(shared) ? shared : 'en');
        }
      }
    };
    // Listen for same-tab language changes dispatched by setLanguage()
    // so ALL components using useTranslation() update immediately
    const handleLanguageChange = (e: Event) => {
      const newLang = (e as CustomEvent).detail as Language;
      if (newLang) setLanguageState(newLang);
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('languageChange', handleLanguageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('languageChange', handleLanguageChange);
    };
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

  return {
    t: translate,
    language,
    setLanguage,
    translations: nestedTranslations,
    // R42: companion language scoping
    isCompanion: typeof window !== 'undefined' && isCompanionApp(),
    hasCompanionOverride,
    resetCompanionLanguage,
  };
}