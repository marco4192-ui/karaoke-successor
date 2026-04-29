'use client';

import React from 'react';
import { useGameStore } from '@/lib/game/store';
import { usePartyStore } from '@/lib/game/party-store';
import { getAllSongs, filterSongs, ensureSongUrls } from '@/lib/game/song-library';
import { UnifiedPartySetup, SongVotingModal, GameSetupResult, PARTY_GAME_CONFIGS } from '@/components/game/unified-party-setup';
import { PassTheMicSegment } from '@/components/game/pass-the-mic-screen';
import type { MedleyPlayer as MedleyPlayerType, MedleySettings as MedleySettingsType } from '@/components/game/medley/medley-types';
import { Song, GameMode } from '@/types/game';
import type { Screen } from '@/types/screens';
import { createTournament, TournamentPlayer, TournamentSettings } from '@/lib/game/tournament';
import { createBattleRoyale, BattleRoyaleSettings } from '@/lib/game/battle-royale';
import { createCompetitiveGame, type CompetitiveModeType, type CompetitiveSettings } from '@/lib/game/competitive-words-blind';
import { storeSongFilters } from '@/lib/game/ptm-next-song';
import { toast } from '@/hooks/use-toast';

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
// Auto segment duration: 20-60s, at least 2 segments per player, equal segments per player
function generatePassTheMicSegments(song: Song, playerCount: number, explicitDuration?: number): PassTheMicSegment[] {
  const MIN_SONG_MS = 60_000; // Exclude songs shorter than 60s
  if (song.duration < MIN_SONG_MS) return [];

  const MIN_SEG_S = 20;
  const MAX_SEG_S = 60;
  const MIN_SEGS_PER_PLAYER = 2;

  const durationMs = song.duration;
  const rawAuto = Math.ceil(durationMs / (playerCount * MIN_SEGS_PER_PLAYER * 1000));
  const clampedAuto = Math.max(MIN_SEG_S, Math.min(MAX_SEG_S, rawAuto));
  const segDur = explicitDuration
    ? Math.max(MIN_SEG_S, Math.min(MAX_SEG_S, explicitDuration))
    : clampedAuto;
  const segDurMs = segDur * 1000;

  // Round up to ensure every player gets the same number of segments
  const rawCount = Math.ceil(durationMs / segDurMs);
  const segCount = Math.max(playerCount, rawCount);
  // Adjust segment duration so all segments fit evenly
  const adjustedDurMs = durationMs / segCount;

  const segments: PassTheMicSegment[] = [];
  for (let i = 0; i < segCount; i++) {
    segments.push({
      startTime: Math.round(i * adjustedDurMs),
      endTime: Math.round((i + 1) * adjustedDurMs),
      playerId: null,
    });
  }
  return segments;
}

// ===================== PARTY SETUP + SONG VOTING SECTION =====================
// ===================== HELPER: Convert SelectedPlayer to Medley/PassTheMic/Companion player =====================
function toMedleyPlayers(players: { id: string; name: string; avatar?: string; color: string; micId?: string; micName?: string; playerType?: string }[]): MedleyPlayerType[] {
  return players.map((p, i) => ({ ...p, team: null as number, inputType: (p.playerType === 'companion' ? 'mobile' : 'local') as 'local' | 'mobile', score: 0, notesHit: 0, notesMissed: 0, combo: 0, maxCombo: 0, snippetsSung: 0 }));
}

function toPassTheMicPlayers(players: { id: string; name: string; avatar?: string; color: string; micId?: string; micName?: string; playerType?: string }[]) {
  return players.map(p => ({ ...p, score: 0, notesHit: 0, notesMissed: 0, combo: 0, maxCombo: 0, isActive: false, segmentsSung: 0 }));
}

function toCompanionPlayers(players: { id: string; name: string; avatar?: string; color: string; micId?: string; micName?: string; playerType?: string }[]) {
  return players.map(p => ({ ...p, score: 0, notesHit: 0, notesMissed: 0, combo: 0, maxCombo: 0, isActive: false, turnsSung: 0 }));
}

