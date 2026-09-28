'use client';

/**
 * Tournament state + handlers — extracted 1:1 from PartyGameScreens
 * (party-game-screens.tsx, task R9).
 *
 * ALL state declarations, effect bodies, dep arrays, eslint-disable comments
 * and callback bodies below are unchanged. The hook keeps the store
 * subscriptions the orchestrator originally had (useGameStore() whole-store,
 * usePartyStore(), useTranslation()), so the component calling it re-renders
 * on exactly the same triggers as the original monolith — the
 * launchTournamentMatch / handlePlayTournamentMatch closures therefore never
 * go stale.
 *
 * Identifiers intentionally kept identical to the original (party, t,
 * resetGame, micOverlay, …) so the extracted bodies stayed byte-identical.
 */

import { useState, useEffect, useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useGameStore } from '@/lib/game/store';
import { usePartyStore } from '@/lib/game/party-store';
import { getNonDuetSongs, filterSongs } from '@/lib/game/song-library';
import { getEffectiveDifficulty } from '@/lib/game/tournament';
import { useTranslation } from '@/lib/i18n/translations';
import { shuffleArray } from '@/lib/utils';
import { buildGameSetupResult, trimSongToShortMode } from '../party-game-helpers';
import type { Screen } from '@/types/screens';
import type { MicOverlayState } from './types';

export interface UseTournamentScreensParams {
  screen: Screen;
  setScreen: (_s: Screen) => void;
}

export interface UseTournamentScreensResult {
  micOverlay: MicOverlayState | null;
  showTournamentResults: boolean;
  setShowTournamentResults: Dispatch<SetStateAction<boolean>>;
  tournamentVotingActive: boolean;
  setTournamentVotingActive: Dispatch<SetStateAction<boolean>>;
  startMatchWithMicOverlay: (
    match: import('@/lib/game/tournament').TournamentMatch,
    preSelectedSong?: import('@/types/game').Song | null,
  ) => Promise<void>;
  handlePlayTournamentMatch: (match: import('@/lib/game/tournament').TournamentMatch) => void;
  pickTournamentSong: () => import('@/types/game').Song | null;
  launchTournamentMatch: () => void;
  handleTournamentExitToMenu: () => void;
  handleTournamentNew: () => void;
}

