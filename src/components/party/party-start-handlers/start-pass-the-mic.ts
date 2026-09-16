import type { StartHandlerContext } from './types';
import type { PassTheMicSegment } from '@/components/game/ptm-types';
import type { PassTheMicSettings } from '@/components/game/ptm-types';
import type { GameModeSettingsMap } from '@/components/game/unified-party-setup.types';
import { Song, EMPTY_PLAYER_SCORE } from '@/types/game';
import { generateMedleySnippets } from '@/components/game/medley/medley-snippet-generator';
import { generateBalancedPartySegments } from '@/components/game/party-segments';
import { ensureSongUrls } from '@/lib/game/song-url-restore';

export async function startPassTheMic(ctx: StartHandlerContext): Promise<void> {
  const { result, party, setScreen, toast, t, filteredSongs, resetGame, setSong, setGameMode, setDifficulty } = ctx;
  const s = result.settings as GameModeSettingsMap['pass-the-mic'];
  // Store song selection mode so handleContinue knows how to pick the next song
  party.setPtmSongSelection(result.songSelection || 'random');
  // When songSelection is 'medley', delegate to the medley game flow
  // instead of playing a single random song.
  // Construct proper MedleySettings from PTM context.
  if (result.songSelection === 'medley') {
    const snippetDuration = 30; // fixed 30s per snippet
    const snippetCount = Math.max(3, Math.min(result.players.length * 2, 10));
    const medleySnippets = generateMedleySnippets(filteredSongs, snippetCount, snippetDuration);

    // Pre-restore URLs AND lyrics for all snippet songs (needed for
    // Tauri file:// paths and IndexedDB-stored lyrics)
    const preparedSnippets = await Promise.all(
      medleySnippets.map(async snippet => {
        try {
          let prepared = await ensureSongUrls(snippet.song);

          // Also load lyrics if not present (storedTxt / relativeTxtPath)
          if (!prepared.lyrics || prepared.lyrics.length === 0) {
            try {
              const { loadSongLyrics } = await import('@/lib/game/song-lyrics-loader');
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
    party.setPassTheMicSettings(toPassTheMicSettings(s, {
      segmentDuration: snippetDuration,
      sharedMicId: s.sharedMicId || null,
      sharedMicName: s.sharedMicName || null,
    }));
    // Prevent React #185
    party.setIsSongPlaying(false);
    // Initialize game store so companion gets correct currentSong + gameMode
    resetGame();
    setGameMode('pass-the-mic');
    setDifficulty(result.difficulty || 'medium');
    setSong(firstSong);
    setScreen('pass-the-mic-game');
    return;
  }

  // Default: single song (explicitly selected via library/vote, or random) with segment-based pass-the-mic
  const baseSong = result.selectedSong ?? pickRandomSong(filteredSongs);
  if (baseSong) {
    // Pre-restore URLs for the chosen song (needed for Tauri file:// paths)
    let songWithUrls = baseSong;
    try {
      songWithUrls = await ensureSongUrls(baseSong);
      // Also load lyrics so the PTM note highway and lyrics display work
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

    const playerCount = result.players.length || 2;
    // Vocal-share balanced segments: every segment contains the same amount
    // of singable material (note time) instead of equal wall-clock slices —
    // instrumental intro/bridge/outro segments previously left players
    // with almost no chance to score.
    const segments = generateBalancedPartySegments(songWithUrls, playerCount, s.segmentDuration);
    if (segments.length === 0) {
      toast({ title: t('partySetup.songTooShort'), description: t('partySetup.songTooShortRetry'), variant: 'destructive' });
      return;
    }
    const segDur = (segments[1]?.startTime ?? segments[0]?.endTime ?? 30000) - (segments[0]?.startTime ?? 0);
    const settingsWithMic = {
      ...s,
      segmentDuration: Math.round(segDur / 1000),
      sharedMicId: s.sharedMicId || null,
      sharedMicName: s.sharedMicName || null,
    };
    const ptmPlayers = toPassTheMicPlayers(result.players);
    party.setPassTheMicPlayers(ptmPlayers);
    party.setPassTheMicSegments(segments);
    party.setPassTheMicSong(songWithUrls);
    party.setPassTheMicSettings(toPassTheMicSettings(settingsWithMic));
    party.setIsSongPlaying(false);
    // Initialize game store so companion gets correct currentSong + gameMode
    resetGame();
    setGameMode('pass-the-mic');
    setDifficulty(result.difficulty || 'medium');
    setSong(songWithUrls);
    // Use dedicated PTM game screen (not main game screen)
    setScreen('pass-the-mic-game');
  }
}

// ===================== HELPERS (local to this module) =====================

function pickRandomSong(songs: Song[]): Song | null {
  if (songs.length === 0) return null;
  return songs[Math.floor(Math.random() * songs.length)];
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

function toPassTheMicPlayers(players: { id: string; name: string; avatar?: string; color: string; micId?: string; micName?: string; playerType?: string }[]) {
  return players.map(p => ({ ...p, ...EMPTY_PLAYER_SCORE, isActive: false, segmentsSung: 0 }));
}
