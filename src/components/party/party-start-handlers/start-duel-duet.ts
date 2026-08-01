import type { StartHandlerContext } from './types';
import { Song } from '@/types/game';

export async function startDuelDuet(ctx: StartHandlerContext): Promise<void> {
  const { result, party, setScreen, resetGame, addPlayer, setPlayers, setSong, setGameMode, mode, filteredSongs } = ctx;
  const randomSong = pickRandomSong(filteredSongs);
  if (!randomSong) return;
  resetGame();
  setPlayers([]);
  setGameMode(mode);
  setSong(randomSong);
  result.players.forEach((p) => {
    addPlayer({ id: p.id, name: p.name, color: p.color, avatar: p.avatar });
  });
  party.setUnifiedSetupResult(result);
  setScreen('game');
}

function pickRandomSong(songs: Song[]): Song | null {
  if (songs.length === 0) return null;
  return songs[Math.floor(Math.random() * songs.length)];
}
