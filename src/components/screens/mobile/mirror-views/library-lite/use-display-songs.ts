'use client';

// ===================== Library-Lite-Mirror — Display-Songs-Hook =====================
//
// Motto-Party-Pool (R25) bzw. lokal gefilterte + sortierte Songliste plus
// verfuegbare Genres/Sprachen/Aeras (R27a-Auslagerung aus
// mirror-library-lite.tsx — Memo-Bodies und Dep-Arrays byte-identisch).

import { useMemo } from 'react';
import { filterSongsByMotto } from '@/lib/game/motto-party';
import { getAvailableDecades, songMatchesEra } from '@/lib/game/era-filter';
import { isLikelyDuet } from './helpers';
import type { MobileSong, GameState } from '../../mobile-types';

export interface UseDisplaySongsParams {
  songs: MobileSong[];
  filteredSongs: MobileSong[];
  isDuetMode: boolean;
  genreFilter: string;
  languageFilter: string;
  eraFilter: string;
  filterViral: boolean;
  gameState: GameState;
}

export function useDisplaySongs({
  songs,
  filteredSongs,
  isDuetMode,
  genreFilter,
  languageFilter,
  eraFilter,
  filterViral,
  gameState,
}: UseDisplaySongsParams) {
  const displaySongs = useMemo(() => {
      // ── Motto-Party (R25): the motto config synced from the desktop is the
      // single source of truth — search field and the local genre/language/
      // era/viral filters are hidden (replaced by the motto banner), so their
      // values cannot carry user intent. The motto pool is computed from ALL
      // songs with the EXACT same matching logic as the desktop library
      // (filterSongsByMotto is generic — runs on MobileSong[] too). The
      // duet-mode constraint stays functional (game requirement). ──
      const motto = gameState.mottoParty;
      if (motto?.enabled) {
        let mottoSongs = filterSongsByMotto(songs, motto);
        if (isDuetMode) {
          mottoSongs = mottoSongs.filter(isLikelyDuet);
        }
        return [...mottoSongs].sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
      }

      let result = filteredSongs;
      if (genreFilter !== 'all') {
        result = result.filter((s) => s.genre === genreFilter);
      }
      if (languageFilter !== 'all') {
        result = result.filter((s) => s.language === languageFilter);
      }
      // Era filter (decade bucket from the synced #YEAR: tag)
      if (eraFilter !== 'all') {
        result = result.filter((s) => songMatchesEra(s, eraFilter));
      }
      if (isDuetMode) {
        result = result.filter(isLikelyDuet);
      }
      // Viral-Hits filter (IDs synced from desktop)
      if (filterViral) {
        const viralIds = gameState.viralSongIds;
        if (viralIds && viralIds.length > 0) {
          const viralSet = new Set(viralIds);
          result = result.filter(s => viralSet.has(s.id));
        } else {
          result = [];
        }
      }
      // Nach Songtitel alphabetisch sortieren
      return [...result].sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
    }, [filteredSongs, genreFilter, languageFilter, eraFilter, isDuetMode, filterViral, gameState.viralSongIds, gameState.mottoParty, songs]);

  // Extrahiere verfuegbare Genres, Sprachen und Aeras (Jahrzehnte)
  const { genres, languages, decades } = useMemo(() => {
      const gSet = new Set<string>();
      const lSet = new Set<string>();
      songs.forEach((s) => {
        if (s.genre) gSet.add(s.genre);
        if (s.language) lSet.add(s.language);
      });
      return {
        genres: Array.from(gSet).sort(),
        languages: Array.from(lSet).sort(),
        decades: getAvailableDecades(songs),
      };
    }, [songs]);

  return { displaySongs, genres, languages, decades };
}
