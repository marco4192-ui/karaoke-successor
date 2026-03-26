/**
 * useFolderScan Hook
 * Manages folder scanning and song importing functionality
 * Extracted from settings-screen.tsx for better code organization
 */

import { useState, useCallback } from 'react';
import { Song } from '@/types/game';
import { 
  getAllSongs, 
  reloadLibrary, 
  clearCustomSongs, 
  addSongs 
} from '@/lib/game/song-library';
import { logger } from '@/lib/logger';

export interface ScanProgress {
  stage: 'scanning' | 'importing' | 'complete' | 'error';
  message: string;
  count: number;
}

export interface UseFolderScanReturn {
  songsFolder: string;
  setSongsFolder: (folder: string) => void;
  songCount: number;
  setSongCount: (count: number) => void;
  isScanning: boolean;
  scanProgress: ScanProgress | null;
  isTauriDetected: boolean;
  folderSaveComplete: boolean;
  
  // Actions
  handleSaveFolder: () => Promise<void>;
  performFolderScan: (folderPath: string) => Promise<void>;
  handleBrowseFolder: () => Promise<void>;
}

/**
 * Hook for managing folder scanning and song importing
 */
export function useFolderScan(): UseFolderScanReturn {
  const [songsFolder, setSongsFolder] = useState<string>('');
  const [songCount, setSongCount] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);
  const [isTauriDetected, setIsTauriDetected] = useState(false);
  const [folderSaveComplete, setFolderSaveComplete] = useState(false);
  
  // Check if running in Tauri on mount
  useState(() => {
    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      setIsTauriDetected(true);
    }
  });
  
  /**
   * Perform folder scan and import songs
   */
  const performFolderScan = useCallback(async (folderPath: string) => {
    setIsScanning(true);
    setScanProgress({ stage: 'scanning', message: 'Scanning folder...', count: 0 });
    
    try {
      // Import the Tauri scanner
      const { scanSongsFolderTauri, isTauri } = await import('@/lib/tauri-file-storage');
      
      if (!isTauri()) {
        alert('Folder scanning is only available in the desktop app.');
        setIsScanning(false);
        return;
      }
      
      // Run the scan
      const result = await scanSongsFolderTauri(folderPath);
      
      setScanProgress({ 
        stage: 'importing', 
        message: `Found ${result.songs.length} songs, importing...`, 
        count: result.songs.length 
      });
      
      if (result.songs.length > 0) {
        // Clear existing songs first
        clearCustomSongs();
        
        // Convert scanned songs to Song formats
        const { storeMedia } = await import('@/lib/db/media-db');
        const { getSongMediaUrl } = await import('@/lib/tauri-file-storage');
        
        const songsToImport: Song[] = [];
        let imported = 0;
        
        for (const scanned of result.songs) {
          try {
            // Generate song ID
            const songId = `song-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
            
            // Store TXT content in IndexedDB for caching
            let storedTxt = false;
            if (scanned.relativeTxtPath) {
              try {
                const { readTextFile } = await import('@tauri-apps/plugin-fs');
                const txtContent = await readTextFile(`${folderPath}/${scanned.relativeTxtPath}`);
                if (txtContent) {
                  const txtBlob = new Blob([txtContent], { type: 'text/plain' });
                  await storeMedia(songId, 'txt', txtBlob);
                  storedTxt = true;
                }
              } catch (e) {
                logger.warn('[Settings]', 'Could not cache TXT for', scanned.title);
              }
            }
            
            // CRITICAL: Create blob URLs for media files NOW
            // These URLs are needed for immediate playback
            let audioUrl: string | undefined = undefined;
            let videoBackground: string | undefined = undefined;
            let coverImage: string | undefined = undefined;
            
            // Load audio URL
            if (scanned.relativeAudioPath) {
              try {
                audioUrl = await getSongMediaUrl(scanned.relativeAudioPath, folderPath) || undefined;
                logger.info('[Import]', `Created audio URL for ${scanned.title}:`, audioUrl ? 'success' : 'failed');
              } catch (e) {
                logger.warn('[Import]', `Failed to create audio URL for ${scanned.title}:`, e);
              }
            }
            
            // Load video URL
            if (scanned.relativeVideoPath) {
              try {
                videoBackground = await getSongMediaUrl(scanned.relativeVideoPath, folderPath) || undefined;
                logger.info('[Import]', `Created video URL for ${scanned.title}:`, videoBackground ? 'success' : 'failed');
              } catch (e) {
                logger.warn('[Import]', `Failed to create video URL for ${scanned.title}:`, e);
              }
            }
            
            // Load cover URL
            if (scanned.relativeCoverPath) {
              try {
                coverImage = await getSongMediaUrl(scanned.relativeCoverPath, folderPath) || undefined;
                logger.info('[Import]', `Created cover URL for ${scanned.title}:`, coverImage ? 'success' : 'failed');
              } catch (e) {
                logger.warn('[Import]', `Failed to create cover URL for ${scanned.title}:`, e);
              }
            }
            
            // Create song object with relative paths AND blob URLs
            const song: Song = {
              id: songId,
              title: scanned.title,
              artist: scanned.artist,
              duration: 180000, // Default duration, will be calculated when played
              bpm: scanned.bpm,
              difficulty: 'medium',
              rating: 3,
              gap: scanned.gap,
              baseFolder: folderPath, // Store the base folder path for loading media
              folderPath: scanned.folderPath,
              relativeTxtPath: scanned.relativeTxtPath,
              relativeAudioPath: scanned.relativeAudioPath,
              relativeVideoPath: scanned.relativeVideoPath,
              relativeCoverPath: scanned.relativeCoverPath,
              // CRITICAL: Set the media URLs
              audioUrl,
              videoBackground,
              coverImage,
              genre: scanned.genre,
              language: scanned.language,
              year: scanned.year,
              preview: scanned.previewStart ? {
                startTime: scanned.previewStart * 1000,
                duration: (scanned.previewDuration || 15) * 1000,
              } : undefined,
              // CRITICAL: Use lyrics from scanner if available
              lyrics: scanned.lyrics || [],
              storedTxt,
              storedMedia: false,
              hasEmbeddedAudio: !scanned.relativeAudioPath && !!scanned.relativeVideoPath,
              dateAdded: Date.now(),
            };
            
            songsToImport.push(song);
            imported++;
            
            setScanProgress({ 
              stage: 'importing', 
              message: `Importing ${imported}/${result.songs.length}...`, 
              count: imported 
            });
          } catch (e) {
            logger.error('[Import]', 'Failed to import song:', scanned.title, e);
          }
        }
        
        // Add all songs to library
        if (songsToImport.length > 0) {
          addSongs(songsToImport);
        }
        
        // Reload library
        reloadLibrary();
        setSongCount(getAllSongs().length);
        setFolderSaveComplete(true);
        setScanProgress({ 
          stage: 'complete', 
          message: `Successfully imported ${imported} songs!`, 
          count: imported 
        });
      } else {
        setScanProgress({ 
          stage: 'complete', 
          message: 'No songs found in the selected folder.', 
          count: 0 
        });
      }
      
      // Show errors if any
      if (result.errors.length > 0) {
        logger.warn('[Import]', 'Scan errors:', result.errors);
      }
      
    } catch (error) {
      logger.error('[Import]', 'Folder scan failed:', error);
      setScanProgress({ 
        stage: 'error', 
        message: `Scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 
        count: 0 
      });
    }
    
    setIsScanning(false);
    setTimeout(() => {
      setFolderSaveComplete(false);
      setScanProgress(null);
    }, 5000);
  }, []);
  
  /**
   * Save songs folder and reload library
   */
  const handleSaveFolder = useCallback(async () => {
    if (!songsFolder.trim()) {
      alert('Please enter a folder path first.');
      return;
    }
    
    localStorage.setItem('karaoke-songs-folder', songsFolder);
    
    // Run the Tauri folder scan
    await performFolderScan(songsFolder);
  }, [songsFolder, performFolderScan]);
  
  /**
   * Browse folder (using Tauri dialog if available)
   */
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
      } catch (e) {
        alert('Could not open folder picker. Please enter the path manually.');
      }
    } else {
      // Browser mode - show instructions
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
  
  return {
    songsFolder,
    setSongsFolder,
    songCount,
    setSongCount,
    isScanning,
    scanProgress,
    isTauriDetected,
    folderSaveComplete,
    
    handleSaveFolder,
    performFolderScan,
    handleBrowseFolder,
  };
}

export default useFolderScan;
