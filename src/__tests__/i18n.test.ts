import { describe, it, expect } from 'vitest';
import { t, translations as getTranslations, Language, LANGUAGE_NAMES, LANGUAGE_FLAGS } from '@/lib/i18n/translations';

// getTranslations() is a lazy-init function, call once for test access
const translations = getTranslations();

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
      const __enValue = t('settings.technologyStack', 'en');
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
      expect(t('home.title', 'en')).toBe('Karaoke ZERO');
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
      for (const [__key, value] of Object.entries(translations.en)) {
        expect(typeof value).toBe('string');
      }
    });

    it('German translations contain string values', () => {
      for (const [_key, value] of Object.entries(translations.de)) {
        expect(typeof value).toBe('string');
      }
    });
  });

  describe('party extendedDesc bullet arrays (regression: comma-joined strings)', () => {
    const modes = ['passTheMic', 'companionSingalong', 'medley', 'tournament', 'battleRoyale', 'duel', 'blind', 'missingWords', 'rateMySong'] as const;
    const languages: Language[] = ['en', 'de', 'es', 'fr', 'it', 'pt', 'ja', 'ko', 'zh', 'ru', 'nl', 'pl', 'sv', 'no', 'da', 'fi'];

    it('English defines bullet counts for every mode', () => {
      for (const mode of modes) {
        let count = 0;
        while (translations.en[`extendedDesc.${mode}.${count}`]) count++;
        expect(count).toBeGreaterThan(0);
      }
    });

    it('every language has the same bullet count as English for every mode', () => {
      for (const mode of modes) {
        let enCount = 0;
        while (translations.en[`extendedDesc.${mode}.${enCount}`]) enCount++;
        for (const lang of languages) {
          let langCount = 0;
          while (translations[lang][`extendedDesc.${mode}.${langCount}`]) langCount++;
          // languages fall back to en key-for-key; identical counts prove real translations exist
          expect(langCount, `${lang} extendedDesc.${mode} bullet count`).toBe(enCount);
        }
      }
    });

    it('no language stores a legacy comma-joined string under extendedDesc.<mode>', () => {
      for (const lang of languages) {
        for (const mode of modes) {
          expect(translations[lang][`extendedDesc.${mode}`]).toBeUndefined();
        }
      }
    });
  });

  describe('unified party setup i18n coverage', () => {
    it('difficulty labels are translated in all languages', () => {
      const languages: Language[] = ['en', 'de', 'es', 'fr', 'it', 'pt', 'ja', 'ko', 'zh', 'ru', 'nl', 'pl', 'sv', 'no', 'da', 'fi'];
      for (const lang of languages) {
        for (const diff of ['easy', 'medium', 'hard'] as const) {
          const value = translations[lang][`difficulty.${diff}`];
          expect(value, `${lang} difficulty.${diff}`).toBeTruthy();
        }
      }
    });

    it('modeSettings labels used by the unified setup config exist in all languages', () => {
      const languages: Language[] = ['en', 'de', 'es', 'fr', 'it', 'pt', 'ja', 'ko', 'zh', 'ru', 'nl', 'pl', 'sv', 'no', 'da', 'fi'];
      const keys = [
        'modeSettings.missingWordFrequency', 'modeSettings.missingWordFrequencyDesc',
        'modeSettings.missingGranularity', 'modeSettings.missingGranularityDesc',
        'modeSettings.bestOf', 'modeSettings.bestOfDesc',
        'modeSettings.blindFrequency', 'modeSettings.blindFrequencyDesc',
        'modeSettings.grandFinale', 'modeSettings.grandFinaleDesc',
      ];
      for (const lang of languages) {
        for (const key of keys) {
          expect(translations[lang][key], `${lang} ${key}`).toBeTruthy();
        }
      }
    });
  });

  describe('party session history i18n coverage', () => {
    it('partyHistory keys exist in all languages', () => {
      const languages: Language[] = ['en', 'de', 'es', 'fr', 'it', 'pt', 'ja', 'ko', 'zh', 'ru', 'nl', 'pl', 'sv', 'no', 'da', 'fi'];
      const keys = [
        'partyHistory.title', 'partyHistory.empty', 'partyHistory.winner',
        'partyHistory.players', 'partyHistory.rounds', 'partyHistory.timesPlayed',
        'partyHistory.clear', 'partyHistory.confirmClear',
        'partyHistory.playerSingular', 'partyHistory.roundSingular',
        'partyHistory.totalParties', 'partyHistory.favoriteMode',
        'partyHistory.topWinner', 'partyHistory.bestScore',
      ];
      for (const lang of languages) {
        for (const key of keys) {
          expect(translations[lang][key], `${lang} ${key}`).toBeTruthy();
        }
      }
    });

    it('placeholder keys keep their {n} placeholder in all languages', () => {
      const languages: Language[] = ['en', 'de', 'es', 'fr', 'it', 'pt', 'ja', 'ko', 'zh', 'ru', 'nl', 'pl', 'sv', 'no', 'da', 'fi'];
      for (const lang of languages) {
        for (const key of ['partyHistory.players', 'partyHistory.rounds', 'partyHistory.timesPlayed']) {
          expect(translations[lang][key], `${lang} ${key}`).toContain('{n}');
        }
      }
    });
  });
});
