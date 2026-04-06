'use client';

import React from 'react';
import { useGameStore } from '@/lib/game/store';
import { usePartyStore } from '@/lib/game/party-store';
import { getAllSongs } from '@/lib/game/song-library';
import { TournamentSetupScreen, TournamentBracketView } from '@/components/game/tournament-screen';
import { BattleRoyaleSetupScreen, BattleRoyaleGameView } from '@/components/game/battle-royale-screen';
import { PassTheMicSetupScreen, PassTheMicGameView } from '@/components/game/pass-the-mic-screen';
import { CompanionSingAlongSetupScreen, CompanionGameView } from '@/components/game/companion-singalong-screen';
import { MedleySetupScreen, MedleyGameView } from '@/components/game/medley-contest-screen';

// Screen types (matches page.tsx)
type Screen = 'home' | 'library' | 'game' | 'party' | 'character' | 'queue' | 'mobile' | 'results' | 'highscores' | 'import' | 'settings' | 'jukebox' | 'achievements' | 'dailyChallenge' | 'tournament' | 'tournament-game' | 'battle-royale' | 'battle-royale-game' | 'pass-the-mic' | 'pass-the-mic-game' | 'companion-singalong' | 'companion-singalong-game' | 'medley' | 'medley-game' | 'editor' | 'online' | 'party-setup' | 'song-voting';

interface PartyGameScreensProps {
  screen: Screen;
  setScreen: (s: Screen) => void;
}

// ===================== PARTY GAME MODE SCREENS =====================
export function PartyGameScreens({ screen, setScreen }: PartyGameScreensProps) {
  const { profiles, setGameMode, setSong, resetGame, addPlayer } = useGameStore();
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
          onPlayMatch={(match) => {
            if (!match.player1 || !match.player2) return;

            party.setCurrentTournamentMatch(match);

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

      {/* Medley Contest Game Screen */}
      {screen === 'medley-game' && party.medleySongs.length > 0 && (
        <MedleyGameView
          players={party.medleyPlayers}
          medleySongs={party.medleySongs}
          settings={party.medleySettings}
          onUpdatePlayers={party.setMedleyPlayers}
          onEndGame={() => {
            party.setMedleyPlayers([]);
            party.setMedleySongs([]);
            party.setMedleySettings(null);
            setScreen('home');
          }}
        />
      )}
    </>
  );
}
