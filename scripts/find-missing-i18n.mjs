import { readFileSync, writeFileSync } from 'fs';
import { resolve, join } from 'path';

const BASE = resolve('/home/z/my-project/karaoke-successor/src/lib/i18n/locales');
const REFERENCE_LANGS = ['en', 'de'];
const ALL_LANGS = ['da','de','en','es','fi','fr','it','ja','ko','nl','no','pl','pt','ru','sv','zh'];
const MODULES = ['core','game','library','medleyTournament','mobile','party','profile','settings'];

/**
 * Parse a TS file that exports `export const xxxTranslations = { ... }`
 * Returns a flat map of dot-path -> string value for all leaf string nodes.
 * e.g. "mobile.mirror.title" => "Mobile Integration"
 */
function extractTranslations(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  
  // Remove single-line comments
  let cleaned = content.replace(/\/\/.*$/gm, '');
  
  // Find the object literal body
  const match = cleaned.match(/export\s+const\s+\w+\s*=\s*\{([\s\S]*)\}\s*;?\s*$/);
  if (!match) return {};
  
  const body = match[1];
  const result = {};
  
  // Recursive parser for nested objects
  function parseObject(block, prefix = '') {
    // Match top-level keys with their values
    // Handles: key: 'value', key: "value", key: `value`, key: { nested }, key: { title: 'x', description: 'y' }
    let depth = 0;
    let i = 0;
    while (i < block.length) {
      // Skip whitespace
      while (i < block.length && /[\s,]/.test(block[i])) i++;
      if (i >= block.length) break;
      
      // Read key
      const keyMatch = block.substring(i).match(/^(\w+)\s*:/);
      if (!keyMatch) { i++; continue; }
      const key = keyMatch[1];
      i += keyMatch[0].length;
      
      // Skip whitespace after colon
      while (i < block.length && /\s/.test(block[i])) i++;
      if (i >= block.length) break;
      
      const char = block[i];
      
      if (char === '{') {
        // Nested object
        let objDepth = 1;
        let start = i + 1;
        i++;
        while (i < block.length && objDepth > 0) {
          if (block[i] === '{') objDepth++;
          if (block[i] === '}') objDepth--;
          // Skip strings
          if (block[i] === "'" || block[i] === '"' || block[i] === '`') {
            const q = block[i];
            i++;
            while (i < block.length && block[i] !== q) {
              if (block[i] === '\\') i++; // skip escaped char
              i++;
            }
          }
          if (objDepth > 0) i++;
        }
        const nestedBlock = block.substring(start, i);
        parseObject(nestedBlock, prefix ? `${prefix}.${key}` : key);
        i++; // skip closing }
      } else if (char === "'" || char === '"' || char === '`') {
        // String value
        const quote = char;
        i++;
        let value = '';
        while (i < block.length && block[i] !== quote) {
          if (block[i] === '\\') {
            i++;
            if (i < block.length) value += block[i];
          } else {
            value += block[i];
          }
          i++;
        }
        i++; // skip closing quote
        const fullKey = prefix ? `${prefix}.${key}` : key;
        result[fullKey] = value;
      } else {
        // Skip other values (numbers, etc.)
        while (i < block.length && block[i] !== ',' && block[i] !== '\n') i++;
      }
    }
  }
  
  parseObject(body);
  return result;
}

// Build reference key set (union of en + de)
const enTranslations = {};
const deTranslations = {};
for (const mod of MODULES) {
  const enPath = join(BASE, 'en', `${mod}.ts`);
  const dePath = join(BASE, 'de', `${mod}.ts`);
  Object.assign(enTranslations, extractTranslations(enPath));
  Object.assign(deTranslations, extractTranslations(dePath));
}

const allRefKeys = new Set([...Object.keys(enTranslations), ...Object.keys(deTranslations)]);
console.log(`Total reference keys (en+de union): ${allRefKeys.size}`);
console.log(`EN keys: ${Object.keys(enTranslations).length}, DE keys: ${Object.keys(deTranslations).length}`);

// For each non-reference language, find missing keys
const allMissing = {};
for (const lang of ALL_LANGS) {
  if (REFERENCE_LANGS.includes(lang)) continue;
  const langTranslations = {};
  for (const mod of MODULES) {
    const path = join(BASE, lang, `${mod}.ts`);
    Object.assign(langTranslations, extractTranslations(path));
  }
  const missing = [];
  for (const key of allRefKeys) {
    if (!(key in langTranslations)) {
      // Prefer EN, fallback to DE
      const value = enTranslations[key] || deTranslations[key] || '';
      missing.push({ key, value });
    }
  }
  allMissing[lang] = missing;
  if (missing.length > 0) {
    console.log(`\n=== ${lang.toUpperCase()} — ${missing.length} missing keys ===`);
    // Group by module
    const byMod = {};
    for (const m of missing) {
      const mod = m.key.split('.')[0];
      if (!byMod[mod]) byMod[mod] = [];
      byMod[mod].push(m);
    }
    for (const [mod, keys] of Object.entries(byMod)) {
      console.log(`  [${mod}] ${keys.length} missing`);
      for (const k of keys.slice(0, 5)) console.log(`    ${k.key}`);
      if (keys.length > 5) console.log(`    ... and ${keys.length - 5} more`);
    }
  } else {
    console.log(`\n=== ${lang.toUpperCase()} — complete ===`);
  }
}

// Output JSON for the fixer script
writeFileSync('/home/z/my-project/scripts/missing-i18n.json', JSON.stringify(allMissing, null, 2));
console.log('\nWrote missing-i18n.json');
