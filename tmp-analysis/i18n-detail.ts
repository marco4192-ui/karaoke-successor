import { getTranslations } from '../src/lib/i18n/locales/index';
const tr = getTranslations();
const enKeys = Object.keys(tr.en);
const esKeys = new Set(Object.keys(tr.es));
const missing = enKeys.filter(k => !esKeys.has(k));
const byTop: Record<string, string[]> = {};
for (const k of missing) {
  // Group by locale file: guess by top-level key
  const top = k.split('.')[0];
  (byTop[top] = byTop[top] || []).push(k);
}
for (const [top, keys] of Object.entries(byTop).sort((a,b) => b[1].length - a[1].length)) {
  console.log(`${top}: ${keys.length} keys`);
}
console.log('\n--- Sample of dailyTypes keys (first 10):');
console.log(missing.filter(k => k.startsWith('dailyTypes')).slice(0, 10).join('\n'));
console.log('\n--- Sample of dailyBadges keys:');
console.log(missing.filter(k => k.startsWith('dailyBadges')).slice(0, 6).join('\n'));
