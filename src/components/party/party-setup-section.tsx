'use client';

import { useEffect } from 'react';
import { useGameStore } from '@/lib/game/store';
import { usePartyStore } from '@/lib/game/party-store';
import { getNonDuetSongs, filterSongs } from '@/lib/game/song-library';
import { useTranslation } from '@/lib/i18n/translations';
import { UnifiedPartySetup, SongVotingModal, PARTY_GAME_CONFIGS } from '@/components/game/unified-party-setup';
import type { PassTheMicSegment } from '@/components/game/ptm-types';
import type { GameModeSettingsMap, PassTheMicSettings as PassTheMicModeSettings } from '@/components/game/unified-party-setup.types';
import { Song, EMPTY_PLAYER_SCORE } from '@/types/game';
import type { Difficulty } from '@/types/game';
import type { Screen } from '@/types/screens';
import { storeSongFilters } from '@/lib/game/ptm-next-song';
import { toast } from '@/hooks/use-toast';
import type { PassTheMicSettings } from '@/components/game/ptm-types';
import type { CptmSettings } from '@/components/game/cptm-types';
import { dispatchStartGame } from './party-start-handlers';

interface PartySetupSectionProps {
  screen: Screen;
  setScreen: (_s: Screen) => void;
}

// ===================== HELPER: Convert unified setup settings to typed settings =====================
function toPassTheMicSettings(
  s: GameModeSettingsMap['pass-the-mic'], overrides?: Partial<PassTheMicSettings>): PassTheMicSettings {
  return {
    segmentDuration: s.segmentDuration ?? 30,
    difficulty: s.difficulty ?? 'medium',
    micId: s.micId ?? 'default',
    micName: s.micName ?? 'Standard',
    randomSwitches: s.randomSwitches,
    sharedMicId: s.sharedMicId ?? null,
    sharedMicName: s.sharedMicName ?? null,
    ...overrides,
  };
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
// ===================== HELPER: Convert SelectedPlayer to PassTheMic/Companion player =====================
function toPassTheMicPlayers(players: { id: string; name: string; avatar?: string; color: string; micId?: string; micName?: string; playerType?: string }[]) {
  return players.map(p => ({ ...p, ...EMPTY_PLAYER_SCORE, isActive: false, segmentsSung: 0 }));
}

function toCptmPlayers(players: { id: string; name: string; avatar?: string; color: string; micId?: string; micName?: string; playerType?: string }[]) {
  return players.map(p => ({ ...p, ...EMPTY_PLAYER_SCORE, segmentsSung: 0 }));
}

function toCptmSettings(s: { difficulty?: Difficulty; blinkWarning?: number }): CptmSettings {
  return {
    difficulty: s.difficulty ?? 'medium',
    blinkWarning: s.blinkWarning ?? 3,
  };
}

// ===================== PARTY SETUP + SONG VOTING SECTION =====================
export function PartySetupSection({ screen, setScreen }: PartySetupSectionProps) {
  const { profiles, setGameMode, setSong, setDifficulty, resetGame, addPlayer, setPlayers } = useGameStore();
    // Remote party-start: companion can trigger the start button
  useEffect(() => {
    const handleRemoteStart = () => {
      const btn = document.getElementById("party-start-btn");
      if (btn) { btn.click(); }
    };
    window.addEventListener("remote-party-start", handleRemoteStart);
    return () => window.removeEventListener("remote-party-start", handleRemoteStart);
  }, []);

const party = usePartyStore();
  const { t } = useTranslation();

  return (
    <>
      {/* Unified Party Setup Screen */}
      {screen === 'party-setup' && party.selectedGameMode && (
        <UnifiedPartySetup
          gameMode={party.selectedGameMode}
          profiles={profiles}
          songs={getNonDuetSongs()}
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
                toast({ title: t('partySetup.songTooShort'), description: t('partySetup.songTooShortPassTheMic'), variant: 'destructive' });
                return;
              }
              party.setPassTheMicSegments(segments);
              party.setPassTheMicSong(song);
              party.setIsSongPlaying(false);
              setScreen('pass-the-mic-game');
            } else if (mode === 'companion-singalong') {
              const cptmPlayers = party.cptmPlayers;
              const cptmSettings = toCptmSettings((party.unifiedSetupResult?.settings as GameModeSettingsMap['companion-singalong']) ?? { difficulty: 'medium' });
              party.setCptmSettings(cptmSettings);
              party.setCptmSong(song);
              const cptmSegments = generatePassTheMicSegments(song, cptmPlayers.length || 2);
              party.setCptmSegments(cptmSegments);
              if (cptmPlayers.length > 0) {
                addPlayer({ id: cptmPlayers[0].id, name: cptmPlayers[0].name, color: cptmPlayers[0].color, avatar: cptmPlayers[0].avatar });
              }
              setScreen('companion-singalong-game');
              return;
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

            const songs = getNonDuetSongs();

            // Apply song filter — base settings (difficulty, filters) are shared across all modes
            const baseSettings = result.settings as { filterGenre: string; filterLanguage: string; filterCombined: boolean; filterReleaseYear: string };
            const filteredSongs = filterSongs(
              songs,
              baseSettings.filterGenre,
              baseSettings.filterLanguage,
              baseSettings.filterCombined,
              baseSettings.filterReleaseYear
            );
            // Store filters for next-round song selection in PTM
            if (party.selectedGameMode === 'pass-the-mic') {
              storeSongFilters({
                filterGenre: baseSettings.filterGenre,
                filterLanguage: baseSettings.filterLanguage,
                filterCombined: String(baseSettings.filterCombined),
                filterReleaseYear: baseSettings.filterReleaseYear,
              });
            }

            if (mode) {
              await dispatchStartGame({
                result,
                mode,
                party,
                setGameMode,
                setDifficulty,
                setSong,
                resetGame,
                addPlayer,
                setPlayers,
                setScreen,
                toast,
                t,
                filteredSongs,
              });
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
              party.setPassTheMicSettings(toPassTheMicSettings(result.settings as GameModeSettingsMap['pass-the-mic'], {
                sharedMicId: (result.settings as GameModeSettingsMap['pass-the-mic']).sharedMicId || null,
                sharedMicName: (result.settings as GameModeSettingsMap['pass-the-mic']).sharedMicName || null,
              }));
            } else if (party.selectedGameMode === 'companion-singalong') {
              party.setCptmPlayers(toCptmPlayers(result.players));
              party.setCptmSettings(toCptmSettings(result.settings as GameModeSettingsMap['companion-singalong']));
            } else if (party.selectedGameMode === 'rate-my-song') {
              const rateSettings = result.settings as GameModeSettingsMap['rate-my-song'];
              const duration = rateSettings.duration || 'normal';
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
              const { ensureSongUrls } = await import('@/lib/game/song-url-restore');
              songWithUrls = await ensureSongUrls(selectedSong);
              // Also load lyrics for PTM note highway and lyrics display
              if (!songWithUrls.lyrics || songWithUrls.lyrics.length === 0) {
                try {
                  const { loadSongLyrics } = await import('@/lib/game/song-lyrics-loader');
                  const lyrics = await loadSongLyrics(songWithUrls);
                  if (lyrics.length > 0) {
                    songWithUrls = { ...songWithUrls, lyrics };
                  }
                } catch { /* non-critical */ }
              }
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
              const pSettings = party.unifiedSetupResult?.settings as PassTheMicModeSettings | undefined;
              const segments = generatePassTheMicSegments(songWithUrls, playerCount, pSettings?.segmentDuration);
              if (segments.length === 0) {
                toast({ title: t('partySetup.songTooShort'), description: t('partySetup.songTooShortVote'), variant: 'destructive' });
                return;
              }
              const segDur = (segments[1]?.startTime ?? segments[0]?.endTime ?? 30000) - (segments[0]?.startTime ?? 0);
              const ptmPlayers = toPassTheMicPlayers(party.unifiedSetupResult?.players || []);
              party.setPassTheMicPlayers(ptmPlayers);
              party.setPassTheMicSegments(segments);
              party.setPassTheMicSong(songWithUrls);
              party.setPassTheMicSettings(toPassTheMicSettings(pSettings!, {
                segmentDuration: Math.round(segDur / 1000),
                sharedMicId: pSettings?.sharedMicId || null,
                sharedMicName: pSettings?.sharedMicName || null,
              }));
              party.setIsSongPlaying(false);
              // Use dedicated PTM game screen
              setScreen('pass-the-mic-game');
            } else if (party.selectedGameMode === 'companion-singalong') {
              const cptmPlayers = toCptmPlayers(party.unifiedSetupResult?.players || []);
              party.setCptmPlayers(cptmPlayers);
              party.setCptmSong(songWithUrls);
              party.setCptmSettings(toCptmSettings(party.unifiedSetupResult?.settings as GameModeSettingsMap['companion-singalong']));
              const cptmSegments = generatePassTheMicSegments(songWithUrls, cptmPlayers.length || 2);
              party.setCptmSegments(cptmSegments);
              if (cptmPlayers.length > 0) {
                addPlayer({ id: cptmPlayers[0].id, name: cptmPlayers[0].name, color: cptmPlayers[0].color, avatar: cptmPlayers[0].avatar });
              }
              setScreen('companion-singalong-game');
            } else if (party.selectedGameMode === 'duel' || party.selectedGameMode === 'duet') {
              // Duel/Duet: add both players from setup result
              const setupPlayers = party.unifiedSetupResult?.players || [];
              setupPlayers.forEach((p) => {
                addPlayer({ id: p.id, name: p.name, color: p.color, avatar: p.avatar });
              });
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
