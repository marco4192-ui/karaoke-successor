import { Song } from '@/types/game';

// Demo songs have been removed - they were non-functional and could cause legal issues
// Please import your own licensed or royalty-free songs using the Import feature
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
