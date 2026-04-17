'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { isFileSystemAccessSupported, scanFilesFromFileList } from '@/lib/parsers/folder-scanner';
import { ScannedSong } from '@/lib/parsers/folder-scanner';
import { DuplicateInfo } from './import-types';

interface FolderScanTabProps {
  isProcessing: boolean;
  scannedSongs: ScannedSong[];
  selectedScanned: Set<number>;
  setSelectedScanned: (s: Set<number>) => void;
  scanErrors: string[];
  setScanErrors: (e: string[]) => void;
  setScannedSongs: (s: ScannedSong[]) => void;
  setIsProcessing: (v: boolean) => void;
  duplicates: DuplicateInfo[];
  folderInputRef: React.RefObject<HTMLInputElement | null>;
  handleScanFolder: () => void;
}

export function FolderScanTab({
  isProcessing, scannedSongs, selectedScanned, setSelectedScanned,
  scanErrors, setScanErrors, setScannedSongs, setIsProcessing,
  duplicates, folderInputRef, handleScanFolder,
}: FolderScanTabProps) {
  const exactDupCount = duplicates.filter(d => d.matchType === 'exact').length;
  const [isDragOver, setIsDragOver] = useState(false);

  // C.2: Drag & Drop for folders/files
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (isProcessing) return;

    const items = Array.from(e.dataTransfer.items || []);
    if (items.length === 0) return;

    setIsProcessing(true);

    try {
      // Collect all File objects from dropped items (handles both files and folders)
      const files: File[] = [];

      for (const item of items) {
        // Try webkitGetAsEntry first (supports folders in Chromium/Tauri)
        const entry = (item as any).webkitGetAsEntry?.();
        if (entry) {
          await collectFilesFromEntry(entry, '', files);
          continue;
        }
        // Fallback: getAsFile for individual files
        const file = item.getAsFile();
        if (file) files.push(file);
      }

      if (files.length === 0) {
        setIsProcessing(false);
        return;
      }

      // Use the existing scanner with the collected files
      const result = await scanFilesFromFileList(files as unknown as FileList);
      setScannedSongs(result.songs);
      setScanErrors(result.errors);
      setSelectedScanned(new Set(result.songs.map((_, i) => i)));
    } catch (err) {
      setScanErrors(prev => [...prev, `Drop failed: ${(err as Error).message}`]);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, setScannedSongs, setScanErrors, setSelectedScanned]);

  // Handle folder input change (non-FileSystemAccess browsers)
  const handleFolderInputChange = () => {
    if (folderInputRef.current?.files?.length) {
      setIsProcessing(true);
      scanFilesFromFileList(folderInputRef.current.files).then(result => {
        setScannedSongs(result.songs);
        setScanErrors(result.errors);
        setSelectedScanned(new Set(result.songs.map((_, i) => i)));
        setIsProcessing(false);
      });
    }
  };

  // Auto-trigger scan when folderInput gets files from directory picker
  useEffect(() => {
    const input = folderInputRef.current;
    if (!input) return;
    const handler = () => handleFolderInputChange();
    input.addEventListener('change', handler);
    return () => input.removeEventListener('change', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle>Scan Folder for Songs</CardTitle>
        <CardDescription>
          Select a folder containing karaoke songs (audio/video + txt files)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
            isDragOver ? 'border-cyan-400 bg-cyan-500/10' : 'border-white/20 hover:border-cyan-500/50'
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
        >
          <p className="text-white/60 mb-4">
            Drag a folder here or select one below
          </p>
          <p className="text-white/30 text-sm mb-4">
            Each subfolder should contain song files (audio, video, txt, cover)
          </p>
          {isFileSystemAccessSupported() ? (
            <Button onClick={handleScanFolder} disabled={isProcessing} className="bg-gradient-to-r from-cyan-500 to-purple-500">
              {isProcessing ? 'Scanning...' : 'Select Folder'}
            </Button>
          ) : (
            <>
              <Button onClick={handleScanFolder} disabled={isProcessing} className="bg-gradient-to-r from-cyan-500 to-purple-500">
                {isProcessing ? 'Scanning...' : 'Select Folder'}
              </Button>
              <input
                ref={folderInputRef}
                type="file"
                // @ts-ignore
                webkitdirectory="true"
                directory=""
                multiple
                className="hidden"
              />
            </>
          )}
        </div>

        {scannedSongs.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">
                Found {scannedSongs.length} songs
                {exactDupCount > 0 && (
                  <span className="ml-2 text-yellow-400 text-sm">({exactDupCount} duplicates)</span>
                )}
              </h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => {
                  const nonDupIndexes = duplicates.filter(d => d.matchType === 'none').map(d => d.index);
                  setSelectedScanned(new Set(nonDupIndexes));
                }} className="border-white/20 text-white">Select New Only</Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedScanned(new Set(scannedSongs.map((_, i) => i)))} className="border-white/20 text-white">Select All</Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedScanned(new Set())} className="border-white/20 text-white">Deselect All</Button>
              </div>
            </div>

            {exactDupCount > 0 && (
              <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-yellow-400 text-sm">
                  ⚠️ {exactDupCount} duplicate song(s) detected. They have been deselected by default.
                </p>
              </div>
            )}

            <div className="max-h-64 overflow-y-auto space-y-2">
              {scannedSongs.map((song, index) => (
                <SongListItem
                  key={index} song={song} index={index}
                  dupInfo={duplicates[index]}
                  selected={selectedScanned.has(index)}
                  onToggle={(checked) => {
                    const newSet = new Set(selectedScanned);
                    if (checked) newSet.add(index); else newSet.delete(index);
                    setSelectedScanned(newSet);
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {scanErrors.length > 0 && (
          <div className="mt-4 p-4 bg-red-500/10 rounded-lg">
            <p className="text-red-400 font-medium mb-2">Errors:</p>
            <ul className="text-sm text-red-300 list-disc list-inside">
              {scanErrors.slice(0, 5).map((err, i) => <li key={i}>{err}</li>)}
              {scanErrors.length > 5 && <li>...and {scanErrors.length - 5} more</li>}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Recursively collect File objects from a dropped FileSystemEntry.
 * Uses webkitGetAsEntry() which works in Chromium/Tauri webview.
 * Files get a synthetic webkitRelativePath set via Object.defineProperty
 * so that scanFilesFromFileList can determine folder structure.
 */
async function collectFilesFromEntry(
  entry: FileSystemEntry,
  basePath: string,
  files: File[]
): Promise<void> {
  if (entry.isFile) {
    const file = await new Promise<File>((resolve, reject) => {
      (entry as FileSystemFileEntry).file(resolve, reject);
    });
    const relativePath = basePath ? `${basePath}/${file.name}` : file.name;
    // Set webkitRelativePath so scanFilesFromFileList can parse folder structure
    Object.defineProperty(file, 'webkitRelativePath', {
      value: `drop-root/${relativePath}`,
      writable: false,
    });
    files.push(file);
  } else if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    const entries = await new Promise<FileSystemEntry[]>((resolve) => {
      const results: FileSystemEntry[] = [];
      const readBatch = () => {
        reader.readEntries((batch) => {
          if (batch.length === 0) { resolve(results); return; }
          results.push(...batch);
          readBatch();
        }, () => resolve(results));
      };
      readBatch();
    });
    for (const child of entries) {
      await collectFilesFromEntry(child, basePath ? `${basePath}/${entry.name}` : entry.name, files);
    }
  }
}

function SongListItem({ song, index, dupInfo, selected, onToggle }: {
  song: ScannedSong; index: number; dupInfo: DuplicateInfo; selected: boolean;
  onToggle: (checked: boolean) => void;
}) {
  const isDuplicate = dupInfo?.matchType === 'exact';
  const isSimilar = dupInfo?.matchType === 'similar';

  return (
    <label
      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
        isDuplicate
          ? 'bg-yellow-500/10 border border-yellow-500/30 hover:bg-yellow-500/20'
          : isSimilar
          ? 'bg-orange-500/10 border border-orange-500/30 hover:bg-orange-500/20'
          : 'bg-white/5 hover:bg-white/10'
      }`}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={(e) => onToggle(e.target.checked)}
        className="rounded"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">{song.title}</p>
          {isDuplicate && <Badge className="bg-yellow-500 text-xs">Duplicate</Badge>}
          {isSimilar && <Badge className="bg-orange-500 text-xs">Similar</Badge>}
        </div>
        <p className="text-sm text-white/60 truncate">{song.artist}</p>
      </div>
      <div className="flex gap-1 flex-shrink-0">
        {song.audioFile && <Badge variant="outline" className="text-xs">Audio</Badge>}
        {song.videoFile && <Badge variant="outline" className="text-xs">Video</Badge>}
        {song.txtFile && <Badge variant="outline" className="text-xs">TXT</Badge>}
      </div>
    </label>
  );
}
