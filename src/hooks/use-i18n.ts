'use client';

/**
 * DEAD CODE (Code Review #5, 2026-04-17)
 *
 * This file is not imported by any other file in the project.
 *
 * Possible function: This hook provides a React-friendly wrapper around the i18n
 * translation system (lib/i18n/translations.ts). It manages language state,
 * supports both function-style (t('key')) and object-style (translations.key.path)
 * translation access, and synchronizes language changes across tabs via
 * localStorage events and CustomEvents.
 *
 * Currently, the app uses the direct `t()` function from translations.ts instead
 * of this hook. The language state is managed through the settings screen which
 * calls setStoredLanguage() directly.
 *
 * This hook provides additional value over direct t() calls:
 * - Reactive language changes (components re-render on language switch)
 * - Cross-tab synchronization via StorageEvent listener
 * - Object-style translation access for complex UIs
 *
 * Consider: Should be the standard way to access translations in React components
 * for proper reactivity. Currently components won't re-render when language changes.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { Language, t, getStoredLanguage, setStoredLanguage, createTranslationObject } from '@/lib/i18n/translations';

// Re-export types and functions
export type { Language } from '@/lib/i18n/translations';

// Type for nested translation object
type TranslationObject = Record<string, unknown>;

export function useI18n() {
  const [language, setLanguageState] = useState<Language>('en');
  const [translationObject, setTranslationObject] = useState<TranslationObject>({});
  const isInitialized = useRef(false);

  useEffect(() => {
    if (!isInitialized.current) {
      isInitialized.current = true;
      queueMicrotask(() => {
        const storedLang = getStoredLanguage();
        setLanguageState(storedLang);
        setTranslationObject(createTranslationObject(storedLang));
      });
    }
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    setStoredLanguage(lang);
    setTranslationObject(createTranslationObject(lang));
    // Dispatch event for other components to react
    window.dispatchEvent(new CustomEvent('languageChange', { detail: lang }));
  }, []);

  const translate = useCallback((key: string) => t(key, language), [language]);

  // Listen for language changes from other components
  useEffect(() => {
    const handleLanguageChange = (e: Event) => {
      const customEvent = e as CustomEvent<Language>;
      const newLang = customEvent.detail;
      setLanguageState(newLang);
      setTranslationObject(createTranslationObject(newLang));
    };
    window.addEventListener('languageChange', handleLanguageChange);
    return () => window.removeEventListener('languageChange', handleLanguageChange);
  }, []);

  // Listen for language changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'karaoke-language' && e.newValue) {
        const newLang = e.newValue as Language;
        setLanguageState(newLang);
        setTranslationObject(createTranslationObject(newLang));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return { 
    language, 
    setLanguage, 
    t: translate,  // Function style: t('settings.title')
    translations: translationObject, // Object style: translations.settings.title
  };
}

// Simple hook for just getting translations (returns object for dot notation access)
export function useTranslation() {
  const { t, language, translations } = useI18n();
  return { t, language, translations };
}
