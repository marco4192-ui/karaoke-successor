'use client';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Save, Undo, Redo, CheckCircle, AlertCircle, MonitorPlay,
  Settings, Waves, Sparkles,
} from 'lucide-react';
import type { SaveResult } from '@/lib/editor/save-to-file';
import { useTranslation } from '@/lib/i18n/translations';
import { FullscreenButton } from '@/components/game/hud/fullscreen-button';
import { cn } from '@/lib/utils';

/** Header dropdown panels — one at a time, toggled from the header bar. */
export type EditorHeaderPanel = 'none' | 'metadata' | 'analysis' | 'ai';

interface EditorHeaderProps {
  title: string;
  artist: string;
  saveResult: SaveResult | null;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onCancel: () => void;
  onSave: () => void;           // Save & close (original behaviour)
  onSaveOnly?: () => void;      // Save only, stay in editor
  /** Video sync overlay toggle (only shown when the song has a video) */
  hasVideo?: boolean;
  showVideoOverlay?: boolean;
  onToggleVideoOverlay?: () => void;
  /** Active header dropdown panel (metadata / audio analysis / AI assistant) */
  activePanel?: EditorHeaderPanel;
  onTogglePanel?: (_panel: EditorHeaderPanel) => void;
}

export function EditorHeader({
  title,
  artist,
  saveResult,
  hasUnsavedChanges,
  isSaving,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onCancel,
  onSave,
  onSaveOnly,
  hasVideo = false,
  showVideoOverlay = false,
  onToggleVideoOverlay,
  activePanel = 'none',
  onTogglePanel,
}: EditorHeaderProps) {
  const { t } = useTranslation();

  const panelButton = (panel: EditorHeaderPanel, icon: React.ReactNode, label: string, testId: string) => {
    const isActive = activePanel === panel;
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onTogglePanel?.(panel)}
        title={label}
        aria-pressed={isActive}
        data-testid={testId}
        className={cn(
          'gap-1.5 h-8 px-2.5 transition-all',
          isActive
            ? 'text-cyan-300 bg-cyan-500/15 hover:bg-cyan-500/25 hover:text-cyan-200'
            : 'text-slate-400 hover:text-white hover:bg-white/10',
        )}
      >
        {icon}
        <span className="hidden xl:inline text-xs font-medium">{label}</span>
      </Button>
    );
  };

  return (
    <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-4 py-2 bg-slate-900 border-b border-slate-700 flex-shrink-0">
      <div className="flex items-center gap-4 min-w-0">
        <h1 className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent whitespace-nowrap">
          {t('editor.title')}
        </h1>
        <div className="text-sm text-slate-400 min-w-0 truncate">
          <span className="text-white">{title}</span>
          <span className="mx-2">-</span>
          <span>{artist}</span>
        </div>
      </div>

      <div className="flex items-center gap-1 flex-wrap">
        {/* Save Status */}
        {saveResult && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
            saveResult.success
              ? 'bg-green-500/20 text-green-400'
              : 'bg-red-500/20 text-red-400'
          }`}>
            {saveResult.success
              ? <CheckCircle className="w-3 h-3" />
              : <AlertCircle className="w-3 h-3" />
            }
            <span className="max-w-[220px] truncate">{saveResult.message}</span>
          </div>
        )}
        {hasUnsavedChanges && !saveResult && (
          <span className="text-xs text-yellow-400">{t('editor.header.unsavedChanges')}</span>
        )}

        {/* ── Header dropdown panels ── */}

        {/* Metadaten: song info + #TXT tags */}
        {onTogglePanel && panelButton(
          'metadata',
          <Settings className="w-4 h-4" />,
          t('editor.header.panelMetadata'),
          'editor-panel-metadata-toggle',
        )}

        {/* Audio-Analyse */}
        {onTogglePanel && panelButton(
          'analysis',
          <Waves className="w-4 h-4" />,
          t('editor.header.panelAnalysis'),
          'editor-panel-analysis-toggle',
        )}

        {/* KI-Assistent */}
        {onTogglePanel && panelButton(
          'ai',
          <Sparkles className="w-4 h-4" />,
          t('editor.header.panelAI'),
          'editor-panel-ai-toggle',
        )}

        {/* Video sync overlay toggle — sync notes with the song's video */}
        {onToggleVideoOverlay && hasVideo && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleVideoOverlay}
            title={t('editor.videoOverlay.toggle')}
            className={cn(
              'h-8 w-8 p-0',
              showVideoOverlay
                ? 'text-cyan-400 bg-cyan-500/15 hover:bg-cyan-500/25 hover:text-cyan-300'
                : 'text-slate-400 hover:text-white hover:bg-white/10',
            )}
            data-testid="editor-video-overlay-toggle"
            aria-pressed={showVideoOverlay}
          >
            <MonitorPlay className="w-4 h-4" />
          </Button>
        )}

        <Separator orientation="vertical" className="h-6 mx-1 bg-slate-700 hidden sm:block" />

        <Button
          variant="ghost"
          size="sm"
          onClick={onUndo}
          disabled={!canUndo}
          className="text-slate-400 hover:text-white h-8 px-2"
          title={t('editor.header.undo')}
        >
          <Undo className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRedo}
          disabled={!canRedo}
          className="text-slate-400 hover:text-white h-8 px-2"
          title={t('editor.header.redo')}
        >
          <Redo className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="text-slate-400 hover:text-white h-8 px-3"
          data-testid="editor-cancel-button"
        >
          {t('common.cancel')}
        </Button>

        {/* Save only — stay in editor */}
        {onSaveOnly && (
          <Button
            size="sm"
            variant="outline"
            onClick={onSaveOnly}
            disabled={isSaving}
            className="border-slate-600 text-slate-300 hover:text-white hover:border-slate-400 h-8"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin mr-1" />
                {t('editor.header.saving')}
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">{t('editor.header.save')}</span>
              </>
            )}
          </Button>
        )}
        {/* Save & close */}
        <Button
          size="sm"
          onClick={onSave}
          disabled={isSaving}
          className="bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-700 hover:to-purple-700 h-8"
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
              {t('editor.header.saving')}
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-1" />
              {t('editor.header.saveAndExit')}
            </>
          )}
        </Button>
        <FullscreenButton />
      </div>
    </header>
  );
}
