import type { StartHandlerContext } from './types';
import type { GameModeSettingsMap } from '@/components/game/unified-party-setup.types';
import type { CptmSettings } from '@/components/game/cptm-types';
import { Song, EMPTY_PLAYER_SCORE } from '@/types/game';
import { generateBalancedPartySegments } from '@/components/game/party-segments';
import { ensureSongUrls } from '@/lib/game/song-url-restore';

export async function startCompanionSingalong(ctx: StartHandlerContext): Promise<void> {
  const { result, party, setScreen, resetGame, addPlayer, setPlayers, setSong, filteredSongs, toast, t } = ctx;

  // Store the user's preferred song selection mode for series "next song" navigation
  party.setCptmSongSelection(result.songSelection || 'random');

  // Explicitly chosen song (library/vote) or random pick
  const baseSong = result.selectedSong ?? pickRandomSong(filteredSongs);
  if (baseSong) {
    // Pre-restore URLs for the chosen song (needed for Tauri file:// paths)
    // and load lyrics so the note highway and lyrics display work
    let songWithUrls = baseSong;
    try {
      songWithUrls = await ensureSongUrls(baseSong);
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

    const cptmPlayers = toCptmPlayers(result.players);
    party.setCptmPlayers(cptmPlayers);
    party.setCptmSong(songWithUrls);
    party.setCptmSettings(toCptmSettings(result.settings as GameModeSettingsMap['companion-singalong']));
    // Vocal-share balanced segments: every segment contains the same amount
    // of singable material (note time) instead of equal wall-clock slices —
    // instrumental intro/bridge/outro segments previously left players with
    // almost no chance to score.
    const cptmSegments = generateBalancedPartySegments(songWithUrls, cptmPlayers.length || 2);
    // R51/Bug13 — Guard wie bei PTM: generateBalancedPartySegments liefert []
    // für Songs < 60 s (MIN_SONG_MS). Ohne Guard wurde trotzdem zum Screen
    // navigiert → Render-Bedingung (segments.length > 0) false → leerer
    // schwarzer Screen. Der i18n-Key songTooShortCptm existierte bereits
    // ungenutzt in allen 16 Sprachen.
    if (cptmSegments.length === 0) {
      toast({ title: t('partySetup.songTooShortCptm'), description: t('partySetup.songTooShortRetry'), variant: 'destructive' });
      return;
    }
    party.setCptmSegments(cptmSegments);
    // R51/Bug13 — Start-Bestätigungen für die neue Runde zurücksetzen.
    party.setCptmStartConfirmed([]);
    resetGame();
    setPlayers([]);
    if (cptmPlayers.length > 0) {
      addPlayer({ id: cptmPlayers[0].id, name: cptmPlayers[0].name, color: cptmPlayers[0].color, avatar: cptmPlayers[0].avatar });
    }
    setSong(songWithUrls);
    party.setIsSongPlaying(false);
    setScreen('companion-singalong-game');
  }
}

// ===================== HELPERS (local to this module) =====================

function pickRandomSong(songs: Song[]): Song | null {
  if (songs.length === 0) return null;
  return songs[Math.floor(Math.random() * songs.length)];
}

function toCptmPlayers(players: { id: string; name: string; avatar?: string; color: string; micId?: string; micName?: string; playerType?: string }[]) {
  return players.map(p => ({ ...p, ...EMPTY_PLAYER_SCORE, segmentsSung: 0 }));
}

function toCptmSettings(s: { difficulty?: import('@/types/game').Difficulty; blinkWarning?: number }): CptmSettings {
  return {
    difficulty: s.difficulty ?? 'medium',
    blinkWarning: s.blinkWarning ?? 3,
  };
}
