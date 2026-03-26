'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users } from 'lucide-react';
import type { Song } from '@/types/game';

interface SongInfoPanelProps {
  currentSong: Song;
  setCurrentSong: React.Dispatch<React.SetStateAction<Song>>;
  setHasUnsavedChanges: (value: boolean) => void;
}

export function SongInfoPanel({ currentSong, setCurrentSong, setHasUnsavedChanges }: SongInfoPanelProps) {
  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="song-title" className="text-slate-400 text-xs">Titel</Label>
          <Input
            id="song-title"
            name="song-title"
            value={currentSong.title}
            onChange={(e) => {
              setCurrentSong(prev => ({ ...prev, title: e.target.value }));
              setHasUnsavedChanges(true);
            }}
            className="bg-slate-800 border-slate-600"
          />
        </div>

        {/* Artist */}
        <div className="space-y-2">
          <Label htmlFor="song-artist" className="text-slate-400 text-xs">Künstler</Label>
          <Input
            id="song-artist"
            name="song-artist"
            value={currentSong.artist}
            onChange={(e) => {
              setCurrentSong(prev => ({ ...prev, artist: e.target.value }));
              setHasUnsavedChanges(true);
            }}
            className="bg-slate-800 border-slate-600"
          />
        </div>

        {/* BPM */}
        <div className="space-y-2">
          <Label htmlFor="song-bpm" className="text-slate-400 text-xs">BPM</Label>
          <Input
            id="song-bpm"
            name="song-bpm"
            type="number"
            value={currentSong.bpm}
            onChange={(e) => {
              setCurrentSong(prev => ({ ...prev, bpm: parseFloat(e.target.value) || 120 }));
              setHasUnsavedChanges(true);
            }}
            min={20}
            max={300}
            step={0.01}
            className="bg-slate-800 border-slate-600"
          />
          <p className="text-xs text-slate-500">Beats pro Minute</p>
        </div>

        {/* GAP */}
        <div className="space-y-2">
          <Label htmlFor="song-gap" className="text-slate-400 text-xs">GAP (ms)</Label>
          <Input
            id="song-gap"
            name="song-gap"
            type="number"
            value={currentSong.gap}
            onChange={(e) => {
              setCurrentSong(prev => ({ ...prev, gap: parseInt(e.target.value) || 0 }));
              setHasUnsavedChanges(true);
            }}
            className="bg-slate-800 border-slate-600"
          />
          <p className="text-xs text-slate-500">Verzögerung vor Lyrics-Start</p>
        </div>

        {/* START */}
        <div className="space-y-2">
          <Label htmlFor="song-start" className="text-slate-400 text-xs">START (ms)</Label>
          <Input
            id="song-start"
            name="song-start"
            type="number"
            value={currentSong.start || 0}
            onChange={(e) => {
              setCurrentSong(prev => ({ ...prev, start: parseInt(e.target.value) || undefined }));
              setHasUnsavedChanges(true);
            }}
            className="bg-slate-800 border-slate-600"
          />
          <p className="text-xs text-slate-500">Zeit überspringen am Anfang</p>
        </div>

        <Separator className="bg-slate-700" />

        {/* Video URL */}
        <div className="space-y-2">
          <Label htmlFor="song-video" className="text-slate-400 text-xs">Video URL</Label>
          <Input
            id="song-video"
            name="song-video"
            value={currentSong.videoBackground || currentSong.youtubeUrl || ''}
            onChange={(e) => {
              const url = e.target.value;
              const isYoutube = url.includes('youtube.com') || url.includes('youtu.be');
              setCurrentSong(prev => ({
                ...prev,
                videoBackground: isYoutube ? undefined : url,
                youtubeUrl: isYoutube ? url : undefined,
              }));
              setHasUnsavedChanges(true);
            }}
            placeholder="YouTube URL oder lokaler Pfad"
            className="bg-slate-800 border-slate-600"
          />
        </div>

        {/* Video Gap */}
        <div className="space-y-2">
          <Label htmlFor="song-videogap" className="text-slate-400 text-xs">Video GAP (ms)</Label>
          <Input
            id="song-videogap"
            name="song-videogap"
            type="number"
            value={currentSong.videoGap || 0}
            onChange={(e) => {
              setCurrentSong(prev => ({ ...prev, videoGap: parseInt(e.target.value) || undefined }));
              setHasUnsavedChanges(true);
            }}
            className="bg-slate-800 border-slate-600"
          />
          <p className="text-xs text-slate-500">Video-Versatz zur Audio</p>
        </div>

        <Separator className="bg-slate-700" />

        {/* Genre */}
        <div className="space-y-2">
          <Label htmlFor="song-genre" className="text-slate-400 text-xs">Genre</Label>
          <Input
            id="song-genre"
            name="song-genre"
            value={currentSong.genre || ''}
            onChange={(e) => {
              setCurrentSong(prev => ({ ...prev, genre: e.target.value || undefined }));
              setHasUnsavedChanges(true);
            }}
            className="bg-slate-800 border-slate-600"
          />
        </div>

        {/* Year */}
        <div className="space-y-2">
          <Label htmlFor="song-year" className="text-slate-400 text-xs">Jahr</Label>
          <Input
            id="song-year"
            name="song-year"
            type="number"
            value={currentSong.year || ''}
            onChange={(e) => {
              setCurrentSong(prev => ({ ...prev, year: parseInt(e.target.value) || undefined }));
              setHasUnsavedChanges(true);
            }}
            placeholder="z.B. 2024"
            className="bg-slate-800 border-slate-600"
          />
        </div>

        {/* Language */}
        <div className="space-y-2">
          <Label htmlFor="song-language" className="text-slate-400 text-xs">Sprache</Label>
          <Select
            value={currentSong.language || ''}
            onValueChange={(value) => {
              setCurrentSong(prev => ({ ...prev, language: value || undefined }));
              setHasUnsavedChanges(true);
            }}
          >
            <SelectTrigger className="bg-slate-800 border-slate-600">
              <SelectValue placeholder="Sprache wählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="de">Deutsch</SelectItem>
              <SelectItem value="en">Englisch</SelectItem>
              <SelectItem value="es">Spanisch</SelectItem>
              <SelectItem value="fr">Französisch</SelectItem>
              <SelectItem value="it">Italienisch</SelectItem>
              <SelectItem value="pt">Portugiesisch</SelectItem>
              <SelectItem value="ja">Japanisch</SelectItem>
              <SelectItem value="ko">Koreanisch</SelectItem>
              <SelectItem value="zh">Chinesisch</SelectItem>
              <SelectItem value="ru">Russisch</SelectItem>
              <SelectItem value="other">Andere</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Edition */}
        <div className="space-y-2">
          <Label htmlFor="song-edition" className="text-slate-400 text-xs">Edition / Album</Label>
          <Input
            id="song-edition"
            name="song-edition"
            value={currentSong.album || ''}
            onChange={(e) => {
              setCurrentSong(prev => ({ ...prev, album: e.target.value || undefined }));
              setHasUnsavedChanges(true);
            }}
            className="bg-slate-800 border-slate-600"
          />
        </div>

        <Separator className="bg-slate-700" />

        {/* Duet Settings */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-slate-400 text-xs flex items-center gap-2">
              <Users className="w-3 h-3" />
              Duet Mode
            </Label>
            <Switch
              checked={currentSong.isDuet || false}
              onCheckedChange={(checked) => {
                setCurrentSong(prev => ({ 
                  ...prev, 
                  isDuet: checked,
                  duetPlayerNames: checked ? (prev.duetPlayerNames || ['Player 1', 'Player 2']) : undefined
                }));
                setHasUnsavedChanges(true);
              }}
            />
          </div>
          
          {currentSong.isDuet && (
            <>
              <div className="space-y-2">
                <Label className="text-slate-400 text-xs">Spieler 1 Name</Label>
                <Input
                  value={currentSong.duetPlayerNames?.[0] || ''}
                  onChange={(e) => {
                    setCurrentSong(prev => ({
                      ...prev,
                      duetPlayerNames: [e.target.value, prev.duetPlayerNames?.[1] || 'Player 2']
                    }));
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="Spieler 1"
                  className="bg-slate-800 border-slate-600 h-8"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-400 text-xs">Spieler 2 Name</Label>
                <Input
                  value={currentSong.duetPlayerNames?.[1] || ''}
                  onChange={(e) => {
                    setCurrentSong(prev => ({
                      ...prev,
                      duetPlayerNames: [prev.duetPlayerNames?.[0] || 'Player 1', e.target.value]
                    }));
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="Spieler 2"
                  className="bg-slate-800 border-slate-600 h-8"
                />
              </div>
            </>
          )}
        </div>

        {/* Statistics */}
        <div className="pt-4 border-t border-slate-700">
          <div className="text-xs text-slate-500 space-y-1">
            <div className="flex justify-between">
              <span>Notes:</span>
              <span className="text-slate-300">{currentSong.lyrics.reduce((acc, line) => acc + line.notes.length, 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>Lines:</span>
              <span className="text-slate-300">{currentSong.lyrics.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Duration:</span>
              <span className="text-slate-300">{Math.round(currentSong.duration / 1000)}s</span>
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
