'use client';

import { useCallback, useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Music, Star, Zap, Users } from 'lucide-react';
import type { Note, DuetPlayer } from '@/types/game';
import { midiToNoteName } from '@/types/game';
import { midiPitchToFrequency } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/translations';
import type { NoteHistoryMode } from './timeline/timeline';

interface EditorNoteTabProps {
  selectedNote: Note;
  onUpdateSelectedNote: (_updates: Partial<Note>, _mode?: NoteHistoryMode) => void;
  /** Push the accumulated live changes as one history entry (blur / commit) */
  onCommitHistory: () => void;
  /** Debounced auto-commit (used while typing) */
  onScheduleCommit: () => void;
}

/**
 * Parses a number input safely. Returns null for empty/invalid input so the
 * caller can skip the update instead of poisoning the song with NaN.
 */
function parseNumberInput(value: string): number | null {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export function EditorNoteTab({ selectedNote, onUpdateSelectedNote, onCommitHistory, onScheduleCommit }: EditorNoteTabProps) {
  const { t } = useTranslation();

  // Local draft for the lyric input — commits on blur/Enter, live-updates while typing
  const [lyricDraft, setLyricDraft] = useState(selectedNote.lyric);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- sync draft when the selected note changes
  useEffect(() => {
    setLyricDraft(selectedNote.lyric);
  }, [selectedNote.id, selectedNote.lyric]);

  const commitLyric = useCallback(() => {
    if (lyricDraft !== selectedNote.lyric) {
      onUpdateSelectedNote({ lyric: lyricDraft.trim() === '' ? '---' : lyricDraft.trim() }, 'push');
    }
    onCommitHistory();
  }, [lyricDraft, selectedNote.lyric, onUpdateSelectedNote, onCommitHistory]);

  const handleLyricKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      setLyricDraft(selectedNote.lyric);
      e.currentTarget.blur();
    }
    e.stopPropagation();
  }, [selectedNote.lyric]);

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Lyric */}
        <div className="space-y-2">
          <Label htmlFor="note-lyric" className="text-slate-400 text-xs">{t('editor.noteTab.lyric')}</Label>
          <Input
            id="note-lyric"
            name="note-lyric"
            value={lyricDraft}
            onChange={(e) => {
              setLyricDraft(e.target.value);
              // Live-update the note (no history push per keystroke)
              onUpdateSelectedNote({ lyric: e.target.value }, 'live');
              onScheduleCommit();
            }}
            onBlur={commitLyric}
            onKeyDown={handleLyricKeyDown}
            className="bg-slate-800 border-slate-600"
          />
          <p className="text-xs text-slate-500">
            {t('editor.noteTab.spaceTip')}
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
              onChange={(e) => {
                const pitch = parseNumberInput(e.target.value);
                if (pitch === null) return;
                onUpdateSelectedNote({
                  pitch: Math.max(0, Math.min(127, Math.round(pitch))),
                  frequency: midiPitchToFrequency(pitch)
                }, 'live');
              }}
              onBlur={onCommitHistory}
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
            onValueChange={([pitch]) => onUpdateSelectedNote({
              pitch,
              frequency: midiPitchToFrequency(pitch)
            }, 'live')}
            onValueCommit={() => onCommitHistory()}
            className="mt-2"
          />
        </div>

        {/* Start Time */}
        <div className="space-y-2">
          <Label htmlFor="note-start-time" className="text-slate-400 text-xs">{t('editor.noteTab.startTime')}</Label>
          <Input
            id="note-start-time"
            name="note-start-time"
            type="number"
            value={Math.round(selectedNote.startTime)}
            onChange={(e) => {
              const startTime = parseNumberInput(e.target.value);
              if (startTime === null) return;
              onUpdateSelectedNote({ startTime: Math.max(0, Math.round(startTime)) }, 'live');
            }}
            onBlur={onCommitHistory}
            className="bg-slate-800 border-slate-600"
          />
        </div>

        {/* Duration */}
        <div className="space-y-2">
          <Label htmlFor="note-duration" className="text-slate-400 text-xs">{t('editor.noteTab.duration')}</Label>
          <Input
            id="note-duration"
            name="note-duration"
            type="number"
            value={Math.round(selectedNote.duration)}
            onChange={(e) => {
              const duration = parseNumberInput(e.target.value);
              if (duration === null) return;
              onUpdateSelectedNote({ duration: Math.max(50, Math.round(duration)) }, 'live');
            }}
            onBlur={onCommitHistory}
            min={50}
            className="bg-slate-800 border-slate-600"
          />
          <Slider
            value={[selectedNote.duration]}
            min={50}
            max={5000}
            step={50}
            onValueChange={([duration]) => onUpdateSelectedNote({ duration }, 'live')}
            onValueCommit={() => onCommitHistory()}
            className="mt-2"
          />
        </div>

        {/* Note Type Toggles */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <Label className="text-slate-400 text-xs flex items-center gap-2">
              <Star className="w-3 h-3 text-amber-400" />
              {t('editor.noteTab.goldenNote')}
            </Label>
            <Switch
              checked={selectedNote.isGolden}
              onCheckedChange={(checked) => onUpdateSelectedNote({
                isGolden: checked,
                isBonus: checked ? false : selectedNote.isBonus
              }, 'push')}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-slate-400 text-xs flex items-center gap-2">
              <Zap className="w-3 h-3 text-pink-400" />
              {t('editor.noteTab.bonusNote')}
            </Label>
            <Switch
              checked={selectedNote.isBonus}
              onCheckedChange={(checked) => onUpdateSelectedNote({
                isBonus: checked,
                isGolden: checked ? false : selectedNote.isGolden
              }, 'push')}
            />
          </div>
        </div>

        {/* Duet Player */}
        <div className="space-y-2 pt-2 border-t border-slate-700">
          <Label className="text-slate-400 text-xs flex items-center gap-2">
            <Users className="w-3 h-3" />
            {t('editor.noteTab.player')}
          </Label>
          <Select
            value={selectedNote.player || 'both'}
            onValueChange={(value: DuetPlayer | 'both') =>
              onUpdateSelectedNote({ player: value === 'both' ? undefined : value }, 'push')
            }
          >
            <SelectTrigger className="bg-slate-800 border-slate-600">
              <SelectValue placeholder={t('editor.noteTab.playerPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="both">{t('editor.noteTab.bothPlayers')}</SelectItem>
              <SelectItem value="P1">{t('editor.noteTab.player1')}</SelectItem>
              <SelectItem value="P2">{t('editor.noteTab.player2')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Frequency display */}
        <div className="pt-2 border-t border-slate-700">
          <div className="text-xs text-slate-500">
            {t('editor.noteTab.frequency')} <span className="text-slate-300">{selectedNote.frequency.toFixed(2)} Hz</span>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

export function EditorNoteTabPlaceholder() {
  const { t } = useTranslation();
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="text-center text-slate-500">
        <Music className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p className="text-sm">{t('editor.noteTab.selectNote')}</p>
        <p className="text-xs mt-1">{t('editor.noteTab.shiftClickHint')}</p>
      </div>
    </div>
  );
}
