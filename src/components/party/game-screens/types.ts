/**
 * Shared types for the party game-screen modules (R9 split of
 * party-game-screens.tsx). Type-only module — no runtime code.
 */

import type { Song } from '@/types/game';
import type { Screen } from '@/types/screens';

/** Props of the PartyGameScreens orchestrator (public surface, unchanged). */
export interface PartyGameScreensProps {
  screen: Screen;
  setScreen: (_s: Screen) => void;
}

/**
 * Tournament "starting screen" overlay state (`micOverlay` in the original
 * party-game-screens.tsx): both duelists + their mic assignment + the voted
 * song (if any).
 */
export interface MicOverlayState {
  p1Name: string;
  p2Name: string;
  p1Mic: string;
  p2Mic: string;
  votedSong: Song | null;
}
