import { getTranslations } from '../src/lib/i18n/locales/index';
const tr = getTranslations();
const deBadges = Object.keys(tr.de).filter(k => k.startsWith('dailyBadges'));
const enBadges = Object.keys(tr.en).filter(k => k.startsWith('dailyBadges'));
console.log('DE dailyBadges keys:', deBadges.length, deBadges.slice(0, 4));
console.log('EN dailyBadges keys:', enBadges.length, enBadges.slice(0, 4));
console.log('DE sample value:', tr.de['dailyBadges.first-challenge.name']);
console.log('EN sample value:', tr.en['dailyBadges.first-challenge.name']);
