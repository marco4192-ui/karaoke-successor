/**
 * Fix missing i18n translations across all languages.
 * Uses EN as the reference — any missing key gets the EN value.
 * 
 * Approach: Instead of eval, we use a custom parser that handles TS object literals.
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, join } from 'path';

const BASE = resolve('/home/z/my-project/karaoke-successor/src/lib/i18n/locales');
const LANGS_TO_FIX = ['da','es','fi','fr','it','ja','ko','nl','no','pl','pt','ru','sv','zh'];
const MODULES = ['core','game','library','medleyTournament','mobile','party','profile','settings'];

/**
 * Parse a TS file that exports `export const xxxTranslations = { ... }`.
 * Returns a nested JS object. Uses a simple recursive descent parser.
 */
function parseTSObject(content) {
  let pos = 0;
  
  function skipWhitespaceAndComments() {
    while (pos < content.length) {
      // Skip whitespace
      if (/[\s,]/.test(content[pos])) { pos++; continue; }
      // Skip single-line comments
      if (content[pos] === '/' && content[pos+1] === '/') {
        while (pos < content.length && content[pos] !== '\n') pos++;
        continue;
      }
      // Skip multi-line comments
      if (content[pos] === '/' && content[pos+1] === '*') {
        pos += 2;
        while (pos < content.length && !(content[pos] === '*' && content[pos+1] === '/')) pos++;
        pos += 2;
        continue;
      }
      break;
    }
  }
  
  function parseValue() {
    skipWhitespaceAndComments();
    if (pos >= content.length) return undefined;
    
    const ch = content[pos];
    
    if (ch === '{') return parseObj();
    if (ch === '[') return parseArr();
    if (ch === "'" || ch === '"' || ch === '`') return parseString();
    if (ch === '-' || /\d/.test(ch)) return parseNumber();
    // Handle keywords
    if (content.substring(pos, pos+4) === 'true') { pos += 4; return true; }
    if (content.substring(pos, pos+5) === 'false') { pos += 5; return false; }
    if (content.substring(pos, pos+4) === 'null') { pos += 4; return null; }
    // Unknown - skip to next comma or brace
    while (pos < content.length && content[pos] !== ',' && content[pos] !== '}' && content[pos] !== ']') pos++;
    return undefined;
  }
  
  function parseString() {
    const quote = content[pos];
    pos++;
    let result = '';
    while (pos < content.length && content[pos] !== quote) {
      if (content[pos] === '\\') {
        pos++;
        if (pos < content.length) {
          const esc = content[pos];
          if (esc === 'n') result += '\n';
          else if (esc === 't') result += '\t';
          else if (esc === 'r') result += '\r';
          else result += esc;
        }
      } else {
        result += content[pos];
      }
      pos++;
    }
    pos++; // skip closing quote
    return result;
  }
  
  function parseNumber() {
    let start = pos;
    if (content[pos] === '-') pos++;
    while (pos < content.length && /\d/.test(content[pos])) pos++;
    if (content[pos] === '.') { pos++; while (pos < content.length && /\d/.test(content[pos])) pos++; }
    return parseFloat(content.substring(start, pos));
  }
  
  function parseObj() {
    pos++; // skip {
    const obj = {};
    skipWhitespaceAndComments();
    while (pos < content.length && content[pos] !== '}') {
      // Read key
      let key;
      if (content[pos] === "'" || content[pos] === '"') {
        key = parseString();
      } else {
        // Identifier key (import, export, etc.)
        let start = pos;
        while (pos < content.length && /[\w$]/.test(content[pos])) pos++;
        key = content.substring(start, pos);
      }
      skipWhitespaceAndComments();
      if (content[pos] === ':') pos++;
      const value = parseValue();
      if (key !== undefined && key !== '') {
        obj[key] = value;
      }
      skipWhitespaceAndComments();
    }
    pos++; // skip }
    return obj;
  }
  
  function parseArr() {
    pos++; // skip [
    const arr = [];
    skipWhitespaceAndComments();
    while (pos < content.length && content[pos] !== ']') {
      arr.push(parseValue());
      skipWhitespaceAndComments();
    }
    pos++; // skip ]
    return arr;
  }
  
  // Find the first { in the content (skip to export const xxx = {)
  const braceIdx = content.indexOf('{');
  if (braceIdx === -1) return {};
  pos = braceIdx;
  return parseObj();
}

