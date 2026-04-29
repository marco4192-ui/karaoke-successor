'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '@/lib/game/store';
import { usePartyStore } from '@/lib/game/party-store';
import { useGlobalKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { useGlobalRemoteControl } from '@/hooks/use-global-remote-control';
import { useMobileClient } from '@/hooks/use-mobile-client';
import { getAllSongs } from '@/lib/game/song-library';
import { generatePtmSegments } from '@/lib/game/ptm-segments';
import { recordMatchResult } from '@/lib/game/tournament';

// Screen type & constants (canonical source)
import type { Screen } from '@/types/screens';
import { IMMERSIVE_SCREENS } from '@/types/screens';

// Extracted hooks
import { useScreenNavigation } from '@/hooks/use-screen-navigation';
import { useGameFlowHandlers } from '@/hooks/use-game-flow-handlers';
import { useAppEffects } from '@/hooks/use-app-effects';

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
import { NavBar, FullscreenExitButton } from '@/components/home/navbar';
import { PartySetupSection } from '@/components/party/party-setup-section';
import { PartyGameScreens } from '@/components/party/party-game-screens';
import { OfflineBanner } from '@/components/ui/offline-banner';

// ===================== MAIN APP =====================
export default function KaraokeSuccessor() {
  // ── Store hooks (must be called before any conditional returns) ──
  const { gameState, setSong, setGameMode, profiles, queue, resetGame, addPlayer, setResults, pauseGame, resumeGame } = useGameStore();
  const party = usePartyStore();

  // ── Screen navigation (screen state + party-mode guard) ──
  const { screen, setScreen, isPartyModeActive, navigateWithGuard, pendingNavigation, setPendingNavigation } = useScreenNavigation(party);

  // ── App initialization effects (theme, custom songs, fullscreen, mobile redirect) ──
  const { isMounted, isFullscreen, toggleFullscreen } = useAppEffects(screen);

  // ── Game flow handlers (tournament end, medley end, competitive end, etc.) ──
  const { handleTournamentGameEnd, handleGameEnd } = useGameFlowHandlers(
    party, gameState, { setResults, resetGame }, setScreen,
  );

  // ── Pause / Leave dialog state (driven by party store) ──
  type DialogAction = null | 'song-pause' | 'party-leave';
  const [activeDialog, setActiveDialog] = useState<DialogAction>(null);

  useEffect(() => {
    setActiveDialog(party.pauseDialogAction);
  }, [party.pauseDialogAction]);

  const isTournamentMatch = !!(party.currentTournamentMatch && party.tournamentBracket);

  // ── Dialog handlers (defined before conditional returns for Rules of Hooks) ──
  const closeDialog = useCallback(() => {
    party.setPauseDialogAction(null);
  }, [party.setPauseDialogAction]);

  const handleResumeGame = useCallback(() => {
    closeDialog();
    resumeGame();
  }, [closeDialog, resumeGame]);

  const handleSongAbort = useCallback(() => {
    closeDialog();

    if (screen === 'game') {
      if (isTournamentMatch) {
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
        if (gameState.gameMode === 'pass-the-mic') {
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

    // BR / PTM / Companion — their own screens
    if (party.battleRoyaleGame) {
      party.setBattleRoyaleGame(null);
      resetGame();
      setScreen('party');
      return;
    }
    if (party.passTheMicPlayers?.length > 0) {
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
  }, [closeDialog, screen, isTournamentMatch, party, gameState.gameMode, resetGame, setScreen]);

  const handleTournamentRepeat = useCallback(() => {
    closeDialog();
    if (!party.currentTournamentMatch) return;
    const match = party.currentTournamentMatch;

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
  }, [closeDialog, party, gameState.results, gameState.players, resetGame, setScreen]);

  const handlePartyModeEnd = useCallback(() => {
    closeDialog();
    party.resetPartyState();
    resetGame();
    setScreen('home');
  }, [closeDialog, party.resetPartyState, resetGame, setScreen]);

  const handlePartyLeaveBack = useCallback(() => {
    closeDialog();
  }, [closeDialog]);

  // ── Global keyboard shortcuts ──
  useGlobalKeyboardShortcuts({
    onSearch: () => navigateWithGuard('library'),
    onFullscreen: toggleFullscreen,
    onLibrary: () => navigateWithGuard('library'),
    onSettings: () => navigateWithGuard('settings'),
    onEscape: () => {
      if (isFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (screen === 'game') {
        pauseGame();
        party.setPauseDialogAction('song-pause');
      } else if (isPartyModeActive && party.isSongPlaying) {
        party.setPauseDialogAction('song-pause');
      } else if (isPartyModeActive) {
        party.setPauseDialogAction('party-leave');
      } else {
        setScreen('home');
      }
    },
  });

  // ── Global remote control from mobile companions ──
  const handleRemoteNavigation = useCallback((targetScreen: string) => {
    const screenMap: Record<string, Screen> = {
      'home': 'home', 'library': 'library', 'settings': 'settings',
      'queue': 'queue', 'party': 'party', 'character': 'character',
    };
    navigateWithGuard(screenMap[targetScreen] || 'home');
  }, [navigateWithGuard]);

  useGlobalRemoteControl({
    navigateToScreen: handleRemoteNavigation,
    isPlaying: screen === 'game',
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
          party.resetPartyState();
          resetGame();
          setScreen(target);
        }}
      />
    );
  }

  // ===================== MAIN RENDER =====================
  return (
    <div
      className={`${IMMERSIVE_SCREENS.has(screen) || screen === 'library' ? 'h-screen overflow-hidden' : 'min-h-screen'} w-full text-white theme-container`}
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
        />
      )}

      {/* Fullscreen Exit Button for immersive screens without NavBar */}
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
              if (gameState.gameMode === 'pass-the-mic') {
                const playerCount = party.passTheMicPlayers?.length || 2;
                const segments = generatePtmSegments(song.duration, playerCount, party.passTheMicSettings?.segmentDuration);
                party.setPassTheMicSegments(segments);
                import('@/lib/game/song-library').then(({ ensureSongUrls }) => {
                  ensureSongUrls(song).then(songWithUrls => {
                    party.setPassTheMicSong(songWithUrls);
                  }).catch(() => {
                    party.setPassTheMicSong(song);
                  });
                });
                setScreen('pass-the-mic-game');
              } else if (gameState.gameMode === 'companion-singalong') {
                party.setCompanionSong(song);
                party.setLibrarySelectedSong(song);
                setScreen('party-setup');
              } else if (gameState.gameMode === 'rate-my-song' && party.rateMySongSettings) {
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

        {screen === 'character' && <CharacterScreen />}
        {screen === 'queue' && (
          <QueueScreen onPlayFromQueue={(song, gameMode, players) => {
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

      {/* Song Pause Dialog */}
      {activeDialog === 'song-pause' && (
        <SongPauseDialog
          isTournamentMatch={isTournamentMatch}
          onResume={handleResumeGame}
          onAbort={handleSongAbort}
          onTournamentRepeat={handleTournamentRepeat}
          onTournamentAutoWinner={handleTournamentAutoWinner}
        />
      )}

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
