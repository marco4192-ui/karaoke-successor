// Barrel file for DE translations
// Uses deepMerge to combine domain sub-files without losing overlapping keys

import { coreTranslations } from './core';
import { libraryTranslations } from './library';
import { gameTranslations } from './game';
import { settingsTranslations } from './settings';
import { partyTranslations } from './party';
import { medleyTournamentTranslations } from './medleyTournament';
import { profileTranslations } from './profile';
import { mobileTranslations } from './mobile';
import { tutorialTranslations } from './tutorial';
import { deepMerge } from '../deep-merge';

export const deTranslations = [
  coreTranslations,
  libraryTranslations,
  gameTranslations,
  settingsTranslations,
  partyTranslations,
  medleyTournamentTranslations,
  profileTranslations,
  mobileTranslations,
  tutorialTranslations,
].reduce(deepMerge, {} as Record<string, unknown>);
