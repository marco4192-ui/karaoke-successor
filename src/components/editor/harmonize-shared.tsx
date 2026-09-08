'use client';

/**
 * Shared UI building blocks for the AI harmonize feature (R4 + R5).
 *
 * Used by both the multi-select batch dialog (editor screen) and the
 * per-library harmonize card so they stay visually identical:
 *  - SourceBadge:   where a suggestion comes from (KI / Deezer / MusicBrainz)
 *  - ConfidenceFilter (R4): minimum-confidence threshold for apply-all
 *  - SuggestionRow (R5): one song row with change lines + AI reasons
 */

import { HarmonizeSuggestion } from '@/lib/ai/harmonize-client';

// ── Threshold logic (R4) ─────────────────────────────────────────────────

/**
 * Whether a field's suggestion passes the confidence threshold.
 *
 * Factual sources (Deezer/MusicBrainz) are exempt — the threshold guards
 * against the AI *guessing*, not against verified database facts.
 * Years are always factual and therefore always pass.
 */
export function fieldPassesThreshold(
  field: 'genre' | 'language' | 'year',
  s: HarmonizeSuggestion,
  minConfidence: number,
): boolean {
  if (field === 'year') return true;
  if (field === 'genre' && s.source !== 'ai') return true;
  const conf = field === 'genre' ? s.genreConfidence : s.languageConfidence;
  return conf >= minConfidence;
}

/** Count of fields that would be applied by "apply all" at this threshold. */
export function countApplicableFields(
  suggestions: HarmonizeSuggestion[],
  minConfidence: number,
): number {
  let count = 0;
  for (const s of suggestions) {
    if (s.suggestedGenre && fieldPassesThreshold('genre', s, minConfidence)) count++;
    if (s.suggestedLanguage && fieldPassesThreshold('language', s, minConfidence)) count++;
    if (s.suggestedYear && fieldPassesThreshold('year', s, minConfidence)) count++;
  }
  return count;
}

/** Songs that would be touched by "apply all" at this threshold. */
export function countApplicableSongs(
  suggestions: HarmonizeSuggestion[],
  minConfidence: number,
): number {
  return suggestions.filter(s =>
    (s.suggestedGenre && fieldPassesThreshold('genre', s, minConfidence)) ||
    (s.suggestedLanguage && fieldPassesThreshold('language', s, minConfidence)) ||
    (s.suggestedYear && fieldPassesThreshold('year', s, minConfidence)),
  ).length;
}

// ── Source badge ─────────────────────────────────────────────────────────

