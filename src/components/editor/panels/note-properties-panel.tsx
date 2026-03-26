'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Music, Star, Zap, Users } from 'lucide-react';
import { midiToNoteName } from '@/types/game';
import type { Note, DuetPlayer } from '@/types/game';

interface NotePropertiesPanelProps {
  selectedNote: Note | undefined;
  updateSelectedNote: (updates: Partial<Note>) => void;
}

export function NotePropertiesPanel({ selectedNote, updateSelectedNote }: NotePropertiesPanelProps) {
  if (!selectedNote) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center text-slate-500">
          <Music className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Wähle eine Note aus</p>
          <p className="text-xs mt-1">Shift+Click zum Hinzufügen</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Lyric */}
        <div className="space-y-2">
          <Label htmlFor="note-lyric" className="text-slate-400 text-xs">Lyric</Label>
          <Input
            id="note-lyric"
            name="note-lyric"
            value={selectedNote.lyric}
            onChange={(e) => updateSelectedNote({ lyric: e.target.value })}
            className="bg-slate-800 border-slate-600"
          />
          <p className="text-xs text-slate-500">
            Tipp: Leerzeichen am Ende = Wortende
          </p>
        </div>

        {/* Pitch */}
        <div className="space-y-2">
          <Label htmlFor="note-pitch" className="text-slate-400 text-xs">Pitch (MIDI: {selectedNote.pitch})</Label>
          <div className="flex items-center gap-2">
            <Input
              id="note-pitch"
              name="note-pitch"
              type="number"
              value={selectedNote.pitch}
              onChange={(e) => updateSelectedNote({ 
                pitch: parseInt(e.target.value),
                frequency: 440 * Math.pow(2, (parseInt(e.target.value) - 69) / 12)
              })}
              min={0}
              max={127}
              className="bg-slate-800 border-slate-600 w-20"
            />
            <span className="text-cyan-400 font-mono text-sm">
              {midiToNoteName(selectedNote.pitch)}
            </span>
          </div>
          <Slider
            value={[selectedNote.pitch]}
            min={36}
            max={84}
            step={1}
            onValueChange={([pitch]) => updateSelectedNote({ 
              pitch,
              frequency: 440 * Math.pow(2, (pitch - 69) / 12)
            })}
            className="mt-2"
          />
        </div>

        {/* Start Time */}
        <div className="space-y-2">
          <Label htmlFor="note-start-time" className="text-slate-400 text-xs">Start Time (ms)</Label>
          <Input
            id="note-start-time"
            name="note-start-time"
            type="number"
            value={Math.round(selectedNote.startTime)}
            onChange={(e) => updateSelectedNote({ startTime: parseInt(e.target.value) })}
            className="bg-slate-800 border-slate-600"
          />
        </div>

        {/* Duration */}
        <div className="space-y-2">
          <Label htmlFor="note-duration" className="text-slate-400 text-xs">Duration (ms)</Label>
          <Input
            id="note-duration"
            name="note-duration"
            type="number"
            value={Math.round(selectedNote.duration)}
            onChange={(e) => updateSelectedNote({ duration: parseInt(e.target.value) })}
            min={50}
            className="bg-slate-800 border-slate-600"
          />
          <Slider
            value={[selectedNote.duration]}
            min={50}
            max={5000}
            step={50}
            onValueChange={([duration]) => updateSelectedNote({ duration })}
            className="mt-2"
          />
        </div>

        {/* Note Type Toggles */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <Label className="text-slate-400 text-xs flex items-center gap-2">
              <Star className="w-3 h-3 text-amber-400" />
              Golden Note
            </Label>
            <Switch
              checked={selectedNote.isGolden}
              onCheckedChange={(checked) => updateSelectedNote({ 
                isGolden: checked,
                isBonus: checked ? false : selectedNote.isBonus
              })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-slate-400 text-xs flex items-center gap-2">
              <Zap className="w-3 h-3 text-pink-400" />
              Bonus Note
            </Label>
            <Switch
              checked={selectedNote.isBonus}
              onCheckedChange={(checked) => updateSelectedNote({ 
                isBonus: checked,
                isGolden: checked ? false : selectedNote.isGolden
              })}
            />
          </div>
        </div>

        {/* Duet Player */}
        <div className="space-y-2 pt-2 border-t border-slate-700">
          <Label className="text-slate-400 text-xs flex items-center gap-2">
            <Users className="w-3 h-3" />
            Spieler
          </Label>
          <Select
            value={selectedNote.player || 'both'}
            onValueChange={(value: DuetPlayer | 'both') => 
              updateSelectedNote({ player: value === 'both' ? undefined : value })
            }
          >
            <SelectTrigger className="bg-slate-800 border-slate-600">
              <SelectValue placeholder="Spieler wählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="both">Beide Spieler</SelectItem>
              <SelectItem value="P1">Spieler 1</SelectItem>
              <SelectItem value="P2">Spieler 2</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Frequency display */}
        <div className="pt-2 border-t border-slate-700">
          <div className="text-xs text-slate-500">
            Frequenz: <span className="text-slate-300">{selectedNote.frequency.toFixed(2)} Hz</span>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
