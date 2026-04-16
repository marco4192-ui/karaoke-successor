'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Save, XCircle, Undo, Redo, CheckCircle, AlertCircle } from 'lucide-react';
import type { SaveResult } from '@/lib/editor/save-to-file';

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
}: EditorHeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-700 flex-shrink-0">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
          Karaoke Editor
        </h1>
        <div className="text-sm text-slate-400">
          <span className="text-white">{title}</span>
          <span className="mx-2">-</span>
          <span>{artist}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
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
            {saveResult.message}
          </div>
        )}
        {hasUnsavedChanges && !saveResult && (
          <span className="text-xs text-yellow-400">Ungespeicherte Änderungen</span>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onUndo}
          disabled={!canUndo}
          className="text-slate-400 hover:text-white"
        >
          <Undo className="w-4 h-4 mr-1" />
          Undo
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRedo}
          disabled={!canRedo}
          className="text-slate-400 hover:text-white"
        >
          <Redo className="w-4 h-4 mr-1" />
          Redo
        </Button>
        <Separator orientation="vertical" className="h-6 mx-2 bg-slate-700" />
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="text-slate-400 hover:text-white"
        >
          Cancel
        </Button>
        {/* Save only — stay in editor */}
        {onSaveOnly && (
          <Button
            size="sm"
            variant="outline"
            onClick={onSaveOnly}
            disabled={isSaving}
            className="border-slate-600 text-slate-300 hover:text-white hover:border-slate-400"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin mr-1" />
                Speichere...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-1" />
                Speichern
              </>
            )}
          </Button>
        )}
        {/* Save & close */}
        <Button
          size="sm"
          onClick={onSave}
          disabled={isSaving}
          className="bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-700 hover:to-purple-700"
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
              Speichere...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-1" />
              Speichern &amp; Beenden
            </>
          )}
        </Button>
      </div>
    </header>
  );
}
