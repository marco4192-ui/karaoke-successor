const fs = require('fs');
const path = require('path');
const LOCALES = ['de','en','it','nl','da','sv','pt','fr','ko','zh','ru','no','pl','fi','es','ja'];
const CANCEL = {de:"'Abbrechen'",en:"'Cancel'",it:"'Annulla'",nl:"'Annuleren'",da:"'Annuller'",sv:"'Avbryt'",pt:"'Cancelar'",fr:"'Annuler'",ko:"'\uBCF4\uAE30'",zh:"'\u53D6\u6D88'",ru:"'\u041E\u0442\u043C\u0435\u043D\u0430'",no:"'Avbryt'",pl:"'Anuluj'",fi:"'Peruuta'",es:"'Cancelar'",ja:"'\u30AD\u30E3\u30F3\u30BB\u30EB'"};
for (const lang of LOCALES) {
  const fp = path.join('src/lib/i18n/locales', lang, 'mobile.ts');
  let c = fs.readFileSync(fp, 'utf8');
  c = c.replace(/  mirrorCancel:\s*\n/, '  mirrorCancel: ' + CANCEL[lang] + ',\n');
  fs.writeFileSync(fp, c, 'utf8');
  console.log('Fixed ' + lang);
}
