import { useGameStore } from '@/lib/game/store';
import type { TourDefinition } from '../types';

/** Synchronous store predicates for skipIf (evaluated at step entry). */
const hasProfiles = () => useGameStore.getState().profiles.length > 0;
const onlineEnabled = () => useGameStore.getState().onlineEnabled;

/**
 * Profil-Tour (R29) — Profilverwaltung: Charaktere anlegen, auswählen,
 * Fortschritt (XP/Level/Rang) und Einstellungen pro Profil, plus
 * Online-Bestenlisten und Companion-Claiming.
 *
 * Ziel-Anker sind data-testid-Selektoren (profile-*). Schritte, die ein
 * Profil benötigen, nutzen skipIf auf den Store — ohne Profile laufen sie
 * ins zentrierte Fallback-Dialog bzw. werden übersprungen.
 */
export const profileTour: TourDefinition = {
  id: 'profile',
  icon: '👤',
  startScreen: 'profile',
  chapters: [
    {
      id: 'overview',
      icon: '🧭',
      steps: [
        { id: 'welcome' },
        {
          id: 'topBar',
          navigate: 'profile',
          target: '[data-testid="profile-top-bar"]',
          placement: 'bottom',
        },
        {
          id: 'createButton',
          navigate: 'profile',
          target: '[data-testid="profile-create-button"]',
          placement: 'bottom',
        },
      ],
    },
    {
      id: 'characters',
      icon: '🎭',
      steps: [
        {
          id: 'empty',
          navigate: 'profile',
          target: '[data-testid="profile-empty"]',
          placement: 'bottom',
          skipIf: hasProfiles,
        },
        {
          id: 'cards',
          navigate: 'profile',
          target: '[data-testid^="profile-card-"]',
          placement: 'bottom',
          skipIf: () => !hasProfiles(),
        },
        {
          id: 'progression',
          navigate: 'profile',
          target: '[data-testid="profile-progression-card"]',
          placement: 'bottom',
          skipIf: () => !hasProfiles(),
        },
        {
          id: 'settingsCard',
          navigate: 'profile',
          target: '[data-testid="profile-settings-card"]',
          placement: 'top',
          skipIf: () => !hasProfiles(),
        },
      ],
    },
    {
      id: 'online',
      icon: '🌐',
      steps: [
        {
          id: 'onlineToggle',
          navigate: 'profile',
          target: '[data-testid="profile-online-toggle"]',
          placement: 'bottom',
        },
        {
          id: 'loginButton',
          navigate: 'profile',
          target: '[data-testid="profile-online-login"]',
          placement: 'bottom',
          skipIf: () => !onlineEnabled(),
        },
        {
          id: 'companionClaim',
          navigate: 'profile',
          target: '[data-testid="profile-list"]',
          placement: 'bottom',
        },
        { id: 'finish' },
      ],
    },
  ],
};