// ===================== PARTY SETUP + SONG VOTING SECTION =====================
export function PartySetupSection({ screen, setScreen }: PartySetupSectionProps) {
  const { profiles, setGameMode, setSong, setDifficulty, resetGame, addPlayer, setPlayers } = useGameStore();
  const party = usePartyStore();

  return (
    <>
      {/* Unified Party Setup Screen */}
      {screen === 'party-setup' && party.selectedGameMode && (
        <UnifiedPartySetup
          gameMode={party.selectedGameMode}
          profiles={profiles}
          songs={getAllSongs()}
          preSelectedSong={party.librarySelectedSong}
          onStartWithPreselectedSong={() => {
            // User clicked "Start Game" with pre-selected library song
            const song = party.librarySelectedSong;
            if (!song) return;
            // Clear the pre-selected song
            party.setLibrarySelectedSong(null);
            const mode = party.selectedGameMode;
            if (!mode) return;

            // Reset game state and set up players before entering the game screen
            resetGame();
            setPlayers([]);
            setGameMode(mode);
            setSong(song);

            if (mode === 'pass-the-mic') {
              // Generate segments and use dedicated PTM screen
              const ptmPlayers = party.passTheMicPlayers;
              const playerCount = ptmPlayers.length || 2;
              const segments = generatePassTheMicSegments(song, playerCount, party.passTheMicSettings?.segmentDuration);
              if (segments.length === 0) {
                toast({ title: 'Song zu kurz', description: 'Der Song ist kürzer als 60 Sekunden und kann nicht für Pass the Mic verwendet werden.', variant: 'destructive' });
                return;
              }
              party.setPassTheMicSegments(segments);
              party.setPassTheMicSong(song);
              party.setIsSongPlaying(false);
              setScreen('pass-the-mic-game');
            } else if (mode === 'companion-singalong') {
              // Add first companion player as the active singer
              const compPlayers = party.companionPlayers;
              if (compPlayers.length > 0) {
                addPlayer({ id: compPlayers[0].id, name: compPlayers[0].name, color: compPlayers[0].color, avatar: compPlayers[0].avatar });
              }
            } else {
              // Standard/duel mode: add all players from setup result
              const result = party.unifiedSetupResult;
              if (result) {
                result.players.forEach((p) => {
                  addPlayer({ id: p.id, name: p.name, color: p.color, avatar: p.avatar });
                });
              }
            }

            setScreen('game');
          }}
          onChangePreselectedSong={() => {
            // User wants to pick a different song — go back to library
            party.setLibrarySelectedSong(null);
            setScreen('library');
          }}
          onStartGame={async (result) => {
            party.setUnifiedSetupResult(result);
            party.setLibrarySelectedSong(null); // clear any pre-selected library song
            const mode = party.selectedGameMode;
            if (mode) {
              setGameMode(mode);
              setDifficulty(result.difficulty);
            }

            const songs = getAllSongs();

            // Apply song filter if set
            const filteredSongs = filterSongs(
              songs,
              result.settings.filterGenre,
              result.settings.filterLanguage,
              result.settings.filterCombined
            );
            // Store filters for next-round song selection in PTM
            if (party.selectedGameMode === 'pass-the-mic') {
              storeSongFilters({
                filterGenre: result.settings.filterGenre,
                filterLanguage: result.settings.filterLanguage,
                filterCombined: result.settings.filterCombined,
              });
            }

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
                // Validate player count before creating tournament
                const playerCount = tournamentPlayers.length;
                if (playerCount < 2) {
                  toast({
                    title: 'Tournament Error',
                    description: `Mindestens 2 Spieler werden benötigt. Du hast ${playerCount} Spieler ausgewählt.`,
                    variant: 'destructive',
                  });
                  break;
                }
                if (playerCount > maxPlayers) {
                  toast({
                    title: 'Tournament Error',
                    description: `Das Turnier ist für maximal ${maxPlayers} Spieler konfiguriert (Bracket Size: ${maxPlayers}), aber du hast ${playerCount} Spieler ausgewählt. Reduziere die Anzahl der Spieler oder erhöhe die Bracket Size in den Einstellungen.`,
                    variant: 'destructive',
                  });
                  break;
                }
                try {
                  const bracket = createTournament(tournamentPlayers, settings);
                  party.setTournamentBracket(bracket);
                  party.setTournamentSongDuration(settings.songDuration);
                  setScreen('tournament-game');
                } catch (err) {
                  toast({
                    title: 'Tournament Error',
                    description: err instanceof Error ? err.message : 'Unbekannter Fehler beim Erstellen des Turniers.',
                    variant: 'destructive',
                  });
                }
                break;
              }

              // ── Battle Royale: create game object → game view ──
              case 'battle-royale': {
                // Battle Royale allows max 4 microphone players + 20 companion players.
                // The unified setup marks all players as 'microphone', so we need to
                // auto-convert excess players (>4) to 'companion' type.
                const MIC_LIMIT = 4;
                const mappedPlayers = result.players.map((p, i) => ({
                  id: p.id,
                  name: p.name,
                  avatar: p.avatar,
                  color: p.color,
                  playerType: (i < MIC_LIMIT ? 'microphone' : 'companion') as 'microphone' | 'companion',
                }));

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
                  const game = createBattleRoyale(mappedPlayers, brSettings, filteredSongs.map(s => s.id));
                  party.setBattleRoyaleGame(game);
                  setScreen('battle-royale-game');
                } catch (err) {
                  console.error('[PartySetup] Failed to create battle royale:', err);
                  alert(`Fehler beim Starten von Battle Royale: ${err instanceof Error ? err.message : String(err)}`);
                }
                break;
              }

              // ── Medley: create song list → medley game view ──
              case 'medley': {
                const snippetCount = result.settings.snippetCount || 5;
                const snippetDuration = result.settings.snippetDuration || 30;
                const snippetDurationMs = snippetDuration * 1000;
                const shuffled = [...filteredSongs].sort(() => Math.random() - 0.5);
                // UltraStar beat duration: 15000 / BPM ms per beat
                const beatDurationMs = (bpm: number) => 15000 / bpm;
                const medleySongList = shuffled.slice(0, snippetCount).map(song => {
                  // If both #MEDLEYSTARTBEAT: and #MEDLEYENDBEAT: are defined, use them
                  if (song.medleyStartBeat !== undefined && song.medleyEndBeat !== undefined && song.bpm > 0) {
                    const bd = beatDurationMs(song.bpm);
                    const startTime = song.medleyStartBeat * bd;
                    const endTime = song.medleyEndBeat * bd;
                    return { song, startTime, endTime, duration: endTime - startTime };
                  }
                  // If only #MEDLEYSTARTBEAT: is defined, start there
                  if (song.medleyStartBeat !== undefined && song.bpm > 0) {
                    const startTime = song.medleyStartBeat * beatDurationMs(song.bpm);
                    return { song, startTime, endTime: startTime + snippetDurationMs, duration: snippetDurationMs };
                  }
                  // Fallback: random start within song's actual note range
                  // Use last lyric end time instead of song.duration (which includes buffer)
                  const maxSafeTime = song.lyrics && song.lyrics.length > 0
                    ? Math.max(...song.lyrics.map(l => l.endTime))
                    : Math.min(song.duration, snippetDurationMs * 3);
                  const maxStartTime = Math.max(0, maxSafeTime - snippetDurationMs);
                  const startTime = Math.random() * maxStartTime;
                  return { song, startTime, endTime: startTime + snippetDurationMs, duration: snippetDurationMs };
                });
                party.setMedleyPlayers(toMedleyPlayers(result.players));
                party.setMedleySongs(medleySongList);
                // Cast unified setup settings to MedleySettings (the unified setup provides matching keys)
                party.setMedleySettings(result.settings as unknown as MedleySettingsType);
                party.setMedleySeriesHistory([]);
                // Reset isSongPlaying BEFORE navigating to prevent React #185
                // (MedleyGameScreen's useEffect would otherwise trigger during mount cycle)
                party.setIsSongPlaying(false);
                setScreen('medley-game');
                break;
              }

              // ── Pass the Mic: song selection (random, medley, or library-picked) ──
              case 'pass-the-mic': {
                // Store song selection mode so handleContinue knows how to pick the next song
                party.setPtmSongSelection(result.songSelection || 'random');
                // When songSelection is 'medley', delegate to the medley game flow
                // instead of playing a single random song.
                // Construct proper MedleySettings from PTM context.
                if (result.songSelection === 'medley') {
                  const snippetDuration = 30; // fixed 30s per snippet
                  const snippetCount = Math.max(3, Math.min(result.players.length * 2, 10));
                  const snippetDurationMs = snippetDuration * 1000;
                  // Filter out songs shorter than 60 seconds — they cannot contain
                  // a meaningful medley snippet and would cause errors.
                  const MIN_MELODY_SONG_MS = 60 * 1000;
                  const eligibleSongs = filteredSongs.filter(s => s.duration >= MIN_MELODY_SONG_MS);
                  const shuffled = [...eligibleSongs].sort(() => Math.random() - 0.5);
                  const beatDurationMs = (bpm: number) => 15000 / bpm;
                  const medleySnippets = shuffled.slice(0, snippetCount).map(song => {
                    if (song.medleyStartBeat !== undefined && song.medleyEndBeat !== undefined && song.bpm > 0) {
                      const bd = beatDurationMs(song.bpm);
                      const startTime = song.medleyStartBeat * bd;
                      const endTime = song.medleyEndBeat * bd;
                      return { song, startTime, endTime, duration: endTime - startTime };
                    }
                    if (song.medleyStartBeat !== undefined && song.bpm > 0) {
                      const startTime = song.medleyStartBeat * beatDurationMs(song.bpm);
                      return { song, startTime, endTime: startTime + snippetDurationMs, duration: snippetDurationMs };
                    }
                    const maxSafeTime = song.lyrics && song.lyrics.length > 0
                      ? Math.max(...song.lyrics.map(l => l.endTime))
                      : Math.min(song.duration, snippetDurationMs * 3);
                    const maxStartTime = Math.max(0, maxSafeTime - snippetDurationMs);
                    const startTime = Math.random() * maxStartTime;
                    return { song, startTime, endTime: startTime + snippetDurationMs, duration: snippetDurationMs };
                  });

                  // Pre-restore URLs AND lyrics for all snippet songs (needed for
                  // Tauri file:// paths and IndexedDB-stored lyrics)
                  const preparedSnippets = await Promise.all(
                    medleySnippets.map(async snippet => {
                      try {
                        let prepared = await ensureSongUrls(snippet.song);

                        // Also load lyrics if not present (storedTxt / relativeTxtPath)
                        if (!prepared.lyrics || prepared.lyrics.length === 0) {
                          try {
                            const { loadSongLyrics } = await import('@/lib/game/song-library');
                            const lyrics = await loadSongLyrics(prepared);
                            if (lyrics.length > 0) {
                              prepared = { ...prepared, lyrics };
                            }
                          } catch { /* non-critical */ }
                        }

                        return { ...snippet, song: prepared };
                      } catch {
                        return snippet;
                      }
                    })
                  );

                  // Store snippets in party store
                  party.setPtmMedleySnippets(preparedSnippets);

                  // Use first snippet's song as the initial song (with trimmed start/end)
                  const firstSnippet = preparedSnippets[0];
                  const firstSong: Song = {
                    ...firstSnippet.song,
                    start: firstSnippet.startTime,
                    end: firstSnippet.endTime,
                  };

                  // Generate segments: one per snippet
                  const segments: PassTheMicSegment[] = preparedSnippets.map(snippet => ({
                    startTime: snippet.startTime,
                    endTime: snippet.endTime,
                    playerId: null,
                  }));

                  const ptmPlayers = toPassTheMicPlayers(result.players);
                  party.setPassTheMicPlayers(ptmPlayers);
                  party.setPassTheMicSegments(segments);
                  party.setPassTheMicSong(firstSong);
                  party.setPassTheMicSettings({
                    ...result.settings,
                    segmentDuration: snippetDuration,
                    sharedMicId: result.settings.sharedMicId || null,
                    sharedMicName: result.settings.sharedMicName || null,
                  });
                  // Prevent React #185
                  party.setIsSongPlaying(false);
                  setScreen('pass-the-mic-game');
                  break;
                }

                // Default: single random song with segment-based pass-the-mic
                const randomSong = pickRandomSong(filteredSongs);
                if (randomSong) {
                  // Pre-restore URLs for the random song (needed for Tauri file:// paths)
                  let songWithUrls = randomSong;
                  try {
                    songWithUrls = await ensureSongUrls(randomSong);
                  } catch { /* non-critical — game view has its own URL restoration */ }

                  const playerCount = result.players.length || 2;
                  const segments = generatePassTheMicSegments(songWithUrls, playerCount, result.settings.segmentDuration);
                  if (segments.length === 0) {
                    toast({ title: 'Song zu kurz', description: 'Der gewählte Song ist kürzer als 60 Sekunden. Bitte erneut wählen.', variant: 'destructive' });
                    break;
                  }
                  const segDur = (segments[1]?.startTime ?? segments[0]?.endTime ?? 30000) - (segments[0]?.startTime ?? 0);
                  const settingsWithMic = {
                    ...result.settings,
                    segmentDuration: Math.round(segDur / 1000),
                    sharedMicId: result.settings.sharedMicId || null,
                    sharedMicName: result.settings.sharedMicName || null,
                  };
                  const ptmPlayers = toPassTheMicPlayers(result.players);
                  party.setPassTheMicPlayers(ptmPlayers);
                  party.setPassTheMicSegments(segments);
                  party.setPassTheMicSong(songWithUrls);
                  party.setPassTheMicSettings(settingsWithMic);
                  party.setIsSongPlaying(false);
                  // Use dedicated PTM game screen (not main game screen)
                  setScreen('pass-the-mic-game');
                }
                break;
              }

              // ── Companion Sing-A-Long: random song → game view ──
              case 'companion-singalong': {
                const randomSong = pickRandomSong(filteredSongs);
                if (randomSong) {
                  const compPlayers = toCompanionPlayers(result.players);
                  party.setCompanionPlayers(compPlayers);
                  party.setCompanionSong(randomSong);
                  party.setCompanionSettings(result.settings);
                  // Reset game and add first player as the active singer
                  resetGame();
                  setPlayers([]);
                  if (compPlayers.length > 0) {
                    addPlayer({ id: compPlayers[0].id, name: compPlayers[0].name, color: compPlayers[0].color, avatar: compPlayers[0].avatar });
                  }
                  setSong(randomSong);
                  // Use main game screen for proper audio/video/notes/lyrics playback
                  setScreen('game');
                }
                break;
              }

              // ── Missing Words / Blind: create competitive game → competitive game view ──
              case 'missing-words':
              case 'blind': {
                const modeType = mode as CompetitiveModeType;
                const freqSetting = result.settings.missingWordFrequency || result.settings.blindFrequency || 'normal';
                const mwFreqMap: Record<string, number> = { easy: 0.15, normal: 0.25, hard: 0.40 };
                const blindFreqMap: Record<string, number> = { rare: 0.10, normal: 0.25, often: 0.40, insane: 0.60 };
                const compSettings: CompetitiveSettings = {
                  difficulty: result.difficulty,
                  modeType,
                  bestOf: (result.settings.bestOf ?? 3) as 1 | 3 | 5 | 7,
                  missingWordFrequency: modeType === 'missing-words'
                    ? (mwFreqMap[freqSetting] ?? 0.25)
                    : 0.25,
                  blindFrequency: modeType === 'blind'
                    ? (blindFreqMap[freqSetting] ?? 0.25)
                    : 0.25,
                };
                const compGame = createCompetitiveGame(
                  result.players.map(p => p.id),
                  result.players.map(p => p.name),
                  result.players.map(p => p.avatar),
                  compSettings,
                );
                party.setCompetitiveGame(compGame);
                const modeScreen = modeType === 'missing-words' ? 'missing-words-game' : 'blind-game';
                setScreen(modeScreen as Screen);
                break;
              }

              // ── Rate my Song: pick song → set up state → game screen ──
              case 'rate-my-song': {
                const randomSong = pickRandomSong(filteredSongs);
                if (!randomSong) break;
                const duration = result.settings.duration || 'normal';
                const rateSettings = { playMode: result.players.length > 1 ? 'duel' as const : 'single' as const, duration: duration as 'short' | 'normal', songId: randomSong.id };
                const playerIds = result.players.map(p => p.id);
                party.setRateMySongSettings(rateSettings);
                party.setRateMySongPlayerIds(playerIds);
                party.setUnifiedSetupResult(result);
                // Set up the game
                resetGame();
                setGameMode(mode);
                setPlayers([]);
                result.players.forEach((p, i) => {
                  addPlayer({ id: p.id, name: p.name, color: p.color, avatar: p.avatar });
                });
                if (duration === 'short') {
                  setSong({ ...randomSong, start: randomSong.start, end: Math.min((randomSong.start || 0) + 60000, randomSong.end || randomSong.duration) });
                } else {
                  setSong(randomSong);
                }
                setScreen('game');
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
              party.setPtmSongSelection('library');
              party.setPassTheMicPlayers(toPassTheMicPlayers(result.players));
              party.setPassTheMicSettings({
                ...result.settings,
                sharedMicId: result.settings.sharedMicId || null,
                sharedMicName: result.settings.sharedMicName || null,
              });
            } else if (party.selectedGameMode === 'companion-singalong') {
              party.setCompanionPlayers(toCompanionPlayers(result.players));
              party.setCompanionSettings(result.settings);
            } else if (party.selectedGameMode === 'rate-my-song') {
              // Pre-store player IDs and settings; songId will be set when user picks from library
              const duration = result.settings.duration || 'normal';
              party.setRateMySongSettings({
                playMode: result.players.length > 1 ? 'duel' as const : 'single' as const,
                duration: duration as 'short' | 'normal',
                songId: '', // filled in when song is selected from library
              });
              party.setRateMySongPlayerIds(result.players.map(p => p.id));
            }

            setScreen('library');
          }}
          onVoteMode={(result, suggestedSongs) => {
            party.setUnifiedSetupResult(result);
            party.setVotingSongs(suggestedSongs);
            if (party.selectedGameMode === 'pass-the-mic') {
              party.setPtmSongSelection('vote');
            }
            setScreen('song-voting');
          }}
          onBack={() => {
            party.setLibrarySelectedSong(null);
            setScreen('party');
          }}
        />
      )}

      {/* Song Voting Modal */}
      {screen === 'song-voting' && party.votingSongs.length > 0 && party.selectedGameMode && (
        <SongVotingModal
          songs={party.votingSongs}
          players={party.unifiedSetupResult?.players || []}
          gameColor={PARTY_GAME_CONFIGS[party.selectedGameMode]?.color || 'from-cyan-500 to-blue-500'}
          onVote={async (songId) => {
            const selectedSong = party.votingSongs.find(s => s.id === songId);
            if (!selectedSong) return;

            // Restore media URLs (audio/video) for the selected song before starting the game
            let songWithUrls = selectedSong;
            try {
              const { ensureSongUrls } = await import('@/lib/game/song-library');
              songWithUrls = await ensureSongUrls(selectedSong);
            } catch { /* non-critical — game view has its own URL restoration */ }

            // IMPORTANT: resetGame() clears currentSong AND gameMode,
            // so setGameMode() and setSong() must come AFTER resetGame()
            resetGame();
            setPlayers([]);
            if (party.selectedGameMode) {
              setGameMode(party.selectedGameMode);
              setDifficulty(party.unifiedSetupResult?.difficulty || 'medium');
            }
            setSong(songWithUrls);

            if (party.selectedGameMode === 'pass-the-mic') {
              const playerCount = (party.unifiedSetupResult?.players?.length) || 2;
              const segments = generatePassTheMicSegments(songWithUrls, playerCount, party.unifiedSetupResult?.settings?.segmentDuration);
              if (segments.length === 0) {
                toast({ title: 'Song zu kurz', description: 'Der gewählte Song ist kürzer als 60 Sekunden.', variant: 'destructive' });
                return;
              }
              const segDur = (segments[1]?.startTime ?? segments[0]?.endTime ?? 30000) - (segments[0]?.startTime ?? 0);
              const ptmPlayers = toPassTheMicPlayers(party.unifiedSetupResult?.players || []);
              party.setPassTheMicPlayers(ptmPlayers);
              party.setPassTheMicSegments(segments);
              party.setPassTheMicSong(songWithUrls);
              party.setPassTheMicSettings({
                ...party.unifiedSetupResult?.settings,
                segmentDuration: Math.round(segDur / 1000),
                sharedMicId: party.unifiedSetupResult?.settings?.sharedMicId || null,
                sharedMicName: party.unifiedSetupResult?.settings?.sharedMicName || null,
              });
              party.setIsSongPlaying(false);
              // Use dedicated PTM game screen
              setScreen('pass-the-mic-game');
            } else if (party.selectedGameMode === 'companion-singalong') {
              const compPlayers = toCompanionPlayers(party.unifiedSetupResult?.players || []);
              party.setCompanionPlayers(compPlayers);
              party.setCompanionSong(songWithUrls);
              if (compPlayers.length > 0) {
                addPlayer({ id: compPlayers[0].id, name: compPlayers[0].name, color: compPlayers[0].color, avatar: compPlayers[0].avatar });
              }
              setScreen('game');
            } else {
              setScreen('game');
            }
          }}
          onClose={() => setScreen('party-setup')}
        />
      )}
    </>
  );
}
