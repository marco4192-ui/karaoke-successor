'use client';

/**
 * Left editor panel: Liedtext (lyrics) box on top + compact Shortcuts
 * reference below. Extracted 1:1 from karaoke-editor.tsx (R5 module split) —
 * the orchestrator keeps ownership of the selection/playback state and
 * passes explicit callbacks.
 */

import { BookOpen } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/translations';
import { EditorLyricsTab } from '../editor-lyrics-tab';
import { ShortcutsPanel } from '../shortcuts-panel';
import type { EditorLeftPanelProps } from './types';

export function EditorLeftPanel({
  song,
  currentTime,
  selectedNoteId,
  onNoteSelect,
  onTimeChange,
  onNoteJump,
}: EditorLeftPanelProps) {
  const { t } = useTranslation();

  return (
    <aside className="w-80 flex-shrink-0 bg-slate-900 border-r border-slate-700 flex flex-col min-h-0" data-testid="editor-left-panel">
      {/* Section: Liedtext */}
      <section className="flex-1 min-h-0 flex flex-col">
        <div className="px-3 py-2 bg-slate-800/70 border-b border-slate-700 flex items-center gap-2 shrink-0">
          <BookOpen className="w-3.5 h-3.5 text-purple-400" />
          <h2 className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">{t('editor.leftPanel.lyrics')}</h2>
        </div>
        <div className="flex-1 min-h-0">
          <EditorLyricsTab
            song={song}
            currentTime={currentTime}
            selectedNoteId={selectedNoteId}
            onNoteSelect={onNoteSelect}
            onTimeChange={onTimeChange}
            onNoteJump={onNoteJump}
          />
        </div>
      </section>

      {/* Section: Shortcuts (renamed, punchier labels — R8: compacted) */}
      <section className="flex-shrink-0 max-h-[40%] min-h-0 flex flex-col border-t border-slate-700">
        <div className="flex-1 min-h-0 overflow-y-auto editor-panel-scroll">
          <ShortcutsPanel />
        </div>
      </section>
    </aside>
  );
}
