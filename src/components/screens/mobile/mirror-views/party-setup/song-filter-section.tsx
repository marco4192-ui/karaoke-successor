'use client';

// ===================== Party-Setup-Mirror — Song-Filter / Motto-Party =====================
//
// MOTTO-PARTY-Banner (R24/R25) bzw. Song-Filter-Block (Suche + Genre/Sprache/
// Jahr/Ära + Filter-Logik) des Party-Setup-Mirrors (R6-Auslagerung aus
// mirror-party-setup-lite.tsx — JSX unverändert; Filter-States und Setter
// kommen unter denselben Namen als Props herein).

import type { Dispatch, SetStateAction } from 'react';
import { useTranslation } from '@/lib/i18n/translations';
import { decadeShortLabel } from '@/lib/game/era-filter';
import { Search, X } from 'lucide-react';
import { haptic, tOr } from './utils';
import { SectionHeader } from './ui-controls';
import type { PartySetupState } from './types';

export interface SongFilterSectionProps {
  setup: PartySetupState | null | undefined;
  filterSearch: string;
  filterGenre: string;
  filterLanguage: string;
  filterReleaseYear: string;
  filterEra: string;
  filterCombined: boolean;
  setFilterSearch: Dispatch<SetStateAction<string>>;
  setFilterGenre: Dispatch<SetStateAction<string>>;
  setFilterLanguage: Dispatch<SetStateAction<string>>;
  setFilterReleaseYear: Dispatch<SetStateAction<string>>;
  setFilterEra: Dispatch<SetStateAction<string>>;
  setFilterCombined: Dispatch<SetStateAction<boolean>>;
}

