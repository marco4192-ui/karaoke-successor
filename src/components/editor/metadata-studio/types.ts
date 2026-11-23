import type { Song } from '@/types/game';

/** Scope of a studio run: the whole library or the current multi-selection. */
export type StudioScope = 'all' | 'selection';

/** Studio mode: fill missing values (factual lookup), rule-based
 *  harmonization, direct manual editing, or verify existing values. */
export type StudioMode = 'fill' | 'rule' | 'manual' | 'verify';

/** Where applied changes are written: into the UltraStar txt (survives a
 *  library reset) or game-local only (wiped by the reset). */
export type StudioWriteTarget = 'txt' | 'local';

/** Shared progress shape ({done, total}) used by all apply loops. */
export interface StudioApplyProgress {
  done: number;
  total: number;
}

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
