'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MusicIcon, LibraryIcon, PartyIcon, UserIcon, QueueIcon, StarIcon, TrophyIcon, SettingsIcon } from '@/components/icons';
import { useGlobalKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { useGlobalRemoteControl } from '@/hooks/use-global-remote-control';
import { useMobileClient } from '@/hooks/use-mobile-client';
import { useGameStore } from '@/lib/game/store';
import { usePartyStore } from '@/lib/game/party-store';
import { getAllSongs, loadCustomSongsFromStorage } from '@/lib/game/song-library';
// Extracted screens
import { HomeScreen, PartyScreen, QueueScreen, AchievementsScreen, HighscoreScreen, CharacterScreen, EditorScreen, OnlineMultiplayerScreen, DailyChallengeScreen, JukeboxScreen, MobileScreen, ResultsScreen, LibraryScreen, SettingsScreen, GameScreen } from '@/components/screens';
// Extracted components
import { NavBar, FullscreenExitButton } from '@/components/home/navbar';
import { PartySetupSection } from '@/components/party/party-setup-section';
import { PartyGameScreens } from '@/components/party/party-game-screens';
import { Song, GameMode } from '@/types/game';
import { applyTheme, getStoredTheme } from '@/lib/game/themes';
import { PassTheMicSegment } from '@/components/game/pass-the-mic-screen';
import { recordMatchResult } from '@/lib/game/tournament';
import { finishCompetitiveRound } from '@/lib/game/competitive-words-blind';
import { OfflineBanner } from '@/components/ui/offline-banner';

import { generatePtmSegments } from '@/lib/game/ptm-segments';

// Screen types
type Screen = 'home' | 'library' | 'game' | 'party' | 'character' | 'queue' | 'mobile' | 'results' | 'highscores' | 'import' | 'settings' | 'jukebox' | 'achievements' | 'dailyChallenge' | 'tournament' | 'tournament-game' | 'battle-royale' | 'battle-royale-game' | 'pass-the-mic' | 'pass-the-mic-game' | 'companion-singalong' | 'companion-singalong-game' | 'medley' | 'medley-game' | 'editor' | 'online' | 'party-setup' | 'song-voting' | 'missing-words' | 'missing-words-game' | 'blind' | 'blind-game' | 'rate-my-song' | 'rate-my-song-rating' | 'rate-my-song-results';

// Screens where the navbar should be hidden (immersive / fullscreen experiences)
const IMMERSIVE_SCREENS: Set<Screen> = new Set([
  'editor',
  'game',
  'pass-the-mic-game',
  'battle-royale-game',
  'companion-singalong-game',
]);

// ===================== MAIN APP =====================
export default function KaraokeSuccessor() {
  // All hooks must be called before any conditional returns
  const [screen, setScreen] = useState<Screen>('home');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMounted, setIsMounted] = useState(false); // Track client-side mount
  const { gameState, setSong, setGameMode, profiles, queue, resetGame, addPlayer, setResults, pauseGame, resumeGame } = useGameStore();
  const party = usePartyStore();

  // ── Pause / Leave dialog — driven by party store so components can trigger it too ──
  // Local mirror of party.pauseDialogAction (used for rendering)
  const [activeDialog, setActiveDialog] = useState<null | 'song-pause' | 'party-leave'>(null);

  useEffect(() => {
    setActiveDialog(party.pauseDialogAction);
  }, [party.pauseDialogAction]);

  // ── Party mode active guard ──
  const isPartyModeActive = !!(
    party.tournamentBracket ||
    party.battleRoyaleGame ||
    (party.passTheMicPlayers && party.passTheMicPlayers.length > 0 && party.passTheMicSong) ||
    (party.medleyPlayers && party.medleyPlayers.length > 0 && party.medleySongs && party.medleySongs.length > 0) ||
    party.competitiveGame ||
    party.rateMySongSettings
  );

  const [pendingNavigation, setPendingNavigation] = useState<Screen | null>(null);

  const navigateWithGuard = useCallback((target: Screen) => {
    // Screens that are allowed without confirmation when a party mode is active
    // Note: 'party' and 'party-setup' are intentionally excluded so the user
    // gets a leave-warning when clicking the "Party" nav item mid-game.
    const partyScreens: Screen[] = [
      'pass-the-mic', 'pass-the-mic-game',
      'medley', 'medley-game', 'battle-royale', 'battle-royale-game',
      'tournament', 'tournament-game', 'missing-words', 'missing-words-game',
      'blind', 'blind-game', 'companion-singalong', 'companion-singalong-game',
      'song-voting', 'game', 'results', 'rate-my-song', 'rate-my-song-rating', 'rate-my-song-results',
    ];
    if (partyScreens.includes(target)) {
      setScreen(target);
      return;
    }
    if (isPartyModeActive) {
      setPendingNavigation(target);
      return;
    }
    setScreen(target);
  }, [isPartyModeActive]);

  // On mount: load custom songs from IndexedDB (async, updates cache)
  useEffect(() => {
    loadCustomSongsFromStorage().catch(err => {
      console.warn('[App] Failed to load custom songs from IndexedDB:', err);
    });
  }, []);

  // Toggle fullscreen function
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  // Handle tournament game end - record result and go back to bracket
  const handleTournamentGameEnd = useCallback(() => {
    if (!party.tournamentBracket || !party.currentTournamentMatch) {
      setScreen('results');
      return;
    }

    // Get scores from game results
    let results = gameState.results;
    if (!results || results.players.length < 2) {
      // If no results yet, create them from current game state
      const players = gameState.players;
      if (players.length < 2) {
        setScreen('results');
        return;
      }

      // Create results from current game state
      const gameResult: import('@/types/game').GameResult = {
        players: players.map(p => {
          let rating: 'perfect' | 'excellent' | 'good' | 'okay' | 'poor';
          if (p.accuracy >= 95) rating = 'perfect';
          else if (p.accuracy >= 85) rating = 'excellent';
          else if (p.accuracy >= 70) rating = 'good';
          else if (p.accuracy >= 50) rating = 'okay';
          else rating = 'poor';
          return {
            playerId: p.id,
            score: p.score,
            accuracy: p.accuracy,
            notesHit: p.notesHit,
            notesMissed: p.notesMissed,
            maxCombo: p.maxCombo,
            rating,
          };
        }),
        songId: gameState.currentSong?.id || '',
        playedAt: Date.now(),
        duration: gameState.currentTime,
      };
      setResults(gameResult);
      // Use the local result directly — gameState.results in this closure
      // won't be updated yet since the store update is asynchronous.
      results = gameResult;
    }

    // Get final results (use local variable, not re-reading stale closure state)
    const finalResults = results;
    if (!finalResults || finalResults.players.length < 2) {
      setScreen('results');
      return;
    }

    // Get scores for both players
    const score1 = finalResults.players[0]?.score || 0;
    const score2 = finalResults.players[1]?.score || 0;

    // Record match result in bracket
    const updatedBracket = recordMatchResult(
      party.tournamentBracket,
      party.currentTournamentMatch.id,
      score1,
      score2
    );

    // Update bracket state
    party.setTournamentBracket(updatedBracket);

    // Clear current match
    party.setCurrentTournamentMatch(null);

    // Go back to tournament bracket view
    setScreen('tournament-game');
  }, [party.tournamentBracket, party.currentTournamentMatch, gameState.results, gameState.players, gameState.currentSong, gameState.currentTime, gameState.gameMode, gameState.difficulty, setResults]);

  // Handle game end based on game mode
  const handleGameEnd = useCallback(() => {
    // Check if we're finishing a medley snippet — return to medley flow
    // Note: The new MedleyGameScreen handles its own game loop and scoring.
    // This handler catches edge cases where the main game screen was used.
    if ((gameState.gameMode === 'medley' || gameState.gameMode === 'duel') && party.medleySongs.length > 0 && party.medleySettings) {
      const results = gameState.results;
      const players = gameState.players;

      // Accumulate snippet scores into medley player scores
      const updatedPlayers = party.medleyPlayers.map(p => {
        const gamePlayer = players?.find((gp: any) => gp.id === p.id);
        const resultPlayer = results?.players?.find((rp: any) => rp.playerId === p.id);
        if (!gamePlayer && !resultPlayer) return p;

        const score = resultPlayer?.score || gamePlayer?.score || 0;
        const notesHit = resultPlayer?.notesHit || gamePlayer?.notesHit || 0;
        const notesMissed = resultPlayer?.notesMissed || gamePlayer?.notesMissed || 0;
        const maxCombo = resultPlayer?.maxCombo || gamePlayer?.maxCombo || 0;

        return {
          ...p,
          score: p.score + score,
          notesHit: p.notesHit + notesHit,
          notesMissed: p.notesMissed + notesMissed,
          maxCombo: Math.max(p.maxCombo, maxCombo),
          snippetsSung: p.snippetsSung + 1,
        };
      });
      party.setMedleyPlayers(updatedPlayers);
      setScreen('medley-game');
      return;
    }

    // Check if we're in a competitive Missing Words / Blind match
    if (party.competitiveGame && (gameState.gameMode === 'missing-words' || gameState.gameMode === 'blind')) {
      const results = gameState.results;
      const players = gameState.players;

      // Get scores from results or current game state
      const score1 = results?.players?.[0]?.score || players?.[0]?.score || 0;
      const score2 = results?.players?.[1]?.score || players?.[1]?.score || 0;

      // TODO: Calculate bonus points for missing words / blind sections hit
      // For now, bonus is 0 — will be wired in a follow-up
      const bonus1 = 0;
      const bonus2 = 0;

      // Record round results in the competitive game
      const updatedGame = finishCompetitiveRound(
        party.competitiveGame,
        score1, bonus1,
        score2, bonus2
      );
      party.setCompetitiveGame(updatedGame);

      // Navigate back to competitive game view (scoreboard / next round / winner)
      const modeScreen = gameState.gameMode === 'missing-words' ? 'missing-words-game' : 'blind-game';
      setScreen(modeScreen as Screen);
      return;
    }

    // Check if we're in a tournament match (has party.currentTournamentMatch set)
    if (party.currentTournamentMatch && party.tournamentBracket) {
      handleTournamentGameEnd();
    } else if (gameState.gameMode === 'pass-the-mic' || gameState.gameMode === 'companion-singalong') {
      // Pass the Mic / Companion: clean up party state and return to settings
      // (NOT results — PTM has its own results in PassTheMicGameView;
      //  the main game screen is only used for the first song of a series)
      if (gameState.gameMode === 'pass-the-mic') {
        party.setPassTheMicSong(null);
        party.setPassTheMicSegments([]);
      } else {
        party.setCompanionSong(null);
      }
      resetGame();
      setScreen('party-setup');
    } else if (gameState.gameMode === 'rate-my-song') {
      // Rate my Song: go to rating screen instead of results
      setScreen('rate-my-song-rating');
    } else {
      setScreen('results');
    }
  }, [party.competitiveGame, party.currentTournamentMatch, party.tournamentBracket, party.medleySongs, party.medleySettings, party.medleyPlayers, gameState.results, gameState.players, gameState.gameMode, handleTournamentGameEnd]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // ── Dialog handlers (must be defined before any conditional return) ──
  const setPauseDialogAction = useCallback((action: null | 'song-pause' | 'party-leave') => {
    party.setPauseDialogAction(action);
  }, []);

  const closeDialog = useCallback(() => {
    party.setPauseDialogAction(null);
  }, []);

  // Song-pause: Fortsetzen (resume)
  const handleResumeGame = useCallback(() => {
    closeDialog();
    resumeGame();
  }, [closeDialog, resumeGame]);

  // Song-pause: Abbrechen (non-tournament modes — leave song, return to party mode settings)
  const handleSongAbort = useCallback(() => {
    closeDialog();

    if (screen === 'game') {
      // Main game screen — mode-specific cleanup
      if (party.currentTournamentMatch && party.tournamentBracket) {
        party.setTournamentMatchAborted(true);
        resetGame();
        setScreen('tournament-game');
        return;
      }
      if (party.competitiveGame) {
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
      if ((gameState.gameMode === 'medley' || gameState.gameMode === 'duel') && party.medleySongs.length > 0) {
        resetGame();
        setScreen('medley-game');
        return;
      }
      if (gameState.gameMode === 'rate-my-song') {
        resetGame();
        setScreen('rate-my-song-rating');
        return;
      }
      if (gameState.gameMode === 'pass-the-mic' || gameState.gameMode === 'companion-singalong') {
        // PTM / Companion during main game screen — return to mode settings
        if (gameState.gameMode === 'pass-the-mic') {
          // Keep players and settings so user can restart quickly
          party.setPassTheMicSong(null);
          party.setPassTheMicSegments([]);
        } else {
          party.setCompanionPlayers([]);
          party.setCompanionSong(null);
          party.setCompanionSettings(null);
        }
        resetGame();
        setScreen('party-setup');
        return;
      }
      resetGame();
      setScreen('library');
      return;
    }

    // BR / PTM / Companion — their own screens (not main game screen)
    if (party.battleRoyaleGame) {
      party.setBattleRoyaleGame(null);
      resetGame();
      setScreen('party');
      return;
    }
    if (party.passTheMicPlayers?.length > 0) {
      // Keep players and settings, just clear the song to allow restart
      party.setPassTheMicSong(null);
      party.setPassTheMicSegments([]);
      resetGame();
      setScreen('party-setup');
      return;
    }
    if (party.companionPlayers.length > 0) {
      party.setCompanionPlayers([]);
      party.setCompanionSong(null);
      party.setCompanionSettings(null);
      resetGame();
      setScreen('party');
      return;
    }

    resetGame();
    setScreen('library');
  }, [closeDialog, screen, party, gameState, resetGame, setScreen]);

  // Tournament song-pause: Game wiederholen
  const handleTournamentRepeat = useCallback(() => {
    closeDialog();
    if (!party.currentTournamentMatch) return;
    const match = party.currentTournamentMatch;

    // Resume first so useGameLoop can clean up properly
    resumeGame();

    resetGame();
    addPlayer({ id: match.player1!.id, name: match.player1!.name, avatar: match.player1!.avatar, color: match.player1!.color });
    addPlayer({ id: match.player2!.id, name: match.player2!.name, avatar: match.player2!.avatar, color: match.player2!.color });
    setGameMode('duel');
    const songs = getAllSongs();
    if (songs.length > 0) {
      const randomSong = songs[Math.floor(Math.random() * songs.length)];
      setSong(randomSong);
      setScreen('game');
    }
  }, [closeDialog, party, resumeGame, resetGame, addPlayer, setGameMode, setSong, setScreen]);

  // Tournament song-pause: Sieger automatisch festlegen (based on current scores)
  const handleTournamentAutoWinner = useCallback(() => {
    closeDialog();
    if (!party.currentTournamentMatch || !party.tournamentBracket) return;

    const match = party.currentTournamentMatch;
    const results = gameState.results;
    const players = gameState.players;

    const score1 = results?.players?.[0]?.score || players?.[0]?.score || 0;
    const score2 = results?.players?.[1]?.score || players?.[1]?.score || 0;

    const updatedBracket = recordMatchResult(party.tournamentBracket, match.id, score1, score2);
    party.setTournamentBracket(updatedBracket);
    party.setCurrentTournamentMatch(null);
    party.setTournamentMatchAborted(false);

    resetGame();
    setScreen('tournament-game');
  }, [closeDialog, party, gameState, resetGame, setScreen]);

  // Party-leave: Party-Mode beenden
  const handlePartyModeEnd = useCallback(() => {
    closeDialog();
    party.resetPartyState();
    resetGame();
    setScreen('home');
  }, [closeDialog, party, resetGame, setScreen]);

  // Party-leave: Zurück (stay where you are)
  const handlePartyLeaveBack = useCallback(() => {
    closeDialog();
  }, [closeDialog]);

  // Is this a tournament match during song?
  const isTournamentMatch = !!(party.currentTournamentMatch && party.tournamentBracket);

  // Global keyboard shortcuts
  useGlobalKeyboardShortcuts({
    onSearch: () => navigateWithGuard('library'),
    onFullscreen: toggleFullscreen,
    onLibrary: () => navigateWithGuard('library'),
    onSettings: () => navigateWithGuard('settings'),
    onEscape: () => {
      if (isFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (screen === 'game') {
        // Main game screen (tournament/medley/competitive/rate-my-song during song)
        pauseGame();
        party.setPauseDialogAction('song-pause');
      } else if (isPartyModeActive && party.isSongPlaying) {
        // Party mode with song playing (BR/PTM/Companion) — components will pause their audio
        setPauseDialogAction('song-pause');
      } else if (isPartyModeActive) {
        // Party mode without song playing — show leave warning
        setPauseDialogAction('party-leave');
      } else {
        setScreen('home');
      }
    },
  });

  // Global remote control from mobile companions
  // Navigation handler for remote commands
  const handleRemoteNavigation = useCallback((targetScreen: string) => {
    // Map remote command screens to app screens
    const screenMap: Record<string, Screen> = {
      'home': 'home',
      'library': 'library',
      'settings': 'settings',
      'queue': 'queue',
      'party': 'party',
      'character': 'character',
    };

    const mappedScreen = screenMap[targetScreen] || 'home';
    setScreen(mappedScreen);
  }, []);

  useGlobalRemoteControl({
    navigateToScreen: handleRemoteNavigation,
    isPlaying: screen === 'game',
  });

  // Mobile client sync - syncs companion profiles and queue
  const { syncSongLibrary } = useMobileClient({
    song: gameState.currentSong,
    isPlaying: screen === 'game',
    currentTime: gameState.currentTime,
    gameMode: gameState.gameMode,
  });

  // Sync song library on mount and when library screen is shown
  useEffect(() => {
    syncSongLibrary();
  }, [syncSongLibrary, screen]);

  useEffect(() => {
    // Mark as mounted
    setIsMounted(true);
  }, []);

  // Redirect ?mobile=1 to /mobile for the unified companion app
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mobile') !== null) {
      // Preserve profile parameter if present
      const profile = params.get('profile');
      const targetUrl = profile ? `/mobile?profile=${encodeURIComponent(profile)}` : '/mobile';
      window.location.replace(targetUrl);
    }
  }, []);

  // Apply stored theme on app start
  useEffect(() => {
    const storedTheme = getStoredTheme();
    if (storedTheme) {
      applyTheme(storedTheme);
    }

    // Listen for theme changes from settings
    const handleThemeChange = () => {
      const theme = getStoredTheme();
      if (theme) {
        applyTheme(theme);
      }
    };

    window.addEventListener('themeChanged', handleThemeChange);
    window.addEventListener('themeChange', handleThemeChange);

    return () => {
      window.removeEventListener('themeChanged', handleThemeChange);
      window.removeEventListener('themeChange', handleThemeChange);
    };
  }, []);

  // ── Hydration guard for Tauri: skip SSR to avoid hydration mismatches ──
  // In a Tauri app, SSR provides no benefit. Rendering a simple placeholder
  // during server-side rendering and the initial client render ensures the
  // DOM matches exactly, preventing React error #418.
  if (!isMounted) {
    return (
      <div
        className="h-screen w-full"
        style={{ background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #0a0a2a 100%)' }}
        suppressHydrationWarning
      />
    );
  }

  // Party mode exit confirmation dialog
  if (pendingNavigation) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="bg-zinc-900 border border-white/15 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">⚠️</div>
            <h2 className="text-xl font-bold text-white">Party-Modus verlassen?</h2>
            <p className="text-sm text-white/50 mt-2">
              Ein Party-Modus läuft gerade. Wenn du die Seite verlässt,
              wird dein aktueller Spielfortschritt verloren gehen.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setPendingNavigation(null)}
              className="flex-1 py-3 rounded-lg font-medium bg-white/10 text-white hover:bg-white/20 transition-all"
            >
              Zurück bleiben
            </button>
            <button
              onClick={() => {
                const target = pendingNavigation;
                setPendingNavigation(null);
                // Clean up all party state so the mode is fully terminated
                party.resetPartyState();
                resetGame();
                setScreen(target);
              }}
              className="flex-1 py-3 rounded-lg font-medium bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 transition-all"
            >
              Verlassen
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Dialog handlers (moved above conditional returns to satisfy Rules of Hooks) ──
  // All useCallback hooks are now defined BEFORE any conditional returns.
  // setPauseDialogAction, closeDialog, handleResumeGame, handleSongAbort,
  // handleTournamentRepeat, handleTournamentAutoWinner, handlePartyModeEnd,
  // handlePartyLeaveBack — see definitions above before useGlobalKeyboardShortcuts.
  // isTournamentMatch is also defined above.

  return (
    <div
      className={`${IMMERSIVE_SCREENS.has(screen) || screen === 'library' ? 'h-screen overflow-hidden' : 'min-h-screen'} w-full text-white theme-container`}
      style={{
        background: `linear-gradient(135deg, var(--theme-background, #0a0a1a) 0%, var(--theme-background-secondary, #1a1a2e) 50%, color-mix(in srgb, var(--theme-primary, #00ffff) 15%, transparent) 100%)`,
        color: 'var(--theme-text, #ffffff)',
        fontFamily: 'var(--theme-font, Inter, sans-serif)',
      }}
    >
      {/* Offline / Server Reachable Banner */}
      <OfflineBanner />

      {/* Navigation - Hidden during immersive screens (gameplay, editor) */}
      {!IMMERSIVE_SCREENS.has(screen) && (
        <NavBar
          screen={screen}
          setScreen={navigateWithGuard}
          queueLength={queue.length}
          isMounted={isMounted}
          isFullscreen={isFullscreen}
          toggleFullscreen={toggleFullscreen}
        />
      )}

      {/* Fullscreen Exit Button - Only visible in fullscreen mode for immersive
          screens where the NavBar (which has its own toggle) is hidden. */}
      {isFullscreen && IMMERSIVE_SCREENS.has(screen) && <FullscreenExitButton />}

      {/* Main Content */}
      <main className={`${
        IMMERSIVE_SCREENS.has(screen)
          ? 'pt-0 px-0 pb-0 w-full h-full'
          : isFullscreen
            ? 'pt-4 px-4 pb-8 min-h-screen'
            : 'pt-20 px-4 pb-8 min-h-screen'
      }`}>
        {screen === 'home' && <HomeScreen onNavigate={setScreen} />}
        {screen === 'library' && (
          <LibraryScreen
            onSelectSong={(song) => {
              setSong(song);
              // Check game mode and navigate accordingly
              if (gameState.gameMode === 'pass-the-mic') {
                const playerCount = party.passTheMicPlayers?.length || 2;
                const segments = generatePtmSegments(song.duration, playerCount, party.passTheMicSettings?.segmentDuration);
                party.setPassTheMicSegments(segments);
                // Ensure URLs are valid (blob URLs may expire in Tauri)
                // The PtmGameScreen's useGameMedia will also restore, but pre-restoring
                // here avoids a flash of "no media" on the game screen
                import('@/lib/game/song-library').then(({ ensureSongUrls }) => {
                  ensureSongUrls(song).then(songWithUrls => {
                    party.setPassTheMicSong(songWithUrls);
                  }).catch(() => {
                    party.setPassTheMicSong(song); // fallback to original
                  });
                });
                // Always use dedicated PTM game screen (both first song and series)
                setScreen('pass-the-mic-game');
              } else if (gameState.gameMode === 'companion-singalong') {
                party.setCompanionSong(song);
                // Store the pre-selected song and return to party setup
                // so the user can review settings before starting
                party.setLibrarySelectedSong(song);
                setScreen('party-setup');
              } else if (gameState.gameMode === 'rate-my-song' && party.rateMySongSettings) {
                // Rate my Song: update songId in settings, apply short mode if needed
                const duration = party.rateMySongSettings.duration;
                party.setRateMySongSettings({ ...party.rateMySongSettings, songId: song.id });
                if (duration === 'short') {
                  setSong({ ...song, start: song.start, end: Math.min((song.start || 0) + 60000, song.end || song.duration) });
                }
                setScreen('game');
              } else {
                setScreen('game');
              }
            }}
            initialGameMode={gameState.gameMode}
          />
        )}
        {screen === 'game' && (
          <GameScreen
            onEnd={handleGameEnd}
            onBack={handleSongAbort}
            onPause={() => {
              pauseGame();
              setPauseDialogAction('song-pause');
            }}
          />
        )}
        {screen === 'party' && (
          <PartyScreen
            onSelectMode={(mode) => {
              // All party modes go through unified setup; only online has its own screen
              if (mode === 'online') {
                setScreen('online');
              } else {
                party.setSelectedGameMode(mode);
                setScreen('party-setup');
              }
            }}
          />
        )}

        {/* Party Setup + Song Voting */}
        <PartySetupSection screen={screen} setScreen={setScreen} />

        {/* Party Game Mode Screens */}
        <PartyGameScreens screen={screen} setScreen={setScreen} />

        {screen === 'character' && <CharacterScreen />}
        {screen === 'queue' && (
          <QueueScreen onPlayFromQueue={(song, gameMode, players) => {
            // Check if a party game mode is currently active and handle accordingly
            const activeMode = gameState.gameMode;

            if (activeMode === 'pass-the-mic' && party.passTheMicPlayers?.length > 0) {
              const playerCount = party.passTheMicPlayers.length || 2;
              const segments = generatePtmSegments(song.duration, playerCount, party.passTheMicSettings?.segmentDuration);
              party.setPassTheMicSegments(segments);
              party.setPassTheMicSong(song);
              setSong(song);
              setScreen('pass-the-mic-game');
              return;
            }

            if (activeMode === 'companion-singalong' && party.companionPlayers?.length > 0) {
              party.setCompanionSong(song);
              setSong(song);
              setScreen('companion-singalong-game');
              return;
            }

            // Default: standard/duel/duet handling
            resetGame();
            setSong(song);
            setGameMode(gameMode === 'duel' || gameMode === 'duet' ? 'duel' : 'standard');
            players.forEach(player => {
              const profile = profiles.find(p => p.id === player.id);
              if (profile) addPlayer(profile);
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
        {screen === 'dailyChallenge' && <DailyChallengeScreen onPlayChallenge={(song) => { setSong(song); setScreen('game'); }} onSelectSong={(song) => { setSong(song); setScreen('library'); }} />}
        {screen === 'editor' && <EditorScreen onBack={() => setScreen('library')} />}
        {screen === 'online' && <OnlineMultiplayerScreen onBack={() => setScreen('party')} />}
      </main>

      {/* ── Song Pause Dialog (during gameplay in any mode) ── */}
      {activeDialog === 'song-pause' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-white/15 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">⏸️</div>
              <h2 className="text-xl font-bold text-white">Spiel pausiert</h2>
              <p className="text-sm text-white/50 mt-2">
                Möchtest du das Spiel fortsetzen oder abbrechen?
              </p>
            </div>
            <div className="space-y-3">
              {isTournamentMatch ? (
                <>
                  {/* Tournament: 3 options */}
                  <button
                    onClick={handleResumeGame}
                    className="w-full py-3 rounded-lg font-medium bg-green-500/20 border border-green-500/40 text-green-300 hover:bg-green-500/30 transition-all"
                  >
                    Fortsetzen
                  </button>
                  <button
                    onClick={handleTournamentRepeat}
                    className="w-full py-3 rounded-lg font-medium bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 transition-all"
                  >
                    🔄 Game wiederholen
                  </button>
                  <button
                    onClick={handleTournamentAutoWinner}
                    className="w-full py-3 rounded-lg font-medium bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 transition-all"
                  >
                    🏆 Sieger automatisch festlegen
                  </button>
                </>
              ) : (
                <>
                  {/* All other modes: Resume + Cancel */}
                  <div className="flex gap-3">
                    <button
                      onClick={handleResumeGame}
                      className="flex-1 py-3 rounded-lg font-medium bg-green-500/20 border border-green-500/40 text-green-300 hover:bg-green-500/30 transition-all"
                    >
                      Fortsetzen
                    </button>
                    <button
                      onClick={handleSongAbort}
                      className="flex-1 py-3 rounded-lg font-medium bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 transition-all"
                    >
                      Abbrechen
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Party Mode Leave Warning (non-song screens) ── */}
      {activeDialog === 'party-leave' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-white/15 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">⚠️</div>
              <h2 className="text-xl font-bold text-white">Party-Modus verlassen?</h2>
              <p className="text-sm text-white/50 mt-2">
                Du bist dabei, den Party-Modus zu verlassen.
                Dein aktueller Spielfortschritt geht dabei verloren.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handlePartyLeaveBack}
                className="flex-1 py-3 rounded-lg font-medium bg-white/10 text-white hover:bg-white/20 transition-all"
              >
                Zurück
              </button>
              <button
                onClick={handlePartyModeEnd}
                className="flex-1 py-3 rounded-lg font-medium bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 transition-all"
              >
                Party-Modus beenden
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
