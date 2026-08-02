// Barrel file for RU translations
// Uses deepMerge to combine domain sub-files without losing overlapping keys

import { coreTranslations } from './core';
import { libraryTranslations } from './library';
import { gameTranslations } from './game';
import { settingsTranslations } from './settings';
import { partyTranslations } from './party';
import { medleyTournamentTranslations } from './medleyTournament';
import { profileTranslations } from './profile';
import { mobileTranslations } from './mobile';
import { deepMerge } from '../deep-merge';

export const ruTranslations = [
  coreTranslations,
  libraryTranslations,
  gameTranslations,
  settingsTranslations,
  partyTranslations,
  medleyTournamentTranslations,
  profileTranslations,
  mobileTranslations,
].reduce(deepMerge, {} as Record<string, unknown>);
