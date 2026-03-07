import { Song } from '@/types/game';

// Empty sample songs - all songs are user-imported
export const sampleSongs: Song[] = [];

export function getSongById(id: string): Song | undefined {
  return sampleSongs.find(song => song.id === id);
}

export function getSongsByDifficulty(difficulty: Song['difficulty']): Song[] {
  return sampleSongs.filter(song => song.difficulty === difficulty);
}

export function searchSongs(query: string): Song[] {
  const lowerQuery = query.toLowerCase();
  return sampleSongs.filter(
    song =>
      song.title.toLowerCase().includes(lowerQuery) ||
      song.artist.toLowerCase().includes(lowerQuery) ||
      song.genre?.toLowerCase().includes(lowerQuery)
  );
}
