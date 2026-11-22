// Repair the botched insertion: "...noAudioNote: '...'\n    rivalCard..." -> add comma + fix "$2}," -> "},"
import { readFileSync, writeFileSync } from 'node:fs';
const langs = ['en','de','fr','es','it','pt','nl','sv','da','no','fi','ru','pl','zh','ja','ko'];
let fixed = 0;
for (const lang of langs) {
  const path = `src/lib/i18n/locales/${lang}/core.ts`;
  let content = readFileSync(path, 'utf8');
  const before = content;
  // 1) noAudioNote line lost its trailing comma (was last key, now isn't)
  content = content.replace(/(noAudioNote: [^\n]*?)(\n(\s*)rivalCard:)/, '$1,$2');
  // 2) literal "$2}," -> "}," (with the original 2-space indent)
  content = content.replace(/\$2\},/, '},');
  if (content !== before) { writeFileSync(path, content); fixed++; console.log(`FIXED ${lang}`); }
  else console.log(`CLEAN ${lang}`);
}
console.log(`${fixed} files repaired`);
