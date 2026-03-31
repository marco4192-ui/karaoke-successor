'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { useGlobalKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { useGlobalRemoteControl } from '@/hooks/use-global-remote-control';
import { useGameStore } from '@/lib/game/store';
import { getAllSongs } from '@/lib/game/song-library';
// Extracted screens
import { HomeScreen, PartyScreen, QueueScreen, AchievementsScreen, HighscoreScreen, CharacterScreen, EditorScreen, OnlineMultiplayerScreen, DailyChallengeScreen, JukeboxScreen, MobileScreen, MobileClientView, ResultsScreen, LibraryScreen, SettingsScreen, GameScreen } from '@/components/screens';
import { Song, GameMode } from '@/types/game';
import { applyTheme, getStoredTheme } from '@/lib/game/themes';
import { TournamentSetupScreen, TournamentBracketView } from '@/components/game/tournament-screen';
import { BattleRoyaleSetupScreen, BattleRoyaleGameView } from '@/components/game/battle-royale-screen';
import { PassTheMicSetupScreen, PassTheMicGameView, PassTheMicSegment } from '@/components/game/pass-the-mic-screen';
import { CompanionSingAlongSetupScreen, CompanionGameView } from '@/components/game/companion-singalong-screen';
import { MedleySetupScreen, MedleyGameView } from '@/components/game/medley-contest-screen';
import { UnifiedPartySetup, SongVotingModal, GameSetupResult, PARTY_GAME_CONFIGS } from '@/components/game/unified-party-setup';
import { TournamentBracket, TournamentMatch, recordMatchResult } from '@/lib/game/tournament';
import { BattleRoyaleGame as BattleRoyaleGameState } from '@/lib/game/battle-royale';

// Screen types
type Screen = 'home' | 'library' | 'game' | 'party' | 'character' | 'queue' | 'mobile' | 'results' | 'highscores' | 'import' | 'settings' | 'jukebox' | 'achievements' | 'dailyChallenge' | 'tournament' | 'tournament-game' | 'battle-royale' | 'battle-royale-game' | 'pass-the-mic' | 'pass-the-mic-game' | 'companion-singalong' | 'companion-singalong-game' | 'medley' | 'medley-game' | 'editor' | 'online' | 'party-setup' | 'song-voting';

