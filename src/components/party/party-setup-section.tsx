'use client';

import React from 'react';
import { useGameStore } from '@/lib/game/store';
import { usePartyStore } from '@/lib/game/party-store';
import { getAllSongs } from '@/lib/game/song-library';
import { UnifiedPartySetup, SongVotingModal, GameSetupResult, PARTY_GAME_CONFIGS } from '@/components/game/unified-party-setup';
import { PassTheMicSegment } from '@/components/game/pass-the-mic-screen';
import { Song, GameMode } from '@/types/game';
import { createTournament, TournamentPlayer, TournamentSettings } from '@/lib/game/tournament';
import { createBattleRoyale, BattleRoyaleSettings } from '@/lib/game/battle-royale';

// Screen types (matches page.tsx)
type Screen = 'home' | 'library' | 'game' | 'party' | 'character' | 'queue' | 'mobile' | 'results' | 'highscores' | 'import' | 'settings' | 'jukebox' | 'achievements' | 'dailyChallenge' | 'tournament' | 'tournament-game' | 'battle-royale' | 'battle-royale-game' | 'pass-the-mic' | 'pass-the-mic-game' | 'companion-singalong' | 'companion-singalong-game' | 'medley' | 'medley-game' | 'editor' | 'online' | 'party-setup' | 'song-voting';

interface PartySetupSectionProps {
  screen: Screen;
  setScreen: (s: Screen) => void;
}

// ===================== HELPER: Pick a random song =====================
function pickRandomSong(songs: Song[]): Song | null {
  if (songs.length === 0) return null;
  return songs[Math.floor(Math.random() * songs.length)];
}

// ===================== HELPER: Generate pass-the-mic segments =====================
function generatePassTheMicSegments(song: Song, segmentDuration: number): PassTheMicSegment[] {
  const segmentCount = Math.ceil(song.duration / (segmentDuration * 1000));
  const segments: PassTheMicSegment[] = [];
  for (let i = 0; i < segmentCount; i++) {
    segments.push({
      startTime: i * segmentDuration * 1000,
      endTime: Math.min((i + 1) * segmentDuration * 1000, song.duration),
      playerId: null,
    });
  }
  return segments;
}

// ===================== PARTY SETUP + SONG VOTING SECTION =====================
export function PartySetupSection({ screen, setScreen }: PartySetupSectionProps) {
  const { profiles, setGameMode, setSong, setDifficulty } = useGameStore();
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
            const mode = party.selectedGameMode;
            if (mode) {
              setGameMode(mode);
              setDifficulty(result.difficulty);
            }

            const songs = getAllSongs();

            switch (mode) {
              // ── Tournament: create bracket → bracket view ──
              case 'tournament': {
                const maxPlayers = result.settings.maxPlayers || 8;
                const shortMode = result.settings.shortMode !== false;
                const tournamentPlayers: TournamentPlayer[] = result.players.map((p, i) => ({
                  id: p.id,
                  name: p.name,
                  avatar: p.avatar,
                  color: p.color,
                  eliminated: false,
                  seed: i + 1,
                }));
                const settings: TournamentSettings = {
                  maxPlayers: maxPlayers as 2 | 4 | 8 | 16 | 32,
                  songDuration: shortMode ? 60 : 180,
                  randomSongs: true,
                  difficulty: result.difficulty,
                };
                try {
                  const bracket = createTournament(tournamentPlayers, settings);
                  party.setTournamentBracket(bracket);
                  party.setTournamentSongDuration(settings.songDuration);
                  setScreen('tournament-game');
                } catch (err) {
                  console.error('[PartySetup] Failed to create tournament:', err);
                }
                break;
              }

              // ── Battle Royale: create game object → game view ──
              case 'battle-royale': {
                const brSettings: BattleRoyaleSettings = {
                  roundDuration: result.settings.roundDuration || 60,
                  finalRoundDuration: result.settings.finalRoundDuration || 120,
                  randomSongs: true,
                  medleyMode: result.settings.medleyMode || false,
                  medleySnippets: 3,
                  difficulty: result.difficulty,
                  eliminationAnimation: true,
                };
                try {
                  const game = createBattleRoyale(
                    result.players.map(p => ({
                      id: p.id,
                      name: p.name,
                      avatar: p.avatar,
                      color: p.color,
                      playerType: p.playerType || 'microphone',
                    })),
                    brSettings,
                    songs.map(s => s.id),
                  );
                  party.setBattleRoyaleGame(game);
                  setScreen('battle-royale-game');
                } catch (err) {
                  console.error('[PartySetup] Failed to create battle royale:', err);
                }
                break;
              }

              // ── Medley: create song list → medley game view ──
              case 'medley': {
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
                break;
              }

              // ── Pass the Mic: random song → generate segments → game view ──
              case 'pass-the-mic': {
                const randomSong = pickRandomSong(songs);
                if (randomSong) {
                  const segmentDuration = result.settings.segmentDuration || 30;
                  party.setPassTheMicPlayers(result.players);
                  party.setPassTheMicSegments(generatePassTheMicSegments(randomSong, segmentDuration));
                  party.setPassTheMicSong(randomSong);
                  party.setPassTheMicSettings(result.settings);
                  setSong(randomSong);
                  setScreen('pass-the-mic-game');
                }
                break;
              }

              // ── Companion Sing-A-Long: random song → game view ──
              case 'companion-singalong': {
                const randomSong = pickRandomSong(songs);
                if (randomSong) {
                  party.setCompanionPlayers(result.players);
                  party.setCompanionSong(randomSong);
                  party.setCompanionSettings(result.settings);
                  setSong(randomSong);
                  setScreen('companion-singalong-game');
                }
                break;
              }

              // ── Missing Words / Blind: random song → regular game screen ──
              case 'missing-words':
              case 'blind': {
                const randomSong = pickRandomSong(songs);
                if (randomSong) {
                  setSong(randomSong);
                  setScreen('game');
                }
                break;
              }

              // ── Duel / other modes: go to library for song selection ──
              default:
                setScreen('library');
            }
          }}
          onSelectLibrary={(result) => {
            party.setUnifiedSetupResult(result);
            if (party.selectedGameMode) {
              setGameMode(party.selectedGameMode);
              setDifficulty(result.difficulty);
            }

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
              if (party.selectedGameMode) {
                setGameMode(party.selectedGameMode);
                setDifficulty(party.unifiedSetupResult?.difficulty || 'medium');
              }

              // Handle game-specific setup
              if (party.selectedGameMode === 'pass-the-mic') {
                const segmentDuration = party.unifiedSetupResult?.settings?.segmentDuration || 30;
                party.setPassTheMicPlayers(party.unifiedSetupResult?.players || []);
                party.setPassTheMicSegments(generatePassTheMicSegments(selectedSong, segmentDuration));
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
