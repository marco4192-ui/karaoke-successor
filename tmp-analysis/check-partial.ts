import * as fs from 'fs';
// For each language & file & top-block in missing JSON, check if block already exists in the TS file (as a key)
const langs = ['de','es','fr','it','pt','ja','ko','zh','ru','nl','pl','sv','no','da','fi'];
const summary: Record<string, Record<string, string[]>> = {};
for (const lang of langs) {
  const data = JSON.parse(fs.readFileSync(`tmp-analysis/missing-${lang}.json`, 'utf8'));
  for (const [file, blocks] of Object.entries<any>(data.missingByFile)) {
    const path = `src/lib/i18n/locales/${lang}/${file}.ts`;
    let content = '';
    try { content = fs.readFileSync(path, 'utf8'); } catch { content = ''; }
    for (const block of Object.keys(blocks)) {
      const exists = new RegExp(`\\b${block}\\s*:`).test(content);
      if (exists) {
        (summary[lang] = summary[lang] || {})[file] = (summary[lang][file] || []).concat(`${block}(PARTIAL)`);
      }
    }
  }
}
for (const [lang, files] of Object.entries(summary)) {
  console.log(lang, JSON.stringify(files));
}
console.log('\n(Diese Blöcke existieren bereits teilweise -> Agenten müssen IN sie mergen)');