/**
 * Get all leaf keys from an object as dot-paths.
 */
function getLeafPaths(obj, prefix = '') {
  const paths = {};
  if (!obj || typeof obj !== 'object') return paths;
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      paths[fullKey] = value;
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(paths, getLeafPaths(value, fullKey));
    }
  }
  return paths;
}

/**
 * Set a nested value in an object using dot-path.
 */
function setNestedValue(obj, path, value) {
  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!(parts[i] in current) || typeof current[parts[i]] !== 'object' || current[parts[i]] === null) {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
}

/**
 * Format a JS object as a TypeScript-style string with single quotes.
 */
function formatObject(obj, indent = 0) {
  const spaces = '  '.repeat(indent);
  const innerSpaces = '  '.repeat(indent + 1);
  const lines = [];
  
  const entries = Object.entries(obj);
 entries.forEach(([key, value], idx) => {
    // Quote keys that are not valid JS identifiers
    const needsQuoting = !/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key);
    const keyStr = needsQuoting ? "'" + key.replace(/'/g, "\\'") + "'" : key;
    if (typeof value === 'string') {
      const escaped = value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r');
      const comma = idx < entries.length - 1 ? ',' : '';
      lines.push(`${innerSpaces}${keyStr}: '${escaped}'${comma}`);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const comma = idx < entries.length - 1 ? ',' : '';
      lines.push(`${innerSpaces}${keyStr}: {`);
      lines.push(formatObject(value, indent + 1));
      lines.push(`${innerSpaces}}${comma}`);
    }
  });
  
  return lines.join('\n');
}

/**
 * Write a translation object back to a TS file.
 */
function writeTranslations(filePath, obj, moduleName, langCode) {
  const varName = `${moduleName}Translations`;
  const header = `// ${langCode} translations — ${moduleName}\n// Auto-split from monolithic locale file\n\nexport const ${varName} = {`;
  const footer = '\n};\n';
  const body = formatObject(obj, 0);
  writeFileSync(filePath, header + '\n' + body + footer, 'utf-8');
}

// Load English translations (reference)
console.log('Loading reference translations...');
const enByModule = {};
for (const mod of MODULES) {
  const content = readFileSync(join(BASE, 'en', `${mod}.ts`), 'utf-8');
  const obj = parseTSObject(content);
  enByModule[mod] = getLeafPaths(obj);
}
console.log(`EN keys: ${Object.values(enByModule).reduce((s,m) => s + Object.keys(m).length, 0)}`);

// Load German translations for any keys only in DE
const deByModule = {};
for (const mod of MODULES) {
  const content = readFileSync(join(BASE, 'de', `${mod}.ts`), 'utf-8');
  const obj = parseTSObject(content);
  deByModule[mod] = getLeafPaths(obj);
}
console.log(`DE keys: ${Object.values(deByModule).reduce((s,m) => s + Object.keys(m).length, 0)}`);

const LANG_NAMES = {
  da: 'DA', es: 'ES', fi: 'FI', fr: 'FR', it: 'IT',
  ja: 'JA', ko: 'KO', nl: 'NL', no: 'NO', pl: 'PL',
  pt: 'PT', ru: 'RU', sv: 'SV', zh: 'ZH'
};

for (const lang of LANGS_TO_FIX) {
  const LANG_CODE = LANG_NAMES[lang];
  console.log(`\n=== Processing ${lang.toUpperCase()} ===`);
  let langTotal = 0;

  for (const mod of MODULES) {
    const filePath = join(BASE, lang, `${mod}.ts`);
    const content = readFileSync(filePath, 'utf-8');
    const langObj = parseTSObject(content);
    const langPaths = getLeafPaths(langObj);

    // Merge EN + DE reference keys for this module
    const refKeys = { ...enByModule[mod], ...deByModule[mod] };

    let added = 0;
    for (const [key, enValue] of Object.entries(refKeys)) {
      if (!(key in langPaths)) {
        // Use English value as fallback
        setNestedValue(langObj, key, enValue);
        added++;
      }
    }

    if (added > 0) {
      writeTranslations(filePath, langObj, mod, LANG_CODE);
      console.log(`  ${mod}: +${added} keys`);
      langTotal += added;
    }
  }

  console.log(`  Total: +${langTotal} keys`);
}

console.log('\nAll done!');
