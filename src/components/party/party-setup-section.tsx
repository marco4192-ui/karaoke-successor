'use client';

import { useEffect } from 'react';
import { useGameStore } from '@/lib/game/store';
import { usePartyStore } from '@/lib/game/party-store';
import { getNonDuetSongs, filterSongs } from '@/lib/game/song-library';
import { useTranslation } from '@/lib/i18n/translations';
import { UnifiedPartySetup, SongVotingModal, PARTY_GAME_CONFIGS } from '@/components/game/unified-party-setup';
import { Song } from '@/types/game';
import type { Screen } from '@/types/screens';
import { storeSongFilters } from '@/lib/game/ptm-next-song';
import { generatePtmSegments } from '@/lib/game/ptm-segments';
import { toast } from '@/hooks/use-toast';
import { dispatchStartGame } from './party-start-handlers';

interface PartySetupSectionProps {
  screen: Screen;
  setScreen: (_s: Screen) => void;
}

// ===================== PARTY SETUP + SONG VOTING SECTION =====================
// Unified flow (identical for every party mode):
//   1. Mode selection (party screen)
//   2. Party-mode settings (game settings, players, input devices)  ← this screen
//   3. Song-selection method (Random, Library, Vote, Medley)
//   4. Optionally pick a song (Library/Vote) → returns here with the song
//   5. "Ready to Play" button → dispatchStartGame → mode starting screen
// Selecting a song or a song-selection method NEVER starts the game directly.
export function PartySetupSection({ screen, setScreen }: PartySetupSectionProps) {
  const { profiles, setGameMode, setSong, setDifficulty, resetGame, addPlayer, setPlayers } = useGameStore();
  // Remote party-start: companion can trigger the "Ready to Play" button
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
          preSelectedMethod={(party.songSelectionMethod as 'library' | 'vote' | null) ?? null}
          initialDraft={party.setupDraft}
          onSaveDraft={(draft) => party.setSetupDraft(draft)}
          onClearSelectedSong={() => {
            // User switched back to a songless method (random/medley):
            // drop any pre-selected song so "Ready to Play" uses the method.
            party.setLibrarySelectedSong(null);
            party.setSongSelectionMethod(null);
          }}
          onChangePreselectedSong={() => {
            // User wants to pick a different song — go back to library
            party.setLibrarySelectedSong(null);
            setScreen('library');
          }}
          onStartGame={async (result) => {
            party.setUnifiedSetupResult(result);
            party.setLibrarySelectedSong(null); // clear any pre-selected library song
            party.setSongSelectionMethod(null);
            party.setSetupDraft(null);
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
            party.setSongSelectionMethod('library');
            if (party.selectedGameMode) {
              setGameMode(party.selectedGameMode);
              setDifficulty(result.difficulty);
            }
            // Navigate to the library — the game is NOT started here.
            setScreen('library');
          }}
          onVoteMode={(result, suggestedSongs) => {
            party.setUnifiedSetupResult(result);
            party.setSongSelectionMethod('vote');
            party.setVotingSongs(suggestedSongs);
            setScreen('song-voting');
          }}
          onBack={() => {
            party.setLibrarySelectedSong(null);
            party.setSongSelectionMethod(null);
            party.setSetupDraft(null);
            setScreen('party');
          }}
        />
      )}

      {/* Song Voting Modal — picking a song returns to the setup screen.
          The game starts via the "Ready to Play" button, not here.
          EXCEPTION: next-round votes (PTM/CPTM "next song") return directly
          into the game screen with the existing players. */}
      {screen === 'song-voting' && party.votingSongs.length > 0 && party.selectedGameMode && (
        <SongVotingModal
          songs={party.votingSongs}
          players={(party.unifiedSetupResult?.players
            ?? (party.nextRoundPick === 'cptm' ? party.cptmPlayers : party.passTheMicPlayers)
          ).map(p => ({ id: p.id, name: p.name, avatar: p.avatar, color: p.color, playerType: 'microphone' as const }))}
          gameColor={PARTY_GAME_CONFIGS[party.selectedGameMode]?.color || 'from-cyan-500 to-blue-500'}
          onVote={async (songId) => {
            const selectedSong = party.votingSongs.find(s => s.id === songId);
            if (!selectedSong) return;

            // Restore media URLs (audio/video) + lyrics before handing the
            // song back to the setup screen
            let songWithUrls: Song = selectedSong;
            try {
              const { ensureSongUrls } = await import('@/lib/game/song-url-restore');
              songWithUrls = await ensureSongUrls(selectedSong);
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

            // ── Next-round vote (PTM/CPTM): re-enter the game directly with
            // the same players — no setup detour, no lost player grid. ──
            if (party.nextRoundPick === 'ptm') {
              party.setNextRoundPick(null);
              const playerCount = party.passTheMicPlayers.length || 2;
              const segments = generatePtmSegments(
                songWithUrls.duration,
                playerCount,
                party.passTheMicSettings?.segmentDuration,
                songWithUrls.lyrics,
              );
              party.setPassTheMicSegments(segments);
              party.setPassTheMicSong(songWithUrls);
              party.setIsSongPlaying(false);
              setScreen('pass-the-mic-game');
              return;
            }
            if (party.nextRoundPick === 'cptm') {
              party.setNextRoundPick(null);
              const playerCount = party.cptmPlayers.length || 2;
              const segments = generatePtmSegments(
                songWithUrls.duration,
                playerCount,
                party.cptmSettings?.segmentDuration,
                songWithUrls.lyrics,
              );
              party.setCptmSegments(segments);
              party.setCptmSong(songWithUrls);
              party.setIsSongPlaying(false);
              setScreen('companion-singalong-game');
              return;
            }

            // Return to the setup screen with the voted song pre-selected
            party.setLibrarySelectedSong(songWithUrls);
            party.setSongSelectionMethod('vote');
            setScreen('party-setup');
          }}
          onClose={() => {
            if (party.nextRoundPick === 'ptm' || party.nextRoundPick === 'cptm') {
              // User dismissed the next-round vote overlay: fall back to a
              // random song so the series continues with the same players
              // (instead of dumping them into the setup screen with an
              // empty player grid).
              const isCptm = party.nextRoundPick === 'cptm';
              party.setNextRoundPick(null);
              const playerCount = (isCptm ? party.cptmPlayers : party.passTheMicPlayers).length || 2;
              const segDur = (isCptm ? party.cptmSettings : party.passTheMicSettings)?.segmentDuration;
              void (async () => {
                try {
                  const { preparePtmNextSong } = await import('@/lib/game/ptm-next-song');
                  const action = await preparePtmNextSong('random', playerCount, segDur);
                  if (action.mode === 'random' || action.mode === 'medley') {
                    if (isCptm) {
                      party.setCptmSegments(action.result.segments);
                      party.setCptmSong(action.result.song);
                      party.setIsSongPlaying(false);
                      setScreen('companion-singalong-game');
                    } else {
                      if (action.mode === 'medley') party.setPtmMedleySnippets(action.result.medleySnippets);
                      party.setPassTheMicSegments(action.result.segments);
                      party.setPassTheMicSong(action.result.song);
                      party.setIsSongPlaying(false);
                      setScreen('pass-the-mic-game');
                    }
                    return;
                  }
                } catch { /* fall through to setup */ }
                setScreen('party-setup');
              })();
              return;
            }
            setScreen('party-setup');
          }}
        />
      )}
    </>
  );
}
