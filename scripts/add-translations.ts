// Script to add missing translation keys to all locale files
import * as fs from 'fs';
import * as path from 'path';

const LOCALE_DIR = path.join(__dirname, '../src/lib/i18n/locales');

// Translation map: key -> { de, en, it, nl, da, sv, pt, fr, ko, zh, ru, no, pl, fi, es, ja }
const TRANSLATIONS: Record<string, Record<string, string>> = {
  'mobile.mirrorRestart': {
    de: 'Neustart', en: 'Restart', it: 'Riavvia', nl: 'Herstart',
    da: 'Genstart', sv: 'Starta om', pt: 'Reiniciar', fr: 'Redemarrer',
    ko: '다시 시작', zh: '重新开始', ru: 'Перезапуск', no: 'Start på nytt',
    pl: 'Uruchom ponownie', fi: 'Käynnistä uudelleen', es: 'Reiniciar', ja: '再生',
  },
  'mobile.mirrorPause': {
    de: 'Pause', en: 'Pause', it: 'Pausa', nl: 'Pauze',
    da: 'Pause', sv: 'Pausa', pt: 'Pausar', fr: 'Pause',
    ko: '일시중지', zh: '暂停', ru: 'Пауза', no: 'Pause',
    pl: 'Pauza', fi: 'Tauko', es: 'Pausar', ja: '一時停止',
  },
  'mobile.mirrorPlay': {
    de: 'Abspielen', en: 'Play', it: 'Riproduci', nl: 'Afspelen',
    da: 'Afspil', sv: 'Spela upp', pt: 'Reproduzir', fr: 'Lecture',
    ko: '재생', zh: '播放', ru: 'Воспроизвести', no: 'Spill av',
    pl: 'Odtwórz', fi: 'Toista', es: 'Reproducir', ja: '再生',
  },
  'mobile.mirrorSkip': {
    de: 'Überspringen', en: 'Skip', it: 'Salta', nl: 'Overslaan',
    da: 'Spring over', sv: 'Hoppa över', pt: 'Pular', fr: 'Passer',
    ko: '건너뛰기', zh: '跳过', ru: 'Пропустить', no: 'Hopp over',
    pl: 'Pomiń', fi: 'Ohita', es: 'Saltar', ja: 'スキップ',
  },
  'mobile.mirrorResume': {
    de: 'Fortfahren', en: 'Resume', it: 'Riprendi', nl: 'Hervatten',
    da: 'Fortsæt', sv: 'Återuppta', pt: 'Continuar', fr: 'Reprendre',
    ko: '공박', zh: '继续', ru: 'Продолжить', no: 'Fortsett',
    pl: 'Wznów', fi: 'Jatka', es: 'Continuar', ja: '再開',
  },
  'mobile.mirrorAbortSong': {
    de: 'Song beenden', en: 'End Song', it: 'Fine brano', nl: 'Nummer beëindigen',
    da: 'Afslut sang', sv: 'Avsluta sång', pt: 'Encerrar música', fr: 'Terminer le morceau',
    ko: '노래 종료', zh: '结束歌曲', ru: 'Завершить песню', no: 'Avslutt sang',
    pl: 'Zakończ piosenkę', fi: 'Lopeta kappale', es: 'Terminar canción', ja: '曲を終了',
  },
  'mobile.mirrorPauseTitle': {
    de: 'Pausiert', en: 'Paused', it: 'In pausa', nl: 'Gepauzeerd',
    da: 'Pauset', sv: 'Pausad', pt: 'Pausado', fr: 'En pause',
    ko: '일시중지', zh: '已暂停', ru: 'Пауза', no: 'Pauset',
    pl: 'Zapauzowane', fi: 'Tauko', es: 'En pausa', ja: '一時停止中',
  },
  'mobile.mirrorSongRunningWarning': {
    de: 'Achtung: Ein Song läuft gerade!', en: 'Warning: A song is currently playing!', it: 'Attenzione: è in riproduzione un brano!', nl: 'Let op: er wordt nu een nummer afgespeeld!',
    da: 'Advarsel: En sang spilles lige nu!', sv: 'Varning: En låt spelas just nu!', pt: 'Atenção: Uma música está tocando!', fr: 'Attention : un morceau est en cours !',
    ko: '경고: 노래가 재생 중입니다!', zh: '注意：正在播放歌曲！', ru: 'Внимание: Песня сейчас играет!', no: 'Advarsel: En sang spilles nå!',
    pl: 'Uwaga: Piosenka jest teraz odtwarzana!', fi: 'Huom: Kappale on käynnissä!', es: '¡Atención: ¡Hay una canción en reproducción!', ja: '警告：曲が再生中です！',
  },
  'mobile.mirrorEndSong': {
    de: 'Song beenden', en: 'End Song', it: 'Fine brano', nl: 'Nummer beëindigen',
    da: 'Afslut sang', sv: 'Avsluta sång', pt: 'Encerrar música', fr: 'Terminer',
    ko: '노래 종료', zh: '结束歌曲', ru: 'Завершить', no: 'Avslutt sang',
    pl: 'Zakończ piosenkę', fi: 'Lopeta kappale', es: 'Terminar canción', ja: '曲を終了',
  },
  'mobile.mirrorReleaseControlShort': {
    de: 'Kontrolle abgeben', en: 'Release Control', it: 'Rilascia controllo', nl: 'Beheer loslaten',
    da: 'Frigør kontrol', sv: 'Släpp kontroll', pt: 'Liberar controle', fr: 'Libérer le contrôle',
    ko: '컨트롤 베주', zh: '释放控制', ru: 'Отпустить управление', no: 'Slipp kontroll',
    pl: 'Puść kontrolę', fi: 'Luovuta hallinta', es: 'Liberar control', ja: '操作を解除',
  },
  'mobile.mirrorSongRunningDesc': {
    de: 'Während ein Song läuft, kann die Steuerung nicht verlassen werden.', en: 'While a song is playing, you cannot leave the controller.', it: 'Durante la riproduzione non puoi abbandonare il controllo.', nl: 'Tijdens het afspelen kun je de besturing niet verlaten.',
    da: 'Mens en sang spilles, kan du ikke forlade betjeningen.', sv: 'Under låtens uppspelning kan du inte lämna kontrollen.', pt: 'Enquanto uma música toca, você não pode abandonar o controle.', fr: 'Pendant la lecture, vous ne pouvez pas quitter le contrôle.',
    ko: '노래 재생 중에는 컨트롤을 반환할 수 없습니다.', zh: '歌曲播放期间无法释放控制。', ru: 'Пока играет песня, нельзя освободить управление.', no: 'Mens en sang spilles, kan du ikke slippe kontrollen.',
    pl: 'Podczas odtwarzania piosenki nie możesz opuścić kontroli.', fi: 'Kappaleen toiston aikana et voi luopua hallinnasta.', es: 'Mientras suena una canción, no puedes liberar el control.', ja: '曲再生中は操作を解除できません。',
  },
};

