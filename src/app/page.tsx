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
import { HomeScreen, PartyScreen, QueueScreen, AchievementsScreen, HighscoreScreen, CharacterScreen, EditorScreen, OnlineMultiplayerScreen, DailyChallengeScreen, JukeboxScreen, MobileScreen, MobileClientView, ResultsScreen, LibraryScreen, SettingsScreen, GameScreen } from '@/components/screens';
// Extracted components
import { NavBar, FullscreenExitButton } from '@/components/home/navbar';
import { PartySetupSection } from '@/components/party/party-setup-section';
import { PartyGameScreens } from '@/components/party/party-game-screens';
import { Song, GameMode } from '@/types/game';
import { applyTheme, getStoredTheme } from '@/lib/game/themes';
import { PassTheMicSegment } from '@/components/game/pass-the-mic-screen';
import { recordMatchResult } from '@/lib/game/tournament';

// Screen types
type Screen = 'home' | 'library' | 'game' | 'party' | 'character' | 'queue' | 'mobile' | 'results' | 'highscores' | 'import' | 'settings' | 'jukebox' | 'achievements' | 'dailyChallenge' | 'tournament' | 'tournament-game' | 'battle-royale' | 'battle-royale-game' | 'pass-the-mic' | 'pass-the-mic-game' | 'companion-singalong' | 'companion-singalong-game' | 'medley' | 'medley-game' | 'editor' | 'online' | 'party-setup' | 'song-voting' | 'missing-words' | 'missing-words-game' | 'blind' | 'blind-game';

// Screens where the navbar should be hidden (immersive / fullscreen experiences)
const IMMERSIVE_SCREENS: Set<Screen> = new Set([
  'editor',
  'game',
  'pass-the-mic-game',
  'battle-royale-game',
  'companion-singalong-game',
  'medley-game',
]);

// ===================== MAIN APP =====================
export default function KaraokeSuccessor() {
  // All hooks must be called before any conditional returns
  const [isMobileClient, setIsMobileClient] = useState(false);
  const [screen, setScreen] = useState<Screen>('home');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMounted, setIsMounted] = useState(false); // Track client-side mount
  const { gameState, setSong, setGameMode, profiles, queue, resetGame, addPlayer, setResults } = useGameStore();
  const party = usePartyStore();

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
    const results = gameState.results;
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
    }

    // Get final results
    const finalResults = gameState.results;
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
    // Check if we're in a tournament match (has party.currentTournamentMatch set)
    if (party.currentTournamentMatch && party.tournamentBracket) {
      handleTournamentGameEnd();
    } else {
      setScreen('results');
    }
  }, [party.currentTournamentMatch, party.tournamentBracket, handleTournamentGameEnd]);

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

  // Global keyboard shortcuts
  useGlobalKeyboardShortcuts({
    onSearch: () => setScreen('library'),
    onFullscreen: toggleFullscreen,
    onLibrary: () => setScreen('library'),
    onSettings: () => setScreen('settings'),
    onEscape: () => {
      if (isFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (screen === 'game' && party.currentTournamentMatch) {
        // During tournament match, Escape goes back to bracket
        party.setTournamentMatchAborted(true);
        resetGame();
        setScreen('tournament-game');
      } else if (screen === 'game') {
        resetGame();
        setScreen('library');
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
    // Check URL parameters for mobile mode
    const params = new URLSearchParams(window.location.search);
    if (params.get('mobile') !== null) {
      // Use microtask to avoid synchronous setState in effect
      queueMicrotask(() => setIsMobileClient(true));
    }
    // Mark as mounted
    setIsMounted(true);
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

  // Render mobile client view if in mobile mode
  if (isMobileClient) {
    return <MobileClientView />;
  }

  return (
    <div
      className="min-h-screen text-white theme-container"
      style={{
        background: `linear-gradient(135deg, var(--theme-background, #0a0a1a) 0%, var(--theme-background-secondary, #1a1a2e) 50%, color-mix(in srgb, var(--theme-primary, #00ffff) 15%, transparent) 100%)`,
        color: 'var(--theme-text, #ffffff)',
        fontFamily: 'var(--theme-font, Inter, sans-serif)',
      }}
    >
      {/* Navigation - Hidden during immersive screens (gameplay, editor) */}
      {!IMMERSIVE_SCREENS.has(screen) && (
        <NavBar
          screen={screen}
          setScreen={setScreen}
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
          ? 'pt-0 px-0 pb-0 h-screen'
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
                // Generate segments for pass the mic
                const segmentDuration = party.passTheMicSettings?.segmentDuration || 30;
                const segmentCount = Math.ceil(song.duration / (segmentDuration * 1000));
                const segments: PassTheMicSegment[] = [];
                for (let i = 0; i < segmentCount; i++) {
                  segments.push({
                    startTime: i * segmentDuration * 1000,
                    endTime: Math.min((i + 1) * segmentDuration * 1000, song.duration),
                    playerId: null,
                  });
                }
                party.setPassTheMicSegments(segments);
                party.setPassTheMicSong(song);
                setScreen('pass-the-mic-game');
              } else if (gameState.gameMode === 'companion-singalong') {
                party.setCompanionSong(song);
                setScreen('companion-singalong-game');
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
            onBack={() => {
              // If in a tournament match, go back to bracket view (not library)
              if (party.currentTournamentMatch && party.tournamentBracket) {
                party.setTournamentMatchAborted(true);
                resetGame();
                setScreen('tournament-game');
              } else {
                resetGame();
                setScreen('library');
              }
            }}
          />
        )}
        {screen === 'party' && (
          <PartyScreen
            onSelectMode={(mode) => {
              // Use unified setup for all party games
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
        {screen === 'queue' && <QueueScreen />}
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
    </div>
  );
}
