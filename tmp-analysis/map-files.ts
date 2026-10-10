import * as enCore from '../src/lib/i18n/locales/en/core';
import * as enLibrary from '../src/lib/i18n/locales/en/library';
import * as enGame from '../src/lib/i18n/locales/en/game';
import * as enSettings from '../src/lib/i18n/locales/en/settings';
import * as enParty from '../src/lib/i18n/locales/en/party';
import * as enMedley from '../src/lib/i18n/locales/en/medleyTournament';
import * as enProfile from '../src/lib/i18n/locales/en/profile';
import * as enMobile from '../src/lib/i18n/locales/en/mobile';
import * as enTutorial from '../src/lib/i18n/locales/en/tutorial';

const files: Record<string, Record<string, unknown>> = {
  core: enCore, library: enLibrary, game: enGame, settings: enSettings,
  party: enParty, medleyTournament: enMedley, profile: enProfile,
  mobile: enMobile, tutorial: enTutorial,
};

function topLevel(obj: Record<string, unknown>): string[] {
  return Object.keys(obj);
}

for (const [name, mod] of Object.entries(files)) {
  const exported = Object.keys(mod).filter(k => !k.startsWith('__') && k.includes('ranslations') === false);
  // find the exported object containing translations
  const candidate = Object.entries(mod).find(([k, v]) => typeof v === 'object' && v !== null && k.toLowerCase().includes('translation'));
  if (candidate) {
    console.log(`${name}: ${topLevel(candidate[1] as Record<string, unknown>).join(', ')}`);
  }
}
