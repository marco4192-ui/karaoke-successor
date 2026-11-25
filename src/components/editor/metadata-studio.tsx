'use client';

/**
 * Metadata Studio (user feedback round R4 — points 7 + 8).
 *
 * ONE merged hub for metadata enrichment/harmonization, placed in the editor
 * library above the song grid. It replaces the old sidebar trio
 * (GenreLanguageEditor + AiHarmonizeCard + RuleHarmonizeCard) AND the separate
 * "AI Support" batch-suggest flow — merging the strengths of both:
 *
 *  - Scope:   all songs OR the current multi-selection (old "AI Suggest")
 *  - Fields:  Genre / Language / Year — independently selectable
 *  - Mode:    "fill missing" (only empty fields get values — factual lookup
 *             via iTunes/Deezer/MusicBrainz), "rule-based" (deterministic
 *             GENRE_ALIASES mapping; the rules are user-editable in Settings
 *             → Metadaten Studio, R50), "manual" (R5-1: direct per-song
 *             editing of all scope songs — current value + editor side by
 *             side) or "verify" (R59: check EXISTING genre/year values for
 *             correctness — same source chain as fill (iTunes/Deezer/
 *             MusicBrainz facts), but the databases' values are COMPARED
 *             against the current tags; every mismatch becomes a correction
 *             suggestion with the source as evidence).
 *             (R50: the former "harmonize" mode — AI corrections of existing
 *             values — was REMOVED; the rule-based mode covers that use case
 *             deterministically. R66: the LLM fallback was removed together
 *             with the AI service — the pipeline is 100% factual.)
 *  - Target:  write into the UltraStar txt (survives a library reset) or keep
 *             changes game-local only (wiped by the library reset — hint shown)
 *
 * Engine is the shared factual pipeline (R2 cache → R6 database lookup).
 *
 * Architecture: this component owns the configuration state and the derived
 * scopes/plans; the heavy lifting lives in dedicated modules (see
 * ./metadata-studio/): useStudioEngine (fill/verify run + apply loops),
 * useManualEditing (correction list + direct edit mode), useManualPreview
 * (audio preview), ManualReviewList / ManualEditPanel / ApplyAllWarning
 * (list UIs + warning modal).
 */

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Song } from '@/types/game';
import { songHasVideo, songHasCover, songHasBackground } from '@/lib/editor/media-presence';
import {
  planRuleHarmonization,
  planRuleLanguageHarmonization,
  ruleHarmonizer,
} from '@/lib/editor/rule-harmonizer';
import {
  SuggestionRow,
  countApplicableSongs,
} from '@/components/editor/harmonize-shared';
import { useCustomTaxonomy } from '@/hooks/use-custom-taxonomy';
import { useMetadataRules } from '@/hooks/use-metadata-rules';
import { ChevronDown, ChevronRight, BadgeCheck } from 'lucide-react';
import { useRuleHarmonizerState } from './metadata-studio/use-rule-harmonizer-state';
import { useManualPreview } from './metadata-studio/use-manual-preview';
import { useStudioEngine } from './metadata-studio/use-studio-engine';
import { useManualEditing } from './metadata-studio/use-manual-editing';
import { SegButton, FieldToggle } from './metadata-studio/studio-ui-atoms';
import { ManualReviewList } from './metadata-studio/manual-review-list';
import { ManualEditPanel } from './metadata-studio/manual-edit-panel';
import { ApplyAllWarning } from './metadata-studio/apply-all-warning';
import type { MetadataStudioProps } from './metadata-studio/types';

export type { StudioScope, StudioMode, StudioWriteTarget } from './metadata-studio/types';

