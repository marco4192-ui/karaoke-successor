// Mood-based song categorization utility
// Maps genres to mood categories for filtering

import type { MobileSong } from '@/components/screens/mobile/mobile-types';

export const MOOD_CATEGORIES = [
  { id: 'party', label: 'Party', icon: '🎉', genres: ['Pop', 'Dance', 'EDM', 'Hip Hop', 'Rap', 'Reggaeton', 'Latin'] },
  { id: 'chill', label: 'Chill', icon: '😌', genres: ['Jazz', 'R&B', 'Soul', 'Lo-Fi', 'Indie', 'Folk', 'Acoustic'] },
  { id: 'power', label: 'Power', icon: '⚡', genres: ['Rock', 'Metal', 'Punk', 'Hard Rock', 'Alternative'] },
  { id: 'romantic', label: 'Romantic', icon: '💕', genres: ['Ballad', 'Love', 'Romantic', 'R&B', 'Soul'] },
  { id: 'classic', label: 'Classic', icon: '🎵', genres: ['Classic Rock', 'Oldies', '80s', '90s', 'Schlager', 'Volksmusik'] },
  { id: 'fun', label: 'Fun', icon: '🤪', genres: ['Musical', 'Disney', 'Anime', 'Children', 'Novelty', 'Comedy'] },
] as const;

export type MoodId = (typeof MOOD_CATEGORIES)[number]['id'];

/**
 * Find the first matching mood for a given genre string.
 * Returns null if no mood matches.
 */
export function getMoodForGenre(genre: string): MoodId | null {
  if (!genre) return null;
  const normalizedGenre = genre.toLowerCase().trim();

  for (const category of MOOD_CATEGORIES) {
    for (const categoryGenre of category.genres) {
      if (normalizedGenre === categoryGenre.toLowerCase()) {
        return category.id;
      }
    }
  }

  return null;
}

/**
 * Filter songs by mood based on their genre.
 * If mood is null, returns all songs unchanged.
 */
export function filterSongsByMood(songs: MobileSong[], mood: MoodId | null): MobileSong[] {
  if (!mood) return songs;

  const category = MOOD_CATEGORIES.find(c => c.id === mood);
  if (!category) return songs;

  return songs.filter(song => {
    if (!song.genre) return false;
    const normalizedSongGenre = song.genre.toLowerCase().trim();
    return category.genres.some(g => g.toLowerCase() === normalizedSongGenre);
  });
}
