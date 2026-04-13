'use client';

import React from 'react';
import { useGameStore } from '@/lib/game/store';
import { usePartyStore } from '@/lib/game/party-store';
import { getAllSongs } from '@/lib/game/song-library';
import { recordMatchResult } from '@/lib/game/tournament';
import { TournamentSetupScreen, TournamentBracketView } from '@/components/game/tournament-screen';
import { BattleRoyaleSetupScreen, BattleRoyaleGameView } from '@/components/game/battle-royale-screen';
import { PassTheMicSetupScreen, PassTheMicGameView } from '@/components/game/pass-the-mic-screen';
import { CompanionSingAlongSetupScreen, CompanionGameView } from '@/components/game/companion-singalong-screen';
import { MedleySetupScreen, MedleyGameView } from '@/components/game/medley-contest-screen';
import { CompetitiveSetupScreen, CompetitiveGameView } from '@/components/game/competitive-words-blind-screen';

// Screen types (matches page.tsx)
type Screen = 'home' | 'library' | 'game' | 'party' | 'character' | 'queue' | 'mobile' | 'results' | 'highscores' | 'import' | 'settings' | 'jukebox' | 'achievements' | 'dailyChallenge' | 'tournament' | 'tournament-game' | 'battle-royale' | 'battle-royale-game' | 'pass-the-mic' | 'pass-the-mic-game' | 'companion-singalong' | 'companion-singalong-game' | 'medley' | 'medley-game' | 'editor' | 'online' | 'party-setup' | 'song-voting' | 'missing-words' | 'missing-words-game' | 'blind' | 'blind-game';

interface PartyGameScreensProps {
  screen: Screen;
  setScreen: (s: Screen) => void;
}

