/**
 * Metadata rules store (user request R50, point 4) — user-defined overrides
 * for the rule-based harmonization of the Metadata Studio.
 *
 * The built-in rule tables (GENRE_ALIASES, LANGUAGE_ALIASES, the UNMAPPABLE
 * pseudo-genre set — see lib/parsers/meta-normalizer.ts) cover every known
 * Ultrastar genre tag. This store holds the user's DELTA against those
 * defaults:
 *  - CHANGED rule:  built-in alias remapped to another main category
 *  - ADDED rule:    brand-new alias → main category mapping
 *  - REMOVED state: user rule equal to the built-in default = same as reset
 *  - Special targets: RULE_KEEP (never touch the term again) and
 *    RULE_MANUAL (force the term into the manual correction list)
 *
 * Resolution precedence in the pipeline (meta-normalizer):
 *   user rule  >  custom taxonomy categories  >  built-in alias  >  fallback
 *
 * Storage: localStorage (per device) — mirrored into the OS AppData folder
 * by lib/game/taxonomy-appdata-sync.ts in the Tauri build (R50 point 5).
 * SSR-safe: on the server the overrides are simply empty (API routes keep
 * working with the built-in defaults).
 *
 * Reactivity: module singleton with subscribe()/getSnapshotVersion() — the
 * same pattern as customTaxonomy and the RuleHarmonizer job (components
 * re-render via useSyncExternalStore the moment a rule changes).
 */

import { StorageKeys, getJsonOptional, setJson } from '@/lib/storage';
import { customTaxonomy } from '@/lib/game/custom-taxonomy';

/** Special target: the term is NEVER harmonized (no rule applies, it stays
 *  exactly as written — not even the manual review list sees it). */
export const RULE_KEEP = '__keep__';
/** Special target: the term always lands in the Metadata Studio manual
 *  correction list (same treatment as the built-in pseudo-genres). */
export const RULE_MANUAL = '__manual__';

/** Maximum number of custom rules per kind (protects memory + UI). */
export const MAX_CUSTOM_RULES = 500;
/** Maximum length of a rule term (characters, trimmed). */
export const MAX_RULE_TERM_LENGTH = 60;

export interface MetadataRulesData {
  /** lowercase alias term → canonical target | RULE_KEEP | RULE_MANUAL */
  genreRules: Record<string, string>;
  /** lowercase language alias term → canonical language | RULE_KEEP */
  languageRules: Record<string, string>;
}

export interface SetRuleResult {
  ok: boolean;
  /** A rule for this term already exists (built-in or user-defined). */
  duplicate?: boolean;
  /** Validation failed (empty / too long / too many / invalid target). */
  error?: 'empty' | 'too-long' | 'limit-reached' | 'invalid-target';
}

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/** All targets a genre rule may point at: canonical GENRES + user-defined
 *  custom genres (validated live so rules never dangle after a custom genre
 *  was deleted again — the UI only offers existing categories). */
export function getValidGenreTargets(): string[] {
  return customTaxonomy.getAllGenres();
}

/** All targets a language rule may point at. */
export function getValidLanguageTargets(): string[] {
  return customTaxonomy.getAllLanguages();
}

/** Read, sanitize and validate the persisted rule object. Corrupted or
 *  dangling entries (target no longer exists) are dropped. */
function readRules(): MetadataRulesData {
  const empty: MetadataRulesData = { genreRules: {}, languageRules: {} };
  if (!isBrowser()) return empty;
  const stored = getJsonOptional<Partial<MetadataRulesData>>(StorageKeys.METADATA_RULES);
  if (!stored || typeof stored !== 'object') return empty;

  const genreTargets = new Set(getValidGenreTargets().map(g => g.toLowerCase()));
  const languageTargets = new Set(getValidLanguageTargets().map(l => l.toLowerCase()));

  const sanitize = (
    raw: unknown,
    validTargets: Set<string>,
    allowManual: boolean,
  ): Record<string, string> => {
    if (!raw || typeof raw !== 'object') return {};
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof value !== 'string') continue;
      const term = key.trim().toLowerCase();
      if (!term || term.length > MAX_RULE_TERM_LENGTH) continue;
      if (value === RULE_KEEP || (allowManual && value === RULE_MANUAL)) {
        result[term] = value;
        continue;
      }
      if (validTargets.has(value.toLowerCase())) result[term] = value;
    }
    return result;
  };

  return {
    genreRules: sanitize(stored.genreRules, genreTargets, true),
    languageRules: sanitize(stored.languageRules, languageTargets, false),
  };
}

class MetadataRulesStore {
  private data: MetadataRulesData = isBrowser() ? readRules() : { genreRules: {}, languageRules: {} };
  private listeners = new Set<() => void>();

  /** Bumped on every mutation — useSyncExternalStore snapshot identity. */
  private version = 0;

