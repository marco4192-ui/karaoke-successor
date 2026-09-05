'use client';

import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { useGameStore } from '@/lib/game/store';
import { usePartyStore } from '@/lib/game/party-store';
import { CHALLENGE_GAME_MODE_MAP } from '@/lib/game/player-progression';
import { StorageKeys, getItem, removeItem } from '@/lib/storage';
import { useGlobalKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { useGlobalRemoteControl } from '@/hooks/use-global-remote-control';
import { useMobileClient } from '@/hooks/use-mobile-client';
import { getAllSongs } from '@/lib/game/song-library';
import { generatePtmSegments } from '@/lib/game/ptm-segments';
import { recordMatchResult } from '@/lib/game/tournament';
import { useTranslation } from '@/lib/i18n/translations';
import { useViralCharts } from '@/hooks/use-viral-charts';

// Screen type & constants (canonical source)
import type { Screen } from '@/types/screens';
import { IMMERSIVE_SCREENS } from '@/types/screens';

// Extracted hooks
import { useScreenNavigation } from '@/hooks/use-screen-navigation';
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
  const { gameState, setSong, setGameMode, setDifficulty, setChallengeMode, setActiveProfile, profiles, queue, resetGame, addPlayer, setResults, pauseGame, resumeGame } = useGameStore();
  const party = usePartyStore();
  const { t } = useTranslation();
  const viralCharts = useViralCharts();

  // ── Screen navigation (screen state + party-mode guard) ──
  const { screen, setScreen, isPartyModeActive, navigateWithGuard, pendingNavigation, setPendingNavigation, markPartyConfirmed } = useScreenNavigation(party);

  // ── App initialization effects (theme, custom songs, fullscreen, mobile redirect) ──
  const { isMounted, isFullscreen, toggleFullscreen } = useAppEffects();

  // ── Game flow handlers (tournament end, medley end, competitive end, etc.) ──
  const { handleGameEnd } = useGameFlowHandlers(
    party, gameState, { setResults, resetGame }, setScreen,
  );

  // ── Pause / Leave dialog state (driven by party store) ──
  type DialogAction = null | 'song-pause' | 'party-leave' | 'song-end-early';
  const [activeDialog, setActiveDialog] = useState<DialogAction>(null);

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
  useLayoutEffect(() => {
    if (isPartyGameScreen) {
      // Always ensure 'intro' is set when entering a game screen with null phase.
      // Don't overwrite a phase that was already set (e.g. 'countdown' from a fast start).
      setPtmPhase(prev => {
        if (prev === null) {
          // eslint-disable-next-line no-console
          console.log('[Party-Phase] Safety net (sync): setting intro (was null), screen=%s', screen);
          return 'intro';
        }
        return prev;
      });
    } else {
      setPtmPhase(null);
    }
  }, [screen, isPartyGameScreen]);

  // ── Ctrl-Q: flag to auto-play first queue item ──
  const [autoPlayNext, setAutoPlayNext] = useState(false);

  // ── Tournament manual winner overlay ──
  const [showTournamentWinnerOverlay, setShowTournamentWinnerOverlay] = useState(false);

  // ── Desktop chat panel ──
  const [showChatPanel, setShowChatPanel] = useState(false);

  useEffect(() => {
    setActiveDialog(party.pauseDialogAction);
  }, [party.pauseDialogAction]);

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
    if (isPartyModeActive) {
      closeDialog();
    } else {
      closeDialog();
      resumeGame();
    }
  }, [closeDialog, resumeGame, isPartyModeActive]);

  const handleSongAbort = useCallback(() => {
    // DO-NOT-CHANGE: Diagnostic logging for PartyTerminator debugging.
    // This helps identify which code path triggers the nuclear reset.
    // eslint-disable-next-line no-console
    console.log('[handleSongAbort] screen=%s, isPartyModeActive=%s, gameMode=%s, selectedGameMode=%s, isTournamentMatch=%s',
      screen, isPartyModeActive, gameState.gameMode, party.selectedGameMode, isTournamentMatch);

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
      const cgRounds = [...cg.rounds];
      if (cg.currentRoundIndex < cgRounds.length) {
        cgRounds[cg.currentRoundIndex] = { ...cgRounds[cg.currentRoundIndex], completed: true, player1Score: 0, player1Bonus: 0, player2Score: 0, player2Bonus: 0 };
      }
      const cgAllDone = cgRounds.length >= cg.totalRounds && cgRounds.every(r => r.completed);
      party.setCompetitiveGame({ ...cg, rounds: cgRounds, status: cgAllDone ? 'game-over' : 'round-end', winner: cgAllDone ? [...cg.players].sort((a, b) => b.totalScore - a.totalScore)[0] || null : null });
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
    if (!isPartyModeActive) {
      resetGame();
      setGameMode('standard');
      setScreen('library');
      return;
    }

    // ── CPTM abort: end song with evaluation instead of killing the series ──
    // The "Abort" button in the pause dialog should end the current song,
    // show the evaluation, and let the player continue to the next song.
    if (isPartyModeActive && party.selectedGameMode === 'companion-singalong') {
      // Signal CPTM to end the song early — the hook's pauseDialogAction
      // effect will detect this and transition to song-results.
      // We use a special action value that the CPTM hook can react to.
      party.setPauseDialogAction('song-end-early');
      return;
    }

    // ── Medley Contest abort: clear medley state, return to party setup ──
    // The dedicated medley game uses screen === 'medley-game' (not 'game'),
    // so the standard medley abort guard above (line 129, screen === 'game')
    // never matches. Without this guard, ESC→Abort falls through to the
    // PartyTerminator which nukes ALL party state.
    if (screen === 'medley-game' || screen === 'medley') {
      party.setMedleyPlayers([]);
      party.setMedleySongs([]);
      party.setMedleySettings(null);
      party.setMedleyMatches([]);
      party.setMedleySeriesHistory([]);
      party.setIsSongPlaying(false);
      setScreen('party');
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
    party.resetPartyState();
    resetGame();
    setGameMode('standard');
    setScreen('party');
  }, [closeDialog, screen, isTournamentMatch, isPartyModeActive, party, party.selectedGameMode, gameState.gameMode, resetGame, setScreen, setGameMode]);

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
    party.resetPartyState();
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
    isPartyModeActive,
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
      // Click the first visible "Start" or "Spiel starten" button in the DOM
      const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('button'));
      const startBtn = buttons.find(b => {
        const text = b.textContent?.toLowerCase() || '';
        return text.includes('start') || text.includes('spiel starten');
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
    };
    window.addEventListener('remote-companion-resume', handleCompanionResume);
    return () => window.removeEventListener('remote-companion-resume', handleCompanionResume);
  }, [resumeGame, party.setPauseDialogAction]);

  // ── Handle companion-triggered leave dialog (sync with desktop) ──
  useEffect(() => {
    const handleShowLeave = () => {
      party.setPauseDialogAction('party-leave');
    };
    window.addEventListener('remote-party-show-leave', handleShowLeave);
    return () => window.removeEventListener('remote-party-show-leave', handleShowLeave);
  }, [party.setPauseDialogAction]);

  useEffect(() => {
    const handleLeaveConfirm = () => {
      // Clear the dialog FIRST — mirrors handlePartyModeEnd which calls
      // closeDialog() before resetPartyState(). Without this, if
      // resetPartyState() is blocked by the safety net (medley/CPTM),
      // the desktop overlay would stay open forever.
      party.setPauseDialogAction(null);
      party.resetPartyState();
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

  // ── Handle toggle-fullscreen event from remote control ──
  useEffect(() => {
    const handleToggleFullscreen = () => toggleFullscreen();
    window.addEventListener('toggle-fullscreen', handleToggleFullscreen);
    return () => window.removeEventListener('toggle-fullscreen', handleToggleFullscreen);
  }, [toggleFullscreen]);

  // ── Handle remote party cancel from companion (leave party-setup, reset state) ──
  useEffect(() => {
    const handleRemotePartyCancel = () => {
      party.resetPartyState();
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
      const currentMode = party.selectedGameMode || useGameStore.getState().gameState.gameMode;
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

  // ── Sync current screen to mobile companions (every 2s) ──
  useEffect(() => {
    const syncScreen = async () => {
      try {
        // ── Build intro data for ALL party game modes ──
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
          sharedMicName?: string;
          mediaLoaded?: boolean;
          partyGameMode?: string;
        } | null;
        let introData: PartyIntroData = null;

        if (isPartyIntro) {
          const gameMode = party.selectedGameMode;
          // Common base fields
          const base = {
            mediaLoaded: true,
            partyGameMode: gameMode || undefined,
          };

          if (screen === 'pass-the-mic-game' || screen === 'companion-singalong-game') {
            introData = {
              ...base,
              songTitle: party.passTheMicSong?.title || party.cptmSong?.title || undefined,
              songArtist: party.passTheMicSong?.artist || party.cptmSong?.artist || undefined,
              startPlayerName: (party.passTheMicPlayers[0] || party.cptmPlayers[0])?.name || undefined,
              startPlayerAvatar: (party.passTheMicPlayers[0] || party.cptmPlayers[0])?.avatar || undefined,
              startPlayerColor: (party.passTheMicPlayers[0] || party.cptmPlayers[0])?.color || undefined,
              playerCount: (party.passTheMicPlayers.length || party.cptmPlayers.length) || undefined,
              isMedley: party.ptmSongSelection === 'medley' || undefined,
              medleySnippetCount: party.medleySongs?.length || undefined,
              sharedMicName: party.passTheMicSettings?.sharedMicName || undefined,
            };
          } else if (screen === 'medley-game') {
            introData = {
              ...base,
              songTitle: party.medleySongs?.[0]?.song?.title || undefined,
              songArtist: party.medleySongs?.[0]?.song?.artist || undefined,
              startPlayerName: party.medleyPlayers?.[0]?.name || undefined,
              startPlayerAvatar: party.medleyPlayers?.[0]?.avatar || undefined,
              startPlayerColor: party.medleyPlayers?.[0]?.color || undefined,
              playerCount: party.medleyPlayers?.length || undefined,
              isMedley: true,
              medleySnippetCount: party.medleySongs?.length || undefined,
            };
          } else if (screen === 'battle-royale-game') {
            introData = {
              ...base,
              playerCount: party.battleRoyaleGame?.players?.length || undefined,
              startPlayerName: party.battleRoyaleGame?.players?.[0]?.name || undefined,
              startPlayerColor: party.battleRoyaleGame?.players?.[0]?.color || undefined,
            };
          } else if (screen === 'rate-my-song-game') {
            introData = {
              ...base,
              playerCount: party.rateMySongPlayerIds?.length || undefined,
            };
          } else {
            // Generic competitive modes (missing-words, blind, tournament)
            introData = {
              ...base,
              songTitle: party.competitiveGame?.rounds?.[0]?.songTitle || undefined,
              playerCount: party.competitiveGame?.players?.length || undefined,
              startPlayerName: party.competitiveGame?.players?.[0]?.name || undefined,
              startPlayerColor: party.competitiveGame?.players?.[0]?.color || undefined,
            };
          }
        }

        // Debug: log party intro sync state
        if (isPartyGameScreen) {
          // eslint-disable-next-line no-console
          console.log('[Party-Sync] screen=%s, ptmPhase=%s, isPartyIntro=%s, hasIntroData=%s',
            screen, ptmPhase, isPartyIntro, !!introData);
        }
        await fetch('/api/mobile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'gamestate',
            payload: {
              ...useGameStore.getState().gameState,
              currentScreen: screen,
              partyGameMode: party.selectedGameMode || null,
              votingSongs: screen === 'song-voting' ? party.votingSongs : [],
              partyLibrarySong: (screen === 'party-setup' || screen === 'library') && party.librarySelectedSong
                ? { id: party.librarySelectedSong.id, title: party.librarySelectedSong.title, artist: party.librarySelectedSong.artist }
                : null,
              isPartyModeActive,
              desktopDialog: party.pauseDialogAction,
              pauseInitiator,
              ptmPhase,
              ptmIntroData: introData,
              viralSongIds: viralCharts.viralSongIds.size > 0 ? Array.from(viralCharts.viralSongIds) : [],
              difficulty: useGameStore.getState().gameState.difficulty || 'medium',
            },
          }),
        });
      } catch {
        // Non-critical — screen sync failure doesn't affect the app
      }
    };
    syncScreen();
    const interval = setInterval(syncScreen, 2000);
    return () => clearInterval(interval);
  }, [screen, pauseInitiator, ptmPhase, isPartyModeActive, isPartyGameScreen, party]);

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
          party.resetPartyState();
          resetGame();
          setGameMode('standard');
          setScreen(target);
        }}
      />
    );
  }

  // ===================== MAIN RENDER =====================
  return (
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
        {screen === 'home' && <HomeScreen onNavigate={setScreen} />}
        {screen === 'library' && (
          <LibraryScreen
            onSelectSong={(song, explicitGameMode) => {
              // Preserve the gameMode set by LibraryScreen.handleStartGame
              // (e.g. 'duel' or 'duet') across the resetGame() call.
              // IMPORTANT: Prefer explicitGameMode passed from the caller
              // over the store value to avoid timing/race conditions.
              const currentMode = explicitGameMode || useGameStore.getState().gameState.gameMode;
              resetGame();
              if (currentMode && currentMode !== 'standard') {
                setGameMode(currentMode);
              }
              setSong(song);
              if (currentMode === 'pass-the-mic') {
                const playerCount = party.passTheMicPlayers?.length || 2;
                // Always generate initial segments (may be time-based if lyrics lack notes)
                const segments = generatePtmSegments(song.duration, playerCount, party.passTheMicSettings?.segmentDuration, song.lyrics);
                party.setPassTheMicSegments(segments);
                // Set screen SYNCHRONOUSLY so companion sees 'pass-the-mic-game' immediately
                // instead of staying on 'library' during the async URL/lyrics work
                setScreen('pass-the-mic-game');
                // Then do async URL/lyrics enrichment in the background
                (async () => {
                  try {
                    const { ensureSongUrls } = await import('@/lib/game/song-url-restore');
                    let songWithUrls = await ensureSongUrls(song);
                    // Also load lyrics from DB if the song has none or lyrics without notes
                    if (!songWithUrls.lyrics?.length || songWithUrls.lyrics.every(l => l.notes.length === 0)) {
                      try {
                        const { getSongByIdWithLyrics } = await import('@/lib/game/song-library');
                        const withLyrics = await getSongByIdWithLyrics(songWithUrls.id);
                        if (withLyrics?.lyrics?.length) {
                          songWithUrls = { ...songWithUrls, lyrics: withLyrics.lyrics };
                        }
                      } catch { /* non-critical */ }
                    }
                    // Always regenerate segments with the best available lyrics for score-based splitting
                    const scoreSegments = generatePtmSegments(songWithUrls.duration, playerCount, party.passTheMicSettings?.segmentDuration, songWithUrls.lyrics);
                    party.setPassTheMicSegments(scoreSegments);
                    party.setPassTheMicSong(songWithUrls);
                  } catch {
                    party.setPassTheMicSong(song);
                  }
                })();
              } else if (currentMode === 'companion-singalong') {
                party.setCptmSong(song);
                party.setLibrarySelectedSong(song);
                setScreen('party-setup');
              } else if (currentMode === 'rate-my-song' && party.rateMySongSettings) {
                const duration = party.rateMySongSettings.duration;
                party.setRateMySongSettings({ ...party.rateMySongSettings, songId: song.id });
                if (duration === 'short') {
                  setSong({ ...song, start: song.start, end: Math.min((song.start || 0) + 60000, song.end || song.duration) });
                }
                setScreen('game');
              } else {
                // Standard, duel, duet, rate-my-song (no duration trim), or any other mode.
                // Players and gameMode are already set by LibraryScreen.handleStartGame
                // and preserved across resetGame(). No need to re-add players here.
                setScreen('game');
              }
            }}
            initialGameMode={gameState.gameMode}
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
        {screen === 'dailyChallenge' && <DailyChallengeScreen onPlayChallenge={(song) => {
          // Look up the stored challenge mode ID and map it to a built-in game mode
          const challengeId = getItem(StorageKeys.CHALLENGE_MODE);
          if (challengeId) removeItem(StorageKeys.CHALLENGE_MODE); // Clear after reading
          const mappedMode = challengeId ? CHALLENGE_GAME_MODE_MAP[challengeId] : undefined;
          setGameMode(mappedMode || 'standard');
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

      {/* Party Mode Leave Warning */}
      {activeDialog === 'party-leave' && (
        <PartyLeaveDialog
          onBack={handlePartyLeaveBack}
          onEndParty={handlePartyModeEnd}
        />
      )}
    </div>
  );
}
