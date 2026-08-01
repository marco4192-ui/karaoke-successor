import type { StartHandlerContext } from './types';
import type { GameModeSettingsMap } from '@/components/game/unified-party-setup.types';
import { Song } from '@/types/game';

export async function startRateMySong(ctx: StartHandlerContext): Promise<void> {
  const { result, party, setScreen, resetGame, setGameMode, addPlayer, setPlayers, setSong, filteredSongs, mode } = ctx;
  const s = result.settings as GameModeSettingsMap['rate-my-song'];
  const randomSong = pickRandomSong(filteredSongs);
  if (!randomSong) return;
  const duration = s.duration || 'normal';
  const rateSettings = { playMode: result.players.length > 1 ? 'duel' as const : 'single' as const, duration: duration as 'short' | 'normal', songId: randomSong.id };
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
    setSong({ ...randomSong, start: randomSong.start, end: Math.min((randomSong.start || 0) + 60000, randomSong.end || randomSong.duration) });
  } else {
    setSong(randomSong);
  }
  setScreen('game');
}

function pickRandomSong(songs: Song[]): Song | null {
  if (songs.length === 0) return null;
  return songs[Math.floor(Math.random() * songs.length)];
}
