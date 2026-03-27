'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Song } from '@/types/game';

// Import extracted components and hook
import { FileDropZone } from './file-drop-zone';
import { FolderScanTab } from './folder-scan-tab';
import { useImportScreen } from '@/hooks/use-import-screen';

interface ImportScreenProps {
  onImport: (song: Song) => void;
  onCancel: () => void;
}

export function ImportScreen({ onImport, onCancel }: ImportScreenProps) {
  const {
    importType,
    setImportType,
    isProcessing,
    progress,
    error,
    audioFile,
    videoFile,
    ultrastarFile,
    audioUrl,
    videoUrl,
    title,
    setTitle,
    artist,
    setArtist,
    useVideoAudio,
    setUseVideoAudio,
    previewSong,
    scannedSongs,
    selectedScanned,
    setSelectedScanned,
    scanErrors,
    duplicates,
    handleFileSelect,
    processUltrastarImport,
    handleScanFolder,
    handleScanFromFileList,
    importSelectedScanned,
    confirmImport,
  } = useImportScreen(onImport);

  return (
    <div className="space-y-6">
      <Tabs value={importType} onValueChange={(v) => setImportType(v as typeof importType)}>
        <TabsList className="mb-6">
          <TabsTrigger value="ultrastar">UltraStar Import</TabsTrigger>
          <TabsTrigger value="folder">Folder Scan</TabsTrigger>
        </TabsList>

        {/* UltraStar Import Tab */}
        <TabsContent value="ultrastar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FileDropZone
              title="UltraStar File *"
              description="Drop your .txt file here"
              accept=".txt"
              icon="📄"
              selectedFile={ultrastarFile}
              onFileSelect={(file) => handleFileSelect('ultrastar', file)}
            />

            <FileDropZone
              title="Audio File"
              description="MP3, OGG, WAV, M4A (optional if video has audio)"
              accept="audio/*,.mp3,.ogg,.wav,.m4a"
              icon="🎵"
              selectedFile={audioFile}
              onFileSelect={(file) => handleFileSelect('audio', file)}
            />

            <FileDropZone
              title="Video File"
              description="MP4, WebM, MKV - can include audio"
              accept="video/*,.mp4,.webm,.mkv,.avi"
              icon="🎬"
              selectedFile={videoFile}
              onFileSelect={(file) => handleFileSelect('video', file)}
              accentColor="purple"
            >
              {!audioFile && (
                <label className="flex items-center gap-2 mt-2 text-sm">
                  <input
                    type="checkbox"
                    checked={useVideoAudio}
                    onChange={(e) => setUseVideoAudio(e.target.checked)}
                    className="rounded"
                  />
                  Use video's audio
                </label>
              )}
            </FileDropZone>

            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle>Song Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm text-white/60 mb-1 block">Title</label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Song title"
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-white/60 mb-1 block">Artist</label>
                  <Input
                    value={artist}
                    onChange={(e) => setArtist(e.target.value)}
                    placeholder="Artist name"
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Folder Scan Tab */}
        <TabsContent value="folder">
          <FolderScanTab
            isProcessing={isProcessing}
            scannedSongs={scannedSongs}
            duplicates={duplicates}
            selectedScanned={selectedScanned}
            scanErrors={scanErrors}
            onScanFolder={handleScanFolder}
            onSelectionChange={setSelectedScanned}
            onScanFromFileList={handleScanFromFileList}
          />
        </TabsContent>
      </Tabs>

      {progress && progress.stage !== 'complete' && (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <Progress value={progress.progress} className="flex-1" />
              <span className="text-sm text-white/60">{progress.message}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="py-4 text-red-400">{error}</CardContent>
        </Card>
      )}

      {previewSong && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <h3 className="text-xl font-bold">{previewSong.title}</h3>
            <p className="text-white/60">{previewSong.artist}</p>
            <div className="flex gap-2 mt-2">
              <Badge>{previewSong.bpm} BPM</Badge>
              <Badge variant="outline" className="border-white/20">
                {previewSong.difficulty}
              </Badge>
              <Badge variant="outline" className="border-white/20">
                {previewSong.lyrics.reduce((acc, l) => acc + l.notes.length, 0)} notes
              </Badge>
              {previewSong.hasEmbeddedAudio && (
                <Badge className="bg-purple-500">Video Audio</Badge>
              )}
            </div>
            {audioUrl && <audio controls src={audioUrl} className="w-full mt-4" />}
            {videoUrl && (
              <video src={videoUrl} controls className="w-full h-48 rounded-lg object-cover mt-4" />
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-4">
        {importType === 'ultrastar' && (
          <Button
            onClick={processUltrastarImport}
            disabled={!ultrastarFile || (!audioFile && !videoFile) || isProcessing}
            className="bg-gradient-to-r from-cyan-500 to-purple-500"
          >
            {isProcessing ? 'Processing...' : 'Process'}
          </Button>
        )}
        {importType === 'folder' && scannedSongs.length > 0 && (
          <Button
            onClick={importSelectedScanned}
            disabled={selectedScanned.size === 0 || isProcessing}
            className="bg-gradient-to-r from-cyan-500 to-purple-500"
          >
            Import {selectedScanned.size} Songs
          </Button>
        )}
        {previewSong && (
          <Button onClick={confirmImport} className="bg-green-500 hover:bg-green-400">
            Add to Library
          </Button>
        )}
      </div>
    </div>
  );
}
