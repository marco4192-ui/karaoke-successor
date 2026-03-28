/**
 * use-library-management.ts
 * 
 * Hook for managing song library operations (folder scanning, reset, clear)
 * Extracted from settings-screen.tsx for better maintainability
 */

import { useState, useCallback } from 'react';
import { getAllSongs, reloadLibrary, clearCustomSongs } from '@/lib/game/song-library';
import { useFolderScan, ScanProgress } from '@/hooks/use-folder-scan';
import { logger } from '@/lib/logger';

// Re-export ScanProgress for convenience
export type { ScanProgress } from '@/hooks/use-folder-scan';

export interface LibraryManagementResult {
  songsFolder: string;
  setSongsFolder: (folder: string) => void;
  songCount: number;
  setSongCount: (count: number) => void;
  isScanning: boolean;
  scanProgress: ScanProgress | null;
  isResetting: boolean;
  resetComplete: boolean;
  folderSaveComplete: boolean;
  handleSaveFolder: () => Promise<void>;
  handleBrowseFolder: () => Promise<void>;
  handleResetLibrary: () => Promise<void>;
  handleClearAllData: () => Promise<void>;
}

/**
 * Hook for managing song library operations
 */
export function useLibraryManagement(): LibraryManagementResult {
  const [songsFolder, setSongsFolder] = useState<string>('');
  const [songCount, setSongCount] = useState<number>(0);
  const [isResetting, setIsResetting] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const [folderSaveComplete, setFolderSaveComplete] = useState(false);

  // Use the existing folder scan hook
  const {
    isScanning,
    scanProgress,
    performFolderScan,
  } = useFolderScan({
    onScanComplete: (count) => {
      setFolderSaveComplete(true);
      setTimeout(() => setFolderSaveComplete(false), 2000);
    },
  });

  // Save songs folder and reload library
  const handleSaveFolder = useCallback(async () => {
    if (!songsFolder.trim()) {
      alert('Please enter a folder path first.');
      return;
    }

    localStorage.setItem('karaoke-songs-folder', songsFolder);

    // Run the Tauri folder scan using the hook
    await performFolderScan(songsFolder);
  }, [songsFolder, performFolderScan]);

  // Browse folder (using Tauri dialog if available)
  const handleBrowseFolder = useCallback(async () => {
    // Check if running in Tauri
    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      try {
        const { open } = await import('@tauri-apps/plugin-dialog');
        const selected = await open({
          directory: true,
          multiple: false,
          title: 'Select Songs Folder'
        });
        if (selected && typeof selected === 'string') {
          setSongsFolder(selected);
          localStorage.setItem('karaoke-songs-folder', selected);

          // Perform the actual scan
          await performFolderScan(selected);
        }
      } catch {
        alert('Could not open folder picker. Please enter the path manually.');
      }
    } else {
      // Browser mode - show instructions (though this is Tauri-only app)
      alert(
        'Folder picker is only available in the desktop app.\n\n' +
        'In browser mode, please:\n' +
        '1. Enter the full path to your songs folder\n' +
        '2. Click "Save" to apply\n\n' +
        'Note: Browser security restricts direct file system access. ' +
        'Use the Import tab to add songs manually.'
      );
    }
  }, [performFolderScan]);

  // Reset library without deleting highscores
  const handleResetLibrary = useCallback(async () => {
    if (!confirm('Are you sure you want to reset the song library? This will remove all imported songs, but your highscores will be preserved.')) {
      return;
    }

    setIsResetting(true);
    setResetComplete(false);

    try {
      // Clear custom songs using the song-library function
      // This clears 'karaoke-successor-custom-songs' from localStorage and clears caches
      clearCustomSongs();

      // Find and remove other song-related keys
      const allKeys = Object.keys(localStorage);
      for (const key of allKeys) {
        // Remove songs library and imported songs
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
      logger.error('[Settings]', 'Failed to reset library:', error);
    } finally {
      setIsResetting(false);
    }
  }, []);

  // Clear all data including highscores (dangerous!)
  const handleClearAllData = useCallback(async () => {
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
      logger.error('[Settings]', 'Failed to clear data:', error);
      setIsResetting(false);
    }
  }, []);

  return {
    songsFolder,
    setSongsFolder,
    songCount,
    setSongCount,
    isScanning,
    scanProgress,
    isResetting,
    resetComplete,
    folderSaveComplete,
    handleSaveFolder,
    handleBrowseFolder,
    handleResetLibrary,
    handleClearAllData,
  };
}
