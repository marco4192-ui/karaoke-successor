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

interface EditorSongInfoTabProps {
  song: Song;
  allNotesCount: number;
  onSongChange: (updater: (prev: Song) => Song) => void;
  onSetUnsavedChanges: () => void;
}

export function EditorSongInfoTab({ song, allNotesCount, onSongChange, onSetUnsavedChanges }: EditorSongInfoTabProps) {
  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="song-title" className="text-slate-400 text-xs">Titel</Label>
          <Input
            id="song-title"
            name="song-title"
            value={song.title}
            onChange={(e) => {
              onSongChange(prev => ({ ...prev, title: e.target.value }));
              onSetUnsavedChanges();
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
            value={song.artist}
            onChange={(e) => {
              onSongChange(prev => ({ ...prev, artist: e.target.value }));
              onSetUnsavedChanges();
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
            value={song.bpm}
            onChange={(e) => {
              onSongChange(prev => ({ ...prev, bpm: parseFloat(e.target.value) || 120 }));
              onSetUnsavedChanges();
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
            value={song.gap}
            onChange={(e) => {
              onSongChange(prev => ({ ...prev, gap: parseInt(e.target.value) || 0 }));
              onSetUnsavedChanges();
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
            value={song.start || 0}
            onChange={(e) => {
              onSongChange(prev => ({ ...prev, start: parseInt(e.target.value) || undefined }));
              onSetUnsavedChanges();
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
            value={song.videoBackground || song.youtubeUrl || ''}
            onChange={(e) => {
              const url = e.target.value;
              const isYoutube = url.includes('youtube.com') || url.includes('youtu.be');
              onSongChange(prev => ({
                ...prev,
                videoBackground: isYoutube ? undefined : url,
                youtubeUrl: isYoutube ? url : undefined,
              }));
              onSetUnsavedChanges();
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
            value={song.videoGap || 0}
            onChange={(e) => {
              onSongChange(prev => ({ ...prev, videoGap: parseInt(e.target.value) || undefined }));
              onSetUnsavedChanges();
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
            value={song.genre || ''}
            onChange={(e) => {
              onSongChange(prev => ({ ...prev, genre: e.target.value || undefined }));
              onSetUnsavedChanges();
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
            value={song.year || ''}
            onChange={(e) => {
              onSongChange(prev => ({ ...prev, year: parseInt(e.target.value) || undefined }));
              onSetUnsavedChanges();
            }}
            placeholder="z.B. 2024"
            className="bg-slate-800 border-slate-600"
          />
        </div>

        {/* Language */}
        <div className="space-y-2">
          <Label htmlFor="song-language" className="text-slate-400 text-xs">Sprache</Label>
          <Select
            value={song.language || ''}
            onValueChange={(value) => {
              onSongChange(prev => ({ ...prev, language: value || undefined }));
              onSetUnsavedChanges();
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
            value={song.album || ''}
            onChange={(e) => {
              onSongChange(prev => ({ ...prev, album: e.target.value || undefined }));
              onSetUnsavedChanges();
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
              checked={song.isDuet || false}
              onCheckedChange={(checked) => {
                onSongChange(prev => ({
                  ...prev,
                  isDuet: checked,
                  duetPlayerNames: checked ? (prev.duetPlayerNames || ['Player 1', 'Player 2']) : undefined
                }));
                onSetUnsavedChanges();
              }}
            />
          </div>

          {song.isDuet && song.duetPlayerNames && (
            <div className="space-y-2 pl-2">
              <div className="space-y-1">
                <Label className="text-slate-500 text-xs">Spieler 1 Name</Label>
                <Input
                  value={song.duetPlayerNames[0]}
                  onChange={(e) => {
                    onSongChange(prev => ({
                      ...prev,
                      duetPlayerNames: [e.target.value, prev.duetPlayerNames?.[1] || 'Player 2']
                    }));
                    onSetUnsavedChanges();
                  }}
                  className="bg-slate-800 border-slate-600 h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-slate-500 text-xs">Spieler 2 Name</Label>
                <Input
                  value={song.duetPlayerNames[1]}
                  onChange={(e) => {
                    onSongChange(prev => ({
                      ...prev,
                      duetPlayerNames: [prev.duetPlayerNames?.[0] || 'Player 1', e.target.value]
                    }));
                    onSetUnsavedChanges();
                  }}
                  className="bg-slate-800 border-slate-600 h-8"
                />
              </div>
            </div>
          )}
        </div>

        <Separator className="bg-slate-700" />

        {/* File Info */}
        <div className="text-xs text-slate-500 space-y-1">
          <div>Dauer: <span className="text-slate-300">{Math.round(song.duration / 1000)}s</span></div>
          <div>Noten: <span className="text-slate-300">{allNotesCount}</span></div>
          <div>Zeilen: <span className="text-slate-300">{song.lyrics.length}</span></div>
          {song.relativeTxtPath && (
            <div>Datei: <span className="text-slate-300">{song.relativeTxtPath}</span></div>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}
