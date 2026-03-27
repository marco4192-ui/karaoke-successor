'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ImportScreen } from '@/components/import/import-screen';
import { TrashIcon, CloudUploadIcon } from '@/components/icons';
import { getAllSongs } from '@/lib/game/song-library';
import { ScanProgress } from '@/hooks/use-library-management';

interface LibraryTabContentProps {
  songCount: number;
  setSongCount: (count: number) => void;
  isScanning: boolean;
  scanProgress: ScanProgress | null;
  isResetting: boolean;
  resetComplete: boolean;
  onResetLibrary: () => void;
  onClearAllData: () => void;
  tx: (key: string) => string;
}

export function LibraryTabContent({
  songCount,
  setSongCount,
  isScanning,
  scanProgress,
  isResetting,
  resetComplete,
  onResetLibrary,
  onClearAllData,
  tx,
}: LibraryTabContentProps) {
  return (
    <div className="space-y-6">
      {/* Library Stats */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle>{tx('settings.libraryStats')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-lg p-4">
              <div className="text-2xl font-bold text-cyan-400">{songCount}</div>
              <div className="text-sm text-white/60">{tx('settings.songsInLibrary')}</div>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-400">
                {typeof window !== 'undefined' ? Object.keys(localStorage).filter(k => k.startsWith('karaoke-highscores')).length : 0}
              </div>
              <div className="text-sm text-white/60">{tx('settings.highscoreEntries')}</div>
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
            onImport={() => {
              setSongCount(getAllSongs().length);
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
              onClick={onResetLibrary}
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
              onClick={onClearAllData}
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
