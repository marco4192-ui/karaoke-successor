import type { StartHandlerContext } from './types';
import type { GameModeSettingsMap } from '@/components/game/unified-party-setup.types';
import { Song } from '@/types/game';

export async function startRateMySong(ctx: StartHandlerContext): Promise<void> {
  const { result, party, setScreen, resetGame, setGameMode, addPlayer, setPlayers, setSong, filteredSongs, mode } = ctx;
  const s = result.settings as GameModeSettingsMap['rate-my-song'];
  // Explicitly chosen song (library/vote) or random pick
  const chosenSong = result.selectedSong ?? pickRandomSong(filteredSongs);
  if (!chosenSong) return;
  const duration = s.duration || 'normal';
  const rateSettings = { playMode: result.players.length > 1 ? 'duel' as const : 'single' as const, duration: duration as 'short' | 'normal', songId: chosenSong.id };
  const playerIds = result.players.map(p => p.id);
  party.setRateMySongSettings(rateSettings);
  party.setRateMySongPlayerIds(playerIds);
  party.setUnifiedSetupResult(result);
  // Set up the game
  resetGame();
  setGameMode(mode);
  setPlayers([]);
  result.players.forEach((_p, _i) => {
    addPlayer({ id: _p.id, name: _p.name, color: _p.color, avatar: _p.avatar });
  });
  if (duration === 'short') {
    setSong({ ...chosenSong, start: chosenSong.start, end: Math.min((chosenSong.start || 0) + 60000, chosenSong.end || chosenSong.duration) });
  } else {
    setSong(chosenSong);
  }
  // Route through the mode starting screen first ("Ready to Play" is already
  // done; the starting screen lets singers get into position). Confirming
  // the starting screen switches to the actual game screen.
  setScreen('rate-my-song-game');
}

function pickRandomSong(songs: Song[]): Song | null {
  if (songs.length === 0) return null;
  return songs[Math.floor(Math.random() * songs.length)];
}
