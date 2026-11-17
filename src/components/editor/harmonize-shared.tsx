'use client';

/**
 * Shared UI building blocks for the factual harmonize feature (R4 + R5,
 * R66: threshold logic removed — every suggestion comes from a music
 * database, the old confidence threshold only guarded against LLM
 * guessing).
 *
 * Used by the Metadata Studio's suggestion list:
 *  - SourceBadge:   where a suggestion comes from (iTunes / Deezer /
 *                   MusicBrainz)
 *  - SuggestionRow (R5): one song row with change lines + source reasons
 */

import { BadgeCheck } from 'lucide-react';
import { HarmonizeSuggestion } from '@/lib/editor/harmonize-client';

/** Songs that would be touched by "apply all" (every suggestion is a
 *  verified database fact — nothing is filtered). */
export function countApplicableSongs(
  suggestions: HarmonizeSuggestion[],
): number {
  return suggestions.filter(s =>
    s.suggestedGenre || s.suggestedLanguage || s.suggestedYear,
  ).length;
}

// ── Source badge ─────────────────────────────────────────────────────────

export function SourceBadge({ source, fromCache }: { source: HarmonizeSuggestion['source']; fromCache?: boolean }) {
  const config = {
    itunes: { icon: '🍎', label: 'iTunes', className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
    deezer: { icon: '🎵', label: 'Deezer', className: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' },
    musicbrainz: { icon: '🧠', label: 'MusicBrainz', className: 'bg-orange-500/15 text-orange-300 border-orange-500/30' },
    ai: { icon: '💾', label: 'Cache', className: 'bg-violet-500/15 text-violet-300 border-violet-500/30' },
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

// ── Suggestion row (R5) ──────────────────────────────────────────────────

export function SuggestionRow({
  suggestion: s,
  onApply,
  onMarkCorrect,
  markCorrectLabel,
  markCorrectHint,
}: {
  suggestion: HarmonizeSuggestion;
  onApply: (songId: string, field: 'genre' | 'language' | 'year', value: string | number) => void;
  /** R63 (verify mode only): "my data is already correct" — keeps the
   *  current values, marks the song as verified and drops the suggestion.
   *  Absent in fill mode (there the values are empty, nothing to confirm). */
  onMarkCorrect?: (songId: string) => void;
  /** Label for the mark-correct button (i18n, passed by the studio). */
  markCorrectLabel?: string;
  /** Tooltip for the mark-correct button. */
  markCorrectHint?: string;
}) {
  const reason = (text: string) =>
    text ? (
      <p className="text-[10px] text-white/40 italic truncate leading-tight" title={text}>
        💡 {text}
      </p>
    ) : null;

  const applyButton = (field: 'genre' | 'language' | 'year', value: string | number) => (
    <button
      onClick={() => onApply(s.songId, field, value)}
      className="ml-auto px-1.5 py-0.5 rounded transition-colors bg-green-500/20 text-green-400 hover:bg-green-500/30"
      aria-label="Apply"
    >✓</button>
  );

  return (
    <div className="bg-white/5 rounded-lg p-2.5 text-xs space-y-1.5">
      {/* Title line + source badge (badge only when a genre suggestion
          exists — the badge describes the genre's origin, year-only rows
          carry their source in the reason line) + R63 "data is correct"
          button (verify mode: overrule the suggestion without applying it) */}
      <div className="flex items-center gap-2">
        <p className="font-medium text-white/80 truncate flex-1">{s.artist} — {s.title}</p>
        {s.suggestedGenre && <SourceBadge source={s.source} fromCache={s.fromCache} />}
        {onMarkCorrect && (
          <button
            onClick={() => onMarkCorrect(s.songId)}
            title={markCorrectHint}
            aria-label={markCorrectHint}
            className="flex-shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-emerald-400/40 text-emerald-300 text-[10px] leading-none font-medium hover:bg-emerald-500/20 hover:border-emerald-300 transition-colors whitespace-nowrap"
            data-testid={`studio-mark-correct-${s.songId}`}
          >
            <BadgeCheck className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">{markCorrectLabel}</span>
          </button>
        )}
      </div>

      {/* Genre change */}
      {s.suggestedGenre && s.suggestedGenre !== s.currentGenre && (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1">
            <span className="text-red-400 line-through truncate max-w-[8rem]">{s.currentGenre || '—'}</span>
            <span className="text-white/40">→</span>
            <span className="text-green-400 truncate">{s.suggestedGenre}</span>
            <span className="text-white/30 whitespace-nowrap">({s.genreConfidence}%)</span>
            {applyButton('genre', s.suggestedGenre)}
          </div>
          {reason(s.genreReason)}
        </div>
      )}

      {/* Language change */}
      {s.suggestedLanguage && s.suggestedLanguage !== s.currentLanguage && (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1">
            <span className="text-red-400 line-through truncate max-w-[8rem]">{s.currentLanguage || '—'}</span>
            <span className="text-white/40">→</span>
            <span className="text-green-400 truncate">{s.suggestedLanguage}</span>
            <span className="text-white/30 whitespace-nowrap">({s.languageConfidence}%)</span>
            {applyButton('language', s.suggestedLanguage)}
          </div>
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
            {applyButton('year', s.suggestedYear)}
          </div>
          {reason(s.yearReason)}
        </div>
      )}
    </div>
  );
}
