import type { TourDefinition } from '../types';

/**
 * Settings-Tour (R28, Nutzerwunsch: „ein Tutorial, das sich ausschließlich
 * mit den Settings befasst") — führt durch alle Tabs der Einstellungen.
 *
 * Jeder Schritt nutzt `action: 'settings-open-tab'`, um den Tab live
 * zu öffnen, und spottet die Einleitungskarte (`settings-intro-{tab}`),
 * die seit R28 oben in jedem Tab steht. Die Tour funktioniert von jedem
 * Bildschirm aus — `startScreen: 'settings'` bringt dich zuerst in die
 * Einstellungen.
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
        { id: 'welcome' },
        {
          id: 'tabBar',
          navigate: 'settings',
          target: '[data-testid="settings-tab-general"]',
          placement: 'bottom',
        },
      ],
    },
    {
      id: 'basics',
      icon: '🎛️',
      steps: [
        {
          id: 'general',
          navigate: 'settings',
          action: 'settings-open-tab',
          settingsTab: 'general',
          target: '[data-testid="settings-intro-general"]',
          placement: 'bottom',
        },
        {
          id: 'gameplay',
          navigate: 'settings',
          action: 'settings-open-tab',
          settingsTab: 'gameplay',
          target: '[data-testid="settings-intro-gameplay"]',
          placement: 'bottom',
        },
        {
          id: 'appearance',
          navigate: 'settings',
          action: 'settings-open-tab',
          settingsTab: 'appearance',
          target: '[data-testid="settings-intro-appearance"]',
          placement: 'bottom',
        },
      ],
    },
    {
      id: 'sound',
      icon: '🎤',
      steps: [
        {
          id: 'graphicsound',
          navigate: 'settings',
          action: 'settings-open-tab',
          settingsTab: 'graphicsound',
          target: '[data-testid="settings-intro-graphicsound"]',
          placement: 'bottom',
        },
        {
          id: 'microphone',
          navigate: 'settings',
          action: 'settings-open-tab',
          settingsTab: 'microphone',
          target: '[data-testid="settings-intro-microphone"]',
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
          settingsTab: 'library',
          target: '[data-testid="settings-intro-library"]',
          placement: 'bottom',
        },
        {
          id: 'taxonomy',
          navigate: 'settings',
          action: 'settings-open-tab',
          settingsTab: 'taxonomy',
          target: '[data-testid="settings-intro-taxonomy"]',
          placement: 'bottom',
        },
        {
          id: 'motto',
          navigate: 'settings',
          action: 'settings-open-tab',
          settingsTab: 'motto',
          target: '[data-testid="settings-intro-motto"]',
          placement: 'bottom',
        },
      ],
    },
    {
      id: 'devices',
      icon: '📱',
      steps: [
        {
          id: 'mobile',
          navigate: 'settings',
          action: 'settings-open-tab',
          settingsTab: 'mobile',
          target: '[data-testid="settings-intro-mobile"]',
          placement: 'bottom',
        },
        {
          id: 'webcam',
          navigate: 'settings',
          action: 'settings-open-tab',
          settingsTab: 'webcam',
          target: '[data-testid="settings-intro-webcam"]',
          placement: 'bottom',
        },
      ],
    },
    {
      id: 'data',
      icon: '💾',
      steps: [
        {
          id: 'sync',
          navigate: 'settings',
          action: 'settings-open-tab',
          settingsTab: 'sync',
          target: '[data-testid="settings-intro-sync"]',
          placement: 'bottom',
        },
        {
          id: 'about',
          navigate: 'settings',
          action: 'settings-open-tab',
          settingsTab: 'about',
          target: '[data-testid="settings-intro-about"]',
          placement: 'bottom',
        },
        {
          id: 'finish',
          navigate: 'settings',
        },
      ],
    },
  ],
};
