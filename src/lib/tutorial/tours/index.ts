import type { TourDefinition } from '../types';
import { basicTour } from './basic-tour';
import { editorTour } from './editor-tour';
import { settingsTour } from './settings-tour';
import { profileTour } from './profile-tour';
import { queueTour } from './queue-tour';
import { chatTour } from './chat-tour';
import { companionTour } from './companion-tour';
import { achievementsTour } from './achievements-tour';

/** Registry of all available tours. */
export const TOURS: Record<string, TourDefinition> = {
  basic: basicTour,
  editor: editorTour,
  settings: settingsTour,
  profile: profileTour,
  queue: queueTour,
  chat: chatTour,
  companion: companionTour,
  achievements: achievementsTour,
};
