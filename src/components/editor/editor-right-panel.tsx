'use client';

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NotePropertiesPanel, SongInfoPanel, MetadataPanel } from './panels';
import type { Song, Note } from '@/types/game';
import { Music, FileText, Settings } from 'lucide-react';

export interface EditorRightPanelProps {
  selectedNote: Note | undefined;
  currentSong: Song;
  updateSelectedNote: (updates: Partial<Note>) => void;
  setCurrentSong: React.Dispatch<React.SetStateAction<Song>>;
  setHasUnsavedChanges: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * EditorRightPanel component
 * Contains the tabbed right panel with Note Properties, Song Info, and Metadata tabs.
 */
export function EditorRightPanel({
  selectedNote,
  currentSong,
  updateSelectedNote,
  setCurrentSong,
  setHasUnsavedChanges,
}: EditorRightPanelProps) {
  return (
    <aside className="w-72 bg-slate-900 border-l border-slate-700 flex flex-col overflow-hidden flex-shrink-0">
      <Tabs defaultValue="note" className="flex flex-col h-full">
        <TabsList className="grid w-full grid-cols-3 bg-slate-800 border-b border-slate-700 rounded-none h-10">
          <TabsTrigger value="note" className="text-xs data-[state=active]:bg-slate-700">
            <Music className="w-3 h-3 mr-1" />
            Note
          </TabsTrigger>
          <TabsTrigger value="info" className="text-xs data-[state=active]:bg-slate-700">
            <FileText className="w-3 h-3 mr-1" />
            Info
          </TabsTrigger>
          <TabsTrigger value="metadata" className="text-xs data-[state=active]:bg-slate-700">
            <Settings className="w-3 h-3 mr-1" />
            Meta
          </TabsTrigger>
        </TabsList>

        {/* Note Properties Tab */}
        <TabsContent value="note" className="flex-1 overflow-hidden m-0 data-[state=inactive]:hidden">
          <NotePropertiesPanel 
            selectedNote={selectedNote}
            updateSelectedNote={updateSelectedNote}
          />
        </TabsContent>

        {/* Song Info Tab */}
        <TabsContent value="info" className="flex-1 overflow-hidden m-0 data-[state=inactive]:hidden">
          <SongInfoPanel 
            currentSong={currentSong}
            setCurrentSong={setCurrentSong}
            setHasUnsavedChanges={setHasUnsavedChanges}
          />
        </TabsContent>

        {/* Metadata Tab */}
        <TabsContent value="metadata" className="flex-1 overflow-hidden m-0 data-[state=inactive]:hidden">
          <MetadataPanel 
            currentSong={currentSong}
            setCurrentSong={setCurrentSong}
            setHasUnsavedChanges={setHasUnsavedChanges}
          />
        </TabsContent>
      </Tabs>
    </aside>
  );
}
