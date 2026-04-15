'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Song } from '@/types/game';

interface EditorMetadataTabProps {
  song: Song;
  onSongChange: (updater: (prev: Song) => Song) => void;
  onSetUnsavedChanges: () => void;
}

export function EditorMetadataTab({ song, onSongChange, onSetUnsavedChanges }: EditorMetadataTabProps) {
  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <div className="text-xs text-slate-400 mb-2">
          UltraStar TXT Metadaten - werden direkt in die Datei gespeichert
        </div>

        {/* VERSION */}
        <div className="space-y-2">
          <Label htmlFor="meta-version" className="text-slate-400 text-xs">#VERSION:</Label>
          <Input
            id="meta-version"
            value={song.version || ''}
            onChange={(e) => {
              onSongChange(prev => ({ ...prev, version: e.target.value || undefined }));
              onSetUnsavedChanges();
            }}
            placeholder="z.B. 1.0.0"
            className="bg-slate-800 border-slate-600 h-8"
          />
        </div>

        {/* CREATOR */}
        <div className="space-y-2">
          <Label htmlFor="meta-creator" className="text-slate-400 text-xs">#CREATOR:</Label>
          <Input
            id="meta-creator"
            value={song.creator || ''}
            onChange={(e) => {
              onSongChange(prev => ({ ...prev, creator: e.target.value || undefined }));
              onSetUnsavedChanges();
            }}
            placeholder="Ersteller der TXT-Datei"
            className="bg-slate-800 border-slate-600 h-8"
          />
        </div>

        <Separator className="bg-slate-700" />

        {/* MP3 File */}
        <div className="space-y-2">
          <Label htmlFor="meta-mp3" className="text-slate-400 text-xs">#MP3:</Label>
          <Input
            id="meta-mp3"
            value={song.mp3File || ''}
            onChange={(e) => {
              onSongChange(prev => ({ ...prev, mp3File: e.target.value || undefined }));
              onSetUnsavedChanges();
            }}
            placeholder="song.mp3"
            className="bg-slate-800 border-slate-600 h-8"
          />
        </div>

        {/* COVER File */}
        <div className="space-y-2">
          <Label htmlFor="meta-cover" className="text-slate-400 text-xs">#COVER:</Label>
          <Input
            id="meta-cover"
            value={song.coverFile || ''}
            onChange={(e) => {
              onSongChange(prev => ({ ...prev, coverFile: e.target.value || undefined }));
              onSetUnsavedChanges();
            }}
            placeholder="cover.jpg"
            className="bg-slate-800 border-slate-600 h-8"
          />
        </div>

        {/* BACKGROUND File */}
        <div className="space-y-2">
          <Label htmlFor="meta-background" className="text-slate-400 text-xs">#BACKGROUND:</Label>
          <Input
            id="meta-background"
            value={song.backgroundFile || ''}
            onChange={(e) => {
              onSongChange(prev => ({ ...prev, backgroundFile: e.target.value || undefined }));
              onSetUnsavedChanges();
            }}
            placeholder="background.jpg"
            className="bg-slate-800 border-slate-600 h-8"
          />
        </div>

        {/* VIDEO File */}
        <div className="space-y-2">
          <Label htmlFor="meta-video" className="text-slate-400 text-xs">#VIDEO:</Label>
          <Input
            id="meta-video"
            value={song.videoFile || ''}
            onChange={(e) => {
              onSongChange(prev => ({ ...prev, videoFile: e.target.value || undefined }));
              onSetUnsavedChanges();
            }}
            placeholder="video.mp4"
            className="bg-slate-800 border-slate-600 h-8"
          />
        </div>

        <Separator className="bg-slate-700" />

        {/* PREVIEWSTART */}
        <div className="space-y-2">
          <Label htmlFor="meta-previewstart" className="text-slate-400 text-xs">#PREVIEWSTART: (Sekunden)</Label>
          <Input
            id="meta-previewstart"
            type="number"
            value={song.previewStart ?? ''}
            onChange={(e) => {
              onSongChange(prev => ({ ...prev, previewStart: parseFloat(e.target.value) || undefined }));
              onSetUnsavedChanges();
            }}
            placeholder="z.B. 30"
            className="bg-slate-800 border-slate-600 h-8"
          />
        </div>

        {/* PREVIEWDURATION */}
        <div className="space-y-2">
          <Label htmlFor="meta-previewduration" className="text-slate-400 text-xs">#PREVIEWDURATION: (Sekunden)</Label>
          <Input
            id="meta-previewduration"
            type="number"
            value={song.previewDuration ?? ''}
            onChange={(e) => {
              onSongChange(prev => ({ ...prev, previewDuration: parseFloat(e.target.value) || undefined }));
              onSetUnsavedChanges();
            }}
            placeholder="z.B. 15"
            className="bg-slate-800 border-slate-600 h-8"
          />
        </div>

        <Separator className="bg-slate-700" />

        {/* MEDLEYSTARTBEAT */}
        <div className="space-y-2">
          <Label htmlFor="meta-medleystart" className="text-slate-400 text-xs">#MEDLEYSTARTBEAT:</Label>
          <Input
            id="meta-medleystart"
            type="number"
            value={song.medleyStartBeat ?? ''}
            onChange={(e) => {
              onSongChange(prev => ({ ...prev, medleyStartBeat: parseInt(e.target.value) || undefined }));
              onSetUnsavedChanges();
            }}
            placeholder="Beat-Nummer"
            className="bg-slate-800 border-slate-600 h-8"
          />
        </div>

        {/* MEDLEYENDBEAT */}
        <div className="space-y-2">
          <Label htmlFor="meta-medleyend" className="text-slate-400 text-xs">#MEDLEYENDBEAT:</Label>
          <Input
            id="meta-medleyend"
            type="number"
            value={song.medleyEndBeat ?? ''}
            onChange={(e) => {
              onSongChange(prev => ({ ...prev, medleyEndBeat: parseInt(e.target.value) || undefined }));
              onSetUnsavedChanges();
            }}
            placeholder="Beat-Nummer"
            className="bg-slate-800 border-slate-600 h-8"
          />
        </div>

        <Separator className="bg-slate-700" />

        {/* END */}
        <div className="space-y-2">
          <Label htmlFor="meta-end" className="text-slate-400 text-xs">#END: (Millisekunden)</Label>
          <Input
            id="meta-end"
            type="number"
            value={song.end ?? ''}
            onChange={(e) => {
              onSongChange(prev => ({ ...prev, end: parseInt(e.target.value) || undefined }));
              onSetUnsavedChanges();
            }}
            placeholder="Song-Ende in ms"
            className="bg-slate-800 border-slate-600 h-8"
          />
        </div>

        {/* TAGS */}
        <div className="space-y-2">
          <Label htmlFor="meta-tags" className="text-slate-400 text-xs">#TAGS:</Label>
          <Input
            id="meta-tags"
            value={song.tags || ''}
            onChange={(e) => {
              onSongChange(prev => ({ ...prev, tags: e.target.value || undefined }));
              onSetUnsavedChanges();
            }}
            placeholder="tag1, tag2, tag3"
            className="bg-slate-800 border-slate-600 h-8"
          />
          <p className="text-xs text-slate-500">Kommagetrennte Tags</p>
        </div>

        <Separator className="bg-slate-700" />

        {/* P1 / P2 Names for Duet */}
        <div className="space-y-2">
          <Label htmlFor="meta-p1" className="text-slate-400 text-xs">#P1: (Duet Spieler 1)</Label>
          <Input
            id="meta-p1"
            value={song.duetPlayerNames?.[0] || ''}
            onChange={(e) => {
              onSongChange(prev => ({
                ...prev,
                isDuet: true,
                duetPlayerNames: [e.target.value, prev.duetPlayerNames?.[1] || 'Player 2']
              }));
              onSetUnsavedChanges();
            }}
            placeholder="Spieler 1 Name"
            className="bg-slate-800 border-slate-600 h-8"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="meta-p2" className="text-slate-400 text-xs">#P2: (Duet Spieler 2)</Label>
          <Input
            id="meta-p2"
            value={song.duetPlayerNames?.[1] || ''}
            onChange={(e) => {
              onSongChange(prev => ({
                ...prev,
                isDuet: true,
                duetPlayerNames: [prev.duetPlayerNames?.[0] || 'Player 1', e.target.value]
              }));
              onSetUnsavedChanges();
            }}
            placeholder="Spieler 2 Name"
            className="bg-slate-800 border-slate-600 h-8"
          />
        </div>
      </div>
    </ScrollArea>
  );
}
