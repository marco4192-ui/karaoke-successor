'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useGlobalKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
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
import { Navigation, Screen } from '@/components/navigation';

// ===================== MAIN APP =====================
export default function KaraokeSuccessor() {
  // All hooks must be called before any conditional returns
  const [isMobileClient, setIsMobileClient] = useState(false);
  const [screen, setScreen] = useState<Screen>('home');
  const [isFullscreen, setIsFullscreen] = useState(false);
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
  
  useEffect(() => {
    // Check URL parameters for mobile mode
    const params = new URLSearchParams(window.location.search);
    if (params.get('mobile') !== null) {
      // Use microtask to avoid synchronous setState in effect
      queueMicrotask(() => setIsMobileClient(true));
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
        <Navigation
          currentScreen={screen}
          onNavigate={setScreen}
          queueLength={queue.length}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
        />
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
