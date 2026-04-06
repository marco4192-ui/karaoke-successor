'use client';

import React from 'react';
import { useGameStore } from '@/lib/game/store';
import { usePartyStore } from '@/lib/game/party-store';
import { getAllSongs } from '@/lib/game/song-library';
import { UnifiedPartySetup, SongVotingModal, GameSetupResult, PARTY_GAME_CONFIGS } from '@/components/game/unified-party-setup';
import { PassTheMicSegment } from '@/components/game/pass-the-mic-screen';
import { Song, GameMode } from '@/types/game';

// Screen types (matches page.tsx)
type Screen = 'home' | 'library' | 'game' | 'party' | 'character' | 'queue' | 'mobile' | 'results' | 'highscores' | 'import' | 'settings' | 'jukebox' | 'achievements' | 'dailyChallenge' | 'tournament' | 'tournament-game' | 'battle-royale' | 'battle-royale-game' | 'pass-the-mic' | 'pass-the-mic-game' | 'companion-singalong' | 'companion-singalong-game' | 'medley' | 'medley-game' | 'editor' | 'online' | 'party-setup' | 'song-voting';

interface PartySetupSectionProps {
  screen: Screen;
  setScreen: (s: Screen) => void;
}

// ===================== PARTY SETUP + SONG VOTING SECTION =====================
export function PartySetupSection({ screen, setScreen }: PartySetupSectionProps) {
  const { profiles, setGameMode, setSong } = useGameStore();
  const party = usePartyStore();

  return (
    <>
      {/* Unified Party Setup Screen */}
      {screen === 'party-setup' && party.selectedGameMode && (
        <UnifiedPartySetup
          gameMode={party.selectedGameMode}
          profiles={profiles}
          songs={getAllSongs()}
          onStartGame={(result) => {
            party.setUnifiedSetupResult(result);
            if (party.selectedGameMode) setGameMode(party.selectedGameMode);

            // Handle different game modes
            if (party.selectedGameMode === 'tournament') {
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
            } else if (party.selectedGameMode === 'battle-royale') {
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
            } else if (party.selectedGameMode === 'medley') {
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
              party.setMedleyPlayers(result.players);
              party.setMedleySongs(medleySongList);
              party.setMedleySettings(result.settings);
              setScreen('medley-game');
            } else if (party.selectedGameMode === 'pass-the-mic') {
              // Store settings and go to library for song selection
              party.setPassTheMicPlayers(result.players);
              party.setPassTheMicSettings(result.settings);
              setScreen('library');
            } else if (party.selectedGameMode === 'companion-singalong') {
              // Store settings and go to library for song selection
              party.setCompanionPlayers(result.players);
              party.setCompanionSettings(result.settings);
              setScreen('library');
            } else {
              // Default: go to library for song selection
              setScreen('library');
            }
          }}
          onSelectLibrary={(result) => {
            party.setUnifiedSetupResult(result);
            if (party.selectedGameMode) setGameMode(party.selectedGameMode);

            // Store settings based on game mode and navigate to library
            if (party.selectedGameMode === 'pass-the-mic') {
              party.setPassTheMicPlayers(result.players);
              party.setPassTheMicSettings(result.settings);
            } else if (party.selectedGameMode === 'companion-singalong') {
              party.setCompanionPlayers(result.players);
              party.setCompanionSettings(result.settings);
            }

            setScreen('library');
          }}
          onVoteMode={(result, suggestedSongs) => {
            party.setUnifiedSetupResult(result);
            party.setVotingSongs(suggestedSongs);
            setScreen('song-voting');
          }}
          onBack={() => setScreen('party')}
        />
      )}

      {/* Song Voting Modal */}
      {screen === 'song-voting' && party.votingSongs.length > 0 && party.selectedGameMode && (
        <SongVotingModal
          songs={party.votingSongs}
          players={party.unifiedSetupResult?.players || []}
          gameColor={PARTY_GAME_CONFIGS[party.selectedGameMode]?.color || 'from-cyan-500 to-blue-500'}
          onVote={(songId) => {
            const selectedSong = party.votingSongs.find(s => s.id === songId);
            if (selectedSong) {
              setSong(selectedSong);
              if (party.selectedGameMode) setGameMode(party.selectedGameMode);

              // Handle game-specific setup
              if (party.selectedGameMode === 'pass-the-mic') {
                const segmentDuration = party.unifiedSetupResult?.settings?.segmentDuration || 30;
                const segmentCount = Math.ceil(selectedSong.duration / (segmentDuration * 1000));
                const segments: PassTheMicSegment[] = [];
                for (let i = 0; i < segmentCount; i++) {
                  segments.push({
                    startTime: i * segmentDuration * 1000,
                    endTime: Math.min((i + 1) * segmentDuration * 1000, selectedSong.duration),
                    playerId: null,
                  });
                }
                party.setPassTheMicPlayers(party.unifiedSetupResult?.players || []);
                party.setPassTheMicSegments(segments);
                party.setPassTheMicSong(selectedSong);
                setScreen('pass-the-mic-game');
              } else if (party.selectedGameMode === 'companion-singalong') {
                party.setCompanionPlayers(party.unifiedSetupResult?.players || []);
                party.setCompanionSong(selectedSong);
                setScreen('companion-singalong-game');
              } else {
                setScreen('game');
              }
            }
          }}
          onClose={() => setScreen('party-setup')}
        />
      )}
    </>
  );
}
