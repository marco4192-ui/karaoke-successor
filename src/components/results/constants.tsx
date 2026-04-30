'use client';

// Re-export canonical constants from their authoritative sources
export { MAX_POINTS_PER_SONG } from '@/lib/game/scoring';

// Country options and flag helper — canonical source
export { COUNTRY_OPTIONS, getCountryFlag, type CountryOption } from '@/components/screens/character/country-options';

// Icons — re-export from canonical icon library to avoid duplicate definitions
export { TrophyIcon } from '@/components/icons';
