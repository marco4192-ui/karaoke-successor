'use client';

/**
 * Cancel confirmation modal of the editor (guard against losing unsaved
 * changes). Extracted 1:1 from karaoke-editor.tsx (R5 module split) — the
 * orchestrator keeps the visibility state and composes the button actions.
 */

import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n/translations';
import type { EditorCancelConfirmDialogProps } from './types';

export function EditorCancelConfirmDialog({
  isSaving,
  onKeepEditing,
  onDiscard,
  onSave,
}: EditorCancelConfirmDialogProps) {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-white/20 rounded-xl p-5 max-w-md w-full mx-4 space-y-4 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-xl">⚠️</span>
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">{t('editor.header.cancelConfirmTitle')}</h3>
            <p className="text-white/60 text-xs mt-0.5">{t('editor.header.cancelConfirmDesc')}</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onKeepEditing}
            className="flex-1 border-white/20 text-white/80 hover:bg-white/10"
            data-testid="editor-cancel-keep-button"
          >
            {t('editor.header.cancelConfirmKeep')}
          </Button>
          <Button
            variant="outline"
            onClick={onDiscard}
            className="flex-1 border-red-500/40 text-red-400 hover:bg-red-500/10"
            data-testid="editor-cancel-discard-button"
          >
            {t('editor.header.cancelConfirmDiscard')}
          </Button>
          <Button
            onClick={onSave}
            disabled={isSaving}
            className="flex-1 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-700 hover:to-purple-700"
            data-testid="editor-cancel-save-button"
          >
            {t('editor.header.cancelConfirmSave')}
          </Button>
        </div>
      </div>
    </div>
  );
}
