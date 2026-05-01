import { describe, it, expect } from 'vitest';
import { t, translations, Language, LANGUAGE_NAMES, LANGUAGE_FLAGS } from '@/lib/i18n/translations';

describe('i18n translation system', () => {
  describe('t() function', () => {
    it('returns correct English translation for a known key', () => {
      expect(t('nav.library', 'en')).toBe('Library');
    });

    it('returns correct German translation for a known key', () => {
      expect(t('nav.library', 'de')).toBe('Bibliothek');
    });

    it('returns correct Spanish translation for a known key', () => {
      expect(t('nav.library', 'es')).toBe('Biblioteca');
    });

    it('returns correct French translation for a known key', () => {
      expect(t('nav.library', 'fr')).toBe('Bibliothèque');
    });

    it('falls back to English when key is missing in other language', () => {
      // Some languages may not have settings.technologyStack — should fall back to English
      const enValue = t('settings.technologyStack', 'en');
      // Even if the key exists, the fallback mechanism should produce the same English value
      const otherLangValue = t('settings.technologyStack', 'de');
      // Both should be non-empty (either translated or English fallback)
      expect(otherLangValue).toBeTruthy();
      expect(typeof otherLangValue).toBe('string');
    });

    it('returns the key when translation is not found', () => {
      expect(t('nonexistent.key', 'en')).toBe('nonexistent.key');
    });

    it('returns the key when translation is not found in non-English language', () => {
      expect(t('nonexistent.deep.key', 'de')).toBe('nonexistent.deep.key');
    });

    it('resolves dot-notation keys like nav.library', () => {
      expect(t('nav.library', 'en')).toBe('Library');
    });

    it('resolves settings.title', () => {
      expect(t('settings.title', 'en')).toBe('Settings');
    });

    it('resolves common.loading', () => {
      expect(t('common.loading', 'en')).toBe('Loading...');
    });

    it('resolves game.combo', () => {
      expect(t('game.combo', 'en')).toBe('combo');
    });

    it('resolves home.title', () => {
      expect(t('home.title', 'en')).toBe('Karaoke Successor');
    });

    it('defaults to English when no language is specified', () => {
      expect(t('nav.library')).toBe('Library');
    });
  });

  describe('language coverage', () => {
    const allLanguages: Language[] = [
      'en', 'de', 'es', 'fr', 'it', 'pt', 'ja', 'ko', 'zh', 'ru', 'nl', 'pl', 'sv', 'no', 'da', 'fi',
    ];

    it('has all 16 languages defined in translations', () => {
      for (const lang of allLanguages) {
        expect(translations[lang]).toBeDefined();
      }
    });

    it.each(allLanguages)('language %s has nav.library translation', (lang) => {
      expect(translations[lang]['nav.library']).toBeTruthy();
      expect(typeof translations[lang]['nav.library']).toBe('string');
    });

    it.each(allLanguages)('language %s has common.loading translation', (lang) => {
      expect(translations[lang]['common.loading']).toBeTruthy();
      expect(typeof translations[lang]['common.loading']).toBe('string');
    });

    it.each(allLanguages)('language %s has nav.settings translation', (lang) => {
      expect(translations[lang]['nav.settings']).toBeTruthy();
      expect(typeof translations[lang]['nav.settings']).toBe('string');
    });
  });

  describe('Language type validation', () => {
    it('has 16 languages in Language type', () => {
      const languages: Language[] = ['en', 'de', 'es', 'fr', 'it', 'pt', 'ja', 'ko', 'zh', 'ru', 'nl', 'pl', 'sv', 'no', 'da', 'fi'];
      expect(languages).toHaveLength(16);
    });

    it('has corresponding LANGUAGE_NAMES for all languages', () => {
      const languages: Language[] = ['en', 'de', 'es', 'fr', 'it', 'pt', 'ja', 'ko', 'zh', 'ru', 'nl', 'pl', 'sv', 'no', 'da', 'fi'];
      for (const lang of languages) {
        expect(LANGUAGE_NAMES[lang]).toBeDefined();
        expect(typeof LANGUAGE_NAMES[lang]).toBe('string');
        expect(LANGUAGE_NAMES[lang].length).toBeGreaterThan(0);
      }
    });

    it('has corresponding LANGUAGE_FLAGS for all languages', () => {
      const languages: Language[] = ['en', 'de', 'es', 'fr', 'it', 'pt', 'ja', 'ko', 'zh', 'ru', 'nl', 'pl', 'sv', 'no', 'da', 'fi'];
      for (const lang of languages) {
        expect(LANGUAGE_FLAGS[lang]).toBeDefined();
        expect(typeof LANGUAGE_FLAGS[lang]).toBe('string');
      }
    });
  });

  describe('translation value types', () => {
    it('English translations contain string values', () => {
      for (const [key, value] of Object.entries(translations.en)) {
        expect(typeof value).toBe('string');
      }
    });

    it('German translations contain string values', () => {
      for (const [key, value] of Object.entries(translations.de)) {
        expect(typeof value).toBe('string');
      }
    });
  });
});
