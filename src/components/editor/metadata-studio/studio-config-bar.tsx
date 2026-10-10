'use client';

/**
 * Studio configuration bar for the Metadata Studio.
 *
 * Split out of metadata-studio.tsx (R3 refactor): the segmented-button /
 * field-toggle UI atoms plus the scope, fields, mode and write-target rows
 * (everything between the collapsible header and the mode-specific panels).
 */

import type {
  StudioFields,
  StudioMode,
  StudioScope,
  StudioTranslate,
  StudioWriteTarget,
} from './types';

interface StudioConfigBarProps {
  scope: StudioScope;
  onScopeChange: (scope: StudioScope) => void;
  mode: StudioMode;
  onModeChange: (mode: StudioMode) => void;
  writeTarget: StudioWriteTarget;
  onWriteTargetChange: (target: StudioWriteTarget) => void;
  fields: StudioFields;
  onToggleField: (key: 'genre' | 'language' | 'year') => void;
  /** Total songs in the library (scope "all" count). */
  songsCount: number;
  /** Current multi-selection size (scope "selection" count). */
  selectionCount: number;
  t: StudioTranslate;
}

export function StudioConfigBar({
  scope,
  onScopeChange,
  mode,
  onModeChange,
  writeTarget,
  onWriteTargetChange,
  fields,
  onToggleField,
  songsCount,
  selectionCount,
  t,
}: StudioConfigBarProps) {
  // ── Small UI atoms ──
  const segButton = (
    active: boolean, onClick: () => void, label: React.ReactNode, testId: string, color = 'violet',
  ) => (
    <button
      onClick={onClick}
      data-testid={testId}
      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all border ${
        active
          ? color === 'violet'
            ? 'bg-violet-500/20 border-violet-500/60 text-violet-200'
            : color === 'cyan'
              ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-200'
              : 'bg-amber-500/20 border-amber-500/60 text-amber-200'
          : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white/80'
      }`}
    >
      {label}
    </button>
  );

  const fieldToggle = (key: 'genre' | 'language' | 'year', icon: string) => (
    <button
      onClick={() => onToggleField(key)}
      aria-pressed={fields[key]}
      data-testid={`studio-field-${key}`}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all border ${
        fields[key]
          ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-200'
          : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
      }`}
    >
      <span>{icon}</span>
      <span>{t(`editor.songInfoTab.${key}`)}</span>
      {fields[key]
        ? <span className="text-emerald-400">✓</span>
        : <span className="text-white/30">○</span>}
    </button>
  );

  return (
    <>
      {/* ── Scope ── */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-white/40 w-16 flex-shrink-0">{t('editor.studioScope')}</span>
        {segButton(scope === 'all', () => onScopeChange('all'),
          t('editor.studioScopeAll').replace('{n}', String(songsCount)), 'studio-scope-all')}
        {segButton(scope === 'selection', () => onScopeChange('selection'),
          t('editor.studioScopeSelection').replace('{n}', String(selectionCount)), 'studio-scope-selection')}
      </div>

      {/* ── Fields ── */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-white/40 w-16 flex-shrink-0">{t('editor.studioFields')}</span>
        {fieldToggle('genre', '🎸')}
        {fieldToggle('language', '🌐')}
        {fieldToggle('year', '📅')}
      </div>

      {/* ── Mode ── */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-white/40 w-16 flex-shrink-0">{t('editor.studioMode')}</span>
        {segButton(mode === 'fill', () => onModeChange('fill'), t('editor.studioModeFill'), 'studio-mode-fill')}
        {segButton(mode === 'harmonize', () => onModeChange('harmonize'), t('editor.studioModeHarmonize'), 'studio-mode-harmonize')}
        {segButton(mode === 'rule', () => onModeChange('rule'), t('editor.studioModeRule'), 'studio-mode-rule', 'cyan')}
        {segButton(mode === 'manual', () => onModeChange('manual'), `✏️ ${t('editor.studioModeManual')}`, 'studio-mode-manual', 'amber')}
      </div>

      {/* ── Write target ── */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-white/40 w-16 flex-shrink-0">{t('editor.studioWriteTarget')}</span>
        {segButton(writeTarget === 'txt', () => onWriteTargetChange('txt'), '📄 ' + t('editor.studioWriteTxt'), 'studio-target-txt', 'cyan')}
        {segButton(writeTarget === 'local', () => onWriteTargetChange('local'), '💾 ' + t('editor.studioWriteLocal'), 'studio-target-local', 'amber')}
      </div>
      {writeTarget === 'local' && (
        <p className="text-[10px] text-amber-300/70 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5 leading-relaxed" data-testid="studio-local-hint">
          ⚠️ {t('editor.studioWriteLocalHint')}
        </p>
      )}
    </>
  );
}
