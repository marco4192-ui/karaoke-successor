'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getAllSongs, reloadLibrary, clearCustomSongs } from '@/lib/game/song-library';
import { ImportScreen } from '@/components/import/import-screen';

// Icons
function MusicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function CloudUploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
      <polyline points="16 16 12 12 8 16" />
      <line x1="12" y1="12" x2="12" y2="21" />
    </svg>
  );
}

interface LibrarySettingsTabProps {
  tx: (key: string) => string;
}

export function LibrarySettingsTab({ tx }: LibrarySettingsTabProps) {
  const [songCount, setSongCount] = useState(0);
  const [isResetting, setIsResetting] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  
  // Load song count on mount
  useEffect(() => {
    setSongCount(getAllSongs().length);
  }, []);
  
  // Reset library without deleting highscores
  const handleResetLibrary = async () => {
    if (!confirm('Are you sure you want to reset the song library? This will remove all imported songs, but your highscores will be preserved.')) {
      return;
    }
    
    setIsResetting(true);
    setResetComplete(false);
    
    try {
      // Clear custom songs using the song-library function
      clearCustomSongs();
      
      // Find and remove other song-related keys
      const allKeys = Object.keys(localStorage);
      for (const key of allKeys) {
        if (key.startsWith('karaoke-songs') || key.startsWith('imported-song-') || key === 'karaoke-library') {
          localStorage.removeItem(key);
        }
      }
      
      // Clear the song library cache
      reloadLibrary();
      
      // Small delay for UI feedback
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setSongCount(0);
      setResetComplete(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => setResetComplete(false), 3000);
    } catch (error) {
      console.error('Failed to reset library:', error);
    } finally {
      setIsResetting(false);
    }
  };
  
  // Clear all data including highscores (dangerous!)
  const handleClearAllData = async () => {
    if (!confirm('⚠️ WARNING: This will delete ALL data including highscores, profiles, and settings. This cannot be undone!\n\nType "DELETE" to confirm.')) {
      return;
    }
    
    const confirmation = prompt('Type "DELETE" to confirm complete data reset:');
    if (confirmation !== 'DELETE') {
      return;
    }
    
    setIsResetting(true);
    
    try {
      // Clear all localStorage
      localStorage.clear();
      
      // Reload the page to reset state
      window.location.reload();
    } catch (error) {
      console.error('Failed to clear data:', error);
      setIsResetting(false);
    }
  };
  
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
              // Refresh song count after import
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
