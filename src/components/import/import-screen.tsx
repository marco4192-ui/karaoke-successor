'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ImportScreenProps } from './import-types';
import { useImportScreen } from './use-import-screen';
import { UltrastarTab } from './ultrastar-tab';
import { FolderScanTab } from './folder-scan-tab';
import { AlternateFormatTab } from './alternate-format-tab';
import { ImportPreview } from './import-preview';

export function ImportScreen({ onImport }: ImportScreenProps) {
  const {
    importType, setImportType, isProcessing, progress, error, setError,
    audioFile, videoFile, ultrastarFile, audioUrl, videoUrl,
    title, setTitle, artist, setArtist, useVideoAudio, setUseVideoAudio,
    previewSong, setPreviewSong, scannedSongs, selectedScanned, setSelectedScanned,
    scanErrors, setScanErrors, setScannedSongs, setIsProcessing,
    duplicates,
    audioInputRef, videoInputRef, ultrastarInputRef, folderInputRef,
    handleFileSelect, handleDrop, processUltrastarImport,
    handleScanFolder, importSelectedScanned, confirmImport,
  } = useImportScreen(onImport);

  return (
    <div className="space-y-6">
      <Tabs value={importType} onValueChange={(v) => setImportType(v as typeof importType)}>
        <TabsList className="mb-6">
          <TabsTrigger value="ultrastar">UltraStar Import</TabsTrigger>
          <TabsTrigger value="folder">Folder Scan</TabsTrigger>
          <TabsTrigger value="alt-format">More Formats</TabsTrigger>
        </TabsList>

        <TabsContent value="ultrastar">
          <UltrastarTab
            title={title} setTitle={setTitle}
            artist={artist} setArtist={setArtist}
            useVideoAudio={useVideoAudio} setUseVideoAudio={setUseVideoAudio}
            audioFile={audioFile} videoFile={videoFile} ultrastarFile={ultrastarFile}
            audioInputRef={audioInputRef} videoInputRef={videoInputRef} ultrastarInputRef={ultrastarInputRef}
            handleDrop={handleDrop} handleFileSelect={handleFileSelect}
          />
        </TabsContent>

        <TabsContent value="folder">
          <FolderScanTab
            isProcessing={isProcessing}
            scannedSongs={scannedSongs}
            selectedScanned={selectedScanned}
            setSelectedScanned={setSelectedScanned}
            scanErrors={scanErrors}
            setScanErrors={setScanErrors}
            setScannedSongs={setScannedSongs}
            setIsProcessing={setIsProcessing}
            duplicates={duplicates}
            folderInputRef={folderInputRef}
            handleScanFolder={handleScanFolder}
          />
        </TabsContent>

        <TabsContent value="alt-format">
          <AlternateFormatTab
            isProcessing={isProcessing}
            setIsProcessing={setIsProcessing}
            error={error}
            setError={setError}
            previewSong={previewSong}
            setPreviewSong={setPreviewSong}
            onImport={onImport}
          />
        </TabsContent>
      </Tabs>

      {/* Only show ImportPreview for ultrastar/folder tabs */}
      {importType !== 'alt-format' && (
        <ImportPreview
          progress={progress}
          error={error}
          previewSong={previewSong}
          audioUrl={audioUrl}
          videoUrl={videoUrl}
        />
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
        {importType !== 'alt-format' && previewSong && (
          <Button onClick={confirmImport} className="bg-green-500 hover:bg-green-400">
            Add to Library
          </Button>
        )}
      </div>
    </div>
  );
}
