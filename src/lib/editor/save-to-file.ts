// Save Song to UltraStar txt file
// This module handles saving song edits back to the original txt file
// IMPORTANT: This app is Tauri-only, no browser fallback needed

import { Song } from '@/types/game';
import { generateUltraStarTxt } from '@/lib/parsers/ultrastar-parser';

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
    
    // Get the songs folder from localStorage
    const songsFolder = localStorage.getItem('karaoke-songs-folder');
    
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
      // e.g., "Artist - Title/song.txt"
      filePath = `${songsFolder}/${song.relativeTxtPath}`;
    }
    // Priority 2: Use folderPath + constructed filename
    else if (song.folderPath) {
      const fileName = `${song.title} - ${song.artist}.txt`;
      filePath = `${songsFolder}/${song.folderPath}/${fileName}`;
    }
    // Fallback: Ask user where to save
    else {
      console.warn('[SaveToFile] No path info available, asking user...');
      const { save } = await import('@tauri-apps/plugin-dialog');
      const userPath = await save({
        defaultPath: `${song.title} - ${song.artist}.txt`,
        filters: [{ name: 'UltraStar TXT', extensions: ['txt'] }],
      });
      
      if (!userPath) {
        return { success: false, message: 'Speichern abgebrochen' };
      }
      
      filePath = userPath;
    }
    
    // Verify the file exists before writing (for non-user-selected paths)
    if (song.relativeTxtPath || song.folderPath) {
      const { exists } = await import('@tauri-apps/plugin-fs');
      const fileExists = await exists(filePath!);
      
      if (!fileExists) {
        console.warn('[SaveToFile] Original file does not exist:', filePath);
        // File doesn't exist - this might be a new file, that's OK
      }
    }
    
    // Write the file directly (overwrites if exists, creates if not)
    const { writeTextFile } = await import('@tauri-apps/plugin-fs');
    await writeTextFile(filePath!, txtContent);
    
    console.log(`[SaveToFile] Successfully saved to: ${filePath}`);
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
