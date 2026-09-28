'use client';

/**
 * Taxonomy tab (Settings → "Genres & Sprachen") — user request R20.
 *
 * Management UI for the app's genre & language vocabulary:
 *  - VIEW:   all built-in entries (badged "Standard") and all user-defined
 *            entries (badged "Eigene") with live usage counts per entry
 *  - CREATE: new entries in the user's own words (validated: non-empty,
 *            max length, no duplicates against built-in + custom)
 *  - DELETE: custom entries only, with a two-step inline confirmation;
 *            songs carrying the value keep it (only the vocabulary entry
 *            disappears — documented in the confirm hint)
 *
 * Everything is reactive via useCustomTaxonomy(): the moment an entry is
 * added/removed here, every dropdown in the app (editor, new-song dialog,
 * Metadata Studio) and the harmonization pipeline pick it up.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useTranslation } from '@/lib/i18n/translations';
import { useToast } from '@/hooks/use-toast';
import { useCustomTaxonomy } from '@/hooks/use-custom-taxonomy';
import {
  customTaxonomy,
  MAX_CUSTOM_ENTRIES,
  MAX_ENTRY_LENGTH,
  AddEntryResult,
} from '@/lib/game/custom-taxonomy';
import { getAllSongsAsync } from '@/lib/game/song-library';
import { Song } from '@/types/game';
import { splitGenres, normalizeLanguage } from '@/lib/parsers/meta-normalizer';

type TaxonomyKind = 'genre' | 'language';

// ── Usage counting ──────────────────────────────────────────────────────

/** Songs per genre/language, computed from the actual library. Genres may be
 *  comma-separated ("Soundtrack, K-Pop"), languages may be mixed
 *  ("German/English") — both count for EVERY part they contain. */
function buildUsageCounts(songs: Song[]): { genres: Map<string, number>; languages: Map<string, number> } {
  const genres = new Map<string, number>();
  const languages = new Map<string, number>();
  for (const s of songs) {
    if (s.genre) {
      for (const part of splitGenres(s.genre)) {
        const key = part.toLowerCase();
        genres.set(key, (genres.get(key) ?? 0) + 1);
      }
    }
    if (s.language) {
      for (const part of s.language.split('/')) {
        const trimmed = part.trim();
        if (!trimmed) continue;
        const key = normalizeLanguage(trimmed).toLowerCase();
        languages.set(key, (languages.get(key) ?? 0) + 1);
      }
    }
  }
  return { genres, languages };
}

// ── One list card (Genres OR Languages) ─────────────────────────────────