// ===================== MAIN APP =====================
export default function KaraokeSuccessor() {
  // All hooks must be called before any conditional returns
  const [isMobileClient, setIsMobileClient] = useState(false);
  const [screen, setScreen] = useState<Screen>('home');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMounted, setIsMounted] = useState(false); // Track client-side mount
  const { gameState, setSong, setGameMode, profiles, queue, resetGame, addPlayer, setResults } = useGameStore();
  
  // Tournament state
  const [tournamentBracket, setTournamentBracket] = useState<TournamentBracket | null>(null);
  const [tournamentSongDuration, setTournamentSongDuration] = useState(60);
  const [currentTournamentMatch, setCurrentTournamentMatch] = useState<TournamentMatch | null>(null);
  
  // Battle Royale state
  const [battleRoyaleGame, setBattleRoyaleGame] = useState<BattleRoyaleGameState | null>(null);
  
  // Pass the Mic state
  const [passTheMicPlayers, setPassTheMicPlayers] = useState<any[]>([]);
  const [passTheMicSong, setPassTheMicSong] = useState<Song | null>(null);
  const [passTheMicSegments, setPassTheMicSegments] = useState<any[]>([]);
  const [passTheMicSettings, setPassTheMicSettings] = useState<any>(null);
  
  // Companion Sing-A-Long state
  const [companionPlayers, setCompanionPlayers] = useState<any[]>([]);
  const [companionSong, setCompanionSong] = useState<Song | null>(null);
  const [companionSettings, setCompanionSettings] = useState<any>(null);
  
  // Medley Contest state
  const [medleyPlayers, setMedleyPlayers] = useState<any[]>([]);
  const [medleySongs, setMedleySongs] = useState<any[]>([]);
  const [medleySettings, setMedleySettings] = useState<any>(null);
  
  // Unified Party Setup state
  const [selectedGameMode, setSelectedGameMode] = useState<GameMode | null>(null);
  const [unifiedSetupResult, setUnifiedSetupResult] = useState<GameSetupResult | null>(null);
  const [votingSongs, setVotingSongs] = useState<Song[]>([]);
  
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
    if (!tournamentBracket || !currentTournamentMatch) {
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
      const gameResult = {
        players: players.map(p => ({
          playerId: p.id,
          score: p.score,
          accuracy: p.accuracy,
          notesHit: p.notesHit,
          notesMissed: p.notesMissed,
          maxCombo: p.maxCombo,
          rating: p.accuracy >= 95 ? 'perfect' : p.accuracy >= 85 ? 'excellent' : p.accuracy >= 70 ? 'good' : p.accuracy >= 50 ? 'okay' : 'poor',
        })),
        songId: gameState.currentSong?.id || '',
        songTitle: gameState.currentSong?.title || '',
        artist: gameState.currentSong?.artist || '',
        duration: gameState.currentTime,
        gameMode: gameState.gameMode,
        difficulty: gameState.difficulty,
        playedAt: Date.now(),
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
      tournamentBracket,
      currentTournamentMatch.id,
      score1,
      score2
    );
    
    // Update bracket state
    setTournamentBracket(updatedBracket);
    
    // Clear current match
    setCurrentTournamentMatch(null);
    
    // Go back to tournament bracket view
    setScreen('tournament-game');
  }, [tournamentBracket, currentTournamentMatch, gameState.results, gameState.players, gameState.currentSong, gameState.currentTime, gameState.gameMode, gameState.difficulty, setResults]);
  
  // Handle game end based on game mode
  const handleGameEnd = useCallback(() => {
    // Check if we're in a tournament match (has currentTournamentMatch set)
    if (currentTournamentMatch && tournamentBracket) {
      handleTournamentGameEnd();
    } else {
      setScreen('results');
    }
  }, [currentTournamentMatch, tournamentBracket, handleTournamentGameEnd]);
  
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
      {/* Navigation - Hidden in editor mode only */}
      {screen !== 'editor' && (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-black/30 backdrop-blur-xl border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <button onClick={() => setScreen('home')} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center">
                <MusicIcon className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                Karaoke Successor
              </span>
            </button>
            
            <div className="flex items-center gap-2">
              <NavButton active={screen === 'library'} onClick={() => setScreen('library')}>
                <LibraryIcon className="w-5 h-5" /> Library
              </NavButton>
              <NavButton active={screen === 'party'} onClick={() => setScreen('party')}>
                <PartyIcon className="w-5 h-5" /> Party
              </NavButton>
              <NavButton active={screen === 'dailyChallenge'} onClick={() => setScreen('dailyChallenge')}>
                <StarIcon className="w-5 h-5" /> Challenges
              </NavButton>
              <NavButton active={screen === 'queue'} onClick={() => setScreen('queue')}>
                <QueueIcon className="w-5 h-5" /> Queue
                {isMounted && queue.length > 0 && (
                  <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">{queue.length}</Badge>
                )}
              </NavButton>
              <NavButton active={screen === 'character'} onClick={() => setScreen('character')}>
                <UserIcon className="w-5 h-5" /> Characters
              </NavButton>
              <NavButton active={screen === 'highscores'} onClick={() => setScreen('highscores')}>
                <TrophyIcon className="w-5 h-5" /> Highscores
              </NavButton>
              <NavButton active={screen === 'achievements'} onClick={() => setScreen('achievements')}>
                <TrophyIcon className="w-5 h-5" /> Achievements
              </NavButton>
              <NavButton active={screen === 'jukebox'} onClick={() => setScreen('jukebox')}>
                <MusicIcon className="w-5 h-5" /> Jukebox
              </NavButton>
              <NavButton active={screen === 'settings'} onClick={() => setScreen('settings')}>
                <SettingsIcon className="w-5 h-5" /> Settings
              </NavButton>
              {/* Fullscreen Toggle Button */}
              <button
                onClick={toggleFullscreen}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all text-white/70 hover:text-white hover:bg-white/10"
                title={isFullscreen ? "Exit Fullscreen (F11)" : "Toggle Fullscreen (F11)"}
              >
                {isFullscreen ? (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </nav>
      )}

      {/* Fullscreen Exit Button - Only visible in fullscreen mode (not in editor) */}
      {isFullscreen && screen !== 'editor' && (
        <button
          onClick={() => document.exitFullscreen().catch(() => {})}
          className="fixed top-4 right-4 z-50 p-3 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 hover:bg-black/70 hover:border-white/40 transition-all group"
          title="Exit Fullscreen (ESC)"
        >
          <svg className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
          </svg>
        </button>
      )}

      {/* Main Content */}
      <main className={`${
        screen === 'editor' 
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
                const segmentDuration = passTheMicSettings?.segmentDuration || 30;
                const segmentCount = Math.ceil(song.duration / (segmentDuration * 1000));
                const segments: PassTheMicSegment[] = [];
                for (let i = 0; i < segmentCount; i++) {
                  segments.push({
                    startTime: i * segmentDuration * 1000,
                    endTime: Math.min((i + 1) * segmentDuration * 1000, song.duration),
                    playerId: null,
                  });
                }
                setPassTheMicSegments(segments);
                setPassTheMicSong(song);
                setScreen('pass-the-mic-game');
              } else if (gameState.gameMode === 'companion-singalong') {
                setCompanionSong(song);
                setScreen('companion-singalong-game');
              } else {
                setScreen('game');
              }
            }} 
            initialGameMode={gameState.gameMode} 
          />
        )}
        {screen === 'game' && <GameScreen onEnd={handleGameEnd} onBack={() => setScreen('library')} />}
        {screen === 'party' && (
          <PartyScreen 
            onSelectMode={(mode) => { 
              // Use unified setup for all party games
              if (mode === 'online') {
                setScreen('online');
              } else {
                setSelectedGameMode(mode);
                setScreen('party-setup');
              }
            }} 
          />
        )}
        
        {/* Unified Party Setup Screen */}
        {screen === 'party-setup' && selectedGameMode && (
          <UnifiedPartySetup
            gameMode={selectedGameMode}
            profiles={profiles}
            songs={getAllSongs()}
            onStartGame={(result) => {
              setUnifiedSetupResult(result);
              setGameMode(selectedGameMode);
              
              // Handle different game modes
              if (selectedGameMode === 'tournament') {
                // Create tournament bracket
                const maxPlayers = result.settings.maxPlayers || 8;
                const shortMode = result.settings.shortMode !== false;
                const tournamentPlayers = result.players.map((p, i) => ({
                  ...p,
                  eliminated: false,
                  seed: i + 1,
                }));
                // For now, just start with random song selection
                const songs = getAllSongs();
                if (songs.length > 0) {
                  const randomSong = songs[Math.floor(Math.random() * songs.length)];
                  setSong(randomSong);
                  setScreen('game');
                }
              } else if (selectedGameMode === 'battle-royale') {
                // Create battle royale game
                const battlePlayers = result.players.map((p, i) => ({
                  ...p,
                  playerType: 'microphone' as const,
                }));
                // For now, just start with random song selection
                const songs = getAllSongs();
                if (songs.length > 0) {
                  const randomSong = songs[Math.floor(Math.random() * songs.length)];
                  setSong(randomSong);
                  setScreen('game');
                }
              } else if (selectedGameMode === 'medley') {
                // Create medley game with random songs
                const songs = getAllSongs();
                const snippetCount = result.settings.snippetCount || 5;
                const snippetDuration = result.settings.snippetDuration || 30;
                const shuffled = [...songs].sort(() => Math.random() - 0.5);
                const medleySongList = shuffled.slice(0, snippetCount).map(song => ({
                  song,
                  startTime: 0,
                  endTime: snippetDuration * 1000,
                  duration: snippetDuration * 1000,
                }));
                setMedleyPlayers(result.players);
                setMedleySongs(medleySongList);
                setMedleySettings(result.settings);
                setScreen('medley-game');
              } else if (selectedGameMode === 'pass-the-mic') {
                // Store settings and go to library for song selection
                setPassTheMicPlayers(result.players);
                setPassTheMicSettings(result.settings);
                setScreen('library');
              } else if (selectedGameMode === 'companion-singalong') {
                // Store settings and go to library for song selection
                setCompanionPlayers(result.players);
                setCompanionSettings(result.settings);
                setScreen('library');
              } else {
                // Default: go to library for song selection
                setScreen('library');
              }
            }}
            onSelectLibrary={(result) => {
              setUnifiedSetupResult(result);
              setGameMode(selectedGameMode);
              
              // Store settings based on game mode and navigate to library
              if (selectedGameMode === 'pass-the-mic') {
                setPassTheMicPlayers(result.players);
                setPassTheMicSettings(result.settings);
              } else if (selectedGameMode === 'companion-singalong') {
                setCompanionPlayers(result.players);
                setCompanionSettings(result.settings);
              }
              
              setScreen('library');
            }}
            onVoteMode={(result, suggestedSongs) => {
              setUnifiedSetupResult(result);
              setVotingSongs(suggestedSongs);
              setScreen('song-voting');
            }}
            onBack={() => setScreen('party')}
          />
        )}
        
        {/* Song Voting Modal */}
        {screen === 'song-voting' && votingSongs.length > 0 && selectedGameMode && (
          <SongVotingModal
            songs={votingSongs}
            players={unifiedSetupResult?.players || []}
            gameColor={PARTY_GAME_CONFIGS[selectedGameMode]?.color || 'from-cyan-500 to-blue-500'}
            onVote={(songId) => {
              const selectedSong = votingSongs.find(s => s.id === songId);
              if (selectedSong) {
                setSong(selectedSong);
                setGameMode(selectedGameMode);
                
                // Handle game-specific setup
                if (selectedGameMode === 'pass-the-mic') {
                  const segmentDuration = unifiedSetupResult?.settings?.segmentDuration || 30;
                  const segmentCount = Math.ceil(selectedSong.duration / (segmentDuration * 1000));
                  const segments: PassTheMicSegment[] = [];
                  for (let i = 0; i < segmentCount; i++) {
                    segments.push({
                      startTime: i * segmentDuration * 1000,
                      endTime: Math.min((i + 1) * segmentDuration * 1000, selectedSong.duration),
                      playerId: null,
                    });
                  }
                  setPassTheMicPlayers(unifiedSetupResult?.players || []);
                  setPassTheMicSegments(segments);
                  setPassTheMicSong(selectedSong);
                  setScreen('pass-the-mic-game');
                } else if (selectedGameMode === 'companion-singalong') {
                  setCompanionPlayers(unifiedSetupResult?.players || []);
                  setCompanionSong(selectedSong);
                  setScreen('companion-singalong-game');
                } else {
                  setScreen('game');
                }
              }
            }}
            onClose={() => setScreen('party-setup')}
          />
        )}
        
        {/* Pass the Mic Setup Screen */}
        {screen === 'pass-the-mic' && (
          <PassTheMicSetupScreen
            profiles={profiles}
            onSelectSong={(players, settings) => {
              setPassTheMicPlayers(players);
              setPassTheMicSettings(settings);
              setGameMode('pass-the-mic');
              setScreen('library');
            }}
            onBack={() => setScreen('party')}
          />
        )}
        
        {/* Pass the Mic Game Screen */}
        {screen === 'pass-the-mic-game' && passTheMicSong && (
          <PassTheMicGameView
            players={passTheMicPlayers}
            song={passTheMicSong}
            segments={passTheMicSegments}
            settings={passTheMicSettings}
            onUpdateGame={(players, segments) => {
              setPassTheMicPlayers(players);
              setPassTheMicSegments(segments);
            }}
            onEndGame={() => {
              setPassTheMicPlayers([]);
              setPassTheMicSong(null);
              setPassTheMicSegments([]);
              setScreen('home');
            }}
          />
        )}
        
        {/* Tournament Setup Screen */}
        {screen === 'tournament' && (
          <TournamentSetupScreen
            profiles={profiles}
            songs={getAllSongs()}
            onStartTournament={(bracket, songDuration) => {
              setTournamentBracket(bracket);
              setTournamentSongDuration(songDuration);
              setScreen('tournament-game');
            }}
            onBack={() => setScreen('party')}
          />
        )}
        
        {/* Tournament Game Screen */}
        {screen === 'tournament-game' && tournamentBracket && (
          <TournamentBracketView
            bracket={tournamentBracket}
            currentMatch={currentTournamentMatch}
            onPlayMatch={(match) => {
              if (!match.player1 || !match.player2) return;
              
              setCurrentTournamentMatch(match);
              
              // Reset game state for new match
              resetGame();
              
              // Add both players for the duel (they sing simultaneously)
              addPlayer({
                id: match.player1.id,
                name: match.player1.name,
                avatar: match.player1.avatar,
                color: match.player1.color,
              });
              addPlayer({
                id: match.player2.id,
                name: match.player2.name,
                avatar: match.player2.avatar,
                color: match.player2.color,
              });
              
              // Set game mode to 'duel' for simultaneous singing
              setGameMode('duel');
              
              // Set a random song for the match
              const songs = getAllSongs();
              if (songs.length > 0) {
                const randomSong = songs[Math.floor(Math.random() * songs.length)];
                setSong(randomSong);
                setScreen('game');
              }
            }}
            songs={getAllSongs()}
            shortMode={tournamentSongDuration === 60}
          />
        )}
        
        {/* Battle Royale Setup Screen */}
        {screen === 'battle-royale' && (
          <BattleRoyaleSetupScreen
            profiles={profiles}
            songs={getAllSongs()}
            onStartGame={(game) => {
              setBattleRoyaleGame(game);
              setScreen('battle-royale-game');
            }}
            onBack={() => setScreen('party')}
          />
        )}
        
        {/* Battle Royale Game Screen */}
        {screen === 'battle-royale-game' && battleRoyaleGame && (
          <BattleRoyaleGameView
            game={battleRoyaleGame}
            songs={getAllSongs()}
            onUpdateGame={(game) => setBattleRoyaleGame(game)}
            onEndGame={() => {
              setBattleRoyaleGame(null);
              setScreen('home');
            }}
          />
        )}
        
        {/* Companion Sing-A-Long Setup Screen */}
        {screen === 'companion-singalong' && (
          <CompanionSingAlongSetupScreen
            profiles={profiles}
            onSelectSong={(players, settings) => {
              setCompanionPlayers(players);
              setCompanionSettings(settings);
              setGameMode('companion-singalong');
              setScreen('library');
            }}
            onBack={() => setScreen('party')}
          />
        )}
        
        {/* Companion Sing-A-Long Game Screen */}
        {screen === 'companion-singalong-game' && companionSong && (
          <CompanionGameView
            players={companionPlayers}
            song={companionSong}
            settings={companionSettings}
            onUpdatePlayers={setCompanionPlayers}
            onEndGame={() => {
              setCompanionPlayers([]);
              setCompanionSong(null);
              setCompanionSettings(null);
              setScreen('home');
            }}
          />
        )}
        
        {/* Medley Contest Setup Screen */}
        {screen === 'medley' && (
          <MedleySetupScreen
            profiles={profiles}
            songs={getAllSongs()}
            onStartGame={(players, medleySongList, settings) => {
              setMedleyPlayers(players);
              setMedleySongs(medleySongList);
              setMedleySettings(settings);
              setScreen('medley-game');
            }}
            onBack={() => setScreen('party')}
          />
        )}
        
        {/* Medley Contest Game Screen */}
        {screen === 'medley-game' && medleySongs.length > 0 && (
          <MedleyGameView
            players={medleyPlayers}
            medleySongs={medleySongs}
            settings={medleySettings}
            onUpdatePlayers={setMedleyPlayers}
            onEndGame={() => {
              setMedleyPlayers([]);
              setMedleySongs([]);
              setMedleySettings(null);
              setScreen('home');
            }}
          />
        )}
        
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

// ===================== NAV BUTTON =====================
function NavButton({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
        active 
          ? 'bg-white/20 text-white' 
          : 'text-white/70 hover:text-white hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  );
}

// ===================== ICONS =====================
function MusicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

function LibraryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

function PartyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5.8 11.3L2 22l10.7-3.8" />
      <path d="M4 3h.01" />
      <path d="M22 8h.01" />
      <path d="M15 2h.01" />
      <path d="M22 20h.01" />
      <path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12v0c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10" />
      <path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11v0c-.11.7-.72 1.22-1.43 1.22H17" />
      <path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98v0C9.52 4.9 9 5.52 9 6.23V7" />
      <path d="M11 15c-1.5 1-2.5 2.5-3 4.5" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path d="M20 21a8 8 0 1 0-16 0" />
    </svg>
  );
}

function QueueIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18" />
      <path d="M3 12h18" />
      <path d="M3 18h18" />
    </svg>
  );
}

function StarIcon({ className, filled }: { className?: string; filled?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

// ===================== LYRIC LINE DISPLAY =====================
// LyricLineDisplay has been moved to /src/components/screens/game-screen.tsx

// ===================== GAME SCREEN =====================
// GameScreen has been moved to /src/components/screens/game-screen.tsx

// ===================== PARTY SCREEN =====================
// PartyScreen has been moved to /src/components/screens/party-screen.tsx

// ===================== CHARACTER SCREEN =====================
// CharacterScreen has been moved to /src/components/screens/character-screen.tsx

// ===================== MOBILE CLIENT VIEW =====================
// MobileClientView and RemoteControlView have been moved to /src/components/screens/mobile-client-view.tsx

// ===================== RESULTS SCREEN =====================
// ResultsScreen, ScoreVisualization, SongHighscoreModal have been moved to /src/components/screens/results-screen.tsx


// ===================== AI ASSETS GENERATOR =====================
// AIAssetsGenerator has been moved to /src/components/screens/settings-screen.tsx

// ===================== EDITOR SETTINGS VIEW =====================
// EditorSettingsView has been moved to /src/components/screens/settings-screen.tsx

// ===================== SETTINGS SCREEN =====================
// SettingsScreen, MicrophoneSettingsSection, MobileDeviceMicrophoneSection have been moved to /src/components/screens/settings-screen.tsx