const LOCALES = ['de', 'en', 'it', 'nl', 'da', 'sv', 'pt', 'fr', 'ko', 'zh', 'ru', 'no', 'pl', 'fi', 'es', 'ja'];

function processFile(filePath: string, locale: string) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let changed = false;

  for (const [key, translations] of Object.entries(TRANSLATIONS)) {
    const value = translations[locale];
    if (!value) continue;

    // Key is like 'mobile.mirrorRestart' — we need to find the `mobile:` section
    // and add `  mirrorRestart: 'value',` if it doesn't exist
    const shortKey = key.split('.')[1]; // 'mirrorRestart'
    const searchPattern = `  ${shortKey}:`;

    if (content.includes(searchPattern)) {
      continue; // Already exists
    }

    // Find the `mobile: {` section and add the key near mirrorCancel (line ~119)
    // Insert after the last existing mirror* key
    const insertAfter = '  mirrorCancel:';
    if (content.includes(insertAfter)) {
      content = content.replace(
        insertAfter,
        `${insertAfter}
  ${shortKey}: '${value}',`
      );
      changed = true;
    } else {
      // Fallback: add before the closing `},` of mobile section
      const mobileSectionEnd = /mobile: \{[\s\S]*?^\},/m;
      if (mobileSectionEnd.test(content)) {
        content = content.replace(
          mobileSectionEnd,
          (match) => match.replace(/^\},/m, `  ${shortKey}: '${value}',\n},`)
        );
        changed = true;
      }
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`  Updated ${locale}/mobile.ts`);
  } else {
    console.log(`  No changes needed for ${locale}/mobile.ts`);
  }
}

console.log('Adding translations to all locales...');
for (const locale of LOCALES) {
  const filePath = path.join(LOCALE_DIR, locale, 'mobile.ts');
  if (fs.existsSync(filePath)) {
    processFile(filePath, locale);
  } else {
    console.log(`  SKIP: ${locale}/mobile.ts not found`);
  }
}
console.log('Done!');