export function SongFilterSection({
  setup,
  filterSearch,
  filterGenre,
  filterLanguage,
  filterReleaseYear,
  filterEra,
  filterCombined,
  setFilterSearch,
  setFilterGenre,
  setFilterLanguage,
  setFilterReleaseYear,
  setFilterEra,
  setFilterCombined,
}: SongFilterSectionProps) {
  const { t } = useTranslation();
  // -------- MOTTO-PARTY (R24): while active, ALL search fields and filters
  // are hidden and replaced by the motto banner (like the desktop) --------
  return setup?.mottoParty?.enabled ? (
      <div>
        <SectionHeader>
          {tOr(t, 'unifiedSetup.songFilter', 'Song-Filter')}
        </SectionHeader>
        <div
          className="rounded-2xl border border-purple-400/30 bg-gradient-to-r from-purple-500/15 via-pink-500/10 to-amber-500/15 px-3.5 py-3 flex items-center gap-3"
          data-testid="mirror-motto-banner"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xl shrink-0" aria-hidden="true">🎉</div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-purple-300 font-semibold uppercase tracking-wider">
              {tOr(t, 'unifiedSetup.mottoPartyLabel', 'Motto-Party')}
            </p>
            <h4 className="text-white font-bold text-base truncate">
              {setup.mottoParty.name?.trim() || tOr(t, 'unifiedSetup.mottoPartyLabel', 'Motto-Party')}
            </h4>
            <p className="text-white/40 text-[11px] leading-snug">
              {tOr(t, 'unifiedSetup.mottoPartyHint', 'Alle Suchfelder und Filter sind durch das Motto ersetzt — änderbar unter Settings → Motto-Party.')}
            </p>
          </div>
        </div>
      </div>
    ) : (
    <div>
      <SectionHeader>
        {tOr(t, 'unifiedSetup.songFilter', 'Song-Filter')}
      </SectionHeader>
      <div className="flex flex-col gap-2.5">
        {/* Free-text search (artist/title, fuzzy) — first control, like the desktop */}
        <div>
          <label htmlFor="mirror-party-filter-search" className="text-[11px] text-white/40 mb-1 block px-1">
            {tOr(t, 'unifiedSetup.searchFilter', '🔍 Suche')}
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" aria-hidden="true" />
            <input
              id="mirror-party-filter-search"
              type="text"
              value={filterSearch}
              onChange={(e) => { haptic(); setFilterSearch(e.target.value); }}
              placeholder={tOr(t, 'unifiedSetup.searchFilterPlaceholder', 'Interpret oder Titel…')}
              autoComplete="off"
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-9 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-cyan-400/40"
            />
            {filterSearch !== '' && (
              <button
                type="button"
                onClick={() => { haptic(); setFilterSearch(''); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-white/10 active:scale-95 text-white/50 transition-all"
                aria-label={tOr(t, 'unifiedSetup.resetFilter', 'Filter zurücksetzen')}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
        <div>
          <label className="text-[11px] text-white/40 mb-1 block px-1">
            {tOr(t, 'unifiedSetup.genre', 'Genre')}
          </label>
          <select
            value={filterGenre}
            onChange={(e) => { haptic(); setFilterGenre(e.target.value); }}
            className="w-full appearance-none bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white"
          >
            <option value="all">{tOr(t, 'unifiedSetup.allGenres', 'Alle Genres')}</option>
            {(setup?.availableGenres ?? []).map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[11px] text-white/40 mb-1 block px-1">
            {tOr(t, 'unifiedSetup.language', 'Sprache')}
          </label>
          <select
            value={filterLanguage}
            onChange={(e) => { haptic(); setFilterLanguage(e.target.value); }}
            className="w-full appearance-none bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white"
          >
            <option value="all">{tOr(t, 'unifiedSetup.allLanguages', 'Alle Sprachen')}</option>
            {(setup?.availableLanguages ?? []).map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[11px] text-white/40 mb-1 block px-1">
            {tOr(t, 'unifiedSetup.releaseYear', 'Erscheinungsjahr')}
          </label>
          <select
            value={filterReleaseYear}
            onChange={(e) => { haptic(); setFilterReleaseYear(e.target.value); }}
            className="w-full appearance-none bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white"
          >
            <option value="all">{tOr(t, 'unifiedSetup.allYears', 'Alle Jahre')}</option>
            {(setup?.availableYears ?? []).map((y) => (
              <option key={y} value={String(y)}>{y}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[11px] text-white/40 mb-1 block px-1">
            {tOr(t, 'unifiedSetup.releaseEra', 'Ära')}
          </label>
          <select
            value={filterEra}
            onChange={(e) => { haptic(); setFilterEra(e.target.value); }}
            className="w-full appearance-none bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white"
          >
            <option value="all">{tOr(t, 'unifiedSetup.allEras', 'Alle')}</option>
            {(setup?.availableDecades ?? []).map((d) => (
              <option key={d} value={d}>
                {tOr(t, 'library.eraOption', '{decade}s').replace('{decade}', decadeShortLabel(Number(d)))}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-3 py-2.5">
          <span className="text-xs text-white/60">{tOr(t, 'unifiedSetup.filterLogic', 'Filter-Logik')}</span>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => { haptic(); setFilterCombined(true); }}
              className={'rounded-lg px-2.5 py-1.5 text-[11px] font-semibold border active:scale-95 transition-all ' +
                (filterCombined ? 'bg-cyan-500/25 border-cyan-400/40 text-cyan-400' : 'bg-white/5 border-white/10 text-white/50')}
            >
              {tOr(t, 'unifiedSetup.combined', 'Kombiniert')}
            </button>
            <button
              type="button"
              onClick={() => { haptic(); setFilterCombined(false); }}
              className={'rounded-lg px-2.5 py-1.5 text-[11px] font-semibold border active:scale-95 transition-all ' +
                (!filterCombined ? 'bg-cyan-500/25 border-cyan-400/40 text-cyan-400' : 'bg-white/5 border-white/10 text-white/50')}
            >
              {tOr(t, 'unifiedSetup.independent', 'Unabhängig')}
            </button>
          </div>
        </div>
      </div>
    </div>
    );
}
