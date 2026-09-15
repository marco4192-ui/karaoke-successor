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
import { useTranslation } from '@/lib/i18n/translations';

/** One shortcut row: punchy action label + key badge. */
function ShortcutRow({ label, keys, highlight = false }: { label: string; keys: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className={highlight ? 'text-cyan-300 font-medium' : 'text-slate-400'}>{label}</span>
      <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-300 font-mono whitespace-nowrap">
        {keys}
      </kbd>
    </div>
  );
}

export function ShortcutsPanel() {
  const { t } = useTranslation();

  return (
    <div className="p-3 space-y-2.5" data-testid="editor-shortcuts-panel">
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
        <Keyboard className="w-3.5 h-3.5 text-cyan-400" />
        {t('editor.shortcuts.title')}
      </h2>

      {/* Note editing — the most used actions first */}
      <div className="space-y-1.5">
        <ShortcutRow label={t('editor.shortcuts.addNote')} keys="Shift+Click" highlight />
        <ShortcutRow label={t('editor.shortcuts.pitch')} keys="↑ / ↓" />
        <ShortcutRow label={t('editor.shortcuts.pitchOctave')} keys="Shift+↑ / ↓" />
        <ShortcutRow label={t('editor.shortcuts.timing')} keys="← / →" />
        <ShortcutRow label={t('editor.shortcuts.timingCoarse')} keys="Shift+← / →" />
        <ShortcutRow label={t('editor.shortcuts.delete')} keys="Del" highlight />
        <ShortcutRow label={t('editor.shortcuts.merge')} keys="M" />
      </div>

      <div className="border-t border-slate-700/70 pt-2 space-y-1.5">
        <ShortcutRow label={t('editor.shortcuts.playPause')} keys="Space" />
        <ShortcutRow label={t('editor.shortcuts.multiSelect')} keys="Ctrl+Click" />
        <ShortcutRow label={t('editor.shortcuts.copy')} keys="Ctrl+C" />
        <ShortcutRow label={t('editor.shortcuts.paste')} keys="Ctrl+V" />
        <ShortcutRow label={t('editor.shortcuts.undo')} keys="Ctrl+Z" />
        <ShortcutRow label={t('editor.shortcuts.redo')} keys="Ctrl+Y" />
        <ShortcutRow label={t('editor.shortcuts.save')} keys="Ctrl+S" />
        <ShortcutRow label={t('editor.shortcuts.deselect')} keys="Esc" />
      </div>

      <p className="text-[10px] text-slate-600 leading-relaxed border-t border-slate-700/70 pt-2">
        {t('editor.shortcuts.footnote')}
      </p>
    </div>
  );
}