  getSnapshotVersion(): number {
    return this.version;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private emit(): void {
    this.version++;
    for (const l of this.listeners) l();
  }

  private persist(): void {
    setJson(StorageKeys.METADATA_RULES, this.data);
  }

  // ── Reads ──

  getGenreRules(): Record<string, string> {
    return { ...this.data.genreRules };
  }

  getLanguageRules(): Record<string, string> {
    return { ...this.data.languageRules };
  }

  /**
   * Resolve the USER rule for a genre term (already normalized to the alias
   * key form: lowercase, collapsed whitespace). Hyphen/space variants are
   * NOT tried here — the caller (meta-normalizer) passes all variants.
   * Returns undefined when no user rule exists.
   */
  getUserGenreRule(term: string): string | undefined {
    return this.data.genreRules[term];
  }

  /** Resolve the USER rule for a language term (lowercase key form). */
  getUserLanguageRule(term: string): string | undefined {
    return this.data.languageRules[term];
  }

  // ── Writes ──

  /**
   * Set (or change) a genre rule. `target` is a canonical/custom genre name
   * or RULE_KEEP / RULE_MANUAL. Passing null RESETS the term to the built-in
   * default behavior.
   */
  setGenreRule(term: string, target: string | null): SetRuleResult {
    return this.setRule(term, target, 'genre');
  }

  /** Set (or change) a language rule. RULE_MANUAL is not valid here. */
  setLanguageRule(term: string, target: string | null): SetRuleResult {
    return this.setRule(term, target, 'language');
  }

  private setRule(term: string, target: string | null, kind: 'genre' | 'language'): SetRuleResult {
    const key = term.trim().replace(/\s+/g, ' ').toLowerCase();
    if (!key) return { ok: false, error: 'empty' };
    if (key.length > MAX_RULE_TERM_LENGTH) return { ok: false, error: 'too-long' };

    const isGenre = kind === 'genre';
    const rules = isGenre ? this.data.genreRules : this.data.languageRules;

    if (target === null) {
      // Reset to default — delete the user delta
      if (!(key in rules)) return { ok: true };
      const next = { ...rules };
      delete next[key];
      this.data = isGenre
        ? { ...this.data, genreRules: next }
        : { ...this.data, languageRules: next };
      this.persist();
      this.emit();
      return { ok: true };
    }

    const trimmedTarget = target.trim();
    if (!trimmedTarget) return { ok: false, error: 'invalid-target' };
    if (trimmedTarget === RULE_KEEP || (isGenre && trimmedTarget === RULE_MANUAL)) {
      if (rules[key] === trimmedTarget) return { ok: true, duplicate: true };
      this.data = isGenre
        ? { ...this.data, genreRules: { ...rules, [key]: trimmedTarget } }
        : { ...this.data, languageRules: { ...rules, [key]: trimmedTarget } };
      this.persist();
      this.emit();
      return { ok: true };
    }

    // Real category target — must exist in the current vocabulary
    const valid = isGenre ? getValidGenreTargets() : getValidLanguageTargets();
    const match = valid.find(v => v.toLowerCase() === trimmedTarget.toLowerCase());
    if (!match) return { ok: false, error: 'invalid-target' };

    if (rules[key] === match) return { ok: true, duplicate: true };
    this.data = isGenre
      ? { ...this.data, genreRules: { ...rules, [key]: match } }
      : { ...this.data, languageRules: { ...rules, [key]: match } };
    this.persist();
    this.emit();
    return { ok: true };
  }

  /** Delete a user-added rule entirely (same as reset). */
  deleteGenreRule(term: string): void {
    void this.setGenreRule(term, null);
  }

  deleteLanguageRule(term: string): void {
    void this.setLanguageRule(term, null);
  }

  /** Reset ALL user rules (both kinds) back to the built-in defaults. */
  resetAll(): void {
    this.data = { genreRules: {}, languageRules: {} };
    this.persist();
    this.emit();
  }

  /**
   * AppData restore (R50 point 5): merge a persisted blob into the store.
   * LOCAL entries win on key conflicts (they are the newer in-session edits);
   * AppData entries fill everything local is missing (reinstall recovery).
   */
  hydrateFromAppData(blob: Partial<MetadataRulesData> | null | undefined): void {
    if (!blob || typeof blob !== 'object') return;
    const incoming = blob as Partial<MetadataRulesData>;

    const genreTargets = new Set(getValidGenreTargets().map(g => g.toLowerCase()));
    const languageTargets = new Set(getValidLanguageTargets().map(l => l.toLowerCase()));

    const mergeRules = (
      local: Record<string, string>,
      remote: Record<string, string> | undefined,
      targets: Set<string>,
      isGenre: boolean,
    ): Record<string, string> => {
      if (!remote || typeof remote !== 'object') return local;
      const merged: Record<string, string> = { ...remote, ...local };
      for (const key of Object.keys(merged)) {
        if (key in local) continue; // local wins on conflict
        const value = merged[key];
        const valid = value === RULE_KEEP
          || (isGenre && value === RULE_MANUAL)
          || targets.has(value.toLowerCase());
        if (!valid) delete merged[key]; // corrupted/wrong-kind remote entry
      }
      return merged;
    };

    this.data = {
      genreRules: mergeRules(this.data.genreRules, incoming.genreRules, genreTargets, true),
      languageRules: mergeRules(this.data.languageRules, incoming.languageRules, languageTargets, false),
    };
    this.persist();
    this.emit();
  }
}

/** Module singleton — survives component unmounts, shared across the app. */
export const metadataRules = new MetadataRulesStore();
