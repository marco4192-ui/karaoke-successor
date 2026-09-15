'use client';

/**
 * Shortcuts panel (user feedback round R7 — editor UI/UX redesign).
 *
 * The old "Notes & Tools" side panel was dissolved: editing tools moved to
 * the sub-header, note details moved below the timeline. What remains here
 * is the keyboard-shortcut reference — renamed to "Shortcuts", placed in the
 * LEFT panel (below the lyrics box), with punchier, action-first labels.
 */

import { Keyboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/translations';

/** One shortcut row: punchy action label + key badge.
 *  R8: compacted — smaller rows/typography so the reference shrinks. */
function ShortcutRow({ label, keys, highlight = false }: { label: string; keys: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 leading-none">
      <span className={cn('text-[11px]', highlight ? 'text-cyan-300 font-medium' : 'text-slate-400')}>{label}</span>
      <kbd className="px-1 py-px bg-slate-800 border border-slate-700 rounded text-[9px] text-slate-300 font-mono whitespace-nowrap">
        {keys}
      </kbd>
    </div>
  );
}

export function ShortcutsPanel() {
  const { t } = useTranslation();

  return (
    <div className="px-2.5 py-2 space-y-1.5" data-testid="editor-shortcuts-panel">
      <h2 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
        <Keyboard className="w-3 h-3 text-cyan-400" />
        {t('editor.shortcuts.title')}
      </h2>

      {/* Note editing — the most used actions first */}
      <div className="space-y-1">
        <ShortcutRow label={t('editor.shortcuts.addNote')} keys="Shift+Click" highlight />
        <ShortcutRow label={t('editor.shortcuts.pitch')} keys="↑ / ↓" />
        <ShortcutRow label={t('editor.shortcuts.pitchOctave')} keys="Shift+↑ / ↓" />
        <ShortcutRow label={t('editor.shortcuts.timing')} keys="← / →" />
        <ShortcutRow label={t('editor.shortcuts.timingCoarse')} keys="Shift+← / →" />
        <ShortcutRow label={t('editor.shortcuts.delete')} keys="Del" highlight />
        <ShortcutRow label={t('editor.shortcuts.merge')} keys="M" />
      </div>

      <div className="border-t border-slate-700/70 pt-1.5 space-y-1">
        <ShortcutRow label={t('editor.shortcuts.playPause')} keys="Space" />
        <ShortcutRow label={t('editor.shortcuts.multiSelect')} keys="Ctrl+Click" />
        <ShortcutRow label={t('editor.shortcuts.copy')} keys="Ctrl+C" />
        <ShortcutRow label={t('editor.shortcuts.paste')} keys="Ctrl+V" />
        <ShortcutRow label={t('editor.shortcuts.undo')} keys="Ctrl+Z" />
        <ShortcutRow label={t('editor.shortcuts.redo')} keys="Ctrl+Y" />
        <ShortcutRow label={t('editor.shortcuts.save')} keys="Ctrl+S" />
        <ShortcutRow label={t('editor.shortcuts.deselect')} keys="Esc" />
      </div>

      <p className="text-[9px] text-slate-600 leading-snug border-t border-slate-700/70 pt-1.5">
        {t('editor.shortcuts.footnote')}
      </p>
    </div>
  );
}
