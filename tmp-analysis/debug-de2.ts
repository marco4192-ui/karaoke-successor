import { getTranslations } from '../src/lib/i18n/locales/index';
const tr = getTranslations();
const nested = Object.keys(tr.de).filter(k => k.startsWith('dailyChallenge.dailyBadges'));
console.log('nested dailyChallenge.dailyBadges.* count:', nested.length, nested.slice(0,4));
// where does EN have it?
console.log('EN dailyChallenge.dailyBadges?', Object.keys(tr.en).filter(k => k.startsWith('dailyChallenge.dailyBadges')).length);
