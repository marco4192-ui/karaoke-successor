import type { TourDefinition } from '../types';
import { basicTour } from './basic-tour';
import { editorTour } from './editor-tour';
import { settingsTour } from './settings-tour';

/** Registry of all available tours. */
export const TOURS: Record<string, TourDefinition> = {
  basic: basicTour,
  editor: editorTour,
  settings: settingsTour,
};
