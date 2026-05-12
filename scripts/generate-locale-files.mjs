#!/usr/bin/env node
/**
 * Generate individual TypeScript locale files from JSON source files.
 * Each file exports a const with the translations object.
 */
import { readFileSync, writeFileSync } from 'fs';

const LOCALES_DIR = 'scripts/locales-json';
const TS_DIR = 'src/lib/i18n/locales';

const languages = ['en', 'de', 'es', 'fr', 'it', 'pt', 'ja', 'ko', 'zh', 'ru', 'nl', 'pl', 'sv', 'no', 'da', 'fi'];

// Convert a JSON value to TypeScript source
function jsonToTs(value, indent = 2) {
  const spaces = ' '.repeat(indent);
  if (typeof value === 'string') {
    // Escape single quotes and backslashes
    const escaped = value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    return `'${escaped}'`;
  }
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const entries = Object.entries(value);
    if (entries.length === 0) return '{}';
    const inner = entries.map(([k, v]) => {
      const key = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? k : `'${k}'`;
      return `${spaces}  ${key}: ${jsonToTs(v, indent + 2)}`;
    }).join(',\n');
    return `{\n${inner}\n${spaces}}`;
  }
  return JSON.stringify(value);
}

for (const lang of languages) {
  const jsonPath = `${LOCALES_DIR}/${lang}.json`;
  const tsPath = `${TS_DIR}/${lang}.ts`;
  
  let data;
  try {
    data = JSON.parse(readFileSync(jsonPath, 'utf8'));
  } catch (e) {
    console.error(`Skipping ${lang}: ${e.message}`);
    continue;
  }
  
  const varName = `${lang}Translations`;
  const tsContent = `// Auto-generated translations for ${lang.toUpperCase()}\n// Do not edit manually — run scripts/generate-locale-files.mjs instead\n\nexport const ${varName} = ${jsonToTs(data, 2)} as const;\n`;
  
  writeFileSync(tsPath, tsContent, 'utf8');
  
  // Count keys
  function countKeys(o) {
    let c = 0;
    for (const v of Object.values(o)) {
      if (typeof v === 'string') c++;
      else if (typeof v === 'object' && v !== null) c += countKeys(v);
    }
    return c;
  }
  console.log(`${lang}.ts: ${countKeys(data)} keys`);
}

console.log('\nDone generating TypeScript locale files!');
