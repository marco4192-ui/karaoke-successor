import { getTranslations } from '../src/lib/i18n/locales/index';
const tr = getTranslations();
const keys = ['tournament.accuracy', 'partyStarting.startPlayerHint'];
for (const k of keys) {
  console.log(`\n### ${k}`);
  for (const lang of ['en','zh','ru','nl','pl','de']) {
    console.log(`  ${lang}: ${JSON.stringify(tr[lang][k])}`);
  }
}
