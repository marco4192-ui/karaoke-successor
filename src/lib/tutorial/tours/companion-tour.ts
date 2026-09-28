import type { TourDefinition } from '../types';

/**
 * Companion-Tour (R29) — Smartphones einbinden: per QR-Code verbinden,
 * die Rollen der Companion-App (Mikro, Fernbedienung, Song-Auswahl, Chat,
 * Warteschlange, Mitsingen) und die Verwaltung verbundener Geräte.
 *
 * Das Verbinden passiert in den Einstellungen → Mobile-Tab — deshalb
 * startScreen: 'settings' mit action: 'settings-open-tab' wie in der
 * Settings-Tour. Die App selbst läuft auf dem Handy-Browser; diese Tour
 * erklärt den Desktop-Seite des Flows.
 */
export const companionTour: TourDefinition = {
  id: 'companion',
  icon: '📱',
  startScreen: 'settings',
  chapters: [
    {
      id: 'connect',
      icon: '🔗',
      steps: [
        { id: 'welcome' },
        {
          id: 'mobileTab',
          navigate: 'settings',
          action: 'settings-open-tab',
          settingsTab: 'mobile',
          target: '[data-testid="settings-intro-mobile"]',
          placement: 'bottom',
        },
        {
          id: 'qrCode',
          navigate: 'settings',
          action: 'settings-open-tab',
          settingsTab: 'mobile',
          target: '[data-testid="mobile-qr-code"]',
          placement: 'right',
        },
        {
          id: 'connectionInfo',
          navigate: 'settings',
          action: 'settings-open-tab',
          settingsTab: 'mobile',
          target: '[data-testid="mobile-connection-info"]',
          placement: 'left',
        },
      ],
    },
    {
      id: 'features',
      icon: '🎤',
      steps: [
        { id: 'roles' },
        {
          id: 'chatRole',
          navigate: 'home',
          target: '[data-testid="navbar-chat-button"]',
          placement: 'bottom',
        },
        {
          id: 'queueRole',
          navigate: 'queue',
          target: '[data-testid="queue-title"]',
          placement: 'bottom',
        },
        { id: 'singAlong' },
      ],
    },
    {
      id: 'manage',
      icon: '⚙️',
      steps: [
        {
          id: 'deviceList',
          navigate: 'settings',
          action: 'settings-open-tab',
          settingsTab: 'mobile',
          target: '[data-testid="companion-list-card"], [data-testid="companion-list-loading"]',
          placement: 'top',
        },
        {
          id: 'profileClaim',
          navigate: 'profile',
          target: '[data-testid="profile-list"]',
          placement: 'bottom',
        },
        {
          id: 'microphoneFallback',
          navigate: 'settings',
          action: 'settings-open-tab',
          settingsTab: 'microphone',
          target: '[data-testid="settings-intro-microphone"]',
          placement: 'bottom',
        },
        { id: 'finish' },
      ],
    },
  ],
};
