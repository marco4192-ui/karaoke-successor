// QR-Fix 6 (korrigiert): companion.controlLocked {name} ergänzen
import { readFileSync, writeFileSync } from 'fs';
const base = '/home/z/my-project/src/lib/i18n/locales';

const controlLockedFix: Record<string, string> = {
  es: 'Control: {name}', fr: 'Contrôle : {name}', it: 'Controllo: {name}', pt: 'Controle: {name}',
  zh: '控制：{name}', ru: 'Управление: {name}', nl: 'Bediening: {name}', pl: 'Kontrola: {name}',
  sv: 'Kontroll: {name}', no: 'Kontroll: {name}', da: 'Kontrol: {name}', fi: 'Ohjaus: {name}',
};

let fixes = 0;
const problems: string[] = [];
for (const [lang, val] of Object.entries(controlLockedFix)) {
  const mPath = `${base}/${lang}/mobile.ts`;
  let mt = readFileSync(mPath, 'utf8');
  // companion-Instanz = die direkt vor dem Sektions-Ende `},\nremoteControl: {` steht
  const re = /controlLocked: '(?![^']*\{name\})[^']*',(\n\},\nremoteControl: \{)/;
  if (re.test(mt)) {
    mt = mt.replace(re, `controlLocked: '${val}',$1`);
    writeFileSync(mPath, mt);
    fixes++;
  } else {
    problems.push(lang);
  }
}
console.log(`Fixes: ${fixes}, Probleme: ${problems.length ? problems.join(',') : 'keine'}`);
