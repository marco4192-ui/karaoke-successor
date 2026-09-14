import type { Language } from '@/lib/i18n/locales';

/**
 * Full ISO 3166-1 alpha-2 country list (all 249 officially assigned codes).
 * Country names are localized at runtime via the browser's Intl.DisplayNames
 * API — it natively supports every app language (en, de, es, fr, it, pt, ja,
 * ko, zh, ru, nl, pl, sv, no, da, fi) and works offline. The English names
 * below are only a fallback for ancient browsers without Intl.DisplayNames.
 */

export interface CountryOption {
  code: string;
  /** English fallback name (used when Intl.DisplayNames is unavailable). */
  name: string;
  /** Flag emoji, generated from the ISO code. */
  flag: string;
}

/** [ISO-3166-1 alpha-2, English name] — the complete officially assigned list. */
const ISO_COUNTRIES: ReadonlyArray<readonly [string, string]> = [
  ['AD', 'Andorra'], ['AE', 'United Arab Emirates'], ['AF', 'Afghanistan'],
  ['AG', 'Antigua and Barbuda'], ['AI', 'Anguilla'], ['AL', 'Albania'],
  ['AM', 'Armenia'], ['AO', 'Angola'], ['AQ', 'Antarctica'], ['AR', 'Argentina'],
  ['AS', 'American Samoa'], ['AT', 'Austria'], ['AU', 'Australia'], ['AW', 'Aruba'],
  ['AX', 'Åland Islands'], ['AZ', 'Azerbaijan'],
  ['BA', 'Bosnia and Herzegovina'], ['BB', 'Barbados'], ['BD', 'Bangladesh'],
  ['BE', 'Belgium'], ['BF', 'Burkina Faso'], ['BG', 'Bulgaria'], ['BH', 'Bahrain'],
  ['BI', 'Burundi'], ['BJ', 'Benin'], ['BL', 'Saint Barthélemy'], ['BM', 'Bermuda'],
  ['BN', 'Brunei'], ['BO', 'Bolivia'], ['BQ', 'Caribbean Netherlands'],
  ['BR', 'Brazil'], ['BS', 'Bahamas'], ['BT', 'Bhutan'], ['BV', 'Bouvet Island'],
  ['BW', 'Botswana'], ['BY', 'Belarus'], ['BZ', 'Belize'],
  ['CA', 'Canada'], ['CC', 'Cocos Islands'], ['CD', 'DR Congo'],
  ['CF', 'Central African Republic'], ['CG', 'Congo'], ['CH', 'Switzerland'],
  ['CI', 'Côte d’Ivoire'], ['CK', 'Cook Islands'], ['CL', 'Chile'],
  ['CM', 'Cameroon'], ['CN', 'China'], ['CO', 'Colombia'], ['CR', 'Costa Rica'],
  ['CU', 'Cuba'], ['CV', 'Cape Verde'], ['CW', 'Curaçao'],
  ['CX', 'Christmas Island'], ['CY', 'Cyprus'], ['CZ', 'Czechia'],
  ['DE', 'Germany'], ['DJ', 'Djibouti'], ['DK', 'Denmark'], ['DM', 'Dominica'],
  ['DO', 'Dominican Republic'], ['DZ', 'Algeria'],
  ['EC', 'Ecuador'], ['EE', 'Estonia'], ['EG', 'Egypt'], ['EH', 'Western Sahara'],
  ['ER', 'Eritrea'], ['ES', 'Spain'], ['ET', 'Ethiopia'],
  ['FI', 'Finland'], ['FJ', 'Fiji'], ['FK', 'Falkland Islands'],
  ['FM', 'Micronesia'], ['FO', 'Faroe Islands'], ['FR', 'France'],
  ['GA', 'Gabon'], ['GB', 'United Kingdom'], ['GD', 'Grenada'], ['GE', 'Georgia'],
  ['GF', 'French Guiana'], ['GG', 'Guernsey'], ['GH', 'Ghana'],
  ['GI', 'Gibraltar'], ['GL', 'Greenland'], ['GM', 'Gambia'], ['GN', 'Guinea'],
  ['GP', 'Guadeloupe'], ['GQ', 'Equatorial Guinea'], ['GR', 'Greece'],
  ['GS', 'South Georgia'], ['GT', 'Guatemala'], ['GU', 'Guam'],
  ['GW', 'Guinea-Bissau'], ['GY', 'Guyana'],
  ['HK', 'Hong Kong'], ['HM', 'Heard Island'], ['HN', 'Honduras'],
  ['HR', 'Croatia'], ['HT', 'Haiti'], ['HU', 'Hungary'],
  ['ID', 'Indonesia'], ['IE', 'Ireland'], ['IL', 'Israel'], ['IM', 'Isle of Man'],
  ['IN', 'India'], ['IO', 'British Indian Ocean Territory'], ['IQ', 'Iraq'],
  ['IR', 'Iran'], ['IS', 'Iceland'], ['IT', 'Italy'],
  ['JE', 'Jersey'], ['JM', 'Jamaica'], ['JO', 'Jordan'], ['JP', 'Japan'],
  ['KE', 'Kenya'], ['KG', 'Kyrgyzstan'], ['KH', 'Cambodia'], ['KI', 'Kiribati'],
  ['KM', 'Comoros'], ['KN', 'Saint Kitts and Nevis'], ['KP', 'North Korea'],
  ['KR', 'South Korea'], ['KW', 'Kuwait'], ['KY', 'Cayman Islands'],
  ['KZ', 'Kazakhstan'],
  ['LA', 'Laos'], ['LB', 'Lebanon'], ['LC', 'Saint Lucia'],
  ['LI', 'Liechtenstein'], ['LK', 'Sri Lanka'], ['LR', 'Liberia'],
  ['LS', 'Lesotho'], ['LT', 'Lithuania'], ['LU', 'Luxembourg'], ['LV', 'Latvia'],
  ['LY', 'Libya'],
  ['MA', 'Morocco'], ['MC', 'Monaco'], ['MD', 'Moldova'], ['ME', 'Montenegro'],
  ['MF', 'Saint Martin'], ['MG', 'Madagascar'], ['MH', 'Marshall Islands'],
  ['MK', 'North Macedonia'], ['ML', 'Mali'], ['MM', 'Myanmar'], ['MN', 'Mongolia'],
  ['MO', 'Macau'], ['MP', 'Northern Mariana Islands'], ['MQ', 'Martinique'],
  ['MR', 'Mauritania'], ['MS', 'Montserrat'], ['MT', 'Malta'], ['MU', 'Mauritius'],
  ['MV', 'Maldives'], ['MW', 'Malawi'], ['MX', 'Mexico'], ['MY', 'Malaysia'],
  ['MZ', 'Mozambique'],
  ['NA', 'Namibia'], ['NC', 'New Caledonia'], ['NE', 'Niger'],
  ['NF', 'Norfolk Island'], ['NG', 'Nigeria'], ['NI', 'Nicaragua'],
  ['NL', 'Netherlands'], ['NO', 'Norway'], ['NP', 'Nepal'], ['NR', 'Nauru'],
  ['NU', 'Niue'], ['NZ', 'New Zealand'],
  ['OM', 'Oman'],
  ['PA', 'Panama'], ['PE', 'Peru'], ['PF', 'French Polynesia'],
  ['PG', 'Papua New Guinea'], ['PH', 'Philippines'], ['PK', 'Pakistan'],
  ['PL', 'Poland'], ['PM', 'Saint Pierre and Miquelon'], ['PN', 'Pitcairn Islands'],
  ['PR', 'Puerto Rico'], ['PS', 'Palestine'], ['PT', 'Portugal'], ['PW', 'Palau'],
  ['PY', 'Paraguay'],
  ['QA', 'Qatar'],
  ['RE', 'Réunion'], ['RO', 'Romania'], ['RS', 'Serbia'], ['RU', 'Russia'],
  ['RW', 'Rwanda'],
  ['SA', 'Saudi Arabia'], ['SB', 'Solomon Islands'], ['SC', 'Seychelles'],
  ['SD', 'Sudan'], ['SE', 'Sweden'], ['SG', 'Singapore'], ['SH', 'Saint Helena'],
  ['SI', 'Slovenia'], ['SJ', 'Svalbard and Jan Mayen'], ['SK', 'Slovakia'],
  ['SL', 'Sierra Leone'], ['SM', 'San Marino'], ['SN', 'Senegal'],
  ['SO', 'Somalia'], ['SR', 'Suriname'], ['SS', 'South Sudan'],
  ['ST', 'São Tomé and Príncipe'], ['SV', 'El Salvador'], ['SX', 'Sint Maarten'],
  ['SY', 'Syria'], ['SZ', 'Eswatini'],
  ['TC', 'Turks and Caicos Islands'], ['TD', 'Chad'],
  ['TF', 'French Southern Territories'], ['TG', 'Togo'], ['TH', 'Thailand'],
  ['TJ', 'Tajikistan'], ['TK', 'Tokelau'], ['TL', 'Timor-Leste'],
  ['TM', 'Turkmenistan'], ['TN', 'Tunisia'], ['TO', 'Tonga'], ['TR', 'Türkiye'],
  ['TT', 'Trinidad and Tobago'], ['TV', 'Tuvalu'], ['TW', 'Taiwan'],
  ['TZ', 'Tanzania'],
  ['UA', 'Ukraine'], ['UG', 'Uganda'], ['UM', 'U.S. Minor Outlying Islands'],
  ['US', 'United States'], ['UY', 'Uruguay'], ['UZ', 'Uzbekistan'],
  ['VA', 'Vatican City'], ['VC', 'Saint Vincent and the Grenadines'],
  ['VE', 'Venezuela'], ['VG', 'British Virgin Islands'],
  ['VI', 'U.S. Virgin Islands'], ['VN', 'Vietnam'], ['VU', 'Vanuatu'],
  ['WF', 'Wallis and Futuna'], ['WS', 'Samoa'],
  ['YE', 'Yemen'], ['YT', 'Mayotte'],
  ['ZA', 'South Africa'], ['ZM', 'Zambia'], ['ZW', 'Zimbabwe'],
];

