import { Song } from '@/types/game';

export interface DuplicateInfo {
  index: number;
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

/**
 * Check scanned items against existing library for exact/similar duplicates.
 */
export function findDuplicates(
  items: { title: string; artist: string }[],
  existingSongs: Song[]
): DuplicateInfo[] {
  return items.map((item, index) => {
    const exactMatch = existingSongs.find(
      (s) =>
        s.title.toLowerCase() === item.title.toLowerCase() &&
        s.artist.toLowerCase() === item.artist.toLowerCase()
    );
    if (exactMatch) return { index, matchType: 'exact' };

    const similarMatch = existingSongs.find(
      (s) =>
        s.title.toLowerCase() === item.title.toLowerCase() ||
        s.artist.toLowerCase() === item.artist.toLowerCase()
    );
    if (similarMatch) return { index, matchType: 'similar' };

    return { index, matchType: 'none' };
  });
}