// ===================== PARTY GAME MODE SCREENS =====================
export function PartyGameScreens({ screen, setScreen }: PartyGameScreensProps) {
  const { profiles, setGameMode, setSong, resetGame, addPlayer, setPlayers } = useGameStore();
  const party = usePartyStore();

  return (
    <>
      {/* Pass the Mic Setup Screen */}
      {screen === 'pass-the-mic' && (
        <PassTheMicSetupScreen
          profiles={profiles}
          onSelectSong={(players, settings) => {
            party.setPassTheMicPlayers(players);
            party.setPassTheMicSettings(settings);
            setGameMode('pass-the-mic');
            setScreen('library');
          }}
          onBack={() => setScreen('party')}
        />
      )}

      {/* Pass the Mic Game Screen */}
      {screen === 'pass-the-mic-game' && party.passTheMicSong && (
        <PassTheMicGameView
          players={party.passTheMicPlayers}
          song={party.passTheMicSong}
          segments={party.passTheMicSegments}
          settings={party.passTheMicSettings}
          onUpdateGame={(players, segments) => {
            party.setPassTheMicPlayers(players);
            party.setPassTheMicSegments(segments);
          }}
          onEndGame={() => {
            party.setPassTheMicPlayers([]);
            party.setPassTheMicSong(null);
            party.setPassTheMicSegments([]);
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
            party.setTournamentBracket(bracket);
            party.setTournamentSongDuration(songDuration);
            setScreen('tournament-game');
          }}
          onBack={() => setScreen('party')}
        />
      )}

      {/* Tournament Game Screen */}
      {screen === 'tournament-game' && party.tournamentBracket && (
        <TournamentBracketView
          bracket={party.tournamentBracket}
          currentMatch={party.currentTournamentMatch}
          matchAborted={party.tournamentMatchAborted}
          onPlayMatch={(match) => {
            if (!match.player1 || !match.player2) return;

            party.setCurrentTournamentMatch(match);
            party.setTournamentMatchAborted(false);

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
          onManualWinner={(matchId, winnerId) => {
            if (!party.tournamentBracket || !party.currentTournamentMatch) return;
            const match = party.currentTournamentMatch;
            const isP1Winner = winnerId === match.player1?.id;
            // Use 100 for winner, 0 for loser to clearly indicate the choice
            const updated = recordMatchResult(
              party.tournamentBracket,
              matchId,
              isP1Winner ? 100 : 0,
              isP1Winner ? 0 : 100,
            );
            party.setTournamentBracket(updated);
            party.setCurrentTournamentMatch(null);
          }}
          onRepeatMatch={() => {
            if (!party.currentTournamentMatch) return;
            const match = party.currentTournamentMatch;
            resetGame();
            addPlayer({
              id: match.player1!.id,
              name: match.player1!.name,
              avatar: match.player1!.avatar,
              color: match.player1!.color,
            });
            addPlayer({
              id: match.player2!.id,
              name: match.player2!.name,
              avatar: match.player2!.avatar,
              color: match.player2!.color,
            });
            setGameMode('duel');
            const songs = getAllSongs();
            if (songs.length > 0) {
              const randomSong = songs[Math.floor(Math.random() * songs.length)];
              setSong(randomSong);
              setScreen('game');
            }
          }}
          onAbortHandled={() => {
            party.setTournamentMatchAborted(false);
          }}
          songs={getAllSongs()}
          shortMode={party.tournamentSongDuration === 60}
        />
      )}

      {/* Battle Royale Setup Screen */}
      {screen === 'battle-royale' && (
        <BattleRoyaleSetupScreen
          profiles={profiles}
          songs={getAllSongs()}
          onStartGame={(game) => {
            party.setBattleRoyaleGame(game);
            setScreen('battle-royale-game');
          }}
          onBack={() => setScreen('party')}
        />
      )}

      {/* Battle Royale Game Screen */}
      {screen === 'battle-royale-game' && party.battleRoyaleGame && (
        <BattleRoyaleGameView
          game={party.battleRoyaleGame}
          songs={getAllSongs()}
          onUpdateGame={(game) => party.setBattleRoyaleGame(game)}
          onEndGame={() => {
            party.setBattleRoyaleGame(null);
            setScreen('home');
          }}
        />
      )}

      {/* Companion Sing-A-Long Setup Screen */}
      {screen === 'companion-singalong' && (
        <CompanionSingAlongSetupScreen
          profiles={profiles}
          onSelectSong={(players, settings) => {
            party.setCompanionPlayers(players);
            party.setCompanionSettings(settings);
            setGameMode('companion-singalong');
            setScreen('library');
          }}
          onBack={() => setScreen('party')}
        />
      )}

      {/* Companion Sing-A-Long Game Screen */}
      {screen === 'companion-singalong-game' && party.companionSong && (
        <CompanionGameView
          players={party.companionPlayers}
          song={party.companionSong}
          settings={party.companionSettings}
          onUpdatePlayers={party.setCompanionPlayers}
          onEndGame={() => {
            party.setCompanionPlayers([]);
            party.setCompanionSong(null);
            party.setCompanionSettings(null);
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
            party.setMedleyPlayers(players);
            party.setMedleySongs(medleySongList);
            party.setMedleySettings(settings);
            setScreen('medley-game');
          }}
          onBack={() => setScreen('party')}
        />
      )}

      {/* Medley Contest Game Screen — flow controller, launches game screen for each snippet */}
      {screen === 'medley-game' && party.medleySongs.length > 0 && (
        <MedleyGameView
          players={party.medleyPlayers}
          medleySongs={party.medleySongs}
          settings={party.medleySettings}
          onUpdatePlayers={party.setMedleyPlayers}
          onPlaySnippet={(playerId, snippetIndex, opponentId) => {
            const snippet = party.medleySongs[snippetIndex];
            if (!snippet) return;

            // Reset game state
            resetGame();

            // Create a modified song with snippet timing
            const snippetSong = {
              ...snippet.song,
              start: snippet.startTime,
              end: snippet.endTime,
            };
            setSong(snippetSong);

            const isCompetitive = party.medleySettings?.playMode === 'competitive';

            if (isCompetitive && opponentId) {
              // Duel mode: add both players
              setGameMode('duel');
              const p1 = party.medleyPlayers.find((p: any) => p.id === playerId);
              const p2 = party.medleyPlayers.find((p: any) => p.id === opponentId);
              if (p1) {
                addPlayer({
                  id: p1.id,
                  name: p1.name,
                  avatar: p1.avatar,
                  color: p1.color,
                });
              }
              if (p2) {
                addPlayer({
                  id: p2.id,
                  name: p2.name,
                  avatar: p2.avatar,
                  color: p2.color,
                });
              }
            } else {
              // Cooperative: single player mode
              setGameMode('medley');
              const playerProfile = party.medleyPlayers.find((p: any) => p.id === playerId);
              if (playerProfile) {
                addPlayer({
                  id: playerProfile.id,
                  name: playerProfile.name,
                  avatar: playerProfile.avatar,
                  color: playerProfile.color,
                });
              }
            }

            // Mark current snippet index in party store so the flow knows where we are
            party.setMedleySettings({ ...party.medleySettings, currentSnippetIndex: snippetIndex });

            // Launch the game screen
            setScreen('game');
          }}
          onEndGame={() => {
            party.setMedleyPlayers([]);
            party.setMedleySongs([]);
            party.setMedleySettings(null);
            setScreen('home');
          }}
        />
      )}

      {/* Missing Words Competitive Setup */}
      {screen === 'missing-words' && (
        <CompetitiveSetupScreen
          profiles={profiles}
          songs={getAllSongs()}
          modeType='missing-words'
          onStartGame={(game) => {
            party.setCompetitiveGame(game);
            setScreen('missing-words-game');
          }}
          onBack={() => setScreen('party')}
        />
      )}

      {/* Missing Words Competitive Game */}
      {screen === 'missing-words-game' && party.competitiveGame && (
        <CompetitiveGameView
          game={party.competitiveGame}
          songs={getAllSongs()}
          modeType='missing-words'
          onUpdateGame={(game) => party.setCompetitiveGame(game)}
          onEndGame={() => {
            party.setCompetitiveGame(null);
            setScreen('home');
          }}
          onPlayMatch={(p1Id, p2Id, p1Name, p2Name, song) => {
            // Start duel mode with the two players and the selected song
            resetGame();
            setPlayers([]); // Clear any leftover players from previous games
            addPlayer({ id: p1Id, name: p1Name, color: party.competitiveGame!.players.find(p => p.id === p1Id)?.color || '#FF6B6B' });
            addPlayer({ id: p2Id, name: p2Name, color: party.competitiveGame!.players.find(p => p.id === p2Id)?.color || '#4ECDC4' });
            setGameMode('missing-words');
            setSong(song);
            setScreen('game');
          }}
        />
      )}

      {/* Blind Karaoke Competitive Setup */}
      {screen === 'blind' && (
        <CompetitiveSetupScreen
          profiles={profiles}
          songs={getAllSongs()}
          modeType='blind'
          onStartGame={(game) => {
            party.setCompetitiveGame(game);
            setScreen('blind-game');
          }}
          onBack={() => setScreen('party')}
        />
      )}

      {/* Blind Karaoke Competitive Game */}
      {screen === 'blind-game' && party.competitiveGame && (
        <CompetitiveGameView
          game={party.competitiveGame}
          songs={getAllSongs()}
          modeType='blind'
          onUpdateGame={(game) => party.setCompetitiveGame(game)}
          onEndGame={() => {
            party.setCompetitiveGame(null);
            setScreen('home');
          }}
          onPlayMatch={(p1Id, p2Id, p1Name, p2Name, song) => {
            resetGame();
            setPlayers([]); // Clear any leftover players from previous games
            addPlayer({ id: p1Id, name: p1Name, color: party.competitiveGame!.players.find(p => p.id === p1Id)?.color || '#FF6B6B' });
            addPlayer({ id: p2Id, name: p2Name, color: party.competitiveGame!.players.find(p => p.id === p2Id)?.color || '#4ECDC4' });
            setGameMode('blind');
            setSong(song);
            setScreen('game');
          }}
        />
      )}
    </>
  );
}