/** Convert an ISO-3166-1 alpha-2 code into its flag emoji (regional indicators). */
export function codeToFlagEmoji(code: string | undefined | null): string {
  if (!code || code.length !== 2) return '';
  const upper = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) return '';
  return String.fromCodePoint(
    ...upper.split('').map(char => 127397 + char.charCodeAt(0)),
  );
}

/** All countries as options (flag emoji precomputed). */
export const COUNTRY_OPTIONS: CountryOption[] = ISO_COUNTRIES.map(([code, name]) => ({
  code,
  name,
  flag: codeToFlagEmoji(code),
}));

/** Countries pinned to the top of the picker (DACH first, then common picks). */
const POPULAR_CODES = ['DE', 'AT', 'CH', 'US', 'GB', 'FR', 'IT', 'ES', 'NL', 'PL', 'JP', 'KR', 'AU', 'CA', 'BR', 'MX'];

const POPULAR_SET = new Set(POPULAR_CODES);

/** Lookup a country option by code. */
export function findCountryOption(code: string | undefined | null): CountryOption | undefined {
  if (!code) return undefined;
  return COUNTRY_OPTIONS.find(c => c.code === code.toUpperCase());
}

/**
 * Localized country name for an ISO code in any app language.
 * Uses Intl.DisplayNames (offline, all 16 app languages supported);
 * falls back to the English name for exotic/legacy environments.
 */
