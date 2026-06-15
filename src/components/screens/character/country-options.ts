import type { Language } from '@/lib/i18n/locales';
import { t } from '@/lib/i18n/translations';

export interface CountryOption {
  code: string;
  nameKey: string;
  /** @deprecated Use getCountryName() for i18n. Kept as English fallback for backward compatibility. */
  name: string;
  flag: string;
}

export const COUNTRY_OPTIONS: CountryOption[] = [
  { code: 'DE', nameKey: 'countries.germany', name: 'Germany', flag: '🇩🇪' },
  { code: 'AT', nameKey: 'countries.austria', name: 'Austria', flag: '🇦🇹' },
  { code: 'CH', nameKey: 'countries.switzerland', name: 'Switzerland', flag: '🇨🇭' },
  { code: 'US', nameKey: 'countries.unitedStates', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', nameKey: 'countries.unitedKingdom', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'FR', nameKey: 'countries.france', name: 'France', flag: '🇫🇷' },
  { code: 'IT', nameKey: 'countries.italy', name: 'Italy', flag: '🇮🇹' },
  { code: 'ES', nameKey: 'countries.spain', name: 'Spain', flag: '🇪🇸' },
  { code: 'NL', nameKey: 'countries.netherlands', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'PL', nameKey: 'countries.poland', name: 'Poland', flag: '🇵🇱' },
  { code: 'JP', nameKey: 'countries.japan', name: 'Japan', flag: '🇯🇵' },
  { code: 'KR', nameKey: 'countries.southKorea', name: 'South Korea', flag: '🇰🇷' },
  { code: 'AU', nameKey: 'countries.australia', name: 'Australia', flag: '🇦🇺' },
  { code: 'CA', nameKey: 'countries.canada', name: 'Canada', flag: '🇨🇦' },
  { code: 'BR', nameKey: 'countries.brazil', name: 'Brazil', flag: '🇧🇷' },
  { code: 'MX', nameKey: 'countries.mexico', name: 'Mexico', flag: '🇲🇽' },
];

/** Get the localized country name for a given country option. */
export function getCountryName(option: CountryOption, language?: Language): string {
  return t(option.nameKey, language);
}

export function getCountryFlag(countryCode: string | undefined): string {
  if (!countryCode) return '';
  return COUNTRY_OPTIONS.find(c => c.code === countryCode)?.flag || '';
}