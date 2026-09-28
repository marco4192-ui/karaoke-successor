import type { TourDefinition } from '../types';

/**
 * Erfolge-&-Fortschritt-Tour (R29) — Achievements-Screen (Spieler-Auswahl,
 * Statistiken, Filter, Raritäten) und Daily-Challenge-Screen (Slots, XP,
 * Badges, Challenge-Modi).
 *
 * Die Daily-Slots erscheinen erst nach Spieler-Auswahl (Screen-lokaler
 * State, kein Store-Zugriff für skipIf) — Slot-/Modus-Erklärungen laufen
 * deshalb als zentrierte Dialoge und sind damit in jedem Zustand korrekt.
 */
export const achievementsTour: TourDefinition = {
  id: 'achievements',
  icon: '🏆',
  startScreen: 'achievements',
  chapters: [
    {
      id: 'overview',
      icon: '📊',
      steps: [
        { id: 'welcome' },
        {
          id: 'navButton',
          navigate: 'home',
          target: '[data-testid="navbar-achievements"]',
          placement: 'bottom',
        },
        {
          id: 'playerSelector',
          navigate: 'achievements',
          target: '[data-testid="achievements-player-selector"]',
          placement: 'bottom',
        },
        {
          id: 'stats',
          navigate: 'achievements',
          target: '[data-testid="achievements-stats"]',
          placement: 'bottom',
        },
      ],
    },
    {
      id: 'unlock',
      icon: '🏅',
      steps: [
        {
          id: 'filters',
          navigate: 'achievements',
          target: '[data-testid="achievements-filters"]',
          placement: 'bottom',
        },
        {
          id: 'grid',
          navigate: 'achievements',
          target: '[data-testid="achievements-grid"]',
          placement: 'top',
        },
        { id: 'xpSystem' },
      ],
    },
    {
      id: 'daily',
      icon: '📅',
      steps: [
        {
          id: 'navDaily',
          navigate: 'home',
          target: '[data-testid="navbar-daily"]',
          placement: 'bottom',
        },
        {
          id: 'playerSelection',
          navigate: 'dailyChallenge',
          target: '[data-testid="daily-player-selection"]',
          placement: 'bottom',
        },
        { id: 'slots' },
        { id: 'badges' },
        {
          id: 'challengeModes',
          navigate: 'dailyChallenge',
          target: '[data-testid="daily-challenge-title"]',
          placement: 'bottom',
        },
        { id: 'finish' },
      ],
    },
  ],
};
