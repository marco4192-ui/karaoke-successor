import { readFileSync, writeFileSync } from 'node:fs';
const langs = ['en','de','fr','es','it','pt','nl','sv','da','no','fi','ru','pl','zh','ja','ko'];
let fixed = 0;
for (const lang of langs) {
  const path = `src/lib/i18n/locales/${lang}/core.ts`;
  let content = readFileSync(path, 'utf8');
  const before = content;
  content = content.replace(/(noAudioNote: [^\n]*?),,/, '$1,');
  if (content !== before) { writeFileSync(path, content); fixed++; }
}
console.log(`${fixed} files repaired`);
