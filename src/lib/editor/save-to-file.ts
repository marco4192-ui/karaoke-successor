// Save Song to UltraStar txt file
// This module handles saving song edits back to the original txt file
// IMPORTANT: This app is Tauri-only, no browser fallback needed

import { Song } from '@/types/game';
import { generateUltraStarTxt } from '@/lib/parsers/ultrastar-parser';
import { normalizeFilePath } from '@/lib/tauri-file-storage';

// Characters that are invalid in file paths on Windows
const INVALID_PATH_CHARS = /[<>:"/\\|?*]/g;

export interface SaveResult {
  success: boolean;
  message: string;
  path?: string;
}

// Save song to txt file - Tauri only
// Writes directly to the original file location
export async function saveSongToTxt(song: Song): Promise<SaveResult> {
  try {
    // Generate txt content
    const txtContent = generateUltraStarTxt(song);
    
    // Get the songs folder from localStorage (normalized)
    const raw = localStorage.getItem('karaoke-songs-folder');
    const songsFolder = raw ? normalizeFilePath(raw) : null;
    
    if (!songsFolder) {
      return { 
        success: false, 
        message: 'Kein Songs-Ordner konfiguriert. Bitte erst einen Ordner scannen.' 
      };
    }
    
    // Determine the original file path
    let filePath: string | null = null;
    
    // Priority 1: Use relativeTxtPath (most reliable - stored during scan)
    if (song.relativeTxtPath) {
      // relativeTxtPath is relative to the songs folder (without root folder name)
      // Use centralized normalizeFilePath for consistent path construction
      filePath = `${normalizeFilePath(songsFolder)}/${normalizeFilePath(song.relativeTxtPath)}`;
    }
    // Priority 2: Use folderPath + constructed filename
    else if (song.folderPath) {
      filePath = `${normalizeFilePath(songsFolder)}/${normalizeFilePath(song.folderPath)}/${song.title.replace(INVALID_PATH_CHARS, '_')} - ${song.artist.replace(INVALID_PATH_CHARS, '_')}.txt`;
    }
    // Fallback: Ask user where to save (using native dialog)
    else {
      console.warn('[SaveToFile] No path info available, asking user...');
      const { nativePickFileSave } = await import('@/lib/native-fs');
      const userPath = await nativePickFileSave(
        'Save TXT file',
        'UltraStar TXT',
        ['txt']
      );
      
      if (!userPath) {
        return { success: false, message: 'Speichern abgebrochen' };
      }
      
      filePath = userPath;
    }
    
    // Verify the file exists before writing (using native command)
    if (song.relativeTxtPath || song.folderPath) {
      const { nativeFileExists } = await import('@/lib/native-fs');
      const fileExists = await nativeFileExists(filePath!);
      
      if (!fileExists) {
        console.warn('[SaveToFile] Original file does not exist:', filePath);
        // File doesn't exist - this might be a new file, that's OK
      }
    }
    
    // Write the file using native command (bypasses ACL)
    const { nativeWriteFileText } = await import('@/lib/native-fs');
    await nativeWriteFileText(filePath!, txtContent);
    
    return { success: true, message: 'Datei gespeichert!', path: filePath! };
    
  } catch (error) {
    console.error('[SaveToFile] Error saving song:', error);
    return {
      success: false,
      message: `Fehler beim Speichern: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
    };
  }
}

// Check if song can be saved to original location
export function canSaveToOriginal(song: Song): boolean {
  // Check if we have the original path info or songs folder
  const songsFolder = localStorage.getItem('karaoke-songs-folder');
  return !!(song.relativeTxtPath || (song.folderPath && songsFolder));
}
