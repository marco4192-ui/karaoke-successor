'use client';

import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { useGameStore } from '@/lib/game/store';
import { usePartyStore } from '@/lib/game/party-store';
import { startAppDataSync } from '@/lib/game/appdata-sync';
import { startTaxonomyAppDataSync } from '@/lib/game/taxonomy-appdata-sync';
import { CHALLENGE_GAME_MODE_MAP } from '@/lib/game/player-progression';
import { StorageKeys, getItem, removeItem } from '@/lib/storage';
import {
  getVerifiedConnectedAudioInputs,
  isSavedMicDeviceLive,
  scheduleStaleMicPrune,
} from '@/lib/audio/mic-device-resolver';
import { useGlobalKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { TourController } from '@/components/tutorial/tour-manager';
import { HelpMenu } from '@/components/tutorial/help-menu';
import { useGlobalRemoteControl } from '@/hooks/use-global-remote-control';
import { useMobileClient } from '@/hooks/use-mobile-client';
import { getAllSongs } from '@/lib/game/song-library';
import { generatePtmSegments } from '@/lib/game/ptm-segments';
import { recordMatchResult, getPlayableMatches } from '@/lib/game/tournament';
import { finishCompetitiveRound } from '@/lib/game/competitive-words-blind';
import { useTranslation } from '@/lib/i18n/translations';
import { useViralCharts } from '@/hooks/use-viral-charts';
import { postGameState } from '@/lib/desktop-instance';
import { toast } from '@/hooks/use-toast';
import { buildSettingsSnapshot } from '@/lib/companion/settings-snapshot';
import { buildDailySnapshots } from '@/lib/companion/daily-snapshot';

// Screen type & constants (canonical source)
import type { Screen } from '@/types/screens';
import { IMMERSIVE_SCREENS } from '@/types/screens';
// Mobile-mirror game-state shape (for the recent-parties sync payload)
import type { GameState } from '@/components/screens/mobile/mobile-types';
import { getMedleySyncSnapshot } from '@/lib/game/medley-sync';

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
// Motto-Party (R25): module import — read fresh inside the 2s sync (getConfig)
// so toggling the motto reaches the companion library without re-running
// this effect on every store change.
import { mottoParty } from '@/lib/game/motto-party';
// R33/P8: module-level jukebox mirror snapshot — read fresh inside the 3s
// jukebox-state push effect below (no re-render coupling).
import { getJukeboxMirrorSnapshot } from '@/components/screens/jukebox/use-jukebox';

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

  // ── R50 (point 5): AppData persistence for the Metadaten Studio config ──
  // Custom genre/language entries AND the harmonization rule overrides are
  // mirrored into the OS AppData database in the Tauri build — they survive
  // app updates and reinstalls (same protection as the player data above).
  // Browser builds are a no-op (localStorage only).
  useEffect(() => {
    const stop = startTaxonomyAppDataSync();
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

  // R27: gamestate single-writer election — when another desktop instance
  // (leftover browser tab, second window) owns the server-side gamestate
  // feed, this instance's 2s posts get 409. We then back off for a while and
  // inform the user once (repeated toasts would be spam). Retrying after the
  // backoff allows takeover when the other instance is closed.
  const syncConflictRef = useRef<{ pausedUntil: number; toastsShown: number; lastToastAt: number }>({
    pausedUntil: 0,
    toastsShown: 0,
    lastToastAt: 0,
  });

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

  // Tour hook-up (R29 chat tour): the TourController opens/closes the chat
  // panel via custom events — same low coupling as the help menu (?-button).
  // `karaoke-open-chat` only ever OPENS (never toggles), so a step that
  // navigates away and back doesn't accidentally close the panel mid-tour.
  useEffect(() => {
    const openChat = () => setShowChatPanel(true);
    const closeChat = () => setShowChatPanel(false);
    window.addEventListener('karaoke-open-chat', openChat);
    window.addEventListener('karaoke-close-chat', closeChat);
    return () => {
      window.removeEventListener('karaoke-open-chat', openChat);
      window.removeEventListener('karaoke-close-chat', closeChat);
    };
  }, []);

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

  // ── Global remote control from mobile companions ──
  const handleRemoteNavigation = useCallback((targetScreen: string) => {
    const screenMap: Record<string, Screen> = {
      'home': 'home', 'library': 'library', 'settings': 'settings',
      'queue': 'queue', 'party': 'party', 'profile': 'profile',
      'highscores': 'highscores', 'achievements': 'achievements',
      'jukebox': 'jukebox', 'editor': 'editor',
      'dailyChallenge': 'dailyChallenge', 'online': 'online',
      'party-setup': 'party-setup',
    };
    navigateWithGuard(screenMap[targetScreen] || 'home');
  }, [navigateWithGuard]);

  useGlobalRemoteControl({
    navigateToScreen: handleRemoteNavigation,
    isPlaying: screen === 'game',
  });

  // ── Handle remote party-mode events dispatched by global remote control ──
  useEffect(() => {
    const handleRemotePartyMode = (e: Event) => {
      const { mode } = (e as CustomEvent).detail || {};
      if (!mode) return;
      if (mode === 'online') {
        setScreen('online');
        return;
      }
      party.setSelectedGameMode(mode);
      setScreen('party-setup');
    };
    window.addEventListener('remote-party-mode', handleRemotePartyMode);
    return () => window.removeEventListener('remote-party-mode', handleRemotePartyMode);
  }, [party, setScreen]);

  // ── Handle remote party-difficulty events from companion ──
  useEffect(() => {
    const handleRemotePartyDifficulty = (e: Event) => {
      const { difficulty } = (e as CustomEvent).detail || {};
      if (!difficulty) return;
      // Dispatch event that UnifiedPartySetup can listen to
      window.dispatchEvent(new CustomEvent('party-set-difficulty', { detail: { difficulty } }));
    };
    window.addEventListener('remote-party-difficulty', handleRemotePartyDifficulty);
    return () => window.removeEventListener('remote-party-difficulty', handleRemotePartyDifficulty);
  }, []);

  // ── Handle remote party-start events from companion ──
  useEffect(() => {
    const handleRemotePartyStart = () => {
      // Robust selectors first (unified setup "Ready to Play", mode starting
      // screens, PTM/CPTM/BR intros), then fall back to a text search.
      const byId = document.querySelector<HTMLButtonElement>('#party-start-btn:not([disabled])');
      if (byId) { byId.click(); return; }

      const byTestId = document.querySelector<HTMLButtonElement>(
        '[data-testid="party-starting-start-button"]:not([disabled])'
      );
      if (byTestId) { byTestId.click(); return; }

      const introButtons = [
        'ptm-start-button',
      ].map(id => document.querySelector<HTMLButtonElement>(`[data-testid="${id}"]:not([disabled])`));
      const introBtn = introButtons.find(Boolean);
      if (introBtn) { introBtn!.click(); return; }

      // Fallback: first visible "Start"/"Spiel starten" button
      const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('button'));
      const startBtn = buttons.find(b => {
        const text = b.textContent?.toLowerCase() || '';
        return (text.includes('start') || text.includes('spiel starten')) && !b.disabled;
      });
      startBtn?.click();
    };
    window.addEventListener('remote-party-start', handleRemotePartyStart);
    return () => window.removeEventListener('remote-party-start', handleRemotePartyStart);
  }, []);

  // ── Handle companion pause: show desktop pause dialog with pauser name ──
  useEffect(() => {
    const handleCompanionPause = (e: Event) => {
      const { fromName } = (e as CustomEvent).detail || {};
      pauseGame();
      setPauseInitiator(fromName || 'Companion');
      party.setPauseDialogAction('song-pause');
      // Notify Socket.IO to push pause state to companions
      window.dispatchEvent(new CustomEvent('pause-state-change', {
        detail: { isPaused: true, pauseInitiator: fromName || 'Companion' },
      }));
      window.dispatchEvent(new CustomEvent('desktop-dialog-change', {
        detail: { dialog: 'song-pause' },
      }));
    };
    window.addEventListener('remote-companion-pause', handleCompanionPause);
    return () => window.removeEventListener('remote-companion-pause', handleCompanionPause);
  }, [pauseGame, party.setPauseDialogAction]);

  // ── Handle companion resume: dismiss desktop pause dialog and resume game ──
  useEffect(() => {
    const handleCompanionResume = () => {
      resumeGame();
      setPauseInitiator(null);
      party.setPauseDialogAction(null);
      // Notify Socket.IO to push resume state to companions
      window.dispatchEvent(new CustomEvent('pause-state-change', {
        detail: { isPaused: false, pauseInitiator: null },
      }));
      window.dispatchEvent(new CustomEvent('desktop-dialog-change', {
        detail: { dialog: null },
      }));
    };
    window.addEventListener('remote-companion-resume', handleCompanionResume);
    return () => window.removeEventListener('remote-companion-resume', handleCompanionResume);
  }, [resumeGame, party.setPauseDialogAction]);

  // ── Handle companion-triggered leave dialog (sync with desktop) ──
  useEffect(() => {
    const handleShowLeave = () => {
      // Item 14: ignore stale companion commands once the party is over —
      // otherwise the leave dialog would pop up on non-party screens.
      // Bug 12: DIRECT party-active check — the navigation flag can be
      // latched false while a party game still runs.
      if (!isPartyActiveDirect) return;
      party.setPauseDialogAction('party-leave');
      // Notify Socket.IO to push party-leave to companions
      window.dispatchEvent(new CustomEvent('party-leave-change', {
        detail: { show: true },
      }));
      window.dispatchEvent(new CustomEvent('desktop-dialog-change', {
        detail: { dialog: 'party-leave' },
      }));
    };
    window.addEventListener('remote-party-show-leave', handleShowLeave);
    return () => window.removeEventListener('remote-party-show-leave', handleShowLeave);
  }, [party.setPauseDialogAction, isPartyActiveDirect]);

  useEffect(() => {
    const handleLeaveConfirm = () => {
      // Clear the dialog FIRST — mirrors handlePartyModeEnd which calls
      // closeDialog() before resetPartyState(). Without this, if
      // resetPartyState() is blocked by the safety net (medley/CPTM),
      // the desktop overlay would stay open forever.
      party.setPauseDialogAction(null);
      // Item 14: force — explicit companion leave confirmation must fully
      // reset the party even when the medley/CPTM safety net would block.
      party.resetPartyState(true);
      resetGame();
      setGameMode('standard');
      setScreen('home');
    };
    window.addEventListener('remote-party-leave-confirm', handleLeaveConfirm);
    return () => window.removeEventListener('remote-party-leave-confirm', handleLeaveConfirm);
  }, [party.setPauseDialogAction, party.resetPartyState, resetGame, setScreen, setGameMode]);

  useEffect(() => {
    const handleLeaveCancel = () => {
      party.setPauseDialogAction(null);
    };
    window.addEventListener('remote-party-leave-cancel', handleLeaveCancel);
    return () => window.removeEventListener('remote-party-leave-cancel', handleLeaveCancel);
  }, [party.setPauseDialogAction]);

  // ── Handle companion "Song beenden" (R37) ──
  // companion_end_early now means EXACTLY what its label says: end the
  // current song early, with per-mode semantics (medley snippet → transition,
  // PTM/CPTM song → song-results, BR → round end, standard game → cleanup).
  // Outside a party, keep the legacy Escape fallback (pause dialog → Abort →
  // Library) — there is no mode screen listening for 'karaoke-end-song' on
  // non-party screens anyway, and a paused standard song must stay operable.
  useEffect(() => {
    const handleCompanionEndEarly = () => {
      if (!isPartyActiveDirect) {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        return;
      }
      // Close any open pause dialog first (the phone's Abort button also
      // lives inside the pause overlay) so the following phase change does
      // not leave a stale 'song-pause' on screen. The mode hooks' latch
      // guards (wasPausedRef) ensure no auto-resume fires for the ended song.
      party.setPauseDialogAction(null);
      window.dispatchEvent(new CustomEvent('karaoke-end-song', { detail: {} }));
    };
    window.addEventListener('remote-companion-end-early', handleCompanionEndEarly);
    return () => window.removeEventListener('remote-companion-end-early', handleCompanionEndEarly);
  }, [isPartyActiveDirect, party.setPauseDialogAction]);

  // ── Handle toggle-fullscreen event from remote control ──
  useEffect(() => {
    const handleToggleFullscreen = () => toggleFullscreen();
    window.addEventListener('toggle-fullscreen', handleToggleFullscreen);
    return () => window.removeEventListener('toggle-fullscreen', handleToggleFullscreen);
  }, [toggleFullscreen]);

  // ── Handle remote party cancel from companion (leave party-setup, reset state) ──
  useEffect(() => {
    const handleRemotePartyCancel = () => {
      // force — explicit companion cancel of the party setup must fully reset
      party.resetPartyState(true);
      resetGame();
      setGameMode('standard');
      setScreen('party');
    };
    window.addEventListener('remote-party-cancel', handleRemotePartyCancel);
    return () => window.removeEventListener('remote-party-cancel', handleRemotePartyCancel);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Handle remote party song selection from companion (library mode) ──
  useEffect(() => {
    const handleRemotePartySelectSong = async (e: Event) => {
      const { songId } = (e as CustomEvent).detail || {};
      if (!songId) return;
      const allSongs = getAllSongs();
      const song = allSongs.find(s => s.id === songId);
      if (!song) {
        // eslint-disable-next-line no-console
        console.error('[RemotePartySelectSong] Song not found:', songId);
        return;
      }
      // Load lyrics and URLs
      let songWithUrls = song;
      try {
        const { ensureSongUrls } = await import('@/lib/game/song-url-restore');
        songWithUrls = await ensureSongUrls(song);
        try {
          const { getSongByIdWithLyrics } = await import('@/lib/game/song-library');
          const withLyrics = await getSongByIdWithLyrics(song.id);
          if (withLyrics) songWithUrls = withLyrics;
        } catch { /* non-critical */ }
      } catch { /* non-critical */ }
      // Navigate to library screen with the song selected
      // The library screen will show the party setup overlay which auto-starts
      // SAFETY NET (same as the inline onSelectSong): a party-only game-store
      // mode with NO active party (selectedGameMode === null) is stale —
      // resetGame() preserves gameMode, so it would survive a party reset and
      // re-route this companion pick into a broken GameScreen. Clamp to standard.
      const rawRemoteMode = party.selectedGameMode || useGameStore.getState().gameState.gameMode;
      const REMOTE_PARTY_ONLY_MODES = new Set([
        'pass-the-mic', 'companion-singalong', 'rate-my-song',
        'missing-words', 'blind', 'medley', 'battle-royale', 'tournament',
      ]);
      const currentMode = !party.selectedGameMode && REMOTE_PARTY_ONLY_MODES.has(rawRemoteMode)
        ? 'standard'
        : rawRemoteMode;
      resetGame();
      if (currentMode && currentMode !== 'standard') {
        setGameMode(currentMode);
      }
      setSong(songWithUrls);
      // Same branching logic as the inline onSelectSong callback
      if (currentMode === 'pass-the-mic') {
        const playerCount = party.passTheMicPlayers?.length || 2;
        const segments = generatePtmSegments(songWithUrls.duration, playerCount, party.passTheMicSettings?.segmentDuration, songWithUrls.lyrics);
        party.setPassTheMicSegments(segments);
        // Set screen SYNCHRONOUSLY so companion sees 'pass-the-mic-game' immediately
        // instead of staying on 'library' during the async URL/lyrics work
        setScreen('pass-the-mic-game');
        // Then do async URL/lyrics enrichment in the background
        (async () => {
          try {
            const { ensureSongUrls } = await import('@/lib/game/song-url-restore');
            let sw = await ensureSongUrls(songWithUrls);
            if (!sw.lyrics?.length || sw.lyrics.every(l => l.notes.length === 0)) {
              try {
                const { getSongByIdWithLyrics } = await import('@/lib/game/song-library');
                const wl = await getSongByIdWithLyrics(sw.id);
                if (wl?.lyrics?.length) sw = { ...sw, lyrics: wl.lyrics };
              } catch { /* */ }
            }
            const scoreSegments = generatePtmSegments(sw.duration, playerCount, party.passTheMicSettings?.segmentDuration, sw.lyrics);
            party.setPassTheMicSegments(scoreSegments);
            party.setPassTheMicSong(sw);
          } catch { party.setPassTheMicSong(songWithUrls); }
        })();
      } else if (currentMode === 'companion-singalong') {
        party.setCptmSong(songWithUrls);
        party.setLibrarySelectedSong(songWithUrls);
        setScreen('party-setup');
      } else {
        setScreen('game');
      }
    };
    window.addEventListener('remote-party-select-song', handleRemotePartySelectSong);
    return () => window.removeEventListener('remote-party-select-song', handleRemotePartySelectSong);
  }, [resetGame, setGameMode, setSong, setScreen]);

  // ── Handle remote party vote from companion ──
  useEffect(() => {
    const handleRemotePartyVote = async (e: Event) => {
      const { songId } = (e as CustomEvent).detail || {};
      if (!songId) return;
      // Find the song in the voting songs list
      const selectedSong = party.votingSongs.find(s => s.id === songId);
      if (!selectedSong) return;
      // Ensure URLs
      let songWithUrls = selectedSong;
      try {
        const { ensureSongUrls } = await import('@/lib/game/song-url-restore');
        songWithUrls = await ensureSongUrls(selectedSong);
        if (!songWithUrls.lyrics || songWithUrls.lyrics.length === 0) {
          try {
            const { loadSongLyrics } = await import('@/lib/game/song-lyrics-loader');
            const lyrics = await loadSongLyrics(songWithUrls);
            if (lyrics.length > 0) songWithUrls = { ...songWithUrls, lyrics };
          } catch { /* */ }
        }
      } catch { /* */ }
      // Start the game with the voted song (same as SongVotingModal.onVote)
      resetGame();
      if (party.selectedGameMode) {
        setGameMode(party.selectedGameMode);
        setDifficulty(party.unifiedSetupResult?.difficulty || 'medium');
      }
      setSong(songWithUrls);
      if (party.selectedGameMode === 'companion-singalong') {
        const cptmPlayers = party.cptmPlayers || [];
        const cptmSegments = generatePtmSegments(songWithUrls.duration, cptmPlayers.length || 2, party.passTheMicSettings?.segmentDuration, songWithUrls.lyrics);
        party.setCptmSegments(cptmSegments);
        setScreen('companion-singalong-game');
      } else if (party.selectedGameMode === 'pass-the-mic') {
        // Use PTM game screen so intro phase is shown
        const ptmPlayers = party.passTheMicPlayers || [];
        const segments = generatePtmSegments(songWithUrls.duration, ptmPlayers.length || 2, party.passTheMicSettings?.segmentDuration, songWithUrls.lyrics);
        party.setPassTheMicSegments(segments);
        party.setPassTheMicSong(songWithUrls);
        setScreen('pass-the-mic-game');
      } else {
        setScreen('game');
      }
    };
    window.addEventListener('remote-party-vote', handleRemotePartyVote);
    return () => window.removeEventListener('remote-party-vote', handleRemotePartyVote);
  }, [resetGame, setGameMode, setSong, setScreen, party]);

  // ── Handle remote random song events (mirror Ctrl+R / Ctrl+D) ──
  useEffect(() => {
    const handleRemoteRandomSong = (e: Event) => {
      const { mode } = (e as CustomEvent).detail || {};
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
    };
    window.addEventListener('remote-random-song', handleRemoteRandomSong);
    return () => window.removeEventListener('remote-random-song', handleRemoteRandomSong);
  }, [resetGame, setGameMode, setSong, setScreen]);

  // ── Handle remote play-queue event (mirror Ctrl+Q) ──
  useEffect(() => {
    const handleRemotePlayQueue = () => {
      const q = useGameStore.getState().queue;
      // Check both zustand queue and companion server queue
      if (q.length === 0) {
        // No items in local queue — check companion queue
        fetch('/api/mobile?action=getqueue')
          .then((r) => r.json())
          .then((data) => {
            if (data.success && data.queue && data.queue.length > 0) {
              // Sync companion queue items into zustand store
              const store = useGameStore.getState();
              data.queue.forEach((item: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
                if (!store.queue.some((qi: { id: string }) => qi.id === item.id)) {
                  store.addCompanionToQueue(item);
                }
              });
              // Now navigate to queue with autoPlay
              setAutoPlayNext(true);
              navigateWithGuard('queue');
            }
          })
          .catch(() => {});
        return;
      }
      setAutoPlayNext(true);
      navigateWithGuard('queue');
    };
    window.addEventListener('remote-play-queue', handleRemotePlayQueue);
    return () => window.removeEventListener('remote-play-queue', handleRemotePlayQueue);
  }, [navigateWithGuard]);

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

  // ── R39/P7: Lokale Queue zum Server spiegeln ──
  // Der kontrollierende Companion zeigt die GESAMTE Warteschlange (wie die
  // Haupt-App) — dafür syncen wir die lokale zustand-Queue (nur ausstehende
  // Items, Song-Metadaten + Spieler) alle 2 s bzw. sofort bei Änderung via
  // POST syncdesktopqueue. Der Server merged sie in getqueue (isDesktop).
  const queueSyncRef = useRef<string>('');
  useEffect(() => {
    const items = queue
      .filter(q => q.status !== 'completed' && q.song)
      .map(q => ({
        id: q.id,
        songId: q.song.id,
        songTitle: q.song.title,
        songArtist: q.song.artist || '',
        playerName: q.playerName,
        partnerName: q.partnerName,
        gameMode: q.gameMode,
        status: q.status,
        addedAt: q.addedAt,
        playerMicSource: q.playerMicSource,
        partnerMicSource: q.partnerMicSource,
        playerMicName: q.playerMicName,
        partnerMicName: q.partnerMicName,
      }));
    const serialized = JSON.stringify(items);
    if (serialized === queueSyncRef.current) return;
    queueSyncRef.current = serialized;
    fetch('/api/mobile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'syncdesktopqueue', payload: { items } }),
    }).catch(() => { /* ignore — next queue change retries */ });
  }, [queue]);

  // ── Sync current screen to mobile companions (every 2s) ──
  useEffect(() => {
    const syncScreen = async () => {
      try {
        // R27a: Hidden-tab pause — a backgrounded karaoke tab must not fight
        // the visible instance for the gamestate feed (its 2s posts made
        // companion views flip-flop = cyclic remount). Skipping the POST
        // entirely also spares the server the payload computation + traffic.
        if (typeof document !== 'undefined' && document.hidden) return;

        // R27b: Conflict backoff — another desktop instance currently owns
        // the gamestate feed (server answered 409 recently). Wait before
        // retrying so we don't hammer the election with every 2s tick.
        if (Date.now() < syncConflictRef.current.pausedUntil) return;

        // ── Build intro data for ALL party game modes ──
        // Read the party store fresh at call time (NOT via closure) — the effect
        // deps intentionally exclude the party store object; otherwise every
        // per-frame score update would re-run this effect and spam the mobile
        // sync endpoint + console log.
        const partyNow = usePartyStore.getState();
        const isPartyIntro = ptmPhase === 'intro' && isPartyGameScreen;
        // Type matches ptmIntroData shape from mobile-types.ts GameState
        type PartyIntroData = {
          songTitle?: string;
          songArtist?: string;
          startPlayerName?: string;
          startPlayerAvatar?: string;
          startPlayerColor?: string;
          playerCount?: number;
          isMedley?: boolean;
          medleySnippetCount?: number;
          roundNumber?: number;
          totalRounds?: number;
          sharedMicName?: string;
          mediaLoaded?: boolean;
          partyGameMode?: string;
          vsPlayerName?: string;
          vsPlayerAvatar?: string;
          vsPlayerColor?: string;
          brPlayers?: { name: string; avatar?: string; color?: string }[];
        } | null;
        let introData: PartyIntroData = null;
        if (isPartyIntro) {
          const gameMode = partyNow.selectedGameMode;
          // Common base fields
          const base = {
            mediaLoaded: true,
            partyGameMode: gameMode || undefined,
          };

          if (screen === 'pass-the-mic-game' || screen === 'companion-singalong-game') {
            introData = {
              ...base,
              songTitle: partyNow.passTheMicSong?.title || partyNow.cptmSong?.title || undefined,
              songArtist: partyNow.passTheMicSong?.artist || partyNow.cptmSong?.artist || undefined,
              startPlayerName: (partyNow.passTheMicPlayers[0] || partyNow.cptmPlayers[0])?.name || undefined,
              startPlayerAvatar: (partyNow.passTheMicPlayers[0] || partyNow.cptmPlayers[0])?.avatar || undefined,
              startPlayerColor: (partyNow.passTheMicPlayers[0] || partyNow.cptmPlayers[0])?.color || undefined,
              playerCount: (partyNow.passTheMicPlayers.length || partyNow.cptmPlayers.length) || undefined,
              isMedley: partyNow.ptmSongSelection === 'medley' || undefined,
              medleySnippetCount: partyNow.medleySongs?.length || undefined,
              sharedMicName: partyNow.passTheMicSettings?.sharedMicName || undefined,
            };
          } else if (screen === 'medley-game') {
            introData = {
              ...base,
              songTitle: partyNow.medleySongs?.[0]?.song?.title || undefined,
              songArtist: partyNow.medleySongs?.[0]?.song?.artist || undefined,
              startPlayerName: partyNow.medleyPlayers?.[0]?.name || undefined,
              startPlayerAvatar: partyNow.medleyPlayers?.[0]?.avatar || undefined,
              startPlayerColor: partyNow.medleyPlayers?.[0]?.color || undefined,
              playerCount: partyNow.medleyPlayers?.length || undefined,
              isMedley: true,
              medleySnippetCount: partyNow.medleySongs?.length || undefined,
            };
          } else if (screen === 'battle-royale-game') {
            // Battle Royale: badge list of ALL players + round-1 song (if voted)
            const brGame = partyNow.battleRoyaleGame;
            const brPlayers = (brGame?.players || []).map((p) => ({
              name: p.name,
              avatar: p.avatar || undefined,
              color: p.color || undefined,
            }));
            introData = {
              ...base,
              playerCount: brPlayers.length || undefined,
              startPlayerName: brPlayers[0]?.name || undefined,
              startPlayerAvatar: brPlayers[0]?.avatar || undefined,
              startPlayerColor: brPlayers[0]?.color || undefined,
              brPlayers: brPlayers.length > 0 ? brPlayers : undefined,
              // currentRound is 0-based: round 1 = 0
              roundNumber: brGame ? brGame.currentRound + 1 : undefined,
              songTitle: (brGame?.currentRound === 0
                ? brGame?.settings?.firstRoundSongTitle
                : brGame?.rounds?.[brGame.currentRound]?.songName) || undefined,
            };
          } else if (screen === 'rate-my-song-game') {
            introData = {
              ...base,
              playerCount: partyNow.rateMySongPlayerIds?.length || undefined,
            };
          } else if (screen === 'tournament-game') {
            // Tournament: show BOTH duel players + the voted song (if any).
            // Only build data when a match is actually pending
            // (currentTournamentMatch is null while the bracket is on screen).
            const match = partyNow.currentTournamentMatch;
            if (match?.player1 && match?.player2) {
              introData = {
                ...base,
                songTitle: partyNow.tournamentVotedSong?.title || undefined,
                songArtist: partyNow.tournamentVotedSong?.artist || undefined,
                startPlayerName: match.player1.name,
                startPlayerAvatar: match.player1.avatar || undefined,
                startPlayerColor: match.player1.color || undefined,
                vsPlayerName: match.player2.name,
                vsPlayerAvatar: match.player2.avatar || undefined,
                vsPlayerColor: match.player2.color || undefined,
                playerCount: 2,
                roundNumber: partyNow.tournamentBracket?.currentRound || undefined,
                totalRounds: partyNow.tournamentBracket?.totalRounds || undefined,
              };
            }
          } else {
            // Generic competitive modes (missing-words, blind, tournament)
            introData = {
              ...base,
              songTitle: partyNow.competitiveGame?.rounds?.[0]?.songTitle || undefined,
              playerCount: partyNow.competitiveGame?.players?.length || undefined,
              startPlayerName: partyNow.competitiveGame?.players?.[0]?.name || undefined,
              startPlayerColor: partyNow.competitiveGame?.players?.[0]?.color || undefined,
            };
          }
        }

        // ── R36: Medley Contest LIVE game data ─────────────────────────
        // Same architecture as brGameData above: the medley game hook
        // writes a compact snapshot into a module singleton
        // (src/lib/game/medley-sync.ts); the master sync reads it fresh at
        // every 2s tick and pushes it to the companion phones while the
        // medley screen is active. The medley hook never sets the standard
        // game-store song/isPlaying — so we ALSO inject currentSong/
        // isPlaying/songEnded/gameMode here (same reason as brSongPayload:
        // the 2s gameStore spread below would push stale values otherwise
        // and fight the companion's auto-sing mic control).
        let medleyGameData: GameState['medleyGameData'] = null;
        let medleySongPayload: { id: string; title: string; artist: string } | null = null;
        let medleyPlayingOverride: boolean | null = null;
        if (screen === 'medley-game') {
          const ms = getMedleySyncSnapshot();
          if (ms) {
            if (ms.songTitle) {
              medleySongPayload = { id: ms.songId ?? '', title: ms.songTitle, artist: ms.songArtist ?? '' };
            }
            medleyPlayingOverride = ms.isPlaying;
            medleyGameData = {
              phase: ms.phase,
              playMode: ms.playMode,
              snippetIndex: ms.snippetIndex,
              snippetCount: ms.snippetCount,
              songTitle: ms.songTitle,
              songArtist: ms.songArtist,
              transitionCount: ms.transitionCount,
              isPlaying: ms.isPlaying,
              activeProfileIds: ms.activeProfileIds,
              players: ms.players.map(p => ({
                id: p.id,
                name: p.name,
                color: p.color,
                score: p.score,
                inputType: p.inputType,
                eliminated: p.isEliminated,
                snippetsSung: p.snippetsSung,
                team: p.team,
              })),
              matchup: ms.matchup,
              nextMatchup: ms.nextMatchup,
              eliminationOrder: ms.eliminationOrder.length > 0 ? ms.eliminationOrder : undefined,
              mysteryMode: ms.mysteryMode || undefined,
            };
          }
        }

        // ── Item 8.1: Battle Royale LIVE game data ─────────────────────
        // Pushed whenever the BR screen is active (intro AND playing) so the
        // companion BR in-game mirror can show the current (snippet) song,
        // the round number and live player scores. Avatars are stripped to
        // keep the 2s-poll payload small (color + initial only).
        let brGameData: GameState['brGameData'] = null;
        // BR never sets the standard game-store song — keep the companion's
        // gameState.currentSong stable (the 2s spread below would otherwise
        // push null and fight with the BR hook's useMobileGameSync pushes).
        let brSongPayload: { id: string; title: string; artist: string } | null = null;
        if (screen === 'battle-royale-game') {
          const brGame = partyNow.battleRoyaleGame;
          if (brGame) {
            // Current (snippet) song: medley snippet or the round's main song.
            const brSnippet = brGame.medleySnippetList.length > 0
              ? brGame.medleySnippetList[brGame.currentSnippetIndex]
              : null;
            const brSongId = brSnippet?.songId ?? brGame.rounds?.[brGame.currentRound]?.songId ?? null;
            const brSongTitle = brSnippet?.songName
              ?? brGame.rounds?.[brGame.currentRound]?.songName
              ?? (brGame.currentRound === 0 ? brGame.settings?.firstRoundSongTitle : undefined)
              ?? undefined;
            const brSongArtist = brSongId
              ? getAllSongs().find(s => s.id === brSongId)?.artist
              : undefined;
            if (brSongTitle) {
              brSongPayload = { id: brSongId ?? '', title: brSongTitle, artist: brSongArtist ?? '' };
            }
            brGameData = {
              status: brGame.status,
              roundNumber: brGame.currentRound + 1,
              songTitle: brSongTitle,
              songArtist: brSongArtist,
              snippetIndex: brGame.currentSnippetIndex,
              snippetCount: brGame.medleySnippetList.length,
              players: brGame.players.map(p => ({
                id: p.id,
                name: p.name,
                color: p.color || '#EF4444',
                score: p.score,
                eliminated: p.eliminated,
                playerType: p.playerType === 'companion' ? 'companion' : 'microphone',
              })),
              // Voting phase (6.2): push options + live votes so companion
              // apps can vote from their phone — including round 2+ votes.
              voteOptions: brGame.status === 'voting' && brGame.voteOptions
                ? brGame.voteOptions.map(o => ({
                  songName: o.songName,
                  votes: o.votes,
                  votedPlayerIds: o.votedPlayerIds,
                }))
                : undefined,
            };
          }
        }

        // ── Tournament bracket mirror: while the bracket is on screen (no duel
        // pending, intro phase), companions receive the list of OPEN duels so
        // they can display and start them (user request: companion bracket view).
        // Avatars are stripped — colors + initials keep the payload small.
        let tournamentBracketData: GameState['tournamentBracketData'] = null;
        if (screen === 'tournament-game' && isPartyActiveDirect && ptmPhase === 'intro' && !partyNow.currentTournamentMatch) {
          const b = partyNow.tournamentBracket;
          if (b) {
            const openMatches = getPlayableMatches(b)
              .filter(m => m.player1 && m.player2)
              .sort((a, x) => a.round - x.round
                || (a.bracketType === x.bracketType ? 0 : a.bracketType === 'winners' ? -1 : x.bracketType === 'winners' ? 1 : a.bracketType === 'losers' ? -1 : 1)
                || a.position - x.position)
              .map(m => ({
                matchId: m.id,
                round: m.round,
                position: m.position,
                bracketType: m.bracketType,
                player1: m.player1 ? { id: m.player1.id, name: m.player1.name, color: m.player1.color } : null,
                player2: m.player2 ? { id: m.player2.id, name: m.player2.name, color: m.player2.color } : null,
              }));
            tournamentBracketData = {
              visible: true,
              currentRound: b.currentRound,
              totalRounds: b.totalRounds,
              remainingPlayers: b.players.filter(p => !p.eliminated).length,
              tournamentType: b.settings.tournamentType,
              status: b.status === 'completed' ? 'completed' : 'in_progress',
              championName: b.champion?.name ?? null,
              votingActive: !!partyNow.tournamentVotingMatch,
              openMatches,
            };
          }
        }

        // R43: senderId is attached centrally by postGameState.
        // Party screen: sync the recent-parties history so the mobile mirror
        // can render the same "Recent Parties" section (avatars stripped —
        // data-URL avatars would bloat the 2s-poll payload).
        let recentPartiesPayload: GameState['recentParties'];
        if (screen === 'party') {
          try {
            const { getPartySessions, getSessionWinner } = await import('@/lib/game/party-session-history');
            recentPartiesPayload = getPartySessions().slice(0, 6).map(record => {
              const winner = getSessionWinner(record);
              return {
                id: record.id,
                mode: record.mode,
                finishedAt: record.finishedAt,
                rounds: record.rounds,
                songTitle: record.songTitle,
                winner: winner ? { name: winner.name, color: winner.color, score: winner.score, scoreKind: winner.scoreKind } : null,
                players: record.players.map(p => ({
                  name: p.name,
                  color: p.color,
                  score: p.score,
                  isWinner: p.isWinner,
                  scoreKind: p.scoreKind,
                })),
              };
            });
          } catch {
            // history is best-effort for the mirror
          }
        }
        // R43: routed through the unified postGameState helper — attaches the
        // instance senderId AND shares the module-level 409 backoff with all
        // other gamestate senders (setup push, CPTM turns, song-end notices):
        // when the master loop detects a conflict, EVERY sender in this tab
        // yields together instead of only the master pausing while the others
        // keep spamming 409s.
        const syncRes = await postGameState({
          ...useGameStore.getState().gameState,
              // BR: keep the companion's currentSong in sync with the current
              // BR (snippet) song instead of the (unset) standard song.
              ...(brSongPayload ? { currentSong: brSongPayload } : {}),
              // R36: Medley — same injection pattern for the medley snippet
              // song, PLUS explicit isPlaying/songEnded/gameMode overrides:
              // the medley hook never touches the game-store gameState, so
              // the spread above would push STALE values from a previous
              // standard game (e.g. songEnded=true would keep companion
              // mics from ever starting — the exact auto-sing stop flag).
              ...(medleySongPayload ? { currentSong: medleySongPayload } : {}),
              ...(screen === 'medley-game'
                ? {
                    isPlaying: medleyPlayingOverride ?? false,
                    songEnded: false,
                    gameMode: 'medley',
                  }
                : {}),
              currentScreen: screen,
              partyGameMode: partyNow.selectedGameMode || null,
              votingSongs: screen === 'song-voting' ? partyNow.votingSongs : [],
              partyLibrarySong: (screen === 'party-setup' || screen === 'library') && partyNow.librarySelectedSong
                ? { id: partyNow.librarySelectedSong.id, title: partyNow.librarySelectedSong.title, artist: partyNow.librarySelectedSong.artist }
                : null,
              isPartyModeActive: isPartyActiveDirect,
              desktopDialog: partyNow.pauseDialogAction,
              pauseInitiator,
              ptmPhase,
              ptmIntroData: introData,
              // Always send the key (null when not on the BR screen) so a
              // finished BR game doesn't leave stale data on the companions.
              brGameData: screen === 'battle-royale-game' ? brGameData : null,
              // R36: Same explicit-null pattern for medley — a finished
              // medley must clear the companion's medley mirror state.
              medleyGameData: screen === 'medley-game' ? medleyGameData : null,
              tournamentBracketData,
              viralSongIds: viralCharts.viralSongIds.size > 0 ? Array.from(viralCharts.viralSongIds) : [],
              // Motto-Party (R25): full config for the companion library —
              // read FRESH at call time (like partyNow above) so changes
              // propagate with the next 2s tick. Explicit null when disabled
              // so companions never keep a stale motto active.
              mottoParty: (() => {
                const m = mottoParty.getConfig();
                if (!m.enabled) return null;
                return {
                  enabled: true,
                  name: m.name,
                  logic: m.logic,
                  searchFields: m.searchFields.map(f => ({ id: f.id, term: f.term })),
                  filters: { ...m.filters },
                };
              })(),
              difficulty: useGameStore.getState().gameState.difficulty || 'medium',
              // R39/P4: Verfügbare Desktop-Mikrofone (MULTI_MIC_CONFIG) —
              // die Companion-Library braucht sie für die Gesangs-Gerät-
              // Auswahl im Song-Overlay (Mic vs. Companion-App). Kleine
              // Liste (id + Name), bleibt im 2s-Payload unkritisch.
              availableMics: readAvailableMicsForCompanions(),
              // R33/P16+: defaultDifficulty + settingsSnapshot are NO LONGER
              // embedded here (that pushed ~1 KB+ every 2 s without any
              // change). They go through the dedicated push-on-change effect
              // below (POST type:'settingssnapshot'), and companions PULL
              // them on every (re)connect via GET action=settingssnapshot.
              recentParties: recentPartiesPayload,
        });

        // R27d: Single-writer election response — 409 means another desktop
        // instance (second window / leftover tab) currently owns the gamestate
        // feed. Back off for 15 s (retrying afterwards allows takeover once
        // the other instance closes) and inform the user. The toast is
        // rate-limited: once immediately, then at most every 5 minutes.
        // R43: syncRes === null → post was skipped (module-level yield or
        // network error) — nothing to evaluate here.
        if (syncRes && syncRes.status === 409) {
          const conflict = syncConflictRef.current;
          conflict.pausedUntil = Date.now() + 15000;
          const now = Date.now();
          if (now - conflict.lastToastAt > 5 * 60 * 1000) {
            conflict.lastToastAt = now;
            conflict.toastsShown += 1;
            toast({ description: t('desktopSync.conflictToast') });
          }
        }
      } catch {
        // Non-critical — screen sync failure doesn't affect the app
      }
    };
    syncScreenRef.current = syncScreen;
    syncScreen();
    const interval = setInterval(syncScreen, 2000);
    return () => clearInterval(interval);
    // NOTE: `party` store object intentionally NOT in deps — syncScreen reads
    // fresh state via usePartyStore.getState(). Including it re-ran this effect
    // on every per-frame score update (~40/s during competitive games),
    // spamming the mobile sync endpoint and the console log.
  }, [screen, pauseInitiator, ptmPhase, isPartyActiveDirect, isPartyGameScreen, t]);

  // R27e: Resume the companion sync immediately when this tab becomes visible
  // again — pairs with the hidden-tab pause at the top of syncScreen so a
  // freshly focused window takes over the gamestate feed without waiting
  // for the next 2 s tick.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void syncScreenRef.current?.();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  // ── Tournament bracket live push ──
  // Bracket changes (duel started / finished, manual winner, vote started or
  // skipped) must reach the companion "open duels" list quickly — waiting for
  // the 2s interval makes the list feel stale. Push immediately (debounced
  // 250ms so a burst of changes results in a single POST).
  const tournamentBracketObj = party.tournamentBracket;
  const currentTournamentMatchObj = party.currentTournamentMatch;
  const tournamentVotingMatchObj = party.tournamentVotingMatch;
  useEffect(() => {
    const id = setTimeout(() => { void syncScreenRef.current?.(); }, 250);
    return () => clearTimeout(id);
  }, [tournamentBracketObj, currentTournamentMatchObj, tournamentVotingMatchObj]);

  // ── R33/P16+: Settings snapshot — global push ON CHANGE only ──
  // Replaces the old 2s gamestate embedding (values + webcam config +
  // default difficulty were POSTed every 2 s regardless of changes). Now a
  // cheap LOCAL check (localStorage read + JSON compare) runs every 5 s and
  // POSTs ONLY when the snapshot actually changed. A 60 s keep-alive re-push
  // heals server restarts (the store is in-memory), and companions
  // additionally PULL the snapshot on every (re)connect — so a fresh or
  // returning-after-absence companion always sees the real desktop values.
  const settingsPushRef = useRef<{ serialized: string; lastPushAt: number }>({ serialized: '', lastPushAt: 0 });
  useEffect(() => {
    const pushSnapshot = (force = false) => {
      try {
        const snapshot = buildSettingsSnapshot();
        const serialized = JSON.stringify(snapshot);
        const ref = settingsPushRef.current;
        const now = Date.now();
        // Skip when unchanged AND the last successful push is fresh (< 60 s)
        if (!force && serialized === ref.serialized && now - ref.lastPushAt < 60_000) return;
        settingsPushRef.current = { serialized, lastPushAt: now };
        fetch('/api/mobile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'settingssnapshot', payload: { snapshot } }),
        }).catch(() => {
          // Push failed (server hiccup) — allow an immediate retry on the
          // next check instead of waiting for the 60 s keep-alive.
          settingsPushRef.current.lastPushAt = 0;
        });
      } catch { /* non-critical */ }
    };
    pushSnapshot(true); // initial push so late-joining companions find data
    const interval = setInterval(() => pushSnapshot(), 5000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        // Settings may have changed while this tab was hidden (second window)
        // — re-check immediately, force keeps the keep-alive clock honest.
        pushSnapshot(true);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  // ── R33/P8: Jukebox state push for the companion Jukebox mirror ──
  // Same push-on-change pattern as the settings snapshot above: a cheap LOCAL
  // read (module-level mirror singleton from use-jukebox.ts — filters/shuffle/
  // repeat written by the hook, pool derived fresh from storage) runs every
  // 3 s and POSTs ONLY when the state actually changed. A 60 s keep-alive
  // re-push heals server restarts (the companion data store is in-memory);
  // companions additionally PULL via GET action=getjukeboxstate on view load.
  const jukeboxPushRef = useRef<{ serialized: string; lastPushAt: number }>({ serialized: '', lastPushAt: 0 });
  useEffect(() => {
    const pushJukeboxState = (force = false) => {
      try {
        const snap = getJukeboxMirrorSnapshot();
        // Compare WITHOUT updatedAt (a fresh timestamp would defeat the JSON
        // compare) — the timestamp is only attached to the POSTed payload.
        const serialized = JSON.stringify([
          snap.filters, snap.poolPlaylistId, snap.poolPlaylistName, snap.shuffle, snap.repeat,
        ]);
        const ref = jukeboxPushRef.current;
        const now = Date.now();
        // Skip when unchanged AND the last successful push is fresh (< 60 s)
        if (!force && serialized === ref.serialized && now - ref.lastPushAt < 60_000) return;
        jukeboxPushRef.current = { serialized, lastPushAt: now };
        fetch('/api/mobile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // NOTE: the server stores the payload OBJECT AS-IS (unlike
          // 'dailystate', which extracts payload.daily) and GET getjukeboxstate
          // returns it under the 'jukebox' key — so the payload must be the
          // FLAT state object for use-mobile-data's data.jukebox read to work.
          body: JSON.stringify({
            type: 'jukeboxstate',
            payload: {
              filters: snap.filters,
              poolPlaylistId: snap.poolPlaylistId || null,
              poolPlaylistName: snap.poolPlaylistName,
              shuffle: snap.shuffle,
              repeat: snap.repeat,
              updatedAt: now,
            },
          }),
        }).catch(() => {
          // Push failed (server hiccup) — allow an immediate retry on the
          // next 3 s check instead of waiting for the 60 s keep-alive.
          jukeboxPushRef.current.lastPushAt = 0;
        });
      } catch { /* non-critical */ }
    };
    pushJukeboxState(true); // initial push so late-joining companions find data
    const interval = setInterval(() => pushJukeboxState(), 3000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        // Jukebox state may have changed while this tab was hidden —
        // re-check immediately, force keeps the keep-alive clock honest.
        pushJukeboxState(true);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  // ── R33/P10: Highscores push for the companion Highscores mirror ──
  // Push the top-100 local highscores whenever they change (cheap JSON
  // compare) or every 15 s as a keep-alive after server restarts.
  const highscoresObj = useGameStore.getState().highscores;
  const highscoresRef = useRef<string>('');
  useEffect(() => {
    const pushHighscores = () => {
      try {
        const entries = (useGameStore.getState().highscores ?? []).slice(0, 100).map(h => ({
          playerId: h.playerId,
          playerName: h.playerName,
          playerColor: h.playerColor,
          songTitle: h.songTitle,
          artist: h.artist,
          score: h.score,
          accuracy: h.accuracy,
          maxCombo: h.maxCombo,
          difficulty: h.difficulty,
          gameMode: h.gameMode,
          date: h.playedAt ? new Date(h.playedAt).toISOString() : undefined,
        }));
        const serialized = JSON.stringify(entries);
        if (serialized === highscoresRef.current) return; // unchanged
        highscoresRef.current = serialized;
        fetch('/api/mobile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'highscores', payload: { entries } }),
        }).catch(() => { /* ignore */ });
      } catch { /* non-critical */ }
    };
    pushHighscores();
    const interval = setInterval(pushHighscores, 15000);
    return () => clearInterval(interval);
  }, [highscoresObj?.length, profiles]);

  // ── R33/P12: Daily-Challenge snapshot push for the companion Daily mirror ──
  // Per-profile slots/weekly/streak/badges. Computed every 5 s (cheap,
  // localStorage reads only) and pushed via POST type:'dailystate'.
  useEffect(() => {
    const pushDaily = () => {
      try {
        const allProfiles = useGameStore.getState().profiles ?? [];
        if (allProfiles.length === 0) return;
        const daily = buildDailySnapshots(allProfiles);
        fetch('/api/mobile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'dailystate', payload: { daily } }),
        }).catch(() => { /* ignore */ });
      } catch { /* non-critical */ }
    };
    pushDaily();
    const interval = setInterval(pushDaily, 5000);
    return () => clearInterval(interval);
  }, [profiles]);

  // ── R33/P11: Global profile-toggle handler from the companion ──
  // profile_toggle:<id>:<0|1> used to only work while the character screen
  // was mounted. Handle it globally so the controlling companion can
  // activate/deactivate players from ANY desktop screen (idempotent with the
  // character-screen listener — both set the same isActive value).
  useEffect(() => {
    const handleRemoteProfileToggle = (e: Event) => {
      const { profileId, isActive } = (e as CustomEvent<{ profileId: string; isActive: boolean }>).detail || {};
      if (!profileId) return;
      useGameStore.getState().updateProfile(profileId, { isActive: !!isActive });
    };
    window.addEventListener('remote-profile-toggle', handleRemoteProfileToggle);
    return () => window.removeEventListener('remote-profile-toggle', handleRemoteProfileToggle);
  }, []);

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
  // R28: der ?-Hilfe-Button sitzt in der Hauptmenüleiste (NavBar) — auf
  // immersiven Screens ist die NavBar ausgeblendet, dort gibt es daher
  // bewusst keinen Hilfe-Aufruf (Spiel-Screens bleiben frei von Ablenkung).

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
          // R42: results screen gets a flex column so the one-screen layout
          // (essentials left / share box right / actions at the very bottom)
          // fills the full viewport height without scrolling.
          : screen === 'results'
            ? 'px-4 pb-4 flex-1 min-h-0 lg:flex lg:flex-col'
            : 'px-4 pb-8 flex-1 min-h-0'
      }`}>
        {screen === 'home' && (
          <>
            <HomeScreen onNavigate={setScreen} onLaunchMode={handleLaunchMode} />
            {/* R33-e (P3): Tastenkürzel-Karte — reine Anzeige-Karte unter dem
                Home-Screen; einziger Zustand ist der lokale Collapse-State
                (localStorage), KEINE Effekte/Sync-Logik. Komponente liegt
                unten am Datei-Ende (HomeHotkeysCard). */}
            <HomeHotkeysCard />
          </>
        )}
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
    {/* R28: HelpMenu — der Auslöser (?-Button) sitzt jetzt in der Hauptmenüleiste
        (NavBar); das Dialog-Modul lauscht permanent auf das karaoke-open-help-Event
        und rendert null, wenn geschlossen. */}
    <HelpMenu />
    </TourController>
  );
}

// ═══ R33-e (P3): Tastenkürzel-Karte auf dem Desktop-Home-Screen ═══
// Kompakte, einklappbare Karte unter dem Home-Screen mit den wichtigsten
// globalen Tastenkürzeln. Die Kürzel sind ECHT (single source of truth:
// src/hooks/use-keyboard-shortcuts.ts — Ctrl+L Suche, Ctrl+R/D Zufalls-Song,
// Ctrl+Q Queue, Ctrl+J Jukebox, Esc/Enter Pause, F12 Vollbild, F1–F10
// Screen-Navigation); die Anzeige-Sprache kommt aus mobile.hotkeys.*
// (i18n; t() fällt bei fehlenden Übersetzungen automatisch auf EN zurück).
//
// Bewusst SEPARAT vom HomeScreen-Component gehalten (R33-e-Regel: nur der
// Render-Bereich hier in karaoke-app.tsx, home-screen.tsx bleibt unberührt)
// und bewusst OHNE jede State-/Sync-Logik: einziger Zustand ist der lokale
// Collapse-State — persistiert im localStorage-Key
// 'karaoke-hotkeys-collapsed' (Standard: aufgeklappt).
const HOTKEYS_COLLAPSE_STORAGE_KEY = 'karaoke-hotkeys-collapsed';

// ===================== R39/P4: Desktop-Mikrofone für Companions =====================
/** Liest die konfigurierten Desktop-Mikrofone (MULTI_MIC_CONFIG) und macht
 *  sie als schlanke {id, name}-Liste für den 2s-Gamestate-Push bereit. Die
 *  Companion-Library nutzt sie für die Gesangs-Gerät-Auswahl (Mic vs.
 *  Companion-App) im Song-Overlay. SSR-sicher (window-Guard) und fail-safe
 *  (kaputtes JSON → leere Liste). */
function readAvailableMicsForCompanions(): Array<{ id: string; name: string }> {
  if (typeof window === 'undefined') return [];
  try {
    const raw = getItem(StorageKeys.MULTI_MIC_CONFIG);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as {
      assignedMics?: Array<{ id?: string; deviceId?: string; customName?: string; deviceName?: string }>;
    };
    const entries = parsed.assignedMics ?? [];
    // R41/P10: Veraltete Devices rausfiltern — der Push darf nur Mics
    // enthalten, deren Hardware noch angeschlossen ist. Der liveness-Check
    // ist die SYNCHRONE Sicht auf den Resolver-Cache (null = unverifizierbar,
    // z. B. vor Mikrofon-Freigabe im Browser → dann unverändert lassen).
    const connected = getVerifiedConnectedAudioInputs();
    const live = entries.filter(m =>
      typeof m.id === 'string' && m.id.length > 0 && isSavedMicDeviceLive(m, connected));
    if (connected !== null && live.length < entries.length) {
      // Self-Heal: veraltete Einträge erkannt → persistente Config
      // (gedrosselt, fire-and-forget) aufräumen; der nächste 2s-Tick liest
      // dann saubere Daten.
      scheduleStaleMicPrune();
    }
    return live.map(m => ({ id: m.id as string, name: m.customName || m.deviceName || 'Mikrofon' }));
  } catch {
    return [];
  }
}


/** Die wichtigsten globalen Kürzel (key = Anzeige, label = mobile.hotkeys.*). */
const HOME_HOTKEY_ENTRIES: Array<{ keys: string; i18nKey: string; wide?: boolean }> = [
  { keys: 'Ctrl+L', i18nKey: 'mobile.hotkeys.ctrlL' },
  { keys: 'Ctrl+R', i18nKey: 'mobile.hotkeys.ctrlR' },
  { keys: 'Ctrl+D', i18nKey: 'mobile.hotkeys.ctrlD' },
  { keys: 'Ctrl+Q', i18nKey: 'mobile.hotkeys.ctrlQ' },
  { keys: 'Ctrl+J', i18nKey: 'mobile.hotkeys.ctrlJ' },
  { keys: 'Esc', i18nKey: 'mobile.hotkeys.esc' },
  { keys: 'Enter', i18nKey: 'mobile.hotkeys.enter' },
  { keys: 'F12', i18nKey: 'mobile.hotkeys.f12' },
  { keys: 'F1–F10', i18nKey: 'mobile.hotkeys.fkeys', wide: true },
];

function HomeHotkeysCard() {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);

  // Persistierter Collapse-State — erst NACH dem Mount lesen (vermeidet
  // SSR-/Hydration-Mismatch; Standard ist aufgeklappt, daher flackert die
  // Karte nur für Nutzer, die sie zuvor bewusst eingeklappt haben).
  useEffect(() => {
    try {
      if (window.localStorage.getItem(HOTKEYS_COLLAPSE_STORAGE_KEY) === '1') {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration sync (same pattern as HomeScreen)
        setCollapsed(true);
      }
    } catch { /* localStorage nicht verfügbar (Privat-Modus) — aufgeklappt bleiben */ }
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev;
      try {
        window.localStorage.setItem(HOTKEYS_COLLAPSE_STORAGE_KEY, next ? '1' : '0');
      } catch { /* ignore — Collapse funktioniert trotzdem für diese Session */ }
      return next;
    });
  }, []);

  return (
    <section
      aria-label={t('mobile.hotkeys.cardTitle')}
      className="w-full max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8 mb-8"
      data-testid="home-hotkeys-card"
    >
      <div className="retro-gradient-card retro-border-cyan rounded-xl">
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-expanded={!collapsed}
          aria-controls="home-hotkeys-list"
          data-testid="home-hotkeys-toggle"
          className="w-full flex items-center justify-between gap-3 p-5 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 transition-colors hover:bg-white/[0.03]"
        >
          <span className="flex items-center gap-3 min-w-0">
            <span className="text-2xl leading-none flex-shrink-0" aria-hidden>⌨️</span>
            <span className="min-w-0">
              <span className="block font-bold text-white">{t('mobile.hotkeys.cardTitle')}</span>
              <span className="block text-xs text-[#b8b8d0]/80 leading-snug">{t('mobile.hotkeys.cardHint')}</span>
            </span>
          </span>
          {/* Bildschirmleser: Zustand steckt in aria-expanded, die Aktion
              zusätzlich explizit als sr-only-Text. */}
          <span className="sr-only">{collapsed ? t('mobile.hotkeys.expand') : t('mobile.hotkeys.collapse')}</span>
          <span
            className={`text-white/40 text-sm flex-shrink-0 transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`}
            aria-hidden
          >
            ▾
          </span>
        </button>
        {!collapsed && (
          <div
            id="home-hotkeys-list"
            className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 px-5 pb-5"
          >
            {HOME_HOTKEY_ENTRIES.map(({ keys, i18nKey, wide }) => (
              <div
                key={keys}
                className={`flex items-center gap-3 min-w-0 ${wide ? 'sm:col-span-2' : ''}`}
                data-testid={`home-hotkey-${keys.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
              >
                <kbd className="flex-shrink-0 px-2 py-1 rounded-md border border-white/15 bg-white/10 text-xs font-semibold font-mono text-white/85 whitespace-nowrap shadow-sm min-w-[3.25rem] text-center">
                  {keys}
                </kbd>
                <span className="text-sm text-[#b8b8d0]/90 leading-snug">{t(i18nKey)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
