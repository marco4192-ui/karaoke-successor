'use client';

import React, { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTranslation } from '@/lib/i18n/translations';
import {
  codeToFlagEmoji,
  filterCountryOptions,
  getCountryDisplayName,
  getSortedCountryOptions,
} from './country-options';

/**
 * Small country flag that renders a crisp image (flagcdn.com) and gracefully
 * falls back to the emoji flag when the image cannot be loaded (offline).
 */
export function CountryFlagImage({
  code,
  className = 'h-4 w-6',
}: {
  code: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const upper = code?.toUpperCase?.() ?? '';

  if (!upper || upper.length !== 2) return null;
  if (failed) {
    return (
      <span className={`${className} leading-none`} role="img" aria-label={upper}>
        {codeToFlagEmoji(upper)}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/w40/${upper.toLowerCase()}.png`}
      alt={upper}
      className={`${className} rounded-[2px] object-cover shadow-sm`}
      onError={() => setFailed(true)}
      loading="lazy"
      draggable={false}
    />
  );
}

interface CountryPickerProps {
  /** Currently selected ISO-3166-1 alpha-2 code ('' = none). */
  value: string;
  /** Called with the newly selected code (or '' when cleared). */
  onChange: (code: string) => void;
  /** Show a "no country" option that clears the selection. Default true. */
  allowEmpty?: boolean;
  /** Optional extra class for the trigger button. */
  className?: string;
  /** Compact variant for inline usage (settings cards). */
  compact?: boolean;
}

/**
 * Searchable country picker with small flag images for ALL countries.
 * Opens a dialog with a search field, a "popular" quick-pick row and the
 * full alphabetical (localized) list.
 */
export function CountryPicker({
  value,
  onChange,
  allowEmpty = true,
  className = '',
  compact = false,
}: CountryPickerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const sorted = useMemo(() => getSortedCountryOptions(), [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const filtered = useMemo(
    () => filterCountryOptions(sorted, query),
    [sorted, query],
  );

  const popular = useMemo(
    () => (query.trim() ? [] : sorted.slice(0, 16)),
    [sorted, query],
  );
  const rest = useMemo(() => {
    const popularCodes = new Set(popular.map(c => c.code));
    return filtered.filter(c => !popularCodes.has(c.code));
  }, [filtered, popular]);

  const selectedName = value ? getCountryDisplayName(value) : '';

  const handleSelect = (code: string) => {
    onChange(code);
    setOpen(false);
    setQuery('');
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className={`w-full flex items-center gap-2 bg-[rgb(30,30,40)] dark:bg-[rgb(30,30,40)] border border-white/20 rounded-md px-3 ${compact ? 'py-1.5 text-sm' : 'py-2'} text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 cursor-pointer hover:border-white/40 transition-colors text-left ${className}`}
      >
        {value ? (
          <>
            <CountryFlagImage code={value} className={compact ? 'h-3.5 w-5' : 'h-4 w-6'} />
            <span className="truncate flex-1">{selectedName}</span>
          </>
        ) : (
          <span className="text-white/60 flex-1 truncate">{t('profile.countryOptional')}</span>
        )}
        <svg
          className="w-4 h-4 text-white/50 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M19 11a8 8 0 11-16 0 8 8 0 0116 0z" />
        </svg>
      </button>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQuery(''); }}>
        <DialogContent className="bg-[rgb(24,24,32)] border-white/15 text-white max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              🌍 {t('profile.allCountries')}
            </DialogTitle>
          </DialogHeader>

          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('profile.countrySearch')}
            className="bg-white/5 border-white/15 text-white"
          />

          <ScrollArea className="flex-1 min-h-0 -mx-2 px-2" style={{ height: 'min(52vh, 420px)' }}>
            <div className="space-y-1 pb-2">
              {allowEmpty && !query.trim() && (
                <button
                  type="button"
                  onClick={() => handleSelect('')}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-white/10 transition-colors text-left text-white/70"
                >
                  <span className="w-6 flex-shrink-0 text-center">🚫</span>
                  <span className="text-sm">{t('profile.countryOptional')}</span>
                </button>
              )}

              {popular.length > 0 && (
                <>
                  {!query.trim() && (
                    <div className="px-3 pt-2 pb-1 text-[11px] uppercase tracking-wide text-white/40">
                      {t('profile.popularCountries')}
                    </div>
                  )}
                  {popular.map(c => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => handleSelect(c.code)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-left ${
                        value === c.code ? 'bg-cyan-500/20 ring-1 ring-cyan-400/40' : 'hover:bg-white/10'
                      }`}
                    >
                      <CountryFlagImage code={c.code} />
                      <span className="text-sm truncate">{getCountryDisplayName(c.code)}</span>
                      <span className="ml-auto text-[10px] text-white/30 font-mono">{c.code}</span>
                    </button>
                  ))}
                  {!query.trim() && (
                    <div className="px-3 pt-3 pb-1 text-[11px] uppercase tracking-wide text-white/40">
                      {t('profile.allCountries')}
                    </div>
                  )}
                </>
              )}

              {rest.map(c => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => handleSelect(c.code)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-left ${
                    value === c.code ? 'bg-cyan-500/20 ring-1 ring-cyan-400/40' : 'hover:bg-white/10'
                  }`}
                >
                  <CountryFlagImage code={c.code} />
                  <span className="text-sm truncate">{getCountryDisplayName(c.code)}</span>
                  <span className="ml-auto text-[10px] text-white/30 font-mono">{c.code}</span>
                </button>
              ))}

              {filtered.length === 0 && (
                <div className="px-3 py-8 text-center text-white/40 text-sm">
                  {t('profile.noCountryFound')}
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
