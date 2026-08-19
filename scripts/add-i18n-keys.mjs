// Script to add missing i18n keys to all locale core.ts files
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const localesDir = join(__dirname, '..', 'src', 'lib', 'i18n', 'locales');

const translations = {
  en: { songPool: 'Song Pool', songPoolSelect: 'Select a song pool to filter songs', switchPool: 'Switch Pool' },
  de: { songPool: 'Song-Pool', songPoolSelect: 'Wähle einen Song-Pool zum Filtern', switchPool: 'Pool wechseln' },
  sv: { songPool: 'Låtpool', songPoolSelect: 'Välj en låtpool för att filtrera', switchPool: 'Byt pool' },
  no: { songPool: 'Låtpool', songPoolSelect: 'Velg en låtpool for å filtrere', switchPool: 'Bytt pool' },
  pl: { songPool: 'Pula utworów', songPoolSelect: 'Wybierz pulę utworów do filtrowania', switchPool: 'Zmień pulę' },
  pt: { songPool: 'Pool de músicas', songPoolSelect: 'Selecione um pool para filtrar músicas', switchPool: 'Trocar pool' },
  es: { songPool: 'Pool de canciones', songPoolSelect: 'Selecciona un pool para filtrar canciones', switchPool: 'Cambiar pool' },
  da: { songPool: 'Sangpool', songPoolSelect: 'Vælg en sangpool til filtrering', switchPool: 'Skift pool' },
  fi: { songPool: 'Kappalepooli', songPoolSelect: 'Valitse kappalepooli suodatusmääritykseksi', switchPool: 'Vaihda poolia' },
  fr: { songPool: 'Répertoire', songPoolSelect: 'Sélectionnez un répertoire pour filtrer', switchPool: 'Changer de répertoire' },
  ja: { songPool: 'ソングプール', songPoolSelect: 'フィルターするソングプールを選択', switchPool: 'プール切替' },
  ko: { songPool: '노래 풀', songPoolSelect: '필터링할 노래 풀을 선택하세요', switchPool: '풀 변경' },
  zh: { songPool: '歌曲池', songPoolSelect: '选择一个歌曲池来筛选歌曲', switchPool: '切换池' },
  nl: { songPool: 'Nummerpool', songPoolSelect: 'Selecteer een nummerpool om te filteren', switchPool: 'Pool wisselen' },
  it: { songPool: 'Pool di brani', songPoolSelect: 'Seleziona un pool per filtrare i brani', switchPool: 'Cambia pool' },
  ru: { songPool: 'Пул песен', songPoolSelect: 'Выберите пул песен для фильтрации', switchPool: 'Сменить пул' },
};

const localeDirs = Object.keys(translations);
let updatedCount = 0;

for (const locale of localeDirs) {
  const filePath = join(localesDir, locale, 'core.ts');
  try {
    let content = readFileSync(filePath, 'utf-8');

    // Check if songPool key already exists
    if (content.includes('songPool:')) {
      console.log(`  ${locale}: songPool already exists, skipping`);
      continue;
    }

    const t = translations[locale];
    // Insert before the closing of jukeboxPlayer section (before '  jukeboxA11y')
    const insertion = `    songPool: '${t.songPool}',
    songPoolSelect: '${t.songPoolSelect}',
    switchPool: '${t.switchPool}',
`;

    content = content.replace(/(  jukeboxA11y:)/, insertion + '$1');
    writeFileSync(filePath, content, 'utf-8');
    console.log(`  ${locale}: added 3 keys`);
    updatedCount++;
  } catch (err) {
    console.error(`  ${locale}: ERROR - ${err.message}`);
  }
}

console.log(`\nUpdated ${updatedCount} locale files.`);