// Mood-based song categorization utility
// Maps genres to mood categories for filtering

import type { MobileSong } from '@/components/screens/mobile/mobile-types';

// Mood categories reference the canonical MAIN genres only (@/lib/constants GENRES):
// 'Jazz' is subsumed by 'R&B', 'Hip-Hop' by 'Rap', Dance/EDM/Reggaeton by
// 'Electronic'/'Latin' — legacy genre strings are normalized on import.
export const MOOD_CATEGORIES = [
  { id: 'party', label: 'Party', icon: '🎉', genres: ['Pop', 'Electronic', 'Rap', 'Latin'] },
  { id: 'chill', label: 'Chill', icon: '😌', genres: ['R&B', 'Soul', 'Folk', 'Blues'] },
  { id: 'power', label: 'Power', icon: '⚡', genres: ['Rock', 'Metal', 'Punk'] },
  { id: 'romantic', label: 'Romantic', icon: '💕', genres: ['R&B', 'Soul', 'Musical'] },
  { id: 'classic', label: 'Classic', icon: '🎵', genres: ['Classical', 'Schlager', 'Volksmusik'] },
  { id: 'fun', label: 'Fun', icon: '🤪', genres: ['Musical', 'Disney', "Children's"] },
] as const;

export type MoodId = (typeof MOOD_CATEGORIES)[number]['id'];

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
