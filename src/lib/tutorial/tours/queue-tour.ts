import { useGameStore } from '@/lib/game/store';
import type { TourDefinition } from '../types';

/** True when the LOCAL queue has at least one pending item (store check —
 *  companion queue items are fetched asynchronously and can't be checked
 *  synchronously; those steps degrade to the centered dialog instead). */
const hasLocalQueue = () => {
  const q = useGameStore.getState().queue;
  return q.some(item => item.status !== 'completed');
};

/**
 * Warteschlangen-Tour (R29) — Queue verwalten: Songs einreihen, Reihenfolge
 * per Drag & Drop ändern, Regeln (max. 3 pro Spieler), Companion-Einreihungen
 * und Autoplay.
 */
export const queueTour: TourDefinition = {
  id: 'queue',
  icon: '🎶',
  startScreen: 'queue',
  chapters: [
    {
      id: 'overview',
      icon: '🧭',
      steps: [
        { id: 'welcome' },
        {
          id: 'navButton',
          navigate: 'home',
          target: '[data-testid="navbar-queue"]',
          placement: 'bottom',
        },
        {
          id: 'title',
          navigate: 'queue',
          target: '[data-testid="queue-title"]',
          placement: 'bottom',
        },
        {
          id: 'empty',
          navigate: 'queue',
          target: '[data-testid="queue-empty"]',
          placement: 'bottom',
          skipIf: hasLocalQueue,
        },
        {
          id: 'list',
          navigate: 'queue',
          target: '[data-testid="queue-list"]',
          placement: 'top',
          skipIf: () => !hasLocalQueue(),
        },
      ],
    },
    {
      id: 'manage',
      icon: '🎛️',
      steps: [
        {
          id: 'reorder',
          navigate: 'queue',
          target: '[data-testid="queue-list"]',
          placement: 'top',
          skipIf: () => !hasLocalQueue(),
        },
        {
          id: 'playNext',
          navigate: 'queue',
          target: '[data-testid="queue-play-next"]',
          placement: 'top',
          skipIf: () => !hasLocalQueue(),
        },
        {
          id: 'clearAll',
          navigate: 'queue',
          target: '[data-testid="queue-clear"]',
          placement: 'top',
          skipIf: () => !hasLocalQueue(),
        },
        {
          id: 'rules',
          navigate: 'queue',
          target: '[data-testid="queue-rules"]',
          placement: 'top',
        },
      ],
    },
    {
      id: 'companion',
      icon: '📱',
      steps: [
        {
          id: 'companionAdd',
          navigate: 'queue',
          target: '[data-testid="queue-empty"], [data-testid="queue-list"]',
          placement: 'top',
        },
        {
          id: 'autoplay',
          navigate: 'queue',
          target: '[data-testid="queue-title"]',
          placement: 'bottom',
        },
        { id: 'finish' },
      ],
    },
  ],
};
