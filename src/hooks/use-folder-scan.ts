/**
 * Hook for scanning and importing songs from a folder
 */

import { useState, useCallback } from 'react';
import type { Song } from '@/types/game';
import { 
  clearCustomSongs, 
  addSongs, 
  reloadLibrary, 
  getAllSongs 
} from '@/lib/game/song-library';
import { logger } from '@/lib/logger';

export interface ScanProgress {
  stage: 'scanning' | 'importing' | 'complete' | 'error';
  message: string;
  count: number;
}

export interface ScannedSong {
  title: string;
  artist: string;
  bpm?: number;
  gap?: number;
  genre?: string;
  language?: string;
  year?: number;
  folderPath?: string;
  relativeTxtPath?: string;
  relativeAudioPath?: string;
  relativeVideoPath?: string;
  relativeCoverPath?: string;
  previewStart?: number;
  previewDuration?: number;
  lyrics?: any[];
}

export interface ScanResult {
  songs: ScannedSong[];
  errors: string[];
}

export interface UseFolderScanOptions {
  onScanComplete?: (count: number) => void;
}

export interface UseFolderScanReturn {
  isScanning: boolean;
  scanProgress: ScanProgress | null;
  performFolderScan: (folderPath: string) => Promise<void>;
  songCount: number;
  setSongCount: (count: number) => void;
}

export function useFolderScan(options: UseFolderScanOptions = {}): UseFolderScanReturn {
  const { onScanComplete } = options;
  
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);
  const [songCount, setSongCount] = useState(0);

  const performFolderScan = useCallback(async (folderPath: string) => {
    setIsScanning(true);
    setScanProgress({ stage: 'scanning', message: 'Scanning folder...', count: 0 });
    
    try {
      // Import the Tauri scanner
      const { scanSongsFolderTauri, isTauri } = await import('@/lib/tauri-file-storage');
      
      if (!isTauri()) {
        setScanProgress({ 
          stage: 'error', 
          message: 'Folder scanning is only available in the desktop app.', 
          count: 0 
        });
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
        
        // Convert scanned songs to Song format
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
                logger.warn('[FolderScan]', 'Could not cache TXT for', scanned.title);
              }
            }
            
            // CRITICAL: Create blob URLs for media files NOW
            let audioUrl: string | undefined = undefined;
            let videoBackground: string | undefined = undefined;
            let coverImage: string | undefined = undefined;
            
            // Load audio URL
            if (scanned.relativeAudioPath) {
              try {
                audioUrl = await getSongMediaUrl(scanned.relativeAudioPath, folderPath) || undefined;
                logger.info('[FolderScan]', `Created audio URL for ${scanned.title}:`, audioUrl ? 'success' : 'failed');
              } catch (e) {
                logger.warn('[FolderScan]', `Failed to create audio URL for ${scanned.title}:`, e);
              }
            }
            
            // Load video URL
            if (scanned.relativeVideoPath) {
              try {
                videoBackground = await getSongMediaUrl(scanned.relativeVideoPath, folderPath) || undefined;
                logger.info('[FolderScan]', `Created video URL for ${scanned.title}:`, videoBackground ? 'success' : 'failed');
              } catch (e) {
                logger.warn('[FolderScan]', `Failed to create video URL for ${scanned.title}:`, e);
              }
            }
            
            // Load cover URL
            if (scanned.relativeCoverPath) {
              try {
                coverImage = await getSongMediaUrl(scanned.relativeCoverPath, folderPath) || undefined;
                logger.info('[FolderScan]', `Created cover URL for ${scanned.title}:`, coverImage ? 'success' : 'failed');
              } catch (e) {
                logger.warn('[FolderScan]', `Failed to create cover URL for ${scanned.title}:`, e);
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
              baseFolder: folderPath,
              folderPath: scanned.folderPath,
              relativeTxtPath: scanned.relativeTxtPath,
              relativeAudioPath: scanned.relativeAudioPath,
              relativeVideoPath: scanned.relativeVideoPath,
              relativeCoverPath: scanned.relativeCoverPath,
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
            logger.error('[FolderScan]', 'Failed to import song:', scanned.title, e);
          }
        }
        
        // Add all songs to library
        if (songsToImport.length > 0) {
          addSongs(songsToImport);
        }
        
        // Reload library
        reloadLibrary();
        const newCount = getAllSongs().length;
        setSongCount(newCount);
        
        setScanProgress({ 
          stage: 'complete', 
          message: `Successfully imported ${imported} songs!`, 
          count: imported 
        });
        
        if (onScanComplete) {
          onScanComplete(imported);
        }
      } else {
        setScanProgress({ 
          stage: 'complete', 
          message: 'No songs found in the selected folder.', 
          count: 0 
        });
      }
      
      // Show errors if any
      if (result.errors.length > 0) {
        logger.warn('[FolderScan]', 'Scan errors:', result.errors);
      }
      
    } catch (error) {
      logger.error('[FolderScan]', 'Folder scan failed:', error);
      setScanProgress({ 
        stage: 'error', 
        message: `Scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 
        count: 0 
      });
    }
    
    setIsScanning(false);
    
    // Clear progress after delay
    setTimeout(() => {
      setScanProgress(null);
    }, 5000);
  }, [onScanComplete]);

  return {
    isScanning,
    scanProgress,
    performFolderScan,
    songCount,
    setSongCount,
  };
}
