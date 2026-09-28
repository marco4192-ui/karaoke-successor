// QR-Reparatur: Duplikat-Top-Level-Keys aus completion.ts entfernen und
// cptmWaiting in den bestehenden mobile-Block + pdfPages in den bestehenden
// editor.midiImport.sheetMusic-Block einfügen.
import { readFileSync, writeFileSync } from 'fs';

const base = '/home/z/my-project/src/lib/i18n/locales';

const cptmWaiting: Record<string, string> = {
  es: 'Esperando…', fr: 'En attente…', it: 'In attesa…', pt: 'À espera…',
  ja: '待機中…', ko: '대기 중…', zh: '等待中…', ru: 'Ожидание…', nl: 'Wachten…',
  pl: 'Oczekiwanie…', sv: 'Väntar…', no: 'Venter…', da: 'Venter…', fi: 'Odotetaan…',
};
const pdfPages: Record<string, string> = {
  es: 'Páginas del PDF', fr: 'Pages du PDF', it: 'Pagine del PDF', pt: 'Páginas do PDF',
  ja: 'PDFページ', ko: 'PDF 페이지', zh: 'PDF 页面', ru: 'Страницы PDF',
  nl: "PDF-pagina's", pl: 'Strony PDF', sv: 'PDF-sidor', no: 'PDF-sider',
  da: 'PDF-sider', fi: 'PDF-sivut',
};

const langs = Object.keys(cptmWaiting);
let fixes = 0;
const problems: string[] = [];

for (const lang of langs) {
  const p = `${base}/${lang}/completion.ts`;
  let s = readFileSync(p, 'utf8');

  // 1) Duplikat-Block entfernen (mobile + editor aus dem QR-Anhang)
  const dupRe = /\n  mobile: \{\n    cptmWaiting: '[^']*',\n  \},\n  editor: \{\n    midiImport: \{\n      sheetMusic: \{\n        pdfPages: '[^']*',\n      \},\n    \},\n  \},/;
  if (dupRe.test(s)) {
    s = s.replace(dupRe, '');
  } else {
    problems.push(`${lang}: Duplikat-Block nicht gefunden`);
    continue;
  }

  // 2) cptmWaiting in den ERSTEN bestehenden mobile-Block einfügen
  const mobileAnchor = '\n  mobile: {';
  const idx = s.indexOf(mobileAnchor);
  if (idx === -1) { problems.push(`${lang}: kein mobile-Block`); continue; }
  s = s.slice(0, idx + mobileAnchor.length) + `\n    cptmWaiting: '${cptmWaiting[lang]}',` + s.slice(idx + mobileAnchor.length);

  // 3) pdfPages in den ERSTEN bestehenden sheetMusic-Block einfügen
  const smAnchor = '\n      sheetMusic: {';
  const smIdx = s.indexOf(smAnchor);
  if (smIdx === -1) { problems.push(`${lang}: kein sheetMusic-Block`); continue; }
  s = s.slice(0, smIdx + smAnchor.length) + `\n        pdfPages: '${pdfPages[lang]}',` + s.slice(smIdx + smAnchor.length);

  writeFileSync(p, s);
  fixes++;
  // Verifikation: nur noch EIN top-level mobile: und EIN editor:
  const count = (re: RegExp) => (s.match(re) || []).length;
  const nMobile = count(/^  mobile: \{/gm);
  const nEditor = count(/^  editor: \{/gm);
  const nMobileMic = count(/^  mobileMicView: \{/gm);
  const nPitch = count(/^  pitchGraph: \{/gm);
  if (nMobile !== 1 || nEditor !== 1 || nMobileMic !== 1 || nPitch !== 1) {
    problems.push(`${lang}: Struktur mobile=${nMobile} editor=${nEditor} mobileMicView=${nMobileMic} pitchGraph=${nPitch}`);
  }
}

console.log(`Repariert: ${fixes}/14`);
console.log(problems.length ? 'PROBLEME:\n  ' + problems.join('\n  ') : 'Struktur-Check aller Dateien OK (je 1× mobile, editor, mobileMicView, pitchGraph)');
