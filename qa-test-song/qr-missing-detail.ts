// QA: Welche der 37 fehlenden Keys existieren schon in welchen Locales?
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

const missingKeys = [
  ...['permissionDenied','permissionDesc','howToAllow','step1','step2','step3','moreHelp','iOS','iOSSteps','android','androidSteps','desktop','desktopSteps','tapToRetry','adPlaying','gamePaused','skipAd','volumeLevel','currentPitch','tapToStop','tapToSing'].map(k => `mobileMicView.${k}`),
  ...['scoredPoints','accuracy','maxCombo','rating','mode','difficulty','callToAction','points','playerLabel','shareTitle'].map(k => `game.share.${k}`),
  'library.playlists.maxPlaylistsReached',
  'library.playlists.maxSongsReached',
  'pitchGraph.pitch',
  'pitchGraph.noPitch',
  'mobile.cptmWaiting',
  'editor.midiImport.sheetMusic.pdfPages',
];

for (const key of missingKeys) {
  const have: string[] = [];
  for (const [lang, data] of Object.entries(locales)) {
    const flat = flattenObject(data as Record<string, unknown>);
    if (flat[key]) have.push(lang);
  }
  console.log(`${key}: ${have.length ? 'schon da in: ' + have.join(',') : 'FEHLT überall (außer EN-Definition kommt neu)'}`);
}
