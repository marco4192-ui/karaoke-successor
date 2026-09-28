import type { TourDefinition } from '../types';

/**
 * Chat-Tour (R29) — der Desktop-Chat: Panel öffnen, Nachrichten lesen und
 * senden, „Senden als"-Spieler-Auswahl und Song-Herausforderungen.
 *
 * Das Panel ist ein globales Overlay (nicht an einen Screen gebunden) —
 * der erste Schritt navigiert auf Home, damit die Navbar mit dem Chat-Button
 * sicher sichtbar ist. Schritte im Panel nutzen action: 'chat-open-panel':
 * die Tour öffnet das Panel selbst und schließt es beim Beenden wieder.
 */
export const chatTour: TourDefinition = {
  id: 'chat',
  icon: '💬',
  startScreen: 'home',
  chapters: [
    {
      id: 'basics',
      icon: '🚪',
      steps: [
        { id: 'welcome' },
        {
          id: 'navButton',
          navigate: 'home',
          target: '[data-testid="navbar-chat-button"]',
          placement: 'bottom',
        },
        {
          id: 'panel',
          navigate: 'home',
          action: 'chat-open-panel',
          target: '[data-testid="chat-panel"]',
          placement: 'left',
        },
      ],
    },
    {
      id: 'usage',
      icon: '✍️',
      steps: [
        {
          id: 'messages',
          navigate: 'home',
          action: 'chat-open-panel',
          target: '[data-testid="chat-messages"]',
          placement: 'left',
        },
        {
          id: 'sendAs',
          navigate: 'home',
          action: 'chat-open-panel',
          target: '[data-testid="chat-player-select"]',
          placement: 'left',
        },
        {
          id: 'input',
          navigate: 'home',
          action: 'chat-open-panel',
          target: '[data-testid="chat-input"]',
          placement: 'left',
        },
        {
          id: 'send',
          navigate: 'home',
          action: 'chat-open-panel',
          target: '[data-testid="chat-send"]',
          placement: 'left',
        },
      ],
    },
    {
      id: 'challenges',
      icon: '⚔️',
      steps: [
        {
          id: 'songChallenges',
          navigate: 'home',
          action: 'chat-open-panel',
          target: '[data-testid="chat-messages"]',
          placement: 'left',
        },
        {
          id: 'companionSide',
          navigate: 'home',
          action: 'chat-open-panel',
          target: '[data-testid="chat-panel"]',
          placement: 'left',
        },
        { id: 'finish' },
      ],
    },
  ],
};
