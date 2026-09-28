'use client';

/**
 * Motto-Party tab (Settings → „Motto-Party") — user request R24.
 *
 * Configures the themed-party mode for the WHOLE game:
 *  - ACTIVATE:  master switch — while on, every search field and filter in
 *               the party setup (desktop + companion mirror) is hidden and
 *               replaced by a single „Motto-Party: <name>" banner; every
 *               song pool in the game (random, vote, medley, BR, tournament,
 *               PTM) only draws from the motto-matching songs
 *  - NAME:      individual motto name (e.g. „80er Jahre Party")
 *  - SEARCH:    multiple search fields (artist/title, fuzzy) combined with
 *               cumulative (AND) or independent (OR) logic
 *  - FILTERS:   genre / language / release year / era — AND-combined on top
 *  - PREVIEW:   live song-count + match list using the exact game logic
 *               (filterSongsByMotto), plus a preview of the setup banner
 *
 * Everything is reactive via useMottoParty(): edits persist immediately and
 * every consumer (party setup, companion mirror, all filterSongs callers)
 * picks them up instantly.
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { SettingsTabIntro } from '@/components/settings/settings-tab-intro';
import { useTranslation } from '@/lib/i18n/translations';
import { useToast } from '@/hooks/use-toast';
import { useMottoParty } from '@/hooks/use-motto-party';
import {
  mottoParty,
  MOTTO_MAX_NAME_LENGTH,
  MOTTO_MAX_TERM_LENGTH,
  MOTTO_MAX_SEARCH_FIELDS,
  type MottoPartyFilters,
} from '@/lib/game/motto-party';
import { getAllSongsAsync, filterSongsByMotto } from '@/lib/game/song-library';
import { getLanguageFilterEntries, LANGUAGE_FILTER_OTHERS } from '@/lib/game/language-filter';
import { getAvailableDecades, decadeShortLabel } from '@/lib/game/era-filter';
import { splitGenres, normalizeGenreName } from '@/lib/parsers/meta-normalizer';
import { Song } from '@/types/game';
import { Search, X, Plus, Trash2 } from 'lucide-react';
import { LANGUAGE_NAMES } from '@/lib/i18n/translations';
import type { Language } from '@/lib/i18n/translations';

/** Select styling shared by all four filter dropdowns. */
const SELECT_CLASS =
  'w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-400/50';

