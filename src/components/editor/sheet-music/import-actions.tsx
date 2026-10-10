'use client';

/**
 * Actions bar of the sheet music dialog: cancel button and the import
 * button (with the inline "replace notes?" confirm when the song
 * already has notes).
 *
 * R13: JSX moved byte-identically from src/components/editor/sheet-music-dialog.tsx
 * (dedented for the component level; the leading "Actions" comment
 * stayed in the orchestrator).
 */
import { Button } from '@/components/ui/button';
import { AlertTriangle, ScanLine } from 'lucide-react';

interface SheetMusicImportActionsProps {
  t: (key: string) => string;
  confirmReplace: boolean;
  setConfirmReplace: (value: boolean) => void;
  canImport: boolean;
  emitImport: () => void;
  handleImportClick: () => void;
  closeDialog: () => void;
}

/** Cancel + import actions incl. the inline replace-confirm. */
export function SheetMusicImportActions({
  t,
  confirmReplace,
  setConfirmReplace,
  canImport,
  emitImport,
  handleImportClick,
  closeDialog,
}: SheetMusicImportActionsProps) {
  return (
    <div className="flex justify-between items-center gap-2 pt-1 flex-wrap">
      <Button
        variant="outline"
        onClick={closeDialog}
        className="border-slate-600 text-slate-400"
      >
        {t('editor.midiImport.cancel')}
      </Button>

      {confirmReplace ? (
        <div
          className="flex items-center gap-2 flex-wrap bg-amber-500/10 border border-amber-500/40 rounded-lg p-2"
          data-testid="sheet-music-replace-confirm"
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-200">
                {t('editor.midiImport.importReplaceTitle')}
              </p>
              <p className="text-xs text-slate-400">
                {t('editor.midiImport.sheetMusic.importReplaceHint')}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmReplace(false)}
            className="border-slate-600 text-slate-300"
          >
            {t('editor.midiImport.cancel')}
          </Button>
          <Button
            size="sm"
            onClick={emitImport}
            className="bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white"
            data-testid="sheet-music-replace-confirm-button"
          >
            {t('editor.midiImport.confirm')}
          </Button>
        </div>
      ) : (
        <Button
          onClick={handleImportClick}
          disabled={!canImport}
          className="bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-700 hover:to-purple-700 disabled:opacity-50"
          data-testid="sheet-music-import-button"
        >
          <ScanLine className="w-4 h-4" />
          {t('editor.midiImport.sheetMusic.import')}
        </Button>
      )}
    </div>
  );
}
