import { readFileSync } from 'fs';
import { resolve, join } from 'path';

const BASE = resolve('/home/z/my-project/karaoke-successor/src/lib/i18n/locales');
const MODULES = ['core','game','library','medleyTournament','mobile','party','profile','settings'];

// Reuse the parser from fix-missing-i18n.mjs (simplified inline)
function extractKeys(file) {
  let c = readFileSync(file, 'utf-8');
  let pos = 0;
  function skip() {
    while (pos < c.length && /[\s,]/.test(c[pos])) pos++;
    if (c[pos] === '/' && c[pos+1] === '/') { while (pos < c.length && c[pos] !== '\n') pos++; skip(); }
  }
  function parseStr() {
    const q = c[pos]; pos++;
    let r = '';
    while (pos < c.length && c[pos] !== q) {
      if (c[pos] === '\\') { pos++; r += c[pos] || ''; } else r += c[pos];
      pos++;
    }
    pos++;
    return r;
  }
  function parseObj() {
    pos++;
    const o = {};
    skip();
    while (pos < c.length && c[pos] !== '}') {
      let k;
      if (c[pos] === "'" || c[pos] === '"') k = parseStr();
      else { let s = pos; while (/[\w$]/.test(c[pos])) pos++; k = c.substring(s, pos); }
      skip();
      if (c[pos] === ':') pos++;
      skip();
      let v;
      if (c[pos] === '{') v = parseObj();
      else if (c[pos] === "'" || c[pos] === '"') v = parseStr();
      else { while (pos < c.length && c[pos] !== ',' && c[pos] !== '}') pos++; v = undefined; }
      if (k) o[k] = v;
      skip();
    }
    pos++;
    return o;
  }
  const bi = c.indexOf('{');
  pos = bi;
  const obj = parseObj();
  const paths = {};
  function flat(o, p = '') {
    for (const [k, v] of Object.entries(o)) {
      const f = p ? p + '.' + k : k;
      if (typeof v === 'string') paths[f] = v;
      else if (v && typeof v === 'object') flat(v, f);
    }
  }
  flat(obj);
  return paths;
}

const enKeys = {};
const deKeys = {};
for (const m of MODULES) {
  Object.assign(enKeys, extractKeys(join(BASE, 'en', m + '.ts')));
  Object.assign(deKeys, extractKeys(join(BASE, 'de', m + '.ts')));
}

const deOnly = [];
for (const k of Object.keys(deKeys)) if (!(k in enKeys)) deOnly.push(k);
console.log('DE-only keys (' + deOnly.length + '):');
for (const k of deOnly) console.log('  ' + k);

const enOnly = [];
for (const k of Object.keys(enKeys)) if (!(k in deKeys)) enOnly.push(k);
console.log('EN-only keys (' + enOnly.length + '):');
for (const k of enOnly) console.log('  ' + k);