export function getCountryDisplayName(code: string | undefined | null, language?: Language): string {
  const option = findCountryOption(code);
  if (!option) return '';
  const locale = language ?? 'en';
  try {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (typeof Intl !== 'undefined' && Intl.DisplayNames) {
      const dn = new Intl.DisplayNames([locale], { type: 'region', fallback: 'none' });
      const localized = dn.of(option.code);
      if (localized && localized !== option.code) return localized;
    }
  } catch {
    // fall through to English
  }
  return option.name;
}

/**
 * Get a localized country name for a given country option.
 * (Backward-compatible wrapper around getCountryDisplayName.)
 */
export function getCountryName(option: CountryOption, language?: Language): string {
  return getCountryDisplayName(option.code, language);
}

/** Get the flag emoji for a country code (works for every ISO code). */
export function getCountryFlag(countryCode: string | undefined): string {
  if (!countryCode) return '';
  return findCountryOption(countryCode)?.flag || codeToFlagEmoji(countryCode);
}

/**
 * Country options sorted for a picker: popular countries first (DACH + common),
 * then all remaining countries alphabetically by their localized name.
 */
export function getSortedCountryOptions(language?: Language): CountryOption[] {
  const locale = language ?? 'en';
  const byName = (a: CountryOption, b: CountryOption) =>
    getCountryDisplayName(a.code, locale).localeCompare(getCountryDisplayName(b.code, locale), locale);

  const popular = POPULAR_CODES
    .map(code => findCountryOption(code))
    .filter((c): c is CountryOption => !!c);
  const rest = COUNTRY_OPTIONS
    .filter(c => !POPULAR_SET.has(c.code))
    .sort(byName);

  return [...popular, ...rest];
}

/** Filter countries by a search query (localized name, English name, or code). */
export function filterCountryOptions(options: CountryOption[], query: string, language?: Language): CountryOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return options;
  return options.filter(c => {
    const localizedName = getCountryDisplayName(c.code, language).toLowerCase();
    return (
      localizedName.includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q)
    );
  });
}
