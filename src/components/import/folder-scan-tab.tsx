'use client';

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScannedSong, isFileSystemAccessSupported } from '@/lib/parsers/folder-scanner';
import { ScannedSongsList } from './scanned-songs-list';

interface DuplicateInfo {
  index: number;
  song: ScannedSong;
  existingSong: { title: string; artist: string } | null;
  matchType: 'exact' | 'similar' | 'none';
}

interface FolderScanTabProps {
  isProcessing: boolean;
  scannedSongs: ScannedSong[];
  duplicates: DuplicateInfo[];
  selectedScanned: Set<number>;
  scanErrors: string[];
  onScanFolder: () => void;
  onSelectionChange: (newSelection: Set<number>) => void;
  onScanFromFileList: (files: FileList) => void;
}

export function FolderScanTab({
  isProcessing,
  scannedSongs,
  duplicates,
  selectedScanned,
  scanErrors,
  onScanFolder,
  onSelectionChange,
  onScanFromFileList,
}: FolderScanTabProps) {
  const folderInputRef = useRef<HTMLInputElement>(null);

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle>Scan Folder for Songs</CardTitle>
        <CardDescription>
          Select a folder containing karaoke songs (audio/video + txt files)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <p className="text-white/60 mb-4">
            Each subfolder should contain song files (audio, video, txt, cover)
          </p>

          {isFileSystemAccessSupported() ? (
            <Button
              onClick={onScanFolder}
              disabled={isProcessing}
              className="bg-gradient-to-r from-cyan-500 to-purple-500"
            >
              {isProcessing ? 'Scanning...' : 'Select Folder'}
            </Button>
          ) : (
            <>
              <Button
                onClick={() => folderInputRef.current?.click()}
                disabled={isProcessing}
                className="bg-gradient-to-r from-cyan-500 to-purple-500"
              >
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
                onChange={(e) => {
                  if (e.target.files?.length) {
                    onScanFromFileList(e.target.files);
                  }
                }}
              />
            </>
          )}
        </div>

        <ScannedSongsList
          scannedSongs={scannedSongs}
          duplicates={duplicates}
          selectedScanned={selectedScanned}
          onSelectionChange={onSelectionChange}
        />

        {scanErrors.length > 0 && (
          <div className="mt-4 p-4 bg-red-500/10 rounded-lg">
            <p className="text-red-400 font-medium mb-2">Errors:</p>
            <ul className="text-sm text-red-300 list-disc list-inside">
              {scanErrors.slice(0, 5).map((err, i) => (
                <li key={i}>{err}</li>
              ))}
              {scanErrors.length > 5 && <li>...and {scanErrors.length - 5} more</li>}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
