'use client';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Music, Mic, Star, Zap, Users, Copy, Trash2, Scissors, Hand } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useTranslation } from '@/lib/i18n/translations';
import type { Note, DuetPlayer } from '@/types/game';

interface ToolsPanelProps {
  selectedNote: Note | undefined;
  currentTime: number;
  onAddNote: (_startTime: number, _pitch: number) => void;
  onDuplicateNote: () => void;
  onDeleteNote: () => void;
  onSplitNote: () => void;
  onUpdateSelectedNote: (_updates: Partial<Note>) => void;
  tapMode?: {
    isActive: boolean;
    isHolding: boolean;
    notesPlaced: number;
    nextLyricIndex: number;
    toggleTapMode: () => void;
    resetSession: () => void;
  };
}

export function ToolsPanel({
  selectedNote,
  currentTime,
  onAddNote,
  onDuplicateNote,
  onDeleteNote,
  onSplitNote,
  onUpdateSelectedNote,
  tapMode,
}: ToolsPanelProps) {
  const { t } = useTranslation();
  return (
    <aside className="w-56 bg-slate-900 border-r border-slate-700 flex flex-col overflow-y-auto flex-shrink-0">
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-sm font-semibold text-slate-300 mb-3">{t('editor.toolsPanel.tools')}</h2>
        <div className="grid grid-cols-2 gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAddNote(currentTime, selectedNote?.pitch ?? 60)}
                className="justify-start border-slate-600 text-slate-300 whitespace-nowrap overflow-hidden"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                <span className="truncate">{t('editor.toolsPanel.addNote')}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">{t('editor.toolsPanel.addNote')}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onDuplicateNote}
                disabled={!selectedNote}
                className="justify-start border-slate-600 text-slate-300 whitespace-nowrap overflow-hidden"
              >
                <Copy className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                <span className="truncate">{t('editor.toolsPanel.duplicate')}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">{t('editor.toolsPanel.duplicateNote')}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onDeleteNote}
                disabled={!selectedNote}
                className="justify-start border-slate-600 text-slate-300 hover:border-red-500 hover:text-red-400 whitespace-nowrap overflow-hidden"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                <span className="truncate">{t('editor.toolsPanel.delete')}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">{t('editor.toolsPanel.deleteNote')}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onSplitNote}
                disabled={!selectedNote}
                className="justify-start border-slate-600 text-slate-300 whitespace-nowrap overflow-hidden"
              >
                <Scissors className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                <span className="truncate">{t('editor.toolsPanel.split')}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">{t('editor.toolsPanel.splitNote')}</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="p-4 border-b border-slate-700">
        <h2 className="text-sm font-semibold text-slate-300 mb-3">{t('editor.toolsPanel.noteType')}</h2>
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant={selectedNote && !selectedNote.isGolden && !selectedNote.isBonus ? 'default' : 'outline'}
            size="sm"
            onClick={() => onUpdateSelectedNote({ isGolden: false, isBonus: false })}
            className="bg-cyan-600 hover:bg-cyan-700"
          >
            <Music className="w-4 h-4" />
          </Button>
          <Button
            variant={selectedNote?.isGolden ? 'default' : 'outline'}
            size="sm"
            onClick={() => onUpdateSelectedNote({ isGolden: true, isBonus: false })}
            className="bg-amber-600 hover:bg-amber-700"
          >
            <Star className="w-4 h-4" />
          </Button>
          <Button
            variant={selectedNote?.isBonus ? 'default' : 'outline'}
            size="sm"
            onClick={() => onUpdateSelectedNote({ isGolden: false, isBonus: true })}
            className="bg-pink-600 hover:bg-pink-700"
          >
            <Zap className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex justify-between text-xs text-slate-500 mt-2">
          <span>{t('editor.toolsPanel.normal')}</span>
          <span>{t('editor.toolsPanel.golden')}</span>
          <span>{t('editor.toolsPanel.bonus')}</span>
        </div>
      </div>

      <div className="p-4 border-b border-slate-700">
        <h2 className="text-sm font-semibold text-slate-300 mb-3">{t('editor.toolsPanel.duetPlayer')}</h2>
        <Select
          value={selectedNote?.player || 'both'}
          onValueChange={(value: DuetPlayer | 'both') =>
            onUpdateSelectedNote({ player: value === 'both' ? undefined : value })
          }
          disabled={!selectedNote}
        >
          <SelectTrigger className="bg-slate-800 border-slate-600">
            <SelectValue placeholder={t('editor.toolsPanel.selectPlayer')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="both">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                {t('editor.toolsPanel.bothPlayers')}
              </div>
            </SelectItem>
            <SelectItem value="P1">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-cyan-400" />
                {t('editor.toolsPanel.player1')}
              </div>
            </SelectItem>
            <SelectItem value="P2">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-purple-400" />
                {t('editor.toolsPanel.player2')}
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tap Note Placement Mode */}
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
          <Hand className="w-3.5 h-3.5" />
          {t('editor.toolsPanel.tapMode')}
        </h2>
        <Button
          variant={tapMode?.isActive ? 'default' : 'outline'}
          size="sm"
          onClick={tapMode?.toggleTapMode}
          className={tapMode?.isActive
            ? 'bg-green-600 hover:bg-green-700 w-full justify-start'
            : 'w-full justify-start border-slate-600 text-slate-300'
          }
        >
          <Hand className="w-4 h-4 mr-2" />
          {tapMode?.isActive ? t('editor.toolsPanel.tapModeOn') : t('editor.toolsPanel.tapModeOff')}
        </Button>
        {tapMode?.isActive && (
          <div className="mt-2 space-y-1.5">
            <div className={`text-xs px-2 py-1.5 rounded ${tapMode.isHolding ? 'bg-green-500/30 text-green-300 animate-pulse' : 'bg-slate-800 text-slate-400'}`}>
              {tapMode.isHolding ? t('editor.toolsPanel.holdSpace') : t('editor.toolsPanel.pressSpace')}
            </div>
            <div className="text-xs text-slate-500 flex justify-between">
              <span>{t('editor.toolsPanel.notesCount')}: {tapMode.notesPlaced}</span>
              <span>{t('editor.toolsPanel.nextBeat')}: #{tapMode.nextLyricIndex}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={tapMode.resetSession}
              className="w-full text-slate-500 hover:text-slate-300 text-xs mt-1"
            >
              {t('editor.toolsPanel.resetCounter')}
            </Button>
          </div>
        )}
        {!tapMode?.isActive && (
          <p className="text-xs text-slate-600 mt-2">
            {t('editor.toolsPanel.tapModeDesc')}
          </p>
        )}
      </div>

      {/* Keyboard shortcuts reference */}
      <div className="p-4 mt-auto">
        <h2 className="text-sm font-semibold text-slate-300 mb-3">{t('editor.toolsPanel.shortcuts')}</h2>
        <div className="space-y-1 text-xs text-slate-500">
          <div className="flex justify-between">
            <span>{t('editor.toolsPanel.playPause')}</span>
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400">Space</kbd>
          </div>
          <div className="flex justify-between">
            <span>{t('editor.toolsPanel.deleteNote')}</span>
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400">Del</kbd>
          </div>
          <div className="flex justify-between">
            <span>{t('editor.toolsPanel.save')}</span>
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400">Ctrl+S</kbd>
          </div>
          <div className="flex justify-between">
            <span>{t('editor.toolsPanel.undo')}</span>
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400">Ctrl+Z</kbd>
          </div>
          <div className="flex justify-between">
            <span>{t('editor.toolsPanel.addNote')}</span>
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400">Shift+Click</kbd>
          </div>
        </div>
      </div>
    </aside>
  );
}
