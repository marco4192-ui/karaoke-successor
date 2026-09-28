import type { Screen } from '@/types/screens';

/** Available tours (basics, editor, settings, profile, queue, chat,
 *  companion, achievements). */
export type TourId =
  | 'basic'
  | 'editor'
  | 'settings'
  | 'profile'
  | 'queue'
  | 'chat'
  | 'companion'
  | 'achievements';

/**
 * One step of a guided tour. All texts live in i18n under
 * `tutorial.<tourId>.steps.<stepId>.title` / `.body` — plus an optional
 * `.details` deep-dive text that the user can expand via the "More info"
 * button in the tooltip (short body first, details on demand).
 */
export interface TourStep {
  id: string;
  /** Spotlight target selector. Omit for a centered dialog (no spotlight). */
  target?: string;
  /** Preferred tooltip placement (default: bottom; mobile always bottom-sheet). */
  placement?: 'top' | 'bottom' | 'left' | 'right';
  /** Navigate to this screen right before the step becomes visible. */
  navigate?: Screen;
  /** App-level step-entry action:
   *  - 'editor-open-first-song': open the first editor song card (idempotent
   *    — skipped when a song is already open in the editor).
   *  - 'editor-close-song': leave the opened song back to the list view
   *    (NEVER discards unsaved changes — if the confirm dialog shows, the
   *    tour falls back to the centered tooltip instead).
   *  - 'settings-open-tab': activate the settings tab named in `settingsTab`
   *    (uses the same custom event the companion remote control uses).
   *  - 'chat-open-panel': open the desktop chat panel (karaoke-open-chat
   *    custom event — the tour closes it again on stop via karaoke-close-chat). */
  action?: 'editor-open-first-song' | 'editor-close-song' | 'settings-open-tab' | 'chat-open-panel';
  /** Settings tab to activate when action === 'settings-open-tab'. */
  settingsTab?: 'general' | 'gameplay' | 'appearance' | 'graphicsound' | 'microphone' | 'mobile' | 'webcam' | 'library' | 'taxonomy' | 'motto' | 'viral' | 'sync' | 'about';
  /** Interactive step: a click-catcher over the spotlight forwards the click
   *  to the real target (React handlers fire) and the tour advances. */
  clickToContinue?: boolean;
  /** Auto-skip this step when the predicate returns true (e.g. no songs). */
  skipIf?: () => boolean;
}

/** A thematic sub-section of a tour — playable standalone from the help menu. */
export interface TourChapter {
  id: string;
  /** Emoji icon shown in the help menu and the step progress badge. */
  icon: string;
  steps: TourStep[];
}

export interface TourDefinition {
  id: TourId;
  icon: string;
  chapters: TourChapter[];
  /** Screen the tour lives on — startTour navigates here first, so
   *  restarting the tour from anywhere brings you back to the start
   *  screen (e.g. home for the basic tour, editor for the editor tour). */
  startScreen?: Screen;
}

/** Runtime state of the currently running tour. */
export interface ActiveTour {
  tour: TourDefinition;
  /** Flattened steps of the playing range (whole tour or a single chapter). */
  steps: TourStep[];
  index: number;
  /** Chapter the range belongs to ('all' = complete tour). */
  chapterId: string | 'all';
}
