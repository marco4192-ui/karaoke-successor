// Fix locale files: the previous script inserted after 'mirrorCancel:' prefix,
// breaking the line. This script restores the original mirrorCancel line
// and properly adds new keys after it.
import * as fs from 'fs';
import * as path from 'path';

const LOCALE_DIR = path.join(__dirname, '../src/lib/i18n/locales');

const TRANSLATIONS: Record<string, Record<string, string>> = {
  'mirrorRestart': {
    de: 'Neustart', en: 'Restart', it: 'Riavvia', nl: 'Herstart',
    da: 'Genstart', sv: 'Starta om', pt: 'Reiniciar', fr: 'Redemarrer',
    ko: '\uB2E4\uC2DC \uC2DC\uC791', zh: '\u91CD\u65B0\u5F00\u59CB', ru: '\u041F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u043A', no: 'Start p\u00E5 nytt',
    pl: 'Uruchom ponownie', fi: 'K\u00E4ynnist\u00E4 uudelleen', es: 'Reiniciar', ja: '\u518D\u751F',
  },
  'mirrorPause': {
    de: 'Pause', en: 'Pause', it: 'Pausa', nl: 'Pauze',
    da: 'Pause', sv: 'Pausa', pt: 'Pausar', fr: 'Pause',
    ko: '\uC77C\uC2DC\uC911\uC9C0', zh: '\u6682\u505C', ru: '\u041F\u0430\u0443\u0437\u0430', no: 'Pause',
    pl: 'Pauza', fi: 'Tauko', es: 'Pausar', ja: '\u4E00\u6642\u505C\u6B62',
  },
  'mirrorPlay': {
    de: 'Abspielen', en: 'Play', it: 'Riproduci', nl: 'Afspelen',
    da: 'Afspil', sv: 'Spela upp', pt: 'Reproduzir', fr: 'Lecture',
    ko: '\uC7AC\uC0DD', zh: '\u64AD\u653E', ru: '\u0412\u043E\u0441\u043F\u0440\u043E\u0438\u0437\u0432\u0435\u0441\u0442\u0438', no: 'Spill av',
    pl: 'Odtw\u00F3rz', fi: 'Toista', es: 'Reproducir', ja: '\u518D\u751F',
  },
  'mirrorSkip': {
    de: '\u00DCberspringen', en: 'Skip', it: 'Salta', nl: 'Overslaan',
    da: 'Spring over', sv: 'Hoppa \u00F6ver', pt: 'Pular', fr: 'Passer',
    ko: '\uAC74\uB108\uB6B\uAE30', zh: '\u8DF3\u8FC7', ru: '\u041F\u0440\u043E\u043F\u0443\u0441\u0442\u0438\u0442\u044C', no: 'Hopp over',
    pl: 'Pomi\u0144', fi: 'Ohita', es: 'Saltar', ja: '\u30B9\u30AD\u30C3\u30D7',
  },
  'mirrorResume': {
    de: 'Fortfahren', en: 'Resume', it: 'Riprendi', nl: 'Hervatten',
    da: 'Forts\u00E6t', sv: '\u00C5teruppta', pt: 'Continuar', fr: 'Reprendre',
    ko: '\uACF5\uBC15', zh: '\u7EE7\u7EED', ru: '\u041F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C', no: 'Fortsett',
    pl: 'Wzn\u00F3w', fi: 'Jatka', es: 'Continuar', ja: '\u518D\u958B',
  },
  'mirrorAbortSong': {
    de: 'Song beenden', en: 'End Song', it: 'Fine brano', nl: 'Nummer be\u00EBindigen',
    da: 'Afslut sang', sv: 'Avsluta s\u00E5ng', pt: 'Encerrar m\u00FAsica', fr: 'Terminer le morceau',
    ko: '\uB178\uB798 \uC885\uB8CC', zh: '\u7ED3\u675F\u6B4C\u66F2', ru: '\u0417\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u044C \u043F\u0435\u0441\u043D\u044E', no: 'Avslutt sang',
    pl: 'Zako\u0144cz piosenk\u0119', fi: 'Lopeta kappale', es: 'Terminar canci\u00F3n', ja: '\u66F2\u3092\u7D42\u4E86',
  },
  'mirrorPauseTitle': {
    de: 'Pausiert', en: 'Paused', it: 'In pausa', nl: 'Gepauzeerd',
    da: 'Pauset', sv: 'Pausad', pt: 'Pausado', fr: 'En pause',
    ko: '\uC77C\uC2DC\uC911\uC9C0', zh: '\u5DF2\u6682\u505C', ru: '\u041F\u0430\u0443\u0437\u0430', no: 'Pauset',
    pl: 'Zapauzowane', fi: 'Tauko', es: 'En pausa', ja: '\u4E00\u6642\u505C\u6B62\u4E2D',
  },
  'mirrorSongRunningWarning': {
    de: 'Achtung: Ein Song l\u00E4uft gerade!', en: 'Warning: A song is currently playing!', it: 'Attenzione: \u00E8 in riproduzione un brano!', nl: 'Let op: er wordt nu een nummer afgespeeld!',
    da: 'Advarsel: En sang spilles lige nu!', sv: 'Varning: En l\u00E5t spelas just nu!', pt: 'Aten\u00E7\u00E3o: Uma m\u00FAsica est\u00E1 tocando!', fr: 'Attention : un morceau est en cours !',
    ko: '\uACBD\uACE0: \uB178\uB798\uAC00 \uC7AC\uC0DD \uC911\uC785\uB2C8\uB2E4!', zh: '\u6CE8\u610F\uFF1A\u6B63\u5728\u64AD\u653E\u6B4C\u66F2\uFF01', ru: '\u0412\u043D\u0438\u043C\u0430\u043D\u0438\u0435: \u041F\u0435\u0441\u043D\u044F \u0441\u0435\u0439\u0447\u0430\u0441 \u0438\u0433\u0440\u0430\u0435\u0442!', no: 'Advarsel: En sang spilles n\u00E5!',
    pl: 'Uwaga: Piosenka jest teraz odtwarzana!', fi: 'Huom: Kappale on k\u00E4ynniss\u00E4!', es: '\u00A1Atenci\u00F3n: \u00A1Hay una canci\u00F3n en reproducci\u00F3n!', ja: '\u8B66\u544A\uFF1A\u66F2\u304C\u518D\u751F\u4E2D\u3067\u3059\uFF01',
  },
  'mirrorEndSong': {
    de: 'Song beenden', en: 'End Song', it: 'Fine brano', nl: 'Nummer be\u00EBindigen',
    da: 'Afslut sang', sv: 'Avsluta s\u00E5ng', pt: 'Encerrar m\u00FAsica', fr: 'Terminer',
    ko: '\uB178\uB798 \uC885\uB8CC', zh: '\u7ED3\u675F\u6B4C\u66F2', ru: '\u0417\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u044C', no: 'Avslutt sang',
    pl: 'Zako\u0144cz piosenk\u0119', fi: 'Lopeta kappale', es: 'Terminar canci\u00F3n', ja: '\u66F2\u3092\u7D42\u4E86',
  },
  'mirrorReleaseControlShort': {
    de: 'Kontrolle abgeben', en: 'Release Control', it: 'Rilascia controllo', nl: 'Beheer loslaten',
    da: 'Frig\u00F8r kontrol', sv: 'Sl\u00E4pp kontroll', pt: 'Liberar controle', fr: 'Lib\u00E9rer le contr\u00F4le',
    ko: '\uCEEC\uD130\uEBA1 \uBCA0\uC8FC', zh: '\u91CA\u653E\u63A7\u5236', ru: '\u041E\u0442\u043F\u0443\u0441\u0442\u0438\u0442\u044C \u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435', no: 'Slipp kontroll',
    pl: 'Pu\u015B\u0107 kontrol\u0119', fi: 'Luovuta hallinta', es: 'Liberar control', ja: '\u64CD\u4F5C\u3092\u89E3\u9664',
  },
  'mirrorSongRunningDesc': {
    de: 'W\u00E4hrend ein Song l\u00E4uft, kann die Steuerung nicht verlassen werden.', en: 'While a song is playing, you cannot leave the controller.', it: 'Durante la riproduzione non puoi abbandonare il controllo.', nl: 'Tijdens het afspelen kun je de besturing niet verlaten.',
    da: 'Mens en sang spilles, kan du ikke forlade betjeningen.', sv: 'Under l\u00E5tens uppspelning kan du inte l\u00E4mna kontrollen.', pt: 'Enquanto uma m\u00FAsica toca, voc\u00EA n\u00E3o pode abandonar o controle.', fr: 'Pendant la lecture, vous ne pouvez pas quitter le contr\u00F4le.',
    ko: '\uB178\uB798 \uC7AC\uC0DD \uC911\uC5D0\uEB294 \uCEEC\uD130\uEBA1\uCC44 \uBC18\uD658\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.', zh: '\u6B4C\u66F2\u64AD\u653E\u671F\u95F4\u65E0\u6CD5\u91CA\u653E\u63A7\u5236\u3002', ru: '\u041F\u043E\u043A\u0430 \u0438\u0433\u0440\u0430\u0435\u0442 \u043F\u0435\u0441\u043D\u044F, \u043D\u0435\u043B\u044C\u0437\u044F \u043E\u0441\u0432\u043E\u0431\u043E\u0436\u0434\u0430\u0442\u044C \u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435.', no: 'Mens en sang spilles, kan du ikke slippe kontrollen.',
    pl: 'Podczas odtwarzania piosenki nie mo\u017Cesz opu\u015Bci\u0107 kontroli.', fi: 'Kappaleen toiston aikana et voi luopua hallinnasta.', es: 'Mientras suena una canci\u00F3n, no puedes liberar el control.', ja: '\u66F2\u518D\u751F\u4E2D\u306F\u64CD\u4F5C\u3092\u89E3\u9664\u3067\u304D\u307E\u305B\u3093\u3002',
  },
};

