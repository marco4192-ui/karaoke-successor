import type { TourDefinition } from '../types';

/**
 * Companion-Tour (R29) — Smartphones einbinden: per QR-Code verbinden,
 * die Rollen der Companion-App (Mikro, Fernbedienung, Song-Auswahl, Chat,
 * Warteschlange, Mitsingen) und die Verwaltung verbundener Geräte.
 *
 * R33-e: DREI NEUE KAPITEL für die neue Steuerungs-Realität —
 *  - 'control': Take Control = explizite, exklusive Fernsteuerung
 *    (bidirektional: Desktop und steuernder Companion synchron)
 *  - 'solo': Nicht-steuernde Companions (Queue-Wünsche, Chat,
 *    Party-Partizipation, eigene Erfolge & Highscores; Settings/Profiles/
 *    Party/Daily/Jukebox bleiben gesperrt)
 *  - 'help': Companion-Hilfe vor Ort — der "?"-Button auf dem Handy öffnet
 *    eine rein lokale Lese-Ansicht.
 *
 * WICHTIG (Nutzeranforderung R33): Diese Tour läuft AUSSCHLIESSLICH über
 * den Desktop-Tour-Mechanismus (Start über das ?-Hilfemenü in der
 * Menüleiste bzw. das Erststart-Angebot — siehe tour-manager.tsx). Die
 * Companion-Hilfe auf dem Handy (MobileHelpView) ist eine eigenständige
 * Lese-Ansicht und triggert NIEMALS eine Desktop-Tour; die Steps hier
 * nutzen deshalb nur die bestehenden Mechanismen (navigate/target/
 * settings-open-tab) und führen KEINE neuen Actions oder Cross-Device-
 * Trigger ein.
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
      // R33: Explizite Fernsteuerung — nur EIN Companion steuert gleichzeitig,
      // bidirektional synchron mit dem Desktop.
      id: 'control',
      icon: '🎮',
      steps: [
        { id: 'takeControl' },
        {
          id: 'controlSync',
          navigate: 'settings',
          action: 'settings-open-tab',
          settingsTab: 'mobile',
          target: '[data-testid="companion-list-card"], [data-testid="companion-list-loading"]',
          placement: 'top',
        },
        { id: 'controlHandover' },
      ],
    },
    {
      // R33: Nicht-steuernde Companions — eigenständige Gäste ohne Remote-Lock.
      id: 'solo',
      icon: '🙋',
      steps: [
        { id: 'soloOverview' },
        {
          id: 'soloQueue',
          navigate: 'queue',
          target: '[data-testid="queue-title"]',
          placement: 'bottom',
        },
        { id: 'soloParty' },
        {
          id: 'soloStats',
          navigate: 'highscores',
          target: '[data-testid="highscore-title"]',
          placement: 'bottom',
        },
        { id: 'soloLimits' },
      ],
    },
    {
      // R33: Companion-Hilfe vor Ort — "?"-Button auf dem Handy, rein lokal.
      id: 'help',
      icon: '❓',
      steps: [
        {
          id: 'helpButton',
          navigate: 'home',
          target: '[data-testid="navbar-help-button"]',
          placement: 'bottom',
        },
        { id: 'helpLocal' },
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
