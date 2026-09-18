import { getAllSongs } from '@/lib/game/song-library';
import type { TourDefinition } from '../types';

/**
 * Grundfunktionen-Tour — die Basis-Features der App.
 * Kapitel sind thematisch gegliedert und einzeln über das ?-Hilfemenü
 * abspielbar; die komplette Tour läuft alle Kapitel in Reihenfolge durch.
 *
 * Ziel-Anker sind stabile data-testid-Selektoren (siehe worklog).
 */
export const basicTour: TourDefinition = {
  id: 'basic',
  icon: '🎓',
  chapters: [
    {
      id: 'welcome',
      icon: '👋',
      steps: [
        // Zentrierter Dialog ohne Spotlight
        { id: 'welcome' },
        {
          id: 'heroButtons',
          target: '[data-testid="home-nav-library"]',
          placement: 'bottom',
        },
      ],
    },
    {
      id: 'challenges',
      icon: '📅',
      steps: [
        {
          id: 'dailyCard',
          target: '[data-testid="home-nav-daily"]',
          placement: 'top',
        },
        {
          id: 'weeklyCard',
          target: '[data-testid="home-nav-weekly"]',
          placement: 'top',
        },
      ],
    },
    {
      id: 'singing',
      icon: '🎤',
      steps: [
        {
          id: 'modeLauncher',
          target: '[data-testid="home-nav-solo"]',
          placement: 'top',
        },
        {
          id: 'libraryNav',
          navigate: 'library',
          target: '#song-search',
          placement: 'bottom',
        },
        {
          id: 'filters',
          navigate: 'library',
          target: '[data-testid="library-filter-row"]',
          placement: 'top',
          skipIf: () => getAllSongs().length === 0,
        },
        {
          id: 'songCard',
          navigate: 'library',
          target: '[data-testid^="song-card-"]',
          placement: 'top',
          // Live-Moment: der Klick öffnet den echten Start-Dialog,
          // der nächste Schritt erklärt ihn dann am offenen Modal.
          clickToContinue: true,
          skipIf: () => getAllSongs().length === 0,
        },
        {
          id: 'startModal',
          // Wird nach dem Klick auf einen Song sichtbar — Ziel-Anker ist
          // der Modal-Body; das Ziel wird beim Erscheinen angefahren.
          target: '[data-testid="song-start-modal"]',
          placement: 'top',
          skipIf: () => getAllSongs().length === 0,
        },
      ],
    },
    {
      id: 'party',
      icon: '🎉',
      steps: [
        {
          id: 'partyCard',
          target: '[data-testid="home-nav-party-modes"]',
          placement: 'top',
        },
      ],
    },
    {
      id: 'more',
      icon: '🧭',
      steps: [
        {
          id: 'jukeboxCard',
          target: '[data-testid="home-nav-jukebox"]',
          placement: 'top',
        },
        {
          id: 'highscoreCard',
          target: '[data-testid="home-nav-highscores"]',
          placement: 'top',
        },
        {
          id: 'settingsCard',
          target: '[data-testid="home-nav-settings"]',
          placement: 'top',
        },
        { id: 'finish' },
      ],
    },
  ],
};