const LOCALES = ['de', 'en', 'it', 'nl', 'da', 'sv', 'pt', 'fr', 'ko', 'zh', 'ru', 'no', 'pl', 'fi', 'es', 'ja'];

const MIRROR_CANCEL_VALUES: Record<string, string> = {
  de: "'Abbrechen'",
  en: "'Cancel'",
  it: "'Annulla'",
  nl: "'Annuleren'",
  da: "'Annuller'",
  sv: "'Avbryt'",
  pt: "'Cancelar'",
  fr: "'Annuler'",
  ko: "'\uBCF4\uAE30'",
  zh: "'\u53D6\u6D88'",
  ru: "'\u041E\u0442\u043C\u0435\u043D\u0430'",
  no: "'Avbryt'",
  pl: "'Anuluj'",
  fi: "'Peruuta'",
  es: "'Cancelar'",
  ja: "'\u30AD\u30E3\u30F3\u30BB\u30EB'",
};

function fixFile(filePath: string, locale: string) {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Find the broken mirrorCancel line and the accidentally appended content
  // The broken pattern looks like:  mirrorCancel: 'value',  mirrorRestart: 'value', 'original',
  // or:  mirrorCancel: 'value',
  //  mirrorSongRunningDesc: 'value',
  // We need to restore mirrorCancel and add all new keys properly
  
  const cancelVal = MIRROR_CANCEL_VALUES[locale];
  if (!cancelVal) return false;
  
  // Pattern: find the mirrorCancel line (may be broken with extra content)
  // Match from "  mirrorCancel:" to end of line, then check if there's broken content
  const brokenRegex = new RegExp(
    `(  mirrorCancel: ${cancelVal},)([^\n]*(?:mirror(Restart|Pause|Play|Skip|Resume|AbortSong|PauseTitle|SongRunning|EndSong|ReleaseControl)[^\n]*)*`,
  );
  
  let fixed = false;
  const newContent = content.replace(brokenRegex, (_, correctLine, _broken) => {
    fixed = true;
    // Build the proper replacement: original mirrorCancel line + all new keys
    const keysToAdd = Object.entries(TRANSLATIONS)
      .map(([key, translations]) => `  ${key}: '${translations[locale]}',`)
      .join('\n');
    return correctLine + '\n' + keysToAdd;
  });
  
  if (fixed) {
    fs.writeFileSync(filePath, newContent, 'utf-8');
    console.log(`  Fixed ${locale}/mobile.ts`);
    return true;
  }
  
  // Check if translations already exist properly (no fix needed)
  const hasAny = Object.keys(TRANSLATIONS).some(k => content.includes(`  ${k}:`));
  if (!hasAny) {
    console.log(`  SKIP: ${locale}/mobile.ts - no broken content found and no translations exist`);
  }
  
  return false;
}

console.log('Fixing locale files...');
for (const locale of LOCALES) {
  const filePath = path.join(LOCALE_DIR, locale, 'mobile.ts');
  if (fs.existsSync(filePath)) {
    fixFile(filePath, locale);
  } else {
    console.log(`  SKIP: ${locale}/mobile.ts not found`);
  }
}
console.log('Done!');
