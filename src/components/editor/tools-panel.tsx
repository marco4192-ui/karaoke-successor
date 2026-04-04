'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Music, Mic, Star, Zap, Users, Copy, Trash2, Scissors } from 'lucide-react';
import type { Note, DuetPlayer } from '@/types/game';

interface ToolsPanelProps {
  selectedNote: Note | undefined;
  currentTime: number;
  onAddNote: (startTime: number, pitch: number) => void;
  onDuplicateNote: () => void;
  onDeleteNote: () => void;
  onUpdateSelectedNote: (updates: Partial<Note>) => void;
}

export function ToolsPanel({
  selectedNote,
  currentTime,
  onAddNote,
  onDuplicateNote,
  onDeleteNote,
  onUpdateSelectedNote,
}: ToolsPanelProps) {
  return (
    <aside className="w-56 bg-slate-900 border-r border-slate-700 flex flex-col overflow-y-auto flex-shrink-0">
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-sm font-semibold text-slate-300 mb-3">Tools</h2>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => selectedNote && onAddNote(currentTime, selectedNote.pitch)}
            className="justify-start border-slate-600 text-slate-300"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Note
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDuplicateNote}
            disabled={!selectedNote}
            className="justify-start border-slate-600 text-slate-300"
          >
            <Copy className="w-4 h-4 mr-2" />
            Duplicate
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDeleteNote}
            disabled={!selectedNote}
            className="justify-start border-slate-600 text-slate-300 hover:border-red-500 hover:text-red-400"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!selectedNote}
            className="justify-start border-slate-600 text-slate-300"
          >
            <Scissors className="w-4 h-4 mr-2" />
            Split
          </Button>
        </div>
      </div>

      <div className="p-4 border-b border-slate-700">
        <h2 className="text-sm font-semibold text-slate-300 mb-3">Note Type</h2>
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
          <span>Normal</span>
          <span>Golden</span>
          <span>Bonus</span>
        </div>
      </div>

      <div className="p-4 border-b border-slate-700">
        <h2 className="text-sm font-semibold text-slate-300 mb-3">Duet Player</h2>
        <Select
          value={selectedNote?.player || 'both'}
          onValueChange={(value: DuetPlayer | 'both') =>
            onUpdateSelectedNote({ player: value === 'both' ? undefined : value })
          }
          disabled={!selectedNote}
        >
          <SelectTrigger className="bg-slate-800 border-slate-600">
            <SelectValue placeholder="Select player" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="both">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Both Players
              </div>
            </SelectItem>
            <SelectItem value="P1">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-cyan-400" />
                Player 1
              </div>
            </SelectItem>
            <SelectItem value="P2">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-purple-400" />
                Player 2
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Keyboard shortcuts reference */}
      <div className="p-4 mt-auto">
        <h2 className="text-sm font-semibold text-slate-300 mb-3">Shortcuts</h2>
        <div className="space-y-1 text-xs text-slate-500">
          <div className="flex justify-between">
            <span>Play/Pause</span>
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400">Space</kbd>
          </div>
          <div className="flex justify-between">
            <span>Delete Note</span>
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400">Del</kbd>
          </div>
          <div className="flex justify-between">
            <span>Save</span>
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400">Ctrl+S</kbd>
          </div>
          <div className="flex justify-between">
            <span>Undo</span>
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400">Ctrl+Z</kbd>
          </div>
          <div className="flex justify-between">
            <span>Add Note</span>
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400">Shift+Click</kbd>
          </div>
        </div>
      </div>
    </aside>
  );
}
