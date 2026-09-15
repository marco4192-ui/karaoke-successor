'use client';

/**
 * Editor Sub-Header (user feedback round R7 — editor UI/UX redesign).
 *
 * A compact toolbar directly below the main editor header, ABOVE the pitch
 * lanes. Everything note-related that used to be buried in the left
 * "Notes & Tools" side panel lives here now:
 *
 *   [ + Add Note ] [ Duplicate ] [ Delete ] [ Split ] [ Merge ]  |  [ : * F R G ]  |  [ Voice ▾ ] [ All −1 +1 ]  |  [ TAP MODE ]
 *
 * - The note-type segmented control sets the type for NEW notes (default
 *   Normal). When notes are selected, clicking a type ALSO changes the
 *   selected notes' type (dual-purpose, YASS-style).
 * - The voice dropdown assigns P1/P2/P4/P8 (P4 = 3rd voice, P8 = 4th voice)
 *   to the current selection.
 * - Transpose is deliberately reduced to "all notes −1 / +1" — individual
 *   notes can be transposed with ↑/↓ or by dragging them vertically.
 * - Tap Mode is colorfully highlighted (gradient + pulse while holding).
 */

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import {
  Plus, Copy, Trash2, Scissors, Merge, Users, Mic, ArrowUpDown, Hand, Music, Star, Zap, Mic2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/translations';
import { NOTE_TYPE_CHARS, type NoteType, type DuetPlayer } from '@/types/game';

export interface TapModeState {
  isActive: boolean;
  isHolding: boolean;
  notesPlaced: number;
  nextLyricIndex: number;
  toggleTapMode: () => void;
  resetSession: () => void;
}

interface EditorSubHeaderProps {
  /** Note type used for NEW notes (segmented control state). */
  activeNoteType: NoteType;
  /** Select a note type: sets it as add-default AND applies it to the selection. */
  onSelectNoteType: (_type: NoteType) => void;
  /** Effective selection size (0 = nothing selected). */
  selectedCount: number;
  /** Player of the primary selected note (for the voice dropdown). */
  selectedPlayer: DuetPlayer | undefined;
  onAddNote: () => void;
  onDuplicateNote: () => void;
  onDeleteNote: () => void;
  onSplitNote: () => void;
  onMergeNote: () => void;
  onPlayerChange: (_player: DuetPlayer | undefined) => void;
  /** Transpose ALL notes of the song by ±semitones (single undo step). */
  onTransposeAll: (_delta: number) => void;
  tapMode: TapModeState;
}

const NOTE_TYPE_BUTTONS: Array<{
  type: NoteType;
  icon: React.ComponentType<{ className?: string }>;
  labelKey: string;
  activeClass: string;
}> = [
  { type: 'normal', icon: Music, labelKey: 'editor.noteType.normal', activeClass: 'bg-cyan-600 hover:bg-cyan-500 border-cyan-400 text-white' },
  { type: 'golden', icon: Star, labelKey: 'editor.noteType.golden', activeClass: 'bg-amber-500 hover:bg-amber-400 border-amber-300 text-amber-950' },
  { type: 'freestyle', icon: Zap, labelKey: 'editor.noteType.freestyle', activeClass: 'bg-pink-600 hover:bg-pink-500 border-pink-400 text-white' },
  { type: 'rap', icon: Mic2, labelKey: 'editor.noteType.rap', activeClass: 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400 text-white' },
  { type: 'rapGolden', icon: Star, labelKey: 'editor.noteType.rapGolden', activeClass: 'bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 border-amber-300 text-white' },
];

export function EditorSubHeader({
  activeNoteType,
  onSelectNoteType,
  selectedCount,
  selectedPlayer,
  onAddNote,
  onDuplicateNote,
  onDeleteNote,
  onSplitNote,
  onMergeNote,
  onPlayerChange,
  onTransposeAll,
  tapMode,
}: EditorSubHeaderProps) {
  const { t } = useTranslation();
  const hasSelection = selectedCount > 0;
  const addLabel = activeNoteType === 'normal'
    ? t('editor.subHeader.addNote')
    : `${t('editor.subHeader.addNote')} (${t(`editor.noteType.${activeNoteType}`)})`;

  const toolButton = (
    label: string,
    icon: React.ReactNode,
    onClick: () => void,
    disabled: boolean,
    testId: string,
    extraClass?: string,
  ) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          onClick={onClick}
          disabled={disabled}
          data-testid={testId}
          className={cn(
            'h-8 px-2.5 gap-1.5 border-slate-600 text-slate-300 hover:text-white hover:bg-white/10 whitespace-nowrap disabled:opacity-40',
            extraClass,
          )}
        >
          {icon}
          <span className="hidden lg:inline text-xs">{label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );

  return (
    <div
      className="flex flex-wrap items-center gap-1.5 px-3 py-1.5 bg-slate-900/95 border-b border-slate-700 flex-shrink-0 min-h-[44px]"
      data-testid="editor-sub-header"
    >
      {/* ── Editing tools ── */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="sm"
            onClick={onAddNote}
            data-testid="editor-sub-add-note"
            className="h-8 px-2.5 gap-1.5 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-semibold whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="text-xs">{addLabel}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{t('editor.subHeader.addNoteHint')}</TooltipContent>
      </Tooltip>

      {toolButton(t('editor.subHeader.duplicate'), <Copy className="w-3.5 h-3.5" />, onDuplicateNote, !hasSelection, 'editor-sub-duplicate')}
      {toolButton(t('editor.subHeader.delete'), <Trash2 className="w-3.5 h-3.5" />, onDeleteNote, !hasSelection, 'editor-sub-delete', 'hover:border-red-500 hover:text-red-400')}
      {toolButton(t('editor.subHeader.split'), <Scissors className="w-3.5 h-3.5" />, onSplitNote, !hasSelection, 'editor-sub-split')}
      {toolButton(t('editor.subHeader.merge'), <Merge className="w-3.5 h-3.5" />, onMergeNote, !hasSelection, 'editor-sub-merge')}

      <div className="w-px h-6 bg-slate-700 mx-0.5" aria-hidden />

      {/* ── Note type (segmented — sets add default AND re-types selection) ── */}
      <div
        className="flex items-center gap-1 rounded-lg bg-slate-800/80 border border-slate-700 p-0.5"
        role="group"
        aria-label={t('editor.subHeader.noteType')}
        data-testid="editor-sub-note-types"
      >
        {NOTE_TYPE_BUTTONS.map(({ type, icon: Icon, labelKey, activeClass }) => {
          const isActive = activeNoteType === type;
          return (
            <Tooltip key={type}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onSelectNoteType(type)}
                  aria-pressed={isActive}
                  data-testid={`editor-sub-type-${type}`}
                  className={cn(
                    'h-7 min-w-[32px] px-1.5 rounded-md border flex items-center justify-center gap-1 transition-all',
                    isActive
                      ? activeClass
                      : 'border-transparent text-slate-400 hover:bg-slate-700 hover:text-white',
                  )}
                >
                  <span className="font-mono text-xs font-bold">{NOTE_TYPE_CHARS[type]}</span>
                  <Icon className="w-3 h-3 hidden xl:block" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <div className="text-xs">
                  <span className="font-semibold">{t(labelKey)}</span>
                  <span className="block text-white/60">
                    {hasSelection ? t('editor.subHeader.typeAppliesSelection') : t('editor.subHeader.typeUsedForAdd')}
                  </span>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      <div className="w-px h-6 bg-slate-700 mx-0.5" aria-hidden />

      {/* ── Voice assignment (P1/P2/P4/P8) ── */}
      <Select
        value={selectedPlayer || 'both'}
        onValueChange={(value: DuetPlayer | 'both') => onPlayerChange(value === 'both' ? undefined : value)}
        disabled={!hasSelection}
      >
        <SelectTrigger
          className="h-8 w-auto min-w-[130px] gap-1 bg-slate-800 border-slate-600 text-slate-300 data-[state=open]:text-white text-xs disabled:opacity-40"
          data-testid="editor-sub-player-select"
          aria-label={t('editor.subHeader.voice')}
        >
          <Users className="w-3.5 h-3.5 text-slate-500" />
          <SelectValue placeholder={t('editor.subHeader.voice')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="both">
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5" />
              {t('editor.subHeader.allVoices')}
            </div>
          </SelectItem>
          <SelectItem value="P1">
            <div className="flex items-center gap-2">
              <Mic className="w-3.5 h-3.5 text-cyan-400" />
              {t('editor.subHeader.player1')}
            </div>
          </SelectItem>
          <SelectItem value="P2">
            <div className="flex items-center gap-2">
              <Mic className="w-3.5 h-3.5 text-purple-400" />
              {t('editor.subHeader.player2')}
            </div>
          </SelectItem>
          <SelectItem value="P4">
            <div className="flex items-center gap-2">
              <Mic className="w-3.5 h-3.5 text-emerald-400" />
              {t('editor.subHeader.player3')}
            </div>
          </SelectItem>
          <SelectItem value="P8">
            <div className="flex items-center gap-2">
              <Mic className="w-3.5 h-3.5 text-orange-400" />
              {t('editor.subHeader.player4')}
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      {/* ── Transpose all notes (reduced to ±1 — per-note moves via drag/↑↓).
          R8: music symbols in front — ♭ (flat) = down a semitone,
          ♯ (sharp) = up a semitone, matching the classic notation. ── */}
      <div className="flex items-center gap-0.5 rounded-lg bg-slate-800/80 border border-slate-700 p-0.5">
        <ArrowUpDown className="w-3 h-3 text-slate-500 mx-1 hidden xl:block" aria-hidden />
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onTransposeAll(-1)}
          title={`${t('editor.subHeader.transposeAll')}: ♭ −1`}
          aria-label={`${t('editor.subHeader.transposeAll')}: ♭ −1`}
          data-testid="editor-sub-transpose-all-minus-1"
          className="h-7 px-2 font-mono text-xs text-slate-300 hover:text-purple-300 hover:bg-purple-500/15 gap-1"
        >
          <span className="text-slate-400" aria-hidden>♭</span>−1
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onTransposeAll(1)}
          title={`${t('editor.subHeader.transposeAll')}: ♯ +1`}
          aria-label={`${t('editor.subHeader.transposeAll')}: ♯ +1`}
          data-testid="editor-sub-transpose-all-plus-1"
          className="h-7 px-2 font-mono text-xs text-slate-300 hover:text-purple-300 hover:bg-purple-500/15 gap-1"
        >
          <span className="text-slate-400" aria-hidden>♯</span>+1
        </Button>
      </div>

      <div className="w-px h-6 bg-slate-700 mx-0.5" aria-hidden />

      {/* ── Tap Mode — colorfully highlighted ── */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="sm"
            onClick={tapMode.toggleTapMode}
            aria-pressed={tapMode.isActive}
            data-testid="editor-sub-tap-mode"
            className={cn(
              'h-8 px-3 gap-1.5 font-semibold whitespace-nowrap transition-all',
              tapMode.isActive
                ? 'bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 hover:from-green-400 hover:via-emerald-400 hover:to-teal-400 text-white shadow-lg shadow-emerald-500/30 ring-1 ring-emerald-300/60'
                : 'border border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300',
            )}
          >
            <Hand className={cn('w-4 h-4', tapMode.isActive && 'animate-bounce')} />
            <span className="text-xs">
              {tapMode.isActive ? t('editor.subHeader.tapModeOn') : t('editor.subHeader.tapModeOff')}
            </span>
            {tapMode.isActive && (
              <span className="ml-1 px-1.5 py-0.5 rounded bg-black/30 text-[10px] font-mono" data-testid="editor-sub-tap-count">
                {tapMode.notesPlaced}
              </span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{t('editor.subHeader.tapModeHint')}</TooltipContent>
      </Tooltip>

      {/* Live tap status (only while tap mode is active) */}
      {tapMode.isActive && (
        <span
          className={cn(
            'text-[10px] px-2 py-1 rounded font-medium animate-fade-in whitespace-nowrap',
            tapMode.isHolding ? 'bg-green-500/30 text-green-300 animate-pulse' : 'bg-slate-800 text-slate-400',
          )}
          data-testid="editor-sub-tap-status"
        >
          {tapMode.isHolding ? t('editor.subHeader.tapHold') : t('editor.subHeader.tapPress')} · {t('editor.subHeader.tapNext')} #{tapMode.nextLyricIndex}
        </span>
      )}
    </div>
  );
}