export function MottoPartyTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const motto = useMottoParty();

  // Library for the live preview + filter dropdown options
  const [songs, setSongs] = useState<Song[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    getAllSongsAsync().then(all => {
      if (!cancelled) setSongs(all);
    }).catch(() => {
      if (!cancelled) setSongs([]);
    });
    return () => { cancelled = true; };
  }, []);

  // ── Filter dropdown options (same derivation as the party setup) ──
  const { availableGenres, availableLanguages, availableYears, availableDecades } = useMemo(() => {
    const list = songs ?? [];
    const genres = new Set<string>();
    for (const s of list) {
      if (s.genre) for (const g of splitGenres(s.genre)) genres.add(normalizeGenreName(g));
    }
    const years = Array.from(new Set(list.map(s => s.year).filter((y): y is number => typeof y === 'number' && y > 0))).sort((a, b) => b - a);
    return {
      availableGenres: Array.from(genres).sort(),
      availableLanguages: getLanguageFilterEntries(list, false),
      availableYears: years,
      availableDecades: getAvailableDecades(list),
    };
  }, [songs]);

  // ── Live preview: exact same logic as the game (filterSongsByMotto) ──
  const matchingSongs = useMemo(() => filterSongsByMotto(songs ?? [], motto), [songs, motto]);
  const hasCriteria = motto.searchFields.some(f => f.term.trim()) ||
    motto.filters.genre !== 'all' || motto.filters.language !== 'all' ||
    motto.filters.releaseYear !== 'all' || motto.filters.era !== 'all';

  // ── Local editing state ──
  const [newTerm, setNewTerm] = useState('');
  const [termError, setTermError] = useState<string | null>(null);

  const handleToggleEnabled = useCallback(() => {
    const next = !motto.enabled;
    mottoParty.setEnabled(next);
    toast({
      description: next
        ? t('settingsMotto.enabledToast').replace('{name}', motto.name.trim() || t('settingsMotto.title'))
        : t('settingsMotto.disabledToast'),
    });
  }, [motto.enabled, motto.name, t, toast]);

  const handleAddTerm = useCallback(() => {
    setTermError(null);
    const result = mottoParty.addSearchField(newTerm);
    if (result.ok) {
      toast({ description: t('settingsMotto.addedToast').replace('{term}', newTerm.trim()) });
      setNewTerm('');
      return;
    }
    if (result.error === 'duplicate') setTermError(t('settingsMotto.errorDuplicate'));
    else if (result.error === 'too-long') setTermError(t('settingsMotto.errorTooLong').replace('{n}', String(MOTTO_MAX_TERM_LENGTH)));
    else if (result.error === 'limit-reached') setTermError(t('settingsMotto.errorLimit').replace('{n}', String(MOTTO_MAX_SEARCH_FIELDS)));
    else setTermError(t('settingsMotto.errorEmpty'));
  }, [newTerm, t, toast]);

  const handleSetFilter = useCallback((key: keyof MottoPartyFilters, value: string) => {
    mottoParty.setFilter(key, value);
  }, []);

  const anyFilterActive = motto.filters.genre !== 'all' || motto.filters.language !== 'all' ||
    motto.filters.releaseYear !== 'all' || motto.filters.era !== 'all';

  return (
    <div className="space-y-6">
      {/* ── Header (R26: einheitliche Intro-Karte mit settings-intro-Anker) ── */}
      <SettingsTabIntro tab="motto" />

      {/* ── Activation ── */}
      <Card
        className={`transition-colors ${motto.enabled ? 'border-purple-400/40 bg-gradient-to-r from-purple-500/10 via-pink-500/5 to-amber-500/10' : 'bg-white/5 border-white/10'}`}
        data-testid="motto-activation-card"
      >
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div
              className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-3xl shrink-0 shadow-lg shadow-purple-500/30"
              aria-hidden="true"
            >
              🎉
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-white text-lg">{t('settingsMotto.activationTitle')}</h3>
                <Badge
                  className={motto.enabled
                    ? 'bg-purple-500/25 text-purple-300 border border-purple-400/30'
                    : 'bg-white/10 text-white/50 border border-white/15'}
                  data-testid="motto-status-badge"
                >
                  {motto.enabled ? t('settingsMotto.activeBadge') : t('settingsMotto.inactiveBadge')}
                </Badge>
              </div>
              <p className="text-sm text-white/60 mt-1">{t('settingsMotto.activationDesc')}</p>
            </div>
            <Button
              variant={motto.enabled ? 'default' : 'outline'}
              size="lg"
              onClick={handleToggleEnabled}
              className={motto.enabled
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white shrink-0'
                : 'border-purple-400/40 text-purple-300 hover:bg-purple-500/10 shrink-0'}
              data-testid="motto-toggle-button"
              aria-pressed={motto.enabled}
            >
              {motto.enabled ? `⏸ ${t('settingsMotto.inactiveBadge')}` : `▶ ${t('settingsMotto.activeBadge')}`}
            </Button>
          </div>

          {/* Missing-name warning while enabled */}
          {motto.enabled && !motto.name.trim() && (
            <p className="text-xs text-amber-300 mt-4 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2" role="alert">
              {t('settingsMotto.nameMissing')}
            </p>
          )}

          {/* Banner preview — exactly how the party setup will look */}
          {motto.enabled && (
            <div className="mt-5 pt-4 border-t border-white/10">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/50 mb-3">
                {t('settingsMotto.bannerPreviewTitle')}
              </p>
              <div className="rounded-xl border border-purple-400/30 bg-gradient-to-r from-purple-500/15 via-pink-500/10 to-amber-500/15 px-4 py-3 flex items-center gap-4" data-testid="motto-banner-preview">
                <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl shrink-0" aria-hidden="true">🎉</div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-purple-300 font-semibold uppercase tracking-wider">{t('unifiedSetup.mottoPartyLabel')}</p>
                  <h4 className="text-white font-bold text-lg truncate">
                    {motto.name.trim() || t('settingsMotto.title')}
                  </h4>
                  <p className="text-white/50 text-xs">
                    {t('unifiedSetup.mottoPartySongs').replace('{n}', String(matchingSongs.length)).replace('{m}', String(songs?.length ?? 0))}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* ── Left column: name + search fields ── */}
        <div className="space-y-6">
          {/* Name */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 theme-adaptive-text">✏️ {t('settingsMotto.nameTitle')}</CardTitle>
              <CardDescription>{t('settingsMotto.nameDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Input
                  value={motto.name}
                  onChange={(e) => mottoParty.setName(e.target.value)}
                  placeholder={t('settingsMotto.namePlaceholder')}
                  maxLength={MOTTO_MAX_NAME_LENGTH}
                  className="bg-gray-800 border-white/10 text-white placeholder:text-white/30 pr-14"
                  data-testid="motto-name-input"
                  aria-label={t('settingsMotto.nameTitle')}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-white/30 pointer-events-none">
                  {motto.name.length}/{MOTTO_MAX_NAME_LENGTH}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Search fields */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 theme-adaptive-text">🔎 {t('settingsMotto.searchTitle')}</CardTitle>
              <CardDescription>{t('settingsMotto.searchDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Logic toggle: cumulative (AND) vs independent (OR) */}
              <div>
                <label className="text-sm text-white/60 mb-1.5 block">{t('settingsMotto.searchLogic')}</label>
                <div className="flex gap-2" role="group" aria-label={t('settingsMotto.searchLogic')}>
                  <button
                    type="button"
                onClick={() => mottoParty.setLogic('and')}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all border ${
                      motto.logic === 'and'
                        ? 'bg-purple-600 text-white border-purple-400 shadow-lg shadow-purple-500/25'
                        : 'bg-gray-700/60 text-white/60 hover:bg-gray-600 border-white/10'
                    }`}
                aria-pressed={motto.logic === 'and'}
                data-testid="motto-logic-and"
              >
                🔗 {t('settingsMotto.searchLogicAnd')}
              </button>
              <button
                type="button"
                onClick={() => mottoParty.setLogic('or')}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all border ${
                  motto.logic === 'or'
                    ? 'bg-purple-600 text-white border-purple-400 shadow-lg shadow-purple-500/25'
                    : 'bg-gray-700/60 text-white/60 hover:bg-gray-600 border-white/10'
                }`}
                aria-pressed={motto.logic === 'or'}
                data-testid="motto-logic-or"
              >
                ⚡ {t('settingsMotto.searchLogicOr')}
              </button>
                </div>
                <p className="text-xs text-white/40 mt-1.5">
                  {motto.logic === 'and' ? t('settingsMotto.searchLogicAndHint') : t('settingsMotto.searchLogicOrHint')}
                </p>
              </div>

              {/* Add term */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" aria-hidden="true" />
                  <Input
                    value={newTerm}
                    onChange={(e) => { setNewTerm(e.target.value); setTermError(null); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTerm(); } }}
                    placeholder={t('settingsMotto.addTermPlaceholder')}
                    maxLength={MOTTO_MAX_TERM_LENGTH}
                    className="bg-gray-800 border-white/10 text-white placeholder:text-white/30 pl-9"
                    data-testid="motto-term-input"
                    aria-label={t('settingsMotto.addTermPlaceholder')}
                  />
                </div>
                <Button
                  onClick={handleAddTerm}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white shrink-0"
                  data-testid="motto-term-add-button"
                >
                  <Plus className="w-4 h-4 mr-1" /> {t('settingsMotto.addTermButton')}
                </Button>
              </div>
              {termError && (
                <p className="text-xs text-red-400" role="alert" data-testid="motto-term-error">{termError}</p>
              )}

              {/* Field list */}
              {motto.searchFields.length === 0 ? (
                <div className="text-center py-5 px-3 rounded-lg border border-dashed border-white/15 bg-white/[0.02]">
                  <div className="text-2xl mb-1">🔎</div>
                  <p className="text-sm text-white/60">{t('settingsMotto.noTerms')}</p>
                  <p className="text-xs text-white/40 mt-1">{t('settingsMotto.noTermsDesc')}</p>
                </div>
              ) : (
                <ul className="space-y-1.5 max-h-72 overflow-y-auto taxonomy-scroll pr-1" data-testid="motto-term-list">
                  {motto.searchFields.map((field, index) => (
                    <li
                      key={field.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:border-white/25 transition-colors group"
                      data-testid={`motto-term-row-${index}`}
                    >
                      <span className="w-5 h-5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold flex items-center justify-center shrink-0" aria-hidden="true">
                        {index + 1}
                      </span>
                      <span className="text-sm text-white/90 truncate flex-1 min-w-0" title={field.term}>
                        {field.term}
                      </span>
                      <span className="text-[10px] text-white/30 shrink-0 hidden sm:inline" aria-hidden="true">
                        {motto.logic === 'and' ? 'UND' : 'ODER'}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          mottoParty.removeSearchField(field.id);
                          toast({ description: t('settingsMotto.removedToast') });
                        }}
                        className="text-red-400/60 hover:text-red-400 hover:bg-red-500/10 h-7 w-7 p-0 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity"
                        title={t('settingsMotto.removeTerm')}
                        aria-label={`${t('settingsMotto.removeTerm')}: ${field.term}`}
                        data-testid={`motto-term-remove-${index}`}
                      >
                        <X className="w-4 h-4" aria-hidden="true" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Right column: filters + live preview ── */}
        <div className="space-y-6">
          {/* Filters */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 theme-adaptive-text">🎚️ {t('settingsMotto.filtersTitle')}</CardTitle>
              <CardDescription>{t('settingsMotto.filtersDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Genre */}
                <div>
                  <label htmlFor="motto-filter-genre" className="text-sm text-white/60 mb-1 block">{t('unifiedSetup.genre')}</label>
                  <select
                    id="motto-filter-genre"
                    value={motto.filters.genre}
                    onChange={(e) => handleSetFilter('genre', e.target.value)}
                    className={SELECT_CLASS}
                    data-testid="motto-filter-genre"
                  >
                    <option value="all">{t('unifiedSetup.allGenres')}</option>
                    {availableGenres.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                {/* Language */}
                <div>
                  <label htmlFor="motto-filter-language" className="text-sm text-white/60 mb-1 block">{t('unifiedSetup.language')}</label>
                  <select
                    id="motto-filter-language"
                    value={motto.filters.language}
                    onChange={(e) => handleSetFilter('language', e.target.value)}
                    className={SELECT_CLASS}
                    data-testid="motto-filter-language"
                  >
                    <option value="all">{t('unifiedSetup.allLanguages')}</option>
                    {availableLanguages.map(l => (
                      <option key={l} value={l}>
                        {l === LANGUAGE_FILTER_OTHERS ? t('libraryFilters.othersLanguages') : (LANGUAGE_NAMES[l as Language] || l)}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Release year */}
                <div>
                  <label htmlFor="motto-filter-year" className="text-sm text-white/60 mb-1 block">{t('unifiedSetup.releaseYear')}</label>
                  <select
                    id="motto-filter-year"
                    value={motto.filters.releaseYear}
                    onChange={(e) => handleSetFilter('releaseYear', e.target.value)}
                    className={SELECT_CLASS}
                    data-testid="motto-filter-year"
                  >
                    <option value="all">{t('unifiedSetup.allYears')}</option>
                    {availableYears.map(y => <option key={y} value={String(y)}>{y}</option>)}
                  </select>
                </div>
                {/* Era */}
                <div>
                  <label htmlFor="motto-filter-era" className="text-sm text-white/60 mb-1 block">{t('unifiedSetup.releaseEra')}</label>
                  <select
                    id="motto-filter-era"
                    value={motto.filters.era}
                    onChange={(e) => handleSetFilter('era', e.target.value)}
                    className={SELECT_CLASS}
                    data-testid="motto-filter-era"
                  >
                    <option value="all">{t('unifiedSetup.allEras')}</option>
                    {availableDecades.map(d => (
                      <option key={d} value={d}>
                        {t('library.eraOption').replace('{decade}', decadeShortLabel(Number(d)))}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {anyFilterActive && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => mottoParty.resetFilters()}
                  className="border-white/20 text-white/60 hover:bg-white/10"
                  data-testid="motto-filters-reset"
                >
                  <Trash2 className="w-4 h-4 mr-1" /> {t('settingsMotto.resetFilters')}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Live preview */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 theme-adaptive-text">👀 {t('settingsMotto.previewTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {songs === null ? (
                <div className="py-6 text-center text-white/40 text-sm animate-pulse">…</div>
              ) : (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      className={
                        matchingSongs.length === 0 && hasCriteria
                          ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                          : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      }
                      data-testid="motto-preview-count"
                    >
                      {t('settingsMotto.previewCount')
                        .replace('{n}', String(matchingSongs.length))
                        .replace('{m}', String(songs.length))}
                    </Badge>
                    {motto.logic === 'and' ? (
                      <span className="text-[10px] text-white/40">🔗 {t('settingsMotto.searchLogicAnd')}</span>
                    ) : (
                      <span className="text-[10px] text-white/40">⚡ {t('settingsMotto.searchLogicOr')}</span>
                    )}
                  </div>

                  {matchingSongs.length === 0 && hasCriteria && (
                    <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2" role="alert">
                      {t('settingsMotto.previewEmpty')}
                    </p>
                  )}
                  {!hasCriteria && (
                    <p className="text-xs text-white/40 bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2">
                      {t('settingsMotto.previewNoCriteria')}
                    </p>
                  )}

                  {matchingSongs.length > 0 && (
                    <ul className="space-y-1 max-h-72 overflow-y-auto taxonomy-scroll pr-1" data-testid="motto-preview-list">
                      {matchingSongs.slice(0, 8).map(song => (
                        <li
                          key={song.id}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm"
                        >
                          <span className="text-white/30 text-xs shrink-0" aria-hidden="true">♪</span>
                          <span className="text-white/90 truncate flex-1 min-w-0" title={`${song.title} — ${song.artist}`}>
                            {song.title}
                          </span>
                          <span className="text-white/40 text-xs truncate max-w-[45%] shrink-0">{song.artist}</span>
                        </li>
                      ))}
                      {matchingSongs.length > 8 && (
                        <li className="text-center text-xs text-white/40 py-1">
                          {t('settingsMotto.previewMore').replace('{n}', String(matchingSongs.length - 8))}
                        </li>
                      )}
                    </ul>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