export function MetadataStudio({
  songs,
  selectedIds,
  open,
  onToggle,
  selectionFocusToken = 0,
  selectMode,
  onToggleSelectMode,
  onClearSelection,
  onApplied,
  t,
}: MetadataStudioProps) {
  // ── Configuration ──
  const [scope, setScope] = useState<'all' | 'selection'>('all');
  const [fields, setFields] = useState({ genre: true, language: true, year: true });
  const [mode, setMode] = useState<'fill' | 'rule' | 'manual' | 'verify'>('fill');
  const [writeTarget, setWriteTarget] = useState<'txt' | 'local'>('txt');

  // R20: genre vocabulary = built-in list + user-defined entries from
  // Settings → Metadaten Studio (reactive — the dropdowns here update the
  // moment a custom genre is added or removed there)
  const { allGenres } = useCustomTaxonomy();

  // R50: user rule overrides (Settings → Metadaten Studio → Regeln) — the
  // version acts as a dependency so the rule plan below recomputes the
  // moment a rule changes (also live while the studio is open).
  const { version: rulesVersion } = useMetadataRules();

  // Opening from the select bar switches to the selection scope (token-based
  // so it also fires when the scope was already "selection")
  useEffect(() => {
    if (selectionFocusToken > 0) setScope('selection');
  }, [selectionFocusToken]);

  // ── Scope / mode helpers ──
  const selectedSongs = useMemo(
    () => songs.filter(s => selectedIds.has(s.id)),
    [songs, selectedIds],
  );
  const scopeSongs = scope === 'selection' ? selectedSongs : songs;

  const missingCounts = useMemo(() => ({
    genre: songs.filter(s => !s.genre).length,
    language: songs.filter(s => !s.language).length,
    year: songs.filter(s => !s.year).length,
    // R110 (user point 1): media-presence counts (same predicates as the
    // editor library filters — lib/editor/media-presence.ts)
    video: songs.filter(s => !songHasVideo(s)).length,
    cover: songs.filter(s => !songHasCover(s)).length,
    background: songs.filter(s => !songHasBackground(s)).length,
  }), [songs]);

  /**
   * Songs the current run would analyze:
   *  - fill mode:   only songs with at least one SELECTED field missing
   *  - verify mode: only songs with at least one SELECTED field PRESENT —
   *                 those are the ones that can be checked (R59)
   *  - rule mode computes its plan from the genres below; manual mode has
   *    no Run button — the list is edited directly
   */
  const runSubset = useMemo(() => {
    if (mode === 'fill') {
      return scopeSongs.filter(s =>
        (fields.genre && !s.genre) ||
        (fields.language && !s.language) ||
        (fields.year && !s.year),
      );
    }
    if (mode === 'verify') {
      return scopeSongs.filter(s =>
        (fields.genre && !!s.genre) ||
        (fields.language && !!s.language) ||
        (fields.year && s.year != null),
      );
    }
    return scopeSongs;
  }, [scopeSongs, mode, fields]);

  /** Rule plan (pure + synchronous): GENRE harmonization (alias mapping,
   *  parenthetical stripping, comma-splitting) plus LANGUAGE harmonization
   *  (parentheses stripped, aliases mapped, separators unified to "/") —
   *  the language rules mirror the genre pipeline (user item 6). */
  const rulePlan = useMemo(
    () => (mode === 'rule'
      ? [...planRuleHarmonization(scopeSongs), ...planRuleLanguageHarmonization(scopeSongs)]
      : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rulesVersion is NOT read inside the memo body, but the plan functions resolve the metadata-rules store internally; the version forces recomputation when a rule changes (R50)
    [mode, scopeSongs, rulesVersion],
  );
  /** Plan breakdown for the info line (🎸 genres / 🌐 languages). */
  const ruleGenrePlanCount = useMemo(
    () => (mode === 'rule' ? planRuleHarmonization(scopeSongs).length : 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see rulePlan above (R50 rule-change reactivity)
    [mode, scopeSongs, rulesVersion],
  );
  const ruleLanguagePlanCount = rulePlan.length - ruleGenrePlanCount;

  /** Full song lookup for the manual-review preview (items only carry
   *  title/artist/genre — playback needs the media URLs). */
  const songById = useMemo(() => {
    const map = new Map<string, Song>();
    for (const s of songs) map.set(s.id, s);
    return map;
  }, [songs]);

  // ── Hooks: audio preview, suggestion engine, manual editing ──
  const { manualPreviewId, toggleManualPreview, stopManualPreview } = useManualPreview(songById);

  const engine = useStudioEngine({ songs, runSubset, scope, mode, fields, writeTarget, rulePlan, t, onApplied });
  const {
    suggestions, setSuggestions,
    isLoading,
    error,
    showWarning, setShowWarning,
    progress,
    stats, setStats,
    applyProgress,
    fileErrors, setFileErrors,
    localAppliedInfo, setLocalAppliedInfo,
    markedVerifiedInfo,
    warmupProgress,
    runStartedAt,
    elapsedSec,
    handleRunClick,
    handleAbortRun,
    handleMarkCorrect,
    handleApplySingle,
    handleApplyAll,
    handleRuleStart,
  } = engine;

  const {
    manualReview,
    skippedManualCount,
    setSkippedManualIds,
    manualPicks,
    setManualPicks,
    manualApplyProgress,
    handleApplyManualPicks,
    skipManualSong,
    manualEdits,
    setManualEdits,
    manualEditApplyProgress,
    manualUpdatesFor,
    manualEditChangedCount,
    handleApplyManualEdits,
  } = useManualEditing({
    mode, scopeSongs, rulesVersion, fields, writeTarget, onApplied,
    manualPreviewId, stopManualPreview,
    noteLocalApplied: engine.noteLocalApplied,
    setFileErrors: engine.setFileErrors,
  });

  const ruleJob = useRuleHarmonizerState();
  const ruleRunning = ruleJob.status === 'running';
  /** Completion banner (user item 7): stays visible after the job finishes
   *  so it is IMMEDIATELY obvious the harmonization ran — dismissed
   *  manually, auto-reset whenever a new job starts. */
  const [ruleDoneDismissed, setRuleDoneDismissed] = useState(false);
  useEffect(() => {
    if (ruleJob.status === 'running') setRuleDoneDismissed(false);
  }, [ruleJob.status]);
  const ruleDoneVisible =
    (ruleJob.status === 'done' || ruleJob.status === 'aborted') &&
    ruleJob.total > 0 && !ruleDoneDismissed;

  const applicableCount = countApplicableSongs(suggestions);
  const noFieldsSelected = !fields.genre && !fields.language && !fields.year;
  const rulePreview = rulePlan.slice(0, 8);

  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-xl overflow-hidden" data-testid="metadata-studio">
      {/* ── Collapsible header ── */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-white/5 transition-colors text-left"
        aria-expanded={open}
        data-testid="metadata-studio-toggle"
      >
        {open
          ? <ChevronDown className="w-4 h-4 text-violet-300 flex-shrink-0" />
          : <ChevronRight className="w-4 h-4 text-violet-300 flex-shrink-0" />}
        <span className="text-sm font-semibold text-white/90">🎛️ {t('editor.studioTitle')}</span>
        {/* Job running while collapsed → obvious spinner so the user knows
            the analysis is still in progress (no silent waiting) */}
        {!open && (isLoading || ruleRunning) && (
          <span className="flex items-center gap-1.5 text-[10px] text-violet-300 font-mono whitespace-nowrap">
            <span className="inline-block w-3 h-3 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
            {ruleRunning
              ? `${ruleJob.done}/${ruleJob.total}`
              : progress
                ? `${progress.done}/${progress.total}`
                : '…'}
          </span>
        )}
        <span className="text-[10px] text-white/40 truncate hidden sm:inline">
          {t('editor.studioDesc')}
        </span>
        {/* Compact missing-stats — the core numbers at a glance */}
        <span className="ml-auto flex items-center gap-2 text-[10px] font-mono whitespace-nowrap flex-shrink-0">
          <span className="text-orange-300/80" title={t('editor.noGenre')}>🎸{missingCounts.genre}</span>
          <span className="text-purple-300/80" title={t('editor.noLanguage')}>🌐{missingCounts.language}</span>
          <span className="text-emerald-300/80" title={t('editor.noYear')}>📅{missingCounts.year}</span>
          <span className="text-rose-300/80" title={t('editor.noVideo')}>🎬{missingCounts.video}</span>
          <span className="text-fuchsia-300/80" title={t('editor.noCover')}>🖼️{missingCounts.cover}</span>
          <span className="text-teal-300/80" title={t('editor.noBackground')}>🌌{missingCounts.background}</span>
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/10 pt-3">
          {/* ── Scope ── */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-white/40 w-16 flex-shrink-0">{t('editor.studioScope')}</span>
            <SegButton active={scope === 'all'} onClick={() => setScope('all')}
              label={t('editor.studioScopeAll').replace('{n}', String(songs.length))} testId="studio-scope-all" />
            <SegButton active={scope === 'selection'} onClick={() => setScope('selection')}
              label={t('editor.studioScopeSelection').replace('{n}', String(selectedIds.size))} testId="studio-scope-selection" />
          </div>

          {/* ── Fields ── */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-white/40 w-16 flex-shrink-0">{t('editor.studioFields')}</span>
            <FieldToggle active={fields.genre} onToggle={() => setFields(prev => ({ ...prev, genre: !prev.genre }))}
              icon="🎸" label={t('editor.songInfoTab.genre')} testId="studio-field-genre" />
            <FieldToggle active={fields.language} onToggle={() => setFields(prev => ({ ...prev, language: !prev.language }))}
              icon="🌐" label={t('editor.songInfoTab.language')} testId="studio-field-language" />
            <FieldToggle active={fields.year} onToggle={() => setFields(prev => ({ ...prev, year: !prev.year }))}
              icon="📅" label={t('editor.songInfoTab.year')} testId="studio-field-year" />
          </div>

          {/* ── Mode ── */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-white/40 w-16 flex-shrink-0">{t('editor.studioMode')}</span>
            <SegButton active={mode === 'fill'} onClick={() => setMode('fill')} label={t('editor.studioModeFill')} testId="studio-mode-fill" />
            <SegButton active={mode === 'rule'} onClick={() => setMode('rule')} label={t('editor.studioModeRule')} testId="studio-mode-rule" color="cyan" />
            <SegButton active={mode === 'verify'} onClick={() => setMode('verify')} label={`🔍 ${t('editor.studioModeVerify')}`} testId="studio-mode-verify" color="emerald" />
            <SegButton active={mode === 'manual'} onClick={() => setMode('manual')} label={`✏️ ${t('editor.studioModeManual')}`} testId="studio-mode-manual" color="amber" />
          </div>

          {/* ── Write target ── */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-white/40 w-16 flex-shrink-0">{t('editor.studioWriteTarget')}</span>
            <SegButton active={writeTarget === 'txt'} onClick={() => setWriteTarget('txt')} label={'📄 ' + t('editor.studioWriteTxt')} testId="studio-target-txt" color="cyan" />
            <SegButton active={writeTarget === 'local'} onClick={() => setWriteTarget('local')} label={'💾 ' + t('editor.studioWriteLocal')} testId="studio-target-local" color="amber" />
          </div>
          {writeTarget === 'local' && (
            <p className="text-[10px] text-amber-300/70 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5 leading-relaxed" data-testid="studio-local-hint">
              ⚠️ {t('editor.studioWriteLocalHint')}
            </p>
          )}

          {/* ── Verify mode info (R59) ──
              What a verify run does + how many songs in scope carry values
              that can be checked. Mirrors the rule-mode info block. */}
          {mode === 'verify' && !isLoading && !ruleRunning && (
            <div className="space-y-1">
              {runSubset.length > 0 ? (
                <p className="text-[11px] text-emerald-300/80 font-medium" data-testid="studio-verify-count">
                  🔍 {t('editor.studioVerifyCount').replace('{count}', String(runSubset.length))}
                </p>
              ) : (
                <p className="text-[11px] text-white/40" data-testid="studio-verify-empty">
                  🔍 {t('editor.studioVerifyNothing')}
                </p>
              )}
              <p className="text-[10px] text-white/40 leading-relaxed">
                {t('editor.studioVerifyHint')}
              </p>
            </div>
          )}

          {/* ── Mode-specific info ── */}
          {mode === 'rule' && !ruleRunning && rulePlan.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] text-cyan-300/80 font-medium">
                {t('editor.ruleHarmonizeCount').replace('{count}', String(rulePlan.length))}
                <span className="text-white/40 font-normal">
                  {' '}(🎸 {ruleGenrePlanCount} · 🌐 {ruleLanguagePlanCount})
                </span>
              </p>
              {/* Non-harmonizable remainder (user item 7): songs the rules
                  can NEVER fix (pseudo-genres) — always visible so the user
                  immediately sees what stays untouched. */}
              {manualReview.length > 0 && (
                <p className="text-[10px] text-amber-300/80">
                  ⚠️ {t('editor.ruleHarmonizeNotFixable').replace('{count}', String(manualReview.length))}
                </p>
              )}
              <div className="max-h-32 overflow-y-auto space-y-1 pr-1 text-[10px] font-mono" data-testid="studio-rule-preview">
                {rulePreview.map(item => (
                  <div key={`${item.field}-${item.songId}`} className="flex items-center gap-1.5 text-white/50">
                    <span className="flex-shrink-0" title={item.field === 'language' ? 'Sprache' : 'Genre'}>
                      {item.field === 'language' ? '🌐' : '🎸'}
                    </span>
                    <span className="truncate flex-1" title={`${item.artist} — ${item.title}`}>
                      {item.field === 'language' ? item.currentLanguage : item.currentGenre}
                    </span>
                    <span className="text-white/30">→</span>
                    <span className="text-cyan-300 truncate">
                      {item.field === 'language' ? item.newLanguage : item.newGenre}
                    </span>
                  </div>
                ))}
                {rulePlan.length > rulePreview.length && (
                  <p className="text-white/30 pt-1">+{rulePlan.length - rulePreview.length} …</p>
                )}
              </div>
            </div>
          )}
          {mode === 'rule' && rulePlan.length === 0 && !ruleRunning && (
            <div className="space-y-1">
              <p className="text-[11px] text-white/40">✅ {t('editor.ruleHarmonizeNothing')}</p>
              {manualReview.length > 0 && (
                <p className="text-[10px] text-amber-300/80">
                  ⚠️ {t('editor.ruleHarmonizeNotFixable').replace('{count}', String(manualReview.length))}
                </p>
              )}
            </div>
          )}

          {/* ── Manual genre correction list (rule mode) ── */}
          {mode === 'rule' && (manualReview.length > 0 || skippedManualCount > 0) && (
            <ManualReviewList
              manualReview={manualReview}
              manualPicks={manualPicks}
              onPickChange={(songId, genre) => setManualPicks(prev => ({ ...prev, [songId]: genre }))}
              onSkipAll={() => {
                stopManualPreview();
                setSkippedManualIds(prev => {
                  const next = new Set(prev);
                  for (const m of manualReview) next.add(m.songId);
                  return next;
                });
                setManualPicks({});
              }}
              onRestoreSkipped={() => setSkippedManualIds(new Set())}
              skippedManualCount={skippedManualCount}
              manualApplyProgress={manualApplyProgress}
              onApply={handleApplyManualPicks}
              onSkipSong={skipManualSong}
              songById={songById}
              allGenres={allGenres}
              previewId={manualPreviewId}
              onTogglePreview={songId => void toggleManualPreview(songId)}
              t={t}
            />
          )}

          {/* ── Manual edit mode (R5-1) ── */}
          {mode === 'manual' && (
            <ManualEditPanel
              scopeSongs={scopeSongs}
              manualEdits={manualEdits}
              onEditChange={(songId, field, value) => setManualEdits(prev => ({
                ...prev,
                [songId]: { ...prev[songId], [field]: value },
              }))}
              manualUpdatesFor={manualUpdatesFor}
              changedCount={manualEditChangedCount}
              applyProgress={manualEditApplyProgress}
              onApply={handleApplyManualEdits}
              fields={fields}
              allGenres={allGenres}
              previewId={manualPreviewId}
              onTogglePreview={songId => void toggleManualPreview(songId)}
              t={t}
            />
          )}

          {/* ── Run / progress ── */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Select-Songs button — moved INTO the studio (user request:
                it only serves the studio, so it lives next to Run). */}
            <Button
              size="sm"
              variant="outline"
              onClick={onToggleSelectMode}
              className={selectMode
                ? 'bg-violet-500 hover:bg-violet-400 border-violet-500 text-white font-semibold text-xs'
                : 'border-violet-400/40 text-violet-300 hover:bg-violet-500/15 hover:border-violet-300 text-xs'}
              data-testid="studio-select-songs"
            >
              {selectMode
                ? `✕ ${t('editor.exitSelectMode')}`
                : `☑️ ${t('editor.enterSelectMode')}${selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}`}
            </Button>

            {/* Deselect — clears the whole multi-selection (user request:
                same prominence as Select, only enabled with a selection). */}
            <Button
              size="sm"
              variant="outline"
              onClick={onClearSelection}
              disabled={selectedIds.size === 0}
              title={selectedIds.size === 0 ? undefined : `${t('editor.studioDeselect')} (${selectedIds.size})`}
              className="border-violet-400/40 text-violet-300 hover:bg-violet-500/15 hover:border-violet-300 text-xs disabled:opacity-40"
              data-testid="studio-deselect-songs"
            >
              {t('editor.studioDeselect')}{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
            </Button>

            {/* Manual mode (R5-1): no Run button — the Apply button inside
                the manual edit list replaces it (direct editing, no AI job). */}
            {mode !== 'manual' && (mode === 'rule' ? (
              <Button
                size="sm"
                onClick={handleRuleStart}
                disabled={ruleRunning || rulePlan.length === 0 || !!applyProgress || (scope === 'selection' && selectedIds.size === 0)}
                className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs"
                data-testid="studio-rule-start"
              >
                🧹 {applyProgress
                  ? `${applyProgress.done}/${applyProgress.total}`
                  : ruleRunning
                    ? `${ruleJob.done}/${ruleJob.total}`
                    : t('editor.ruleHarmonizeStart')}
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleRunClick}
                disabled={isLoading || noFieldsSelected || selectedIds.size === 0}
                title={selectedIds.size === 0 ? t('editor.studioRunNeedsSelection') : undefined}
                className={mode === 'verify'
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs'
                  : 'bg-violet-500 hover:bg-violet-400 text-white font-semibold text-xs'}
                data-testid="studio-run"
              >
                {isLoading ? (
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                ) : null}
                {mode === 'verify' ? `🔍 ${t('editor.studioVerifyStart')}` : t('editor.studioStart')}
                {!isLoading && (mode === 'fill' || mode === 'verify') && runSubset.length > 0 && selectedIds.size > 0 && (
                  <span className="opacity-70">({runSubset.length})</span>
                )}
              </Button>
            ))}

            {/* No selection yet → explicit hint next to the greyed Run.
                Rule mode with scope 'all' needs NO selection (the plan covers
                every song) — showing the hint there made the disabled Run
                feel like "nothing happens" (user item 7). */}
            {mode !== 'manual' && selectedIds.size === 0 && (mode !== 'rule' || scope === 'selection') && (
              <p className="text-[11px] text-amber-300/80">☑️ {t('editor.studioRunNeedsSelection')}</p>
            )}
            {noFieldsSelected && (
              <p className="text-[11px] text-amber-300/80">{t('editor.studioNoFields')}</p>
            )}
          </div>

          {/* ── Loading banner (obvious loading screen while the pipeline
              runs — phase, progress bar, elapsed time, cancel) ── */}
          {(isLoading || ruleRunning) && (
            <div className="rounded-xl border border-violet-500/30 bg-violet-500/[0.07] p-3 space-y-2.5" data-testid="studio-loading-banner">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="inline-block w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                <span className="text-xs font-semibold text-violet-200">
                  {ruleRunning
                    ? t('editor.ruleHarmonizeStart')
                    : progress
                      ? t('editor.studioPhaseLookup')
                      : t('editor.studioPhaseCache')}
                </span>
                <span className="ml-auto font-mono text-[11px] text-white/50 tabular-nums">
                  {ruleRunning
                    ? `${ruleJob.done}/${ruleJob.total}`
                    : progress
                      ? `${progress.done}/${progress.total}`
                      : '…'}
                  {isLoading && runStartedAt !== null && ` · ${elapsedSec}s`}
                </span>
                {isLoading && (
                  <button
                    onClick={handleAbortRun}
                    className="text-[10px] px-2 py-1 rounded-lg border border-red-400/40 text-red-300 hover:bg-red-500/10 transition-colors whitespace-nowrap"
                    data-testid="studio-cancel-job"
                  >
                    {t('editor.studioCancelJob')}
                  </button>
                )}
                {ruleRunning && (
                  <button
                    onClick={() => ruleHarmonizer.abort()}
                    className="text-[10px] px-2 py-1 rounded-lg border border-red-400/40 text-red-300 hover:bg-red-500/10 transition-colors whitespace-nowrap"
                  >
                    {t('editor.ruleHarmonizeAbort')}
                  </button>
                )}
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-400 transition-all duration-300"
                  style={{
                    width: ruleRunning
                      ? `${ruleJob.total > 0 ? Math.round((ruleJob.done / ruleJob.total) * 100) : 0}%`
                      : progress && progress.total > 0
                        ? `${Math.round((progress.done / progress.total) * 100)}%`
                        : '8%',
                  }}
                />
              </div>
              <p className="text-[10px] text-white/40">
                {t('editor.studioLoadingHint')}
              </p>
            </div>
          )}

          {/* ── Rule-harmonization completion banner (user item 7) ──
              Persistent green feedback after the background job finished,
              so a finished harmonization is recognizable at a glance. */}
          {ruleDoneVisible && (
            <div
              className={`flex items-center gap-2 rounded-lg p-2 border ${
                ruleJob.status === 'done'
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-amber-500/10 border-amber-500/30'
              }`}
              data-testid="studio-rule-done"
            >
              <span className="text-sm leading-none">{ruleJob.status === 'done' ? '✅' : '⏹️'}</span>
              <p className={`text-[10px] flex-1 ${ruleJob.status === 'done' ? 'text-emerald-200/90' : 'text-amber-200/90'}`}>
                {ruleJob.status === 'done'
                  ? t('editor.ruleHarmonizeDone')
                      .replace('{done}', String(ruleJob.done))
                      .replace('{errors}', String(ruleJob.errors))
                  : t('editor.ruleHarmonizeAborted')
                      .replace('{done}', String(ruleJob.done))
                      .replace('{total}', String(ruleJob.total))}
              </p>
              <button
                onClick={() => setRuleDoneDismissed(true)}
                className="text-white/40 hover:text-white/80 text-xs"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          )}

          {/* ── Error / stats / local-applied feedback ── */}
          {error && (
            <p className="text-xs text-red-400" data-testid="studio-error">{error}</p>
          )}

          {/* ── Verify run summary (R59) ──
              Quick feedback what the check found: checked vs. flagged count
              above the suggestion list — and a clear all-OK banner when every
              value survived the comparison (a silent empty list would look
              like "nothing happened"). */}
          {mode === 'verify' && stats && !isLoading && suggestions.length > 0 && (
            <p className="text-[10px] text-white/40" data-testid="studio-verify-summary">
              {t('editor.studioVerifySummary')
                .replace('{checked}', String(stats.noChange + suggestions.length))
                .replace('{flagged}', String(suggestions.length))}
            </p>
          )}
          {mode === 'verify' && stats && !isLoading && suggestions.length === 0
            && stats.total > 0 && (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2" data-testid="studio-verify-all-ok">
              <span className="text-sm leading-none">✅</span>
              <p className="text-[10px] text-emerald-200/90 flex-1">
                {t('editor.studioVerifyAllOk').replace('{n}', String(stats.noChange))}
              </p>
            </div>
          )}
          {/* R65 note removed (R66): the degraded-KI notice is obsolete —
              the pipeline is factual-only, languages are simply not
              auto-checked anymore (nothing will "re-check them later"). */}
          {/* R60: how many songs the run NEWLY marked as verified (badge in
              the editor library) — explains where the ✓ badges came from. */}
          {mode === 'verify' && markedVerifiedInfo !== null && !isLoading && (
            <p className="text-[10px] text-emerald-300/80 flex items-center gap-1.5" data-testid="studio-verify-marked">
              <BadgeCheck className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
              {t('editor.studioVerifyMarked').replace('{n}', String(markedVerifiedInfo))}
            </p>
          )}
          {localAppliedInfo !== null && (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2" data-testid="studio-local-applied">
              <span className="text-sm leading-none">💾</span>
              <p className="text-[10px] text-emerald-200/90 flex-1">
                {t('editor.studioLocalApplied').replace('{n}', String(localAppliedInfo))}
              </p>
              <button onClick={() => setLocalAppliedInfo(null)} className="text-white/40 hover:text-white/80 text-xs" aria-label="Dismiss">✕</button>
            </div>
          )}

          {/* ── txt persistence progress + file errors ── */}
          {applyProgress && (
            <div className="flex items-center gap-2 text-[11px] text-white/60">
              <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              <span className="font-mono tabular-nums">
                {t('editor.aiBatchSavingFiles')
                  .replace('{current}', String(applyProgress.done))
                  .replace('{total}', String(applyProgress.total))}
              </span>
            </div>
          )}
          {fileErrors !== null && (
            <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2" data-testid="studio-file-error">
              <span className="text-sm leading-none">⚠️</span>
              <p className="text-[10px] text-amber-200/90 flex-1">
                {t('editor.aiBatchFileErrors').replace('{count}', String(fileErrors))}
              </p>
              <button onClick={() => setFileErrors(null)} className="text-white/40 hover:text-white/80 text-xs" aria-label="Dismiss">✕</button>
            </div>
          )}

          {/* ── Lyrics warm-up indicator (txt mode) ── */}
          {warmupProgress && (
            <div className="flex items-center gap-2 text-[11px] text-white/50">
              <span>📖</span>
              <span className="font-mono tabular-nums">
                {t('editor.aiBatchWarmup')
                  .replace('{current}', String(warmupProgress.done))
                  .replace('{total}', String(warmupProgress.total))}
              </span>
            </div>
          )}

          {/* ── Suggestion list ── */}
          {suggestions.length > 0 && (
            <>
              <div className="flex items-center justify-between gap-2 flex-wrap pb-1 border-b border-white/10">
                {stats && (
                  <p className="text-[10px] text-white/40 truncate">
                    {t('editor.aiBatchStatsLine')
                      .replace('{cache}', String(stats.fromCache))
                      .replace('{facts}', String(stats.factualHits))}
                  </p>
                )}
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1" data-testid="studio-suggestions">
                {suggestions.map(s => (
                  <SuggestionRow
                    key={s.songId}
                    suggestion={s}
                    onApply={handleApplySingle}
                    {...(mode === 'verify' ? {
                      onMarkCorrect: (songId: string) => handleMarkCorrect([songId]),
                      markCorrectLabel: t('editor.studioMarkSongCorrect'),
                      markCorrectHint: t('editor.studioMarkSongCorrectHint'),
                    } : {})}
                  />
                ))}
              </div>
              <div className="flex gap-2 pt-1 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setSuggestions([]); setStats(null); }}
                  className="flex-1 border-white/20 text-white/80 hover:bg-white/10 text-xs"
                  data-testid="studio-dismiss"
                >
                  {t('editor.aiBatchClose')}
                </Button>
                {/* R63: verify mode's 100% path — mark every remaining
                    suggestion song as correct in one click (the user
                    overrules the sources; same effect as clicking the
                    per-row button on each song). */}
                {mode === 'verify' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleMarkCorrect(suggestions.map(s => s.songId))}
                    disabled={suggestions.length === 0 || !!applyProgress}
                    className="flex-1 border-emerald-400/50 text-emerald-300 hover:bg-emerald-500/15 hover:border-emerald-300 text-xs"
                    data-testid="studio-mark-rest-correct"
                  >
                    <BadgeCheck className="w-3 h-3 mr-1" aria-hidden="true" />
                    {t('editor.studioMarkRestCorrect').replace('{n}', String(suggestions.length))}
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() => setShowWarning(true)}
                  disabled={applicableCount === 0 || !!applyProgress}
                  className="flex-1 bg-green-500 hover:bg-green-400 text-black font-semibold text-xs disabled:opacity-40"
                  data-testid="studio-apply-all"
                >
                  {t('editor.aiApplyAll')} ({applicableCount}
                  {applicableCount !== suggestions.length ? `/${suggestions.length}` : ''})
                </Button>
              </div>
            </>
          )}

          {/* ── Apply-all warning (txt mode modifies source files) ── */}
          {showWarning && (
            <ApplyAllWarning
              applicableCount={applicableCount}
              writeTarget={writeTarget}
              applyProgress={applyProgress}
              onCancel={() => setShowWarning(false)}
              onConfirm={handleApplyAll}
              t={t}
            />
          )}

          {/* R50: the big-batch confirmation was removed together with the
              Harmonize-AI mode — the remaining fill/rule/manual modes have
              no batch-size limit (rule mode runs as a background job with
              abort; the "select all" flow in the library carries its own
              time/gameplay warning now). */}
        </div>
      )}
    </div>
  );
}
