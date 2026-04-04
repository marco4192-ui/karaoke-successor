'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ImportScreen } from '@/components/import/import-screen';
import { getAllSongs } from '@/lib/game/song-library';
import { FolderIcon, CloudUploadIcon, TrashIcon } from '@/components/settings/settings-icons';

interface LibraryTabProps {
  songsFolder: string;
  setSongsFolder: (value: string) => void;
  isScanning: boolean;
  scanProgress: {
    stage: 'scanning' | 'importing' | 'complete' | 'error';
    message: string;
    count: number;
  } | null;
  songCount: number;
  handleSaveFolder: () => Promise<void>;
  handleBrowseFolder: () => Promise<void>;
  handleResetLibrary: () => Promise<void>;
  handleClearAllData: () => Promise<void>;
  isResetting: boolean;
  resetComplete: boolean;
  folderSaveComplete: boolean;
  tx: (key: string) => string;
}

export function LibraryTab({
  songsFolder,
  setSongsFolder,
  isScanning,
  scanProgress,
  songCount,
  handleSaveFolder,
  handleBrowseFolder,
  handleResetLibrary,
  handleClearAllData,
  isResetting,
  resetComplete,
  folderSaveComplete,
  tx,
}: LibraryTabProps) {
  return (
    <div className="space-y-6">
      {/* Songs Base Folder */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 theme-adaptive-text">
            <FolderIcon className="w-5 h-5 text-cyan-400" />
            Songs Base Folder
          </CardTitle>
          <CardDescription>
            All songs are imported from this folder. Each subfolder contains one song.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Input
              value={songsFolder}
              onChange={(e) => setSongsFolder(e.target.value)}
              placeholder="C:/Karaoke Successor/Songs"
              className="bg-white/5 border-white/10 text-white flex-1"
            />
            <Button
              onClick={handleSaveFolder}
              disabled={isScanning || !songsFolder.trim()}
              className="bg-green-500 hover:bg-green-400 text-white shrink-0"
            >
              {isScanning ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Scan'
              )}
            </Button>
            <Button
              onClick={handleBrowseFolder}
              disabled={isScanning}
              variant="outline"
              className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 shrink-0"
            >
              Browse
            </Button>
          </div>
          <p className="text-xs text-white/50">
            Enter the path to your songs folder and click &quot;Scan&quot; to import, or use &quot;Browse&quot; to select a folder.
          </p>
          {songsFolder && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 flex items-center gap-3">
              <svg className="w-5 h-5 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <div>
                <p className="text-green-400 font-medium">Base Folder: {songsFolder}</p>
                <p className="text-sm text-white/60">All songs will use this as the base path for media files</p>
              </div>
            </div>
          )}
          {!songsFolder && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-center gap-3">
              <svg className="w-5 h-5 text-yellow-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="text-yellow-400">No base folder set. Please select a songs folder to import songs.</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Library Stats */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="theme-adaptive-text">{tx('settings.libraryStats')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-lg p-4">
              <div className="text-2xl font-bold text-cyan-400">{songCount}</div>
              <div className="text-sm theme-adaptive-text-secondary">{tx('settings.songsInLibrary')}</div>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-400">
                {Object.keys(localStorage).filter(k => k.startsWith('karaoke-highscores')).length}
              </div>
              <div className="text-sm theme-adaptive-text-secondary">{tx('settings.highscoreEntries')}</div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Scan Progress */}
      {(isScanning || scanProgress) && (
        <Card className="bg-white/5 border-white/10 border-cyan-500/30">
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              {isScanning && (
                <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              )}
              <div className="flex-1">
                <p className={`font-medium ${
                  scanProgress?.stage === 'complete' ? 'text-green-400' :
                  scanProgress?.stage === 'error' ? 'text-red-400' :
                  'text-cyan-400'
                }`}>
                  {scanProgress?.message || 'Scanning...'}
                </p>
                {scanProgress && scanProgress.count > 0 && (
                  <p className="text-sm text-white/60">{scanProgress.count} songs processed</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Import Songs Section */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CloudUploadIcon className="w-5 h-5 text-cyan-400" />
            Import Songs
          </CardTitle>
          <CardDescription>
            Import new songs into your library
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImportScreen 
            onImport={(song) => {
              // Refresh song count after import
            }}
            onCancel={() => {}}
          />
        </CardContent>
      </Card>
      
      {/* Reset Library */}
      <Card className="bg-white/5 border-white/10 border-red-500/30">
        <CardHeader>
          <CardTitle className="text-red-400 flex items-center gap-2">
            <TrashIcon className="w-5 h-5" />
            {tx('settings.dangerZone')}
          </CardTitle>
          <CardDescription>
            These actions cannot be undone easily
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Reset Success Message */}
          {resetComplete && (
            <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 flex items-center gap-3">
              <svg className="w-5 h-5 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <span className="text-green-400">Library has been reset successfully!</span>
            </div>
          )}
          
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
            <div>
              <h4 className="font-medium">{tx('settings.resetLibrary')}</h4>
              <p className="text-sm text-white/60">{tx('settings.resetLibraryDesc')}</p>
            </div>
            <Button
              variant="outline"
              onClick={handleResetLibrary}
              disabled={isResetting}
              className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
            >
              {isResetting ? (
                <div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <TrashIcon className="w-4 h-4 mr-2" />
              )}
              {tx('settings.resetLibrary')}
            </Button>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-red-500/10 rounded-lg border border-red-500/20">
            <div>
              <h4 className="font-medium text-red-400">{tx('settings.clearAll')}</h4>
              <p className="text-sm text-white/60">{tx('settings.clearAllDesc')}</p>
            </div>
            <Button
              variant="outline"
              onClick={handleClearAllData}
              disabled={isResetting}
              className="border-red-500/50 text-red-400 hover:bg-red-500/10"
            >
              <TrashIcon className="w-4 h-4 mr-2" />
              {tx('settings.clearAll')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