export function SourceBadge({ source, fromCache }: { source: HarmonizeSuggestion['source']; fromCache?: boolean }) {
  const config = {
    deezer: { icon: '🎵', label: 'Deezer', className: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' },
    musicbrainz: { icon: '🧠', label: 'MusicBrainz', className: 'bg-orange-500/15 text-orange-300 border-orange-500/30' },
    ai: { icon: '🤖', label: 'AI', className: 'bg-violet-500/15 text-violet-300 border-violet-500/30' },
  } as const;
  const c = config[source];
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] leading-none whitespace-nowrap ${c.className}`}
      title={fromCache ? `${c.label} (⚡ cache)` : c.label}
    >
      <span>{c.icon}</span>
      {fromCache && <span>⚡</span>}
      <span className="hidden sm:inline">{c.label}</span>
    </span>
  );
}

// ── Confidence filter (R4) ───────────────────────────────────────────────

const THRESHOLD_STEPS = [50, 60, 70, 80, 90];

export function ConfidenceFilter({
  value,
  onChange,
  t,
}: {
  value: number;
  onChange: (value: number) => void;
  t: (key: string) => string;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap" data-testid="harmonize-confidence-filter">
      <span className="text-[11px] text-white/50 whitespace-nowrap">
        🛡️ {t('editor.aiBatchMinConfidence')}
      </span>
      <div className="flex gap-1">
        {THRESHOLD_STEPS.map(step => (
          <button
            key={step}
            onClick={() => onChange(step)}
            className={`px-2 py-0.5 rounded-md text-[11px] font-mono tabular-nums transition-colors ${
              value === step
                ? 'bg-violet-500 text-white'
                : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80'
            }`}
            data-testid={`harmonize-threshold-${step}`}
          >
            ≥{step}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Suggestion row (R5) ──────────────────────────────────────────────────

export function SuggestionRow({
  suggestion: s,
  minConfidence,
  onApply,
}: {
  suggestion: HarmonizeSuggestion;
  minConfidence: number;
  onApply: (songId: string, field: 'genre' | 'language' | 'year', value: string | number) => void;
}) {
  const genrePasses = !s.suggestedGenre || fieldPassesThreshold('genre', s, minConfidence);
  const languagePasses = !s.suggestedLanguage || fieldPassesThreshold('language', s, minConfidence);

  const reason = (text: string) =>
    text ? (
      <p className="text-[10px] text-white/40 italic truncate leading-tight" title={text}>
        💡 {text}
      </p>
    ) : null;

  const applyButton = (field: 'genre' | 'language' | 'year', value: string | number, passes: boolean) => (
    <button
      onClick={() => onApply(s.songId, field, value)}
      disabled={!passes}
      className={`ml-auto px-1.5 py-0.5 rounded transition-colors ${
        passes
          ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
          : 'bg-white/5 text-white/20 cursor-not-allowed'
      }`}
      aria-label="Apply"
    >✓</button>
  );

  return (
    <div className="bg-white/5 rounded-lg p-2.5 text-xs space-y-1.5">
      {/* Title line + source badge (badge only when a genre suggestion
          exists — the badge describes the genre's origin, year-only rows
          carry their source in the reason line) */}
      <div className="flex items-center gap-2">
        <p className="font-medium text-white/80 truncate flex-1">{s.artist} — {s.title}</p>
        {s.suggestedGenre && <SourceBadge source={s.source} fromCache={s.fromCache} />}
      </div>

      {/* Genre change */}
      {s.suggestedGenre && s.suggestedGenre !== s.currentGenre && (
        <div className={`space-y-0.5 ${genrePasses ? '' : 'opacity-40'}`}>
          <div className="flex items-center gap-1">
            <span className="text-red-400 line-through truncate max-w-[8rem]">{s.currentGenre || '—'}</span>
            <span className="text-white/40">→</span>
            <span className="text-green-400 truncate">{s.suggestedGenre}</span>
            <span className="text-white/30 whitespace-nowrap">({s.genreConfidence}%)</span>
            {applyButton('genre', s.suggestedGenre, genrePasses)}
          </div>
          {!genrePasses && (
            <p className="text-[10px] text-amber-400/60 leading-tight">🛡️ &lt; {minConfidence}%</p>
          )}
          {reason(s.genreReason)}
        </div>
      )}

      {/* Language change */}
      {s.suggestedLanguage && s.suggestedLanguage !== s.currentLanguage && (
        <div className={`space-y-0.5 ${languagePasses ? '' : 'opacity-40'}`}>
          <div className="flex items-center gap-1">
            <span className="text-red-400 line-through truncate max-w-[8rem]">{s.currentLanguage || '—'}</span>
            <span className="text-white/40">→</span>
            <span className="text-green-400 truncate">{s.suggestedLanguage}</span>
            <span className="text-white/30 whitespace-nowrap">({s.languageConfidence}%)</span>
            {applyButton('language', s.suggestedLanguage, languagePasses)}
          </div>
          {!languagePasses && (
            <p className="text-[10px] text-amber-400/60 leading-tight">🛡️ &lt; {minConfidence}%</p>
          )}
          {reason(s.languageReason)}
        </div>
      )}

      {/* Year change — factual only, always applies */}
      {s.suggestedYear && s.suggestedYear !== s.currentYear && (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1">
            <span className="text-white/40">📅</span>
            <span className="text-red-400 line-through">{s.currentYear ?? '—'}</span>
            <span className="text-white/40">→</span>
            <span className="text-green-400 font-mono">{s.suggestedYear}</span>
            <span className="text-white/30 whitespace-nowrap">({s.yearConfidence}%)</span>
            {applyButton('year', s.suggestedYear, true)}
          </div>
          {reason(s.yearReason)}
        </div>
      )}
    </div>
  );
}
