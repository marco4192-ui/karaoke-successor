'use client';

/**
 * Right-side sliding sidebar with the header tab panels
 * (metadata / audio analysis / AI assistant). Extracted 1:1 from
 * karaoke-editor.tsx (R5 module split) — docked to the right of the editor
 * body instead of a top dropdown that squeezed the timeline; content scrolls
 * naturally inside the aside.
 */

import { X } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/translations';
import { EditorSongInfoTab } from '../editor-song-info-tab';
import { EditorMetadataTab } from '../editor-metadata-tab';
import { AudioAnalysisPanel } from '../audio-analysis-panel';
import { AIAssistantPanel } from '../panels/ai-assistant-panel';
import type { EditorHeaderPanelSidebarProps } from './types';

export function EditorHeaderPanelSidebar({
  activePanel,
  song,
  allNotesCount,
  analysisAudioPath,
  onClose,
  onSongChange,
  onMarkDirty,
  onApplyNotes,
  onApplyBpm,
  onSongUpdate,
  onLyricsUpdate,
}: EditorHeaderPanelSidebarProps) {
  const { t } = useTranslation();

  return (
    <aside
      className="w-96 flex-shrink-0 overflow-y-auto border-l border-white/10 bg-slate-900/95 animate-in slide-in-from-right duration-300 editor-panel-scroll"
      data-testid={`editor-header-panel-${activePanel}`}
    >
      {/* Small header row: panel title + close */}
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 px-3 py-2 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-300 truncate">
          {activePanel === 'metadata'
            ? t('editor.header.panelMetadata')
            : activePanel === 'analysis'
              ? t('editor.header.panelAnalysis')
              : t('editor.header.panelAI')}
        </h2>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md bg-slate-800/80 hover:bg-slate-700 border border-slate-600 transition-colors shrink-0"
          title={t('editor.header.closePanel')}
          aria-label={t('editor.header.closePanel')}
        >
          <X className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>

      {activePanel === 'metadata' && (
        <div className="grid grid-cols-1 divide-y divide-slate-700">
          <EditorSongInfoTab
            song={song}
            allNotesCount={allNotesCount}
            onSongChange={onSongChange}
            onSetUnsavedChanges={() => onMarkDirty()}
          />
          <EditorMetadataTab
            song={song}
            onSongChange={onSongChange}
            onSetUnsavedChanges={() => onMarkDirty()}
          />
        </div>
      )}

      {activePanel === 'analysis' && (
        <AudioAnalysisPanel
          audioFilePath={analysisAudioPath}
          onApplyNotes={onApplyNotes}
          onApplyBpm={onApplyBpm}
        />
      )}

      {activePanel === 'ai' && (
        <AIAssistantPanel
          song={song}
          onSongUpdate={onSongUpdate}
          onLyricsUpdate={onLyricsUpdate}
        />
      )}
    </aside>
  );
}