function TaxonomyListCard({
  kind,
  usageCounts,
}: {
  kind: TaxonomyKind;
  usageCounts: { genres: Map<string, number>; languages: Map<string, number> };
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { customGenres, customLanguages } = useCustomTaxonomy();

  const isGenre = kind === 'genre';
  const customEntries = isGenre ? customGenres : customLanguages;

  const [newEntry, setNewEntry] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  /** Entry name awaiting the second confirm click (two-step delete). */
  const [confirmEntry, setConfirmEntry] = useState<string | null>(null);

  const counts = isGenre ? usageCounts.genres : usageCounts.languages;
  const builtinEntries = useMemo(
    () => (isGenre ? customTaxonomy.getAllGenres() : customTaxonomy.getAllLanguages())
      .filter(e => !customEntries.some(c => c.toLowerCase() === e.toLowerCase())),
    [isGenre, customEntries],
  );

  const filterList = useCallback(
    (list: string[]) => {
      const q = search.trim().toLowerCase();
      if (!q) return list;
      return list.filter(e => e.toLowerCase().includes(q));
    },
    [search],
  );

  const visibleCustom = filterList(customEntries);
  const visibleBuiltin = filterList(builtinEntries);

  const handleAdd = useCallback(() => {
    setError(null);
    const result: AddEntryResult = isGenre
      ? customTaxonomy.addCustomGenre(newEntry)
      : customTaxonomy.addCustomLanguage(newEntry);

    if (result.ok) {
      const name = newEntry.trim().replace(/\s+/g, ' ');
      toast({ description: t('settingsTaxonomy.addedToast').replace('{name}', name) });
      setNewEntry('');
      return;
    }
    if (result.duplicate) {
      setError(t('settingsTaxonomy.errorDuplicate'));
    } else if (result.error === 'empty') {
      setError(t('settingsTaxonomy.errorEmpty'));
    } else if (result.error === 'too-long') {
      setError(t('settingsTaxonomy.errorTooLong').replace('{n}', String(MAX_ENTRY_LENGTH)));
    } else if (result.error === 'limit-reached') {
      setError(t('settingsTaxonomy.errorLimit').replace('{n}', String(MAX_CUSTOM_ENTRIES)));
    }
  }, [isGenre, newEntry, t, toast]);

  const handleRemove = useCallback((name: string) => {
    const removed = isGenre
      ? customTaxonomy.removeCustomGenre(name)
      : customTaxonomy.removeCustomLanguage(name);
    if (removed) {
      toast({ description: t('settingsTaxonomy.removedToast').replace('{name}', name) });
    }
    setConfirmEntry(null);
  }, [isGenre, t, toast]);

  const usageNumber = useCallback((entry: string): number =>
    counts.get(entry.toLowerCase()) ?? 0,
    [counts]);

  return (
    <Card className="bg-white/5 border-white/10 h-fit" data-testid={`taxonomy-card-${kind}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 theme-adaptive-text">
          <span className={isGenre ? 'text-cyan-400' : 'text-purple-400'}>
            {isGenre ? '🎸' : '🌐'}
          </span>
          {t(isGenre ? 'settingsTaxonomy.genresTitle' : 'settingsTaxonomy.languagesTitle')}
          <Badge
            variant="outline"
            className={`ml-auto text-[10px] px-2 py-0 ${
              isGenre
                ? 'border-cyan-500/40 text-cyan-300'
                : 'border-purple-500/40 text-purple-300'
            }`}
          >
            {t('settingsTaxonomy.countLabel').replace('{n}', String(customEntries.length))}
          </Badge>
        </CardTitle>
        <CardDescription>
          {t(isGenre ? 'settingsTaxonomy.addPlaceholderGenre' : 'settingsTaxonomy.addPlaceholderLanguage')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add form */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={newEntry}
              onChange={(e) => { setNewEntry(e.target.value); setError(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
              placeholder={t(isGenre ? 'settingsTaxonomy.addPlaceholderGenre' : 'settingsTaxonomy.addPlaceholderLanguage')}
              maxLength={MAX_ENTRY_LENGTH}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/40 flex-1"
              data-testid={`taxonomy-add-input-${kind}`}
              aria-label={t(isGenre ? 'settingsTaxonomy.addPlaceholderGenre' : 'settingsTaxonomy.addPlaceholderLanguage')}
            />
            <Button
              onClick={handleAdd}
              disabled={!newEntry.trim()}
              className={`text-white shrink-0 ${
                isGenre
                  ? 'bg-cyan-500 hover:bg-cyan-400'
                  : 'bg-purple-500 hover:bg-purple-400'
              }`}
              data-testid={`taxonomy-add-button-${kind}`}
            >
              + {t('settingsTaxonomy.addButton')}
            </Button>
          </div>
          {error && (
            <p className="text-xs text-red-400" role="alert" data-testid={`taxonomy-add-error-${kind}`}>
              {error}
            </p>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('settingsTaxonomy.searchPlaceholder')}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/40 pr-9 h-9 text-sm"
            data-testid={`taxonomy-search-${kind}`}
            aria-label={t('settingsTaxonomy.searchPlaceholder')}
          />
          <svg
            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </div>

        {/* Custom entries (deletable) */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-white/50">
              {t('settingsTaxonomy.customSection')}
            </h4>
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
              isGenre
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                : 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
            }`}>
              {t('settingsTaxonomy.customBadge')}
            </span>
          </div>

          {customEntries.length === 0 ? (
            <div className="text-center py-5 px-3 rounded-lg border border-dashed border-white/15 bg-white/[0.02]">
              <div className="text-2xl mb-1">{isGenre ? '🏷️' : '💬'}</div>
              <p className="text-sm text-white/60">{t('settingsTaxonomy.noCustom')}</p>
              <p className="text-xs text-white/40 mt-1">{t('settingsTaxonomy.noCustomDesc')}</p>
            </div>
          ) : visibleCustom.length === 0 && search.trim() ? (
            <p className="text-xs text-white/40 py-2">–</p>
          ) : (
            <ul className="space-y-1.5 max-h-72 overflow-y-auto taxonomy-scroll pr-1" data-testid={`taxonomy-custom-list-${kind}`}>
              {visibleCustom.map(entry => {
                const usage = usageNumber(entry);
                const isConfirming = confirmEntry === entry;
                return (
                  <li
                    key={entry}
                    className={`rounded-lg border transition-colors ${
                      isConfirming
                        ? 'bg-red-500/10 border-red-500/40'
                        : 'bg-white/5 border-white/10 hover:border-white/25'
                    }`}
                    data-testid={`taxonomy-entry-${kind}-${entry}`}
                  >
                    {!isConfirming ? (
                      <div className="flex items-center gap-2 px-3 py-2 group">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          isGenre ? 'bg-cyan-400' : 'bg-purple-400'
                        }`} aria-hidden="true" />
                        <span className="text-sm text-white/90 truncate flex-1 min-w-0" title={entry}>
                          {entry}
                        </span>
                        {usage > 0 && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 border-white/15 text-white/50 shrink-0"
                          >
                            {t('settingsTaxonomy.usageCount').replace('{n}', String(usage))}
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmEntry(entry)}
                          className="text-red-400/60 hover:text-red-400 hover:bg-red-500/10 h-7 w-7 p-0 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity"
                          title={t('settingsTaxonomy.remove')}
                          aria-label={`${t('settingsTaxonomy.remove')}: ${entry}`}
                          data-testid={`taxonomy-remove-${kind}-${entry}`}
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </Button>
                      </div>
                    ) : (
                      <div className="px-3 py-2 space-y-2">
                        <p className="text-sm font-medium text-red-300">
                          ⚠️ {t('settingsTaxonomy.removeConfirm')}
                        </p>
                        <p className="text-xs text-white/50 leading-relaxed">
                          {t('settingsTaxonomy.removeConfirmHint').replace('{name}', entry)}
                        </p>
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setConfirmEntry(null)}
                            className="border-white/20 text-white/70 hover:bg-white/10 h-7"
                          >
                            {t('settingsTaxonomy.cancel')}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleRemove(entry)}
                            className="bg-red-500 hover:bg-red-400 text-white h-7"
                            data-testid={`taxonomy-confirm-delete-${kind}`}
                          >
                            {t('settingsTaxonomy.confirmDelete')}
                          </Button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Built-in entries (read-only chips) */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-white/50">
              {t('settingsTaxonomy.builtinSection')}
            </h4>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/50 border border-white/15">
              {t('settingsTaxonomy.builtinBadge')}
            </span>
          </div>
          {visibleBuiltin.length === 0 && search.trim() ? (
            <p className="text-xs text-white/40 py-2">–</p>
          ) : (
            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto taxonomy-scroll pt-0.5 pr-1" data-testid={`taxonomy-builtin-list-${kind}`}>
              {visibleBuiltin.map(entry => {
                const usage = usageNumber(entry);
                return (
                  <span
                    key={entry}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 border border-white/10 text-xs text-white/60"
                    title={entry}
                  >
                    {entry}
                    {usage > 0 && <span className="text-[10px] text-white/35" aria-label={t('settingsTaxonomy.usageCount').replace('{n}', String(usage))}>· {usage}</span>}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Tab root ────────────────────────────────────────────────────────────

export function TaxonomyTab() {
  const { t } = useTranslation();
  const [songs, setSongs] = useState<Song[] | null>(null);

  // Load the library once for the usage counts
  useEffect(() => {
    let cancelled = false;
    getAllSongsAsync().then(all => {
      if (!cancelled) setSongs(all);
    }).catch(() => {
      if (!cancelled) setSongs([]);
    });
    return () => { cancelled = true; };
  }, []);

  const usageCounts = useMemo(
    () => buildUsageCounts(songs ?? []),
    [songs],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-white/5 border-white/10" data-testid="settings-intro-taxonomy">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 theme-adaptive-text">
            🏷️ {t('settingsTaxonomy.title')}
          </CardTitle>
          <CardDescription>
            {t('settingsTaxonomy.desc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 rounded-lg bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 px-4 py-3">
            <span className="text-lg leading-none mt-0.5" aria-hidden="true">✨</span>
            <p className="text-sm text-white/70 leading-relaxed">
              {t('settingsTaxonomy.harmonizeHint')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Genre + Language management cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <TaxonomyListCard kind="genre" usageCounts={usageCounts} />
        <TaxonomyListCard kind="language" usageCounts={usageCounts} />
      </div>
    </div>
  );
}
