'use client';

// ===================== Library-Lite-Mirror — Filter-Leiste =====================
//
// Suchfeld, Genre-/Sprach-/Aera-Filter (Dropdowns) und Viral-Hits-Button
// (R27a-Auslagerung aus mirror-library-lite.tsx — JSX, searchRef und
// handleClearSearch byte-identisch übernommen).

import { useCallback, useRef } from 'react';
import { useTranslation } from '@/lib/i18n/translations';
import { decadeShortLabel } from '@/lib/game/era-filter';
import { dropdownStyle, haptic } from './helpers';
import type { GameState } from '../../mobile-types';

export interface FilterBarProps {
  songSearch: string;
  onSongSearchChange: (v: string) => void;
  genres: string[];
  languages: string[];
  decades: string[];
  genreFilter: string;
  setGenreFilter: (v: string) => void;
  languageFilter: string;
  setLanguageFilter: (v: string) => void;
  eraFilter: string;
  setEraFilter: (v: string) => void;
  filterViral: boolean;
  setFilterViral: (v: boolean) => void;
  gameState: GameState;
}

export function FilterBar({
  songSearch,
  onSongSearchChange,
  genres,
  languages,
  decades,
  genreFilter,
  setGenreFilter,
  languageFilter,
  setLanguageFilter,
  eraFilter,
  setEraFilter,
  filterViral,
  setFilterViral,
  gameState,
}: FilterBarProps) {
  const { t } = useTranslation();
  const searchRef = useRef<HTMLInputElement>(null);
  const handleClearSearch = useCallback(() => {
    onSongSearchChange('');
    searchRef.current?.focus();
  }, [onSongSearchChange]);
  return (
    <>
      {/* Suchfeld */}
      <div className="relative">
        <input
          ref={searchRef}
          type="text"
          value={songSearch}
          onChange={(e) => onSongSearchChange(e.target.value)}
          placeholder={t('mobile.mirrorSearchSongs') || 'Suche...'}
          className={'w-full rounded-xl px-4 py-2.5 pl-9 text-sm text-white placeholder-white/30 ' +
            'bg-white/5 border border-white/10 outline-none focus:border-cyan-400/50 focus:bg-white/8 transition-colors'}
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">{'\u{1F50D}'}</span>
        {songSearch && (
          <button
            onClick={handleClearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-sm active:text-white/60"
          >{'\u2715'}</button>
        )}
      </div>

      {/* Genre-Filter als Dropdown */}
      {genres.length > 0 && (
        <select
          value={genreFilter}
          onChange={(e) => { haptic(); setGenreFilter(e.target.value); }}
          className="w-full appearance-none bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white active:scale-[0.99] transition-transform cursor-pointer"
          style={dropdownStyle}
        >
          <option value="all" className="bg-[#1a1a2e] text-white">Alle Genres</option>
          {genres.map((g) => (
            <option key={g} value={g} className="bg-[#1a1a2e] text-white">{g}</option>
          ))}
        </select>
      )}

      {/* Sprach-Filter als Dropdown */}
      {languages.length > 1 && (
        <select
          value={languageFilter}
          onChange={(e) => { haptic(); setLanguageFilter(e.target.value); }}
          className="w-full appearance-none bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white active:scale-[0.99] transition-transform cursor-pointer"
          style={dropdownStyle}
        >
          <option value="all" className="bg-[#1a1a2e] text-white">Alle Sprachen</option>
          {languages.map((l) => (
            <option key={l} value={l} className="bg-[#1a1a2e] text-white">{l}</option>
          ))}
        </select>
      )}

      {/* Aera-Filter (Jahrzehnt) als Dropdown — fuer Motto-Partys */}
      {decades.length > 0 && (
        <select
          value={eraFilter}
          onChange={(e) => { haptic(); setEraFilter(e.target.value); }}
          className="w-full appearance-none bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white active:scale-[0.99] transition-transform cursor-pointer"
          style={dropdownStyle}
          aria-label={t('library.eraFilter')}
        >
          <option value="all" className="bg-[#1a1a2e] text-white">{t('library.allEras')}</option>
          {decades.map((d) => (
            <option key={d} value={d} className="bg-[#1a1a2e] text-white">
              {t('library.eraOption').replace('{decade}', decadeShortLabel(Number(d)))}
            </option>
          ))}
        </select>
      )}

      {/* Viral-Hits Filter-Button (1:1 wie Desktop Library) */}
      {(gameState.viralSongIds?.length ?? 0) > 0 && (
        <button
          onClick={() => { haptic(); setFilterViral(!filterViral); }}
          className={
            'w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-[0.98] ' +
            (filterViral
              ? 'bg-orange-500/30 text-orange-300 border border-orange-500/50'
              : 'bg-white/5 text-white/60 border border-white/10')
          }
        >
          <span>{'\uD83D\uDD25'}</span>
          <span>{t('libraryFilters.viralHits') || 'Viral Hits'}</span>
          {filterViral && <span className="text-xs text-orange-400/60">({gameState.viralSongIds?.length})</span>}
        </button>
      )}
    </>
  );
}
