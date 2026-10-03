'use client';

/**
 * Rules section (R50, point 4) — Settings → Metadaten Studio →
 * "Regel-basierte Harmonisierung".
 *
 * View + edit every rule of the Metadata Studio's rule-based harmonization:
 *  - GENRE rules:  alias → main category (DEFAULT_GENRE_ALIASES) plus the
 *                  pseudo-genre manual-review list (DEFAULT_UNMAPPABLE_GENRES)
 *  - LANGUAGE rules: alias → canonical language (DEFAULT_LANGUAGE_ALIASES)
 *
 * Users can change a rule's target, reset it to the default, add their own
 * rules, or delete user-added ones. Special targets:
 *  - ⏸ KEEP:   the term is never touched again (no rule applies)
 *  - ✋ MANUAL: the term surfaces in the manual correction list (genres only)
 *
 * Everything is reactive: the moment a rule changes, the Metadata Studio's
 * rule plan, every dropdown and the harmonization pipeline pick it up
 * (meta-normalizer resolves user rules first).
 *
 * UI kept deliberately lean ("übersichtlich", user request): rules are
 * grouped by target category, groups start COLLAPSED (just name + counts),
 * search auto-expands matching groups (capped to 120 visible rows).
 */

import { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useTranslation } from '@/lib/i18n/translations';
import { useToast } from '@/hooks/use-toast';
import { useCustomTaxonomy } from '@/hooks/use-custom-taxonomy';
import { useMetadataRules } from '@/hooks/use-metadata-rules';
import {
  metadataRules,
  RULE_KEEP,
  RULE_MANUAL,
  MAX_RULE_TERM_LENGTH,
} from '@/lib/game/metadata-rules';
import {
  DEFAULT_GENRE_ALIASES,
  DEFAULT_LANGUAGE_ALIASES,
  DEFAULT_UNMAPPABLE_GENRES,
} from '@/lib/parsers/meta-normalizer';

type RuleKind = 'genre' | 'language';
type RuleFilter = 'all' | 'changed' | 'custom';

/** Cap for rendered rule rows (search results can be huge — 700+ aliases). */
const MAX_VISIBLE_ROWS = 120;

interface RuleRowData {
  /** Normalized (lowercase) alias term — the store key + display form. */
  term: string;
  /** Effective target: user override, RULE_MANUAL (pseudo genres) or the
   *  built-in default mapping. */
  effectiveTarget: string;
  /** Built-in default target — undefined for user-added rules and for
   *  pseudo genres (their default is RULE_MANUAL). */
  defaultTarget: string | undefined;
  /** True when a user rule exists for this term (changed or added). */
  hasUserRule: boolean;
  /** True when the term is NOT in any built-in table (user-added rule). */
  isCustom: boolean;
}

// ── Rule row (one alias → target select) ────────────────────────────────

