'use client';

import { useState, useCallback } from 'react';
import type { Screen } from '@/types/screens';

/**
 * Screens that are allowed without confirmation when a party mode is active.
 * Note: 'party' and 'party-setup' are intentionally excluded so the user
 * gets a leave-warning when clicking the "Party" nav item mid-game.
 */
const PARTY_SCREEN_WHITELIST: Screen[] = [
  'pass-the-mic', 'pass-the-mic-game',
  'medley', 'medley-game', 'battle-royale', 'battle-royale-game',
  'tournament', 'tournament-game', 'missing-words', 'missing-words-game',
  'blind', 'blind-game', 'companion-singalong', 'companion-singalong-game',
  'song-voting', 'game', 'results', 'rate-my-song', 'rate-my-song-rating', 'rate-my-song-results',
  'rate-my-song-game',
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PartyState = any;

/**
 * Returns true if any party game mode is currently active.
 * Used by the navigation guard to show a confirmation dialog
 * before leaving the party flow.
 */
function computePartyModeActive(party: PartyState): boolean {
  return !!(
    party.tournamentBracket ||
    party.battleRoyaleGame ||
    (party.passTheMicPlayers && party.passTheMicPlayers.length > 0 && party.passTheMicSong) ||
    (party.medleyPlayers && party.medleyPlayers.length > 0 && party.medleySongs && party.medleySongs.length > 0) ||
    party.competitiveGame ||
    party.rateMySongSettings
  );
}

export function useScreenNavigation(party: PartyState) {
  const [screen, setScreen] = useState<Screen>('home');
  const [pendingNavigation, setPendingNavigation] = useState<Screen | null>(null);

  const isPartyModeActive = computePartyModeActive(party);

  /**
   * Navigate to a target screen, but show a confirmation dialog
   * when a party mode is active and the target is not a party-related screen.
   */
  const navigateWithGuard = useCallback((target: Screen) => {
    if (PARTY_SCREEN_WHITELIST.includes(target)) {
      setScreen(target);
      return;
    }
    if (computePartyModeActive(party)) {
      setPendingNavigation(target);
      return;
    }
    setScreen(target);
  }, [party]);

  const confirmPendingNavigation = useCallback(() => {
    // Caller is responsible for resetting party state and game state.
    // This hook only consumes the pending target and clears it.
    // Returns the pending screen so the caller can act on it.
    const target = pendingNavigation;
    setPendingNavigation(null);
    return target;
  }, [pendingNavigation]);

  const cancelPendingNavigation = useCallback(() => {
    setPendingNavigation(null);
  }, []);

  return {
    screen,
    setScreen,
    isPartyModeActive,
    navigateWithGuard,
    pendingNavigation,
    setPendingNavigation,
    confirmPendingNavigation,
    cancelPendingNavigation,
  } as const;
}