export function useTournamentScreens(
  { screen, setScreen }: UseTournamentScreensParams,
): UseTournamentScreensResult {
  const { setGameMode, setSong, resetGame, addPlayer, setPlayers } = useGameStore();
  const party = usePartyStore();
  const { t } = useTranslation();

  // #7 Tournament results screen
  const [showTournamentResults, setShowTournamentResults] = useState(false);

  // #8 Tournament song voting state
  const [tournamentVotingActive, setTournamentVotingActive] = useState(false);

  // ── Tournament starting-screen state (replaces the old 3-2-1 mic overlay) ──
  // After selecting the next pairing ("Start Next Match"), the mode starting
  // screen shows both players + their mic assignment + the song (if voted).
  // The match starts via the explicit Start button — not via a countdown.
  const [micOverlay, setMicOverlay] = useState<{ p1Name: string; p2Name: string; p1Mic: string; p2Mic: string; votedSong: import('@/types/game').Song | null } | null>(null);

  // Dispatch the intro phase while the tournament starting screen is visible
  // so companion mirrors show the mode intro.
  useEffect(() => {
    if (micOverlay) {
      window.dispatchEvent(new CustomEvent('ptm-phase-changed', { detail: { phase: 'intro' } }));
    }
  }, [micOverlay]);

  // Helper: fetch connected companion profiles and compute mic assignments
  const startMatchWithMicOverlay = useCallback(async (
    match: import('@/lib/game/tournament').TournamentMatch,
    preSelectedSong?: import('@/types/game').Song | null,
  ) => {
    if (!match.player1 || !match.player2) return;

    // Set up mic assignments: check companion connections
    let p1Mic = t('partyGameScreens.microphone1');
    let p2Mic = t('partyGameScreens.microphone2');

    try {
      const res = await fetch('/api/mobile?action=getprofiles');
      if (res.ok) {
        const data = await res.json();
        const connectedProfiles: Array<{ id: string; name: string; clientId?: string }> = Array.isArray(data) ? data : [];

        const p1Companion = connectedProfiles.find(p =>
          match.player1 && (p.id === match.player1.id || p.name === match.player1.name)
        );
        const p2Companion = connectedProfiles.find(p =>
          match.player2 && (p.id === match.player2.id || p.name === match.player2.name)
        );

        // Companion-connected players sing via companion app
        if (p1Companion) p1Mic = t('partyGameScreens.companion');
        if (p2Companion) p2Mic = t('partyGameScreens.companion');
      }
    } catch {
      // Silently fail — default to Mic 1 / Mic 2
    }

    // Store the match and pre-selected song in party store
    party.setCurrentTournamentMatch(match);
    if (preSelectedSong) party.setTournamentVotedSong(preSelectedSong);

    // Show the tournament starting screen (players, mic assignment, song)
    setMicOverlay({
      p1Name: match.player1.name,
      p2Name: match.player2.name,
      p1Mic,
      p2Mic,
      votedSong: preSelectedSong ?? null,
    });
  }, [party.setCurrentTournamentMatch, party.setTournamentVotedSong, t]);

  // ── Start (or vote-for) a tournament duel ──
  // Shared by the desktop bracket view (card click / next-match button) and
  // the companion "open duels" list (remote-party-start-match event): when
  // the tournament uses song voting, the 3-song vote overlay opens first,
  // otherwise the duel's starting screen is shown directly.
  const handlePlayTournamentMatch = useCallback((match: import('@/lib/game/tournament').TournamentMatch) => {
    if (!match.player1 || !match.player2) return;
    const bracket = party.tournamentBracket;
    if (bracket && bracket.settings.songSelectionMode === 'vote') {
      // Pick 3 random songs for voting (same pool logic as pickTournamentSong)
      const usedIds = new Set(party.tournamentUsedSongIds);
      const pool = getNonDuetSongs().filter(s => {
        if (usedIds.has(s.id)) return false;
        const genre = bracket.settings.filterGenre;
        const lang = bracket.settings.filterLanguage;
        if (genre && genre !== 'all') {
          if (!s.genre || s.genre !== genre) return false;
        }
        if (lang && lang !== 'all') {
          if (!s.language || s.language !== lang) return false;
        }
        return true;
      });
      if (pool.length >= 3) {
        const shuffled = shuffleArray(pool).slice(0, 3);
        party.setTournamentVotingSongs(shuffled);
        party.setTournamentVotingMatch(match);
        setTournamentVotingActive(true);
      } else {
        void startMatchWithMicOverlay(match);
      }
    } else {
      startMatchWithMicOverlay(match);
    }
  }, [party, startMatchWithMicOverlay]);

  // ── Companion "open duels" list: start a specific duel from a companion app ──
  // The companion sends `party_start_match:<matchId>` which arrives here as a
  // remote-party-start-match CustomEvent. Guards mirror the desktop UI rules:
  // only while the bracket is on screen, no duel/vote pending, match open.
  useEffect(() => {
    const handler = (e: Event) => {
      const { matchId } = (e as CustomEvent<{ matchId?: string }>).detail || {};
      if (!matchId || screen !== 'tournament-game') return;
      const partyNow = usePartyStore.getState();
      const bracket = partyNow.tournamentBracket;
      if (!bracket) return;
      if (partyNow.currentTournamentMatch || partyNow.tournamentVotingMatch || micOverlay) return;
      const match = bracket.matches.find(m => m.id === matchId);
      if (!match || match.completed || match.isBye || !match.player1 || !match.player2) return;
      handlePlayTournamentMatch(match);
    };
    window.addEventListener('remote-party-start-match', handler);
    return () => window.removeEventListener('remote-party-start-match', handler);
  }, [screen, handlePlayTournamentMatch, micOverlay]);

  // #1 #2 #5 #6 Helper: Pick a tournament song (no repeats, filter, trim duration)
  const pickTournamentSong = useCallback((): import('@/types/game').Song | null => {
    const bracket = party.tournamentBracket;
    if (!bracket) return null;

    // #5 Apply genre/language filters
    let pool = getNonDuetSongs();
    const genre = bracket.settings.filterGenre;
    const lang = bracket.settings.filterLanguage;
    if (genre && genre !== 'all' && lang && lang !== 'all') {
      pool = filterSongs(pool, genre, lang, true);
    } else if (genre && genre !== 'all') {
      pool = filterSongs(pool, genre, 'all', true);
    } else if (lang && lang !== 'all') {
      pool = filterSongs(pool, 'all', lang, true);
    }

    // #2 Exclude already-used songs
    const usedIds = new Set(party.tournamentUsedSongIds);
    let available = pool.filter(s => !usedIds.has(s.id));

    // If all songs are used, reset the pool
    if (available.length === 0) {
      party.resetTournamentUsedSongIds();
      available = pool;
    }

    if (available.length === 0) return null;

    const chosen = available[Math.floor(Math.random() * available.length)];

    // #1 Trim song duration for short mode
    if (party.tournamentSongDuration === 60) {
      const trimmed = trimSongToShortMode(chosen);
      party.addTournamentUsedSongId(chosen.id);
      return trimmed;
    }

    party.addTournamentUsedSongId(chosen.id);
    return chosen;
  }, [party]);

  // ── Launch the selected tournament match (invoked by the starting screen's Start button) ──
  const launchTournamentMatch = useCallback(() => {
    if (!micOverlay) return;

    const match = party.currentTournamentMatch;
    if (!match) return;
    if (!match.player1 || !match.player2) return;

    setMicOverlay(null);

    // Reset game state for new match
    resetGame();
    setPlayers([]);

    // Store mic assignments in unifiedSetupResult for MicIndicator display
    const p1IsCompanion = micOverlay.p1Mic === t('partyGameScreens.companion');
    const p2IsCompanion = micOverlay.p2Mic === t('partyGameScreens.companion');
    const setupResult = buildGameSetupResult({
      mode: 'tournament',
      players: [
        { id: match.player1.id, name: match.player1.name, color: match.player1.color || '#FF6B6B', playerType: p1IsCompanion ? 'companion' : 'microphone', micName: micOverlay.p1Mic },
        { id: match.player2.id, name: match.player2.name, color: match.player2.color || '#4ECDC4', playerType: p2IsCompanion ? 'companion' : 'microphone', micName: micOverlay.p2Mic },
      ],
      difficulty: party.tournamentBracket?.settings?.difficulty ?? 'medium',
      settings: {},
    });
    party.setUnifiedSetupResult(setupResult);

    // Add both players for the duel
    if (match.player1) addPlayer({ id: match.player1.id, name: match.player1.name, avatar: match.player1.avatar, color: match.player1.color });
    if (match.player2) addPlayer({ id: match.player2.id, name: match.player2.name, avatar: match.player2.avatar, color: match.player2.color });

    // #6 Set dynamic difficulty if enabled
    const bracket = party.tournamentBracket;
    if (bracket && bracket.settings.dynamicDifficulty) {
      const effectiveDiff = getEffectiveDifficulty(
        bracket.settings.difficulty,
        bracket.currentRound,
        bracket.totalRounds,
        true,
      );
      useGameStore.getState().setDifficulty(effectiveDiff);
    }

    setGameMode('duel');

    // #8 Use voted song if available, otherwise pick randomly
    const votedSong = party.tournamentVotedSong;
    party.setTournamentVotedSong(null);
    const song = votedSong || pickTournamentSong();
    if (song) {
      setSong(song);
      setScreen('game');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- party is a stable Zustand store; specific fields used in body
  }, [micOverlay, party.currentTournamentMatch, resetGame, addPlayer, setGameMode, setSong, setScreen, party.setUnifiedSetupResult, party.tournamentBracket, party.tournamentVotedSong, t, pickTournamentSong]);

  // ── Item 11: Tournament final-results exit actions ──
  // "Back to Main Menu": leave the tournament completely. Uses the SAME
  // cleanup as the ESC / "End Party" path (handlePartyModeEnd in
  // karaoke-app.tsx): force-reset ALL party state (bracket, votes, mode,
  // setup draft) + reset the game state, then go home — no leaks.
  const handleTournamentExitToMenu = useCallback(() => {
    party.resetPartyState(true);
    resetGame();
    setGameMode('standard');
    setShowTournamentResults(false);
    setScreen('home');
  // eslint-disable-next-line react-hooks/exhaustive-deps -- party is a stable Zustand store; sub-setters are stable
  }, [party.resetPartyState, resetGame, setGameMode, setScreen]);

  // "New Tournament": go DIRECTLY to the tournament settings (unified party
  // setup) with the players of the last tournament pre-selected — still
  // fully changeable. The old bracket (incl. results, votes, used songs) is
  // cleared completely so nothing bleeds into the new tournament.
  // NOTE: unifiedSetupResult is NOT restored from here — every duel
  // overwrites it with just the 2 current players (see launchTournamentMatch).
  // The bracket holds the full original player list + settings; per-player
  // device assignments persist in localStorage and are picked up by the
  // setup hook automatically.
  const handleTournamentNew = useCallback(() => {
    const bracket = party.tournamentBracket;
    if (bracket && bracket.players.length > 0) {
      const s = bracket.settings;
      party.setSetupDraft({
        selectedPlayers: bracket.players.map(p => p.id),
        settings: {
          maxPlayers: s.maxPlayers,
          shortMode: s.songDuration === 60,
          tournamentType: s.tournamentType,
          tiebreakMode: s.tiebreakMode,
          dynamicDifficulty: s.dynamicDifficulty,
          songSelectionMode: s.songSelectionMode,
          seedingMode: s.seedingMode,
        },
        difficulty: s.difficulty ?? 'medium',
        inputMode: 'mixed',
        selectedMicId: null,
        selectedMicName: null,
        filterGenre: s.filterGenre ?? 'all',
        filterLanguage: s.filterLanguage ?? 'all',
        filterCombined: true,
        filterReleaseYear: 'all',
        filterEra: 'all',
      });
    }

    // Clear the finished tournament completely (same fields as
    // resetPartyState's tournament block — clean slate for the new one)
    party.setTournamentBracket(null);
    party.setCurrentTournamentMatch(null);
    party.setTournamentVotedSong(null);
    party.setTournamentVotingSongs([]);
    party.setTournamentVotingMatch(null);
    party.resetTournamentUsedSongIds();
    party.setTournamentMatchAborted(false);
    party.resetTournamentCrowdVotes();
    party.setPtmMedleySnippets([]);
    setShowTournamentResults(false);
    party.setSelectedGameMode('tournament');
    setScreen('party-setup');
  }, [party, setScreen]);

  // ── Companion "New Tournament" trigger (Item 11, optional mirror action) ──
  // The companion champion view sends `party_new_tournament`, which arrives
  // here as a remote-party-new-tournament CustomEvent. Only active while the
  // final results are on screen — mirrors the desktop button rules.
  useEffect(() => {
    const handler = () => {
      if (screen !== 'tournament-game' || !showTournamentResults) return;
      handleTournamentNew();
    };
    window.addEventListener('remote-party-new-tournament', handler);
    return () => window.removeEventListener('remote-party-new-tournament', handler);
  }, [screen, showTournamentResults, handleTournamentNew]);

  return {
    micOverlay,
    showTournamentResults,
    setShowTournamentResults,
    tournamentVotingActive,
    setTournamentVotingActive,
    startMatchWithMicOverlay,
    handlePlayTournamentMatch,
    pickTournamentSong,
    launchTournamentMatch,
    handleTournamentExitToMenu,
    handleTournamentNew,
  };
}
