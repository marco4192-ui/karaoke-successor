// PTM Next Song helper — handles picking the next song after a round ends
// Supports: random, vote, medley, library selection modes
// Uses song filters from unifiedSetupResult if available

import { Song } from '@/types/game';
import { getAllSongs, filterSongs, ensureSongUrls } from '@/lib/game/song-library';
import { PassTheMicSegment } from '@/components/game/pass-the-mic-screen';
import { generatePtmSegments } from '@/lib/game/ptm-segments';

// ===================== MEDLEY SNIPPET GENERATION =====================
function generateMedleySnippets(songs: Song[], snippetCount: number, snippetDuration: number) {
  const snippetDurationMs = snippetDuration * 1000;
  const MIN_MELODY_SONG_MS = 60 * 1000;
  const eligibleSongs = songs.filter(s => s.duration >= MIN_MELODY_SONG_MS);
  // Fisher-Yates shuffle for fair randomization
  const shuffled = [...eligibleSongs];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const beatDurationMs = (bpm: number) => 15000 / bpm;

  return shuffled.slice(0, snippetCount).map(song => {
    if (song.medleyStartBeat !== undefined && song.medleyEndBeat !== undefined && song.bpm > 0) {
      const bd = beatDurationMs(song.bpm);
      const startTime = song.medleyStartBeat * bd;
      const endTime = song.medleyEndBeat * bd;
      return { song, startTime, endTime, duration: endTime - startTime };
    }
    if (song.medleyStartBeat !== undefined && song.bpm > 0) {
      const startTime = song.medleyStartBeat * beatDurationMs(song.bpm);
      return { song, startTime, endTime: startTime + snippetDurationMs, duration: snippetDurationMs };
    }
    const maxSafeTime = song.lyrics && song.lyrics.length > 0
      ? Math.max(...song.lyrics.map(l => l.endTime))
      : Math.min(song.duration, snippetDurationMs * 3);
    const maxStartTime = Math.max(0, maxSafeTime - snippetDurationMs);
    const startTime = Math.random() * maxStartTime;
    return { song, startTime, endTime: startTime + snippetDurationMs, duration: snippetDurationMs };
  });
}

// ===================== FILTERED SONGS =====================
function getFilteredSongs(): Song[] {
  const allSongs = getAllSongs();
  // Read filter settings from localStorage (same way unified-party-setup stores them)
  try {
    const raw = localStorage.getItem('ptm-song-filters');
    if (raw) {
      const filters = JSON.parse(raw);
      return filterSongs(allSongs, filters.filterGenre, filters.filterLanguage, filters.filterCombined);
    }
  } catch { /* ignore */ }
  return allSongs;
}

// ===================== RANDOM SONG =====================
export interface PtmNextSongResult {
  type: 'random';
  song: Song;
  segments: PassTheMicSegment[];
  segmentDuration: number;
  medleySnippets: never[];
}

// ===================== MEDLEY =====================
export interface PtmNextMedleyResult {
  type: 'medley';
  song: Song; // first snippet song
  segments: PassTheMicSegment[];
  medleySnippets: Array<{ song: Song; startTime: number; endTime: number; duration: number }>;
  segmentDuration: number;
}

// ===================== PREPARE NEXT SONG (async) =====================
export type PtmNextSongAction =
  | { mode: 'random'; result: PtmNextSongResult }
  | { mode: 'medley'; result: PtmNextMedleyResult }
  | { mode: 'vote' }
  | { mode: 'library' };

/**
 * Prepares the next PTM song based on the selection mode.
 * Returns the action that the caller (party-game-screens) should execute.
 */
export async function preparePtmNextSong(
  songSelection: string,
  playerCount: number,
  explicitSegmentDuration?: number,
  _retryCount: number = 0,
): Promise<PtmNextSongAction> {
  const MAX_RETRIES = 20;

  const filteredSongs = getFilteredSongs();

  switch (songSelection) {
    case 'random': {
      if (filteredSongs.length === 0) {
        return { mode: 'library' };
      }
      const randomSong = filteredSongs[Math.floor(Math.random() * filteredSongs.length)];
      let songWithUrls = randomSong;
      try {
        songWithUrls = await ensureSongUrls(randomSong);
      } catch { /* non-critical */ }

      const segments = generatePtmSegments(songWithUrls.duration, playerCount, explicitSegmentDuration);
      if (segments.length === 0) {
        // Song too short — retry with another random song (up to MAX_RETRIES)
        if (_retryCount < MAX_RETRIES) {
          return preparePtmNextSong(songSelection, playerCount, explicitSegmentDuration, _retryCount + 1);
        }
        // All retries exhausted — fall back to library selection
        return { mode: 'library' };
      }
      const segDur = (segments[1]?.startTime ?? segments[0]?.endTime ?? 30000) - (segments[0]?.startTime ?? 0);

      return {
        mode: 'random',
        result: {
          type: 'random',
          song: songWithUrls,
          segments,
          segmentDuration: Math.round(segDur / 1000),
          medleySnippets: [],
        },
      };
    }

    case 'medley': {
      const snippetDuration = 30;
      const snippetCount = Math.max(3, Math.min(playerCount * 2, 10));
      const rawSnippets = generateMedleySnippets(filteredSongs, snippetCount, snippetDuration);

      if (rawSnippets.length === 0) {
        return { mode: 'library' };
      }

      // Pre-restore URLs and lyrics for all snippet songs
      const preparedSnippets = await Promise.all(
        rawSnippets.map(async snippet => {
          try {
            let prepared = await ensureSongUrls(snippet.song);
            if (!prepared.lyrics || prepared.lyrics.length === 0) {
              try {
                const { loadSongLyrics } = await import('@/lib/game/song-lyrics-loader');
                const lyrics = await loadSongLyrics(prepared);
                if (lyrics.length > 0) {
                  prepared = { ...prepared, lyrics };
                }
              } catch { /* non-critical */ }
            }
            return { ...snippet, song: prepared };
          } catch {
            return snippet;
          }
        }),
      );

      const firstSnippet = preparedSnippets[0];
      const firstSong: Song = {
        ...firstSnippet.song,
        start: firstSnippet.startTime,
        end: firstSnippet.endTime,
      };
      const segments: PassTheMicSegment[] = preparedSnippets.map(snippet => ({
        startTime: snippet.startTime,
        endTime: snippet.endTime,
        playerId: null,
      }));

      return {
        mode: 'medley',
        result: {
          type: 'medley',
          song: firstSong,
          segments,
          medleySnippets: preparedSnippets,
          segmentDuration: snippetDuration,
        },
      };
    }

    case 'vote':
      return { mode: 'vote' };

    case 'library':
    default:
      return { mode: 'library' };
  }
}

// Store/retrieve song filters for next-round song selection
export function storeSongFilters(filters: { filterGenre?: string; filterLanguage?: string; filterCombined?: string }) {
  try {
    localStorage.setItem('ptm-song-filters', JSON.stringify(filters));
  } catch { /* ignore */ }
}

export { getFilteredSongs };
