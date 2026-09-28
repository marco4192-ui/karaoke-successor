import type { TourDefinition } from '../types';

/**
 * Settings-Tour — ausschließlich die Einstellungen (Nutzerwunsch R26).
 *
 * Struktur: 5 Kapitel entlang der Reiter-Leiste. Jeder Schritt springt
 * per 'settings-open-tab'-Aktion auf den betreffenden Reiter (reused
 * 'remote-settings-tab'-Event) und spotlightet die Einleitungs-Karte
 * (settings-intro-<tab>) bzw. das zentrale Element des Reiters.
 *
 * Ziel-Anker:
 *  - Tab-Leiste:          [data-testid="settings-tab-bar"]
 *  - Einleitungs-Karten:  [data-testid="settings-intro-<tab>"]  (R26)
 *  - Motto-Party:         [data-testid="motto-activation-card"] (zentrales Element)
 */
export const settingsTour: TourDefinition = {
  id: 'settings',
  icon: '⚙️',
  startScreen: 'settings',
  chapters: [
    {
      id: 'overview',
      icon: '🧭',
      steps: [
        // Zentrierter Dialog ohne Spotlight
        { id: 'welcome' },
        {
          id: 'tabBar',
          navigate: 'settings',
          action: 'settings-open-tab',
          actionArg: 'general',
          target: '[data-testid="settings-tab-bar"]',
          placement: 'bottom',
        },
      ],
    },
    {
      id: 'basics',
      icon: '⚙️',
      steps: [
        {
          id: 'generalTab',
          navigate: 'settings',
          action: 'settings-open-tab',
          actionArg: 'general',
          target: '[data-testid="settings-intro-general"]',
          placement: 'bottom',
        },
        {
          id: 'gameplayTab',
          navigate: 'settings',
          action: 'settings-open-tab',
          actionArg: 'gameplay',
          target: '[data-testid="settings-intro-gameplay"]',
          placement: 'bottom',
        },
        {
          id: 'appearanceTab',
          navigate: 'settings',
          action: 'settings-open-tab',
          actionArg: 'appearance',
          target: '[data-testid="settings-intro-appearance"]',
          placement: 'bottom',
        },
        {
          id: 'graphicSoundTab',
          navigate: 'settings',
          action: 'settings-open-tab',
          actionArg: 'graphicsound',
          target: '[data-testid="settings-intro-graphicSound"]',
          placement: 'bottom',
        },
      ],
    },
    {
      id: 'devices',
      icon: '🎤',
      steps: [
        {
          id: 'microphoneTab',
          navigate: 'settings',
          action: 'settings-open-tab',
          actionArg: 'microphone',
          target: '[data-testid="settings-intro-microphone"]',
          placement: 'bottom',
        },
        {
          id: 'mobileTab',
          navigate: 'settings',
          action: 'settings-open-tab',
          actionArg: 'mobile',
          target: '[data-testid="settings-intro-mobile"]',
          placement: 'bottom',
        },
        {
          id: 'webcamTab',
          navigate: 'settings',
          action: 'settings-open-tab',
          actionArg: 'webcam',
          target: '[data-testid="settings-intro-webcam"]',
          placement: 'bottom',
        },
      ],
    },
    {
      id: 'library',
      icon: '📚',
      steps: [
        {
          id: 'libraryTab',
          navigate: 'settings',
          action: 'settings-open-tab',
          actionArg: 'library',
          target: '[data-testid="settings-intro-library"]',
          placement: 'bottom',
        },
        {
          id: 'taxonomyTab',
          navigate: 'settings',
          action: 'settings-open-tab',
          actionArg: 'taxonomy',
          target: '[data-testid="settings-intro-taxonomy"]',
          placement: 'bottom',
        },
        {
          id: 'mottoTab',
          navigate: 'settings',
          action: 'settings-open-tab',
          actionArg: 'motto',
          target: '[data-testid="motto-activation-card"]',
          placement: 'bottom',
        },
        {
          id: 'viralTab',
          navigate: 'settings',
          action: 'settings-open-tab',
          actionArg: 'viral',
          target: '[data-testid="settings-intro-viral"]',
          placement: 'bottom',
        },
      ],
    },
    {
      id: 'backup',
      icon: '💾',
      steps: [
        {
          id: 'syncTab',
          navigate: 'settings',
          action: 'settings-open-tab',
          actionArg: 'sync',
          target: '[data-testid="settings-intro-sync"]',
          placement: 'bottom',
        },
        { id: 'finish' },
      ],
    },
  ],
};
