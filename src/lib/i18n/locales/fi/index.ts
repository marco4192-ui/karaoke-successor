// Barrel file for FI translations
// Auto-generated — imports domain sub-files and merges them

import { coreTranslations } from './core';
import { libraryTranslations } from './library';
import { gameTranslations } from './game';
import { settingsTranslations } from './settings';
import { partyTranslations } from './party';
import { medleyTournamentTranslations } from './medleyTournament';
import { profileTranslations } from './profile';
import { mobileTranslations } from './mobile';

export const fiTranslations = {
  ...coreTranslations,
  ...libraryTranslations,
  ...gameTranslations,
  ...settingsTranslations,
  ...partyTranslations,
  ...medleyTournamentTranslations,
  ...profileTranslations,
  ...mobileTranslations,
};
