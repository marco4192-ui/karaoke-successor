'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Song } from '@/types/game';

interface MetadataPanelProps {
  currentSong: Song;
  setCurrentSong: React.Dispatch<React.SetStateAction<Song>>;
  setHasUnsavedChanges: (value: boolean) => void;
}

export function MetadataPanel({ currentSong, setCurrentSong, setHasUnsavedChanges }: MetadataPanelProps) {
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
            value={currentSong.version || ''}
            onChange={(e) => {
              setCurrentSong(prev => ({ ...prev, version: e.target.value || undefined }));
              setHasUnsavedChanges(true);
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
            value={currentSong.creator || ''}
            onChange={(e) => {
              setCurrentSong(prev => ({ ...prev, creator: e.target.value || undefined }));
              setHasUnsavedChanges(true);
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
            value={currentSong.mp3File || ''}
            onChange={(e) => {
              setCurrentSong(prev => ({ ...prev, mp3File: e.target.value || undefined }));
              setHasUnsavedChanges(true);
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
            value={currentSong.coverFile || ''}
            onChange={(e) => {
              setCurrentSong(prev => ({ ...prev, coverFile: e.target.value || undefined }));
              setHasUnsavedChanges(true);
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
            value={currentSong.backgroundFile || ''}
            onChange={(e) => {
              setCurrentSong(prev => ({ ...prev, backgroundFile: e.target.value || undefined }));
              setHasUnsavedChanges(true);
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
            value={currentSong.videoFile || currentSong.youtubeUrl || ''}
            onChange={(e) => {
              const value = e.target.value;
              const isUrl = value.startsWith('http://') || value.startsWith('https://');
              setCurrentSong(prev => ({
                ...prev,
                videoFile: isUrl ? undefined : value || undefined,
                youtubeUrl: isUrl ? value : undefined,
              }));
              setHasUnsavedChanges(true);
            }}
            placeholder="video.mp4 oder YouTube URL"
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
            value={currentSong.previewStart ?? ''}
            onChange={(e) => {
              setCurrentSong(prev => ({ ...prev, previewStart: parseFloat(e.target.value) || undefined }));
              setHasUnsavedChanges(true);
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
            value={currentSong.previewDuration ?? ''}
            onChange={(e) => {
              setCurrentSong(prev => ({ ...prev, previewDuration: parseFloat(e.target.value) || undefined }));
              setHasUnsavedChanges(true);
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
            value={currentSong.medleyStartBeat ?? ''}
            onChange={(e) => {
              setCurrentSong(prev => ({ ...prev, medleyStartBeat: parseInt(e.target.value) || undefined }));
              setHasUnsavedChanges(true);
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
            value={currentSong.medleyEndBeat ?? ''}
            onChange={(e) => {
              setCurrentSong(prev => ({ ...prev, medleyEndBeat: parseInt(e.target.value) || undefined }));
              setHasUnsavedChanges(true);
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
            value={currentSong.end ?? ''}
            onChange={(e) => {
              setCurrentSong(prev => ({ ...prev, end: parseInt(e.target.value) || undefined }));
              setHasUnsavedChanges(true);
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
            value={currentSong.tags || ''}
            onChange={(e) => {
              setCurrentSong(prev => ({ ...prev, tags: e.target.value || undefined }));
              setHasUnsavedChanges(true);
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
            value={currentSong.duetPlayerNames?.[0] || ''}
            onChange={(e) => {
              setCurrentSong(prev => ({
                ...prev,
                isDuet: true,
                duetPlayerNames: [e.target.value, prev.duetPlayerNames?.[1] || 'Player 2']
              }));
              setHasUnsavedChanges(true);
            }}
            placeholder="Spieler 1 Name"
            className="bg-slate-800 border-slate-600 h-8"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="meta-p2" className="text-slate-400 text-xs">#P2: (Duet Spieler 2)</Label>
          <Input
            id="meta-p2"
            value={currentSong.duetPlayerNames?.[1] || ''}
            onChange={(e) => {
              setCurrentSong(prev => ({
                ...prev,
                isDuet: true,
                duetPlayerNames: [prev.duetPlayerNames?.[0] || 'Player 1', e.target.value]
              }));
              setHasUnsavedChanges(true);
            }}
            placeholder="Spieler 2 Name"
            className="bg-slate-800 border-slate-600 h-8"
          />
        </div>
      </div>
    </ScrollArea>
  );
}
