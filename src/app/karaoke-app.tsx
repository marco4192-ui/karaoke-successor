'use client';

import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { useGameStore } from '@/lib/game/store';
import { usePartyStore } from '@/lib/game/party-store';
import { startAppDataSync } from '@/lib/game/appdata-sync';
import { CHALLENGE_GAME_MODE_MAP } from '@/lib/game/player-progression';
import { StorageKeys, getItem, removeItem } from '@/lib/storage';
import { useGlobalKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { TourController } from '@/components/tutorial/tour-manager';
import { HelpMenu } from '@/components/tutorial/help-menu';
import { useMobileClient } from '@/hooks/use-mobile-client';
import { getAllSongs } from '@/lib/game/song-library';
import { generatePtmSegments } from '@/lib/game/ptm-segments';
import { recordMatchResult } from '@/lib/game/tournament';
import { finishCompetitiveRound } from '@/lib/game/competitive-words-blind';
// Companion remote events + 2s screen sync (QR: ausgelagert)
import { useCompanionRemoteEvents } from '@/hooks/use-companion-remote-events';
import { useMobileScreenSync } from '@/hooks/use-mobile-screen-sync';
import { useTranslation } from '@/lib/i18n/translations';
import { useViralCharts } from '@/hooks/use-viral-charts';

// Screen type & constants (canonical source)
import type { Screen } from '@/types/screens';
import { IMMERSIVE_SCREENS } from '@/types/screens';

// Extracted hooks
import { useScreenNavigation, computePartyModeActive } from '@/hooks/use-screen-navigation';
import { useGameFlowHandlers } from '@/hooks/use-game-flow-handlers';
import { useAppEffects } from '@/hooks/use-app-effects';
import { useAutoFocus } from '@/hooks/use-roving-focus';

// Extracted dialogs
import { SongPauseDialog, PartyLeaveDialog, PartyExitConfirmDialog } from '@/components/dialogs';

// Extracted screens
import {
  HomeScreen, PartyScreen, QueueScreen, AchievementsScreen, HighscoreScreen,
  CharacterScreen, EditorScreen, OnlineMultiplayerScreen, DailyChallengeScreen,
  JukeboxScreen, MobileScreen, ResultsScreen, LibraryScreen, SettingsScreen,
  GameScreen,
} from '@/components/screens';

// Extracted components
import { NavBar, FullscreenToggleButton } from '@/components/home/navbar';
import { PartySetupSection } from '@/components/party/party-setup-section';
import { PartyGameScreens } from '@/components/party/party-game-screens';
import { OfflineBanner } from '@/components/ui/offline-banner';
import { DesktopChatNotification } from '@/components/ui/desktop-chat-notification';
import { DesktopChatPanel } from '@/components/ui/desktop-chat-panel';

// ===================== MAIN APP =====================
export default function KaraokeZERO() {
  // ── Store hooks (must be called before any conditional returns) ──
  const { gameState, setSong, setGameMode, setDifficulty, setChallengeMode, profiles, queue, resetGame, addPlayer, setResults, pauseGame, resumeGame } = useGameStore();
  const party = usePartyStore();
  const { t } = useTranslation();
  const viralCharts = useViralCharts();

  // ── Screen navigation (screen state + party-mode guard) ──
  // NOTE: the guard's isPartyModeActive flag is intentionally NOT used here —
  // see isPartyActiveDirect below (Bug 12).
  const { screen, setScreen, navigateWithGuard, pendingNavigation, setPendingNavigation, markPartyConfirmed } = useScreenNavigation(party);

  // ── Home "Singen" launcher: preselected start mode for the Library ──
  // Set by the Single/Duell/Duett chips on the home screen, consumed by
  // LibraryScreen when it mounts (session-scoped: stays for the whole
  // library visit, cleared once the user leaves the library again).
  // Deliberately NOT stored via setGameMode — the store gameMode has
  // side effects in abort paths; this transient prop is side-effect free.
  const [libraryPreselect, setLibraryPreselect] = useState<'single' | 'duel' | 'duet' | null>(null);
  const handleLaunchMode = useCallback((_mode: 'single' | 'duel' | 'duet') => {
    setLibraryPreselect(_mode);
    setScreen('library');
  }, [setScreen]);
  useEffect(() => {
    if (screen !== 'library' && libraryPreselect) setLibraryPreselect(null);
  }, [screen, libraryPreselect]);

  // ── R14 (user request 5): AppData persistence for player data ──
  // In the Tauri build, profiles + highscores are mirrored into the SQLite
  // database in the OS app-data directory — they survive app updates and
  // reinstalls (previously a wiped WebView localStorage deleted all players
  // and highscores). Browser builds are a no-op (localStorage only).
  useEffect(() => {
    const stop = startAppDataSync(useGameStore);
    return stop;
  }, []);

  // Tour navigation (tutorial system): direct setScreen — bypasses the party
  // guard because starting a tour is an explicit user action; the help FAB
  // is hidden on running game screens, so mid-game tour starts are impossible.
  const handleTourNavigate = useCallback((target: Screen) => { setScreen(target); }, [setScreen]);

  // Bug 12: DIRECT party-active computation from the party store state.
  // The navigation guard's isPartyModeActive flag latches to false after ONE
  // confirmed leave (partyConfirmed) even when a new party game (e.g. a
  // tournament) is running — relying on it made Escape/Abort silently wipe or
  // exit active party games. All exit guards below must use this value instead.
  const isPartyActiveDirect = computePartyModeActive(party);

  // ── App initialization effects (theme, custom songs, fullscreen, mobile redirect) ──
  const { isMounted, isFullscreen, toggleFullscreen } = useAppEffects();

  // ── Game flow handlers (tournament end, medley end, competitive end, etc.) ──
  const { handleGameEnd } = useGameFlowHandlers(
    party, gameState, { setResults, resetGame }, setScreen,
  );

  // ── Pause / Leave dialog state (driven by party store) ──
  type DialogAction = null | 'song-pause' | 'party-leave' | 'song-end-early';
  const [activeDialog, setActiveDialog] = useState<DialogAction>(null);

  // Latest syncScreen function (assigned by the 2s sync effect further below)
  // so the immediate dialog-push effect can trigger an out-of-band companion
  // sync without duplicating the POST logic.
  const syncScreenRef = useRef<(() => Promise<void>) | null>(null);

  // ── Track who initiated the pause (for companion overlay) ──
  const [pauseInitiator, setPauseInitiator] = useState<string | null>(null);

  // ── Track PTM/CPTM game phase for companion intro screen ──
  const [ptmPhase, setPtmPhase] = useState<string | null>(null);

  // Listen for explicit phase changes dispatched by the game hook
  useEffect(() => {
    const handlePhaseChange = (e: Event) => {
      const { phase } = (e as CustomEvent).detail || {};
      // eslint-disable-next-line no-console
      console.log('[PTM-Phase] Event received: phase=%s, screen=%s', phase, screen);
      setPtmPhase(phase || null);
    };
    window.addEventListener('ptm-phase-changed', handlePhaseChange);
    return () => window.removeEventListener('ptm-phase-changed', handlePhaseChange);
  }, [screen]);

  // When entering a party game screen (PTM/CPTM/Medley/Battle/Competitive/RateMySong),
  // ensure 'intro' phase is set SYNCHRONOUSLY before the sync loop fires.
  // Using useLayoutEffect guarantees ptmPhase='intro' is available in the same
  // render's sync useEffect, eliminating the one-POST timing gap where
  // the companion would see ptmPhase=null.
  const isPartyGameScreen = screen === 'pass-the-mic-game'
    || screen === 'companion-singalong-game'
    || screen === 'medley-game'
    || screen === 'battle-royale-game'
    || screen === 'tournament-game'
    || screen === 'missing-words-game'
    || screen === 'blind-game'
    || screen === 'rate-my-song-game';
  // Track the last party game screen so a phase left over from a PREVIOUS
  // game (e.g. 'song-results' from RMS, which never dispatches its own phase
  // events) is reset — otherwise the companion mirror would show the generic
  // game view instead of the mode starting screen (user request item 5).
  const lastPartyGameScreenRef = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (isPartyGameScreen) {
      const isScreenChange = lastPartyGameScreenRef.current !== screen;
      lastPartyGameScreenRef.current = screen;
      setPtmPhase(prev => {
        // New game (screen changed): every mode starts with the starting
        // screen → always reset to 'intro' so the companion mirrors it.
        // Same screen: only fill null (don't overwrite 'countdown' etc.).
        if (isScreenChange || prev === null) {
          if (prev !== 'intro') {
            // eslint-disable-next-line no-console
            console.log('[Party-Phase] Safety net (sync): resetting to intro (was %s), screen=%s', prev, screen);
            return 'intro';
          }
          return prev;
        }
        return prev;
      });
    } else {
      lastPartyGameScreenRef.current = null;
      setPtmPhase(null);
    }
  }, [screen, isPartyGameScreen]);

  // ── Scroll-reset on screen change ──
  // Screen switches are client-side state changes (not route navigations), so the
  // browser preserves the scroll offset of the previous screen. Without a reset,
  // content starts hidden behind the sticky navbar and elements become unclickable
  // (clicks land on the navbar overlay). Games run in fixed full-viewport layouts,
  // so resetting to top is always safe.
  // EXCEPTION: the song-voting overlay is rendered ON TOP of the (still mounted)
  // party setup screen — entering it and returning from it (pick or cancel) must
  // PRESERVE the scroll position, so the user lands exactly where they were
  // (e.g. at the song-selection method tiles) instead of the player grid.
  const prevScreenRef = useRef<Screen | null>(null);
  useEffect(() => {
    const prev = prevScreenRef.current;
    prevScreenRef.current = screen;
    if (screen === 'song-voting') return; // overlay on top — keep scroll
    if (prev === 'song-voting' && screen === 'party-setup') return; // back from overlay
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [screen]);

  // ── Ctrl-Q: flag to auto-play first queue item ──
  const [autoPlayNext, setAutoPlayNext] = useState(false);

  // ── Tournament manual winner overlay ──
  const [showTournamentWinnerOverlay, setShowTournamentWinnerOverlay] = useState(false);

  // ── Desktop chat panel ──
  const [showChatPanel, setShowChatPanel] = useState(false);

  useEffect(() => {
    setActiveDialog(party.pauseDialogAction);
  }, [party.pauseDialogAction]);

  // ── Item 13: push dialog changes to companions IMMEDIATELY ──
  // The 2s sync interval is too slow and can miss short open/close windows:
  // whenever the leave/pause dialog opens or closes on the desktop, fire an
  // out-of-band gamestate push (HTTP + Socket.IO broadcast, includes
  // desktopDialog) plus the dedicated desktop-dialog Socket.IO event so the
  // (controlling) companion mirrors the dialog instantly. Only fires on
  // actual value changes — no request spam.
  const pauseDialogAction = party.pauseDialogAction;
  const prevDialogActionRef = useRef<DialogAction>(pauseDialogAction);
  useEffect(() => {
    const prev = prevDialogActionRef.current;
    prevDialogActionRef.current = pauseDialogAction;
    if (prev === pauseDialogAction) return; // only actual changes
    // 'song-end-early' is a desktop-internal CPTM signal — not mirrored.
    const isMirrored = (a: DialogAction) => a === 'party-leave' || a === 'song-pause';
    if (!isMirrored(prev) && !isMirrored(pauseDialogAction)) return;
    // Dedicated instant Socket.IO channel (companion 'desktop-dialog' event)
    window.dispatchEvent(new CustomEvent('desktop-dialog-change', {
      detail: { dialog: pauseDialogAction },
    }));
    // Full gamestate push (reads fresh state internally — safe to re-call)
    void syncScreenRef.current?.();
  }, [pauseDialogAction]);

  // ── Item 14: never keep the leave dialog once the party mode is over ──
  // A stale pauseDialogAction='party-leave' (e.g. resetPartyState was blocked
  // by the medley/CPTM safety net) would re-open the leave dialog and push it
  // to companions although the party is no longer active. Clear it instead.
  // Bug 12: uses the DIRECT party-active check (not the navigation guard's
  // latched flag) so the dialog can never be dropped while a party game is
  // still genuinely active.
  useEffect(() => {
    if (!isPartyActiveDirect && party.pauseDialogAction === 'party-leave') {
      party.setPauseDialogAction(null);
    }
  }, [isPartyActiveDirect, party.pauseDialogAction, party.setPauseDialogAction]);

  // Reset autoPlayNext when navigating away from queue screen
  useEffect(() => {
    if (screen !== 'queue') {
      setAutoPlayNext(false);
    }
  }, [screen]);

  const isTournamentMatch = !!(party.currentTournamentMatch && party.tournamentBracket);

  // ── Dialog handlers (defined before conditional returns for Rules of Hooks) ──
  const closeDialog = useCallback(() => {
    party.setPauseDialogAction(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [party.setPauseDialogAction, party]);

  const handleResumeGame = useCallback(() => {
    setPauseInitiator(null);
    // Bug 12: a game-screen match (tournament duel, words/blind series,
    // medley snippet, standard song) runs on the standard game loop — it
    // paused via pauseGame() and only resumes when the store's gameStatus
    // returns to 'playing', so resumeGame() must be called (same mechanism
    // the game loop's pause-sync effect reacts to). Modes with their own
    // screens (PTM / CPTM / Medley / BR) resume via their pauseDialogAction
    // effects, so closing the dialog is enough there.
    closeDialog();
    if (screen === 'game') {
      resumeGame();
    }
  }, [closeDialog, resumeGame, screen]);

  const handleSongAbort = useCallback(() => {
    // DO-NOT-CHANGE: Diagnostic logging for PartyTerminator debugging.
    // This helps identify which code path triggers the nuclear reset.
    // eslint-disable-next-line no-console
    console.log('[handleSongAbort] screen=%s, isPartyActive=%s, gameMode=%s, selectedGameMode=%s, isTournamentMatch=%s',
      screen, isPartyActiveDirect, gameState.gameMode, party.selectedGameMode, isTournamentMatch);

    closeDialog();

    // ── Tournament match abort: needs bracket + aborted flag for the match-abort dialog ──
    if (screen === 'game' && isTournamentMatch) {
      party.setTournamentMatchAborted(true);
      resetGame();
      setScreen('tournament-game');
      return;
    }

    // ── Competitive game abort: finalize skipped round, keep multi-round game running ──
    if (screen === 'game' && party.competitiveGame) {
      const cg = party.competitiveGame;
      // Bug 10c fix: record the ACTUAL current scores from the game store
      // instead of zeroing the round — Escape→Abort mid-song still sang part
      // of the song. Read fresh store state (P2's live score is synced there
      // too) BEFORE resetGame() zeroes the scores, and route through
      // finishCompetitiveRound so totalScore/roundsPlayed accumulate exactly
      // like a regularly finished round.
      const storePlayers = useGameStore.getState().gameState.players;
      const currentRound = cg.rounds[cg.currentRoundIndex];
      let updatedGame = cg;
      if (currentRound && !currentRound.completed) {
        const p1 = currentRound.player1Id ? storePlayers.find(p => p.id === currentRound.player1Id) : undefined;
        const p2 = currentRound.player2Id ? storePlayers.find(p => p.id === currentRound.player2Id) : undefined;
        updatedGame = finishCompetitiveRound(cg, p1?.score ?? 0, 0, p2?.score ?? 0, 0);
      }
      party.setCompetitiveGame(updatedGame);
      resetGame();
      const modeScreen = gameState.gameMode === 'missing-words' ? 'missing-words-game' : 'blind-game';
      setScreen(modeScreen as Screen);
      return;
    }

    // ── Medley snippet abort: keep medley state, return to medley overview ──
    if (screen === 'game' && gameState.gameMode === 'medley' && party.medleySongs.length > 0) {
      resetGame();
      setScreen('medley-game');
      return;
    }

    // ── Rate-my-song abort: keep settings, go to rating screen ──
    if (screen === 'game' && gameState.gameMode === 'rate-my-song') {
      resetGame();
      setScreen('rate-my-song-rating');
      return;
    }

    // ── Non-party game abort: go to Library ──
    // If no party mode is active, this was a standard single/duel/duet game
    // started from the Library. Send the user back there.
    // Bug 12: DIRECT party-active check (the navigation flag may be latched
    // false while a party game is actually running).
    if (!isPartyActiveDirect) {
      resetGame();
      setGameMode('standard');
      setScreen('library');
      return;
    }

    // ── CPTM abort: end song with evaluation instead of killing the series ──
    // The "Abort" button in the pause dialog should end the current song,
    // show the evaluation, and let the player continue to the next song.
    // Bug 12: selectedGameMode itself proves a party mode is active — do not
    // gate this on the navigation flag (stale after one confirmed leave).
    if (party.selectedGameMode === 'companion-singalong') {
      // Signal CPTM to end the song early — the hook's pauseDialogAction
      // effect will detect this and transition to song-results.
      // We use a special action value that the CPTM hook can react to.
      party.setPauseDialogAction('song-end-early');
      return;
    }

    // ── Medley Contest abort: confirm leaving FIRST, teardown only after ──
    // User report (R20-1): Pause → Abort tore down the whole Medley Contest
    // IMMEDIATELY with no confirmation. Route through the same party-leave
    // dialog the other party modes use: "End Party" → handlePartyModeEnd
    // (resetPartyState(true) clears all medley fields), "Back" → the medley
    // hook's pauseDialogAction effect resumes the paused snippet (incl.
    // audio/video re-sync — see use-medley-audio.ts resume branch).
    // Note: the leave dialog during a paused medley song is ALREADY reachable
    // via ESC-ESC (keyboard case 4) — this makes the Abort button consistent.
    if (screen === 'medley-game' || screen === 'medley') {
      party.setPauseDialogAction('party-leave');
      return;
    }

    // ═══════════════════════════════════════════════════════════════════
    // ULTIMATE PARTY-MODE TERMINATOR
    // All remaining cases get a full nuclear reset of party state.
    // This covers: BR, PTM, Companion, CPTM (from game or their own
    // screens), and any other party mode that isn't handled above.
    // Previously these only did partial per-mode cleanup, leaving
    // residual state like selectedGameMode, unifiedSetupResult,
    // votingSongs, medleyPlayers, etc. to leak into the Library
    // and other non-party screens.
    // ═══════════════════════════════════════════════════════════════════
    // DO-NOT-CHANGE: Safety guard — if the selectedGameMode is 'medley'
    // or 'companion-singalong', this abort likely came from a stale
    // song-start (e.g. media load failure in a GameScreen that was
    // briefly rendered during medley/CPTM navigation). Do targeted
    // cleanup instead of nuking everything.
    const mode = party.selectedGameMode as string;
    if (mode === 'medley' || mode === 'companion-singalong') {
      // eslint-disable-next-line no-console
      console.warn('[handleSongAbort] PARTY TERMINATOR BLOCKED — selectedGameMode=%s, screen=%s. Doing targeted cleanup instead.', mode, screen);
      party.setIsSongPlaying(false);
      resetGame();
      setGameMode('standard');
      setScreen('party');
      return;
    }

    // eslint-disable-next-line no-console
    console.log('[handleSongAbort] PARTY TERMINATOR — full reset. screen=%s, selectedGameMode=%s', screen, party.selectedGameMode);

    // ── Bug 12: last-resort guard before the nuclear reset ──
    // When Abort triggers while NOT on screen==='game' (e.g. BR / PTM running
    // on their own screens, or any unguarded path), the old code silently
    // wiped ALL party state (party.resetPartyState()) with no dialog — which
    // could nuke an active tournament if the navigation guard's flag was
    // latched false. Only allow the full reset when NO party mode is active;
    // otherwise route to the leave-confirmation dialog and let the user
    // decide (End Party → handlePartyModeEnd, Back → resume).
    if (isPartyActiveDirect) {
      // eslint-disable-next-line no-console
      console.warn('[handleSongAbort] PARTY TERMINATOR rerouted to party-leave dialog — party mode still active. screen=%s, selectedGameMode=%s', screen, party.selectedGameMode);
      party.setPauseDialogAction('party-leave');
      return;
    }

    party.resetPartyState();
    resetGame();
    setGameMode('standard');
    setScreen('party');
  }, [closeDialog, screen, isTournamentMatch, isPartyActiveDirect, party, party.selectedGameMode, gameState.gameMode, resetGame, setScreen, setGameMode]);

  const handleTournamentRepeat = useCallback(() => {
    closeDialog();
    if (!party.currentTournamentMatch) return;
    const match = party.currentTournamentMatch;
    if (!match.player1 || !match.player2) return;

    resetGame();
    useGameStore.getState().setPlayers([]);
    addPlayer({ id: match.player1.id, name: match.player1.name, avatar: match.player1.avatar, color: match.player1.color });
    addPlayer({ id: match.player2.id, name: match.player2.name, avatar: match.player2.avatar, color: match.player2.color });
    setGameMode('duel');
    const songs = getAllSongs();
    if (songs.length > 0) {
      const randomSong = songs[Math.floor(Math.random() * songs.length)];
      setSong(randomSong);
      setScreen('game');
    }
  }, [closeDialog, party, resetGame, addPlayer, setGameMode, setSong, setScreen]);

  const handleTournamentManualWinner = useCallback(() => {
    closeDialog();
    // Show overlay instead of auto-determining winner
    setShowTournamentWinnerOverlay(true);
  }, [closeDialog]);

  const handleTournamentPickWinner = useCallback((winnerId: string) => {
    if (!party.currentTournamentMatch || !party.tournamentBracket) return;
    const match = party.currentTournamentMatch;
    const isP1Winner = winnerId === match.player1?.id;

    // Use 100 for winner, 0 for loser
    const updatedBracket = recordMatchResult(
      party.tournamentBracket,
      match.id,
      isP1Winner ? 100 : 0,
      isP1Winner ? 0 : 100,
    );
    party.setTournamentBracket(updatedBracket);
    party.setCurrentTournamentMatch(null);
    party.setTournamentMatchAborted(false);

    setShowTournamentWinnerOverlay(false);
    resetGame();
    setScreen('tournament-game');
  }, [party, resetGame, setScreen]);

  const handleTournamentCancelWinner = useCallback(() => {
    setShowTournamentWinnerOverlay(false);
  }, []);

  const handlePartyModeEnd = useCallback(() => {
    closeDialog();
    // Item 14: force=true — the user explicitly ended the party, so the
    // medley/CPTM safety net must NOT block the reset. A blocked reset would
    // leave selectedGameMode set (isPartyModeActive stays true) and the leave
    // dialog could re-open on non-party screens via ESC.
    party.resetPartyState(true);
    resetGame();
    setGameMode('standard');
    setScreen('home');
  // eslint-disable-next-line react-hooks/exhaustive-deps -- party excluded; sub-properties are the stable deps
  }, [closeDialog, party.resetPartyState, resetGame, setScreen, setGameMode]);

  const handlePartyLeaveBack = useCallback(() => {
    closeDialog();
  }, [closeDialog]);

  // ── Global keyboard shortcuts ──
  // Read pause state directly from the store (not from local activeDialog
  // state which lags one render behind due to useEffect syncing) so that
  // ESC/Enter handlers see the correct state immediately.
  const isPaused = party.pauseDialogAction === 'song-pause';
  const isSongPlaying = screen === 'game' || party.isSongPlaying;

  useGlobalKeyboardShortcuts({
    screen: screen as Screen,
    isFullscreen,
    // Bug 12: direct store read at event time — immune to the navigation
    // guard's partyConfirmed latch, so Escape ALWAYS shows the leave dialog
    // while a party game (tournament/PTM/CPTM/BR/medley/words/blind/RMS) is
    // actually active, and only exits immediately on genuinely non-party
    // screens.
    isPartyActive: () => computePartyModeActive(usePartyStore.getState()),
    isSongPlaying,
    isPaused,
    toggleFullscreen,
    navigateTo: (target) => navigateWithGuard(target),
    pauseGame,
    resumeGame,
    setPauseDialog: (action) => party.setPauseDialogAction(action),
    focusLibrarySearch: () => {
      navigateWithGuard('library');
      // Focus search input after navigation (small delay for render)
      setTimeout(() => {
        const searchInput = document.getElementById('song-search') as HTMLInputElement | null;
        searchInput?.focus();
      }, 100);
    },
    startRandomSong: (mode) => {
      const songs = getAllSongs();
      if (songs.length === 0) return;
      const randomSong = songs[Math.floor(Math.random() * songs.length)];
      resetGame();
      if (mode === 'duel') {
        setGameMode('duel');
      } else {
        setGameMode('standard');
      }
      setSong(randomSong);
      setScreen('game');
    },
    startQueueSong: () => {
      // Trigger the first queue item if available
      const q = useGameStore.getState().queue;
      if (q.length === 0) return;
      setAutoPlayNext(true);
      navigateWithGuard('queue');
    },
    navigateToJukebox: () => {
      navigateWithGuard('jukebox');
      // Dispatch event to auto-start jukebox after screen mounts
      setTimeout(() => window.dispatchEvent(new CustomEvent('jukebox:start')), 300);
    },
  });

  // ── Companion remote events (QR: ausgelagert nach use-companion-remote-events.ts) ──
  useCompanionRemoteEvents({
    navigateWithGuard,
    setScreen,
    screen,
    pauseGame,
    resumeGame,
    toggleFullscreen,
    isPartyActiveDirect,
    setPauseInitiator,
    setAutoPlayNext,
  });

  // ── Mobile client sync ──
  const { syncSongLibrary } = useMobileClient({
    song: gameState.currentSong,
    isPlaying: screen === 'game',
    currentTime: gameState.currentTime,
    gameMode: gameState.gameMode,
  });

  useEffect(() => {
    syncSongLibrary();
  }, [syncSongLibrary, screen]);

  // ── 2s-Companion-Sync (QR: ausgelagert nach use-mobile-screen-sync.ts) ──
  useMobileScreenSync({
    screen,
    pauseInitiator,
    ptmPhase,
    isPartyActiveDirect,
    isPartyGameScreen,
    viralSongIds: viralCharts.viralSongIds,
    syncScreenRef,
  });

  // ── Auto-focus management: focus first interactive element on screen change ──
  const mainRef = useRef<HTMLElement>(null);
  useAutoFocus(mainRef, screen);

  // ── Hydration guard for Tauri ──
  if (!isMounted) {
    return (
      <div
        className="h-screen w-full"
        style={{ background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #0a0a2a 100%)' }}
        suppressHydrationWarning
      />
    );
  }

  // ── Party mode exit confirmation dialog (pending navigation guard) ──
  if (pendingNavigation) {
    return (
      <PartyExitConfirmDialog
        onStay={() => setPendingNavigation(null)}
        onLeave={() => {
          const target = pendingNavigation;
          setPendingNavigation(null);
          markPartyConfirmed();
          // Item 14: force — explicit leave confirmation must fully reset
          party.resetPartyState(true);
          resetGame();
          setGameMode('standard');
          setScreen(target);
        }}
      />
    );
  }

  // ===================== MAIN RENDER =====================
  // Help FAB visibility: hidden on running games & immersive screens —
  // except the editor (the editor tutorial lives there).
  const helpFabHidden = (IMMERSIVE_SCREENS.has(screen) && screen !== 'editor') || screen === 'results' || screen === 'mobile';

  return (
    <TourController navigate={handleTourNavigate} screen={screen}>
    <div
      className={`${IMMERSIVE_SCREENS.has(screen) || screen === 'library' ? 'h-screen overflow-hidden' : 'min-h-screen'} flex flex-col w-full text-white theme-container`}
      style={{
        background: `linear-gradient(135deg, var(--theme-background, #0a0a1a) 0%, var(--theme-background-secondary, #1a1a2e) 50%, color-mix(in srgb, var(--theme-primary, #00ffff) 15%, transparent) 100%)`,
        color: 'var(--theme-text, #ffffff)',
        fontFamily: 'var(--theme-font, Inter, sans-serif)',
      }}
    >
      <OfflineBanner />

      {/* Navigation — Hidden during immersive screens */}
      {!IMMERSIVE_SCREENS.has(screen) && (
        <NavBar
          screen={screen}
          setScreen={navigateWithGuard}
          queueLength={queue.length}
          isMounted={isMounted}
          isFullscreen={isFullscreen}
          toggleFullscreen={toggleFullscreen}
          onToggleChat={() => setShowChatPanel((v) => !v)}
        />
      )}

      {/* Fullscreen Toggle Button for immersive screens without NavBar */}
      {IMMERSIVE_SCREENS.has(screen) && screen !== 'editor' && <FullscreenToggleButton isFullscreen={isFullscreen} toggleFullscreen={toggleFullscreen} />}

      {/* Main Content */}
      <main ref={mainRef} className={`${
        IMMERSIVE_SCREENS.has(screen)
          ? 'pt-0 px-0 pb-0 w-full h-full'
          : 'px-4 pb-8 flex-1 min-h-0'
      }`}>
        {screen === 'home' && <HomeScreen onNavigate={setScreen} onLaunchMode={handleLaunchMode} />}
        {screen === 'library' && (
          <LibraryScreen
            partyPickActive={!!party.selectedGameMode}
            onSelectSong={(song, explicitGameMode) => {
              // Preserve the gameMode set by LibraryScreen.handleStartGame
              // (e.g. 'duel' or 'duet') across the resetGame() call.
              // IMPORTANT: Prefer explicitGameMode passed from the caller
              // over the store value to avoid timing/race conditions.
              // SAFETY NET (user report "Mode terminieren", round 2):
              // resetGame() deliberately PRESERVES the game-store gameMode —
              // so a party mode set by a start handler ('pass-the-mic',
              // 'companion-singalong', 'rate-my-song', …) survives even a
              // party.resetPartyState(true) unless the exit path ALSO called
              // setGameMode('standard'). With no active party
              // (selectedGameMode === null) such a mode is ALWAYS stale and
              // would re-route this Library pick into a broken GameScreen —
              // clamp it to 'standard'. Legit library modes ('standard',
              // 'duel', 'duet') pass through unchanged.
              const rawMode = explicitGameMode || useGameStore.getState().gameState.gameMode;
              const PARTY_ONLY_MODES = new Set([
                'pass-the-mic', 'companion-singalong', 'rate-my-song',
                'missing-words', 'blind', 'medley', 'battle-royale', 'tournament',
              ]);
              const currentMode = !party.selectedGameMode && PARTY_ONLY_MODES.has(rawMode)
                ? 'standard'
                : rawMode;

              // ── Unified party flow: picking a song from the library NEVER
              // starts the game. The song is stored and the user returns to
              // the party setup screen, where the explicit "Ready to Play"
              // button launches the mode (followed by the mode starting screen).
              if (party.selectedGameMode) {
                // ── Next-round pick (PTM/CPTM "next song" → library): return
                // DIRECTLY into the game screen (intro phase) with the same
                // players/settings — no setup detour. ──
                if (party.nextRoundPick === 'ptm') {
                  party.setNextRoundPick(null);
                  // ZOMBIE-NOTES FIX (user report, PTM + Library selection):
                  // a previous medley round left ptmMedleySnippets populated.
                  // Without this clear, the Library-picked single song ran
                  // with isMedleyMode=true — every player switch loaded
                  // another STALE snippet (notes from old songs piling up,
                  // "Zombie-Noten" that never cleared). The 'random' next-song
                  // path already clears this (party-game-screens.tsx) — the
                  // Library path is the leak.
                  party.setPtmMedleySnippets([]);
                  const playerCount = party.passTheMicPlayers?.length || 2;
                  const segments = generatePtmSegments(
                    song.duration,
                    playerCount,
                    party.passTheMicSettings?.segmentDuration,
                    song.lyrics,
                  );
                  party.setPassTheMicSegments(segments);
                  party.setPassTheMicSong(song);
                  party.setIsSongPlaying(false);
                  setScreen('pass-the-mic-game');
                  return;
                }
                if (party.nextRoundPick === 'cptm') {
                  party.setNextRoundPick(null);
                  // ZOMBIE-NOTES FIX — same leak as the PTM branch above:
                  // clear stale medley snippets from a previous round so the
                  // Library-picked CPTM song runs as a single song.
                  party.setPtmMedleySnippets([]);
                  const playerCount = party.cptmPlayers?.length || 2;
                  const segments = generatePtmSegments(
                    song.duration,
                    playerCount,
                    party.cptmSettings?.segmentDuration,
                    song.lyrics,
                  );
                  party.setCptmSegments(segments);
                  party.setCptmSong(song);
                  party.setIsSongPlaying(false);
                  setScreen('companion-singalong-game');
                  return;
                }
                party.setLibrarySelectedSong(song);
                party.setSongSelectionMethod('library');
                setScreen('party-setup');
                return;
              }

              resetGame();
              if (currentMode && currentMode !== 'standard') {
                setGameMode(currentMode);
              }
              setSong(song);
              setScreen('game');
            }}
            initialGameMode={gameState.gameMode}
            preselectMode={libraryPreselect ?? undefined}
            onNavigateToEditor={() => setScreen('editor')}
          />
        )}
        {screen === 'game' && (
          <GameScreen
            onEnd={handleGameEnd}
            onBack={handleSongAbort}
            onPause={() => {
              pauseGame();
              setPauseInitiator('Desktop');
              party.setPauseDialogAction('song-pause');
            }}
          />
        )}
        {screen === 'party' && (
          <PartyScreen
            onSelectMode={(mode) => {
              if (mode === 'online') {
                setScreen('online');
              } else {
                party.setSelectedGameMode(mode);
                setScreen('party-setup');
              }
            }}
          />
        )}

        <PartySetupSection screen={screen} setScreen={setScreen} />
        <PartyGameScreens screen={screen} setScreen={setScreen} />

        {screen === 'profile' && <CharacterScreen />}
        {screen === 'queue' && (
          <QueueScreen autoPlayNext={autoPlayNext} onPlayFromQueue={(song, gameMode, players) => {
            setAutoPlayNext(false);
            resetGame();
            const activeMode = gameState.gameMode;

            if (activeMode === 'pass-the-mic' && party.passTheMicPlayers?.length > 0) {
              const playerCount = party.passTheMicPlayers.length || 2;
              // Generate initial segments (may be time-based if lyrics lack notes)
              const segments = generatePtmSegments(song.duration, playerCount, party.passTheMicSettings?.segmentDuration, song.lyrics);
              party.setPassTheMicSegments(segments);
              // Async: load lyrics with notes for score-based segment splitting
              (async () => {
                try {
                  const { ensureSongUrls } = await import('@/lib/game/song-url-restore');
                  let songWithLyrics = song;
                  if (!song.lyrics?.length || song.lyrics.every(l => l.notes.length === 0)) {
                    try {
                      const { getSongByIdWithLyrics } = await import('@/lib/game/song-library');
                      const withLyrics = await getSongByIdWithLyrics(song.id);
                      if (withLyrics?.lyrics?.length) {
                        songWithLyrics = { ...song, lyrics: withLyrics.lyrics };
                      }
                    } catch { /* non-critical */ }
                  }
                  const finalSong = await ensureSongUrls(songWithLyrics);
                  const scoreSegments = generatePtmSegments(finalSong.duration, playerCount, party.passTheMicSettings?.segmentDuration, finalSong.lyrics);
                  party.setPassTheMicSegments(scoreSegments);
                  party.setPassTheMicSong(finalSong);
                  setSong(finalSong);
                } catch {
                  // Fallback: use whatever we already have
                  party.setPassTheMicSong(song);
                  setSong(song);
                }
              })();
              return;
            }

            if (activeMode === 'companion-singalong' && party.cptmPlayers?.length > 0) {
              const segments = generatePtmSegments(song.duration, party.cptmPlayers.length || 2, undefined, song.lyrics);
              if (segments.length > 0) {
                party.setCptmSong(song);
                party.setCptmSegments(segments);
                setSong(song);
                setScreen('companion-singalong-game');
              }
              return;
            }

            setSong(song);
            setGameMode(gameMode === 'duel' || gameMode === 'duet' ? 'duel' : 'standard');
            // Clear old players — zustand stores expose setState directly
            (useGameStore as any).setState?.((state: any) => ({ gameState: { ...state.gameState, players: [] } }));
            players.forEach(player => {
              const profile = profiles.find(p => p.id === player.id);
              if (profile) {
                addPlayer(profile);
              } else {
                // Companion partner not in desktop profiles — add with raw ID/name
                addPlayer({ id: player.id, name: player.name, avatar: undefined, color: '#888888' });
              }
            });
            setScreen('game');
          }} />
        )}
        {screen === 'mobile' && <MobileScreen />}
        {screen === 'highscores' && <HighscoreScreen />}
        {screen === 'results' && <ResultsScreen onPlayAgain={() => setScreen('library')} onHome={() => setScreen('home')} />}
        {screen === 'settings' && <SettingsScreen />}
        {screen === 'jukebox' && <JukeboxScreen />}
        {screen === 'achievements' && <AchievementsScreen />}
        {screen === 'dailyChallenge' && <DailyChallengeScreen onPlayChallenge={(song, options) => {
          // Look up the stored challenge mode ID and map it to a built-in game mode
          const challengeId = getItem(StorageKeys.CHALLENGE_MODE);
          if (challengeId) removeItem(StorageKeys.CHALLENGE_MODE); // Clear after reading
          const mappedMode = challengeId ? CHALLENGE_GAME_MODE_MAP[challengeId] : undefined;
          // The daily screen can pass its own game mode (solo / duel with 1-2
          // selected players) which takes precedence over challenge modes.
          setGameMode(options?.gameMode || mappedMode || 'standard');
          setChallengeMode(challengeId || undefined);
          setSong(song);
          setScreen('game');
        }} />}
        {screen === 'editor' && <EditorScreen onBack={() => setScreen('library')} />}
        {screen === 'online' && <OnlineMultiplayerScreen onBack={() => setScreen('party')} />}
      </main>

      {/* Song Pause Dialog */}
      {activeDialog === 'song-pause' && (
        <SongPauseDialog
          isTournamentMatch={isTournamentMatch}
          onResume={handleResumeGame}
          onAbort={handleSongAbort}
          onTournamentRepeat={handleTournamentRepeat}
          onTournamentManualWinner={handleTournamentManualWinner}
        />
      )}

      {/* Tournament Manual Winner Overlay */}
      {showTournamentWinnerOverlay && party.currentTournamentMatch && (() => {
        const match = party.currentTournamentMatch;
        return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">🏆</div>
              <h2 className="text-xl font-bold text-white">{t('matchAbort.selectWinner')}</h2>
              <p className="text-sm text-white/50 mt-1">
                {match.player1?.name} vs {match.player2?.name}
              </p>
            </div>
            <div className="space-y-3">
              {match.player1 && (
                <button
                  onClick={() => handleTournamentPickWinner(match.player1!.id)}
                  className="w-full py-4 text-sm bg-white/5 hover:bg-white/10 border border-white/20 rounded-xl flex items-center gap-3 px-4 transition-all"
                >
                  {match.player1!.avatar ? (
                    <img src={match.player1.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: match.player1.color }}>
                      {match.player1.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="font-medium flex-1 text-left">{match.player1.name}</span>
                  <span className="text-amber-400 font-bold">{t('matchAbort.asWinner')}</span>
                </button>
              )}
              {match.player2 && (
                <button
                  onClick={() => handleTournamentPickWinner(match.player2!.id)}
                  className="w-full py-4 text-sm bg-white/5 hover:bg-white/10 border border-white/20 rounded-xl flex items-center gap-3 px-4 transition-all"
                >
                  {match.player2!.avatar ? (
                    <img src={match.player2.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: match.player2.color }}>
                      {match.player2.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="font-medium flex-1 text-left">{match.player2.name}</span>
                  <span className="text-amber-400 font-bold">{t('matchAbort.asWinner')}</span>
                </button>
              )}
              <button
                onClick={handleTournamentCancelWinner}
                className="w-full py-2 text-sm text-white/40 hover:text-white/60"
              >
                {t('matchAbort.back')}
              </button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Desktop Chat Panel */}
      {showChatPanel && <DesktopChatPanel onClose={() => setShowChatPanel(false)} />}

      {/* Desktop Chat Notification Overlay */}
      <DesktopChatNotification />

      {/* Party Mode Leave Warning — Item 14: never render the leave dialog
          when no party mode is active (stale dialog state after leaving).
          Bug 12: gated on the DIRECT party-active computation — the
          navigation flag can be latched false while a party game still runs,
          which would suppress the dialog Escape just opened. */}
      {activeDialog === 'party-leave' && isPartyActiveDirect && (
        <PartyLeaveDialog
          onBack={handlePartyLeaveBack}
          onEndParty={handlePartyModeEnd}
        />
      )}
    </div>
    {!helpFabHidden && <HelpMenu />}
    </TourController>
  );
}
