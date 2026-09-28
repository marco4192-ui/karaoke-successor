/**
 * Shared types for the Metadata Studio.
 *
 * Split out of metadata-studio.tsx (R3 refactor): the studio scope/mode/
 * write-target types, the orchestrator's props interface and the small
 * shapes the extracted sub-components exchange. The orchestrator
 * (metadata-studio.tsx) re-exports the public types so existing imports
 * from '@/components/editor/metadata-studio' keep working.
 */

import type { Song } from '@/types/game';

export type StudioScope = 'all' | 'selection';
export type StudioMode = 'fill' | 'harmonize' | 'rule' | 'manual';
export type StudioWriteTarget = 'txt' | 'local';

/** Translation callback passed down from the editor screen. */
export type StudioTranslate = (key: string) => string;

export interface MetadataStudioProps {
  songs: Song[];
  /** Current multi-selection (select mode) — live counts in the scope toggle. */
  selectedIds: Set<string>;
  /** Expanded state is lifted so the floating select bar can open the studio. */
  open: boolean;
  onToggle: () => void;
  /** Incremented when opened from the select bar → re-focus the "selection" scope. */
  selectionFocusToken?: number;
  /** Select mode is live (song cards show checkboxes) — the Select-Songs
   *  button inside the studio toggles it (user request: the button belongs
   *  to the studio, placed next to Run). */
  selectMode: boolean;
  onToggleSelectMode: () => void;
  /** Clears the whole multi-selection (Deselect button next to Select-Songs). */
  onClearSelection: () => void;
  onApplied: () => void;
  t: (key: string) => string;
}

/** Which metadata fields an action covers (independent toggles). */
export interface StudioFields {
  genre: boolean;
  language: boolean;
  year: boolean;
}

/** Simple done/total pair used by all apply/warmup progress indicators. */
export interface StudioProgress {
  done: number;
  total: number;
}

/** Raw manual-edit draft values for one song (unedited fields stay unset). */
export interface ManualEditDraft {
  genre?: string;
  language?: string;
  year?: string;
}