function RuleRow({
  row,
  targets,
  allowManual,
  onSet,
  onReset,
  t,
}: {
  row: RuleRowData;
  /** Dropdown options: category names (+ special targets rendered inline). */
  targets: string[];
  allowManual: boolean;
  onSet: (term: string, target: string) => void;
  onReset: (term: string) => void;
  t: (key: string) => string;
}) {
  const changed = row.hasUserRule;
  return (
    <div
      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-colors ${
        changed
          ? 'bg-amber-500/[0.07] border-amber-500/30'
          : 'bg-black/20 border-white/10 hover:border-white/20'
      }`}
      data-testid={`rule-row-${row.term.replace(/\s+/g, '-')}`}
    >
      {/* Alias term */}
      <span
        className="text-[11px] font-mono text-white/80 truncate flex-1 min-w-[110px]"
        title={row.term}
      >
        {row.term}
      </span>
      <span className="text-white/30 text-[10px]">→</span>
      {/* Target select */}
      <select
        value={row.effectiveTarget}
        onChange={e => {
          const value = e.target.value;
          if (value === row.effectiveTarget) return;
          onSet(row.term, value);
        }}
        aria-label={`${row.term} → ${row.effectiveTarget}`}
        data-testid={`rule-select-${row.term.replace(/\s+/g, '-')}`}
        className={`bg-gray-800 border rounded-lg px-2 py-1 text-[11px] focus:outline-none min-w-[110px] max-w-[170px] truncate ${
          changed ? 'border-amber-500/70 text-amber-200' : 'border-white/20 text-white/90 focus:border-violet-400'
        }`}
      >
        <option value={RULE_KEEP} className="bg-gray-800">⏸ {t('settingsRules.targetKeep')}</option>
        {allowManual && (
          <option value={RULE_MANUAL} className="bg-gray-800">✋ {t('settingsRules.targetManual')}</option>
        )}
        {targets.map(g => (
          <option key={g} value={g} className="bg-gray-800">{g}</option>
        ))}
      </select>
      {/* Badges + actions */}
      {row.isCustom ? (
        <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-cyan-500/40 text-cyan-300 shrink-0">
          {t('settingsRules.customBadge')}
        </Badge>
      ) : changed && (
        <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-amber-500/40 text-amber-300 shrink-0">
          {t('settingsRules.changedBadge')}
        </Badge>
      )}
      {changed && (
        <button
          onClick={() => onReset(row.term)}
          className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-white/40 hover:text-amber-300 hover:bg-amber-500/10 transition-colors"
          title={row.isCustom ? t('settingsRules.remove') : t('settingsRules.reset')}
          aria-label={`${t('settingsRules.reset')}: ${row.term}`}
          data-testid={`rule-reset-${row.term.replace(/\s+/g, '-')}`}
        >
          {row.isCustom ? '✕' : '↺'}
        </button>
      )}
    </div>
  );
}

// ── One kind (genre OR language) ────────────────────────────────────────

function RuleKindEditor({ kind }: { kind: RuleKind }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { allGenres, allLanguages } = useCustomTaxonomy();
  const { genreRules, languageRules } = useMetadataRules();

  const isGenre = kind === 'genre';
  const userRules = isGenre ? genreRules : languageRules;
  const targets = isGenre ? allGenres : allLanguages;

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<RuleFilter>('all');
  /** Collapsed/expanded groups — expanded only on demand (search auto-expands). */
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // ── Build the unified row model ──
  const { groups, unmappableRows, totalRows } = useMemo(() => {
    const defaults = isGenre ? DEFAULT_GENRE_ALIASES : DEFAULT_LANGUAGE_ALIASES;
    const defaultKeys = new Set(Object.keys(defaults));
    const unmappableSet = isGenre ? new Set(DEFAULT_UNMAPPABLE_GENRES) : new Set<string>();
    // All terms: defaults + pseudo genres + user-added rules
    const terms = new Set<string>([
      ...defaultKeys,
      ...(isGenre ? DEFAULT_UNMAPPABLE_GENRES : []),
      ...Object.keys(userRules),
    ]);

    const byTarget = new Map<string, RuleRowData[]>();
    const manualRows: RuleRowData[] = [];
    let total = 0;

    const pushRow = (data: RuleRowData, target: string) => {
      const list = byTarget.get(target) ?? [];
      list.push(data);
      byTarget.set(target, list);
      total++;
    };

    for (const term of terms) {
      const userRule = userRules[term];
      const defaultTarget = defaultKeys.has(term) ? defaults[term] : undefined;
      const isPseudo = unmappableSet.has(term) && !defaultKeys.has(term);
      const isCustom = !defaultKeys.has(term) && !isPseudo;
      const effectiveTarget = userRule
        ?? (isPseudo ? RULE_MANUAL : defaultTarget)
        ?? RULE_KEEP;

      const rowData: RuleRowData = {
        term,
        effectiveTarget,
        defaultTarget,
        hasUserRule: userRule !== undefined,
        isCustom,
      };

      if (effectiveTarget === RULE_MANUAL || (isPseudo && !userRule)) {
        manualRows.push(rowData);
        total++;
      } else if (effectiveTarget === RULE_KEEP) {
        // KEEP rules: pseudo-group of their own so they stay findable
        pushRow(rowData, '__keep__');
      } else {
        pushRow(rowData, effectiveTarget);
      }
    }

    // Sort rows alphabetically within each group
    const sorted = new Map<string, RuleRowData[]>();
    for (const [target, rows] of byTarget) {
      sorted.set(target, rows.sort((a, b) => a.term.localeCompare(b.term)));
    }
    manualRows.sort((a, b) => a.term.localeCompare(b.term));

    return { groups: sorted, unmappableRows: manualRows, totalRows: total };
  }, [isGenre, userRules]);

  /** Changed rows = hasUserRule && target differs from default (or custom). */
  const changedInGroup = useCallback(
    (rows: RuleRowData[]) => rows.filter(r => r.hasUserRule).length,
    [],
  );

  const matchesSearch = useCallback((row: RuleRowData, q: string) => {
    if (!q) return true;
    return row.term.includes(q) || row.effectiveTarget.toLowerCase().includes(q);
  }, []);

  const matchesFilter = useCallback((row: RuleRowData) => {
    if (filter === 'all') return true;
    if (filter === 'custom') return row.isCustom;
    return row.hasUserRule; // changed
  }, [filter]);

  // ── Group list (ordered, filtered, capped) ──
  const visibleGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const result: { target: string; rows: RuleRowData[]; allCount: number }[] = [];
    for (const [target, rows] of groups) {
      const all = rows.filter(r => matchesFilter(r));
      if (all.length === 0) continue;
      const matching = q ? all.filter(r => matchesSearch(r, q)) : all;
      if (q && matching.length === 0) continue;
      result.push({ target, rows: matching, allCount: rows.length });
    }
    // KEEP pseudo-group last, rest alphabetical
    result.sort((a, b) => {
      if (a.target === '__keep__') return 1;
      if (b.target === '__keep__') return -1;
      return a.target.localeCompare(b.target);
    });
    return result;
  }, [groups, search, matchesSearch, matchesFilter]);

  const visibleManualRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return unmappableRows
      .filter(r => matchesFilter(r))
      .filter(r => !q || matchesSearch(r, q));
  }, [unmappableRows, search, matchesSearch, matchesFilter]);

  // Search auto-expands matching groups
  const isGroupExpanded = useCallback(
    (target: string) => search.trim().length > 0 || expandedGroups.has(target),
    [search, expandedGroups],
  );

  const toggleGroup = useCallback((target: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(target)) next.delete(target);
      else next.add(target);
      return next;
    });
  }, []);

  // Global row cap across all expanded groups (keeps the DOM lean)
  const rowBudget = useMemo(() => {
    let budget = MAX_VISIBLE_ROWS;
    const capped: { target: string; rows: RuleRowData[]; hidden: number }[] = [];
    for (const g of visibleGroups) {
      if (!isGroupExpanded(g.target)) continue;
      const take = Math.max(0, Math.min(g.rows.length, budget));
      budget -= take;
      capped.push({ target: g.target, rows: g.rows.slice(0, take), hidden: g.rows.length - take });
      if (budget <= 0) break;
    }
    let manualTake = 0;
    if (isGroupExpanded('__manual__')) {
      manualTake = Math.max(0, Math.min(visibleManualRows.length, budget));
      budget -= manualTake;
    }
    return { capped, manualTake };
  }, [visibleGroups, visibleManualRows, isGroupExpanded]);

  // ── Actions ──
  const handleSet = useCallback((term: string, target: string) => {
    const result = isGenre
      ? metadataRules.setGenreRule(term, target)
      : metadataRules.setLanguageRule(term, target);
    if (result.ok) {
      toast({ description: t('settingsRules.savedToast') });
    }
  }, [isGenre, t, toast]);

  const handleReset = useCallback((term: string) => {
    if (isGenre) metadataRules.deleteGenreRule(term);
    else metadataRules.deleteLanguageRule(term);
    toast({ description: t('settingsRules.resetToast') });
  }, [isGenre, t, toast]);

  // ── Add-rule form ──
  const [newTerm, setNewTerm] = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [addError, setAddError] = useState<string | null>(null);

  const handleAddRule = useCallback(() => {
    setAddError(null);
    const term = newTerm.trim().replace(/\s+/g, ' ').toLowerCase();
    if (!term) return;
    if (!newTarget) {
      setAddError(t('settingsRules.errorInvalidTarget'));
      return;
    }
    const defaults = isGenre ? DEFAULT_GENRE_ALIASES : DEFAULT_LANGUAGE_ALIASES;
    const existsInDefaults = term in defaults
      || (isGenre && DEFAULT_UNMAPPABLE_GENRES.includes(term));
    if (existsInDefaults || userRules[term] !== undefined) {
      setAddError(t('settingsRules.errorDuplicate'));
      return;
    }
    const result = isGenre
      ? metadataRules.setGenreRule(term, newTarget)
      : metadataRules.setLanguageRule(term, newTarget);
    if (!result.ok) {
      setAddError(t('settingsRules.errorDuplicate'));
      return;
    }
    toast({ description: t('settingsRules.addToast').replace('{name}', term) });
    setNewTerm('');
  }, [newTerm, newTarget, isGenre, userRules, t, toast]);

  const changedCount = useMemo(
    () => Object.keys(userRules).length,
    [userRules],
  );

  const filterButton = (value: RuleFilter, label: string) => (
    <button
      onClick={() => setFilter(value)}
      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all border ${
        filter === value
          ? 'bg-violet-500/20 border-violet-500/60 text-violet-200'
          : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white/80'
      }`}
      data-testid={`rules-filter-${value}`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-3">
      {/* Search + filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('settingsRules.searchPlaceholder')}
          className="bg-white/5 border-white/10 text-white placeholder:text-white/40 h-9 text-sm flex-1 min-w-[180px]"
          data-testid={`rules-search-${kind}`}
          aria-label={t('settingsRules.searchPlaceholder')}
        />
        {filterButton('all', t('settingsRules.filterAll'))}
        {filterButton('changed', `${t('settingsRules.filterChanged')} (${changedCount})`)}
        {filterButton('custom', t('settingsRules.filterCustom'))}
      </div>

      {isGenre && (
        <p className="text-[10px] text-white/40 leading-relaxed" data-testid="rules-seasonal-note">
          🎄 {t('settingsRules.seasonalNote')}
        </p>
      )}

      {changedCount === 0 && filter === 'changed' ? (
        <p className="text-xs text-white/40 py-4 text-center">✅ {t('settingsRules.changedNone')}</p>
      ) : totalRows === 0 || (visibleGroups.length === 0 && visibleManualRows.length === 0) ? (
        <p className="text-xs text-white/40 py-4 text-center">{t('settingsRules.emptySearch')}</p>
      ) : (
        <div className="space-y-2">
          <p className="text-[10px] text-white/35">🗂️ {t('settingsRules.groupsHint')}</p>

          {/* Target groups — headers render for ALL visible groups (collapsed
              ones show just name + counts, click to expand); the capped row
              list only renders for expanded groups. */}
          {visibleGroups.map(({ target, rows }) => {
            const expanded = isGroupExpanded(target);
            const capped = rowBudget.capped.find(g => g.target === target);
            const hidden = capped ? capped.hidden : 0;
            const visibleRows = capped ? capped.rows : [];
            const changed = changedInGroup(rows);
            const label = target === '__keep__' ? `⏸ ${t('settingsRules.targetKeep')}` : target;
            return (
              <div
                key={target}
                className="rounded-lg border border-white/10 bg-white/[0.02] overflow-hidden"
                data-testid={`rules-group-${target.replace(/\s+/g, '-')}`}
              >
                <button
                  onClick={() => toggleGroup(target)}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 transition-colors text-left"
                  aria-expanded={expanded}
                >
                  <span className="text-[10px] text-white/40 w-3">{expanded ? '▾' : '▸'}</span>
                  <span className="text-[11px] font-semibold text-white/80">{label}</span>
                  <span className="text-[10px] text-white/35 font-mono">
                    {t('settingsRules.countRules').replace('{n}', String(rows.length))}
                  </span>
                  {changed > 0 && (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-amber-500/40 text-amber-300">
                      {t('settingsRules.countChanged').replace('{n}', String(changed))}
                    </Badge>
                  )}
                </button>
                {expanded && (
                  <div className="px-2.5 pb-2.5 space-y-1">
                    {visibleRows.map(row => (
                      <RuleRow
                        key={row.term}
                        row={row}
                        targets={targets}
                        allowManual={isGenre}
                        onSet={handleSet}
                        onReset={handleReset}
                        t={t}
                      />
                    ))}
                    {hidden > 0 && (
                      <p className="text-[10px] text-white/35 pt-1">
                        {t('settingsRules.moreHint').replace('{n}', String(hidden))}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Manual-review pseudo genres (genre tab only) */}
          {isGenre && visibleManualRows.length > 0 && (
            <div
              className="rounded-lg border border-amber-500/20 bg-amber-500/[0.04] overflow-hidden"
              data-testid="rules-group-manual"
            >
              <button
                onClick={() => toggleGroup('__manual__')}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-amber-500/[0.06] transition-colors text-left"
                aria-expanded={isGroupExpanded('__manual__')}
              >
                <span className="text-[10px] text-white/40 w-3">{isGroupExpanded('__manual__') ? '▾' : '▸'}</span>
                <span className="text-[11px] font-semibold text-amber-200/90">✋ {t('settingsRules.groupManual')}</span>
                <span className="text-[10px] text-white/35 font-mono">
                  {t('settingsRules.countRules').replace('{n}', String(visibleManualRows.length))}
                </span>
              </button>
              {isGroupExpanded('__manual__') && (
                <div className="px-3 pb-2 space-y-2">
                  <p className="text-[10px] text-white/40 leading-relaxed">{t('settingsRules.groupManualHint')}</p>
                  <div className="space-y-1">
                    {visibleManualRows.slice(0, rowBudget.manualTake).map(row => (
                      <RuleRow
                        key={row.term}
                        row={row}
                        targets={targets}
                        allowManual
                        onSet={handleSet}
                        onReset={handleReset}
                        t={t}
                      />
                    ))}
                    {visibleManualRows.length > rowBudget.manualTake && (
                      <p className="text-[10px] text-white/35 pt-1">
                        {t('settingsRules.moreHint').replace('{n}', String(visibleManualRows.length - rowBudget.manualTake))}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add-rule form */}
      <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 space-y-2">
        <div className="flex flex-wrap gap-2">
          <Input
            value={newTerm}
            onChange={e => { setNewTerm(e.target.value); setAddError(null); }}
            onKeyDown={e => { if (e.key === 'Enter') handleAddRule(); }}
            placeholder={t('settingsRules.addAliasPlaceholder')}
            maxLength={MAX_RULE_TERM_LENGTH}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/40 h-9 text-sm flex-1 min-w-[160px]"
            data-testid={`rules-add-term-${kind}`}
            aria-label={t('settingsRules.addAliasPlaceholder')}
          />
          <select
            value={newTarget}
            onChange={e => { setNewTarget(e.target.value); setAddError(null); }}
            className="bg-gray-800 border border-white/20 rounded-lg px-2 py-1.5 text-[11px] text-white focus:border-violet-400 focus:outline-none h-9 min-w-[130px]"
            aria-label={t('settingsRules.addTargetLabel')}
            data-testid={`rules-add-target-${kind}`}
          >
            <option value="">{t('settingsRules.addTargetLabel')}…</option>
            {targets.map(g => (
              <option key={g} value={g} className="bg-gray-800">{g}</option>
            ))}
          </select>
          <Button
            onClick={handleAddRule}
            disabled={!newTerm.trim() || !newTarget}
            className="bg-violet-500 hover:bg-violet-400 text-white h-9 text-xs shrink-0"
            data-testid={`rules-add-button-${kind}`}
          >
            + {t('settingsRules.addButton')}
          </Button>
        </div>
        {addError && (
          <p className="text-xs text-red-400" role="alert" data-testid={`rules-add-error-${kind}`}>
            {addError}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Section root (collapsible card) ─────────────────────────────────────

export function RulesSection() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { changedCount } = useMetadataRules();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<RuleKind>('genre');
  /** Two-step reset-all confirmation. */
  const [confirmResetAll, setConfirmResetAll] = useState(false);

  const handleResetAll = useCallback(() => {
    metadataRules.resetAll();
    setConfirmResetAll(false);
    toast({ description: t('settingsRules.resetToast') });
  }, [t, toast]);

  return (
    <Card className="bg-white/5 border-white/10" data-testid="rules-section">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 theme-adaptive-text flex-wrap">
          <span className="text-cyan-400">🧹</span>
          {t('settingsRules.title')}
          {changedCount > 0 && (
            <Badge
              variant="outline"
              className="text-[10px] px-2 py-0 border-amber-500/40 text-amber-300"
            >
              {t('settingsRules.countChanged').replace('{n}', String(changedCount))}
            </Badge>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setOpen(prev => !prev)}
            className="ml-auto h-7 px-3 border-white/20 text-white/80 hover:bg-white/10 text-xs"
            data-testid="rules-toggle"
          >
            {open ? t('settingsRules.collapse') : t('settingsRules.expand')}
          </Button>
        </CardTitle>
        <CardDescription>{t('settingsRules.desc')}</CardDescription>
      </CardHeader>

      {open && (
        <CardContent className="space-y-3">
          {/* Genre / language sub-tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setKind('genre')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                kind === 'genre'
                  ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-200'
                  : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white/80'
              }`}
              data-testid="rules-tab-genre"
            >
              🎸 {t('settingsRules.genreTab')}
            </button>
            <button
              onClick={() => setKind('language')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                kind === 'language'
                  ? 'bg-purple-500/20 border-purple-500/60 text-purple-200'
                  : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white/80'
              }`}
              data-testid="rules-tab-language"
            >
              🌐 {t('settingsRules.languageTab')}
            </button>
            {/* Reset all — only relevant with actual changes */}
            {changedCount > 0 && (
              <div className="ml-auto flex items-center gap-2">
                {confirmResetAll ? (
                  <>
                    <span className="text-[10px] text-amber-200/90 max-w-[260px] leading-tight hidden sm:inline">
                      {t('settingsRules.resetAllConfirm')}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setConfirmResetAll(false)}
                      className="h-7 px-3 border-white/20 text-white/70 hover:bg-white/10 text-xs"
                    >
                      {t('settingsTaxonomy.cancel')}
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleResetAll}
                      className="h-7 px-3 bg-red-500 hover:bg-red-400 text-white text-xs"
                      data-testid="rules-reset-all-confirm"
                    >
                      {t('settingsRules.resetAll')}
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setConfirmResetAll(true)}
                    className="h-7 px-3 border-white/20 text-white/60 hover:bg-white/10 hover:text-white text-xs"
                    data-testid="rules-reset-all"
                  >
                    ↺ {t('settingsRules.resetAll')}
                  </Button>
                )}
              </div>
            )}
          </div>

          <RuleKindEditor key={kind} kind={kind} />
        </CardContent>
      )}
    </Card>
  );
}
