import { getAllSongs } from '@/lib/game/song-library';
import type { TourDefinition } from '../types';

/**
 * Grundfunktionen-Tour — die Basis-Features der App.
 * Kapitel sind thematisch gegliedert und einzeln über das ?-Hilfemenü
 * abspielbar; die komplette Tour läuft alle Kapitel in Reihenfolge durch.
 *
 * Ziel-Anker sind stabile data-testid-Selektoren (siehe worklog).
 * Jeder Schritt trägt ein `navigate`, damit Kapitel-Sprünge von jedem
 * Beliebigen Screen aus funktionieren — die Tour bringt dich zuerst
 * auf den Screen, auf dem der Schritt lebt.
 */
export const basicTour: TourDefinition = {
  id: 'basic',
  icon: '🎓',
  startScreen: 'home',
  chapters: [
    {
      id: 'welcome',
      icon: '👋',
      steps: [
        // Zentrierter Dialog ohne Spotlight
        { id: 'welcome' },
        {
          id: 'heroButtons',
          navigate: 'home',
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
          navigate: 'home',
          target: '[data-testid="home-nav-daily"]',
          placement: 'top',
        },
        {
          id: 'weeklyCard',
          navigate: 'home',
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
          navigate: 'home',
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
          navigate: 'home',
          target: '[data-testid="home-nav-party-modes"]',
          placement: 'top',
        },
        {
          // In das Party-Menü wechseln und die Modi live zeigen.
          id: 'partyModes',
          navigate: 'party',
          target: '[data-testid^="party-mode-"]',
          placement: 'bottom',
        },
      ],
    },
    {
      id: 'more',
      icon: '🧭',
      steps: [
        {
          id: 'jukeboxCard',
          navigate: 'home',
          target: '[data-testid="home-nav-jukebox"]',
          placement: 'top',
        },
        {
          id: 'jukeboxView',
          navigate: 'jukebox',
          target: '[data-testid="jukebox-playlist-browser-trigger"]',
          placement: 'bottom',
        },
        {
          id: 'highscoreCard',
          navigate: 'home',
          target: '[data-testid="home-nav-highscores"]',
          placement: 'top',
        },
        {
          id: 'highscoreView',
          navigate: 'highscores',
          target: '[data-testid="highscore-title"]',
          placement: 'bottom',
        },
        {
          id: 'settingsCard',
          navigate: 'home',
          target: '[data-testid="home-nav-settings"]',
          placement: 'top',
        },
        {
          id: 'settingsView',
          navigate: 'settings',
          target: '[data-testid="settings-tab-general"]',
          placement: 'bottom',
        },
        {
          id: 'finish',
          // Abschluss zurück auf den Startscreen.
          navigate: 'home',
        },
      ],
    },
  ],
};
