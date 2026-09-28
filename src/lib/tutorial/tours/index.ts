import type { TourDefinition } from '../types';
import { basicTour } from './basic-tour';
import { settingsTour } from './settings-tour';
import { editorTour } from './editor-tour';

/** Registry of all available tours. */
export const TOURS: Record<string, TourDefinition> = {
  basic: basicTour,
  settings: settingsTour,
  editor: editorTour,
};
