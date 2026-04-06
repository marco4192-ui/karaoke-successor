import { ScannedSong } from '@/lib/parsers/folder-scanner';
import { Song } from '@/types/game';

export interface DuplicateInfo {
  index: number;
  song: ScannedSong;
  existingSong: Song;
  matchType: 'exact' | 'similar' | 'none';
}

export interface ImportScreenProps {
  onImport: (song: Song) => void;
  onCancel: () => void;
}

export interface ProgressInfo {
  stage: string;
  progress: number;
  message: string;
}

export function findDuplicates(scannedSongs: ScannedSong[], existingSongs: Song[]): DuplicateInfo[] {
  return scannedSongs.map((song, index) => {
    const exactMatch = existingSongs.find(existing =>
      existing.title.toLowerCase() === song.title.toLowerCase() &&
      existing.artist.toLowerCase() === song.artist.toLowerCase()
    );

    if (exactMatch) {
      return { index, song, existingSong: exactMatch, matchType: 'exact' };
    }

    const similarMatch = existingSongs.find(existing =>
      existing.title.toLowerCase() === song.title.toLowerCase() ||
      existing.artist.toLowerCase() === song.artist.toLowerCase()
    );

    if (similarMatch) {
      return { index, song, existingSong: similarMatch, matchType: 'similar' };
    }

    return { index, song, existingSong: null as unknown as Song, matchType: 'none' };
  });
}
