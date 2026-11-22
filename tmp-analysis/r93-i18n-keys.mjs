// R93: adds shareSection.rivalCard / companionHint / winner to all 16 locales
import { readFileSync, writeFileSync } from 'node:fs';

const translations = {
  en: {
    rivalCard: '⚔️ Rivalry Card',
    companionHint: '{name} is connected via the companion app — their scorecard is available there.',
    winner: 'Winner',
  },
  de: {
    rivalCard: '⚔️ Duell-Karte',
    companionHint: '{name} ist über die Companion-App verbunden — die Scorecard ist dort verfügbar.',
    winner: 'Gewinner',
  },
  fr: {
    rivalCard: '⚔️ Carte de duel',
    companionHint: '{name} est connecté via l\u2019app compagnon — sa carte de score y est disponible.',
    winner: 'Gagnant',
  },
  es: {
    rivalCard: '⚔️ Tarjeta de duelo',
    companionHint: '{name} está conectado mediante la app complementaria — su tarjeta de puntuación está disponible allí.',
    winner: 'Ganador',
  },
  it: {
    rivalCard: '⚔️ Carta duello',
    companionHint: '{name} è connesso tramite l\u2019app companion — la sua scorecard è disponibile lì.',
    winner: 'Vincitore',
  },
  pt: {
    rivalCard: '⚔️ Cartão de duelo',
    companionHint: '{name} está conectado via app companheira — o cartão de pontuação está disponível lá.',
    winner: 'Vencedor',
  },
  nl: {
    rivalCard: '⚔️ Duelkaart',
    companionHint: '{name} is verbonden via de companion-app — de scorekaart is daar beschikbaar.',
    winner: 'Winnaar',
  },
  sv: {
    rivalCard: '⚔️ Duelkort',
    companionHint: '{name} är ansluten via companionappen — poängkortet finns där.',
    winner: 'Vinnare',
  },
  da: {
    rivalCard: '⚔️ Duelkort',
    companionHint: '{name} er forbundet via companion-appen — scorekortet er tilgængeligt der.',
    winner: 'Vinder',
  },
  no: {
    rivalCard: '⚔️ Duelkort',
    companionHint: '{name} er koblet til via companion-appen — poengkortet er tilgjengelig der.',
    winner: 'Vinner',
  },
  fi: {
    rivalCard: '⚔️ Duellikortti',
    companionHint: '{name} on yhteydessä companion-sovelluksen kautta — pistekortti on saatavilla siellä.',
    winner: 'Voittaja',
  },
  ru: {
    rivalCard: '⚔️ Карта дуэли',
    companionHint: '{name} подключён через приложение-компаньон — его карточка результата доступна там.',
    winner: 'Победитель',
  },
  pl: {
    rivalCard: '⚔️ Karta pojedynku',
    companionHint: '{name} jest połączony przez aplikację towarzyszącą — jego karta wyników jest tam dostępna.',
    winner: 'Zwycięzca',
  },
  zh: {
    rivalCard: '⚔️ 对战卡',
    companionHint: '{name} 已通过伴侣应用连接 — 其成绩卡可在该应用中查看。',
    winner: '获胜者',
  },
  ja: {
    rivalCard: '⚔️ デュエルカード',
    companionHint: '{name} はコンパニオンアプリ経由で接続中 — スコアカードはそちらで確認できます。',
    winner: '勝者',
  },
  ko: {
    rivalCard: '⚔️ 듀얼 카드',
    companionHint: '{name}님이 컴패니언 앱에 연결되어 있습니다 — 점수 카드는 해당 앱에서 볼 수 있습니다.',
    winner: '승자',
  },
};

const locales = Object.keys(translations);
let changed = 0;
for (const lang of locales) {
  const path = `src/lib/i18n/locales/${lang}/core.ts`;
  let content = readFileSync(path, 'utf8');
  if (content.includes('rivalCard:')) {
    console.log(`SKIP ${lang} (already has rivalCard)`);
    continue;
  }
  // Insert right before the shareSection closing: find "shareSection: {" block, then the closing "}," after noAudioNote
  const anchor = content.match(/\n(\s*)noAudioNote: [^\n]*\n(\s*)\},/);
  if (!anchor) {
    console.error(`FAIL ${lang}: noAudioNote anchor not found`);
    process.exit(1);
  }
  const indent = anchor[1]; // indentation of keys inside shareSection
  const keys = translations[lang];
  const insertion = `\n${indent}rivalCard: ${JSON.stringify(keys.rivalCard)},`
    + `\n${indent}companionHint: ${JSON.stringify(keys.companionHint)},`
    + `\n${indent}winner: ${JSON.stringify(keys.winner)},`;
  content = content.replace(/\n(\s*)noAudioNote: [^\n]*\n(\s*)\},/, (m) => m.replace(/\n(\s*)\},$/, insertion + '\n$2},'));
  writeFileSync(path, content);
  changed++;
  console.log(`OK ${lang}`);
}
console.log(`Done: ${changed} locale files updated`);
